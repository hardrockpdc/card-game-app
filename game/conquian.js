// game/conquian.js — Pure Conquián game logic, Phase A
// No Priority Chain, no borrowing. Single-player vs AI only.

import { shuffleDeck } from "./deck";

// ─── Constants ────────────────────────────────────────────────────────────────

export const CONQUIAN_RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "J",
  "Q",
  "K",
];
const SUITS = ["♠", "♥", "♦", "♣"];

// Internal sequence values: J=8, Q=9, K=10 so 7→J is consecutive
export const RANK_VAL = {
  A: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  J: 8,
  Q: 9,
  K: 10,
};

// ─── Deck ─────────────────────────────────────────────────────────────────────

export function createConquianDeck() {
  const cards = [];
  for (const suit of SUITS) {
    for (const rank of CONQUIAN_RANKS) {
      cards.push({ rank, suit, id: `${rank}${suit}` });
    }
  }
  return shuffleDeck(cards);
}

// ─── Meld validation ──────────────────────────────────────────────────────────

// 3–4 same rank, ALL different suits
export function isValidSet(cards) {
  if (cards.length < 3 || cards.length > 4) return false;
  if (!cards.every((c) => c.rank === cards[0].rank)) return false;
  const suits = cards.map((c) => c.suit);
  return new Set(suits).size === suits.length;
}

// 3+ same suit, consecutive per RANK_VAL (7→J valid)
export function isValidRun(cards) {
  if (cards.length < 3) return false;
  if (!cards.every((c) => c.suit === cards[0].suit)) return false;
  const vals = cards.map((c) => RANK_VAL[c.rank]).sort((a, b) => a - b);
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] !== vals[i - 1] + 1) return false;
  }
  return true;
}

export function isValidMeld(cards) {
  return (
    !!cards && cards.length >= 3 && (isValidSet(cards) || isValidRun(cards))
  );
}

function sortMeldCards(cards) {
  return [...cards].sort((a, b) => {
    const rankDiff = RANK_VAL[a.rank] - RANK_VAL[b.rank];
    if (rankDiff !== 0) return rankDiff;
    return a.suit.localeCompare(b.suit);
  });
}

// Can `card` legally extend `meld` (set or run)?
export function canExtendMeld(meld, card) {
  if (isValidSet(meld) && meld.length < 4 && card.rank === meld[0].rank) {
    return !meld.some((c) => c.suit === card.suit); // must be a new suit
  }
  if (isValidRun(meld) && card.suit === meld[0].suit) {
    const vals = meld.map((c) => RANK_VAL[c.rank]).sort((a, b) => a - b);
    const v = RANK_VAL[card.rank];
    return v === vals[0] - 1 || v === vals[vals.length - 1] + 1;
  }
  return false;
}

// ─── Auto-Take rule ───────────────────────────────────────────────────────────
// Whenever the active card DIRECTLY extends a meld the offered player already has
// on the table (no borrowing), they cannot pass it — it is auto-added and they
// must immediately discard. Clockwise priority order is unchanged; this only
// removes the *pass* option for whoever the card lands on. Applies to a card
// offered in the chain AND to the player's own draw. See CONQUIAN_SPEC.md.

// Index of the first own meld the active card directly extends, or -1.
export function forcedExtendIndex(state, playerPid) {
  if (!state || !state.activeCard) return -1;
  const myMelds = state.melds[String(playerPid)] ?? [];
  for (let i = 0; i < myMelds.length; i++) {
    if (canExtendMeld(myMelds[i], state.activeCard)) return i;
  }
  return -1;
}

// If the player currently on the clock (turnPhase "action", a card in front of
// them) can directly extend one of their melds, resolve the forced take and flag
// it for the UI. No-op otherwise. Called at every point the active card lands on
// a player or the player's table melds change while a card is active.
function applyAutoTake(state) {
  if (
    !state ||
    state.phase !== "playing" ||
    state.turnPhase !== "action" ||
    !state.activeCard
  )
    return state;
  const curPid = pid(state.players[state.currentPlayerIndex]);
  const idx = forcedExtendIndex(state, curPid);
  if (idx === -1) return state;
  const card = state.activeCard;
  const taken = doTakeActiveCard(state, curPid, {
    type: "extend",
    meldIdx: idx,
  });
  if (taken === state) return state; // safety — the take should always succeed
  return {
    ...taken,
    autoTook: { pid: curPid, id: card.id, rank: card.rank, suit: card.suit },
  };
}

