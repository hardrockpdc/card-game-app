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

const RANK_ORDER = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// ─── Meld validation ──────────────────────────────────────────────────────────

function isSet(cards) {
  if (cards.length < 3 || cards.length > 4) return false;
  const rank = cards[0].rank;
  const suits = new Set(cards.map((c) => c.suit));
  return cards.every((c) => c.rank === rank) && suits.size === cards.length;
}

function isRun(cards) {
  if (cards.length < 3) return false;
  if (new Set(cards.map((c) => c.suit)).size !== 1) return false;
  const idxs = cards.map((c) => RANK_ORDER.indexOf(c.rank)).sort((a, b) => a - b);
  for (let i = 1; i < idxs.length; i++) if (idxs[i] !== idxs[i - 1] + 1) return false;
  return true;
}

function isValidMeld(cards) {
  return isSet(cards) || isRun(cards);
}

// ─── Game logic ───────────────────────────────────────────────────────────────

function dealRummy(playerList) {
  let deck = shuffleDeck(createDeck());
  const hands = {};
  let i = 0;
  for (const p of playerList) {
    hands[String(p.id)] = deck.slice(i, i + 7);
    i += 7;
  }
  deck = deck.slice(i);
  return {
    phase: 'playing',
    turnPhase: 'draw',   // 'draw' | 'play'
    deck,
    discardPile: [deck.shift()],
    hands,
    melds: [],           // [{ id, ownerName, cards }]
    meldCounter: 0,
    currentPlayerIndex: 0,
    players: playerList,
    winner: null,
  };
}

function doDrawDeck(state) {
  let { deck, discardPile } = state;
  if (deck.length === 0) {
    if (discardPile.length <= 1) return state;
    const top = discardPile[discardPile.length - 1];
    deck = shuffleDeck(discardPile.slice(0, -1));
    discardPile = [top];
  }
  const pid = String(state.players[state.currentPlayerIndex].id);
  const [drawn, ...rest] = deck;
  return {
    ...state, deck: rest, discardPile,
    hands: { ...state.hands, [pid]: [...state.hands[pid], drawn] },
    turnPhase: 'play',
  };
}

function doDrawDiscard(state) {
  if (state.discardPile.length === 0) return state;
  const pid = String(state.players[state.currentPlayerIndex].id);
  const top = state.discardPile[state.discardPile.length - 1];
  return {
    ...state,
    discardPile: state.discardPile.slice(0, -1),
    hands: { ...state.hands, [pid]: [...state.hands[pid], top] },
    turnPhase: 'play',
  };
}

function doMeld(state, pid, cardIds) {
  const hand = state.hands[pid] || [];
  const cards = cardIds.map((id) => hand.find((c) => c.id === id)).filter(Boolean);
  if (cards.length !== cardIds.length || !isValidMeld(cards)) return state;
  const newHand = hand.filter((c) => !cardIds.includes(c.id));
  const ownerName = state.players.find((p) => String(p.id) === pid)?.name || pid;
  const newMeld = { id: `m${state.meldCounter}`, ownerName, cards };
  const s = {
    ...state,
    hands: { ...state.hands, [pid]: newHand },
    melds: [...state.melds, newMeld],
    meldCounter: state.meldCounter + 1,
  };
  if (newHand.length === 0) {
    return { ...s, phase: 'results', winner: state.players.find((p) => String(p.id) === pid) };
  }
  return s;
}

function doDiscard(state, pid, cardId) {
  const hand = state.hands[pid] || [];
  const card = hand.find((c) => c.id === cardId);
  if (!card) return state;
  const newHand = hand.filter((c) => c.id !== cardId);
  const s = {
    ...state,
    hands: { ...state.hands, [pid]: newHand },
    discardPile: [...state.discardPile, card],
    currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
    turnPhase: 'draw',
  };
  if (newHand.length === 0) {
    return { ...s, phase: 'results', winner: state.players.find((p) => String(p.id) === pid) };
  }
  return s;
}

