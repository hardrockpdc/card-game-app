import { reshuffleDeck, drawUntilPlayable } from "../game/lastCard";

// Card shape: { color, type, value }. State shape (only the fields these
// functions touch): { drawPile, discardPile, hands: {[id]: cards}, activeColor }.
// isPlayable does plain string equality on colors, so synthetic color names are
// fine here.
const num = (color, value) => ({ color, type: "number", value });

const baseState = (over = {}) => ({
  drawPile: [],
  discardPile: [num("red", 5)],
  hands: { "0": [] },
  activeColor: "red",
  ...over,
});

describe("reshuffleDeck", () => {
  test("no-op when the discard pile has 0 or 1 cards (nothing to recycle)", () => {
    const s = baseState({ discardPile: [num("red", 5)] });
    expect(reshuffleDeck(s)).toBe(s); // same reference, untouched
  });

  test("recycles all but the top discard back into the draw pile", () => {
    const top = num("green", 9);
    const s = baseState({
      drawPile: [num("red", 1)],
      // top of the discard is the LAST element
      discardPile: [num("red", 2), num("red", 3), top],
    });
    const out = reshuffleDeck(s);
    // top card stays as the only discard
    expect(out.discardPile).toEqual([top]);
    // draw pile gains the 2 recycled cards (1 original + 2 = 3)
    expect(out.drawPile).toHaveLength(3);
    // no cards created or lost across the whole table
    const before = s.drawPile.length + s.discardPile.length;
    const after = out.drawPile.length + out.discardPile.length;
    expect(after).toBe(before);
  });

  test("does not mutate the input state", () => {
    const s = baseState({
      drawPile: [num("red", 1)],
      discardPile: [num("red", 2), num("green", 9)],
    });
    const snap = JSON.parse(JSON.stringify(s));
    reshuffleDeck(s);
    expect(s).toEqual(snap);
  });
});

describe("drawUntilPlayable", () => {
  test("returns the first drawn card when it is immediately playable", () => {
    const playable = num("red", 7); // matches activeColor red
    const s = baseState({ drawPile: [playable, num("green", 2)] });
    const out = drawUntilPlayable(s, 0);
    expect(out.playableCard).toEqual(playable);
    expect(out.drawnCard).toEqual(playable);
    // only one card was drawn; the rest remain in the draw pile
    expect(out.state.drawPile).toHaveLength(1);
    expect(out.state.hands["0"]).toEqual([playable]);
  });

  test("keeps drawing past unplayable cards until a playable one appears", () => {
    const dud = num("green", 9); // not red, value != top(5)
    const playable = num("red", 7); // matches red
    const s = baseState({ drawPile: [dud, playable] });
    const out = drawUntilPlayable(s, 0);
    expect(out.playableCard).toEqual(playable);
    // both cards ended up in hand, draw pile exhausted
    expect(out.state.hands["0"]).toEqual([dud, playable]);
    expect(out.state.drawPile).toHaveLength(0);
  });

  test("reshuffles the discard when the draw pile runs dry, then draws", () => {
    // empty draw pile; discard top is green9, red5 is recyclable and playable
    const s = baseState({
      drawPile: [],
      discardPile: [num("red", 5), num("green", 9)],
      activeColor: "red",
    });
    const out = drawUntilPlayable(s, 0);
    expect(out.playableCard).toEqual(num("red", 5)); // recycled + matches red
    expect(out.state.hands["0"]).toEqual([num("red", 5)]);
  });

  test("returns nulls when nothing can be drawn (both piles exhausted)", () => {
    // empty draw pile and a single-card discard -> reshuffle can't help
    const s = baseState({ drawPile: [], discardPile: [num("red", 5)] });
    const out = drawUntilPlayable(s, 0);
    expect(out.drawnCard).toBeNull();
    expect(out.playableCard).toBeNull();
  });
});
