// Online multiplayer room system (Firebase Realtime Database).
//
// Mirrors the role of game/GameNetwork.js (local TCP/UDP) but over Firebase,
// so players can play from anywhere — not just the same Wi-Fi. A "room" is a
// short code other players type in to join. The host owns the room; the
// anonymous Firebase uid (see game/firebase.js) identifies each player.
//
// This module only handles the LOBBY lifecycle (create / join / player list /
// leave / start). Actual in-game state sync comes in a later phase.
//
// NOTE: native module under the hood — needs a dev/production build, not Expo Go.
import {
  ref,
  get,
  set,
  update,
  remove,
  onValue,
  onDisconnect,
  serverTimestamp,
} from "@react-native-firebase/database";
import { getApp } from "@react-native-firebase/app";
import { getDatabase } from "@react-native-firebase/database";
import { ensureSignedIn, getUid } from "./firebase";
import { warn, log } from "./logger";

// Ambiguous-looking characters removed (no O/0, I/1) so codes are easy to read
// aloud and type. 4 chars from 32 symbols ≈ 1M combinations — plenty.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 4;

function randomCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function db() {
  return getDatabase(getApp());
}

function roomRef(code) {
  return ref(db(), `rooms/${code}`);
}

// Creates a fresh room with a unique code and the host as its first player.
// Returns { code, uid } on success, or null on failure.
export async function createRoom({ gameId, variant = null, tone = null, hostName }) {
  const uid = await ensureSignedIn();
  if (!uid) return null;

  // Find a code that isn't already taken (retry a few times on the rare clash).
  let code = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = randomCode();
    const snap = await get(roomRef(candidate));
    if (!snap.exists()) {
      code = candidate;
      break;
    }
  }
  if (!code) {
    warn("[onlineRoom] could not allocate a unique room code");
    return null;
  }

  try {
    await set(roomRef(code), {
      host: uid,
      gameId,
      variant,
      tone,
      status: "waiting",
      hostConnected: true,
      createdAt: serverTimestamp(),
      players: {
        [uid]: {
          name: hostName || "Host",
          isHost: true,
          joinedAt: serverTimestamp(),
        },
      },
    });

    // If the host's device drops, mark the host "away" instead of deleting the
    // room. Clients then pause ("waiting for host…") rather than being kicked,
    // and the game can resume if the host returns within the grace window (see
    // markHostConnected + the reconnect hook). Trade-off: a host that never
    // comes back leaves a small orphaned room (cleaned up by a future TTL sweep;
    // intentional leaves via leaveRoom/teardown still remove the room outright).
    onDisconnect(roomRef(code)).update({ hostConnected: false });
    log("[reconnect] createRoom:", code, "host uid", uid,
        "— onDisconnect set to hostConnected=false (NOT delete)");

    return { code, uid };
  } catch (err) {
    warn("[onlineRoom] createRoom failed:", err);
    return null;
  }
}

// Joins an existing waiting room by code. Returns { code, uid } on success or
// an { error } string the caller can show the user.
export async function joinRoom(code, { playerName }) {
  const uid = await ensureSignedIn();
  if (!uid) return { error: "Could not connect. Try again." };

  const cleanCode = String(code || "").trim().toUpperCase();
  if (cleanCode.length !== CODE_LENGTH) {
    return { error: "Enter a 4-letter room code." };
  }

  try {
    const snap = await get(roomRef(cleanCode));
    if (!snap.exists()) {
      return { error: "No room found with that code." };
    }
    const room = snap.val();
    if (room.status !== "waiting") {
      return { error: "That game has already started." };
    }

    const playerRef = ref(db(), `rooms/${cleanCode}/players/${uid}`);
    await set(playerRef, {
      name: playerName || "Player",
      isHost: false,
      joinedAt: serverTimestamp(),
    });

    // Drop our own slot if this device disconnects.
    onDisconnect(playerRef).remove();

    return { code: cleanCode, uid };
  } catch (err) {
    warn("[onlineRoom] joinRoom failed:", err);
    return { error: "Could not join the room." };
  }
}

