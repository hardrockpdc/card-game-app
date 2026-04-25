import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { shuffleDeck } from '../game/deck';
import Card from '../components/Card';
import {
  setServerListeners, broadcastToClients, sendToClient,
  setClientListeners, sendToHost,
} from '../game/GameNetwork';

// ─── Deck ─────────────────────────────────────────────────────────────────────

const CONQUIAN_RANKS = ['A', '2', '3', '4', '5', '6', '7', 'J', 'Q', 'K'];
const SUITS = ['♠', '♥', '♦', '♣'];
const RANK_VAL = { A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, J: 8, Q: 9, K: 10 };

function createConquianDeck(numDecks) {
  const cards = [];
  for (let d = 0; d < numDecks; d++) {
    for (const suit of SUITS) {
      for (const rank of CONQUIAN_RANKS) {
        cards.push({ rank, suit, id: numDecks > 1 ? `${rank}${suit}_${d}` : `${rank}${suit}` });
      }
    }
  }
  return shuffleDeck(cards);
}

// ─── Meld validation ──────────────────────────────────────────────────────────

function isValidSet(cards) {
  if (cards.length < 3 || cards.length > 4) return false;
  return cards.every(c => c.rank === cards[0].rank);
}

function isValidRun(cards) {
  if (cards.length < 3) return false;
  if (!cards.every(c => c.suit === cards[0].suit)) return false;
  const vals = cards.map(c => RANK_VAL[c.rank]).sort((a, b) => a - b);
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] !== vals[i - 1] + 1) return false;
  }
  return true;
}

function isValidMeld(cards) {
  return cards.length >= 3 && (isValidSet(cards) || isValidRun(cards));
}

function canExtendMeld(meld, card) {
  if (isValidSet(meld) && meld.length < 4 && card.rank === meld[0].rank) return true;
  if (isValidRun(meld) && card.suit === meld[0].suit) {
    const vals = meld.map(c => RANK_VAL[c.rank]).sort((a, b) => a - b);
    const v = RANK_VAL[card.rank];
    return v === vals[0] - 1 || v === vals[vals.length - 1] + 1;
  }
  return false;
}

function isSandboxValid(groups, pool) {
  return pool.length === 0 && groups.length > 0 && groups.every(g => isValidMeld(g));
}

// ─── AI helpers ───────────────────────────────────────────────────────────────

function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  return [
    ...combinations(rest, k - 1).map(c => [first, ...c]),
    ...combinations(rest, k),
  ];
}

function findBestMeld(cards) {
  for (let sz = Math.min(cards.length, 4); sz >= 3; sz--) {
    for (const combo of combinations(cards, sz)) {
      if (isValidMeld(combo)) return combo;
    }
  }
  return null;
}

function findMeldContaining(cards, mustId) {
  const must = cards.find(c => c.id === mustId);
  if (!must) return null;
  const rest = cards.filter(c => c.id !== mustId);
  for (let sz = Math.min(rest.length, 3); sz >= 2; sz--) {
    for (const combo of combinations(rest, sz)) {
      if (isValidMeld([must, ...combo])) return [must, ...combo];
    }
  }
  return null;
}

// ─── Config ───────────────────────────────────────────────────────────────────

function getConfig(count) {
  if (count <= 2) return { handSize: 10, winTarget: 11, numDecks: 1 };
  if (count <= 4) return { handSize: 8, winTarget: 9, numDecks: 1 };
  return { handSize: 8, winTarget: 9, numDecks: 2 };
}

function buildOfferChain(players, fromIndex, noRecallPid) {
  const pids = players.map(p => String(p.id));
  const chain = [...pids.slice(fromIndex), ...pids.slice(0, fromIndex)];
  return noRecallPid ? chain.filter(p => p !== noRecallPid) : chain;
}

// ─── Game logic ───────────────────────────────────────────────────────────────

function dealConquian(playerList) {
  const { handSize, winTarget, numDecks } = getConfig(playerList.length);
  const rawDeck = createConquianDeck(numDecks);
  const playerHands = {};
  let idx = 0;
  playerList.forEach(p => {
    playerHands[String(p.id)] = rawDeck.slice(idx, idx + handSize);
    idx += handSize;
  });
  const [activeCard, ...deck] = rawDeck.slice(idx);
  return {
    phase: 'offering',
    masterTurnIndex: 0,
    deck: deck ?? [],
    deadPile: [],
    playerHands,
    playerTable: Object.fromEntries(playerList.map(p => [String(p.id), []])),
    activeCard: activeCard ?? null,
    offerChain: buildOfferChain(playerList, 0, null),
    noRecallPid: null,
    sandboxPid: null,
    sandboxGroups: [],
    sandboxPool: [],
    sandboxNewCardId: null,
    sandboxFromHandIds: [],
    winTarget,
    players: playerList,
    winner: null,
    tie: false,
  };
}

