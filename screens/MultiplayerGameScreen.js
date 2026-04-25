import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { createDeck, shuffleDeck, calculateHandValue } from '../game/deck';
import Card from '../components/Card';
import {
  setServerListeners,
  broadcastToClients,
  setClientListeners,
  sendToHost,
} from '../game/GameNetwork';

// ─── Pure game-logic helpers (no React, easy to test) ────────────────────────

function dealCards(playerList) {
  const deck = shuffleDeck(createDeck());
  const n = playerList.length;

  // Standard interleaved deal: p1, p2, …, dealer, p1, p2, …, dealer
  const players = playerList.map((p, i) => ({
    id: p.id,
    name: p.name,
    hand: [deck[i], deck[n + 1 + i]],
    status: 'playing', // 'playing' | 'stand' | 'bust'
    result: '',        // '' | 'win' | 'lose' | 'push'
  }));

  const dealer = {
    hand: [deck[n], deck[n * 2 + 1]],
    status: 'playing',
  };

  return {
    deck: deck.slice(n * 2 + 2),
    phase: 'playing', // 'playing' | 'results'
    currentPlayerIndex: 0,
    players,
    dealer,
  };
}

function doHit(state, playerIndex) {
  const [card, ...rest] = state.deck;
  const newHand = [...state.players[playerIndex].hand, card];
  const bust = calculateHandValue(newHand) > 21;

  const players = state.players.map((p, i) =>
    i === playerIndex ? { ...p, hand: newHand, status: bust ? 'bust' : 'playing' } : p
  );

  const updated = { ...state, deck: rest, players };
  return bust ? advanceTurn(updated) : updated;
}

function doStand(state, playerIndex) {
  const players = state.players.map((p, i) =>
    i === playerIndex ? { ...p, status: 'stand' } : p
  );
  return advanceTurn({ ...state, players });
}

function advanceTurn(state) {
  let nextIdx = state.currentPlayerIndex + 1;
  while (nextIdx < state.players.length && state.players[nextIdx].status !== 'playing') {
    nextIdx++;
  }
  if (nextIdx >= state.players.length) return runDealer(state);
  return { ...state, currentPlayerIndex: nextIdx };
}

function runDealer(state) {
  let hand = [...state.dealer.hand];
  let deck = [...state.deck];

  while (calculateHandValue(hand) < 17) hand.push(deck.shift());

  const dealerValue = calculateHandValue(hand);
  const dealerBust = dealerValue > 21;

  const players = state.players.map((p) => {
    if (p.status === 'bust') return { ...p, result: 'lose' };
    const pv = calculateHandValue(p.hand);
    if (dealerBust || pv > dealerValue) return { ...p, result: 'win' };
    if (pv < dealerValue) return { ...p, result: 'lose' };
    return { ...p, result: 'push' };
  });

  return {
    ...state,
    deck,
    phase: 'results',
    currentPlayerIndex: -1,
    dealer: { hand, status: dealerBust ? 'bust' : 'stand' },
    players,
  };
}