// Re-adds our player slot to a room that's already "playing" — used to reconnect
// after the app was backgrounded (the server's onDisconnect removed our slot).
// Unlike joinRoom, this skips the "waiting" gate, but ONLY lets a device that
// was part of the finalized roster (gamePlayers) back in, so randoms can't inject
// themselves mid-game. Re-arms onDisconnect. Returns { code, uid } or { error }.
export async function rejoinRoom(code) {
  const uid = getUid() || (await ensureSignedIn());
  if (!uid) return { error: "Not signed in." };

  const cleanCode = String(code || "").trim().toUpperCase();
  try {
    const snap = await get(roomRef(cleanCode));
    if (!snap.exists()) return { error: "Room closed." };
    const room = snap.val();

    const roster = Array.isArray(room.gamePlayers) ? room.gamePlayers : [];
    const mine = roster.find((p) => String(p?.id) === String(uid));
    if (!mine) return { error: "You're not in this game." };

    const playerRef = ref(db(), `rooms/${cleanCode}/players/${uid}`);
    await set(playerRef, { name: mine.name || "Player", isHost: false });
    onDisconnect(playerRef).remove();

    return { code: cleanCode, uid };
  } catch (err) {
    warn("[onlineRoom] rejoinRoom failed:", err);
    return { error: "Could not reconnect." };
  }
}

// Host-only: mark the host reconnected after returning from the background and
// re-arm the "away on disconnect" handler for next time. Called by the reconnect
// hook on AppState → active; pair it with a resend of the current game state so
// clients (who were paused) resync. No-op-safe if the room is already gone.
export async function markHostConnected(code) {
  const cleanCode = String(code || "").trim().toUpperCase();
  const myUid = getUid();
  log("[reconnect] markHostConnected: enter, code", cleanCode, "my uid", myUid);
  try {
    const r = roomRef(cleanCode);
    // If the room is already gone (host truly left, or an old room created before
    // the away-on-disconnect change), there's nothing to reconnect to — bail
    // quietly instead of letting update() look like a (denied) room re-creation.
    const snap = await get(r);
    if (!snap.exists()) {
      log("[reconnect] markHostConnected: room", cleanCode,
          "does NOT exist — bailing (it was deleted, not marked away)");
      return;
    }
    const room = snap.val();
    log("[reconnect] markHostConnected: room exists, host field =", room.host,
        "| matches my uid?", String(room.host) === String(myUid),
        "| current hostConnected =", room.hostConnected);
    await update(r, { hostConnected: true });
    // The previous onDisconnect was consumed when it fired; register a fresh one.
    onDisconnect(r).update({ hostConnected: false });
    log("[reconnect] markHostConnected: SUCCESS — hostConnected=true, onDisconnect re-armed");
  } catch (err) {
    warn("[onlineRoom] markHostConnected failed:", err);
  }
}

// Listens to a room's live state. Calls cb(room) on every change, or cb(null)
// if the room is deleted (host left / closed). Returns an unsubscribe function.
export function subscribeToRoom(code, cb) {
  const r = roomRef(code);
  const handler = onValue(
    r,
    (snap) => cb(snap.exists() ? { code, ...snap.val() } : null),
    (err) => {
      warn("[onlineRoom] subscribe error:", err);
      cb(null);
    },
  );
  // onValue returns its own unsubscribe in the modular API.
  return handler;
}

// Host-only: change the selected game/variant while still in the lobby.
export async function updateRoomGame(code, { gameId, variant = null, tone = null }) {
  try {
    await update(roomRef(code), { gameId, variant, tone });
  } catch (err) {
    warn("[onlineRoom] updateRoomGame failed:", err);
  }
}

// Host-only: flip the room to "playing" so everyone's lobby advances together.
// `payload` carries what clients need to launch the same game (the finalized
// players array and the target game screen).
export async function startRoomGame(code, payload = {}) {
  try {
    await update(roomRef(code), { status: "playing", ...payload });
  } catch (err) {
    warn("[onlineRoom] startRoomGame failed:", err);
  }
}

// Leaves the room. If we're the host, the whole room is removed; otherwise just
// our own player slot is removed.
export async function leaveRoom(code, { isHost }) {
  const uid = getUid();
  try {
    if (isHost) {
      await remove(roomRef(code));
    } else if (uid) {
      await remove(ref(db(), `rooms/${code}/players/${uid}`));
    }
  } catch (err) {
    warn("[onlineRoom] leaveRoom failed:", err);
  }
}

export { CODE_LENGTH };
