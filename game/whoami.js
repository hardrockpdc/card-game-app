// "Who Am I?" — pure game logic (multiplayer party game).
//
// Each round one player is the JUDGE: they type a secret (a celebrity, character,
// or thing). The other players are ASKERS who take turns asking yes/no questions;
// the judge answers Yes / No / "You got it!". The asker who gets the "You got it!"
// wins the round. First to `target` round-wins wins the game. The judge rotates
// each round so everyone plays.
//
// All functions are pure: they return a new state and never mutate their input.
// The host holds the authoritative state (including `secret`); `secret` is never
// broadcast — only the judge's own device knows it.

const DEFAULT_TARGET = 3;

// Players who are NOT the judge this round, in seating order. `askerIndex` is an
// index into THIS array.
export function nonJudgePlayers(state) {
  return (state.players || []).filter((_, i) => i !== state.judgeIndex);
}

export function currentJudge(state) {
  return (state.players || [])[state.judgeIndex] ?? null;
}

export function currentAsker(state) {
  const askers = nonJudgePlayers(state);
  if (askers.length === 0) return null;
  return askers[state.askerIndex % askers.length] ?? null;
}

export function createGame(players, options = {}) {
  const target = options.target ?? DEFAULT_TARGET;
  return {
    phase: "choosing", // "choosing" | "asking" | "gameOver"
    players: (players || []).map((p) => ({
      id: String(p.id),
      name: p.name,
      score: 0,
      isAI: !!p.isAI,
    })),
    judgeIndex: 0,
    askerIndex: 0,
    secret: null, // { text } — set by the judge; host-only, never broadcast
    history: [], // [{ askerId, askerName, question, answer }]
    pendingQuestion: null, // { askerId, askerName, question }
    roundNumber: 1,
    lastWinner: null, // { id, name }
    lastSecret: null, // the secret revealed when a round is won
    winner: null, // player object once the game is won
    target,
  };
}

// Judge submits the secret → move into the asking phase.
export function setSecret(state, text) {
  const trimmed = (text || "").trim();
  if (state.phase !== "choosing" || !trimmed) return state;
  return {
    ...state,
    secret: { text: trimmed },
    phase: "asking",
    askerIndex: 0,
    pendingQuestion: null,
  };
}

// Current asker submits a question → it becomes pending until the judge answers.
export function askQuestion(state, text) {
  const trimmed = (text || "").trim();
  if (state.phase !== "asking" || state.pendingQuestion || !trimmed) {
    return state;
  }
  const asker = currentAsker(state);
  if (!asker) return state;
  return {
    ...state,
    pendingQuestion: {
      askerId: asker.id,
      askerName: asker.name,
      question: trimmed,
    },
  };
}

// Judge answers yes/no → log it, clear the pending question, advance the turn.
export function recordAnswer(state, answer) {
  if (state.phase !== "asking" || !state.pendingQuestion) return state;
  if (answer !== "yes" && answer !== "no") return state;
  const askers = nonJudgePlayers(state);
  return {
    ...state,
    history: [...state.history, { ...state.pendingQuestion, answer }],
    pendingQuestion: null,
    askerIndex:
      askers.length > 0 ? (state.askerIndex + 1) % askers.length : 0,
  };
}

// Judge taps "You got it!" → the pending question's asker (the current asker)
// wins the round. Bump their score; end the game if they hit the target,
// otherwise start the next round.
export function awardRound(state) {
  if (state.phase !== "asking") return state;
  const winnerInfo = state.pendingQuestion
    ? { id: state.pendingQuestion.askerId, name: state.pendingQuestion.askerName }
    : currentAsker(state);
  if (!winnerInfo) return state;

  const players = state.players.map((p) =>
    String(p.id) === String(winnerInfo.id) ? { ...p, score: p.score + 1 } : p,
  );
  const winningPlayer = players.find(
    (p) => String(p.id) === String(winnerInfo.id),
  );
  const history = state.pendingQuestion
    ? [...state.history, { ...state.pendingQuestion, answer: "gotit" }]
    : state.history;

  const base = {
    ...state,
    players,
    pendingQuestion: null,
    lastWinner: { id: winningPlayer.id, name: winningPlayer.name },
    lastSecret: state.secret?.text ?? null, // reveal the word now the round is over
  };

  if (winningPlayer.score >= state.target) {
    return { ...base, history, phase: "gameOver", winner: winningPlayer };
  }
  return nextRound({ ...base, history });
}

// Rotate the judge and reset for a fresh round (scores + lastWinner persist).
export function nextRound(state) {
  const playerCount = state.players.length || 1;
  return {
    ...state,
    judgeIndex: (state.judgeIndex + 1) % playerCount,
    secret: null,
    phase: "choosing",
    askerIndex: 0,
    history: [],
    pendingQuestion: null,
    roundNumber: state.roundNumber + 1,
  };
}

export function checkWin(state) {
  return (
    (state.players || []).find((p) => p.score >= state.target) ?? null
  );
}

// Public view broadcast to clients: strips the secret (only the judge knows it).
export function toPublic(state) {
  return {
    phase: state.phase,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      isAI: !!p.isAI,
    })),
    judgeIndex: state.judgeIndex,
    askerIndex: state.askerIndex,
    currentAskerId: currentAsker(state)?.id ?? null,
    currentJudgeId: currentJudge(state)?.id ?? null,
    history: state.history,
    pendingQuestion: state.pendingQuestion,
    roundNumber: state.roundNumber,
    lastWinner: state.lastWinner,
    lastSecret: state.lastSecret ?? null,
    winner: state.winner
      ? { id: state.winner.id, name: state.winner.name, score: state.winner.score }
      : null,
    target: state.target,
  };
}
