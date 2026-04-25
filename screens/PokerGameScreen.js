import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { createDeck, shuffleDeck } from '../game/deck';
import Card from '../components/Card';
import {
  setServerListeners, broadcastToClients, sendToClient,
  setClientListeners, sendToHost,
} from '../game/GameNetwork';

// ─── Constants ────────────────────────────────────────────────────────────────

const STARTING_CHIPS = 500;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;

// ─── Hand evaluation ──────────────────────────────────────────────────────────

const RANK_VAL = { A:14,K:13,Q:12,J:11,'10':10,'9':9,'8':8,'7':7,'6':6,'5':5,'4':4,'3':3,'2':2 };

function evaluate5(cards) {
  const vals = cards.map((c) => RANK_VAL[c.rank]).sort((a, b) => b - a);
  const isFlush = new Set(cards.map((c) => c.suit)).size === 1;
  const allUniq = new Set(vals).size === 5;
  const isNorm = allUniq && vals[0] - vals[4] === 4;
  const isWheel = allUniq && vals[0] === 14 && vals[1] === 5 && vals[2] === 4 && vals[3] === 3 && vals[4] === 2;
  const isStraight = isNorm || isWheel;
  const strHigh = isWheel ? 5 : vals[0];
  const cnt = {};
  for (const v of vals) cnt[v] = (cnt[v] || 0) + 1;
  const groups = Object.entries(cnt).map(([v, n]) => ({ v: +v, n })).sort((a, b) => b.n - a.n || b.v - a.v);
  if (isFlush && isStraight && strHigh === 14) return { rank: 8, name: 'Royal Flush',     tb: [14] };
  if (isFlush && isStraight)                  return { rank: 7, name: 'Straight Flush',   tb: [strHigh] };
  if (groups[0].n === 4)                      return { rank: 6, name: 'Four of a Kind',   tb: [groups[0].v, groups[1].v] };
  if (groups[0].n === 3 && groups[1]?.n === 2) return { rank: 5, name: 'Full House',      tb: [groups[0].v, groups[1].v] };
  if (isFlush)                                return { rank: 4, name: 'Flush',            tb: vals };
  if (isStraight)                             return { rank: 3, name: 'Straight',         tb: [strHigh] };
  if (groups[0].n === 3)                      return { rank: 2, name: 'Three of a Kind',  tb: [groups[0].v, ...vals.filter((v) => v !== groups[0].v)] };
  if (groups[0].n === 2 && groups[1]?.n === 2) return { rank: 1, name: 'Two Pair',       tb: [groups[0].v, groups[1].v, vals.find((v) => v !== groups[0].v && v !== groups[1].v)] };
  if (groups[0].n === 2)                      return { rank: 0, name: 'One Pair',         tb: [groups[0].v, ...vals.filter((v) => v !== groups[0].v)] };
  return { rank: -1, name: 'High Card', tb: vals };
}

function cmpScore(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.max(a.tb.length, b.tb.length); i++) {
    if ((a.tb[i] ?? 0) !== (b.tb[i] ?? 0)) return (a.tb[i] ?? 0) - (b.tb[i] ?? 0);
  }
  return 0;
}

function bestHand(holeCards, community) {
  const all = [...holeCards, ...community];
  if (all.length <= 5) return evaluate5(all.length === 5 ? all : [...all, ...Array(5 - all.length).fill(all[0])]);
  let best = null;
  function choose(start, cur) {
    if (cur.length === 5) { const s = evaluate5(cur); if (!best || cmpScore(s, best) > 0) best = s; return; }
    for (let i = start; i <= all.length - (5 - cur.length); i++) { cur.push(all[i]); choose(i + 1, cur); cur.pop(); }
  }
  choose(0, []);
  return best;
}

// ─── Game logic ───────────────────────────────────────────────────────────────

