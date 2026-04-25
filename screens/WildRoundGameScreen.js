import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, FlatList, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createDeck, dealHands, pickPrompt,
  processSubmission, pickWinner, checkWin,
} from '../game/wildround';

const WIN_SCORE = 10;

export default function WildRoundGameScreen({ navigation, route }) {
  const { myName, players: initialPlayers, tone = 'family' } = route.params;
  const myId = 'host';

  const [gs, setGs] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);  // answer card id during submission
  const [selectedSub, setSelectedSub] = useState(null);   // submission cardId during judging

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    startNewGame();
  }, []);

  function startNewGame() {
    const deck = createDeck(tone);
    const { players, answerDeck } = dealHands(initialPlayers, deck.answers);
    const judgeIndex = Math.floor(Math.random() * players.length);
    const { prompt, promptDeck } = pickPrompt(deck.prompts);
    setGs({
      tone,
      phase: 'judgeSkip',
      players,
      judgeIndex,
      promptDeck,
      answerDeck,
      currentPrompt: prompt,
      promptSkipped: false,
      submissions: [],
      revealSubmissions: [],
      lastWinnerId: null,
      lastWinningCardId: null,
      winner: null,
    });
    setSelectedCard(null);
    setSelectedSub(null);
  }

  // ── AI automation ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gs) return;
    const judge = gs.players[gs.judgeIndex];
    const isAIJudge = judge.id !== myId;

    // AI judge auto-decides prompt
    if (gs.phase === 'judgeSkip' && isAIJudge) {
      const t = setTimeout(() => {
        setGs(prev => {
          if (!prev || prev.phase !== 'judgeSkip') return prev;
          const shouldSkip = !prev.promptSkipped && Math.random() < 0.5;
          if (shouldSkip) {
            const deck = [...prev.promptDeck];
            deck.splice(Math.floor(Math.random() * (deck.length + 1)), 0, prev.currentPrompt);
            const { prompt, promptDeck } = pickPrompt(deck);
            return { ...prev, currentPrompt: prompt, promptDeck, promptSkipped: true, phase: 'submission' };
          }
          return { ...prev, phase: 'submission' };
        });
      }, 1200);
      return () => clearTimeout(t);
    }

    // AI players auto-submit random card
    if (gs.phase === 'submission') {
      const t = setTimeout(() => {
        setGs(prev => {
          if (!prev || prev.phase !== 'submission') return prev;
          let s = prev;
          const nonJudges = prev.players.filter((_, i) => i !== prev.judgeIndex);
          for (const p of nonJudges) {
            if (!p.isAI) continue;
            if (s.submissions.some(sub => sub.playerId === String(p.id))) continue;
            const card = p.hand[Math.floor(Math.random() * p.hand.length)];
            try { s = processSubmission(s, p.id, card.id); } catch (_) {}
          }
          const allDone = nonJudges.every(p => s.submissions.some(sub => sub.playerId === String(p.id)));
          // Only advance if human (non-judge) has also submitted, or human is the judge
          const humanIsNonJudge = nonJudges.some(p => p.id === myId);
          const humanSubmitted = s.submissions.some(sub => sub.playerId === myId);
          if (allDone && (!humanIsNonJudge || humanSubmitted)) {
            return { ...s, phase: 'judging' };
          }
          return s;
        });
      }, 900);
      return () => clearTimeout(t);
    }

    // AI judge auto-picks a random submission
    if (gs.phase === 'judging' && isAIJudge) {
      const t = setTimeout(() => {
        setGs(prev => {
          if (!prev || prev.phase !== 'judging' || prev.submissions.length === 0) return prev;
          const sub = prev.submissions[Math.floor(Math.random() * prev.submissions.length)];
          const newS = pickWinner(prev, sub.cardId);
          const w = checkWin(newS);
          return w ? { ...newS, phase: 'gameOver', winner: w } : newS;
        });
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [gs?.phase, gs?.judgeIndex]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleKeepPrompt() {
    setGs(prev => ({ ...prev, phase: 'submission' }));
  }

  function handleSkipPrompt() {
    setGs(prev => {
      const deck = [...prev.promptDeck];
      deck.splice(Math.floor(Math.random() * (deck.length + 1)), 0, prev.currentPrompt);
      const { prompt, promptDeck } = pickPrompt(deck);
      return { ...prev, currentPrompt: prompt, promptDeck, promptSkipped: true, phase: 'submission' };
    });
  }

  function handleSubmitCard() {
    if (!selectedCard) return;
    setGs(prev => {
      let s;
      try { s = processSubmission(prev, myId, selectedCard); }
      catch (e) { Alert.alert('Error', e.message); return prev; }
      const nonJudges = s.players.filter((_, i) => i !== s.judgeIndex);
      const allDone = nonJudges.every(p => s.submissions.some(sub => sub.playerId === String(p.id)));
      if (allDone) s = { ...s, phase: 'judging' };
      return s;
    });
    setSelectedCard(null);
  }

  function handlePickWinner() {
    if (!selectedSub) return;
    Alert.alert('Pick this answer?', 'Award the point?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, pick it!',
        onPress: () => {
          setGs(prev => {
            const newS = pickWinner(prev, selectedSub);
            const w = checkWin(newS);
            return w ? { ...newS, phase: 'gameOver', winner: w } : newS;
          });
          setSelectedSub(null);
        },
      },
    ]);
  }

  function handleNextRound() {
    setGs(prev => {
      const nextJudgeIndex = (prev.judgeIndex + 1) % prev.players.length;
      const { prompt, promptDeck } = pickPrompt(prev.promptDeck);
      return {
        ...prev,
        phase: 'judgeSkip',
        judgeIndex: nextJudgeIndex,
        currentPrompt: prompt,
        promptDeck,
        promptSkipped: false,
        submissions: [],
        revealSubmissions: [],
        lastWinnerId: null,
        lastWinningCardId: null,
      };
    });
    setSelectedCard(null);
    setSelectedSub(null);
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (!gs) {
    return (
      <View style={styles.container}>
        <Text style={styles.waitText}>Dealing cards…</Text>
      </View>
    );
  }

  const judge = gs.players[gs.judgeIndex];
  const isJudge = judge.id === myId;
  const me = gs.players.find(p => p.id === myId);
  const hasSubmitted = gs.submissions.some(s => s.playerId === myId);
  const nonJudges = gs.players.filter((_, i) => i !== gs.judgeIndex);
  const pendingCount = nonJudges.filter(
    p => !gs.submissions.some(s => s.playerId === String(p.id))
  ).length;

  // ── Game over ───────────────────────────────────────────────────────────────
  if (gs.phase === 'gameOver') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.gameOverTitle}>🎉 {gs.winner.name} wins!</Text>
        <View style={styles.finalScoreboard}>
          {[...gs.players].sort((a, b) => b.score - a.score).map(p => (
            <View key={p.id} style={styles.finalRow}>
              <Text style={styles.finalName}>
                {p.id === gs.winner.id ? '🏆 ' : '    '}{p.name}
              </Text>
              <Text style={styles.finalScore}>{p.score}/{WIN_SCORE}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={startNewGame}>
          <Text style={styles.primaryBtnText}>Play Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.secondaryBtnText}>Back to Menu</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Main game ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      {/* ── Scoreboard ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scoreRow}
        contentContainerStyle={styles.scoreRowContent}
      >
        {gs.players.map((p, i) => (
          <View key={p.id} style={[styles.scoreChip, i === gs.judgeIndex && styles.scoreChipJudge]}>
            <Text style={styles.scoreChipName} numberOfLines={1}>
              {i === gs.judgeIndex ? '⚖️ ' : ''}{p.name}
            </Text>
            <Text style={styles.scoreChipScore}>{p.score}/{WIN_SCORE}</Text>
          </View>
        ))}
      </ScrollView>

      {/* ── Prompt box ── */}
      {gs.phase !== 'judgeSkip' || isJudge ? (
        gs.currentPrompt ? (
          <View style={styles.promptBox}>
            <Text style={styles.promptText}>{gs.currentPrompt.text}</Text>
          </View>
        ) : null
      ) : (
        <View style={styles.promptBox}>
          <Text style={styles.waitText}>⚖️ {judge.name} is choosing a prompt…</Text>
        </View>
      )}

      {/* ── judgeSkip — human is judge ── */}
      {gs.phase === 'judgeSkip' && isJudge && (
        <View style={styles.centreSection}>
          <Text style={styles.hintText}>
            {gs.promptSkipped
              ? 'You already skipped — this prompt is locked in.'
              : 'Keep this prompt, or skip once to draw a new one.'}
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleKeepPrompt}>
            <Text style={styles.primaryBtnText}>Keep this prompt ✓</Text>
          </TouchableOpacity>
          {!gs.promptSkipped && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleSkipPrompt}>
              <Text style={styles.secondaryBtnText}>Skip — draw new prompt</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── judgeSkip — AI is judge ── */}
      {gs.phase === 'judgeSkip' && !isJudge && (
        <View style={styles.centreSection}>
          <Text style={styles.waitText}>⚖️ {judge.name} is reviewing the prompt…</Text>
        </View>
      )}

      {/* ── submission — human is judge ── */}
      {gs.phase === 'submission' && isJudge && (
        <View style={styles.centreSection}>
          <Text style={styles.waitText}>
            Waiting for {pendingCount} player{pendingCount !== 1 ? 's' : ''} to submit…
          </Text>
        </View>
      )}

      {/* ── submission — human not yet submitted ── */}
      {gs.phase === 'submission' && !isJudge && !hasSubmitted && (
        <>
          <Text style={styles.sectionLabel}>Your hand — tap a card, then submit</Text>
          <FlatList
            data={me?.hand ?? []}
            keyExtractor={c => c.id}
            style={styles.cardList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.answerCard, selectedCard === item.id && styles.answerCardSelected]}
                onPress={() => setSelectedCard(prev => prev === item.id ? null : item.id)}
              >
                <Text style={styles.answerCardText}>{item.text}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={[styles.primaryBtn, !selectedCard && styles.btnDimmed]}
            onPress={handleSubmitCard}
            disabled={!selectedCard}
          >
            <Text style={styles.primaryBtnText}>Submit ✓</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── submission — human already submitted ── */}
      {gs.phase === 'submission' && !isJudge && hasSubmitted && (
        <View style={styles.centreSection}>
          <Text style={styles.waitText}>
            ✅ Submitted! Waiting for {pendingCount} more{pendingCount !== 1 ? ' players' : ''}…
          </Text>
        </View>
      )}

      {/* ── judging — human is judge ── */}
      {gs.phase === 'judging' && isJudge && (
        <>
          <Text style={styles.sectionLabel}>Pick the funniest answer</Text>
          <FlatList
            data={gs.submissions}
            keyExtractor={s => s.cardId}
            style={styles.cardList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.answerCard, selectedSub === item.cardId && styles.answerCardSelected]}
                onPress={() => setSelectedSub(prev => prev === item.cardId ? null : item.cardId)}
              >
                <Text style={styles.answerCardText}>{item.cardText}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={[styles.primaryBtn, !selectedSub && styles.btnDimmed]}
            onPress={handlePickWinner}
            disabled={!selectedSub}
          >
            <Text style={styles.primaryBtnText}>Pick this answer ✓</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── judging — AI is judge ── */}
      {gs.phase === 'judging' && !isJudge && (
        <View style={styles.centreSection}>
          <Text style={styles.waitText}>⚖️ {judge.name} is picking the winner…</Text>
        </View>
      )}

      {/* ── reveal ── */}
      {gs.phase === 'reveal' && (() => {
        const winSub = gs.revealSubmissions.find(s => s.cardId === gs.lastWinningCardId);
        const winPlayer = gs.players.find(p => String(p.id) === String(gs.lastWinnerId));
        const otherSubs = gs.revealSubmissions.filter(s => s.cardId !== gs.lastWinningCardId);
        return (
          <ScrollView style={styles.revealScroll} contentContainerStyle={styles.revealContent}>
            <Text style={styles.revealWinLabel}>🏆 Winning answer</Text>
            <View style={styles.winCard}>
              <Text style={styles.winCardText}>{winSub?.cardText}</Text>
            </View>
            <Text style={styles.revealWinnerName}>
              {winPlayer?.name} +1 point → {winPlayer?.score}/{WIN_SCORE}
            </Text>

            {otherSubs.length > 0 && (
              <>
                <Text style={styles.revealOtherLabel}>Other answers</Text>
                {otherSubs.map(sub => {
                  const player = gs.players.find(p => String(p.id) === String(sub.playerId));
                  return (
                    <View key={sub.cardId} style={styles.otherCard}>
                      <Text style={styles.otherCardText}>{sub.cardText}</Text>
                      <Text style={styles.otherCardName}>{player?.name}</Text>
                    </View>
                  );
                })}
              </>
            )}

            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24 }]} onPress={handleNextRound}>
              <Text style={styles.primaryBtnText}>Next Round →</Text>
            </TouchableOpacity>
          </ScrollView>
        );
      })()}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 16,
  },

  // Scoreboard
  scoreRow: { flexGrow: 0, marginBottom: 12 },
  scoreRowContent: { gap: 8, paddingHorizontal: 2 },
  scoreChip: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 80,
  },
  scoreChipJudge: { backgroundColor: '#2a1a3e', borderWidth: 1.5, borderColor: '#9c27b0' },
  scoreChipName: { color: '#b0b0c0', fontSize: 12, fontWeight: 'bold', maxWidth: 90 },
  scoreChipScore: { color: '#e94560', fontSize: 14, fontWeight: 'bold', marginTop: 2 },

  // Prompt
  promptBox: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    minHeight: 80,
    justifyContent: 'center',
  },
  promptText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 28,
  },

  // Generic layout
  centreSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  waitText: { color: '#b0b0c0', fontSize: 16, textAlign: 'center' },
  hintText: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 8 },
  sectionLabel: {
    color: '#b0b0c0',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },

  // Card list (hand + submissions)
  cardList: { flex: 1, marginBottom: 12 },
  answerCard: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#334',
    padding: 14,
    marginBottom: 8,
  },
  answerCardSelected: {
    borderColor: '#e94560',
    backgroundColor: '#2a1020',
  },
  answerCardText: { color: '#ffffff', fontSize: 15, lineHeight: 21 },

  // Buttons
  primaryBtn: {
    backgroundColor: '#e94560',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  secondaryBtn: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#334',
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryBtnText: { color: '#b0b0c0', fontSize: 15, fontWeight: 'bold' },
  btnDimmed: { opacity: 0.4 },

  // Reveal phase
  revealScroll: { flex: 1 },
  revealContent: { paddingBottom: 24 },
  revealWinLabel: {
    color: '#b0b0c0',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  winCard: {
    backgroundColor: '#1a3a1a',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#4caf50',
    padding: 20,
    marginBottom: 10,
  },
  winCardText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  revealWinnerName: {
    color: '#4caf50',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  revealOtherLabel: {
    color: '#666680',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  otherCard: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  otherCardText: { color: '#b0b0c0', fontSize: 14, flex: 1, marginRight: 8 },
  otherCardName: { color: '#555570', fontSize: 12 },

  // Game over
  gameOverTitle: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  finalScoreboard: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 32,
    gap: 10,
  },
  finalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  finalName: { color: '#ffffff', fontSize: 17 },
  finalScore: { color: '#e94560', fontSize: 17, fontWeight: 'bold' },
});