// ─── Config ───────────────────────────────────────────────────────────────────

export function getConfig(playerCount) {
  if (playerCount <= 2) return { handSize: 10, winTarget: 11 };
  if (playerCount === 3) return { handSize: 8, winTarget: 9 };
  return { handSize: 7, winTarget: 8 };
}

// ─── State helpers ────────────────────────────────────────────────────────────

export function meldedCount(state, pid) {
  return (state.melds[String(pid)] ?? []).reduce((sum, g) => sum + g.length, 0);
}

function pid(p) {
  return String(p.id ?? p);
}

function winCheck(state, pidStr) {
  if (meldedCount(state, pidStr) >= state.winTarget) {
    return {
      ...state,
      phase: "results",
      winner: state.players.find((p) => pid(p) === pidStr) ?? null,
      tie: false,
    };
  }
  return state;
}

function advanceTurn(state) {
  return {
    ...state,
    activeCard: null,
    currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
    turnPhase: "draw",
  };
}

// ─── Deal & Initial Pass ──────────────────────────────────────────────────────

export function deal(playerList, options = {}) {
  const { handSize, winTarget } = getConfig(playerList.length);
  const deck = createConquianDeck();
  const hands = {};
  let i = 0;
  for (const p of playerList) {
    hands[pid(p)] = deck.slice(i, i + handSize);
    i += handSize;
  }
  // Dealer: random on first deal, otherwise provided by caller (typically the previous winner's index).
  const dealerIndex =
    typeof options.dealerIndex === "number" && options.dealerIndex >= 0
      ? options.dealerIndex % playerList.length
      : Math.floor(Math.random() * playerList.length);
  // First player is to the dealer's left (clockwise = next index).
  const firstPlayerIndex = (dealerIndex + 1) % playerList.length;
  return {
    phase: "initialPass",
    players: playerList,
    winTarget,
    stock: deck.slice(i),
    deadPile: [],
    activeCard: null,
    hands,
    melds: Object.fromEntries(playerList.map((p) => [pid(p), []])),
    passSelections: Object.fromEntries(playerList.map((p) => [pid(p), null])),
    currentPlayerIndex: firstPlayerIndex,
    turnPhase: "draw",
    winner: null,
    tie: false,
    dealerIndex,
    originalDrawerIndex: firstPlayerIndex,
    activeCardSourcePid: null,
    chainPassedPids: [],
    autoTook: null,
  };
}

// Player picks one card from their hand to pass clockwise.
// When all players have picked, passes resolve simultaneously.
export function doSelectPassCard(state, playerPid, cardId) {
  if (state.phase !== "initialPass") return state;
  const pidStr = String(playerPid);
  if (!state.hands[pidStr]?.some((c) => c.id === cardId)) return state;

  const newSels = { ...state.passSelections, [pidStr]: cardId };
  const allDone = state.players.every((p) => newSels[pid(p)] !== null);
  if (!allDone) return { ...state, passSelections: newSels };

  // Resolve: player[i] passes to player[(i+1)%n], receives from player[(i-1+n)%n]
  const n = state.players.length;
  const finalHands = {};
  for (let i = 0; i < n; i++) {
    const myPid = pid(state.players[i]);
    const donorPid = pid(state.players[(i - 1 + n) % n]);
    const removedId = newSels[myPid];
    const receivedCard = state.hands[donorPid].find(
      (c) => c.id === newSels[donorPid],
    );
    finalHands[myPid] = [
      ...state.hands[myPid].filter((c) => c.id !== removedId),
      receivedCard,
    ];
  }

  return {
    ...state,
    phase: "playing",
    hands: finalHands,
    passSelections: Object.fromEntries(
      state.players.map((p) => [pid(p), null]),
    ),
    // Spec: first player is to the dealer's left (dealerIndex is set in deal()).
    // Preserve that computed starting index after the initial pass resolves.
    currentPlayerIndex: state.currentPlayerIndex,
    turnPhase: "draw",
    originalDrawerIndex: state.currentPlayerIndex,
    activeCardSourcePid: null,
    chainPassedPids: [],
  };
}

