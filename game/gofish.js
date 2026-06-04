// game/gofish.js — pure Go Fish game logic (extracted from the screen so it
// can be unit-tested and matches the other games' game/<name>.js layout).
import { createDeck, shuffleDeck } from "./deck";

export function dealGoFish(playerList) {
  let deck = shuffleDeck(createDeck());
  const perPlayer = playerList.length === 2 ? 7 : 5;
  const hands = {};
  let i = 0;
  for (const p of playerList) {
    hands[String(p.id)] = deck.slice(i, i + perPlayer);
    i += perPlayer;
  }
  let state = {
    phase: "playing",
    ocean: deck.slice(i),
    hands,
    books: Object.fromEntries(playerList.map((p) => [String(p.id), []])),
    currentPlayerIndex: 0,
    extraTurn: false,
    lastAction: null,
    players: playerList,
    winner: null,
    history: [],
  };
  for (const p of playerList) state = checkBooks(state, String(p.id));
  return state;
}

export function checkBooks(state, pid) {
  const hand = state.hands[pid] || [];
  const counts = {};
  for (const c of hand) counts[c.rank] = (counts[c.rank] || 0) + 1;
  let newHand = [...hand];
  let newBooks = [...(state.books[pid] || [])];
  for (const [rank, n] of Object.entries(counts)) {
    if (n === 4) {
      newHand = newHand.filter((c) => c.rank !== rank);
      newBooks.push(rank);
    }
  }
  return {
    ...state,
    hands: { ...state.hands, [pid]: newHand },
    books: { ...state.books, [pid]: newBooks },
  };
}

export function checkWin(state) {
  const totalBooks = Object.values(state.books).reduce(
    (s, b) => s + b.length,
    0,
  );
  const allEmpty = Object.values(state.hands).every((h) => h.length === 0);
  if (totalBooks === 13 || (allEmpty && state.ocean.length === 0)) {
    const maxBooks = Math.max(
      ...Object.values(state.books).map((b) => b.length),
      0,
    );
    const winnerId = Object.entries(state.books).find(
      ([, b]) => b.length === maxBooks,
    )?.[0];
    const winner =
      state.players.find((p) => String(p.id) === winnerId) || state.players[0];
    return { ...state, phase: "results", winner };
  }
  return state;
}

export function nextTurn(state) {
  let nextIdx = (state.currentPlayerIndex + 1) % state.players.length;
  let s = { ...state, currentPlayerIndex: nextIdx, extraTurn: false };
  // If the next player has no cards but ocean has cards, draw one for them
  const nextPid = String(s.players[nextIdx].id);
  if (s.hands[nextPid].length === 0 && s.ocean.length > 0) {
    const [drawn, ...rest] = s.ocean;
    s = { ...s, ocean: rest, hands: { ...s.hands, [nextPid]: [drawn] } };
  }
  return s;
}

export function doAsk(state, fromId, targetId, rank) {
  const fromPid = String(fromId);
  const toPid = String(targetId);
  if (!state.hands[fromPid]?.some((c) => c.rank === rank)) return state;

  const targetHand = state.hands[toPid] || [];
  const matching = targetHand.filter((c) => c.rank === rank);
  const fromName = state.players.find((p) => String(p.id) === fromPid)?.name;
  const toName = state.players.find((p) => String(p.id) === toPid)?.name;
  const newHistory = [
    ...(state.history || []),
    { fromPid, toPid, rank, gotCards: matching.length > 0 },
  ];

  let s;
  let extraTurn = false;
  let lastAction;

  if (matching.length > 0) {
    s = {
      ...state,
      history: newHistory,
      hands: {
        ...state.hands,
        [toPid]: targetHand.filter((c) => c.rank !== rank),
        [fromPid]: [...state.hands[fromPid], ...matching],
      },
    };
    extraTurn = true;
    lastAction = `${fromName} asked ${toName} for ${rank}s — got ${matching.length}! 🎉`;
  } else if (state.ocean.length > 0) {
    const [drawn, ...rest] = state.ocean;
    s = {
      ...state,
      history: newHistory,
      ocean: rest,
      hands: { ...state.hands, [fromPid]: [...state.hands[fromPid], drawn] },
    };
    extraTurn = drawn.rank === rank;
    lastAction = extraTurn
      ? `${fromName} went fishing and caught a ${rank}! Extra turn! ⭐`
      : `${fromName} asked for ${rank}s — Go Fish! 🐟`;
  } else {
    s = { ...state, history: newHistory };
    lastAction = `${fromName} asked for ${rank}s — Go Fish! (Ocean empty) 🌊`;
  }

  s = checkBooks(s, fromPid);
  s = checkWin(s);
  if (s.phase === "results") return { ...s, lastAction };

  if (extraTurn) return { ...s, extraTurn: true, lastAction };
  return { ...nextTurn(s), extraTurn: false, lastAction };
}

