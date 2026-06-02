import {
  createSolitaireState,
  solitaireReducer,
  newGameAction,
  undoAction,
  setSpiderModeAction,
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
