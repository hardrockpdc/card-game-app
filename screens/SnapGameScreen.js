import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { createDeck, shuffleDeck } from '../game/deck';
import Card from '../components/Card';
import {
  setServerListeners, broadcastToClients,
  setClientListeners, sendToHost,
} from '../game/GameNetwork';

const SNAP_WINDOW_MS = 5000;

// ─── Game logic ───────────────────────────────────────────────────────────────

function dealSnap(playerList) {
  return {
    phase: 'playing',   // 'playing' | 'snapWindow' | 'results'
    deck: shuffleDeck(createDeck()),
    centerCards: [],
    scores: Object.fromEntries(playerList.map((p) => [String(p.id), 0])),
    currentPlayerIndex: 0,
    lastSnap: null,
    players: playerList,
    winner: null,
  };
}

function doFlip(state) {
  if (state.phase !== 'playing' || state.deck.length === 0) {
    // Deck empty → end game
    const maxScore = Math.max(...Object.values(state.scores), 0);
    const winnerId = Object.entries(state.scores).find(([, s]) => s === maxScore)?.[0];
    return { ...state, phase: 'results', winner: state.players.find((p) => String(p.id) === winnerId) };
  }
  const [flipped, ...rest] = state.deck;
  const newCenter = [...state.centerCards, flipped];
  const isMatch = newCenter.length >= 2 &&
    newCenter[newCenter.length - 1].rank === newCenter[newCenter.length - 2].rank;
  const nextIdx = (state.currentPlayerIndex + 1) % state.players.length;
  return {
    ...state,
    deck: rest,
    centerCards: newCenter,
    phase: isMatch ? 'snapWindow' : 'playing',
    currentPlayerIndex: isMatch ? state.currentPlayerIndex : nextIdx,
    lastSnap: null,
  };
}

function doSnap(state, pid) {
  if (state.phase !== 'snapWindow') return state;
  const winnerPlayer = state.players.find((p) => String(p.id) === pid);
  const newScores = { ...state.scores, [pid]: (state.scores[pid] || 0) + 1 };
  const nextIdx = (state.currentPlayerIndex + 1) % state.players.length;
  return {
    ...state,
    phase: state.deck.length === 0 ? 'results' : 'playing',
    winner: state.deck.length === 0 ? winnerPlayer : null,
    centerCards: [],
    scores: newScores,
    currentPlayerIndex: nextIdx,
    lastSnap: { winnerName: winnerPlayer?.name, count: state.centerCards.length },
  };
}

function doTimeout(state) {
  if (state.phase !== 'snapWindow') return state;
  const nextIdx = (state.currentPlayerIndex + 1) % state.players.length;
  return { ...state, phase: 'playing', currentPlayerIndex: nextIdx };
}