// ─── Draw ─────────────────────────────────────────────────────────────────────

export function doDrawFromStock(state) {
  if (state.phase !== "playing" || state.turnPhase !== "draw") return state;
  if (state.stock.length === 0) {
    return { ...state, phase: "results", tie: true, winner: null };
  }
  const drawerPid = pid(state.players[state.currentPlayerIndex]);
  const [activeCard, ...stock] = state.stock;
  // Auto-Take applies to your own draw too: if the drawn card extends one of your
  // table melds it's force-taken immediately (you don't get to pass it).
  return applyAutoTake({
    ...state,
    stock,
    activeCard,
    turnPhase: "action",
    originalDrawerIndex: state.currentPlayerIndex,
    activeCardSourcePid: drawerPid,
    chainPassedPids: [],
    autoTook: null,
  });
}

// ─── Free actions (only on your own draw turn) ────────────────────────────────

// Lay down a NEW meld using only hand cards (no active card involved)
export function doLayDownMeld(state, playerPid, cardIds) {
  if (state.phase !== "playing" || state.turnPhase !== "action") return state;
  const pidStr = String(playerPid);
  if (pid(state.players[state.currentPlayerIndex]) !== pidStr) return state;
  // Free melds only allowed during original drawer's own action window, not chain offers
  if (
    state.currentPlayerIndex !== state.originalDrawerIndex ||
    state.chainPassedPids.length > 0
  )
    return state;
  const hand = state.hands[pidStr] ?? [];
  const cards = cardIds
    .map((id) => hand.find((c) => c.id === id))
    .filter(Boolean);
  if (cards.length !== cardIds.length || !isValidMeld(cards)) return state; // caller validates
  const next = {
    ...state,
    hands: {
      ...state.hands,
      [pidStr]: hand.filter((c) => !cardIds.includes(c.id)),
    },
    melds: {
      ...state.melds,
      [pidStr]: [...(state.melds[pidStr] ?? []), sortMeldCards(cards)],
    },
  };
  // A meld just laid down may now be directly extendable by the active card →
  // that triggers a forced auto-take.
  return applyAutoTake(winCheck(next, pidStr));
}

// Extend an existing own meld with hand cards only (no active card involved)
export function doExtendMeldFromHand(state, playerPid, meldIdx, cardIds) {
  if (state.phase !== "playing" || state.turnPhase !== "action") return state;
  const pidStr = String(playerPid);
  if (pid(state.players[state.currentPlayerIndex]) !== pidStr) return state;
  // Free melds only allowed during original drawer's own action window, not chain offers
  if (
    state.currentPlayerIndex !== state.originalDrawerIndex ||
    state.chainPassedPids.length > 0
  )
    return state;
  const hand = state.hands[pidStr] ?? [];
  const myMelds = state.melds[pidStr] ?? [];
  const target = myMelds[meldIdx];
  if (!target) return state;
  const cards = cardIds
    .map((id) => hand.find((c) => c.id === id))
    .filter(Boolean);
  if (cards.length !== cardIds.length) return state;
  const newMeld = [...target, ...cards];
  if (!isValidMeld(newMeld)) return state;
  const next = {
    ...state,
    hands: {
      ...state.hands,
      [pidStr]: hand.filter((c) => !cardIds.includes(c.id)),
    },
    melds: {
      ...state.melds,
      [pidStr]: myMelds.map((m, i) =>
        i === meldIdx ? sortMeldCards(newMeld) : m,
      ),
    },
  };
  // The extended meld may now be directly extendable by the active card too.
  return applyAutoTake(winCheck(next, pidStr));
}

// ─── Take active card ─────────────────────────────────────────────────────────