export function toPublic(state) {
  return {
    phase: state.phase,
    oceanSize: state.ocean.length,
    handSizes: Object.fromEntries(
      Object.entries(state.hands).map(([id, h]) => [id, h.length]),
    ),
    books: state.books,
    currentPlayerIndex: state.currentPlayerIndex,
    extraTurn: state.extraTurn,
    lastAction: state.lastAction,
    players: state.players,
    winner: state.winner,
  };
}

// ─── AI ───────────────────────────────────────────────────────────────────────

export function pickGoFishAIMove(state, aiPid, opponents, difficulty) {
  const hand = state.hands[aiPid] || [];
  const history = state.history || [];

  // No move possible with no cards or no opponents — the screen already guards
  // this, but return null defensively so the pure function can't crash.
  if (hand.length === 0 || !opponents || opponents.length === 0) return null;

  if (difficulty === "easy") {
    const rank = hand[Math.floor(Math.random() * hand.length)].rank;
    const target = opponents[Math.floor(Math.random() * opponents.length)];
    return { rank, target };
  }

  // Rank with most cards (Medium + Hard start here)
  const counts = {};
  for (const c of hand) counts[c.rank] = (counts[c.rank] || 0) + 1;
  const bestRank = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

  if (difficulty === "medium") {
    // Check last asks for someone who gave this rank
    const recentGiverPid = [...history]
      .reverse()
      .find(
        (h) =>
          h.rank === bestRank &&
          h.gotCards &&
          opponents.some((o) => String(o.id) === h.toPid),
      )?.toPid;
    const target = recentGiverPid
      ? (opponents.find((o) => String(o.id) === recentGiverPid) ??
        opponents[Math.floor(Math.random() * opponents.length)])
      : opponents[Math.floor(Math.random() * opponents.length)];
    return { rank: bestRank, target };
  }

  // Hard: score each opponent from full history
  const scores = {};
  for (const opp of opponents) {
    const oppPid = String(opp.id);
    scores[oppPid] = 0;
    for (const h of history) {
      if (h.toPid === oppPid && h.rank === bestRank) {
        scores[oppPid] = h.gotCards
          ? scores[oppPid] + 2
          : Math.max(scores[oppPid] - 1, 0);
      }
      if (h.fromPid === oppPid && h.rank === bestRank && h.gotCards) {
        scores[oppPid] += 1;
      }
    }
  }
  const maxScore = Math.max(...opponents.map((o) => scores[String(o.id)]));
  const target =
    maxScore > 0
      ? (opponents.find((o) => scores[String(o.id)] === maxScore) ??
        opponents[0])
      : opponents[Math.floor(Math.random() * opponents.length)];
  return { rank: bestRank, target };
}

// ─── Hand sort ────────────────────────────────────────────────────────────────

const RANK_ORDER = {
  A: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  10: 10,
  J: 11,
  Q: 12,
  K: 13,
};

export function sortHand(hand) {
  return [...hand].sort(
    (a, b) => (RANK_ORDER[a.rank] ?? 99) - (RANK_ORDER[b.rank] ?? 99),
  );
}
