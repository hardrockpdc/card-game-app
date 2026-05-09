import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { scale, scaleFont } from '../game/responsive';

export default function ResultsScreen({ navigation, route }) {
  const {
    gameName = 'Game Over',
    headline,
    isLocalWin = false,
    scores = [],
    coinsEarned = 0,
    playAgainRoute = null,
    playAgainParams = null,
  } = route.params ?? {};

  const emoji = isLocalWin ? '🏆' : '🎉';
  const displayHeadline = headline ?? (isLocalWin ? 'You win!' : 'Game Over');

  function handlePlayAgain() {
    navigation.replace(playAgainRoute, playAgainParams ?? {});
  }

  function handleHome() {
    navigation.navigate('Home');
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.emoji}>{emoji}</Text>

        <Text style={styles.gameName}>{gameName}</Text>
        <Text style={styles.headline}>{displayHeadline}</Text>

        {coinsEarned > 0 && (
          <View style={styles.coinsBadge}>
            <Text style={styles.coinsText}>+{coinsEarned} coins!</Text>
          </View>
        )}

        {scores.length > 0 && (
          <View style={styles.scoreboard}>
            <Text style={styles.scoreboardTitle}>Final Scores</Text>
            {scores.map((entry, i) => (
              <View key={i} style={[styles.scoreRow, entry.isWinner && styles.winnerRow]}>
                <Text style={[styles.scoreName, entry.isWinner && styles.winnerText]}>
                  {entry.isWinner ? '🏆 ' : '      '}{entry.name}
                </Text>
                <Text style={[styles.scoreValue, entry.isWinner && styles.winnerText]}>
                  {entry.score}
                </Text>
              </View>
            ))}
          </View>
        )}

        {playAgainRoute != null && (
          <TouchableOpacity style={styles.primaryBtn} onPress={handlePlayAgain}>
            <Text style={styles.primaryBtnText}>Play Again</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleHome}>
          <Text style={styles.secondaryBtnText}>Back to Menu</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(28),
  },
  emoji: {
    fontSize: scaleFont(64),
    marginBottom: scale(8),
    textAlign: 'center',
  },
  gameName: {
    color: '#b0b0c0',
    fontSize: scaleFont(13),
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: scale(6),
    textAlign: 'center',
  },
  headline: {
    color: '#ffffff',
    fontSize: scaleFont(30),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: scale(22),
  },
  coinsBadge: {
    backgroundColor: '#1a4a10',
    borderRadius: scale(999),
    borderWidth: 1.5,
    borderColor: '#ffd700',
    paddingHorizontal: scale(20),
    paddingVertical: scale(8),
    marginBottom: scale(22),
  },
  coinsText: {
    color: '#ffd700',
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scoreboard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#16213e',
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: '#2a2a4a',
    padding: scale(16),
    marginBottom: scale(28),
  },
  scoreboardTitle: {
    color: '#b0b0c0',
    fontSize: scaleFont(11),
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: scale(12),
    textAlign: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(8),
    paddingHorizontal: scale(8),
    borderRadius: scale(8),
  },
  winnerRow: {
    backgroundColor: '#1a3a10',
  },
  scoreName: {
    color: '#c0c0d0',
    fontSize: scaleFont(15),
    fontWeight: '600',
    flex: 1,
  },
  winnerText: {
    color: '#4ade80',
  },
  scoreValue: {
    color: '#b0b0c0',
    fontSize: scaleFont(15),
    fontWeight: 'bold',
  },
  primaryBtn: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#e94560',
    borderRadius: scale(12),
    paddingVertical: scale(16),
    alignItems: 'center',
    marginBottom: scale(12),
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: scaleFont(17),
    fontWeight: 'bold',
  },
  secondaryBtn: {
    width: '100%',
    maxWidth: 380,
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: '#4a4a6a',
    paddingVertical: scale(14),
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#b0b0c0',
    fontSize: scaleFont(16),
    fontWeight: '600',
  },
});
