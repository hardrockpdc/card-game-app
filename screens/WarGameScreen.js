import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { createDeck, shuffleDeck } from '../game/deck';
import Card from '../components/Card';
import {
  setServerListeners, broadcastToClients,
  setClientListeners, sendToHost,
} from '../game/GameNetwork';

// ─── Game logic ───────────────────────────────────────────────────────────────

const RANK_VALUE = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };

function dealWar(playerList) {
  const deck = shuffleDeck(createDeck());
  const perPlayer = Math.floor(52 / playerList.length);
  const playerDecks = {};
  playerList.forEach((p, i) => {
    playerDecks[String(p.id)] = deck.slice(i * perPlayer, (i + 1) * perPlayer);
  });
  return {
    phase: 'playing',   // 'playing' | 'results'
    round: 0,
    totalRounds: perPlayer,
    currentCards: null, // { [pid]: card }
    roundWinner: null,  // player object
    scores: Object.fromEntries(playerList.map((p) => [String(p.id), 0])),
    playerDecks,
    players: playerList,
    winner: null,
  };
}

function doNextRound(state) {
  const newDecks = {};
  const currentCards = {};
  for (const p of state.players) {
    const pid = String(p.id);
    const deck = [...state.playerDecks[pid]];
    if (deck.length > 0) {
      currentCards[pid] = deck.shift();
      newDecks[pid] = deck;
    } else {
      currentCards[pid] = null;
      newDecks[pid] = [];
    }
  }

  // Find highest card
  let maxVal = -1;
  let winnerId = null;
  for (const [pid, card] of Object.entries(currentCards)) {
    if (!card) continue;
    const val = RANK_VALUE[card.rank];
    if (val > maxVal) { maxVal = val; winnerId = pid; }
  }

  const newScores = { ...state.scores };
  if (winnerId) newScores[winnerId]++;

  const newRound = state.round + 1;
  const roundWinner = winnerId ? state.players.find((p) => String(p.id) === winnerId) : null;

  if (newRound >= state.totalRounds) {
    const topScore = Math.max(...Object.values(newScores));
    const winnerEntry = Object.entries(newScores).find(([, v]) => v === topScore);
    const winner = state.players.find((p) => String(p.id) === winnerEntry[0]);
    return { ...state, phase: 'results', round: newRound, currentCards, scores: newScores, playerDecks: newDecks, roundWinner, winner };
  }

  return { ...state, round: newRound, currentCards, scores: newScores, playerDecks: newDecks, roundWinner };
}

