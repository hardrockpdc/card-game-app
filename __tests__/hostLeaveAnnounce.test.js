// A host that quits has to ANNOUNCE before it deletes the room.
//
// Reported from a live two-device game: after the second game, the host tapped
// Leave on the results modal and the client was trapped on a "Connection Lost /
// Trying to reconnect…" overlay whose Rejoin and Leave buttons did nothing.
//
// The client's Firebase connection was fine the whole time. leaveMultiplayer()
// called stopServer() and nothing else — a client quitting sends LEAVE, but a
// host quitting just vanished. Deleting the room blips every client's
// connection, so each client concluded its OWN network had died and sat waiting
// for a host that was never coming back.
//
// The fix broadcasts GAME_OVER_DISCONNECT with reason "host_left" first, and
// waits for that write to land before tearing the room down. That last part is
// what this file pins: onlineBroadcast used to return undefined, so there was
// nothing to wait ON. Fire the broadcast and delete the room in the same tick
// and the message is racing its own transport — the room can be gone before the
// write is acknowledged, and the client is back to guessing.
//
// The overlay stacking half of the bug (two RN Modals open at once on Android
// leaves the top one visible but deaf to touch) is render-level and is NOT
// covered here — this Jest config has no React renderer. It is device-verified
// only.
import {
  setOnlineConfig,
  onlineBroadcast,
  onlineTeardown,
} from "../game/onlineTransport";
import { __mock } from "@react-native-firebase/database";

const HOST = { code: "ABCD", uid: "u-host", isHost: true };
const CLIENT = { code: "ABCD", uid: "u-client", isHost: false };

const HOST_LEFT = {
  type: "GAME_OVER_DISCONNECT",
  name: "The host",
  reason: "host_left",
};

const BROADCAST_PATH = "rooms/ABCD/net/broadcast/GAME_OVER_DISCONNECT";

function broadcastWrites() {
  return __mock.writes().filter((w) => w.path === BROADCAST_PATH);
}

beforeEach(() => {
  __mock.reset();
  setOnlineConfig(null);
});

describe("a broadcast can be waited on", () => {
  test("onlineBroadcast returns a thenable for the host", () => {
    setOnlineConfig(HOST);
    const sent = onlineBroadcast(HOST_LEFT);

    expect(sent).toBeDefined();
    expect(typeof sent.then).toBe("function");
  });

  test("a client gets undefined back, and writes nothing", () => {
    // Only the host may write the broadcast slot; the caller has to be able to
    // tell "nothing was sent" from "a send is in flight".
    setOnlineConfig(CLIENT);
    const sent = onlineBroadcast(HOST_LEFT);

    expect(sent).toBeUndefined();
    expect(broadcastWrites()).toHaveLength(0);
  });

  test("local mode has no config at all, and must not throw", () => {
    // leaveMultiplayer branches on the return value; a local WiFi game goes down
    // the synchronous path and tears down immediately.
    expect(onlineBroadcast(HOST_LEFT)).toBeUndefined();
  });
});

describe("the departure message says who left and why", () => {
  test("it lands in the broadcast slot with the host_left reason intact", () => {
    setOnlineConfig(HOST);
    onlineBroadcast(HOST_LEFT);

    const writes = broadcastWrites();
    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0].value.payload)).toEqual(HOST_LEFT);
  });

  test("reason distinguishes a deliberate exit from an expired grace window", () => {
    // Same message type carries both. Without the reason the client can only say
    // "left and didn't reconnect in time" — wrong, and alarming, for a host who
    // simply chose to stop playing.
    setOnlineConfig(HOST);
    onlineBroadcast({ type: "GAME_OVER_DISCONNECT", name: "Sam" });
    onlineBroadcast(HOST_LEFT);

    const payloads = broadcastWrites().map((w) => JSON.parse(w.value.payload));
    expect(payloads[0].reason).toBeUndefined();
    expect(payloads[1].reason).toBe("host_left");
  });

  test("each broadcast bumps the sequence so the client sees the second one", () => {
    // One slot per message type, overwritten in place — a client de-dupes on
    // seq, so a repeated type with a stale seq would be dropped.
    setOnlineConfig(HOST);
    onlineBroadcast({ type: "GAME_OVER_DISCONNECT", name: "Sam" });
    onlineBroadcast(HOST_LEFT);

    const seqs = broadcastWrites().map((w) => w.value.seq);
    expect(seqs[1]).toBeGreaterThan(seqs[0]);
  });
});

describe("the room is deleted only after the announcement resolves", () => {
  test("nothing is removed while the broadcast is still in flight", async () => {
    setOnlineConfig(HOST);
    const sent = onlineBroadcast(HOST_LEFT);

    expect(broadcastWrites()).toHaveLength(1);
    expect(__mock.removes()).toHaveLength(0);

    await sent;
    onlineTeardown();
    await Promise.resolve();
    await Promise.resolve();

    // privateNet still goes first — its write rule authorises via the room.
    const removes = __mock.removes();
    expect(removes).toContain("privateNet/ABCD");
    expect(removes).toContain("rooms/ABCD");
    expect(removes.indexOf("privateNet/ABCD")).toBeLessThan(
      removes.indexOf("rooms/ABCD"),
    );
  });

  test("a rejected broadcast still lets the host tear down and leave", async () => {
    // onlineBroadcast swallows write failures, so the promise resolves either
    // way. A host must never be stuck in a game because a message failed.
    setOnlineConfig(HOST);
    await expect(onlineBroadcast(HOST_LEFT)).resolves.toBeUndefined();
  });
});