function toPublic(state) {
  return {
    phase: state.phase,
    deckSize: state.deck.length,
    centerTop: state.centerCards[state.centerCards.length - 1] ?? null,
    centerPrev: state.centerCards[state.centerCards.length - 2] ?? null,
    scores: state.scores,
    currentPlayerIndex: state.currentPlayerIndex,
    lastSnap: state.lastSnap,
    players: state.players,
    winner: state.winner,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SnapGameScreen({ navigation, route }) {
  const { role, myName, players: initialPlayers } = route.params;
  const isSinglePlayer = role === 'singleplayer';
  const isHost = role === 'host' || isSinglePlayer;

  const [gameState, setGameState] = useState(null);
  const fullRef = useRef(null);
  const timerRef = useRef(null);

  function applyState(next) {
    fullRef.current = next;
    setGameState(toPublic(next));
    if (!isSinglePlayer) broadcastToClients({ type: 'GAME_STATE', ...toPublic(next) });
    scheduleAI(next);
  }

  function scheduleAI(state) {
    if (!isSinglePlayer) return;
    if (state.phase === 'snapWindow') {
      const aiPlayers = state.players.filter(p => p.isAI);
      if (aiPlayers.length === 0) return;
      setTimeout(() => {
        const s = fullRef.current;
        if (s?.phase !== 'snapWindow') return;
        clearTimeout(timerRef.current);
        applyState(doSnap(s, String(aiPlayers[0].id)));
      }, 1000 + Math.random() * 2000);
      return;
    }
    if (state.phase !== 'playing') return;
    const currentP = state.players[state.currentPlayerIndex];
    if (!currentP?.isAI) return;
    setTimeout(() => {
      const s = fullRef.current;
      if (!s || s.phase !== 'playing') return;
      if (!s.players[s.currentPlayerIndex]?.isAI) return;
      const next = doFlip(s);
      if (next !== s) {
        applyState(next);
        if (next.phase === 'snapWindow') startSnapTimer();
      }
    }, 700 + Math.random() * 600);
  }

  function startSnapTimer() {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const state = fullRef.current;
      if (state?.phase === 'snapWindow') applyState(doTimeout(state));
    }, SNAP_WINDOW_MS);
  }

  useEffect(() => {
    if (!isHost) return;
    applyState(dealSnap(initialPlayers));
    if (!isSinglePlayer) {
      setServerListeners({
        onMessage: (msg, clientId) => {
          const state = fullRef.current;
          if (!state || msg.type !== 'ACTION') return;
          if (msg.action === 'flip') {
            if (state.players.findIndex((p) => p.id === clientId) !== state.currentPlayerIndex) return;
            if (state.phase !== 'playing') return;
            const next = doFlip(state);
            applyState(next);
            if (next.phase === 'snapWindow') startSnapTimer();
          } else if (msg.action === 'snap') {
            if (state.phase !== 'snapWindow') return;
            clearTimeout(timerRef.current);
            applyState(doSnap(state, String(clientId)));
          }
        },
      });
    }
    return () => clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (isHost) return;
    setClientListeners({
      onMessage: (msg) => { if (msg.type === 'GAME_STATE') setGameState(msg); },
      onDisconnected: () =>
        Alert.alert('Disconnected', 'Lost connection.', [
          { text: 'OK', onPress: () => navigation.navigate('Home') },
        ]),
    });
  }, []);

  function handleFlip() {
    if (isHost) {
      const state = fullRef.current;
      if (!state || state.phase !== 'playing') return;
      if (state.players.findIndex((p) => p.id === 'host') !== state.currentPlayerIndex) return;
      const next = doFlip(state);
      applyState(next);
      if (next.phase === 'snapWindow') startSnapTimer();
    } else {
      sendToHost({ type: 'ACTION', action: 'flip' });
    }
  }

  function handleSnap() {
    if (isHost) {
      const state = fullRef.current;
      if (!state || state.phase !== 'snapWindow') return;
      clearTimeout(timerRef.current);
      applyState(doSnap(state, 'host'));
    } else {
      sendToHost({ type: 'ACTION', action: 'snap' });
    }
  }

  if (!gameState) {
    return <View style={styles.loading}><Text style={styles.loadingText}>Shuffling…</Text></View>;
  }

  const { phase, deckSize, centerTop, centerPrev, scores, currentPlayerIndex, lastSnap, players, winner } = gameState;
  const myIndex = players.findIndex((p) => isHost ? p.id === 'host' : p.name === myName);
  const isMyTurn = currentPlayerIndex === myIndex;
  const isSnapWindow = phase === 'snapWindow';
  const currentPlayer = players[currentPlayerIndex];

  return (
    <View style={[styles.container, isSnapWindow && styles.containerSnap]}>

      {/* Banner */}
      <View style={[styles.banner, isSnapWindow && styles.bannerSnap, phase === 'results' && styles.bannerResults]}>
        <Text style={styles.bannerText}>
          {phase === 'results'
            ? `🏆  ${winner?.name} wins!`
            : isSnapWindow
            ? '⚡  SNAP WINDOW! ⚡'
            : isMyTurn
            ? '▶  Your turn — Flip!'
            : `${currentPlayer?.name}'s turn…`}
        </Text>
      </View>

      {/* Last snap result */}
      {lastSnap && (
        <View style={styles.lastSnapBox}>
          <Text style={styles.lastSnapText}>
            🎉 {lastSnap.winnerName} snapped {lastSnap.count} card{lastSnap.count !== 1 ? 's' : ''}!
          </Text>
        </View>
      )}

      {/* Center pile */}
      <View style={styles.centerArea}>
        <View style={styles.cardStack}>
          {centerPrev && (
            <View style={styles.prevCardWrap}>
              <Card rank={centerPrev.rank} suit={centerPrev.suit} />
            </View>
          )}
          {centerTop && (
            <View style={styles.topCardWrap}>
              <Card rank={centerTop.rank} suit={centerTop.suit} />
            </View>
          )}
          {!centerTop && (
            <View style={styles.emptyPile}>
              <Text style={styles.emptyPileText}>No cards yet</Text>
            </View>
          )}
        </View>
        <Text style={styles.deckCount}>Deck: {deckSize} cards left</Text>
      </View>

      {/* SNAP button */}
      {isSnapWindow && (
        <TouchableOpacity style={styles.snapBtn} onPress={handleSnap}>
          <Text style={styles.snapBtnText}>👋  SNAP!</Text>
        </TouchableOpacity>
      )}

      {/* FLIP button */}
      {phase === 'playing' && isMyTurn && (
        <TouchableOpacity style={styles.flipBtn} onPress={handleFlip}>
          <Text style={styles.flipBtnText}>Flip a Card ▶</Text>
        </TouchableOpacity>
      )}
      {phase === 'playing' && !isMyTurn && (
        <View style={styles.waitBox}>
          <Text style={styles.waitBoxText}>Waiting for {currentPlayer?.name} to flip…</Text>
        </View>
      )}

      {/* Scores */}
      <View style={styles.scoresBox}>
        <Text style={styles.scoresTitle}>Snaps Won</Text>
        {players.map((p, idx) => (
          <View key={String(p.id)} style={[styles.scoreRow, idx === currentPlayerIndex && phase === 'playing' && styles.scoreRowActive]}>
            <Text style={styles.scoreName}>{p.name}{idx === myIndex ? ' (you)' : ''}</Text>
            <Text style={styles.scoreVal}>{scores[String(p.id)] ?? 0}</Text>
          </View>
        ))}
      </View>

      {phase === 'results' && isHost && (
        <TouchableOpacity style={styles.playAgainBtn} onPress={() => applyState(dealSnap(initialPlayers))}>
          <Text style={styles.playAgainText}>🔄  Play Again</Text>
        </TouchableOpacity>
      )}
      {phase === 'results' && !isHost && (
        <Text style={styles.waitText}>Waiting for host…</Text>
      )}

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#fff', fontSize: 18 },
  container: { flex: 1, backgroundColor: '#1a1a2e', padding: 14 },
  containerSnap: { backgroundColor: '#3d0505' },

  banner: { backgroundColor: '#e94560', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 10 },
  bannerSnap: { backgroundColor: '#cc0000' },
  bannerResults: { backgroundColor: '#0d3d2e' },
  bannerText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  lastSnapBox: { backgroundColor: '#0d3d2e', borderRadius: 8, padding: 10, marginBottom: 10 },
  lastSnapText: { color: '#4caf50', fontSize: 14, textAlign: 'center', fontWeight: 'bold' },

  centerArea: { alignItems: 'center', marginVertical: 20 },
  cardStack: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  prevCardWrap: { opacity: 0.55, marginRight: -24, zIndex: 0 },
  topCardWrap: { zIndex: 1 },
  emptyPile: {
    width: 80, height: 112, backgroundColor: '#16213e',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#334', borderStyle: 'dashed',
  },
  emptyPileText: { color: '#444', fontSize: 12 },
  deckCount: { color: '#b0b0c0', fontSize: 13, marginTop: 4 },

  snapBtn: {
    backgroundColor: '#cc0000', borderRadius: 16, paddingVertical: 28,
    alignItems: 'center', marginBottom: 16,
    shadowColor: '#ff0000', shadowOpacity: 0.9, shadowRadius: 24, elevation: 24,
  },
  snapBtnText: { color: '#fff', fontSize: 36, fontWeight: 'bold', letterSpacing: 2 },

  flipBtn: {
    backgroundColor: '#e94560', borderRadius: 10, paddingVertical: 20,
    alignItems: 'center', marginBottom: 14,
  },
  flipBtnText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },

  waitBox: {
    backgroundColor: '#16213e', borderRadius: 10, paddingVertical: 18,
    alignItems: 'center', marginBottom: 14,
  },
  waitBoxText: { color: '#b0b0c0', fontSize: 15 },

  scoresBox: { backgroundColor: '#16213e', borderRadius: 12, padding: 14, marginTop: 'auto' },
  scoresTitle: { color: '#b0b0c0', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 4 },
  scoreRowActive: { backgroundColor: 'rgba(233,69,96,0.1)', borderRadius: 6 },
  scoreName: { color: '#fff', fontSize: 16 },
  scoreVal: { color: '#e94560', fontSize: 18, fontWeight: 'bold' },

  playAgainBtn: { backgroundColor: '#e94560', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  playAgainText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  waitText: { color: '#aaa', textAlign: 'center', fontSize: 14, marginTop: 12 },
});
