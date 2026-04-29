import cards from "./wildroundCards.json";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Returns { prompts, answers } shuffled and filtered by tone.
// 'family' = family-only cards; 'mature' = all cards (family + mature combined).
export function createDeck(tone) {
  const filter = tone === "mature" ? () => true : (c) => c.tone === "family";
  return {
    prompts: shuffle(cards.prompts.filter(filter)),
    answers: shuffle(cards.answers.filter(filter)),
  };
}

// Deals 10 answer cards to each player.
// Returns { players (each with .hand and .score initialised), answerDeck (remaining) }.
export function dealHands(players, answerDeck) {
  const deck = [...answerDeck];
  const dealt = players.map((p) => ({
    ...p,
    score: p.score ?? 0,
    hand: deck.splice(0, 10),
  }));
  return { players: dealt, answerDeck: deck };
}

// Draws the next prompt from the top of the deck.
// Returns { prompt (or null if empty), promptDeck (remaining) }.
export function pickPrompt(promptDeck) {
  const [prompt = null, ...remaining] = promptDeck;
  return { prompt, promptDeck: remaining };
}

// Records a player's answer submission after validating:
//   - player is not the judge
//   - player hasn't already submitted
//   - the card is actually in their hand
// Returns updated state (immutable).
export function processSubmission(state, playerId, cardId) {
  const pid = String(playerId);
  const judge = state.players[state.judgeIndex];
  if (String(judge.id) === pid) throw new Error("Judge cannot submit");
  if (state.submissions.some((s) => s.playerId === pid))
    throw new Error("Already submitted");
  const player = state.players.find((p) => String(p.id) === pid);
  if (!player) throw new Error("Player not found");
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) throw new Error("Card not in hand");
  return {
    ...state,
    submissions: [
      ...state.submissions,
      { playerId: pid, cardId, cardText: card.text },
    ],
  };
}

// Awards +1 point to the winner of the round.
// All submitters lose their submitted card and draw one replacement (if deck has cards).
// Returns updated state with phase set to 'reveal'.
export function pickWinner(state, winningCardId) {
  const winSub = state.submissions.find((s) => s.cardId === winningCardId);
  if (!winSub) throw new Error("Card not in submissions");

  const deckPool = [...state.answerDeck];

  const players = state.players.map((p) => {
    const sub = state.submissions.find((s) => s.playerId === String(p.id));
    if (!sub) return p; // judge — hand unchanged
    const trimmed = p.hand.filter((c) => c.id !== sub.cardId);
    const drawn = deckPool.splice(0, 10 - trimmed.length); // refill to 10
    return {
      ...p,
      score: String(p.id) === winSub.playerId ? p.score + 1 : p.score,
      hand: [...trimmed, ...drawn],
    };
  });

  return {
    ...state,
    players,
    answerDeck: deckPool,
    revealSubmissions: state.submissions, // saved for reveal phase before clearing
    submissions: [],
    currentPrompt: null,
    promptSkipped: false,
    phase: "reveal",
    lastWinnerId: winSub.playerId,
    lastWinningCardId: winningCardId,
  };
}

// Returns the winning player object if anyone has reached 10 points, otherwise null.
export function checkWin(state) {
  return state.players.find((p) => p.score >= 10) ?? null;
}

