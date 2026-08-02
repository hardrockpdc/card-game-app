// Security-config regression guard for database.rules.json.
//
// These aren't behavioural tests (the rules run on Firebase's servers, not
// here) — they're shape assertions that lock in the security properties we
// depend on, so a future edit can't silently widen access again. Every
// assertion below maps to a specific attack the rule closes.
//
// NOTE: the file must stay comment-free — the Firebase console's Rules editor
// rejects any top-level key but `rules`. That's asserted here too.
const fs = require("fs");
const path = require("path");

const RULES_PATH = path.join(__dirname, "..", "database.rules.json");
const raw = fs.readFileSync(RULES_PATH, "utf8");
const rules = JSON.parse(raw);

const room = rules.rules.rooms.$code;

describe("database.rules.json — file shape", () => {
  test("parses as JSON and has exactly one top-level key: rules", () => {
    expect(Object.keys(rules)).toEqual(["rules"]);
  });

  test("root denies read and write by default", () => {
    expect(rules.rules[".read"]).toBe(false);
    expect(rules.rules[".write"]).toBe(false);
  });
});

// ─── C1 ──────────────────────────────────────────────────────────────────────
// The bug: per-player private state (poker hole cards, Go Fish / Rummy hands,
// the Who Am I? secret) lived at rooms/<code>/net/private/<uid>, under a node
// carrying `.read: "auth != null"`. Firebase read rules CASCADE DOWNWARD and
// cannot be revoked by a descendant, so that one rule made every opponent's
// hand readable by any authenticated client — and by any REST caller holding
// the public API key in google-services.json.
//
// The room node has to stay readable as a whole subtree: subscribeToRoom,
// joinRoom, rejoinRoom, markHostConnected and the zombie-room check all read
// rooms/<code> in one shot, and a narrow rule on a CHILD does not authorise
// reading the PARENT. So the fix moves private state out from under the
// readable subtree entirely, to a top-level privateNet/<code>/<uid>.
describe("C1 — per-player private state is not readable by other players", () => {
  test("private state no longer lives under the readable room subtree", () => {
    expect(room.net.private).toBeUndefined();
  });

  test("privateNet/$code/$uid is readable only by that uid", () => {
    const slot = rules.rules.privateNet.$code.$uid;
    expect(slot[".read"]).toBe("$uid === auth.uid");
  });

  test("no ancestor of privateNet/$code/$uid grants read", () => {
    // A truthy .read at any ancestor would cascade past the narrow rule below
    // it and re-open the hole.
    const ancestors = [rules.rules, rules.rules.privateNet, rules.rules.privateNet.$code];
    for (const node of ancestors) {
      expect(node[".read"] == null || node[".read"] === false).toBe(true);
    }
  });

  test("only the room's host may write a player's private slot", () => {
    expect(rules.rules.privateNet.$code[".write"]).toBe(
      "auth != null && root.child('rooms').child($code).child('host').val() === auth.uid",
    );
  });

  test("private payloads stay size-capped", () => {
    const payload = rules.rules.privateNet.$code.$uid.$type.payload;
    expect(payload[".validate"]).toContain("newData.isString()");
    expect(payload[".validate"]).toContain("500000");
  });

  test("the room subtree remains readable so whole-room reads still work", () => {
    // Deliberate: subscribeToRoom/joinRoom/rejoinRoom read rooms/<code> whole.
    // This is safe ONLY because no per-player secret lives under it any more,
    // which the first assertion in this block enforces.
    expect(room[".read"]).toBe("auth != null");
  });
});
