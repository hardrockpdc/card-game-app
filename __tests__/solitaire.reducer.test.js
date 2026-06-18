import {
  createSolitaireState,
  solitaireReducer,
  newGameAction,
  undoAction,
  setSpiderModeAction,
  tapAction,
  moveAction,
  getLegalTargets,
  getHint,
} from "../game/solitaire";

const VARIANTS = ["klondike", "spider", "freecell", "pyramid", "tripeaks"];

describe("createSolitaireState", () => {
  test.each(VARIANTS)("%s starts playing with 0 moves", (variant) => {
    const state = createSolitaireState(variant);
    expect(state.variantId).toBe(variant);
    expect(state.status).toBe("playing");
    expect(state.moves).toBe(0);
  });
});

describe("moveAction (drag-and-drop)", () => {
  test("MOVE produces the same board as tap(source)+tap(target)", () => {
    const s = createSolitaireState("klondike");
    const colIdx = s.tableau.findIndex(
      (p) => p.length && p[p.length - 1].faceUp,
    );
    const source = {
      type: "tableau",
      index: colIdx,
      cardIndex: s.tableau[colIdx].length - 1,
    };
    const target = { type: "foundation", index: 0 };

    const viaMove = solitaireReducer(s, moveAction(source, target));
    const viaTaps = solitaireReducer(
      solitaireReducer({ ...s, selected: null }, tapAction(source)),
      tapAction(target),
    );

    expect(viaMove.tableau).toEqual(viaTaps.tableau);
    expect(viaMove.foundations).toEqual(viaTaps.foundations);
    expect(viaMove.waste).toEqual(viaTaps.waste);
    expect(viaMove.selected).toBeNull();
  });

  test("an invalid MOVE leaves the board unchanged and clears selection", () => {
    const base = createSolitaireState("klondike");
    const s = { ...base, selected: { type: "waste" } };
    // Bottom card of a column is face-down → not a legal source.
    const source = { type: "tableau", index: 6, cardIndex: 0 };
    const target = { type: "foundation", index: 0 };

    const res = solitaireReducer(s, moveAction(source, target));
    expect(res.selected).toBeNull();
    expect(res.tableau).toEqual(base.tableau);
    expect(res.moves).toBe(base.moves);
  });
});

describe("getLegalTargets (drag highlights)", () => {
  test("a target is highlighted iff moveAction actually moves the board", () => {
    const s = createSolitaireState("klondike");
    const colIdx = s.tableau.findIndex(
      (p) => p.length && p[p.length - 1].faceUp,
    );
    const source = {
      type: "tableau",
      index: colIdx,
      cardIndex: s.tableau[colIdx].length - 1,
    };

    const legal = getLegalTargets(s, source);

    // Every candidate (all foundations + every other column) must agree with
    // what an actual MOVE would do — no false highlights, no missed targets.
    const inLegal = (t) =>
      legal.some((l) => l.type === t.type && l.index === t.index);

    const candidates = [];
    for (let i = 0; i < s.foundations.length; i += 1) {
      candidates.push({ type: "foundation", index: i });
    }
    for (let i = 0; i < s.tableau.length; i += 1) {
      if (i === colIdx) continue;
      candidates.push({ type: "tableau", index: i });
    }

    for (const target of candidates) {
      const res = solitaireReducer(s, moveAction(source, target));
      const moved = res.moves !== s.moves || res.pairs !== s.pairs;
      expect(inLegal(target)).toBe(moved);
    }
  });

  test("a face-down (buried) source yields no targets", () => {
    const s = createSolitaireState("klondike");
    // In a Klondike deal, the bottom card of columns 1..6 is face-down.
    const source = { type: "tableau", index: 6, cardIndex: 0 };
    expect(s.tableau[6][0].faceUp).toBe(false);
    expect(getLegalTargets(s, source)).toEqual([]);
  });

  test("returns [] for missing state or source", () => {
    const s = createSolitaireState("klondike");
    expect(getLegalTargets(null, { type: "waste" })).toEqual([]);
    expect(getLegalTargets(s, null)).toEqual([]);
  });

  test("FreeCell: targets agree with moveAction, incl. free cells", () => {
    const s = createSolitaireState("freecell");
    const colIdx = s.tableau.findIndex((p) => p.length > 0);
    const source = {
      type: "tableau",
      index: colIdx,
      cardIndex: s.tableau[colIdx].length - 1,
    };

    const legal = getLegalTargets(s, source);
    const inLegal = (t) =>
      legal.some((l) => l.type === t.type && l.index === t.index);

    const candidates = [];
    for (let i = 0; i < s.foundations.length; i += 1) {
      candidates.push({ type: "foundation", index: i });
    }
    for (let i = 0; i < s.freecells.length; i += 1) {
      candidates.push({ type: "freecell", index: i });
    }
    for (let i = 0; i < s.tableau.length; i += 1) {
      if (i === colIdx) continue;
      candidates.push({ type: "tableau", index: i });
    }

    for (const target of candidates) {
      const res = solitaireReducer(s, moveAction(source, target));
      const moved = res.moves !== s.moves || res.pairs !== s.pairs;
      expect(inLegal(target)).toBe(moved);
    }

    // A single movable card can always go to an empty free cell.
    expect(inLegal({ type: "freecell", index: 0 })).toBe(true);
  });
});

