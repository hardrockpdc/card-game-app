import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HapticTouchable as TouchableOpacity } from "../components/Haptic";
import { createDeck, shuffleDeck } from "../game/deck";
import { addCoins } from "../game/wallet";
import { saveGame, loadGame, clearGame } from "../game/gameSaves";
import { recordWin } from "../game/profile";
import { hapticWin, hapticLose } from "../game/haptics";
import Card from "../components/Card";
import { scale, scaleFont } from "../game/responsive";
import GameHeader from "../components/GameHeader";
import EndOfRoundModal from "../components/EndOfRoundModal";
import YourTurnBanner from "../components/YourTurnBanner";
import useYourTurnBanner from "../components/useYourTurnBanner";
import {
  setServerListeners,
  broadcastToClients,
  sendToClient,
  setClientListeners,
  sendToHost,
  stopServer,
  disconnectFromHost,
} from "../game/GameNetwork";
import { getTableTheme } from "../game/tableThemes";
import {
  POKER_TABLES,
  getPokerTableId,
  setPokerTable,
  subscribePokerTable,
} from "../game/pokerTheme";
import TableThemePicker from "../components/TableThemePicker";
import ProfileAvatar from "../components/ProfileAvatar";
import useMultiplayerAvatars from "../components/useMultiplayerAvatars";

const AI_MOVE_DELAY_MS = 700; // delay between AI opponent moves (ms)

const BG = getTableTheme("poker").table;

// ─── Constants ───────────────────────────────────────────────────────────────

const STARTING_CHIPS = 500;
const POKER_WIN_REWARD = 500; // flat coins for winning a single-player tournament
const SMALL_BLIND = 10;
const BIG_BLIND = 20;

// ─── Hand evaluation ──────────────────────────────────────────────────────────

const RANK_VAL = {
  A: 14,
  K: 13,
  Q: 12,
  J: 11,
  10: 10,
  9: 9,
  8: 8,
  7: 7,
  6: 6,
  5: 5,
  4: 4,
  3: 3,
  2: 2,
};

function evaluate5(cards) {
  const vals = cards.map((c) => RANK_VAL[c.rank]).sort((a, b) => b - a);
  const isFlush = new Set(cards.map((c) => c.suit)).size === 1;
  const allUniq = new Set(vals).size === 5;
  const isNorm = allUniq && vals[0] - vals[4] === 4;
  const isWheel =
    allUniq &&
    vals[0] === 14 &&
    vals[1] === 5 &&
    vals[2] === 4 &&
    vals[3] === 3 &&
    vals[4] === 2;
  const isStraight = isNorm || isWheel;
  const strHigh = isWheel ? 5 : vals[0];
  const cnt = {};
  for (const v of vals) cnt[v] = (cnt[v] || 0) + 1;
  const groups = Object.entries(cnt)
    .map(([v, n]) => ({ v: +v, n }))
    .sort((a, b) => b.n - a.n || b.v - a.v);
  if (isFlush && isStraight && strHigh === 14)
    return { rank: 8, name: "Royal Flush", tb: [14] };
  if (isFlush && isStraight)
    return { rank: 7, name: "Straight Flush", tb: [strHigh] };
  if (groups[0].n === 4)
    return { rank: 6, name: "Four of a Kind", tb: [groups[0].v, groups[1].v] };
  if (groups[0].n === 3 && groups[1]?.n === 2)
    return { rank: 5, name: "Full House", tb: [groups[0].v, groups[1].v] };
  if (isFlush) return { rank: 4, name: "Flush", tb: vals };
  if (isStraight) return { rank: 3, name: "Straight", tb: [strHigh] };
  if (groups[0].n === 3)
    return {
      rank: 2,
      name: "Three of a Kind",
      tb: [groups[0].v, ...vals.filter((v) => v !== groups[0].v)],
    };
  if (groups[0].n === 2 && groups[1]?.n === 2)
    return {
      rank: 1,
      name: "Two Pair",
      tb: [
        groups[0].v,
        groups[1].v,
        vals.find((v) => v !== groups[0].v && v !== groups[1].v),
      ],
    };
  if (groups[0].n === 2)
    return {
      rank: 0,
      name: "One Pair",
      tb: [groups[0].v, ...vals.filter((v) => v !== groups[0].v)],
    };
  return { rank: -1, name: "High Card", tb: vals };
}

function cmpScore(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.max(a.tb.length, b.tb.length); i++) {
    if ((a.tb[i] ?? 0) !== (b.tb[i] ?? 0))
      return (a.tb[i] ?? 0) - (b.tb[i] ?? 0);
  }
  return 0;
}

function bestHand(holeCards, community) {
  const all = [...holeCards, ...community];
  if (all.length <= 5)
    return evaluate5(
      all.length === 5 ? all : [...all, ...Array(5 - all.length).fill(all[0])],
    );
  let best = null;
  function choose(start, cur) {
    if (cur.length === 5) {
      const s = evaluate5(cur);
      if (!best || cmpScore(s, best) > 0) best = s;
      return;
    }
    for (let i = start; i <= all.length - (5 - cur.length); i++) {
      cur.push(all[i]);
      choose(i + 1, cur);
      cur.pop();
    }
  }
  choose(0, []);
  return best;
}

// ─── Game logic ───────────────────────────────────────────────────────────────

