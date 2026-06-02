import {
  createDeck,
  dealHands,
  pickPrompt,
  processSubmission,
  pickWinner,
  checkWin,
} from "../game/wildround";

// Synthetic answer cards so the round-logic tests don't depend on the JSON deck.
const ans = (id) => ({
  id,
  text: `answer ${id}`,
  tone: "family",
  source: "cc0",
});
const handOf = (prefix) =>
  Array.from({ length: 10 }, (_, i) => ans(`${prefix}${i}`));

// A submission-phase state: host (judgeIndex 0) plus two non-judge players.
function makeState(overrides = {}) {
  return {
    players: [
      { id: "host", name: "Pedro", score: 0, hand: handOf("h") },
      { id: "2", name: "Maria", score: 0, hand: handOf("m") },
      { id: "3", name: "Luis", score: 0, hand: handOf("l") },
    ],
    judgeIndex: 0,
    submissions: [],
    answerDeck: [ans("d0"), ans("d1"), ans("d2"), ans("d3")],
    currentPrompt: { id: "p1", text: "___", tone: "family" },
    promptSkipped: false,
    phase: "submission",
    ...overrides,
  };
}

describe("createDeck", () => {
  test("family tone yields only family cards", () => {
    const deck = createDeck("family");
    expect(deck.answers.every((c) => c.tone === "family")).toBe(true);
    expect(deck.prompts.every((c) => c.tone === "family")).toBe(true);
  });

  test("mature tone includes both family and mature cards", () => {
    const deck = createDeck("mature");
    expect(deck.answers.some((c) => c.tone === "family")).toBe(true);
    expect(deck.answers.some((c) => c.tone === "mature")).toBe(true);
  });

  test("mature deck is larger than the family-only deck", () => {
    expect(createDeck("mature").answers.length).toBeGreaterThan(
      createDeck("family").answers.length,
    );
  });
});

describe("dealHands", () => {
  test("gives each player 10 cards and initialises score to 0", () => {
    const deck = Array.from({ length: 40 }, (_, i) => ans(`x${i}`));
    const { players } = dealHands(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      deck,
    );
    expect(players.every((p) => p.hand.length === 10)).toBe(true);
    expect(players.every((p) => p.score === 0)).toBe(true);
  });

  test("shrinks the deck by 10 per player and deals no duplicates", () => {
    const deck = Array.from({ length: 40 }, (_, i) => ans(`x${i}`));
    const { players, answerDeck } = dealHands([{ id: "a" }, { id: "b" }], deck);
    expect(answerDeck).toHaveLength(20);
    const dealtIds = players.flatMap((p) => p.hand.map((c) => c.id));
    expect(new Set(dealtIds).size).toBe(dealtIds.length);
  });

  test("does not mutate the source deck", () => {
    const deck = Array.from({ length: 40 }, (_, i) => ans(`x${i}`));
    dealHands([{ id: "a" }], deck);
    expect(deck).toHaveLength(40);
  });
});

describe("pickPrompt", () => {
  test("draws the top prompt and returns the rest", () => {
    const result = pickPrompt([{ id: "p1" }, { id: "p2" }, { id: "p3" }]);
    expect(result.prompt).toEqual({ id: "p1" });
    expect(result.promptDeck).toHaveLength(2);
  });

  test("returns null prompt on an empty deck", () => {
    expect(pickPrompt([])).toEqual({ prompt: null, promptDeck: [] });
  });
});

describe("processSubmission", () => {
  test("records a valid submission with the card text", () => {
    const state = makeState();
    const card = state.players[1].hand[0];
    const next = processSubmission(state, "2", card.id);
    expect(next.submissions).toHaveLength(1);
    expect(next.submissions[0]).toMatchObject({
      playerId: "2",
      cardId: card.id,
      cardText: card.text,
    });
  });

  test("rejects the judge submitting", () => {
    const state = makeState();
    expect(() =>
      processSubmission(state, "host", state.players[0].hand[0].id),
    ).toThrow("Judge cannot submit");
  });

  test("rejects a second submission from the same player", () => {
    let state = makeState();
    state = processSubmission(state, "2", state.players[1].hand[0].id);
    expect(() =>
      processSubmission(state, "2", state.players[1].hand[1].id),
    ).toThrow("Already submitted");
  });

  test("rejects a card that is not in the player's hand", () => {
    const state = makeState();
    const mariaCard = state.players[1].hand[0];
    expect(() => processSubmission(state, "3", mariaCard.id)).toThrow(
      "Card not in hand",
    );
  });

  test("rejects an unknown player", () => {
    const state = makeState();
    expect(() => processSubmission(state, "99", "anything")).toThrow(
      "Player not found",
    );
  });
});

describe("pickWinner", () => {
  // State with Maria and Luis both submitted; host is judge.
  function submittedState() {
    let state = makeState();
    state = processSubmission(state, "2", state.players[1].hand[0].id);
    state = processSubmission(state, "3", state.players[2].hand[0].id);
    return state;
  }

  test("awards the winner +1 and leaves others unchanged", () => {
    const state = submittedState();
    const winningCardId = state.submissions[0].cardId; // Maria
    const next = pickWinner(state, winningCardId);
    const score = (id) => next.players.find((p) => p.id === id).score;
    expect(score("2")).toBe(1);
    expect(score("3")).toBe(0);
    expect(score("host")).toBe(0);
  });

  test("refills submitters to 10 and leaves the judge's hand alone", () => {
    const state = submittedState();
    const next = pickWinner(state, state.submissions[0].cardId);
    const hand = (id) => next.players.find((p) => p.id === id).hand;
    expect(hand("2")).toHaveLength(10);
    expect(hand("3")).toHaveLength(10);
    expect(hand("host")).toHaveLength(10);
  });

  test("clears submissions, advances to reveal, and records the winner", () => {
    const state = submittedState();
    const winningCardId = state.submissions[0].cardId;
    const next = pickWinner(state, winningCardId);
    expect(next.submissions).toHaveLength(0);
    expect(next.phase).toBe("reveal");
    expect(next.lastWinnerId).toBe("2");
    expect(next.lastWinningCardId).toBe(winningCardId);
    expect(next.revealSubmissions).toHaveLength(2);
  });

  test("throws when the winning card was never submitted", () => {
    const state = submittedState();
    expect(() => pickWinner(state, "nonexistent")).toThrow(
      "Card not in submissions",
    );
  });

  test("with an empty answer deck, a submitter's hand stays at 9", () => {
    let state = makeState({ answerDeck: [] });
    state = processSubmission(state, "2", state.players[1].hand[0].id);
    const next = pickWinner(state, state.submissions[0].cardId);
    expect(next.players.find((p) => p.id === "2").hand).toHaveLength(9);
  });
});

describe("checkWin", () => {
  const withScore = (score) => ({
    players: [
      { id: "2", score },
      { id: "3", score: 0 },
    ],
  });

  test("no winner below 10", () => {
    expect(checkWin(withScore(1))).toBeNull();
    expect(checkWin(withScore(9))).toBeNull();
  });

  test("winner at exactly 10 and above", () => {
    expect(checkWin(withScore(10))?.id).toBe("2");
    expect(checkWin(withScore(11))?.id).toBe("2");
  });
});
