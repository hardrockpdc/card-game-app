import {
  createSolitaireState,
  solitaireReducer,
  newGameAction,
  undoAction,
  setSpiderModeAction,
  tapAction,
  moveAction,
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
