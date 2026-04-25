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

// ─── Suit symbols ─────────────────────────────────────────────────────────────
const SUITS = ['♠', '♥', '♦', '♣'];

// ─── Game logic ───────────────────────────────────────────────────────────────

function cardValue(rank) {
  return { A:14,K:13,Q:12,J:11 }[rank] ?? parseInt(rank);
}

function canPlay(card, discardTop, chosenSuit) {
  if (card.rank === '8') return true;
  const activeSuit = chosenSuit ?? discardTop.suit;
  return card.suit === activeSuit || card.rank === discardTop.rank;
}

function dealCrazyEights(playerList) {
  let deck = shuffleDeck(createDeck());
  const perPlayer = playerList.length === 2 ? 7 : 5;
  const hands = {};
  let i = 0;
  for (const p of playerList) {
    hands[String(p.id)] = deck.slice(i, i + perPlayer);
    i += perPlayer;
  }
  deck = deck.slice(i);
  // First card for discard pile — skip 8s
  while (deck[0]?.rank === '8') deck.push(deck.shift());
  const discardTop = deck.shift();
  return {
    phase: 'playing', // 'playing' | 'choosingSuit' | 'results'
    deck,
    discardTop,
    hands,
    currentPlayerIndex: 0,
    chosenSuit: null,
    players: playerList,
    winner: null,
  };
}

function doPlay(state, playerId, cardId) {
  const pid = String(playerId);
  const hand = state.hands[pid];
  const card = hand.find((c) => c.id === cardId);
  if (!card || !canPlay(card, state.discardTop, state.chosenSuit)) return state;

  const newHand = hand.filter((c) => c.id !== cardId);
  const newHands = { ...state.hands, [pid]: newHand };

  if (newHand.length === 0) {
    return {
      ...state, hands: newHands, discardTop: card,
      chosenSuit: null, phase: 'results',
      winner: state.players.find((p) => String(p.id) === pid),
    };
  }
  if (card.rank === '8') {
    return { ...state, hands: newHands, discardTop: card, chosenSuit: null, phase: 'choosingSuit' };
  }
  return advanceTurn({ ...state, hands: newHands, discardTop: card, chosenSuit: null });
}

function doDraw(state, playerId) {
  const pid = String(playerId);
  if (state.deck.length === 0) return advanceTurn(state);
  const [drawn, ...rest] = state.deck;
  return advanceTurn({
    ...state, deck: rest,
    hands: { ...state.hands, [pid]: [...state.hands[pid], drawn] },
  });
}

function doChooseSuit(state, suit) {
  return advanceTurn({ ...state, chosenSuit: suit, phase: 'playing' });
}

function advanceTurn(state) {
  return { ...state, currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length };
}

// ─── Broadcast helpers ────────────────────────────────────────────────────────