// ─── Console tests ────────────────────────────────────────────────────────────
// Call runTests() once from any useEffect during development to verify logic.
// Example: useEffect(() => { import('../game/wildround').then(m => m.runTests()); }, []);
export function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(label, condition) {
    if (condition) {
      console.log(`  ✓ ${label}`);
      passed++;
    } else {
      console.log(`  ✗ FAIL: ${label}`);
      failed++;
    }
  }

  console.log("\n=== Wild Round — Phase A tests ===\n");

  // ── createDeck ──────────────────────────────────────────────────────────────
  console.log("createDeck:");
  const familyDeck = createDeck("family");
  assert(
    "family prompts are all tone=family",
    familyDeck.prompts.every((c) => c.tone === "family"),
  );
  assert(
    "family answers are all tone=family",
    familyDeck.answers.every((c) => c.tone === "family"),
  );

  const matureDeck = createDeck("mature");
  assert(
    "mature deck includes family prompts",
    matureDeck.prompts.some((c) => c.tone === "family"),
  );
  assert(
    "mature deck includes mature prompts",
    matureDeck.prompts.some((c) => c.tone === "mature"),
  );
  assert(
    "mature deck includes family answers",
    matureDeck.answers.some((c) => c.tone === "family"),
  );
  assert(
    "mature deck includes mature answers",
    matureDeck.answers.some((c) => c.tone === "mature"),
  );
  assert(
    "mature deck has more answers than family deck",
    matureDeck.answers.length > familyDeck.answers.length,
  );

  // ── dealHands ───────────────────────────────────────────────────────────────
  console.log("\ndealHands:");
  const rawPlayers = [
    { id: "host", name: "Pedro" },
    { id: "2", name: "Maria" },
    { id: "3", name: "Luis" },
  ];
  const { players, answerDeck: remaining } = dealHands(
    rawPlayers,
    matureDeck.answers,
  );
  assert(
    "each player gets 10 cards",
    players.every((p) => p.hand.length === 10),
  );
  assert(
    "deck shrinks by 30",
    matureDeck.answers.length - remaining.length === 30,
  );
  assert(
    "scores initialised to 0",
    players.every((p) => p.score === 0),
  );
  assert(
    "no card dealt twice",
    (() => {
      const all = players.flatMap((p) => p.hand.map((c) => c.id));
      return new Set(all).size === all.length;
    })(),
  );

  // ── pickPrompt ──────────────────────────────────────────────────────────────
  console.log("\npickPrompt:");
  const { prompt, promptDeck: deckAfterPick } = pickPrompt(matureDeck.prompts);
  assert(
    "returns a prompt with text",
    !!prompt && typeof prompt.text === "string",
  );
  assert(
    "deck shrinks by 1",
    matureDeck.prompts.length - deckAfterPick.length === 1,
  );
  const { prompt: p2 } = pickPrompt([]);
  assert("returns null on empty deck", p2 === null);

  // ── processSubmission ───────────────────────────────────────────────────────
  console.log("\nprocessSubmission:");
  let state = {
    players,
    judgeIndex: 0, // Pedro is judge
    submissions: [],
    answerDeck: remaining,
    currentPrompt: prompt,
    promptSkipped: false,
    phase: "submission",
  };

  const mariaCard = players[1].hand[0];
  const luisCard = players[2].hand[0];

  state = processSubmission(state, "2", mariaCard.id);
  assert("Maria can submit", state.submissions.length === 1);

  let blocked = false;
  try {
    processSubmission(state, "host", players[0].hand[0].id);
  } catch (_) {
    blocked = true;
  }
  assert("judge cannot submit", blocked);

  let dupBlocked = false;
  try {
    processSubmission(state, "2", players[1].hand[1].id);
  } catch (_) {
    dupBlocked = true;
  }
  assert("duplicate submission blocked", dupBlocked);

  let badCardBlocked = false;
  try {
    processSubmission(state, "3", mariaCard.id);
  } catch (_) {
    // card not in Luis's hand
    badCardBlocked = true;
  }
  assert("card not in hand is blocked", badCardBlocked);

  state = processSubmission(state, "3", luisCard.id);
  assert("Luis can submit", state.submissions.length === 2);

  // ── pickWinner ──────────────────────────────────────────────────────────────
  console.log("\npickWinner:");
  const winningCardId = state.submissions[0].cardId; // Maria wins
  state = pickWinner(state, winningCardId);

  const maria = state.players.find((p) => p.id === "2");
  const luis = state.players.find((p) => p.id === "3");
  const pedro = state.players.find((p) => p.id === "host");

  assert("winner gets +1 point", maria.score === 1);
  assert("loser score unchanged", luis.score === 0);
  assert("judge score unchanged", pedro.score === 0);
  assert("winner hand replenished to 10", maria.hand.length === 10);
  assert("loser hand replenished to 10", luis.hand.length === 10);
  assert("judge hand unchanged", pedro.hand.length === 10);
  assert("submissions cleared", state.submissions.length === 0);
  assert("phase is reveal", state.phase === "reveal");
  assert("lastWinnerId set", state.lastWinnerId === "2");

  let badWinner = false;
  try {
    pickWinner(state, "nonexistent-card-id");
  } catch (_) {
    badWinner = true;
  }
  assert("invalid card id throws", badWinner);

  // ── checkWin ────────────────────────────────────────────────────────────────
  console.log("\ncheckWin:");
  assert("no winner at score 1", checkWin(state) === null);

  const atNineState = {
    ...state,
    players: state.players.map((p) => (p.id === "2" ? { ...p, score: 9 } : p)),
  };
  const atTenState = {
    ...state,
    players: state.players.map((p) => (p.id === "2" ? { ...p, score: 10 } : p)),
  };
  const aboveTenState = {
    ...state,
    players: state.players.map((p) => (p.id === "2" ? { ...p, score: 11 } : p)),
  };

  assert("no winner at score 9", checkWin(atNineState) === null);
  assert("winner detected at exactly 10", checkWin(atTenState)?.id === "2");
  assert("winner detected above 10", checkWin(aboveTenState)?.id === "2");

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
}