describe("solitaireReducer", () => {
  test("builds an initial state when given none", () => {
    const state = solitaireReducer(undefined, { variantId: "spider" });
    expect(state.variantId).toBe("spider");
    expect(state.status).toBe("playing");
  });

  test("NEW_GAME switches to the requested variant", () => {
    const start = createSolitaireState("klondike");
    const next = solitaireReducer(start, newGameAction("freecell"));
    expect(next.variantId).toBe("freecell");
    expect(next.moves).toBe(0);
  });

  test("UNDO with no history is a no-op", () => {
    const state = createSolitaireState("klondike");
    expect(solitaireReducer(state, undoAction())).toBe(state);
  });

  test("an unknown action returns the same state", () => {
    const state = createSolitaireState("klondike");
    expect(solitaireReducer(state, { type: "__NOPE__" })).toBe(state);
  });

  test("SET_SPIDER_MODE is ignored on a non-spider game", () => {
    const state = createSolitaireState("klondike");
    expect(solitaireReducer(state, setSpiderModeAction(2))).toBe(state);
  });
});

describe("getHint (Klondike pilot)", () => {
  const SYMBOLS = { hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠" };
  // Minimal card matching the shape createCard produces (enough for the move
  // rules the reducer checks: rank, faceUp, suit/color).
  const mk = (suit, rank, faceUp = true) => {
    const red = suit === "hearts" || suit === "diamonds";
    return {
      id: `${rank}-${suit}`,
      suit,
      rank,
      color: red ? "red" : "black",
      symbol: SYMBOLS[suit],
      rankLabel: String(rank),
      faceUp,
      faceDown: !faceUp,
      isFaceUp: faceUp,
      isFaceDown: !faceUp,
    };
  };
  const klondike = (overrides = {}) => ({
    variantId: "klondike",
    status: "playing",
    moves: 5,
    pairs: 0,
    history: [],
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], []],
    selected: null,
    ...overrides,
  });

  test("returns null for non-Klondike variants", () => {
    expect(getHint(createSolitaireState("spider"))).toBeNull();
  });

  test("returns null when the game is already won", () => {
    expect(getHint(klondike({ status: "won" }))).toBeNull();
  });

  test("prefers a move that flips a face-down card", () => {
    // 6♠ sits on a face-down 5♣ and can build onto 7♥ in another column.
    // A competing Ace→foundation move exists but the flip should win.
    const tableau = [[], [], [], [], [], [], []];
    tableau[0] = [mk("clubs", 5, false), mk("spades", 6, true)];
    tableau[1] = [mk("hearts", 7, true)];
    tableau[2] = [mk("diamonds", 1, true)]; // Ace → foundation (lower priority)
    const hint = getHint(klondike({ tableau }));
    expect(hint).toEqual({
      source: { type: "tableau", index: 0, cardIndex: 1 },
      target: { type: "tableau", index: 1 },
    });
  });

  test("sends an exposed Ace to a foundation", () => {
    const tableau = [[], [], [], [], [], [], []];
    tableau[0] = [mk("diamonds", 1, true)];
    const hint = getHint(klondike({ tableau }));
    expect(hint?.source).toEqual({ type: "tableau", index: 0, cardIndex: 0 });
    expect(hint?.target?.type).toBe("foundation");
  });

  test("falls back to a stock hint when no board move helps", () => {
    const tableau = [[], [], [], [], [], [], []];
    tableau[0] = [mk("spades", 5, true)]; // nowhere useful to go
    const hint = getHint(klondike({ tableau, stock: [mk("clubs", 9, false)] }));
    expect(hint).toEqual({ source: { type: "stock" } });
  });

  test("returns null when truly stuck (no move, empty stock and waste)", () => {
    const tableau = [[], [], [], [], [], [], []];
    tableau[0] = [mk("spades", 5, true)];
    expect(getHint(klondike({ tableau }))).toBeNull();
  });

  test("skips a move that would just undo the previous one", () => {
    // Current board: 7♥ in col0, 6♠ in col1. The only move (6♠ → 7♥) recreates
    // the snapshot at the top of history, so it must be skipped → null.
    const tableau = [[], [], [], [], [], [], []];
    tableau[0] = [mk("hearts", 7, true)];
    tableau[1] = [mk("spades", 6, true)];
    const snapshotTableau = [[], [], [], [], [], [], []];
    snapshotTableau[0] = [mk("hearts", 7, true), mk("spades", 6, true)];
    const history = [
      {
        tableau: snapshotTableau,
        foundations: [[], [], [], []],
        waste: [],
        stock: [],
      },
    ];
    expect(getHint(klondike({ tableau, history }))).toBeNull();
  });
});