function initDeal(
  playerList,
  dealerIdx,
  prevChips,
  startingChips = STARTING_CHIPS,
) {
  const deck = shuffleDeck(createDeck());
  const n = playerList.length;
  const hands = {};
  let di = 0;
  for (const p of playerList) {
    hands[String(p.id)] = [deck[di++], deck[di++]];
  }

  const playerStates = {};
  for (const p of playerList) {
    playerStates[String(p.id)] = {
      chips: prevChips
        ? (prevChips[String(p.id)] ?? startingChips)
        : startingChips,
      bet: 0,
      folded: false,
      allIn: false,
    };
  }

  const sbIdx = n === 2 ? dealerIdx : (dealerIdx + 1) % n;
  const bbIdx = n === 2 ? (dealerIdx + 1) % n : (dealerIdx + 2) % n;
  const firstToAct = (bbIdx + 1) % n;

  const sbPid = String(playerList[sbIdx].id);
  const bbPid = String(playerList[bbIdx].id);
  const sbAmt = Math.min(SMALL_BLIND, playerStates[sbPid].chips);
  const bbAmt = Math.min(BIG_BLIND, playerStates[bbPid].chips);

  playerStates[sbPid].chips -= sbAmt;
  playerStates[sbPid].bet = sbAmt;
  if (playerStates[sbPid].chips === 0) playerStates[sbPid].allIn = true;
  playerStates[bbPid].chips -= bbAmt;
  playerStates[bbPid].bet = bbAmt;
  if (playerStates[bbPid].chips === 0) playerStates[bbPid].allIn = true;

  // playersToAct: ordered queue of player indices still to act
  const toAct = [];
  for (let j = 0; j < n; j++) {
    const idx = (firstToAct + j) % n;
    const ps = playerStates[String(playerList[idx].id)];
    if (!ps.folded && !ps.allIn) toAct.push(idx);
  }

  return {
    phase: "preflop",
    deck: deck.slice(di),
    communityCards: [],
    hands,
    pot: sbAmt + bbAmt,
    playerStates,
    currentPlayerIndex: toAct[0] ?? firstToAct,
    currentBet: bbAmt,
    minRaise: BIG_BLIND,
    toAct,
    dealerIdx,
    lastAction: null,
    players: playerList,
    winner: null,
    handResult: null,
  };
}

function getActivePids(state) {
  return state.players
    .filter((p) => !state.playerStates[String(p.id)].folded)
    .map((p) => String(p.id));
}

function checkOneLeft(state, newPS) {
  const active = state.players.filter((p) => !newPS[String(p.id)].folded);
  if (active.length > 1) return null;
  const winner = active[0] || state.players[0];
  const wid = String(winner.id);
  const finalPS = {
    ...newPS,
    [wid]: { ...newPS[wid], chips: newPS[wid].chips + state.pot },
  };
  return {
    ...state,
    phase: "showdown",
    playerStates: finalPS,
    winner,
    handResult: { type: "fold", winnerName: winner.name, hands: state.hands },
  };
}

function advanceBettingRound(state) {
  // Reset bets for new round
  const newPS = {};
  for (const [pid, ps] of Object.entries(state.playerStates))
    newPS[pid] = { ...ps, bet: 0 };

  let nextPhase,
    newDeck = [...state.deck],
    newCC = [...state.communityCards];
  if (state.phase === "preflop") {
    newDeck.shift();
    newCC = [newDeck.shift(), newDeck.shift(), newDeck.shift()];
    nextPhase = "flop";
  } else if (state.phase === "flop") {
    newDeck.shift();
    newCC = [...newCC, newDeck.shift()];
    nextPhase = "turn";
  } else if (state.phase === "turn") {
    newDeck.shift();
    newCC = [...newCC, newDeck.shift()];
    nextPhase = "river";
  } else {
    return doShowdown({ ...state, playerStates: newPS });
  }

  const n = state.players.length;
  const canAct = [];
  for (let j = 1; j <= n; j++) {
    const idx = (state.dealerIdx + j) % n;
    const ps = newPS[String(state.players[idx].id)];
    if (!ps.folded && !ps.allIn) canAct.push(idx);
  }

  // If nobody can act (all all-in), run out the board
  if (canAct.length === 0) {
    let s = {
      ...state,
      phase: nextPhase,
      deck: newDeck,
      communityCards: newCC,
      playerStates: newPS,
    };
    while (s.phase !== "showdown") s = advanceBettingRound(s);
    return s;
  }

  return {
    ...state,
    phase: nextPhase,
    deck: newDeck,
    communityCards: newCC,
    playerStates: newPS,
    currentBet: 0,
    minRaise: BIG_BLIND,
    toAct: canAct,
    currentPlayerIndex: canAct[0],
    lastAction: null,
  };
}

function doShowdown(state) {
  const active = state.players.filter(
    (p) => !state.playerStates[String(p.id)].folded,
  );
  const handDescriptions = {};
  const scores = {};
  for (const p of active) {
    const pid = String(p.id);
    const score = bestHand(state.hands[pid] || [], state.communityCards);
    handDescriptions[pid] = score.name;
    scores[pid] = score;
  }
  let bestScore = null;
  for (const p of active) {
    const s = scores[String(p.id)];
    if (!bestScore || cmpScore(s, bestScore) > 0) bestScore = s;
  }
  const winners = active.filter(
    (p) => cmpScore(scores[String(p.id)], bestScore) === 0,
  );
  const share = Math.floor(state.pot / winners.length);
  const newPS = { ...state.playerStates };
  for (const w of winners) {
    const wid = String(w.id);
    newPS[wid] = { ...newPS[wid], chips: newPS[wid].chips + share };
  }
  return {
    ...state,
    phase: "showdown",
    playerStates: newPS,
    winner: winners[0],
    handResult: {
      type: "showdown",
      winners,
      handDescriptions,
      hands: state.hands,
    },
  };
}

function removeToAct(toAct, idx) {
  return toAct.filter((i) => i !== idx);
}