// meldAction: { type:'new', handCardIds:[] }  — new meld (active + hand cards)
//           | { type:'extend', meldIdx:n }     — extend own existing meld with active card
export function doTakeActiveCard(state, playerPid, meldAction) {
  if (
    state.phase !== "playing" ||
    state.turnPhase !== "action" ||
    !state.activeCard
  )
    return state;
  const pidStr = String(playerPid);
  if (pid(state.players[state.currentPlayerIndex]) !== pidStr) return state;

  const hand = state.hands[pidStr] ?? [];
  const myMelds = state.melds[pidStr] ?? [];
  let newHand = [...hand];
  let newMelds = [...myMelds];

  if (meldAction.type === "new") {
    const hCards = meldAction.handCardIds
      .map((id) => hand.find((c) => c.id === id))
      .filter(Boolean);
    if (hCards.length !== meldAction.handCardIds.length) return state;
    const meldCards = [state.activeCard, ...hCards];
    if (!isValidMeld(meldCards)) return state;
    newHand = hand.filter((c) => !meldAction.handCardIds.includes(c.id));
    newMelds = [...myMelds, sortMeldCards(meldCards)];
  } else if (meldAction.type === "extend") {
    const target = myMelds[meldAction.meldIdx];
    if (!target || !canExtendMeld(target, state.activeCard)) return state;
    newMelds = myMelds.map((m, i) =>
      i === meldAction.meldIdx ? sortMeldCards([...m, state.activeCard]) : m,
    );
  } else {
    return state;
  }

  const next = {
    ...state,
    hands: { ...state.hands, [pidStr]: newHand },
    melds: { ...state.melds, [pidStr]: newMelds },
    activeCard: null,
    turnPhase: "discard",
  };
  return winCheck(next, pidStr);
}

// ─── Pass active card — Priority Chain ───────────────────────────────────────

export function doPassActiveCard(state) {
  if (state.phase !== "playing" || state.turnPhase !== "action") return state;

  const currentPid = pid(state.players[state.currentPlayerIndex]);
  // Auto-Take: you can't pass a card that directly extends one of your melds.
  // (Normally the card auto-resolves before reaching here; this is the
  // authoritative guard so an illegal pass can't slip through.)
  if (forcedExtendIndex(state, currentPid) !== -1) return state;
  const newPassedPids = [...state.chainPassedPids, currentPid];
  const n = state.players.length;

  // Ineligible: whoever put the card in the slot + everyone who already passed it
  const ineligible = new Set(
    [state.activeCardSourcePid, ...newPassedPids].filter(Boolean),
  );

  // Find next eligible player clockwise
  let nextIdx = -1;
  for (let step = 1; step < n; step++) {
    const candidate = state.players[(state.currentPlayerIndex + step) % n];
    if (!ineligible.has(pid(candidate))) {
      nextIdx = (state.currentPlayerIndex + step) % n;
      break;
    }
  }

  if (nextIdx !== -1) {
    // Offer card to next eligible player — who may be force-taken if it extends
    // one of their melds.
    return applyAutoTake({
      ...state,
      chainPassedPids: newPassedPids,
      currentPlayerIndex: nextIdx,
      autoTook: null,
    });
  }

  // Chain exhausted — card goes to dead pile
  const newDead = state.activeCard
    ? [...state.deadPile, state.activeCard]
    : state.deadPile;
  if (state.stock.length === 0) {
    return {
      ...state,
      phase: "results",
      tie: true,
      winner: null,
      activeCard: null,
      deadPile: newDead,
    };
  }
  // Official turn advances to player after the original drawer
  const nextDrawer = (state.originalDrawerIndex + 1) % n;
  return {
    ...state,
    deadPile: newDead,
    activeCard: null,
    chainPassedPids: [],
    activeCardSourcePid: null,
    originalDrawerIndex: nextDrawer,
    currentPlayerIndex: nextDrawer,
    turnPhase: "draw",
  };
}

// ─── Discard — starts a new chain with the discarded card ─────────────────────

export function doDiscardCard(state, playerPid, cardId) {
  if (state.phase !== "playing" || state.turnPhase !== "discard") return state;
  const pidStr = String(playerPid);
  if (pid(state.players[state.currentPlayerIndex]) !== pidStr) return state;
  const hand = state.hands[pidStr] ?? [];
  const card = hand.find((c) => c.id === cardId);
  if (!card) return state;

  // Discarded card becomes the new active card, offered clockwise from the
  // discarder — who may be force-taken if it extends one of their melds. Clearing
  // autoTook here consumes the just-shown "auto-added" flag from this discarder.
  const n = state.players.length;
  const nextIdx = (state.currentPlayerIndex + 1) % n;
  return applyAutoTake({
    ...state,
    hands: { ...state.hands, [pidStr]: hand.filter((c) => c.id !== cardId) },
    activeCard: card,
    activeCardSourcePid: pidStr,
    chainPassedPids: [],
    currentPlayerIndex: nextIdx,
    turnPhase: "action",
    autoTook: null,
  });
}

