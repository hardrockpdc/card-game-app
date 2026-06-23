import { doTakeWithBorrow } from "../game/conquian";

// Card + "playing" state builders mirror conquian.actions.test.js exactly.
const c = (rank, suit) => ({ rank, suit, id: `${rank}${suit}` });

const playing = (over) => ({
  phase: "playing",
  turnPhase: "action",
  players: [{ id: "p1" }, { id: "p2" }],
  currentPlayerIndex: 0,
  melds: { p1: [], p2: [] },
  hands: { p1: [], p2: [] },
  deadPile: [],
  chainPassedPids: [],
  activeCard: null,
  activeCardSourcePid: null,
  winTarget: 11,
  autoTook: null,
  ...over,
});

const ids = (cards) => cards.map((x) => x.id).sort();
const meldIds = (melds) => melds.map((m) => ids(m));

describe("doTakeWithBorrow — the spec's borrow example", () => {
  // Table set 7♠7♥7♦7♣; hand has 5♥ (+ a junk K♣ to discard); taking 6♥.
  // Pull 7♥ out → new run 5♥6♥7♥; the set stays valid as 7♠7♦7♣.
  const setup = () =>
    playing({
      activeCard: c("6", "♥"),
      melds: {
        p1: [[c("7", "♠"), c("7", "♥"), c("7", "♦"), c("7", "♣")]],
        p2: [],
      },
      hands: { p1: [c("5", "♥"), c("K", "♣")], p2: [] },
    });

  const finalMelds = [
    [c("7", "♠"), c("7", "♦"), c("7", "♣")],
    [c("5", "♥"), c("6", "♥"), c("7", "♥")],
  ];

  test("rearranges into two valid melds and consumes the active card", () => {
    const next = doTakeWithBorrow(setup(), "p1", finalMelds);
    expect(next.melds.p1).toHaveLength(2);
    // the exact six cards land across the two melds (order-independent)
    const flat = ids(next.melds.p1.flat());
    expect(flat).toEqual(ids([c("7", "♠"), c("7", "♦"), c("7", "♣"), c("5", "♥"), c("6", "♥"), c("7", "♥")]));
    // the new run is present as its own meld
    expect(meldIds(next.melds.p1)).toContainEqual(ids([c("5", "♥"), c("6", "♥"), c("7", "♥")]));
    // active card was used -> cleared, must now discard
    expect(next.activeCard).toBeNull();
    expect(next.turnPhase).toBe("discard");
  });

  test("the unused junk card returns to hand (ready to discard)", () => {
    const next = doTakeWithBorrow(setup(), "p1", finalMelds);
    expect(ids(next.hands.p1)).toEqual(["K♣"]);
  });

  test("melded six cards total across the two melds", () => {
    const next = doTakeWithBorrow(setup(), "p1", finalMelds);
    const total = next.melds.p1.reduce((n, m) => n + m.length, 0);
    expect(total).toBe(6);
  });
});

describe("doTakeWithBorrow — auto-take fires if a rearrange leaves the active card extending a meld", () => {
  // Conquián ranks are A,2–7,J,Q,K (no 8/9/10): 7→J is the consecutive pair,
  // so J♠ extends a 5-6-7♠ run.
  test("active J♠ not placed by the player is force-added to the 5-6-7♠ run", () => {
    const s = playing({
      activeCard: c("J", "♠"),
      melds: { p1: [[c("5", "♠"), c("6", "♠"), c("7", "♠")]], p2: [] },
      hands: { p1: [c("K", "♣")], p2: [] },
    });
    // finalMelds keep the run as-is and do NOT use the active J♠...
    const next = doTakeWithBorrow(s, "p1", [
      [c("5", "♠"), c("6", "♠"), c("7", "♠")],
    ]);
    // ...but J♠ directly extends it, so auto-take consumes it anyway.
    expect(next.activeCard).toBeNull();
    expect(next.turnPhase).toBe("discard");
    expect(ids(next.melds.p1[0])).toEqual(ids([c("5", "♠"), c("6", "♠"), c("7", "♠"), c("J", "♠")]));
    expect(next.autoTook).toMatchObject({ pid: "p1", id: "J♠" });
  });
});

describe("doTakeWithBorrow — rejections (state returned unchanged)", () => {
  const base = () =>
    playing({
      activeCard: c("6", "♥"),
      melds: { p1: [[c("7", "♠"), c("7", "♥"), c("7", "♦"), c("7", "♣")]], p2: [] },
      hands: { p1: [c("5", "♥")], p2: [] },
    });

  test("rejects when any resulting group is not a valid meld", () => {
    const s = base();
    // [7♠,7♦] is only two cards — not a meld
    expect(doTakeWithBorrow(s, "p1", [[c("7", "♠"), c("7", "♦")]])).toBe(s);
  });

  test("rejects when a used card is not in the player's pool", () => {
    const s = base();
    // 9♣ isn't in hand, own melds, or the active card
    const bogus = [[c("9", "♣"), c("5", "♥"), c("6", "♥")]];
    expect(doTakeWithBorrow(s, "p1", bogus)).toBe(s);
  });

  test("rejects when it is not the player's turn", () => {
    const s = base();
    expect(doTakeWithBorrow(s, "p2", [[c("7", "♠"), c("7", "♦"), c("7", "♣")]])).toBe(
      s,
    );
  });

  test("rejects outside the action phase", () => {
    const drawState = { ...base(), turnPhase: "draw" };
    expect(
      doTakeWithBorrow(drawState, "p1", [
        [c("7", "♠"), c("7", "♦"), c("7", "♣")],
      ]),
    ).toBe(drawState);
  });

  test("rejects an empty finalMelds", () => {
    const s = base();
    expect(doTakeWithBorrow(s, "p1", [])).toBe(s);
  });
});