function toPublic(state) {
  return {
    phase: state.phase,
    discardTop: state.discardTop,
    handSizes: Object.fromEntries(Object.entries(state.hands).map(([id, h]) => [id, h.length])),
    currentPlayerIndex: state.currentPlayerIndex,
    chosenSuit: state.chosenSuit,
    players: state.players,
    winner: state.winner,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CrazyEightsGameScreen({ navigation, route }) {
  const { role, myName, players: initialPlayers } = route.params;
  const isSinglePlayer = role === 'singleplayer';
  const isHost = role === 'host' || isSinglePlayer;

  const [gameState, setGameState] = useState(null);  // public state
  const [myHand, setMyHand] = useState([]);
  const fullRef = useRef(null);
  const [orderedHand, setOrderedHand] = useState([]);
  const [sortMode, setSortMode] = useState(false);
  const [moveFrom, setMoveFrom] = useState(null);

  useEffect(() => {
    setOrderedHand(prev => {
      const stillHere = prev.filter(c => myHand.some(h => h.id === c.id));
      const newCards = myHand.filter(c => !prev.some(p => p.id === c.id));
      return [...stillHere, ...newCards];
    });
  }, [myHand]);

  function handleSortTap(idx) {
    if (moveFrom === null) { setMoveFrom(idx); return; }
    if (moveFrom === idx) { setMoveFrom(null); return; }
    const newOrder = [...orderedHand];
    const [card] = newOrder.splice(moveFrom, 1);
    newOrder.splice(moveFrom < idx ? idx - 1 : idx, 0, card);
    setOrderedHand(newOrder);
    setMoveFrom(null);
  }

  function applyState(next) {
    fullRef.current = next;
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
    if (!isSinglePlayer || state.phase === 'results') return;
    const currentP = state.players[state.currentPlayerIndex];
    if (!currentP?.isAI) return;
    if (state.phase !== 'playing' && state.phase !== 'choosingSuit') return;
    setTimeout(() => {
      const s = fullRef.current;
      if (!s || s.phase === 'results') return;
      const cp = s.players[s.currentPlayerIndex];
      if (!cp?.isAI) return;
      const aiPid = String(cp.id);
      let next;
      if (s.phase === 'choosingSuit') {
        const hand = s.hands[aiPid] || [];
        const sc = { '♠': 0, '♥': 0, '♦': 0, '♣': 0 };
        hand.forEach(c => { if (sc[c.suit] !== undefined) sc[c.suit]++; });
        const suit = Object.entries(sc).sort((a, b) => b[1] - a[1])[0][0];
        next = doChooseSuit(s, suit);
      } else {
        const hand = s.hands[aiPid] || [];
        const playable = hand.find(c => canPlay(c, s.discardTop, s.chosenSuit));
        next = playable ? doPlay(s, aiPid, playable.id) : doDraw(s, aiPid);
      }
      if (next !== s) applyState(next);
    }, 800 + Math.random() * 700);
  }

  // ── Host setup ──
  useEffect(() => {
    if (!isHost) return;
    applyState(dealCrazyEights(initialPlayers));
    if (!isSinglePlayer) {
      setServerListeners({
        onMessage: (msg, clientId) => {
          const state = fullRef.current;
          if (!state || msg.type !== 'ACTION') return;
          const idx = state.players.findIndex((p) => p.id === clientId);
          if (state.phase === 'choosingSuit') {
            if (msg.action === 'chooseSuit' && idx === state.currentPlayerIndex) {
              applyState(doChooseSuit(state, msg.suit));
            }
            return;
          }
          if (state.phase !== 'playing' || idx !== state.currentPlayerIndex) return;
          if (msg.action === 'play')  applyState(doPlay(state, clientId, msg.cardId));
          if (msg.action === 'draw')  applyState(doDraw(state, clientId));
        },
      });
    }
  }, []);

  // ── Client setup ──
  useEffect(() => {
    if (isHost) return;
    setClientListeners({
      onMessage: (msg) => {
        if (msg.type === 'GAME_STATE')   setGameState(msg);
        if (msg.type === 'PRIVATE_HAND') setMyHand(msg.hand);
      },
      onDisconnected: () =>
        Alert.alert('Disconnected', 'Lost connection to the host.', [
          { text: 'OK', onPress: () => navigation.navigate('Home') },
        ]),
    });
  }, []);

  // ── Actions ──
  function act(payload) {
    if (isHost) {
      const state = fullRef.current;
      if (!state) return;
      const myIdx = state.players.findIndex((p) => p.id === 'host');
      if (state.phase === 'choosingSuit' && payload.action === 'chooseSuit') {
        if (myIdx === state.currentPlayerIndex) applyState(doChooseSuit(state, payload.suit));
        return;
      }
      if (state.phase !== 'playing' || myIdx !== state.currentPlayerIndex) return;
      if (payload.action === 'play') applyState(doPlay(state, 'host', payload.cardId));
      if (payload.action === 'draw') applyState(doDraw(state, 'host'));
    } else {
      sendToHost({ type: 'ACTION', ...payload });
    }
  }

  if (!gameState) {
    return <View style={styles.loading}><Text style={styles.loadingText}>Dealing cards…</Text></View>;
  }

  const { phase, discardTop, handSizes, currentPlayerIndex, chosenSuit, players, winner } = gameState;
  const myIndex = players.findIndex((p) => isHost ? p.id === 'host' : p.name === myName);
  const isMyTurn = currentPlayerIndex === myIndex;
  const currentPlayer = players[currentPlayerIndex];
  const hasPlayable = myHand.some((c) => discardTop && canPlay(c, discardTop, chosenSuit));

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* Banner */}
      <View style={[styles.banner, phase === 'results' && styles.bannerResults]}>
        <Text style={styles.bannerText}>
          {phase === 'results'
            ? `🏆  ${winner?.name} wins!`
            : phase === 'choosingSuit'
            ? isMyTurn ? 'Pick a suit!' : `${currentPlayer?.name} is picking a suit…`
            : isMyTurn ? '▶  Your turn' : `Waiting for ${currentPlayer?.name}…`}
        </Text>
      </View>

      {/* Table: discard + draw */}
      <View style={styles.table}>
        <View style={styles.tableCard}>
          <Text style={styles.tableLabel}>Discard</Text>
          {discardTop && <Card rank={discardTop.rank} suit={discardTop.suit} />}
          {chosenSuit && <Text style={styles.suitTag}>{chosenSuit}</Text>}
        </View>
        <TouchableOpacity
          style={[styles.drawPile, isMyTurn && phase === 'playing' && !hasPlayable && styles.drawPileActive]}
          onPress={() => act({ action: 'draw' })}
          disabled={!isMyTurn || phase !== 'playing' || hasPlayable}
        >
          <Text style={styles.drawLabel}>DRAW</Text>
        </TouchableOpacity>
      </View>

      {/* Suit chooser */}
      {phase === 'choosingSuit' && isMyTurn && (
        <View style={styles.suitPicker}>
          <Text style={styles.suitPickerLabel}>Choose a suit:</Text>
          <View style={styles.suitRow}>
            {SUITS.map((s) => (
              <TouchableOpacity key={s} style={styles.suitBtn} onPress={() => act({ action: 'chooseSuit', suit: s })}>
                <Text style={[styles.suitBtnText, (s === '♥' || s === '♦') && styles.red]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Other players */}
      {players.map((player, idx) => {
        if (idx === myIndex) return null;
        const isCurrent = idx === currentPlayerIndex && phase === 'playing';
        return (
          <View key={String(player.id)} style={[styles.otherPlayer, isCurrent && styles.otherPlayerActive]}>
            <Text style={styles.otherName}>{player.name}</Text>
            <Text style={styles.cardCount}>{handSizes[String(player.id)] ?? 0} cards</Text>
          </View>
        );
      })}

      {/* My hand */}
      <View style={styles.mySection}>
        <View style={styles.handHeader}>
          <Text style={styles.myLabel}>Your Hand ({orderedHand.length})</Text>
          <TouchableOpacity
            style={[styles.sortBtn, sortMode && styles.sortBtnActive]}
            onPress={() => { setSortMode(m => !m); setMoveFrom(null); }}
          >
            <Text style={styles.sortBtnText}>{sortMode ? 'Done ✓' : '⇄ Sort'}</Text>
          </TouchableOpacity>
        </View>
        {sortMode && (
          <Text style={styles.sortHint}>
            {moveFrom === null ? 'Tap a card to pick it up' : 'Tap another card to move it there'}
          </Text>
        )}
        <View style={styles.handRow}>
          {orderedHand.map((card, idx) => {
            const playable = !sortMode && isMyTurn && phase === 'playing' && discardTop && canPlay(card, discardTop, chosenSuit);
            const isMoving = sortMode && moveFrom === idx;
            return (
              <TouchableOpacity
                key={card.id}
                onPress={() => {
                  if (sortMode) { handleSortTap(idx); return; }
                  if (playable) act({ action: 'play', cardId: card.id });
                }}
                style={[
                  styles.cardWrap,
                  isMoving && styles.cardMoving,
                  !sortMode && playable && styles.cardPlayable,
                  !sortMode && !playable && styles.cardDim,
                ]}
              >
                <Card rank={card.rank} suit={card.suit} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Results */}
      {phase === 'results' && isHost && (
        <TouchableOpacity style={styles.playAgainBtn} onPress={() => applyState(dealCrazyEights(initialPlayers))}>
          <Text style={styles.playAgainText}>🔄  Play Again</Text>
        </TouchableOpacity>
      )}
      {phase === 'results' && !isHost && (
        <Text style={styles.waitText}>Waiting for host to deal again…</Text>
      )}

    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#0d5c2e', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#fff', fontSize: 18 },
  container: { flexGrow: 1, backgroundColor: '#0d5c2e', padding: 14, paddingBottom: 40 },

  banner: { backgroundColor: '#e94560', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 12 },
  bannerResults: { backgroundColor: '#1a1a2e' },
  bannerText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  table: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 24, marginBottom: 14 },
  tableCard: { alignItems: 'center' },
  tableLabel: { color: '#ccc', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  suitTag: { marginTop: 6, fontSize: 22, color: '#ffd700', fontWeight: 'bold' },
  drawPile: {
    width: 72, height: 100, backgroundColor: '#16213e',
    borderRadius: 8, borderWidth: 2, borderColor: '#334',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  drawPileActive: { borderColor: '#ffd700', backgroundColor: '#1a2a1a' },
  drawLabel: { color: '#888', fontSize: 13, fontWeight: 'bold', letterSpacing: 1 },

  suitPicker: { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, padding: 16, marginBottom: 12, alignItems: 'center' },
  suitPickerLabel: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 12 },
  suitRow: { flexDirection: 'row', gap: 12 },
  suitBtn: { backgroundColor: '#16213e', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  suitBtnText: { fontSize: 26, color: '#fff' },
  red: { color: '#e94560' },

  otherPlayer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  otherPlayerActive: { borderColor: '#ffd700', backgroundColor: 'rgba(255,215,0,0.08)' },
  otherName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cardCount: { color: '#ccc', fontSize: 14 },

  mySection: { backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 12, padding: 12, marginTop: 6, marginBottom: 12 },
  handHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  myLabel: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  sortBtn: { backgroundColor: '#16213e', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#334' },
  sortBtnActive: { backgroundColor: '#e94560', borderColor: '#e94560' },
  sortBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  sortHint: { color: '#888', fontSize: 12, marginBottom: 8 },
  handRow: { flexDirection: 'row', flexWrap: 'wrap' },
  cardWrap: { borderRadius: 6 },
  cardMoving: { transform: [{ translateY: -10 }], shadowColor: '#00ccff', shadowOpacity: 0.9, shadowRadius: 10, elevation: 10 },
  cardPlayable: { transform: [{ translateY: -8 }], shadowColor: '#ffd700', shadowOpacity: 0.8, shadowRadius: 8, elevation: 8 },
  cardDim: { opacity: 0.6 },

  playAgainBtn: { backgroundColor: '#e94560', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  playAgainText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  waitText: { color: '#aaa', textAlign: 'center', fontSize: 14, marginTop: 8 },
});