function deadPileAndAdvance(state) {
  const newDead = state.activeCard ? [...state.deadPile, state.activeCard] : state.deadPile;
  const nextMaster = (state.masterTurnIndex + 1) % state.players.length;
  if (state.deck.length === 0) {
    return { ...state, phase: 'results', tie: true, winner: null, activeCard: null, deadPile: newDead };
  }
  const [activeCard, ...deck] = state.deck;
  return {
    ...state, deck, deadPile: newDead, activeCard,
    offerChain: buildOfferChain(state.players, nextMaster, null),
    noRecallPid: null, masterTurnIndex: nextMaster,
    sandboxPid: null, sandboxGroups: [], sandboxPool: [],
    sandboxNewCardId: null, sandboxFromHandIds: [],
    phase: 'offering',
  };
}

function doPass(state, pid) {
  if (state.phase !== 'offering' || state.offerChain[0] !== pid) return state;
  const noRecallPid = state.noRecallPid ?? pid;
  const remaining = state.offerChain.slice(1).filter(p => p !== noRecallPid);
  if (remaining.length === 0) return deadPileAndAdvance({ ...state, noRecallPid });
  return { ...state, noRecallPid, offerChain: remaining };
}

function doTake(state, pid) {
  if (state.phase !== 'offering' || !state.activeCard || state.offerChain[0] !== pid) return state;
  return {
    ...state,
    phase: 'sandbox',
    sandboxPid: pid,
    sandboxGroups: (state.playerTable[pid] ?? []).map(g => [...g]),
    sandboxPool: [state.activeCard],
    sandboxNewCardId: state.activeCard.id,
    sandboxFromHandIds: [],
    activeCard: null,
    offerChain: [],
    noRecallPid: pid,
  };
}

function checkSandboxWin(state) {
  if (state.phase !== 'sandbox') return state;
  if (!isSandboxValid(state.sandboxGroups, state.sandboxPool)) return state;
  const total = state.sandboxGroups.reduce((s, g) => s + g.length, 0);
  if (total < state.winTarget) return state;
  const pid = state.sandboxPid;
  return {
    ...state,
    phase: 'results',
    winner: state.players.find(p => String(p.id) === pid) ?? null,
    playerTable: { ...state.playerTable, [pid]: state.sandboxGroups },
    sandboxPid: null, sandboxGroups: [], sandboxPool: [],
  };
}

function doSandboxFormGroup(state, pid, cardIds) {
  if (state.phase !== 'sandbox' || state.sandboxPid !== pid) return state;
  const cards = cardIds.map(id => state.sandboxPool.find(c => c.id === id)).filter(Boolean);
  if (cards.length < cardIds.length || !isValidMeld(cards)) return state;
  const next = {
    ...state,
    sandboxPool: state.sandboxPool.filter(c => !cardIds.includes(c.id)),
    sandboxGroups: [...state.sandboxGroups, cards],
  };
  return checkSandboxWin(next);
}

function doSandboxAddToGroup(state, pid, groupIdx, cardIds) {
  if (state.phase !== 'sandbox' || state.sandboxPid !== pid) return state;
  const group = state.sandboxGroups[groupIdx];
  if (!group) return state;
  const cards = cardIds.map(id => state.sandboxPool.find(c => c.id === id)).filter(Boolean);
  if (cards.length < cardIds.length) return state;
  const newGroup = [...group, ...cards];
  if (!isValidMeld(newGroup)) return state;
  const next = {
    ...state,
    sandboxPool: state.sandboxPool.filter(c => !cardIds.includes(c.id)),
    sandboxGroups: state.sandboxGroups.map((g, i) => i === groupIdx ? newGroup : g),
  };
  return checkSandboxWin(next);
}

function doSandboxBreakGroup(state, pid, groupIdx) {
  if (state.phase !== 'sandbox' || state.sandboxPid !== pid) return state;
  const group = state.sandboxGroups[groupIdx];
  if (!group) return state;
  return {
    ...state,
    sandboxPool: [...state.sandboxPool, ...group],
    sandboxGroups: state.sandboxGroups.filter((_, i) => i !== groupIdx),
  };
}

function doSandboxAddHandCard(state, pid, cardId) {
  if (state.phase !== 'sandbox' || state.sandboxPid !== pid) return state;
  const hand = state.playerHands[pid] ?? [];
  const card = hand.find(c => c.id === cardId);
  if (!card) return state;
  return {
    ...state,
    playerHands: { ...state.playerHands, [pid]: hand.filter(c => c.id !== cardId) },
    sandboxPool: [...state.sandboxPool, card],
    sandboxFromHandIds: [...state.sandboxFromHandIds, cardId],
  };
}