function toPublic(state) {
  return {
    phase: state.phase,
    turnPhase: state.turnPhase,
    discardTop: state.discardPile[state.discardPile.length - 1] ?? null,
    deckSize: state.deck.length,
    handSizes: Object.fromEntries(Object.entries(state.hands).map(([id, h]) => [id, h.length])),
    melds: state.melds,
    currentPlayerIndex: state.currentPlayerIndex,
    players: state.players,
    winner: state.winner,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RummyGameScreen({ navigation, route }) {
  const { role, myName, players: initialPlayers } = route.params;
  const isSinglePlayer = role === 'singleplayer';
  const isHost = role === 'host' || isSinglePlayer;

  const [gameState, setGameState] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const [selected, setSelected] = useState([]);
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

  function findBestMeld(hand) {
    for (let i = 0; i < hand.length - 3; i++)
      for (let j = i + 1; j < hand.length - 2; j++)
        for (let k = j + 1; k < hand.length - 1; k++)
          for (let l = k + 1; l < hand.length; l++) {
            const combo = [hand[i], hand[j], hand[k], hand[l]];
            if (isValidMeld(combo)) return combo;
          }
    for (let i = 0; i < hand.length - 2; i++)
      for (let j = i + 1; j < hand.length - 1; j++)
        for (let k = j + 1; k < hand.length; k++) {
          const combo = [hand[i], hand[j], hand[k]];
          if (isValidMeld(combo)) return combo;
        }
    return null;
  }

  function scheduleAI(state) {
    if (!isSinglePlayer || state.phase !== 'playing') return;
    const currentP = state.players[state.currentPlayerIndex];
    if (!currentP?.isAI) return;
    setTimeout(() => {
      const s = fullRef.current;
      if (!s || s.phase !== 'playing') return;
      const cp = s.players[s.currentPlayerIndex];
      if (!cp?.isAI) return;
      const aiPid = String(cp.id);
      let next;
      if (s.turnPhase === 'draw') {
        next = doDrawDeck(s);
      } else {
        const hand = s.hands[aiPid] || [];
        const meld = findBestMeld(hand);
        if (meld) {
          const afterMeld = doMeld(s, aiPid, meld.map(c => c.id));
          if (afterMeld.phase === 'results') { applyState(afterMeld); return; }
          const remaining = afterMeld.hands[aiPid] || [];
          next = remaining.length > 0
            ? doDiscard(afterMeld, aiPid, remaining[Math.floor(Math.random() * remaining.length)].id)
            : afterMeld;
        } else {
          next = doDiscard(s, aiPid, hand[Math.floor(Math.random() * hand.length)].id);
        }
      }
      if (next !== s) applyState(next);
    }, 900 + Math.random() * 600);
  }

  useEffect(() => {
    if (!isHost) return;
    applyState(dealRummy(initialPlayers));
    if (!isSinglePlayer) {
      setServerListeners({
        onMessage: (msg, clientId) => {
          const state = fullRef.current;
          if (!state || msg.type !== 'ACTION') return;
          const pid = String(clientId);
          if (state.players.findIndex((p) => p.id === clientId) !== state.currentPlayerIndex) return;
          let next = state;
          if (msg.action === 'drawDeck')    next = doDrawDeck(state);
          if (msg.action === 'drawDiscard') next = doDrawDiscard(state);
          if (msg.action === 'meld')        next = doMeld(state, pid, msg.cardIds);
          if (msg.action === 'discard')     next = doDiscard(state, pid, msg.cardId);
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
      if (!state || state.players.findIndex((p) => p.id === 'host') !== state.currentPlayerIndex) return;
      let next = state;
      if (action.action === 'drawDeck')    next = doDrawDeck(state);
      if (action.action === 'drawDiscard') next = doDrawDiscard(state);
      if (action.action === 'meld')        next = doMeld(state, 'host', action.cardIds);
      if (action.action === 'discard')     next = doDiscard(state, 'host', action.cardId);
      if (next !== state) { applyState(next); setSelected([]); }
    } else {
      sendToHost({ type: 'ACTION', ...action });
      setSelected([]);
    }
  }

  function toggleCard(id) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  if (!gameState) {
    return <View style={styles.loading}><Text style={styles.loadingText}>Dealing cards…</Text></View>;
  }

  const { phase, turnPhase, discardTop, deckSize, handSizes, melds, currentPlayerIndex, players, winner } = gameState;
  const myIndex = players.findIndex((p) => isHost ? p.id === 'host' : p.name === myName);
  const isMyTurn = currentPlayerIndex === myIndex;
  const currentPlayer = players[currentPlayerIndex];

  const selectedCards = myHand.filter((c) => selected.includes(c.id));
  const meldValid = selectedCards.length >= 3 && isValidMeld(selectedCards);
  const canDiscard = isMyTurn && turnPhase === 'play' && selected.length === 1;
  const canMeld = isMyTurn && turnPhase === 'play' && selectedCards.length >= 3;

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* Banner */}
      <View style={[styles.banner, phase === 'results' && styles.bannerResults]}>
        <Text style={styles.bannerText}>
          {phase === 'results'
            ? `🏆  ${winner?.name} wins!`
            : isMyTurn
            ? turnPhase === 'draw' ? '▶  Draw a card' : '▶  Meld or discard'
            : `Waiting for ${currentPlayer?.name}…`}
        </Text>
      </View>

      {/* Draw area */}
      <View style={styles.drawArea}>
        {/* Discard pile */}
        <View style={styles.pileSection}>
          <Text style={styles.pileLabel}>Discard</Text>
          {discardTop
            ? <Card rank={discardTop.rank} suit={discardTop.suit} />
            : <View style={styles.emptyPile}><Text style={styles.emptyPileText}>empty</Text></View>}
          {isMyTurn && turnPhase === 'draw' && discardTop && (
            <TouchableOpacity style={styles.takeBtn} onPress={() => act({ action: 'drawDiscard' })}>
              <Text style={styles.takeBtnText}>Take</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Draw pile */}
        <View style={styles.pileSection}>
          <Text style={styles.pileLabel}>Deck ({deckSize})</Text>
          <TouchableOpacity
            style={[styles.deckPile, isMyTurn && turnPhase === 'draw' && styles.deckPileActive]}
            onPress={() => isMyTurn && turnPhase === 'draw' && act({ action: 'drawDeck' })}
            disabled={!isMyTurn || turnPhase !== 'draw'}
          >
            <Text style={styles.deckPileText}>DRAW</Text>
          </TouchableOpacity>
        </View>

        {/* Other players hand sizes */}
        <View style={styles.opponentsCol}>
          {players.map((p, idx) => {
            if (idx === myIndex) return null;
            const isCurrent = idx === currentPlayerIndex;
            return (
              <View key={String(p.id)} style={[styles.opponentRow, isCurrent && styles.opponentRowActive]}>
                <Text style={styles.opponentName}>{p.name}</Text>
                <Text style={styles.opponentCards}>{handSizes[String(p.id)] ?? 0}🃏</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Melds on the table */}
      {melds.length > 0 && (
        <View style={styles.meldsSection}>
          <Text style={styles.sectionLabel}>On the Table</Text>
          {melds.map((meld) => (
            <View key={meld.id} style={styles.meldRow}>
              <Text style={styles.meldOwner}>{meld.ownerName}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.meldCards}>
                  {meld.cards.map((c) => (
                    <View key={c.id} style={styles.meldCardWrap}>
                      <Card rank={c.rank} suit={c.suit} />
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          ))}
        </View>
      )}

      {/* My hand */}
      <View style={styles.mySection}>
        <View style={styles.handHeader}>
          <Text style={styles.myLabel}>Your Hand ({orderedHand.length})</Text>
          <TouchableOpacity
            style={[styles.sortBtn, sortMode && styles.sortBtnActive]}
            onPress={() => { setSortMode(m => !m); setMoveFrom(null); setSelected([]); }}
          >
            <Text style={styles.sortBtnText}>{sortMode ? 'Done ✓' : '⇄ Sort'}</Text>
          </TouchableOpacity>
        </View>
        {sortMode
          ? <Text style={styles.sortHint}>{moveFrom === null ? 'Tap a card to pick it up' : 'Tap another card to move it there'}</Text>
          : isMyTurn && turnPhase === 'play' && <Text style={styles.myHint}>Tap cards to select → Meld (3+) or Discard (1)</Text>
        }
        <View style={styles.handRow}>
          {orderedHand.map((card, idx) => {
            const isSel = !sortMode && selected.includes(card.id);
            const isMoving = sortMode && moveFrom === idx;
            return (
              <TouchableOpacity
                key={card.id}
                onPress={() => {
                  if (sortMode) { handleSortTap(idx); return; }
                  if (isMyTurn && turnPhase === 'play') toggleCard(card.id);
                }}
                style={[
                  styles.cardWrap,
                  isMoving && styles.cardMoving,
                  isSel && styles.cardSelected,
                  !sortMode && (!isMyTurn || turnPhase === 'draw') && styles.cardDim,
                ]}
              >
                <Card rank={card.rank} suit={card.suit} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Action buttons */}
      {isMyTurn && turnPhase === 'play' && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.meldBtn, !meldValid && styles.actionBtnDimmed]}
            onPress={() => meldValid && act({ action: 'meld', cardIds: selected })}
            disabled={!meldValid}
          >
            <Text style={styles.actionBtnText}>
              {canMeld && !meldValid ? 'Invalid meld' : `Meld (${selected.length})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.discardBtn, !canDiscard && styles.actionBtnDimmed]}
            onPress={() => canDiscard && act({ action: 'discard', cardId: selected[0] })}
            disabled={!canDiscard}
          >
            <Text style={styles.actionBtnText}>Discard</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results */}
      {phase === 'results' && isHost && (
        <TouchableOpacity style={styles.playAgainBtn} onPress={() => { applyState(dealRummy(initialPlayers)); setSelected([]); }}>
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
  loading: { flex: 1, backgroundColor: '#0e1a2e', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#fff', fontSize: 18 },
  container: { flexGrow: 1, backgroundColor: '#0e1a2e', padding: 14, paddingBottom: 40 },

  banner: { backgroundColor: '#e94560', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 12 },
  bannerResults: { backgroundColor: '#1a1a2e' },
  bannerText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  drawArea: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  pileSection: { alignItems: 'center', gap: 6 },
  pileLabel: { color: '#b0b0c0', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  emptyPile: { width: 72, height: 100, backgroundColor: '#16213e', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  emptyPileText: { color: '#444', fontSize: 12 },
  takeBtn: { backgroundColor: '#4caf50', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 6 },
  takeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  deckPile: {
    width: 72, height: 100, backgroundColor: '#16213e',
    borderRadius: 8, borderWidth: 2, borderColor: '#334',
    alignItems: 'center', justifyContent: 'center',
  },
  deckPileActive: { borderColor: '#ffd700', backgroundColor: '#1a2a1a' },
  deckPileText: { color: '#888', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  opponentsCol: { flex: 1, gap: 6 },
  opponentRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#16213e', borderRadius: 8, padding: 10,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  opponentRowActive: { borderColor: '#ffd700' },
  opponentName: { color: '#fff', fontSize: 14 },
  opponentCards: { color: '#b0b0c0', fontSize: 14 },

  sectionLabel: { color: '#b0b0c0', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },

  meldsSection: { marginBottom: 14 },
  meldRow: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 10, marginBottom: 8 },
  meldOwner: { color: '#b0b0c0', fontSize: 12, marginBottom: 6 },
  meldCards: { flexDirection: 'row', gap: 4 },
  meldCardWrap: { transform: [{ scale: 0.85 }] },

  mySection: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, marginBottom: 12 },
  handHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  myLabel: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  myHint: { color: '#888', fontSize: 12, marginBottom: 10 },
  sortBtn: { backgroundColor: '#16213e', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#334' },
  sortBtnActive: { backgroundColor: '#e94560', borderColor: '#e94560' },
  sortBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  sortHint: { color: '#888', fontSize: 12, marginBottom: 8 },
  handRow: { flexDirection: 'row', flexWrap: 'wrap' },
  cardWrap: { borderRadius: 6 },
  cardMoving: { transform: [{ translateY: -10 }], shadowColor: '#00ccff', shadowOpacity: 0.9, shadowRadius: 10, elevation: 10 },
  cardSelected: { transform: [{ translateY: -10 }], shadowColor: '#ffd700', shadowOpacity: 0.9, shadowRadius: 10, elevation: 10 },
  cardDim: { opacity: 0.5 },

  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  meldBtn: { backgroundColor: '#4caf50' },
  discardBtn: { backgroundColor: '#2980b9' },
  actionBtnDimmed: { opacity: 0.35 },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  playAgainBtn: { backgroundColor: '#e94560', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  playAgainText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  waitText: { color: '#aaa', textAlign: 'center', fontSize: 14, marginTop: 8 },
});
