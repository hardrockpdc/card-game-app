// C3 — Firebase listener lifecycle in game/onlineTransport.js.
//
// The bug: onlineSetServerListeners / onlineSetClientListeners pushed new RTDB
// subscriptions onto a module-level `subs` array on EVERY call, and never
// detached the previous set. `subs` was only ever cleared in onlineTeardown().
//
// Two consequences, both reachable through normal navigation:
//
//  1. Deaf client. Screens clear listeners with `setClientListeners({})` (see
//     RummyGameScreen's effect cleanup). That set clientListeners = {} — so
//     delivery stopped — and then fell straight through and registered five
//     MORE subscriptions. The client went silent while leaking.
//
//  2. N-times amplification. Lobby -> game -> results -> replay accumulated
//     listener sets, each firing the current handler again on every broadcast.
//     Masked today because setGameState is idempotent, but it is unbounded
//     RTDB bandwidth, battery and memory for the whole session.
import {
  setOnlineConfig,
  onlineSetClientListeners,
  onlineSetServerListeners,
  onlineTeardown,
} from "../game/onlineTransport";
import { __mock } from "@react-native-firebase/database";

const CLIENT = { code: "ABCD", uid: "u-client", isHost: false };
const HOST = { code: "ABCD", uid: "u-host", isHost: true };

beforeEach(() => {
  __mock.reset();
  setOnlineConfig(null);
});

describe("C3 — client listener registration replaces, never accumulates", () => {
  test("registering once attaches a bounded set of listeners", () => {
    setOnlineConfig(CLIENT);
    onlineSetClientListeners({ onMessage: () => {} });
    const first = __mock.activeListeners().length;
    expect(first).toBeGreaterThan(0);
  });

  test("re-registering does not grow the live listener count", () => {
    setOnlineConfig(CLIENT);
    onlineSetClientListeners({ onMessage: () => {} });
    const afterFirst = __mock.activeListeners().length;

    onlineSetClientListeners({ onMessage: () => {} });
    onlineSetClientListeners({ onMessage: () => {} });

    expect(__mock.activeListeners().length).toBe(afterFirst);
  });

  test("clearing with {} detaches instead of registering another set", () => {
    setOnlineConfig(CLIENT);
    onlineSetClientListeners({ onMessage: () => {} });

    // This is exactly what RummyGameScreen's effect cleanup does.
    onlineSetClientListeners({});

    expect(__mock.activeListeners().length).toBe(0);
  });

  test("a broadcast is delivered exactly once after several re-registrations", () => {
    setOnlineConfig(CLIENT);
    const onMessage = jest.fn();
    onlineSetClientListeners({ onMessage: () => {} });
    onlineSetClientListeners({ onMessage: () => {} });
    onlineSetClientListeners({ onMessage });

    __mock.emit("net/broadcast", "child_added", {
      seq: 1,
      payload: JSON.stringify({ type: "GAME_STATE", turn: 2 }),
    });

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith({ type: "GAME_STATE", turn: 2 });
  });
});

describe("C3 — host listener registration replaces, never accumulates", () => {
  test("re-registering does not grow the live listener count", () => {
    setOnlineConfig(HOST);
    onlineSetServerListeners({ onMessage: () => {} });
    const afterFirst = __mock.activeListeners().length;

    onlineSetServerListeners({ onMessage: () => {} });
    onlineSetServerListeners({ onMessage: () => {} });

    expect(__mock.activeListeners().length).toBe(afterFirst);
  });

  test("clearing with {} detaches the host's listeners", () => {
    setOnlineConfig(HOST);
    onlineSetServerListeners({ onMessage: () => {} });
    onlineSetServerListeners({});
    expect(__mock.activeListeners().length).toBe(0);
  });

  test("a queued client message reaches the host exactly once", () => {
    setOnlineConfig(HOST);
    const onMessage = jest.fn();
    onlineSetServerListeners({ onMessage: () => {} });
    onlineSetServerListeners({ onMessage });

    // Roster snapshot first, so the sender allow-list (C2) knows this player.
    __mock.emit("players", "value", { "u-client": { name: "P" } });
    __mock.emit("net/toHost", "child_added", {
      sender: "u-client",
      payload: JSON.stringify({ type: "ACTION", action: "fold" }),
    });

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith(
      { type: "ACTION", action: "fold" },
      "u-client",
    );
  });
});

describe("C3 — teardown detaches everything", () => {
  test("no listeners survive onlineTeardown", () => {
    setOnlineConfig(HOST);
    onlineSetServerListeners({ onMessage: () => {} });
    onlineTeardown();
    expect(__mock.activeListeners().length).toBe(0);
  });

  test("host and client sets are tracked independently", () => {
    // A host screen and a client screen never coexist, but registering one
    // must not silently detach the other's bookkeeping.
    setOnlineConfig(HOST);
    onlineSetServerListeners({ onMessage: () => {} });
    const hostCount = __mock.activeListeners().length;
    expect(hostCount).toBeGreaterThan(0);

    onlineSetServerListeners({});
    expect(__mock.activeListeners().length).toBe(0);
  });
});
