import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView,
} from 'react-native';

const GAMES = [
  { id: 'blackjack',   label: 'Blackjack',  screen: 'Game',            aiRange: [0, 0] },
  { id: 'crazyEights', label: 'Crazy 8s',   screen: 'CrazyEightsGame', aiRange: [1, 3] },
  { id: 'war',         label: 'War',         screen: 'WarGame',         aiRange: [1, 3] },
  { id: 'goFish',      label: 'Go Fish',     screen: 'GoFishGame',      aiRange: [1, 3] },
  { id: 'conquian',    label: 'Conquián',    screen: 'ConquianGame',    aiRange: [1, 3] },
  { id: 'snap',        label: 'Snap',        screen: 'SnapGame',        aiRange: [1, 1] },
  { id: 'poker',       label: 'Poker',       screen: 'PokerGame',       aiRange: [1, 3] },
];

export default function SinglePlayerSetupScreen({ navigation }) {
  const [name, setName]   = useState('');
  const [gameId, setGameId] = useState('crazyEights');
  const [numAI, setNumAI]  = useState(1);

  const game = GAMES.find(g => g.id === gameId);
  const [minAI, maxAI] = game.aiRange;
  const clampedAI = Math.min(Math.max(numAI, minAI), maxAI);

  function handlePlay() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (game.id === 'blackjack') {
      navigation.navigate('Game');
      return;
    }
    const players = [
      { id: 'host', name: trimmed },
      ...Array.from({ length: clampedAI }, (_, i) => ({
        id: `ai_${i + 1}`,
        name: clampedAI > 1 ? `Computer ${i + 1}` : 'Computer',
        isAI: true,
      })),
    ];
    navigation.navigate(game.screen, { role: 'singleplayer', myName: trimmed, players });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Single Player</Text>

      <Text style={styles.label}>Your Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Enter your name"
        placeholderTextColor="#555"
        maxLength={20}
        returnKeyType="done"
      />

      <Text style={styles.label}>Pick a Game</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        <View style={styles.chipRow}>
          {GAMES.map(g => (
            <TouchableOpacity
              key={g.id}
              style={[styles.chip, gameId === g.id && styles.chipSelected]}
              onPress={() => {
                setGameId(g.id);
                setNumAI(Math.min(Math.max(numAI, g.aiRange[0]), g.aiRange[1]));
              }}
            >
              <Text style={[styles.chipText, gameId === g.id && styles.chipTextSelected]}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {game.id === 'blackjack' ? (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>You vs the Dealer — no opponents to pick</Text>
        </View>
      ) : (
        <>
          <Text style={styles.label}>
            {maxAI === 1 ? 'Opponent' : 'Computer Opponents'}
          </Text>
          {maxAI > 1 ? (
            <View style={styles.countRow}>
              {[1, 2, 3].filter(n => n >= minAI && n <= maxAI).map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.countBtn, clampedAI === n && styles.countBtnSelected]}
                  onPress={() => setNumAI(n)}
                >
                  <Text style={[styles.countBtnText, clampedAI === n && styles.countBtnTextSelected]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>1 Computer opponent</Text>
            </View>
          )}
        </>
      )}

      <TouchableOpacity
        style={[styles.playBtn, !name.trim() && styles.playBtnDimmed]}
        onPress={handlePlay}
        disabled={!name.trim()}
      >
        <Text style={styles.playBtnText}>Play!</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#1a1a2e', padding: 24, paddingBottom: 40 },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 28, textAlign: 'center' },

  label: { color: '#b0b0c0', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 24 },

  input: {
    backgroundColor: '#16213e', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14,
    color: '#fff', fontSize: 18, borderWidth: 1.5, borderColor: '#334',
  },

  chipScroll: { marginBottom: 4 },
  chipRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: '#16213e', borderWidth: 1.5, borderColor: '#334' },
  chipSelected: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  chipText: { color: '#b0b0c0', fontSize: 15, fontWeight: 'bold' },
  chipTextSelected: { color: '#fff' },

  countRow: { flexDirection: 'row', gap: 16 },
  countBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#16213e', borderWidth: 2, borderColor: '#334', alignItems: 'center', justifyContent: 'center' },
  countBtnSelected: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  countBtnText: { color: '#b0b0c0', fontSize: 26, fontWeight: 'bold' },
  countBtnTextSelected: { color: '#fff' },

  infoBox: { backgroundColor: '#16213e', borderRadius: 10, padding: 14 },
  infoText: { color: '#b0b0c0', fontSize: 15, textAlign: 'center' },

  playBtn: { backgroundColor: '#4caf50', borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginTop: 36 },
  playBtnDimmed: { backgroundColor: '#2d5c35' },
  playBtnText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
});