function doFold(state) {
  const myIdx = state.currentPlayerIndex;
  const pid = String(state.players[myIdx].id);
  const name = state.players[myIdx].name;
  const newPS = {
    ...state.playerStates,
    [pid]: { ...state.playerStates[pid], folded: true },
  };
  const oneLeft = checkOneLeft(state, newPS);
  if (oneLeft) return { ...oneLeft, lastAction: `${name} folds` };
  const newToAct = removeToAct(state.toAct, myIdx);
  const s = {
    ...state,
    playerStates: newPS,
    toAct: newToAct,
    lastAction: `${name} folds`,
  };
  if (newToAct.length === 0) return advanceBettingRound(s);
  return { ...s, currentPlayerIndex: newToAct[0] };
}

function doCheck(state) {
  const myIdx = state.currentPlayerIndex;
  const name = state.players[myIdx].name;
  const newToAct = removeToAct(state.toAct, myIdx);
  const s = { ...state, toAct: newToAct, lastAction: `${name} checks` };
  if (newToAct.length === 0) return advanceBettingRound(s);
  return { ...s, currentPlayerIndex: newToAct[0] };
}

function doCall(state) {
  const myIdx = state.currentPlayerIndex;
  const pid = String(state.players[myIdx].id);
  const name = state.players[myIdx].name;
  const ps = state.playerStates[pid];
  const toCall = Math.min(state.currentBet - ps.bet, ps.chips);
  const isAllIn = toCall >= ps.chips;
  const newPS = {
    ...state.playerStates,
    [pid]: {
      ...ps,
      chips: ps.chips - toCall,
      bet: ps.bet + toCall,
      allIn: isAllIn,
    },
  };
  const newToAct = removeToAct(state.toAct, myIdx);
  const s = {
    ...state,
    playerStates: newPS,
    pot: state.pot + toCall,
    toAct: newToAct,
    lastAction: isAllIn ? `${name} is all-in!` : `${name} calls ${toCall}`,
  };
  if (newToAct.length === 0) return advanceBettingRound(s);
  return { ...s, currentPlayerIndex: newToAct[0] };
}

function doRaise(state, raiseAmount) {
  const myIdx = state.currentPlayerIndex;
  const pid = String(state.players[myIdx].id);
  const name = state.players[myIdx].name;
  const ps = state.playerStates[pid];
  const newTotal = state.currentBet + raiseAmount;
  const toAdd = Math.min(newTotal - ps.bet, ps.chips);
  const actualBet = ps.bet + toAdd;
  const isAllIn = toAdd >= ps.chips;
  const newPS = {
    ...state.playerStates,
    [pid]: { ...ps, chips: ps.chips - toAdd, bet: actualBet, allIn: isAllIn },
  };
  // Re-build toAct: all active players after raiser (except raiser)
  const n = state.players.length;
  const newToAct = [];
  for (let j = 1; j < n; j++) {
    const idx = (myIdx + j) % n;
    const p = state.players[idx];
    const pps = newPS[String(p.id)];
    if (!pps.folded && !pps.allIn) newToAct.push(idx);
  }
  const s = {
    ...state,
    playerStates: newPS,
    pot: state.pot + toAdd,
    currentBet: actualBet,
    minRaise: raiseAmount,
    toAct: newToAct,
    lastAction: isAllIn
      ? `${name} is all-in!`
      : `${name} raises to ${actualBet}`,
  };
  // If nobody else can act (everyone else folded or all-in), this raise closes
  // the round — advance instead of freezing with an empty toAct. Matches the
  // guard in doFold/doCheck/doCall.
  if (newToAct.length === 0) return advanceBettingRound(s);
  return { ...s, currentPlayerIndex: newToAct[0] };
}

function toPublic(state) {
  return {
    phase: state.phase,
    communityCards: state.communityCards,
    pot: state.pot,
    playerStates: Object.fromEntries(
      Object.entries(state.playerStates).map(([id, ps]) => [
        id,
        { chips: ps.chips, bet: ps.bet, folded: ps.folded, allIn: ps.allIn },
      ]),
    ),
    currentPlayerIndex: state.currentPlayerIndex,
    currentBet: state.currentBet,
    minRaise: state.minRaise,
    dealerIdx: state.dealerIdx,
    lastAction: state.lastAction,
    players: state.players,
    winner: state.winner,
    handResult: state.handResult,
  };
}

// ─── AI ───────────────────────────────────────────────────────────────────────

function preflopStrength(hole) {
  if (!hole || hole.length < 2) return 0.3;
  const [c1, c2] = hole;
  const v1 = RANK_VAL[c1.rank] ?? 2;
  const v2 = RANK_VAL[c2.rank] ?? 2;
  if (c1.rank === c2.rank) return v1 >= 10 ? 0.9 : v1 >= 7 ? 0.75 : 0.55;
  const hi = Math.max(v1, v2);
  const lo = Math.min(v1, v2);
  let score = 0.1;
  if (hi >= 14) score += 0.35;
  else if (hi >= 13) score += 0.25;
  else if (hi >= 12) score += 0.15;
  if (lo >= 11) score += 0.15;
  if (c1.suit === c2.suit) score += 0.1;
  if (hi - lo <= 2) score += 0.1;
  return Math.min(score, 0.85);
}

