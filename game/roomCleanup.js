// Opportunistic cleanup of abandoned online rooms.
//
// createRoom deliberately trades room deletion for reconnect survivability: the
// host's onDisconnect sets hostConnected=false rather than removing the room, so
// a client pauses and waits instead of being kicked. The cost is that a host
// which never comes back leaves the room behind forever. The original code
// pointed at "a future TTL sweep" that was never written, so rooms accumulated
// indefinitely — each holding up to 500 KB per broadcast slot, and crowding a
// 4-character code space that createRoom has to find a free slot in.
//
// There's no server component in this project (no Cloud Functions), so cleanup
// has to be client-side — and that constrains the design sharply:
//
//   * We CANNOT sweep all rooms. Listing them means reading the `rooms` node,
//     which the rules deny, and granting that read would let anyone enumerate
//     every live room code. A global TTL genuinely needs a server.
//   * We CAN clean up our OWN abandoned room. The write rule lets a room's host
//     delete it, and reading a single room by code is allowed.
//
// So each host records the code it created, and clears it on a clean exit. A
// leftover entry means the app died without tearing the room down — exactly the
// case the orphan trade-off creates — and we remove that room on next launch.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ref, get, remove } from "@react-native-firebase/database";
import { getApp } from "@react-native-firebase/app";
import { getDatabase } from "@react-native-firebase/database";
import { warn } from "./logger";

const KEY_HOSTED_ROOM = "@cardnight:online:hosted_room";

// Long enough that a marathon session plus a long break is never swept out from
// under live players. Abandoned rooms are a storage/quota concern, not an
// urgent one, so erring long costs little.
export const ROOM_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

// A room is collectable once it's older than the TTL, full stop. Age alone has
// to be sufficient: hostConnected can be left true when a host process dies
// without its onDisconnect firing cleanly, so a "connected" flag can't be
// trusted to mean anyone is actually there.
//
// A room with a missing or unusable createdAt is treated as stale rather than
// immortal — otherwise rooms written before serverTimestamp existed, or with a
// corrupt value, could never be collected.
export function isRoomStale(room, now = Date.now()) {
  if (!room) return true;

  const created = room.createdAt;
  if (typeof created !== "number" || !Number.isFinite(created)) return true;

  // Guard against clock skew: a room stamped in the future is not stale.
  if (created > now) return false;

  return now - created > ROOM_TTL_MS;
}

function db() {
  return getDatabase(getApp());
}

// Record the room we just created, so a later launch can tell whether we exited
// cleanly. Best-effort: failing to remember only means we skip a future sweep.
export async function rememberHostedRoom(code) {
  try {
    await AsyncStorage.setItem(KEY_HOSTED_ROOM, String(code));
  } catch (err) {
    warn("[roomCleanup] could not record hosted room:", err);
  }
}

// Clear the record after a deliberate teardown, so we don't later try to delete
// a code that has since been reassigned to somebody else's room.
export async function forgetHostedRoom() {
  try {
    await AsyncStorage.removeItem(KEY_HOSTED_ROOM);
  } catch (_) {}
}

export async function getRememberedRoom() {
  try {
    return await AsyncStorage.getItem(KEY_HOSTED_ROOM);
  } catch (_) {
    return null;
  }
}

// Remove our own leftover room if it's past the TTL. Call at startup. Entirely
// best-effort: any failure is logged and ignored, and it never blocks the UI.
// Returns the code it removed, or null.
export async function sweepOwnStaleRoom({ now = Date.now() } = {}) {
  const code = await getRememberedRoom();
  if (!code) return null;

  try {
    const snap = await get(ref(db(), `rooms/${code}`));

    // Already gone — a clean teardown we simply never recorded. Drop the note.
    if (!snap.exists()) {
      await forgetHostedRoom();
      return null;
    }

    const room = snap.val();
    if (!isRoomStale(room, now)) return null;

    await remove(ref(db(), `rooms/${code}`));
    // privateNet is a sibling of rooms and isn't removed along with it.
    await remove(ref(db(), `privateNet/${code}`));
    await forgetHostedRoom();
    return code;
  } catch (err) {
    // A rules denial here means the code was recycled to another host — not
    // ours to delete. Forget it either way so we don't retry forever.
    warn("[roomCleanup] could not sweep own room:", err);
    await forgetHostedRoom();
    return null;
  }
}
