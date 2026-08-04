// The privateNet delete has to happen BEFORE the room delete.
//
// The C1 fix moved per-player private state out of the world-readable
// rooms/<code> subtree and into a sibling top-level privateNet/<code>. Its
// write rule authorises the caller by reading the room:
//
//   "privateNet/$code/.write":
//     "auth != null && root.child('rooms').child($code).child('host').val() === auth.uid"
//
// So the authorisation depends on data the sibling delete destroys. Remove
// rooms/<code> first and that lookup resolves to null, null !== auth.uid, and
// the privateNet delete is rejected by the rules. Both call sites swallow the
// rejection, and roomCleanup additionally forgets the room afterwards — so the
// orphaned hands become permanently uncollectable.
//
// This only bites once database.rules.json is actually published; against the
// old permissive ruleset both orders "worked". Deploying the rules is what
// turns it into a real leak, which is why the order is pinned by a test.
import { setOnlineConfig, onlineTeardown } from "../game/onlineTransport";
import { __mock } from "@react-native-firebase/database";

const HOST = { code: "ABCD", uid: "u-host", isHost: true };
const CLIENT = { code: "ABCD", uid: "u-client", isHost: false };

beforeEach(() => {
  __mock.reset();
  setOnlineConfig(null);
});

describe("host teardown deletes private state before the room", () => {
  test("both paths are deleted", async () => {
    setOnlineConfig(HOST);
    onlineTeardown();
    await Promise.resolve();
    await Promise.resolve();

    const removes = __mock.removes();
    expect(removes).toContain("privateNet/ABCD");
    expect(removes).toContain("rooms/ABCD");
  });

  test("privateNet is deleted first, while the room still authorises it", async () => {
    setOnlineConfig(HOST);
    onlineTeardown();
    await Promise.resolve();
    await Promise.resolve();

    const removes = __mock.removes();
    expect(removes.indexOf("privateNet/ABCD")).toBeLessThan(
      removes.indexOf("rooms/ABCD"),
    );
  });

  test("the room delete waits for the privateNet delete to resolve", () => {
    // Issued in the same tick, the two deletes race and the rules can see the
    // room already gone. The room delete must be chained, not fired alongside.
    setOnlineConfig(HOST);
    onlineTeardown();

    expect(__mock.removes()).toEqual(["privateNet/ABCD"]);
  });
});

describe("a non-host tears down only its own player slot", () => {
  test("a client never tries to delete privateNet or the room", async () => {
    setOnlineConfig(CLIENT);
    onlineTeardown();
    await Promise.resolve();
    await Promise.resolve();

    const removes = __mock.removes();
    expect(removes).toEqual(["rooms/ABCD/players/u-client"]);
  });
});
