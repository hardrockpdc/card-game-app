// M8 — orphaned rooms accumulated forever.
//
// createRoom deliberately trades room deletion for reconnect survivability:
// the host's onDisconnect sets hostConnected=false instead of removing the
// room, so a client can pause and wait rather than being kicked. The code
// comment cited "a future TTL sweep" — no sweep existed anywhere in the repo.
// Every host that force-quit left a permanent room holding up to 500 KB per
// broadcast slot, and with a 4-char code space that also raises the collision
// rate in createRoom's allocation loop.
import { isRoomStale, ROOM_TTL_MS } from "../game/roomCleanup";

const HOUR = 3600 * 1000;

describe("isRoomStale — what counts as abandoned", () => {
  const now = 1_000_000_000_000;

  test("a fresh room with the host present is kept", () => {
    const room = { createdAt: now - HOUR, hostConnected: true, status: "playing" };
    expect(isRoomStale(room, now)).toBe(false);
  });

  test("a room older than the TTL is stale even if it looks connected", () => {
    // hostConnected can be left true if the host process died without the
    // onDisconnect firing cleanly, so age alone has to be sufficient.
    const room = {
      createdAt: now - (ROOM_TTL_MS + HOUR),
      hostConnected: true,
      status: "playing",
    };
    expect(isRoomStale(room, now)).toBe(true);
  });

  test("a recently-created room whose host is away is NOT stale", () => {
    // This is exactly the reconnect grace case — sweeping it would defeat the
    // feature the orphan trade-off exists to support.
    const room = { createdAt: now - 60_000, hostConnected: false, status: "playing" };
    expect(isRoomStale(room, now)).toBe(false);
  });

  test("a room with no createdAt is treated as stale, not immortal", () => {
    // Rooms written before serverTimestamp was added would otherwise never be
    // collectable.
    expect(isRoomStale({ hostConnected: false }, now)).toBe(true);
  });

  test("a malformed createdAt does not make a room immortal", () => {
    expect(isRoomStale({ createdAt: "nonsense" }, now)).toBe(true);
    expect(isRoomStale({ createdAt: null }, now)).toBe(true);
  });

  test("a future createdAt (clock skew) is not swept immediately", () => {
    const room = { createdAt: now + HOUR, hostConnected: true, status: "playing" };
    expect(isRoomStale(room, now)).toBe(false);
  });

  test("a null room is stale", () => {
    expect(isRoomStale(null, now)).toBe(true);
  });

  test("the TTL is long enough not to interrupt a real game", () => {
    // A long session plus a coffee break must never be swept out from under
    // the players.
    expect(ROOM_TTL_MS).toBeGreaterThanOrEqual(6 * HOUR);
  });
});

// The sweep itself. A client can only delete a room it hosts, and listing all
// rooms is denied by the rules (and would leak every live room code), so the
// cleanup targets OUR OWN leftover room, remembered locally. That covers the
// actual leak source: a host whose app died without tearing the room down.
describe("own-room bookkeeping", () => {
  const AsyncStorage = require("@react-native-async-storage/async-storage").default;
  const {
    rememberHostedRoom,
    forgetHostedRoom,
    getRememberedRoom,
  } = require("../game/roomCleanup");

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test("nothing is remembered by default", async () => {
    expect(await getRememberedRoom()).toBeNull();
  });

  test("a created room is remembered so a later launch can clean it up", async () => {
    await rememberHostedRoom("WXYZ");
    expect(await getRememberedRoom()).toBe("WXYZ");
  });

  test("a clean teardown forgets the room, so a recycled code is never deleted", async () => {
    await rememberHostedRoom("WXYZ");
    await forgetHostedRoom();
    expect(await getRememberedRoom()).toBeNull();
  });
});