// Strip the deck and hide dealer hole card for the broadcast to clients
function toBroadcast(state) {
  return {
    phase: state.phase,
    currentPlayerIndex: state.currentPlayerIndex,
    players: state.players,
    dealer: {
      hand: state.dealer.hand.map((c, i) =>
        i === 1 && state.phase === 'playing' ? { id: 'hidden', hidden: true } : c
      ),
      status: state.dealer.status,
    },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MultiplayerGameScreen({ navigation, route }) {
  const { role, myName, players: initialPlayers } = route.params;
  const isHost = role === 'host';

  const [gameState, setGameState] = useState(null);
  // stateRef lets network callbacks always read the latest state without stale closures
  const stateRef = useRef(null);

  function applyState(newState) {
    stateRef.current = newState;
    setGameState(newState);
    if (isHost) {
      broadcastToClients({ type: 'GAME_STATE', ...toBroadcast(newState) });
    }
  }

  // ── Host: deal cards and listen for client actions ──
  useEffect(() => {
    if (!isHost) return;

    applyState(dealCards(initialPlayers));

    setServerListeners({
      onMessage: (msg, clientId) => {
        if (msg.type !== 'ACTION') return;
        const state = stateRef.current;
        if (!state || state.phase !== 'playing') return;

        const idx = state.players.findIndex((p) => p.id === clientId);
        if (idx !== state.currentPlayerIndex) return; // not their turn

        applyState(msg.action === 'hit' ? doHit(state, idx) : doStand(state, idx));
      },
      onClientLeft: ({ id }) => {
        // Auto-stand a disconnected player so the game can continue
        const state = stateRef.current;
        if (!state || state.phase !== 'playing') return;
        const idx = state.players.findIndex((p) => p.id === id);
        if (idx === -1) return;
        applyState(doStand(state, idx));
      },
    });
  }, []);

  // ── Client: listen for game state updates from host ──
  useEffect(() => {
    if (isHost) return;

    setClientListeners({
      onMessage: (msg) => {
        if (msg.type === 'GAME_STATE') setGameState(msg);
      },
      onDisconnected: () => {
        Alert.alert('Disconnected', 'Lost connection to the host.', [
          { text: 'OK', onPress: () => navigation.navigate('Home') },
        ]);
      },
    });
  }, []);

  // ── Actions ──
  function handleAction(action) {
    if (isHost) {
      const state = stateRef.current;
      if (!state || state.phase !== 'playing') return;
      const myIdx = state.players.findIndex((p) => p.id === 'host');
      if (state.currentPlayerIndex !== myIdx) return;
      applyState(action === 'hit' ? doHit(state, myIdx) : doStand(state, myIdx));
    } else {
      sendToHost({ type: 'ACTION', action });
    }
  }

  function handlePlayAgain() {
    applyState(dealCards(initialPlayers));
  }

  // ── Loading state ──
  if (!gameState) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Dealing cards…</Text>
      </View>
    );
  }

  const { phase, currentPlayerIndex, players, dealer } = gameState;

  // Find "me" in the players array
  const myIndex = players.findIndex((p) => (isHost ? p.id === 'host' : p.name === myName));
  const isMyTurn = phase === 'playing' && currentPlayerIndex === myIndex;
  const showFullDealer = phase === 'results';
  const currentPlayer = currentPlayerIndex >= 0 ? players[currentPlayerIndex] : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* Turn / phase banner */}
      <View style={[styles.banner, phase === 'results' && styles.bannerResults]}>
        <Text style={styles.bannerText}>
          {phase === 'results'
            ? 'Game Over'
            : isMyTurn
            ? '▶  Your turn'
            : `Waiting for ${currentPlayer?.name}…`}
        </Text>
      </View>

      {/* Dealer */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionName}>Dealer</Text>
          <Text style={styles.sectionValue}>
            {showFullDealer
              ? `= ${calculateHandValue(dealer.hand)}`
              : dealer.hand.length > 0 && !dealer.hand[0].hidden
              ? `shows ${calculateHandValue([dealer.hand[0]])}`
              : ''}
          </Text>
          {showFullDealer && dealer.status === 'bust' && (
            <Text style={styles.labelBust}>BUST</Text>
          )}
        </View>
        <View style={styles.handRow}>
          {dealer.hand.map((card) => (
            <Card key={card.id} rank={card.rank} suit={card.suit} faceDown={!!card.hidden} />
          ))}
        </View>
      </View>

      {/* All players */}
      {players.map((player, index) => {
        const isMe = index === myIndex;
        const isCurrent = index === currentPlayerIndex && phase === 'playing';
        const handValue = calculateHandValue(player.hand);
        const resultColor =
          player.result === 'win' ? '#4caf50' :
          player.result === 'lose' ? '#e94560' : '#ffd700';

        return (
          <View key={String(player.id)} style={[styles.section, isCurrent && styles.sectionActive]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionName}>
                {player.name}{isMe ? ' (you)' : ''}
              </Text>
              <Text style={styles.sectionValue}>= {handValue}</Text>
              {phase === 'playing' && player.status === 'bust' && (
                <Text style={styles.labelBust}>BUST</Text>
              )}
              {phase === 'playing' && player.status === 'stand' && (
                <Text style={styles.labelStand}>STAND</Text>
              )}
              {phase === 'results' && player.result !== '' && (
                <Text style={[styles.labelResult, { color: resultColor }]}>
                  {player.result === 'win' ? '✓ WIN' : player.result === 'lose' ? '✗ LOSE' : '~ TIE'}
                </Text>
              )}
            </View>

            <View style={styles.handRow}>
              {player.hand.map((card) => (
                <Card key={card.id} rank={card.rank} suit={card.suit} />
              ))}
            </View>

            {/* Hit / Stand — only for the active player on their turn */}
            {isMe && isMyTurn && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.hitBtn]}
                  onPress={() => handleAction('hit')}
                >
                  <Text style={styles.actionBtnText}>Hit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.standBtn]}
                  onPress={() => handleAction('stand')}
                >
                  <Text style={styles.actionBtnText}>Stand</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      {/* Play Again — host only, after results */}
      {phase === 'results' && isHost && (
        <TouchableOpacity style={styles.playAgainBtn} onPress={handlePlayAgain}>
          <Text style={styles.playAgainText}>🔄  Play Again</Text>
        </TouchableOpacity>
      )}
      {phase === 'results' && !isHost && (
        <Text style={styles.waitText}>Waiting for host to deal a new hand…</Text>
      )}

    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#0d5c2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: '#fff', fontSize: 18 },

  container: {
    flexGrow: 1,
    backgroundColor: '#0d5c2e',
    padding: 14,
    paddingBottom: 40,
  },

  banner: {
    backgroundColor: '#e94560',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  bannerResults: { backgroundColor: '#1a1a2e' },
  bannerText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  section: {
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  sectionActive: {
    borderColor: '#ffd700',
    backgroundColor: 'rgba(255,215,0,0.08)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sectionName: { color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1 },
  sectionValue: { color: '#ccc', fontSize: 14 },

  labelBust:   { color: '#e94560', fontWeight: 'bold', fontSize: 13 },
  labelStand:  { color: '#999',    fontWeight: 'bold', fontSize: 13 },
  labelResult: { fontWeight: 'bold', fontSize: 15 },

  handRow: { flexDirection: 'row', flexWrap: 'wrap' },

  actionRow: { flexDirection: 'row', marginTop: 12, gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  hitBtn:   { backgroundColor: '#e94560' },
  standBtn: { backgroundColor: '#2980b9' },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  playAgainBtn: {
    backgroundColor: '#e94560',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  playAgainText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  waitText: { color: '#aaa', textAlign: 'center', fontSize: 14, marginTop: 8 },
});