function pokerAIAction(state, pid, difficulty) {
  const ps = state.playerStates[pid];
  const hole = state.hands[pid] || [];
  const community = state.communityCards || [];
  const toCall = state.currentBet - ps.bet;
  const handRank =
    community.length >= 3 ? bestHand(hole, community).rank : null;
  const strength =
    handRank !== null ? Math.max(0, (handRank + 1) / 9) : preflopStrength(hole);

  if (difficulty === "easy") {
    if (toCall <= 0) return doCheck(state);
    if (toCall > ps.chips * 0.8) return doFold(state);
    if (Math.random() < 0.1 && ps.chips > toCall + state.minRaise)
      return doRaise(state, state.minRaise);
    return doCall(state);
  }

  if (difficulty === "medium") {
    if (toCall <= 0) {
      if (strength > 0.5 && Math.random() < 0.4 && ps.chips > state.minRaise)
        return doRaise(state, state.minRaise * 2);
      return doCheck(state);
    }
    const priceToCall = toCall / Math.max(state.pot + toCall, 1);
    if (strength < 0.2) return doFold(state);
    if (strength < 0.4 && priceToCall > 0.3) return doFold(state);
    if (
      strength > 0.6 &&
      Math.random() < 0.5 &&
      ps.chips > toCall + state.minRaise
    )
      return doRaise(state, state.minRaise * 2);
    return doCall(state);
  }

  // Hard
  if (toCall <= 0) {
    if (strength > 0.55 && Math.random() < 0.5 && ps.chips > state.minRaise)
      return doRaise(state, state.minRaise * 3);
    const isDryBoard =
      community.length >= 3 &&
      new Set(community.map((c) => c.rank)).size === community.length;
    if (isDryBoard && Math.random() < 0.08 && ps.chips > state.minRaise)
      return doRaise(state, state.minRaise);
    return doCheck(state);
  }
  const priceToCall = toCall / Math.max(state.pot + toCall, 1);
  if (strength < 0.25) return doFold(state);
  if (strength < 0.45 && priceToCall > 0.25) return doFold(state);
  if (
    strength > 0.65 &&
    Math.random() < 0.6 &&
    ps.chips > toCall + state.minRaise
  ) {
    return doRaise(state, Math.min(state.minRaise * 3, ps.chips - toCall));
  }
  return doCall(state);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PokerGameScreen({ navigation, route }) {
  const {
    role,
    myName,
    players: initialPlayers,
    difficulty = "medium",
    variant,
  } = route.params;
  const isSinglePlayer = role === "singleplayer";
  const isHost = role === "host" || isSinglePlayer;
  const { avatarById, handleHostMessage, handleClientMessage } =
    useMultiplayerAvatars({ isHost, players: initialPlayers });
  // Everyone starts with the same chip stack; wagering happens in-game.
  const startingChips = STARTING_CHIPS;
  const saveKey =
    isSinglePlayer && variant ? `@cardnight:save:poker:${variant}` : null;

  const [gameState, setGameState] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const [tournamentWinner, setTournamentWinner] = useState(null);
  const [tournamentCoins, setTournamentCoins] = useState(0);
  const [tableId, setTableId] = useState(getPokerTableId());
  const [showTablePicker, setShowTablePicker] = useState(false);
  const fullRef = useRef(null);
  const dealerRef = useRef(0);
  const chipsRef = useRef(null);
  const coinRewardedRef = useRef(false);
  const aiTimerRef = useRef(null);
  const hasMountedRef = useRef(false);
  const lastSaveRef = useRef(0); // BUG-4: auto-save throttle (once / 3s)

  // Keep the table palette in sync (loaded at app start; may change via the
  // in-game Table Theme picker).
  useEffect(() => {
    setTableId(getPokerTableId());
    return subscribePokerTable((id) => setTableId(id));
  }, []);
  const pal = POKER_TABLES.find((t) => t.id === tableId) ?? POKER_TABLES[0];

  function applyState(next) {
    fullRef.current = next;
    dealerRef.current = next.dealerIdx;
    chipsRef.current = Object.fromEntries(
      next.players.map((p) => [
        String(p.id),
        next.playerStates[String(p.id)].chips,
      ]),
    );
    setMyHand(next.hands["host"] ?? []);
    setGameState(toPublic(next));
    if (!isSinglePlayer) {
      broadcastToClients({ type: "GAME_STATE", ...toPublic(next) });
      next.players.forEach((p) => {
        if (p.id !== "host") {
          sendToClient(p.id, {
            type: "PRIVATE_HAND",
            hand: next.hands[String(p.id)] ?? [],
          });
        }
      });
    }
    scheduleAI(next);
  }

  function scheduleAI(state) {
    if (!isHost || state.phase === "showdown") return;
    const currentP = state.players[state.currentPlayerIndex];
    if (!currentP?.isAI) return;
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    aiTimerRef.current = setTimeout(() => {
      const s = fullRef.current;
      if (!s || s.phase === "showdown") return;
      const cp = s.players[s.currentPlayerIndex];
      if (!cp?.isAI) return;
      const pid = String(cp.id);
      try {
        const next = pokerAIAction(s, pid, difficulty);
        if (next !== s) {
          applyState(next);
        }
      } catch (err) {}
    }, AI_MOVE_DELAY_MS);
  }

  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

  // Auto-save after each state change in single-player.
  useEffect(() => {
    if (!saveKey || !fullRef.current) return;
    if (tournamentWinner !== null) {
      clearGame(saveKey);
      return;
    }
    // BUG-4: throttle to once / 3s.
    const now = Date.now();
    if (now - lastSaveRef.current < 3000) return;
    lastSaveRef.current = now;
    saveGame(saveKey, { fullState: fullRef.current });
  }, [gameState, tournamentWinner]);

  useEffect(() => {
    if (!isHost) return;

    async function init() {
      if (saveKey && route?.params?.resumeFromSave) {
        const saved = await loadGame(saveKey);
        if (saved?.fullState) {
          applyState(saved.fullState);
          // UX-3: enable the deal animation on the NEXT tick so the RESTORED
          // hand appears instantly (no replayed deal); cards drawn later still
          // animate normally.
          setTimeout(() => {
            hasMountedRef.current = true;
          }, 0);
          return;
        }
      }
      hasMountedRef.current = true;
      applyState(initDeal(initialPlayers, 0, null, startingChips));
    }
    init();

    if (!isSinglePlayer) {
      setServerListeners({
        onMessage: (msg, clientId) => {
          if (handleHostMessage(msg, clientId)) return;
          const state = fullRef.current;
          if (!state || msg.type !== "ACTION") return;
          if (state.phase === "showdown" && msg.action === "nextHand") {
            const activePlayers = state.players.filter(
              (p) => chipsRef.current[String(p.id)] > 0,
            );
            if (activePlayers.length < 2) return;
            const newDealer = (dealerRef.current + 1) % activePlayers.length;
            applyState(
              initDeal(
                activePlayers,
                newDealer,
                chipsRef.current,
                startingChips,
              ),
            );
            return;
          }
          if (
            state.players.findIndex((p) => p.id === clientId) !==
            state.currentPlayerIndex
          )
            return;
          if (state.phase === "showdown") return;
          const pid = String(clientId);
          let next = state;
          if (msg.action === "fold") next = doFold(state);
          if (msg.action === "check") next = doCheck(state);
          if (msg.action === "call") next = doCall(state);
          if (msg.action === "raise") next = doRaise(state, msg.amount);
          if (next !== state) applyState(next);
        },
      });
    }
  }, []);

  useEffect(() => {
    if (isHost) return;
    setClientListeners({
      onMessage: (msg) => {
        if (handleClientMessage(msg)) return;
        if (msg.type === "GAME_STATE") setGameState(msg);
        if (msg.type === "PRIVATE_HAND") setMyHand(msg.hand);
      },
      onDisconnected: () =>
        Alert.alert("Disconnected", "Lost connection.", [
          { text: "OK", onPress: () => navigation.navigate("Home") },
        ]),
    });
  }, []);

  // UX-5: Android hardware back confirmation — must be before early returns
  useEffect(() => {
    const onBack = () => {
      const message = isSinglePlayer
        ? "Your progress will be saved."
        : isHost
          ? "You'll end the game for everyone."
          : "You'll disconnect from the host.";
      Alert.alert("Leave Game?", message, [
        { text: "Stay", style: "cancel" },
        {
          text: "Leave",
          style: isSinglePlayer ? "default" : "destructive",
          onPress: () => {
            if (isSinglePlayer) {
              if (typeof handleSaveAndExit === "function") handleSaveAndExit();
              else navigation.navigate("Home");
            } else {
              if (isHost) stopServer();
              else disconnectFromHost();
              navigation.navigate("Home");
            }
          },
        },
      ]);
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => sub.remove();
  }, [navigation, isSinglePlayer, isHost]);

  function act(action) {
    if (isHost) {
      const state = fullRef.current;
      if (!state) return;
      if (action.action === "nextHand" && state.phase === "showdown") {
        const activePlayers = state.players.filter(
          (p) => chipsRef.current[String(p.id)] > 0,
        );
        const hostChips = chipsRef.current["host"] ?? 0;
        const hostIsOut = isSinglePlayer && hostChips === 0;

        if (activePlayers.length < 2 || hostIsOut) {
          // Tournament over — end immediately if host is eliminated, no need to
          // watch computers play each other out.
          if (isSinglePlayer) {
            const winner = hostIsOut ? null : (activePlayers[0] ?? null);
            setTournamentWinner(winner ?? { id: "__none__", name: "Nobody" });
            if (
              winner &&
              String(winner.id) === "host" &&
              !coinRewardedRef.current
            ) {
              coinRewardedRef.current = true;
              addCoins(POKER_WIN_REWARD).then(() =>
                setTournamentCoins(POKER_WIN_REWARD),
              );
              recordWin("poker");
              hapticWin(); // rising flourish on a tournament win
            } else if (hostIsOut && !coinRewardedRef.current) {
              coinRewardedRef.current = true;
              hapticLose(); // thud when you're knocked out
            }
          }
          return;
        }
        const newDealer = (dealerRef.current + 1) % activePlayers.length;
        applyState(
          initDeal(activePlayers, newDealer, chipsRef.current, startingChips),
        );
        return;
      }
      if (
        state.players.findIndex((p) => p.id === "host") !==
        state.currentPlayerIndex
      )
        return;
      let next = state;
      if (action.action === "fold") next = doFold(state);
      if (action.action === "check") next = doCheck(state);
      if (action.action === "call") next = doCall(state);
      if (action.action === "raise") next = doRaise(state, action.amount);
      if (next !== state) applyState(next);
    } else {
      sendToHost({ type: "ACTION", ...action });
    }
  }

  // "Your Turn!" banner — flash when betting action reaches me. Computed above
  // the early returns so the hook runs every render (hooks-order rule).
  const _players = gameState?.players ?? [];
  const _myIndex = _players.findIndex((p) =>
    isHost ? p.id === "host" : p.name === myName,
  );
  const showTurnBanner = useYourTurnBanner(
    !!gameState &&
      _myIndex !== -1 &&
      gameState.currentPlayerIndex === _myIndex &&
      gameState.phase !== "showdown",
    !!gameState,
  );

  if (!gameState) {
    return (
      <View style={[styles.loading, { backgroundColor: pal.rail }]}>
        <Text style={styles.loadingText}>Dealing…</Text>
      </View>
    );
  }

  if (tournamentWinner !== null) {
    const humanWon = String(tournamentWinner.id) === "host";
    return (
      <View style={styles.tournamentOverContainer}>
        <Text style={styles.tournamentOverEmoji}>{humanWon ? "🏆" : "💸"}</Text>
        <Text style={styles.tournamentOverTitle}>
          {humanWon ? "Tournament Won!" : "Tournament Over"}
        </Text>
        {humanWon && tournamentCoins > 0 && (
          <Text style={styles.tournamentCoinsText}>
            +{tournamentCoins} coins added to your wallet!
          </Text>
        )}
        {!humanWon && (
          <Text style={styles.tournamentLostText}>
            You ran out of chips. Visit your Profile to reset your coins.
          </Text>
        )}
        <TouchableOpacity
          style={styles.tournamentHomeBtn}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.tournamentHomeBtnText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const {
    phase,
    communityCards,
    pot,
    playerStates,
    currentPlayerIndex,
    currentBet,
    minRaise,
    dealerIdx,
    lastAction,
    players,
    handResult,
  } = gameState;
  const myIndex = players.findIndex((p) =>
    isHost ? p.id === "host" : p.name === myName,
  );
  const myPid = String(players[myIndex]?.id ?? "me");
  const myPS = playerStates[myPid] ?? {};
  const isMyTurn = currentPlayerIndex === myIndex && phase !== "showdown";
  const currentPlayer = players[currentPlayerIndex];
  const canCheck = isMyTurn && myPS.bet >= currentBet;

  // Raise preset amounts
  const myChips = myPS.chips ?? 0;
  const raiseOptions = [
    { label: `+${minRaise}`, amount: minRaise },
    { label: `+${minRaise * 2}`, amount: minRaise * 2 },
    { label: `${pot} (pot)`, amount: Math.max(pot - currentBet, minRaise) },
    { label: "All-In", amount: myChips + (myPS.bet ?? 0) - currentBet },
  ].filter((o) => o.amount > 0 && myChips >= o.amount);

  // At showdown: reveal hands
  const revealedHands = handResult?.hands ?? {};

  function handleQuit() {
    if (isSinglePlayer && saveKey) clearGame(saveKey);
    else if (isHost) stopServer();
    else disconnectFromHost();
    navigation.navigate("Home");
  }

  // Restart the tournament in place: same opponents/variant/difficulty, everyone
  // back to the starting stack, a fresh hand dealt immediately (matches how every
  // other game's Restart behaves). Single-player only.
  function handleRestart() {
    if (saveKey) clearGame(saveKey);
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    coinRewardedRef.current = false;
    setTournamentCoins(0);
    setTournamentWinner(null);
    applyState(initDeal(initialPlayers, 0, null, startingChips));
  }

  function handleSaveAndExit() {
    if (!saveKey || !fullRef.current) return;
    saveGame(saveKey, { fullState: fullRef.current });
    navigation.navigate("Home");
  }

  const menuItems = [
    ...(isSinglePlayer && saveKey
      ? [{ type: "saveexit", onSaveExit: handleSaveAndExit }]
      : []),
    // Restart re-deals a fresh tournament in place (single-player only).
    ...(isSinglePlayer
      ? [{ type: "restart", onRestart: handleRestart }]
      : []),
    { type: "howto", gameId: "poker" },
    { type: "theme" },
    {
      icon: "🎨",
      label: "Table Theme",
      onPress: () => setShowTablePicker(true),
    },
    { type: "divider" },
    { type: "quit", onQuit: handleQuit },
  ];

  return (
    <SafeAreaView style={[styles.screenRoot, { backgroundColor: pal.rail }]}>
      <GameHeader
        gameId="poker"
        title="Poker"
        leftInfo={
          <View style={styles.headerInfoRow}>
            <Text style={styles.headerVariant}>
              {variant || "Texas Hold'em"}
            </Text>
            <Text style={styles.headerBlinds}>
              Blinds {SMALL_BLIND}/{BIG_BLIND}
            </Text>
          </View>
        }
        menuItems={menuItems}
      />
      <View
        style={[
          styles.felt,
          { backgroundColor: pal.felt, borderColor: pal.feltBorder },
        ]}
      >
        {/* Opponents seated across the top */}
        <View style={styles.seatsRow}>
          {players.map((p, idx) => {
            if (idx === myIndex) return null;
            const pid = String(p.id);
            const ps = playerStates[pid] ?? {};
            const isCurrent =
              idx === currentPlayerIndex && phase !== "showdown";
            const isWinner = handResult?.winners?.some(
              (w) => String(w.id) === pid,
            );
            const showCards =
              phase === "showdown" && !ps.folded && revealedHands[pid];
            const handDesc = handResult?.handDescriptions?.[pid];
            return (
              <View
                key={pid}
                style={[
                  styles.seat,
                  { backgroundColor: pal.panel, borderColor: pal.panelBorder },
                  isCurrent && {
                    backgroundColor: pal.accentBg,
                    borderColor: pal.accent,
                  },
                  isWinner && styles.seatWinner,
                  ps.folded && styles.seatFolded,
                ]}
              >
                <ProfileAvatar
                  profile={avatarById[pid]}
                  name={p.name}
                  size={scale(32)}
                  style={{ marginBottom: scale(4) }}
                />
                <Text style={styles.seatName} numberOfLines={1}>
                  {idx === dealerIdx ? "🎩 " : ""}
                  {isWinner ? "🏆 " : ""}
                  {isCurrent ? "▶ " : ""}
                  {p.name}
                </Text>
                <Text style={styles.seatChips}>🪙 {ps.chips ?? 0}</Text>
                {ps.bet > 0 ? (
                  <Text style={styles.seatBet}>bet {ps.bet}</Text>
                ) : null}
                {ps.folded ? (
                  <Text style={styles.seatFold}>FOLDED</Text>
                ) : ps.allIn ? (
                  <Text style={styles.seatAllIn}>ALL-IN</Text>
                ) : null}
                {showCards ? (
                  <>
                    <View style={styles.seatReveal}>
                      {revealedHands[pid].map((c) => (
                        <Card key={c.id} rank={c.rank} suit={c.suit} small />
                      ))}
                    </View>
                    {handDesc ? (
                      <Text style={styles.seatHandDesc} numberOfLines={1}>
                        {handDesc}
                      </Text>
                    ) : null}
                  </>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Center board: pot + community cards + status */}
        <View style={styles.board}>
          <View
            style={[
              styles.potPill,
              { backgroundColor: pal.panel, borderColor: pal.accent },
            ]}
          >
            <Text style={[styles.potLabel, { color: pal.accent }]}>POT</Text>
            <Text style={styles.potValue}>{pot}</Text>
          </View>

          <View style={styles.communityRow}>
            {communityCards.map((c) => (
              <Card
                key={c.id}
                rank={c.rank}
                suit={c.suit}
                small
                sizeScale={1.15}
              />
            ))}
            {Array(5 - communityCards.length)
              .fill(null)
              .map((_, i) => (
                <View key={`ph-${i}`} style={styles.cardPlaceholder} />
              ))}
          </View>

          <Text
            style={[styles.statusLine, { color: pal.text }]}
            numberOfLines={1}
          >
            {phase === "showdown"
              ? handResult?.type === "fold"
                ? `🏆 ${handResult.winnerName} wins (all folded)`
                : `🏆 ${handResult?.winners?.map((w) => w.name).join(" & ")} win!`
              : isMyTurn
                ? "▶ Your turn"
                : `${currentPlayer?.name}'s turn`}
          </Text>
          {lastAction ? (
            <Text style={styles.lastActionLine} numberOfLines={1}>
              {lastAction}
            </Text>
          ) : null}
        </View>

        {/* You: cards + chips + actions */}
        <View style={[styles.youArea, { borderTopColor: pal.panelBorder }]}>
          <View style={styles.youTopRow}>
            <Text style={styles.youName} numberOfLines={1}>
              {dealerIdx === myIndex ? "🎩 " : ""}You
              {myPS.folded ? "  ·  FOLDED" : ""}
            </Text>
            <Text style={styles.youChips}>
              🪙 {myChips}
              {myPS.bet > 0 ? `  ·  bet ${myPS.bet}` : ""}
            </Text>
          </View>

          <View style={styles.yourCardsRow}>
            {myHand.map((c, index) => (
              <Card
                key={c.id}
                rank={c.rank}
                suit={c.suit}
                animateDeal={hasMountedRef.current}
                dealDelay={myHand.length <= 2 ? index * 100 : 0}
              />
            ))}
            {phase === "showdown" && handResult?.handDescriptions?.[myPid] ? (
              <Text style={styles.youHandDesc}>
                {handResult.handDescriptions[myPid]}
              </Text>
            ) : null}
          </View>

          {isMyTurn ? (
            <>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.foldBtn]}
                  onPress={() => act({ action: "fold" })}
                  accessibilityRole="button"
                  accessibilityLabel="Fold"
                  accessibilityHint="Give up your hand and exit this round"
                >
                  <Text style={styles.actionBtnText}>Fold</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.callBtn]}
                  onPress={() => act({ action: canCheck ? "check" : "call" })}
                  accessibilityRole="button"
                  accessibilityLabel={
                    canCheck ? "Check" : `Call ${currentBet - (myPS.bet ?? 0)}`
                  }
                  accessibilityHint={
                    canCheck
                      ? "Stay in without betting more"
                      : "Match the current bet to stay in"
                  }
                >
                  <Text style={styles.actionBtnText}>
                    {canCheck
                      ? "Check"
                      : `Call ${currentBet - (myPS.bet ?? 0)}`}
                  </Text>
                </TouchableOpacity>
              </View>
              {raiseOptions.length > 0 && (
                <View style={styles.raiseRow}>
                  {raiseOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt.label}
                      style={styles.raiseBtn}
                      onPress={() =>
                        act({ action: "raise", amount: opt.amount })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Raise ${opt.label}`}
                      accessibilityHint="Increase the current bet"
                    >
                      <Text style={styles.raiseBtnText}>Raise</Text>
                      <Text style={styles.raiseBtnAmt}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          ) : (
            <Text style={styles.waitText}>
              {phase === "showdown" ? "Round over" : "Waiting…"}
            </Text>
          )}
        </View>
      </View>

      <EndOfRoundModal
        visible={phase === "showdown"}
        title={
          handResult?.type === "fold"
            ? `🏆 ${handResult.winnerName} wins!`
            : `🏆 ${(handResult?.winners ?? []).map((w) => w.name).join(" & ")} win!`
        }
        message=""
        showContinue={isHost}
        showLeave
        onContinue={() => act({ action: "nextHand" })}
        onLeave={handleQuit}
        tableColor={BG}
      />

      <TableThemePicker
        visible={showTablePicker}
        tables={POKER_TABLES}
        currentId={tableId}
        onPick={(id) => {
          setPokerTable(id);
          setTableId(id);
          setShowTablePicker(false);
        }}
        onClose={() => setShowTablePicker(false)}
      />

      <YourTurnBanner visible={showTurnBanner} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: BG },
  headerInfoRow: { gap: scale(2) },
  headerVariant: {
    color: "#a4b1c4",
    fontSize: scaleFont(13),
    fontWeight: "700",
  },
  headerBlinds: {
    color: "#b0d4b0",
    fontSize: scaleFont(13),
    fontWeight: "700",
  },
  loading: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { color: "#fff", fontSize: scaleFont(18) },
  container: {
    flexGrow: 1,
    backgroundColor: BG,
    padding: scale(14),
    paddingBottom: scale(40),
  },

  felt: {
    flex: 1,
    margin: scale(10),
    borderRadius: scale(16),
    borderWidth: 1,
    paddingBottom: scale(4),
  },

  seatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: scale(8),
    paddingHorizontal: scale(10),
    paddingTop: scale(8),
  },
  seat: {
    width: scale(98),
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: "transparent",
    paddingVertical: scale(7),
    paddingHorizontal: scale(6),
  },
  seatActive: {
    borderColor: "#ffd700",
    backgroundColor: "rgba(255,215,0,0.12)",
  },
  seatWinner: {
    borderColor: "#4caf50",
    backgroundColor: "rgba(76,175,80,0.16)",
  },
  seatFolded: { opacity: 0.45 },
  seatName: {
    color: "#fff",
    fontSize: scaleFont(12),
    fontWeight: "800",
    maxWidth: scale(92),
    textAlign: "center",
  },
  seatChips: {
    color: "#ffd700",
    fontSize: scaleFont(12),
    fontWeight: "700",
    marginTop: scale(2),
  },
  seatBet: { color: "#cfe0d0", fontSize: scaleFont(11), marginTop: scale(1) },
  seatFold: {
    color: "#e94560",
    fontSize: scaleFont(10),
    fontWeight: "800",
    marginTop: scale(2),
  },
  seatAllIn: {
    color: "#ff9800",
    fontSize: scaleFont(10),
    fontWeight: "800",
    marginTop: scale(2),
  },
  seatReveal: { flexDirection: "row", gap: scale(3), marginTop: scale(5) },
  seatHandDesc: {
    color: "#ffd700",
    fontSize: scaleFont(10),
    fontWeight: "700",
    maxWidth: scale(92),
    textAlign: "center",
    marginTop: scale(2),
  },

  board: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: scale(12),
    paddingHorizontal: scale(12),
  },
  potPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    backgroundColor: "rgba(0,0,0,0.38)",
    borderRadius: scale(999),
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.45)",
    paddingVertical: scale(6),
    paddingHorizontal: scale(18),
  },
  potLabel: {
    color: "#ffd700",
    fontSize: scaleFont(12),
    fontWeight: "800",
    letterSpacing: scale(1.5),
  },
  potValue: { color: "#fff", fontSize: scaleFont(20), fontWeight: "900" },
  communityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  cardPlaceholder: {
    width: scale(48),
    height: scale(68),
    marginHorizontal: scale(2),
    backgroundColor: "rgba(0,0,0,0.22)",
    borderRadius: scale(6),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderStyle: "dashed",
  },
  statusLine: {
    color: "#fff",
    fontSize: scaleFont(14),
    fontWeight: "700",
    textAlign: "center",
  },
  lastActionLine: {
    color: "#cfd8e3",
    fontSize: scaleFont(12),
    textAlign: "center",
  },

  youArea: {
    paddingHorizontal: scale(14),
    paddingTop: scale(8),
    gap: scale(8),
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  youTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  youName: {
    color: "#fff",
    fontSize: scaleFont(14),
    fontWeight: "800",
    flexShrink: 1,
  },
  youChips: { color: "#ffd700", fontSize: scaleFont(14), fontWeight: "800" },
  yourCardsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
  },
  youHandDesc: {
    color: "#ffd700",
    fontSize: scaleFont(13),
    fontWeight: "700",
    marginLeft: scale(8),
  },

  actionRow: { flexDirection: "row", gap: scale(10), marginBottom: scale(8) },
  actionBtn: {
    flex: 1,
    paddingVertical: scale(14),
    borderRadius: scale(10),
    alignItems: "center",
  },
  foldBtn: { backgroundColor: "#555" },
  callBtn: { backgroundColor: "#2980b9" },
  actionBtnText: { color: "#fff", fontSize: scaleFont(16), fontWeight: "bold" },

  raiseRow: {
    flexDirection: "row",
    gap: scale(8),
    marginBottom: scale(10),
    flexWrap: "wrap",
  },
  raiseBtn: {
    flex: 1,
    minWidth: scale(70),
    backgroundColor: "#e94560",
    borderRadius: scale(8),
    paddingVertical: scale(10),
    alignItems: "center",
  },
  raiseBtnText: { color: "#fff", fontSize: scaleFont(12) },
  raiseBtnAmt: { color: "#fff", fontSize: scaleFont(14), fontWeight: "bold" },

  waitText: {
    color: "#aaa",
    textAlign: "center",
    fontSize: scaleFont(14),
    marginTop: scale(8),
  },

  tournamentOverContainer: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    padding: scale(32),
  },
  tournamentOverEmoji: { fontSize: scaleFont(64), marginBottom: scale(12) },
  tournamentOverTitle: {
    color: "#fff",
    fontSize: scaleFont(30),
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: scale(16),
  },
  tournamentCoinsText: {
    color: "#ffd700",
    fontSize: scaleFont(18),
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: scale(24),
  },
  tournamentLostText: {
    color: "#c4c4d4",
    fontSize: scaleFont(15),
    textAlign: "center",
    lineHeight: scale(22),
    marginBottom: scale(24),
  },
  tournamentHomeBtn: {
    backgroundColor: "#e94560",
    borderRadius: scale(12),
    paddingVertical: scale(16),
    paddingHorizontal: scale(40),
    alignItems: "center",
  },
  tournamentHomeBtnText: {
    color: "#fff",
    fontSize: scaleFont(18),
    fontWeight: "bold",
  },
});
