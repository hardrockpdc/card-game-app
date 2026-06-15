import {
  createRummyState,
  rummyReducer,
  isValidRummyMeld,
} from "../game/rummy";

const J = (n) => ({ rank: "JOKER", suit: "JOKER", id: `J${n}` });
const C = (rank, suit) => ({ rank, suit, id: `${rank}${suit}` });

function discardPhaseStateWithHand(hand, variantId = "indianRummy") {
  const s = createRummyState({
    variantId,
    players: [{ name: "Me" }, { name: "AI", isAI: true }],
  });
  s.phase = "discard"; // jokers are laid during the discard/meld phase
  s.currentPlayerIndex = 0;
  s.hands[0] = hand;
  return s;
}

test("isValidRummyMeld accepts joker set and run", () => {
  expect(isValidRummyMeld([C("7", "♠"), C("7", "♥"), J(1)])).toBe(true);
  expect(isValidRummyMeld([C("5", "♠"), J(1), C("7", "♠")])).toBe(true);
});

test("lay-meld with a joker creates the meld (set)", () => {
  const hand = [C("7", "♠"), C("7", "♥"), J(1), C("K", "♦")];
  const s = discardPhaseStateWithHand(hand);
  const next = rummyReducer(s, { type: "lay-meld", cardIndexes: [0, 1, 2] });
  expect(next.melds.length).toBe(1);
  expect(next.melds[0].cards).toHaveLength(3);
  expect(next.melds[0].cards.some((c) => c.rank === "JOKER")).toBe(true);
  expect(next.hands[0]).toHaveLength(1); // only K left
});

test("lay-meld with a joker creates the meld (run)", () => {
  const hand = [C("5", "♠"), J(1), C("7", "♠"), C("K", "♦")];
  const s = discardPhaseStateWithHand(hand);
  const next = rummyReducer(s, { type: "lay-meld", cardIndexes: [0, 1, 2] });
  expect(next.melds.length).toBe(1);
  expect(next.melds[0].cards.some((c) => c.rank === "JOKER")).toBe(true);
});

test("extend-meld adds a joker to an existing set", () => {
  const hand = [J(1), C("K", "♦")];
  const s = discardPhaseStateWithHand(hand);
  s.melds = [
    {
      owner: 0,
      type: "set",
      cards: [C("7", "♠"), C("7", "♥"), C("7", "♦")],
    },
  ];
  const next = rummyReducer(s, {
    type: "extend-meld",
    meldIndex: 0,
    cardIndex: 0,
  });
  expect(next.melds[0].cards).toHaveLength(4);
  expect(next.melds[0].cards.some((c) => c.rank === "JOKER")).toBe(true);
});