function toBroadcast(state) {
  const { playerDecks, ...rest } = state;
  return rest;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WarGameScreen({ navigation, route }) {
  const { role, myName, players: initialPlayers } = route.params;
  const isSinglePlayer = role === 'singleplayer';
  const isHost = role === 'host' || isSinglePlayer;

  const [gameState, setGameState] = useState(null);
  const stateRef = useRef(null);

  function applyState(next) {
    stateRef.current = next;
    setGameState(toBroadcast(next));
    if (!isSinglePlayer) broadcastToClients({ type: 'GAME_STATE', ...toBroadcast(next) });
  }

  useEffect(() => {
    if (!isHost) return;
    applyState(dealWar(initialPlayers));
    if (!isSinglePlayer) {
      setServerListeners({
        onMessage: (msg) => {
          if (msg.type === 'ACTION' && msg.action === 'nextRound') {
            const state = stateRef.current;
            if (state?.phase === 'playing') applyState(doNextRound(state));
          }
        },
      });
    }
  }, []);

  useEffect(() => {
    if (isHost) return;
    setClientListeners({
      onMessage: (msg) => { if (msg.type === 'GAME_STATE') setGameState(msg); },
      onDisconnected: () =>
        Alert.alert('Disconnected', 'Lost connection to the host.', [
          { text: 'OK', onPress: () => navigation.navigate('Home') },
        ]),
    });
  }, []);

  function handleNextRound() {
    if (isHost) {
      const state = stateRef.current;
      if (state?.phase === 'playing') applyState(doNextRound(state));
    } else {
      sendToHost({ type: 'ACTION', action: 'nextRound' });
    }
  }

  if (!gameState) {
    return <View style={styles.loading}><Text style={styles.loadingText}>Dealing cards…</Text></View>;
  }

  const { phase, round, totalRounds, currentCards, roundWinner, scores, players, winner } = gameState;
  const myPlayer = players.find((p) => isHost ? p.id === 'host' : p.name === myName);

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* Banner */}
      <View style={[styles.banner, phase === 'results' && styles.bannerResults]}>
        <Text style={styles.bannerText}>
          {phase === 'results'
            ? `🏆  ${winner?.name} wins the war!`
            : currentCards
            ? roundWinner ? `${roundWinner.name} wins round ${round}!` : `Round ${round} — Tie!`
            : `Round ${round + 1} of ${totalRounds}`}
        </Text>
      </View>

      {/* Flipped cards */}
      {currentCards && (
        <View style={styles.cardsRow}>
          {players.map((p) => {
            const card = currentCards[String(p.id)];
            const isWinner = roundWinner && String(p.id) === String(roundWinner.id);
            return (
              <View key={String(p.id)} style={[styles.playerCard, isWinner && styles.playerCardWin]}>
                <Text style={styles.playerCardName}>{p.name}</Text>
                {card ? <Card rank={card.rank} suit={card.suit} /> : <View style={styles.emptyCard} />}
                {isWinner && <Text style={styles.winStar}>⭐</Text>}
              </View>
            );
          })}
        </View>
      )}

      {/* Scores */}
      <View style={styles.scoresBox}>
        <Text style={styles.scoresTitle}>Scores</Text>
        {players.map((p) => (
          <View key={String(p.id)} style={styles.scoreRow}>
            <Text style={styles.scoreName}>{p.name}{p.id === myPlayer?.id ? ' (you)' : ''}</Text>
            <Text style={styles.scoreValue}>{scores[String(p.id)]} pts</Text>
          </View>
        ))}
      </View>

      {/* Buttons */}
      {phase === 'playing' && (
        <TouchableOpacity style={styles.nextBtn} onPress={handleNextRound}>
          <Text style={styles.nextBtnText}>{currentCards ? 'Next Round →' : 'Flip Cards ▶'}</Text>
        </TouchableOpacity>
      )}
      {phase === 'results' && isHost && (
        <TouchableOpacity style={styles.nextBtn} onPress={() => applyState(dealWar(initialPlayers))}>
          <Text style={styles.nextBtnText}>🔄  Play Again</Text>
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
  loading: { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#fff', fontSize: 18 },
  container: { flexGrow: 1, backgroundColor: '#1a1a2e', padding: 14, paddingBottom: 40 },

  banner: { backgroundColor: '#e94560', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 16 },
  bannerResults: { backgroundColor: '#2a1a0e' },
  bannerText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 16 },
  playerCard: {
    alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: 'transparent',
  },
  playerCardWin: { borderColor: '#ffd700', backgroundColor: 'rgba(255,215,0,0.1)' },
  playerCardName: { color: '#ccc', fontSize: 13, marginBottom: 8 },
  emptyCard: { width: 72, height: 100, backgroundColor: '#333', borderRadius: 8 },
  winStar: { fontSize: 20, marginTop: 6 },

  scoresBox: { backgroundColor: '#16213e', borderRadius: 12, padding: 16, marginBottom: 16 },
  scoresTitle: { color: '#b0b0c0', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  scoreName: { color: '#fff', fontSize: 16 },
  scoreValue: { color: '#e94560', fontSize: 16, fontWeight: 'bold' },

  nextBtn: { backgroundColor: '#e94560', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  waitText: { color: '#aaa', textAlign: 'center', fontSize: 14, marginTop: 8 },
});