function initDeal(playerList, dealerIdx, prevChips) {
  const deck = shuffleDeck(createDeck());
  const n = playerList.length;
  const hands = {};
  let di = 0;
  for (const p of playerList) { hands[String(p.id)] = [deck[di++], deck[di++]]; }

  const playerStates = {};
  for (const p of playerList) {
    playerStates[String(p.id)] = {
      chips: prevChips ? (prevChips[String(p.id)] ?? STARTING_CHIPS) : STARTING_CHIPS,
      bet: 0, folded: false, allIn: false,
    };
  }

  const sbIdx = n === 2 ? dealerIdx : (dealerIdx + 1) % n;
  const bbIdx = n === 2 ? (dealerIdx + 1) % n : (dealerIdx + 2) % n;
  const firstToAct = (bbIdx + 1) % n;

  const sbPid = String(playerList[sbIdx].id);
  const bbPid = String(playerList[bbIdx].id);
  const sbAmt = Math.min(SMALL_BLIND, playerStates[sbPid].chips);
  const bbAmt = Math.min(BIG_BLIND, playerStates[bbPid].chips);

  playerStates[sbPid].chips -= sbAmt; playerStates[sbPid].bet = sbAmt;
  if (playerStates[sbPid].chips === 0) playerStates[sbPid].allIn = true;
  playerStates[bbPid].chips -= bbAmt; playerStates[bbPid].bet = bbAmt;
  if (playerStates[bbPid].chips === 0) playerStates[bbPid].allIn = true;

  // playersToAct: ordered queue of player indices still to act
  const toAct = [];
  for (let j = 0; j < n; j++) {
    const idx = (firstToAct + j) % n;
    const ps = playerStates[String(playerList[idx].id)];
    if (!ps.folded && !ps.allIn) toAct.push(idx);
  }

  return {
    phase: 'preflop',
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
  const finalPS = { ...newPS, [wid]: { ...newPS[wid], chips: newPS[wid].chips + state.pot } };
  return { ...state, phase: 'showdown', playerStates: finalPS, winner, handResult: { type: 'fold', winnerName: winner.name, hands: state.hands } };
}

function advanceBettingRound(state) {
  // Reset bets for new round
  const newPS = {};
  for (const [pid, ps] of Object.entries(state.playerStates)) newPS[pid] = { ...ps, bet: 0 };

  let nextPhase, newDeck = [...state.deck], newCC = [...state.communityCards];
  if (state.phase === 'preflop') { newDeck.shift(); newCC = [newDeck.shift(), newDeck.shift(), newDeck.shift()]; nextPhase = 'flop'; }
  else if (state.phase === 'flop')  { newDeck.shift(); newCC = [...newCC, newDeck.shift()]; nextPhase = 'turn'; }
  else if (state.phase === 'turn')  { newDeck.shift(); newCC = [...newCC, newDeck.shift()]; nextPhase = 'river'; }
  else { return doShowdown({ ...state, playerStates: newPS }); }

  const n = state.players.length;
  const canAct = [];
  for (let j = 1; j <= n; j++) {
    const idx = (state.dealerIdx + j) % n;
    const ps = newPS[String(state.players[idx].id)];
    if (!ps.folded && !ps.allIn) canAct.push(idx);
  }

  // If nobody can act (all all-in), run out the board
  if (canAct.length === 0) {
    let s = { ...state, phase: nextPhase, deck: newDeck, communityCards: newCC, playerStates: newPS };
    while (s.phase !== 'showdown') s = advanceBettingRound(s);
    return s;
  }

  return {
    ...state, phase: nextPhase, deck: newDeck, communityCards: newCC,
    playerStates: newPS, currentBet: 0, minRaise: BIG_BLIND,
    toAct: canAct, currentPlayerIndex: canAct[0], lastAction: null,
  };
}

function doShowdown(state) {
  const active = state.players.filter((p) => !state.playerStates[String(p.id)].folded);
  const handDescriptions = {};
  const scores = {};
  for (const p of active) {
    const pid = String(p.id);
    const score = bestHand(state.hands[pid] || [], state.communityCards);
    handDescriptions[pid] = score.name;
    scores[pid] = score;
  }
  let bestScore = null;
  for (const p of active) { const s = scores[String(p.id)]; if (!bestScore || cmpScore(s, bestScore) > 0) bestScore = s; }
  const winners = active.filter((p) => cmpScore(scores[String(p.id)], bestScore) === 0);
  const share = Math.floor(state.pot / winners.length);
  const newPS = { ...state.playerStates };
  for (const w of winners) { const wid = String(w.id); newPS[wid] = { ...newPS[wid], chips: newPS[wid].chips + share }; }
  return {
    ...state, phase: 'showdown', playerStates: newPS,
    winner: winners[0], handResult: { type: 'showdown', winners, handDescriptions, hands: state.hands },
  };
}

function removeToAct(toAct, idx) { return toAct.filter((i) => i !== idx); }

function doFold(state) {
  const myIdx = state.currentPlayerIndex;
  const pid = String(state.players[myIdx].id);
  const name = state.players[myIdx].name;
  const newPS = { ...state.playerStates, [pid]: { ...state.playerStates[pid], folded: true } };
  const oneLeft = checkOneLeft(state, newPS);
  if (oneLeft) return { ...oneLeft, lastAction: `${name} folds` };
  const newToAct = removeToAct(state.toAct, myIdx);
  const s = { ...state, playerStates: newPS, toAct: newToAct, lastAction: `${name} folds` };
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
  const newPS = { ...state.playerStates, [pid]: { ...ps, chips: ps.chips - toCall, bet: ps.bet + toCall, allIn: isAllIn } };
  const newToAct = removeToAct(state.toAct, myIdx);
  const s = {
    ...state, playerStates: newPS, pot: state.pot + toCall, toAct: newToAct,
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
  const newPS = { ...state.playerStates, [pid]: { ...ps, chips: ps.chips - toAdd, bet: actualBet, allIn: isAllIn } };
  // Re-build toAct: all active players after raiser (except raiser)
  const n = state.players.length;
  const newToAct = [];
  for (let j = 1; j < n; j++) {
    const idx = (myIdx + j) % n;
    const p = state.players[idx];
    const pps = newPS[String(p.id)];
    if (!pps.folded && !pps.allIn) newToAct.push(idx);
  }
  return {
    ...state, playerStates: newPS, pot: state.pot + toAdd,
    currentBet: actualBet, minRaise: raiseAmount,
    toAct: newToAct, currentPlayerIndex: newToAct[0] ?? myIdx,
    lastAction: isAllIn ? `${name} is all-in!` : `${name} raises to ${actualBet}`,
  };
}

function toPublic(state) {
  return {
    phase: state.phase,
    communityCards: state.communityCards,
    pot: state.pot,
    playerStates: Object.fromEntries(
      Object.entries(state.playerStates).map(([id, ps]) => [id, { chips: ps.chips, bet: ps.bet, folded: ps.folded, allIn: ps.allIn }])
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function PokerGameScreen({ navigation, route }) {
  const { role, myName, players: initialPlayers } = route.params;
  const isSinglePlayer = role === 'singleplayer';
  const isHost = role === 'host' || isSinglePlayer;

  const [gameState, setGameState] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const fullRef = useRef(null);
  const dealerRef = useRef(0);
  const chipsRef = useRef(null);

  function applyState(next) {
    fullRef.current = next;
    dealerRef.current = next.dealerIdx;
    chipsRef.current = Object.fromEntries(next.players.map((p) => [String(p.id), next.playerStates[String(p.id)].chips]));
    setMyHand(next.hands['host'] ?? []);
    setGameState(toPublic(next));
    if (!isSinglePlayer) {
      broadcastToClients({ type: 'GAME_STATE', ...toPublic(next) });
      next.players.forEach((p) => {
        if (p.id !== 'host') {
          sendToClient(p.id, { type: 'PRIVATE_HAND', hand: next.hands[String(p.id)] ?? [] });
        }
      });
    }
    scheduleAI(next);
  }

  function scheduleAI(state) {
    if (!isSinglePlayer || state.phase === 'showdown') return;
    const currentP = state.players[state.currentPlayerIndex];
    if (!currentP?.isAI) return;
    setTimeout(() => {
      const s = fullRef.current;
      if (!s || s.phase === 'showdown') return;
      const cp = s.players[s.currentPlayerIndex];
      if (!cp?.isAI) return;
      const pid = String(cp.id);
      const ps = s.playerStates[pid];
      const toCall = s.currentBet - ps.bet;
      let next;
      if (toCall <= 0) {
        next = doCheck(s);
      } else if (toCall > ps.chips * 0.5) {
        next = doFold(s);
      } else if (Math.random() < 0.2 && ps.chips > toCall + s.minRaise) {
        next = doRaise(s, s.minRaise);
      } else {
        next = doCall(s);
      }
      if (next !== s) applyState(next);
    }, 1000 + Math.random() * 800);
  }

  useEffect(() => {
    if (!isHost) return;
    applyState(initDeal(initialPlayers, 0, null));
    if (!isSinglePlayer) {
      setServerListeners({
        onMessage: (msg, clientId) => {
          const state = fullRef.current;
          if (!state || msg.type !== 'ACTION') return;
          if (state.phase === 'showdown' && msg.action === 'nextHand') {
            const activePlayers = state.players.filter((p) => chipsRef.current[String(p.id)] > 0);
            if (activePlayers.length < 2) return;
            const newDealer = (dealerRef.current + 1) % activePlayers.length;
            applyState(initDeal(activePlayers, newDealer, chipsRef.current));
            return;
          }
          if (state.players.findIndex((p) => p.id === clientId) !== state.currentPlayerIndex) return;
          if (state.phase === 'showdown') return;
          const pid = String(clientId);
          let next = state;
          if (msg.action === 'fold')  next = doFold(state);
          if (msg.action === 'check') next = doCheck(state);
          if (msg.action === 'call')  next = doCall(state);
          if (msg.action === 'raise') next = doRaise(state, msg.amount);
          if (next !== state) applyState(next);
        },
      });
    }
  }, []);

  useEffect(() => {
    if (isHost) return;
    setClientListeners({
      onMessage: (msg) => {
        if (msg.type === 'GAME_STATE')   setGameState(msg);
        if (msg.type === 'PRIVATE_HAND') setMyHand(msg.hand);
      },
      onDisconnected: () =>
        Alert.alert('Disconnected', 'Lost connection.', [
          { text: 'OK', onPress: () => navigation.navigate('Home') },
        ]),
    });
  }, []);

  function act(action) {
    if (isHost) {
      const state = fullRef.current;
      if (!state) return;
      if (action.action === 'nextHand' && state.phase === 'showdown') {
        const activePlayers = state.players.filter((p) => chipsRef.current[String(p.id)] > 0);
        if (activePlayers.length < 2) return;
        const newDealer = (dealerRef.current + 1) % activePlayers.length;
        applyState(initDeal(activePlayers, newDealer, chipsRef.current));
        return;
      }
      if (state.players.findIndex((p) => p.id === 'host') !== state.currentPlayerIndex) return;
      let next = state;
      if (action.action === 'fold')  next = doFold(state);
      if (action.action === 'check') next = doCheck(state);
      if (action.action === 'call')  next = doCall(state);
      if (action.action === 'raise') next = doRaise(state, action.amount);
      if (next !== state) applyState(next);
    } else {
      sendToHost({ type: 'ACTION', ...action });
    }
  }

  if (!gameState) {
    return <View style={styles.loading}><Text style={styles.loadingText}>Dealing…</Text></View>;
  }

  const { phase, communityCards, pot, playerStates, currentPlayerIndex, currentBet, minRaise, dealerIdx, lastAction, players, handResult } = gameState;
  const myIndex = players.findIndex((p) => isHost ? p.id === 'host' : p.name === myName);
  const myPid = String(players[myIndex]?.id ?? 'me');
  const myPS = playerStates[myPid] ?? {};
  const isMyTurn = currentPlayerIndex === myIndex && phase !== 'showdown';
  const currentPlayer = players[currentPlayerIndex];
  const canCheck = isMyTurn && myPS.bet >= currentBet;

  // Raise preset amounts
  const myChips = myPS.chips ?? 0;
  const raiseOptions = [
    { label: `+${minRaise}`, amount: minRaise },
    { label: `+${minRaise * 2}`, amount: minRaise * 2 },
    { label: `${pot} (pot)`, amount: Math.max(pot - currentBet, minRaise) },
    { label: 'All-In', amount: myChips + (myPS.bet ?? 0) - currentBet },
  ].filter((o) => o.amount > 0 && myChips >= o.amount);

  // At showdown: reveal hands
  const revealedHands = handResult?.hands ?? {};

  const phaseLabel = { preflop: 'Pre-Flop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Showdown' };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* Banner */}
      <View style={[styles.banner, phase === 'showdown' && styles.bannerShowdown]}>
        <Text style={styles.bannerText}>
          {phase === 'showdown'
            ? handResult?.type === 'fold'
              ? `🏆  ${handResult.winnerName} wins (everyone folded)`
              : `🏆  ${handResult?.winners?.map((w) => w.name).join(' & ')} win!`
            : isMyTurn
            ? `▶  Your turn  ·  ${phaseLabel[phase]}`
            : `${currentPlayer?.name}'s turn  ·  ${phaseLabel[phase]}`}
        </Text>
      </View>

      {/* Last action */}
      {lastAction ? (
        <View style={styles.actionBox}><Text style={styles.actionText}>{lastAction}</Text></View>
      ) : null}

      {/* Pot + community cards */}
      <View style={styles.communitySection}>
        <Text style={styles.potText}>Pot: {pot} chips</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.communityRow}>
            {communityCards.map((c) => <Card key={c.id} rank={c.rank} suit={c.suit} />)}
            {Array(5 - communityCards.length).fill(null).map((_, i) => (
              <View key={`ph-${i}`} style={styles.cardPlaceholder} />
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Players */}
      {players.map((p, idx) => {
        const pid = String(p.id);
        const ps = playerStates[pid] ?? {};
        const isCurrent = idx === currentPlayerIndex && phase !== 'showdown';
        const isMe = idx === myIndex;
        const showCards = phase === 'showdown' && !ps.folded && revealedHands[pid];
        const handDesc = handResult?.handDescriptions?.[pid];
        const isWinner = handResult?.winners?.some((w) => String(w.id) === pid);
        return (
          <View key={pid} style={[styles.playerCard, isCurrent && styles.playerCardActive, ps.folded && styles.playerCardFolded, isWinner && styles.playerCardWinner]}>
            <View style={styles.playerTop}>
              <Text style={styles.playerName}>
                {idx === dealerIdx ? '🎩 ' : ''}{p.name}{isMe ? ' (you)' : ''}
              </Text>
              <Text style={styles.playerChips}>{ps.chips} chips</Text>
            </View>
            {ps.bet > 0 && <Text style={styles.playerBet}>Bet: {ps.bet}</Text>}
            {ps.folded && <Text style={styles.foldedLabel}>FOLDED</Text>}
            {ps.allIn && !ps.folded && <Text style={styles.allInLabel}>ALL-IN</Text>}
            {showCards && (
              <View style={styles.revealRow}>
                {revealedHands[pid].map((c) => <Card key={c.id} rank={c.rank} suit={c.suit} />)}
                {handDesc && <Text style={styles.handDesc}>{handDesc}</Text>}
              </View>
            )}
          </View>
        );
      })}

      {/* My hole cards */}
      <View style={styles.myHand}>
        <Text style={styles.myHandLabel}>Your Cards</Text>
        <View style={styles.myHandRow}>
          {myHand.map((c) => <Card key={c.id} rank={c.rank} suit={c.suit} />)}
        </View>
      </View>

      {/* Action buttons */}
      {isMyTurn && (
        <View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.foldBtn]} onPress={() => act({ action: 'fold' })}>
              <Text style={styles.actionBtnText}>Fold</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.callBtn]} onPress={() => act({ action: canCheck ? 'check' : 'call' })}>
              <Text style={styles.actionBtnText}>{canCheck ? 'Check' : `Call ${currentBet - (myPS.bet ?? 0)}`}</Text>
            </TouchableOpacity>
          </View>
          {raiseOptions.length > 0 && (
            <View style={styles.raiseRow}>
              {raiseOptions.map((opt) => (
                <TouchableOpacity key={opt.label} style={styles.raiseBtn} onPress={() => act({ action: 'raise', amount: opt.amount })}>
                  <Text style={styles.raiseBtnText}>Raise</Text>
                  <Text style={styles.raiseBtnAmt}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Next hand / results */}
      {phase === 'showdown' && isHost && (
        <TouchableOpacity style={styles.nextHandBtn} onPress={() => act({ action: 'nextHand' })}>
          <Text style={styles.nextHandText}>Next Hand →</Text>
        </TouchableOpacity>
      )}
      {phase === 'showdown' && !isHost && (
        <Text style={styles.waitText}>Waiting for host to deal next hand…</Text>
      )}

    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#0a1628', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#fff', fontSize: 18 },
  container: { flexGrow: 1, backgroundColor: '#0a1628', padding: 14, paddingBottom: 40 },

  banner: { backgroundColor: '#e94560', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 8 },
  bannerShowdown: { backgroundColor: '#7b2d8b' },
  bannerText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  actionBox: { backgroundColor: '#16213e', borderRadius: 8, padding: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#e94560' },
  actionText: { color: '#ccc', fontSize: 13 },

  communitySection: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, marginBottom: 10, alignItems: 'center' },
  potText: { color: '#ffd700', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  communityRow: { flexDirection: 'row', gap: 6 },
  cardPlaceholder: { width: 56, height: 80, backgroundColor: '#16213e', borderRadius: 6, borderWidth: 1, borderColor: '#334', borderStyle: 'dashed' },

  playerCard: {
    backgroundColor: '#16213e', borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent',
  },
  playerCardActive: { borderColor: '#ffd700', backgroundColor: 'rgba(255,215,0,0.06)' },
  playerCardFolded: { opacity: 0.45 },
  playerCardWinner: { borderColor: '#4caf50', backgroundColor: 'rgba(76,175,80,0.08)' },
  playerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  playerName: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  playerChips: { color: '#ffd700', fontSize: 14, fontWeight: 'bold' },
  playerBet: { color: '#b0b0c0', fontSize: 12, marginTop: 4 },
  foldedLabel: { color: '#e94560', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  allInLabel: { color: '#ff9800', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  revealRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  handDesc: { color: '#ffd700', fontSize: 13, fontWeight: 'bold', marginLeft: 8 },

  myHand: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, marginBottom: 10 },
  myHandLabel: { color: '#b0b0c0', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  myHandRow: { flexDirection: 'row', gap: 8 },

  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  foldBtn: { backgroundColor: '#555' },
  callBtn: { backgroundColor: '#2980b9' },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  raiseRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  raiseBtn: { flex: 1, minWidth: 70, backgroundColor: '#e94560', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  raiseBtnText: { color: '#fff', fontSize: 12 },
  raiseBtnAmt: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  nextHandBtn: { backgroundColor: '#4caf50', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  nextHandText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  waitText: { color: '#aaa', textAlign: 'center', fontSize: 14, marginTop: 8 },
});