// ─── Borrow Take ─────────────────────────────────────────────────────────────
// Take with full meld rearrangement.
// finalMelds = the complete proposed meld arrangement (Card[][]).
// Cards not placed in finalMelds return to hand. The active card is optional.
export function doTakeWithBorrow(state, playerPid, finalMelds) {
  if (state.phase !== "playing" || state.turnPhase !== "action") return state;
  const pidStr = String(playerPid);
  if (pid(state.players[state.currentPlayerIndex]) !== pidStr) return state;
  if (!finalMelds || finalMelds.length === 0) return state;

  // All groups must be valid melds
  if (!finalMelds.every((m) => isValidMeld(m))) return state;

  const allCards = finalMelds.flat();
  const activeId = state.activeCard?.id ?? null;
  const activeUsed = activeId ? allCards.some((c) => c.id === activeId) : false;

  // Every card used must come from the allowed pool: hand + own melds + active card
  const pool = [
    state.activeCard,
    ...(state.hands[pidStr] ?? []),
    ...(state.melds[pidStr] ?? []).flat(),
  ].filter(Boolean);
  const poolIds = new Set(pool.map((c) => c.id));
  if (!allCards.every((c) => poolIds.has(c.id))) return state;

  // Cards not placed in any meld go back to hand. If the active card is unused, it stays active.
  const usedIds = new Set(allCards.map((c) => c.id));
  const newHand = pool.filter((c) => c.id !== activeId && !usedIds.has(c.id));

  const next = {
    ...state,
    hands: { ...state.hands, [pidStr]: newHand },
    melds: {
      ...state.melds,
      [pidStr]: finalMelds.map((meld) => sortMeldCards(meld)),
    },
    activeCard: activeUsed ? null : state.activeCard,
    turnPhase: activeUsed ? "discard" : "action",
  };
  // If the borrow rearrangement left the active card unused but it now directly
  // extends one of the rearranged melds, that's a forced auto-take.
  return applyAutoTake(winCheck(next, pidStr));
}

// ─── AI helpers ───────────────────────────────────────────────────────────────

function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  return [
    ...combinations(rest, k - 1).map((c) => [first, ...c]),
    ...combinations(rest, k),
  ];
}

function connectionScore(card, hand) {
  return hand.filter((c) => {
    if (c.id === card.id) return false;
    if (c.rank === card.rank) return true;
    return (
      c.suit === card.suit &&
      Math.abs(RANK_VAL[c.rank] - RANK_VAL[card.rank]) === 1
    );
  }).length;
}

// Card id that is most isolated (best to discard / pass in initial pass)
export function aiMostIsolated(hand) {
  if (!hand.length) return null;
  return [...hand].sort(
    (a, b) => connectionScore(a, hand) - connectionScore(b, hand),
  )[0].id;
}

// Best valid meld from hand cards only (no active card), returns card id array or null
export function aiBestHandMeld(hand) {
  for (let sz = Math.min(hand.length, 4); sz >= 3; sz--) {
    for (const combo of combinations(hand, sz)) {
      if (isValidMeld(combo)) return combo.map((c) => c.id);
    }
  }
  return null;
}

// Returns a meldAction ({ type, ... }) if AI can take active card, else null
export function aiCanTake(state, playerPid) {
  const pidStr = String(playerPid);
  const ac = state.activeCard;
  if (!ac) return null;
  const hand = state.hands[pidStr] ?? [];
  const myMelds = state.melds[pidStr] ?? [];

  // Prefer extending an existing meld (simpler)
  for (let i = 0; i < myMelds.length; i++) {
    if (canExtendMeld(myMelds[i], ac)) return { type: "extend", meldIdx: i };
  }

  // Try forming a new meld with hand cards
  const pool = [ac, ...hand];
  for (let sz = Math.min(pool.length, 4); sz >= 3; sz--) {
    for (const combo of combinations(pool, sz)) {
      if (combo.some((c) => c.id === ac.id) && isValidMeld(combo)) {
        return {
          type: "new",
          handCardIds: combo.filter((c) => c.id !== ac.id).map((c) => c.id),
        };
      }
    }
  }
  return null;
}