function doSandboxReturnHandCard(state, pid, cardId) {
  if (state.phase !== 'sandbox' || state.sandboxPid !== pid) return state;
  if (!state.sandboxFromHandIds.includes(cardId)) return state;
  const card = state.sandboxPool.find(c => c.id === cardId);
  if (!card) return state;
  return {
    ...state,
    playerHands: { ...state.playerHands, [pid]: [...(state.playerHands[pid] ?? []), card] },
    sandboxPool: state.sandboxPool.filter(c => c.id !== cardId),
    sandboxFromHandIds: state.sandboxFromHandIds.filter(id => id !== cardId),
  };
}

function doDiscardFromHand(state, pid, cardId) {
  if (state.phase !== 'sandbox' || state.sandboxPid !== pid) return state;
  if (!isSandboxValid(state.sandboxGroups, state.sandboxPool)) return state;
  const hand = state.playerHands[pid] ?? [];
  const card = hand.find(c => c.id === cardId);
  if (!card) return state;
  const newHand = hand.filter(c => c.id !== cardId);
  const newTable = state.sandboxGroups;
  const meldingIdx = state.players.findIndex(p => String(p.id) === pid);
  const startIdx = (meldingIdx + 1) % state.players.length;
  const offerChain = buildOfferChain(state.players, startIdx, pid);
  const base = {
    ...state,
    playerHands: { ...state.playerHands, [pid]: newHand },
    playerTable: { ...state.playerTable, [pid]: newTable },
    sandboxPid: null, sandboxGroups: [], sandboxPool: [],
    sandboxNewCardId: null, sandboxFromHandIds: [],
  };
  if (offerChain.length === 0) {
    return deadPileAndAdvance({ ...base, activeCard: card, noRecallPid: pid });
  }
  return { ...base, phase: 'offering', activeCard: card, offerChain, noRecallPid: pid };
}

// ─── Public state ─────────────────────────────────────────────────────────────

function toPublic(state) {
  const offerToIdx = state.offerChain.length > 0
    ? state.players.findIndex(p => String(p.id) === state.offerChain[0]) : -1;
  const sandboxIdx = state.sandboxPid
    ? state.players.findIndex(p => String(p.id) === state.sandboxPid) : -1;
  return {
    phase: state.phase,
    masterTurnIndex: state.masterTurnIndex,
    deckSize: state.deck.length,
    deadPileSize: state.deadPile.length,
    playerTable: state.playerTable,
    playerHandSizes: Object.fromEntries(
      state.players.map(p => [String(p.id), (state.playerHands[String(p.id)] ?? []).length])
    ),
    activeCard: state.activeCard,
    offerToIdx,
    sandboxIdx,
    sandboxGroups: state.sandboxGroups,
    sandboxPoolSize: state.sandboxPool.length,
    winTarget: state.winTarget,
    players: state.players,
    winner: state.winner,
    tie: state.tie,
  };
}

// ─── AI ───────────────────────────────────────────────────────────────────────

function aiCanMeld(activeCard, existingGroups, hand) {
  if (!activeCard) return false;
  for (const g of existingGroups) {
    if (canExtendMeld(g, activeCard)) return true;
  }
  return !!findMeldContaining([activeCard, ...hand], activeCard.id);
}

function aiDoSandbox(state, pid) {
  let s = state;
  const newId = s.sandboxNewCardId;

  // 1. Try to extend an existing group with the new card
  for (let i = 0; i < s.sandboxGroups.length; i++) {
    const nc = s.sandboxPool.find(c => c.id === newId);
    if (!nc) break;
    if (canExtendMeld(s.sandboxGroups[i], nc)) {
      s = doSandboxAddToGroup(s, pid, i, [newId]);
      break;
    }
  }

  // 2. If new card still in pool: bring hand cards to form a group with it
  if (s.phase === 'sandbox' && s.sandboxPool.some(c => c.id === newId)) {
    const hand = s.playerHands[pid] ?? [];
    const nc = s.sandboxPool.find(c => c.id === newId);
    const meld = findMeldContaining([nc, ...hand], newId);
    if (meld) {
      for (const c of meld.filter(c => c.id !== newId)) {
        s = doSandboxAddHandCard(s, pid, c.id);
      }
      s = doSandboxFormGroup(s, pid, meld.map(c => c.id));
    }
  }

  if (s.phase === 'results') return s;

  // 3. Opportunistically meld more hand cards
  let hand = s.playerHands[pid] ?? [];
  let extra = findBestMeld(hand);
  while (extra && s.phase === 'sandbox') {
    for (const c of extra) s = doSandboxAddHandCard(s, pid, c.id);
    s = doSandboxFormGroup(s, pid, extra.map(c => c.id));
    if (s.phase === 'results') return s;
    hand = s.playerHands[pid] ?? [];
    extra = findBestMeld(hand);
  }

  // 4. Discard lowest-value hand card
  if (s.phase === 'sandbox' && isSandboxValid(s.sandboxGroups, s.sandboxPool)) {
    const h = s.playerHands[pid] ?? [];
    if (h.length > 0) {
      const discard = h.reduce((w, c) => RANK_VAL[c.rank] < RANK_VAL[w.rank] ? c : w, h[0]);
      s = doDiscardFromHand(s, pid, discard.id);
    }
  }
  return s;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ConquianGameScreen({ navigation, route }) {
  const { role, myName, players: initialPlayers } = route.params;
  const isSinglePlayer = role === 'singleplayer';
  const isHost = role === 'host' || isSinglePlayer;

  const [gameState, setGameState] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const [selectedPoolIds, setSelectedPoolIds] = useState([]);
  const [showHandForSandbox, setShowHandForSandbox] = useState(false);
  const [discardMode, setDiscardMode] = useState(false);
  const fullRef = useRef(null);

  function applyState(next) {
    fullRef.current = next;
    const pub = toPublic(next);
    setGameState(pub);
    if (isHost) setMyHand(next.playerHands['host'] ?? []);
    if (!isSinglePlayer) {
      broadcastToClients({ type: 'GAME_STATE', ...pub });
      next.players.forEach(p => {
        if (p.id !== 'host') {
          sendToClient(p.id, { type: 'PRIVATE_HAND', hand: next.playerHands[String(p.id)] ?? [] });
        }
      });
    }
    scheduleAI(next);
  }

  function scheduleAI(state) {
    if (!isSinglePlayer || state.phase === 'results') return;
    if (state.phase === 'offering') {
      const offerPid = state.offerChain[0];
      if (!offerPid) return;
      const player = state.players.find(p => String(p.id) === offerPid);
      if (!player?.isAI) return;
      setTimeout(() => {
        const s = fullRef.current;
        if (!s || s.phase !== 'offering' || s.offerChain[0] !== offerPid) return;
        const hand = s.playerHands[offerPid] ?? [];
        const table = s.playerTable[offerPid] ?? [];
        if (aiCanMeld(s.activeCard, table, hand)) {
          let next = doTake(s, offerPid);
          next = aiDoSandbox(next, offerPid);
          applyState(next);
        } else {
          applyState(doPass(s, offerPid));
        }
      }, 700 + Math.random() * 800);
    }
  }

  useEffect(() => {
    if (!isHost) return;
    applyState(dealConquian(initialPlayers));
    if (!isSinglePlayer) {
      setServerListeners({
        onMessage: (msg, clientId) => {
          const s = fullRef.current;
          if (!s || msg.type !== 'ACTION') return;
          const pid = String(clientId);
          if (msg.action === 'pass') applyState(doPass(s, pid));
          else if (msg.action === 'take') applyState(doTake(s, pid));
          else if (msg.action === 'formGroup') applyState(doSandboxFormGroup(s, pid, msg.cardIds));
          else if (msg.action === 'addToGroup') applyState(doSandboxAddToGroup(s, pid, msg.groupIdx, msg.cardIds));
          else if (msg.action === 'breakGroup') applyState(doSandboxBreakGroup(s, pid, msg.groupIdx));
          else if (msg.action === 'addHandCard') applyState(doSandboxAddHandCard(s, pid, msg.cardId));
          else if (msg.action === 'returnHandCard') applyState(doSandboxReturnHandCard(s, pid, msg.cardId));
          else if (msg.action === 'discard') applyState(doDiscardFromHand(s, pid, msg.cardId));
        },
      });
    }
  }, []);

  useEffect(() => {
    if (isHost) return;
    setClientListeners({
      onMessage: (msg) => {
        if (msg.type === 'GAME_STATE') setGameState(msg);
        if (msg.type === 'PRIVATE_HAND') setMyHand(msg.hand);
      },
      onDisconnected: () =>
        Alert.alert('Disconnected', 'Lost connection.', [
          { text: 'OK', onPress: () => navigation.navigate('Home') },
        ]),
    });
  }, []);

  useEffect(() => {
    setSelectedPoolIds([]);
    setShowHandForSandbox(false);
    setDiscardMode(false);
  }, [gameState?.sandboxIdx, gameState?.phase]);

  if (!gameState) {
    return <View style={styles.loading}><Text style={styles.loadingText}>Shuffling…</Text></View>;
  }

  const {
    phase, masterTurnIndex, deckSize, deadPileSize, playerTable, playerHandSizes,
    activeCard, offerToIdx, sandboxIdx, sandboxGroups, sandboxPoolSize,
    winTarget, players, winner, tie,
  } = gameState;

  const myIndex = players.findIndex(p => isHost ? p.id === 'host' : p.name === myName);
  const myPid = myIndex >= 0 ? String(players[myIndex]?.id) : null;
  const isMyOfferTurn = phase === 'offering' && offerToIdx === myIndex;
  const isMyMasterTurn = phase === 'offering' && masterTurnIndex === myIndex;
  const isInSandbox = phase === 'sandbox' && sandboxIdx === myIndex;

  // During sandbox, host sees live sandboxPool from fullRef
  const livePool = isHost && isInSandbox ? (fullRef.current?.sandboxPool ?? []) : [];
  const liveGroups = isHost && isInSandbox ? (fullRef.current?.sandboxGroups ?? []) : sandboxGroups;
  const sandboxFromHandIds = isHost && isInSandbox ? (fullRef.current?.sandboxFromHandIds ?? []) : [];
  const sandboxNewCardId = isHost && isInSandbox ? (fullRef.current?.sandboxNewCardId ?? null) : null;

  const sandboxIsValid = isSandboxValid(liveGroups, livePool);
  const sandboxTotal = liveGroups.reduce((s, g) => s + g.length, 0);

  const selectedPoolCards = livePool.filter(c => selectedPoolIds.includes(c.id));
  const selectionIsValidMeld = selectedPoolCards.length >= 3 && isValidMeld(selectedPoolCards);

  function hostAction(actionFn, ...args) {
    const next = actionFn(fullRef.current, ...args);
    applyState(next);
  }

  function clientSend(msg) {
    sendToHost({ type: 'ACTION', ...msg });
  }

  function act(action, payload = {}) {
    if (isHost) {
      const s = fullRef.current;
      if (!s) return;
      let next = s;
      if (action === 'pass') next = doPass(s, 'host');
      else if (action === 'take') next = doTake(s, 'host');
      else if (action === 'formGroup') next = doSandboxFormGroup(s, 'host', payload.cardIds);
      else if (action === 'addToGroup') next = doSandboxAddToGroup(s, 'host', payload.groupIdx, payload.cardIds);
      else if (action === 'breakGroup') next = doSandboxBreakGroup(s, 'host', payload.groupIdx);
      else if (action === 'addHandCard') next = doSandboxAddHandCard(s, 'host', payload.cardId);
      else if (action === 'returnHandCard') next = doSandboxReturnHandCard(s, 'host', payload.cardId);
      else if (action === 'discard') next = doDiscardFromHand(s, 'host', payload.cardId);
      applyState(next);
    } else {
      sendToHost({ type: 'ACTION', action, ...payload });
    }
    setSelectedPoolIds([]);
  }

  function togglePoolSelect(cardId) {
    setSelectedPoolIds(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  }

  function getBannerText() {
    if (phase === 'results') return tie ? 'Stock empty — Tie!' : `${winner?.name} wins!`;
    if (phase === 'offering') {
      const master = players[masterTurnIndex]?.name;
      if (isMyOfferTurn) return masterTurnIndex === myIndex
        ? 'You drew — Take or Pass?'
        : 'Offered to you — Take or Pass?';
      return offerToIdx >= 0
        ? `${players[offerToIdx]?.name} is deciding…`
        : `${master}'s turn…`;
    }
    if (phase === 'sandbox') {
      if (isInSandbox) return sandboxIsValid ? 'Table valid — pick a card to discard' : 'Organize your table';
      return `${players[sandboxIdx]?.name} is organizing…`;
    }
    return '';
  }

  const myTableMelds = playerTable[myPid] ?? [];
  const myTableCount = myTableMelds.reduce((s, g) => s + g.length, 0);

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* Banner */}
      <View style={[
        styles.banner,
        isMyOfferTurn && styles.bannerOffer,
        isInSandbox && styles.bannerSandbox,
        phase === 'results' && styles.bannerResults,
      ]}>
        <Text style={styles.bannerText}>{getBannerText()}</Text>
        {isInSandbox && (
          <Text style={styles.bannerSub}>
            {sandboxTotal}/{winTarget} on table · {livePool.length} ungrouped
          </Text>
        )}
      </View>

      {/* Opponents */}
      <View style={styles.opponentsRow}>
        {players.map((p, idx) => {
          if (idx === myIndex) return null;
          const pid = String(p.id);
          const tableCount = (playerTable[pid] ?? []).reduce((s, g) => s + g.length, 0);
          const active = phase === 'offering' ? offerToIdx === idx : sandboxIdx === idx;
          return (
            <View key={pid} style={[styles.opponentBox, active && styles.opponentBoxActive]}>
              <Text style={styles.opponentName}>{p.name}</Text>
              <Text style={styles.opponentStat}>🃏 Hand: {playerHandSizes[pid] ?? 0}</Text>
              <Text style={styles.opponentStat}>📋 Table: {tableCount}/{winTarget}</Text>
              {idx === masterTurnIndex && phase === 'offering' && (
                <Text style={styles.masterBadge}>DREW</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Active card */}
      {phase === 'offering' && (
        <View style={styles.activeArea}>
          <Text style={styles.areaLabel}>Active Card</Text>
          <View style={styles.activeRow}>
            {activeCard ? (
              <Card rank={activeCard.rank} suit={activeCard.suit} />
            ) : (
              <View style={styles.emptyCard}><Text style={styles.emptyCardText}>—</Text></View>
            )}
            <View style={styles.pileInfo}>
              <Text style={styles.pileText}>Stock: {deckSize}</Text>
              <Text style={styles.pileText}>Dead: {deadPileSize}</Text>
            </View>
          </View>

          {isMyOfferTurn && (
            <View style={styles.offerBtns}>
              <TouchableOpacity style={styles.takeBtn} onPress={() => act('take')}>
                <Text style={styles.takeBtnText}>Take</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.passBtn} onPress={() => act('pass')}>
                <Text style={styles.passBtnText}>Pass</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Sandbox */}
      {phase === 'sandbox' && isInSandbox && (
        <View style={styles.sandboxArea}>
          <Text style={styles.areaLabel}>Your Table (Sandbox)</Text>

          {/* Ungrouped pool */}
          {livePool.length > 0 && (
            <View style={styles.poolBox}>
              <Text style={styles.poolLabel}>Ungrouped — tap to select</Text>
              <View style={styles.cardRow}>
                {livePool.map(c => {
                  const isNew = c.id === sandboxNewCardId;
                  const isSel = selectedPoolIds.includes(c.id);
                  const isFromHand = sandboxFromHandIds.includes(c.id);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => togglePoolSelect(c.id)}
                      onLongPress={() => {
                        if (isFromHand) act('returnHandCard', { cardId: c.id });
                      }}
                      style={[styles.cardWrap, isNew && styles.cardNew, isSel && styles.cardSel]}
                    >
                      <Card rank={c.rank} suit={c.suit} />
                    </TouchableOpacity>
                  );
                })}
              </View>
              {selectedPoolIds.length >= 3 && (
                <View style={styles.selectionActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, !selectionIsValidMeld && styles.actionBtnDisabled]}
                    onPress={() => selectionIsValidMeld && act('formGroup', { cardIds: selectedPoolIds })}
                  >
                    <Text style={styles.actionBtnText}>Form Group ({selectedPoolIds.length})</Text>
                  </TouchableOpacity>
                  {liveGroups.map((g, gi) => {
                    const canAdd = selectedPoolCards.length > 0 &&
                      isValidMeld([...g, ...selectedPoolCards]);
                    if (!canAdd) return null;
                    return (
                      <TouchableOpacity
                        key={gi}
                        style={styles.actionBtn}
                        onPress={() => act('addToGroup', { groupIdx: gi, cardIds: selectedPoolIds })}
                      >
                        <Text style={styles.actionBtnText}>Add to Group {gi + 1}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              {selectedPoolIds.length === 1 && liveGroups.map((g, gi) => {
                const card = livePool.find(c => c.id === selectedPoolIds[0]);
                if (!card || !isValidMeld([...g, card])) return null;
                return (
                  <TouchableOpacity
                    key={gi}
                    style={[styles.actionBtn, { marginTop: 4 }]}
                    onPress={() => act('addToGroup', { groupIdx: gi, cardIds: selectedPoolIds })}
                  >
                    <Text style={styles.actionBtnText}>Add to Group {gi + 1}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Sandbox groups */}
          {liveGroups.map((g, gi) => (
            <View key={gi} style={[styles.groupBox, isValidMeld(g) ? styles.groupValid : styles.groupInvalid]}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupLabel}>
                  Group {gi + 1} {isValidMeld(g) ? '✓' : '✗'}
                </Text>
                <TouchableOpacity style={styles.breakBtn} onPress={() => act('breakGroup', { groupIdx: gi })}>
                  <Text style={styles.breakBtnText}>Break</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.cardRow}>
                {g.map(c => (
                  <View key={c.id} style={styles.cardWrap}>
                    <Card rank={c.rank} suit={c.suit} />
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* Add hand cards to sandbox */}
          <TouchableOpacity
            style={styles.addHandBtn}
            onPress={() => setShowHandForSandbox(v => !v)}
          >
            <Text style={styles.addHandBtnText}>
              {showHandForSandbox ? 'Hide Hand ▲' : 'Add Hand Cards to Table ▼'}
            </Text>
          </TouchableOpacity>
          {showHandForSandbox && (
            <View style={styles.handPickBox}>
              <Text style={styles.handPickLabel}>Tap a card to add it to the ungrouped pool</Text>
              <View style={styles.cardRow}>
                {myHand.map(c => (
                  <TouchableOpacity key={c.id} style={styles.cardWrap} onPress={() => act('addHandCard', { cardId: c.id })}>
                    <Card rank={c.rank} suit={c.suit} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Discard from hand */}
          {sandboxIsValid && (
            <View style={styles.discardArea}>
              <Text style={styles.discardLabel}>
                {discardMode ? 'Tap a hand card to discard it' : `Table valid! ${sandboxTotal >= winTarget ? 'You win!' : 'Now discard one hand card.'}`}
              </Text>
              {!discardMode && sandboxTotal < winTarget && (
                <TouchableOpacity style={styles.discardStartBtn} onPress={() => setDiscardMode(true)}>
                  <Text style={styles.discardStartBtnText}>Choose Discard</Text>
                </TouchableOpacity>
              )}
              {discardMode && (
                <View style={styles.cardRow}>
                  {myHand.map(c => (
                    <TouchableOpacity key={c.id} style={[styles.cardWrap, styles.cardDiscardable]}
                      onPress={() => { act('discard', { cardId: c.id }); setDiscardMode(false); }}>
                      <Card rank={c.rank} suit={c.suit} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Watching someone else sandbox */}
      {phase === 'sandbox' && !isInSandbox && sandboxIdx >= 0 && (
        <View style={styles.watchBox}>
          <Text style={styles.watchText}>{players[sandboxIdx]?.name} is organizing their table…</Text>
          <Text style={styles.watchSub}>
            {sandboxPoolSize} ungrouped · {sandboxGroups.reduce((s, g) => s + g.length, 0)} in groups
          </Text>
        </View>
      )}

      {/* My table melds */}
      {myIndex >= 0 && (
        <View style={styles.myTableBox}>
          <Text style={styles.areaLabel}>
            Your Table — {myTableCount}/{winTarget}
            {myTableCount >= winTarget ? ' 🏆' : ''}
          </Text>
          {myTableMelds.length === 0
            ? <Text style={styles.emptyTableText}>No melds yet</Text>
            : myTableMelds.map((g, gi) => (
              <ScrollView key={gi} horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={styles.cardRow}>
                  {g.map(c => <View key={c.id} style={[styles.cardWrap, { transform: [{ scale: 0.85 }] }]}><Card rank={c.rank} suit={c.suit} /></View>)}
                </View>
              </ScrollView>
            ))
          }
        </View>
      )}

      {/* My hand (always visible outside sandbox) */}
      {myIndex >= 0 && phase !== 'sandbox' && myHand.length > 0 && (
        <View style={styles.handBox}>
          <Text style={styles.areaLabel}>Your Hand ({myHand.length} cards)</Text>
          <View style={styles.cardRow}>
            {myHand.map(c => (
              <View key={c.id} style={styles.cardWrap}>
                <Card rank={c.rank} suit={c.suit} />
              </View>
            ))}
          </View>
        </View>
      )}
      {myIndex >= 0 && phase !== 'sandbox' && myHand.length === 0 && (
        <View style={styles.handBox}>
          <Text style={styles.areaLabel}>Your Hand</Text>
          <Text style={styles.emptyTableText}>No cards left in hand</Text>
        </View>
      )}

      {/* Results */}
      {phase === 'results' && (
        <View style={styles.resultsBox}>
          <Text style={styles.resultsText}>
            {tie ? '🤝  Tie — stock ran out!' : `🏆  ${winner?.name} wins!`}
          </Text>
          {isHost && (
            <TouchableOpacity style={styles.playAgainBtn} onPress={() => applyState(dealConquian(initialPlayers))}>
              <Text style={styles.playAgainText}>Play Again</Text>
            </TouchableOpacity>
          )}
          {!isHost && <Text style={styles.waitText}>Waiting for host…</Text>}
        </View>
      )}

    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#fff', fontSize: 18 },
  container: { flexGrow: 1, backgroundColor: '#1a1a2e', padding: 14, paddingBottom: 48 },

  banner: { backgroundColor: '#16213e', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', marginBottom: 12 },
  bannerOffer: { backgroundColor: '#2d5c35' },
  bannerSandbox: { backgroundColor: '#4a3000' },
  bannerResults: { backgroundColor: '#3d0505' },
  bannerText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  bannerSub: { color: '#ffa500', fontSize: 13, marginTop: 4 },

  opponentsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  opponentBox: { backgroundColor: '#16213e', borderRadius: 10, padding: 10, flex: 1, minWidth: 90, borderWidth: 1.5, borderColor: 'transparent' },
  opponentBoxActive: { borderColor: '#e94560' },
  opponentName: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  opponentStat: { color: '#b0b0c0', fontSize: 12 },
  masterBadge: { color: '#ffa500', fontSize: 11, fontWeight: 'bold', marginTop: 4 },

  activeArea: { backgroundColor: '#16213e', borderRadius: 12, padding: 14, marginBottom: 12 },
  areaLabel: { color: '#b0b0c0', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  pileInfo: { gap: 6 },
  pileText: { color: '#b0b0c0', fontSize: 13 },
  emptyCard: { width: 72, height: 100, backgroundColor: '#1a1a2e', borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#334', borderStyle: 'dashed' },
  emptyCardText: { color: '#444', fontSize: 24 },

  offerBtns: { flexDirection: 'row', gap: 10 },
  takeBtn: { flex: 1, backgroundColor: '#4caf50', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  takeBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  passBtn: { flex: 1, backgroundColor: '#16213e', borderRadius: 10, paddingVertical: 16, alignItems: 'center', borderWidth: 2, borderColor: '#334' },
  passBtnText: { color: '#b0b0c0', fontSize: 20, fontWeight: 'bold' },

  sandboxArea: { backgroundColor: '#16213e', borderRadius: 12, padding: 14, marginBottom: 12 },
  poolBox: { backgroundColor: '#1a1a2e', borderRadius: 10, padding: 10, marginBottom: 10 },
  poolLabel: { color: '#ffa500', fontSize: 12, marginBottom: 6 },
  cardRow: { flexDirection: 'row', flexWrap: 'wrap' },
  cardWrap: { margin: 3 },
  cardNew: { shadowColor: '#4caf50', shadowOpacity: 1, shadowRadius: 10, elevation: 8 },
  cardSel: { transform: [{ translateY: -8 }], shadowColor: '#e94560', shadowOpacity: 1, shadowRadius: 10, elevation: 8 },
  cardDiscardable: { opacity: 0.9 },

  selectionActions: { marginTop: 8, gap: 6 },
  actionBtn: { backgroundColor: '#e94560', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  actionBtnDisabled: { backgroundColor: '#4a1a25', opacity: 0.5 },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  groupBox: { borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 2 },
  groupValid: { backgroundColor: 'rgba(76,175,80,0.1)', borderColor: '#4caf50' },
  groupInvalid: { backgroundColor: 'rgba(233,69,96,0.1)', borderColor: '#e94560' },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  groupLabel: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  breakBtn: { backgroundColor: '#334', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  breakBtnText: { color: '#b0b0c0', fontSize: 12 },

  addHandBtn: { backgroundColor: '#16213e', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 4, borderWidth: 1, borderColor: '#334' },
  addHandBtnText: { color: '#b0b0c0', fontSize: 14 },
  handPickBox: { backgroundColor: '#1a1a2e', borderRadius: 10, padding: 10, marginTop: 8 },
  handPickLabel: { color: '#b0b0c0', fontSize: 12, marginBottom: 6 },

  discardArea: { backgroundColor: '#4a3000', borderRadius: 10, padding: 12, marginTop: 10 },
  discardLabel: { color: '#ffa500', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  discardStartBtn: { backgroundColor: '#e94560', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  discardStartBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  watchBox: { backgroundColor: '#16213e', borderRadius: 12, padding: 16, marginBottom: 12, alignItems: 'center' },
  watchText: { color: '#fff', fontSize: 15 },
  watchSub: { color: '#b0b0c0', fontSize: 13, marginTop: 4 },

  myTableBox: { backgroundColor: '#16213e', borderRadius: 12, padding: 14, marginBottom: 8 },
  emptyTableText: { color: '#555', fontSize: 13 },
  handBox: { backgroundColor: '#16213e', borderRadius: 12, padding: 14, marginBottom: 8 },

  resultsBox: { backgroundColor: '#16213e', borderRadius: 12, padding: 20, alignItems: 'center', marginTop: 16 },
  resultsText: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  playAgainBtn: { backgroundColor: '#e94560', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 32 },
  playAgainText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  waitText: { color: '#aaa', fontSize: 14 },
});
