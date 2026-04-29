import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  Animated, PanResponder, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createDeck, dealHands, pickPrompt, processSubmission, pickWinner, checkWin,
} from '../game/wildround';
import {
  setServerListeners, broadcastToClients, getConnectedPlayers, sendToClient,
  setClientListeners, sendToHost,
} from '../game/GameNetwork';
import { getTheme, subscribe } from '../game/cardTheme';

const WIN_SCORE = 10;

function localShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toPublic(state) {
  return {
    tone: state.tone,
    phase: state.phase,
    judgeIndex: state.judgeIndex,
    promptSkipped: state.promptSkipped,
    currentPrompt: state.phase === 'judgeSkip' ? null : state.currentPrompt,
    players: state.players.map(p => ({
      id: p.id, name: p.name, score: p.score,
      handSize: (p.hand ?? []).length,
    })),
    submissionCount: state.submissions.length,
    submitterIds: state.submissions.map(s => s.playerId),
    anonymousSubmissions: state.phase === 'judging'
      ? (state.submissionsForJudging ?? state.submissions).map(s => ({ cardId: s.cardId, cardText: s.cardText }))
      : [],
    revealSubmissions: state.phase === 'reveal' ? (state.revealSubmissions ?? []) : [],
    lastWinnerId: state.lastWinnerId,
    lastWinningCardId: state.lastWinningCardId,
    winner: state.winner,
  };
}

export default function WildRoundGameScreen({ navigation, route }) {
  const { role, myName, players: initialPlayers, tone: gameTone = 'family' } = route.params;
  const isSinglePlayer = role === 'singleplayer';
  const isHost = role === 'host' || isSinglePlayer;
  const myPid = isHost ? 'host' : String(initialPlayers.find(p => p.name === myName)?.id ?? myName);

  const fullRef = useRef(null);
  const [gameState, setGameState] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const [privateJudgePrompt, setPrivateJudgePrompt] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [deckIndex, setDeckIndex] = useState(0);
  const [judgeDeckIndex, setJudgeDeckIndex] = useState(0);
  const [viewerDeckIndex, setViewerDeckIndex] = useState(0);
  const [themeId, setThemeId] = useState(getTheme());
  useEffect(() => subscribe(setThemeId), []);
  const blankImages = {
    neon:   require('../assets/cards/blank_neon.png'),
    cowboy: require('../assets/cards_cowboy/blank_cowboy.png'),
    girly:  require('../assets/card_images_girly/blank_girly.png'),
    hp:     require('../assets/card_images_hp/blank_hp.png'),
    jewel:  require('../assets/card_images_jewel/blank_jewel.png'),
  };
  const blankImage = blankImages[themeId] ?? blankImages.neon;

  const deckIndexRef = useRef(0);
  const myHandRef = useRef(myHand);
  myHandRef.current = myHand;
  const dragX = useRef(new Animated.Value(0)).current;
  const cardEntryX = useRef(new Animated.Value(0)).current;
  const judgeCardEntryX = useRef(new Animated.Value(0)).current;
  const judgeCardDragX = useRef(new Animated.Value(0)).current;
  const judgeIndexRef = useRef(0);
  const judgeSubsRef = useRef([]);
  const viewerCardEntryX = useRef(new Animated.Value(0)).current;
  const viewerCardDragX = useRef(new Animated.Value(0)).current;
  const viewerIndexRef = useRef(0);
  const viewerSubsRef = useRef([]);

  const deckPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => dragX.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) {
          const next = Math.min(deckIndexRef.current + 1, myHandRef.current.length - 1);
          if (next !== deckIndexRef.current) {
            cardEntryX.setValue(80);
            deckIndexRef.current = next;
            setDeckIndex(next);
            Animated.spring(cardEntryX, { toValue: 0, useNativeDriver: true, tension: 120, friction: 10 }).start();
          }
        } else if (g.dx > 50) {
          const next = Math.max(deckIndexRef.current - 1, 0);
          if (next !== deckIndexRef.current) {
            cardEntryX.setValue(-80);
            deckIndexRef.current = next;
            setDeckIndex(next);
            Animated.spring(cardEntryX, { toValue: 0, useNativeDriver: true, tension: 120, friction: 10 }).start();
          }
        }
        Animated.spring(dragX, { toValue: 0, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const judgePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => judgeCardDragX.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        const subs = judgeSubsRef.current;
        if (g.dx < -50) {
          const next = Math.min(judgeIndexRef.current + 1, subs.length - 1);
          if (next !== judgeIndexRef.current) {
            judgeCardEntryX.setValue(80);
            judgeIndexRef.current = next;
            setJudgeDeckIndex(next);
            Animated.spring(judgeCardEntryX, { toValue: 0, useNativeDriver: true, tension: 120, friction: 10 }).start();
          }
        } else if (g.dx > 50) {
          const next = Math.max(judgeIndexRef.current - 1, 0);
          if (next !== judgeIndexRef.current) {
            judgeCardEntryX.setValue(-80);
            judgeIndexRef.current = next;
            setJudgeDeckIndex(next);
            Animated.spring(judgeCardEntryX, { toValue: 0, useNativeDriver: true, tension: 120, friction: 10 }).start();
          }
        }
        Animated.spring(judgeCardDragX, { toValue: 0, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(judgeCardDragX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const viewerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => viewerCardDragX.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        const subs = viewerSubsRef.current;
        if (g.dx < -50) {
          const next = Math.min(viewerIndexRef.current + 1, subs.length - 1);
          if (next !== viewerIndexRef.current) {
            viewerCardEntryX.setValue(80);
            viewerIndexRef.current = next;
            setViewerDeckIndex(next);
            Animated.spring(viewerCardEntryX, { toValue: 0, useNativeDriver: true, tension: 120, friction: 10 }).start();
          }
        } else if (g.dx > 50) {
          const next = Math.max(viewerIndexRef.current - 1, 0);
          if (next !== viewerIndexRef.current) {
            viewerCardEntryX.setValue(-80);
            viewerIndexRef.current = next;
            setViewerDeckIndex(next);
            Animated.spring(viewerCardEntryX, { toValue: 0, useNativeDriver: true, tension: 120, friction: 10 }).start();
          }
        }
        Animated.spring(viewerCardDragX, { toValue: 0, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(viewerCardDragX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  // ── applyState ──────────────────────────────────────────────────────────────
  function applyState(newState) {
    fullRef.current = newState;
    const pub = toPublic(newState);
    setGameState(pub);

    if (isHost) {
      const me = newState.players.find(p => String(p.id) === myPid);
      setMyHand(me?.hand ?? []);
      const amJudge = String(newState.players[newState.judgeIndex]?.id) === myPid;
      setPrivateJudgePrompt(newState.phase === 'judgeSkip' && amJudge ? newState.currentPrompt : null);
    }

    if (!isSinglePlayer) {
      broadcastToClients({ type: 'GAME_STATE', state: pub });
      getConnectedPlayers().forEach(({ id: clientId }) => {
        const player = newState.players.find(p => String(p.id) === String(clientId));
        if (!player) return;
        const msg = { type: 'PRIVATE_HAND', hand: player.hand };
        const isClientJudge = String(newState.players[newState.judgeIndex]?.id) === String(clientId);
        if (newState.phase === 'judgeSkip' && isClientJudge) msg.judgePrompt = newState.currentPrompt;
        sendToClient(clientId, msg);
      });
    }
  }

  function transitionToJudging(s) {
    applyState({ ...s, phase: 'judging', submissionsForJudging: localShuffle([...s.submissions]) });
  }

  function advanceRound(s) {
    const nextJudgeIndex = (s.judgeIndex + 1) % s.players.length;
    const { prompt, promptDeck } = pickPrompt(s.promptDeck);
    applyState({
      ...s, phase: 'judgeSkip', judgeIndex: nextJudgeIndex,
      currentPrompt: prompt, promptDeck, promptSkipped: false,
      submissions: [], submissionsForJudging: [], revealSubmissions: [],
      lastWinnerId: null, lastWinningCardId: null,
    });
  }

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => { if (isHost) startNewGame(); }, []);

  function startNewGame() {
    const deck = createDeck(gameTone);
    const { players, answerDeck } = dealHands(initialPlayers, deck.answers);
    const judgeIndex = Math.floor(Math.random() * players.length);
    const { prompt, promptDeck } = pickPrompt(deck.prompts);
    applyState({
      tone: gameTone, phase: 'judgeSkip', players, judgeIndex,
      promptDeck, answerDeck, currentPrompt: prompt, promptSkipped: false,
      submissions: [], submissionsForJudging: [], revealSubmissions: [],
      lastWinnerId: null, lastWinningCardId: null, winner: null,
    });
  }

  // ── Host server listeners ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isHost || isSinglePlayer) return;
    setServerListeners({
      onClientJoined: () => {},
      onClientLeft: () => {},
      onMessage: (msg, clientId) => {
        const s = fullRef.current;
        if (!s) return;
        const clientPid = String(clientId);
        const judgeId = String(s.players[s.judgeIndex]?.id);

        switch (msg.type) {
          case 'JUDGE_KEEP_PROMPT':
            if (clientPid !== judgeId || s.phase !== 'judgeSkip') return;
            applyState({ ...s, phase: 'submission' });
            break;
          case 'JUDGE_SKIP_PROMPT':
            if (clientPid !== judgeId || s.phase !== 'judgeSkip' || s.promptSkipped) return;
            {
              const deck = [...s.promptDeck];
              deck.splice(Math.floor(Math.random() * (deck.length + 1)), 0, s.currentPrompt);
              const { prompt, promptDeck } = pickPrompt(deck);
              applyState({ ...s, currentPrompt: prompt, promptDeck, promptSkipped: true, phase: 'submission' });
            }
            break;
          case 'SUBMIT_CARD':
            if (s.phase !== 'submission') return;
            try {
              const newS = processSubmission(s, clientPid, msg.cardId);
              const nonJudges = newS.players.filter((_, i) => i !== newS.judgeIndex);
              const allDone = nonJudges.every(p => newS.submissions.some(sub => sub.playerId === String(p.id)));
              allDone ? transitionToJudging(newS) : applyState(newS);
            } catch (_) {}
            break;
          case 'JUDGE_PICK_WINNER':
            if (clientPid !== judgeId || s.phase !== 'judging') return;
            {
              const newS = pickWinner(s, msg.cardId);
              const w = checkWin(newS);
              applyState(w ? { ...newS, phase: 'gameOver', winner: w } : newS);
            }
            break;
          case 'NEXT_ROUND':
            if (s.phase !== 'reveal') return;
            advanceRound(s);
            break;
        }
      },
    });
  }, []);

  // ── Client listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isHost) return;
    setClientListeners({
      onMessage: (msg) => {
        if (msg.type === 'GAME_STATE') setGameState(msg.state);
        if (msg.type === 'PRIVATE_HAND') {
          setMyHand(msg.hand ?? []);
          setPrivateJudgePrompt(msg.judgePrompt ?? null);
        }
      },
      onDisconnected: () => {
        Alert.alert('Disconnected', 'Lost connection to the host.', [
          { text: 'OK', onPress: () => navigation.navigate('Home') },
        ]);
      },
    });
  }, []);

  // ── Reset selections on phase change ────────────────────────────────────────
  useEffect(() => {
    setSelectedCard(null);
    setSelectedSub(null);
    deckIndexRef.current = 0;
    setDeckIndex(0);
    judgeIndexRef.current = 0;
    setJudgeDeckIndex(0);
    viewerIndexRef.current = 0;
    setViewerDeckIndex(0);
  }, [gameState?.phase]);

  // ── AI automation (singleplayer only) ──────────────────────────────────────
  useEffect(() => {
    if (!isSinglePlayer || !gameState) return;
    const s = fullRef.current;
    if (!s) return;
    const isAIJudge = s.players[s.judgeIndex]?.id !== myPid;

    if (gameState.phase === 'judgeSkip' && isAIJudge) {
      const t = setTimeout(() => {
        const cur = fullRef.current;
        if (!cur || cur.phase !== 'judgeSkip') return;
        const shouldSkip = !cur.promptSkipped && Math.random() < 0.5;
        if (shouldSkip) {
          const deck = [...cur.promptDeck];
          deck.splice(Math.floor(Math.random() * (deck.length + 1)), 0, cur.currentPrompt);
          const { prompt, promptDeck } = pickPrompt(deck);
          applyState({ ...cur, currentPrompt: prompt, promptDeck, promptSkipped: true, phase: 'submission' });
        } else {
          applyState({ ...cur, phase: 'submission' });
        }
      }, 1200);
      return () => clearTimeout(t);
    }

    if (gameState.phase === 'submission') {
      const t = setTimeout(() => {
        const cur = fullRef.current;
        if (!cur || cur.phase !== 'submission') return;
        let next = cur;
        const nonJudges = cur.players.filter((_, i) => i !== cur.judgeIndex);
        for (const p of nonJudges) {
          if (!p.isAI) continue;
          if (next.submissions.some(sub => sub.playerId === String(p.id))) continue;
          const card = p.hand[Math.floor(Math.random() * p.hand.length)];
          try { next = processSubmission(next, p.id, card.id); } catch (_) {}
        }
        const allDone = nonJudges.every(p => next.submissions.some(sub => sub.playerId === String(p.id)));
        const humanIsNonJudge = nonJudges.some(p => p.id === myPid);
        const humanSubmitted = next.submissions.some(sub => sub.playerId === myPid);
        if (allDone && (!humanIsNonJudge || humanSubmitted)) {
          transitionToJudging(next);
        } else {
          applyState(next);
        }
      }, 900);
      return () => clearTimeout(t);
    }

    if (gameState.phase === 'judging' && isAIJudge) {
      const t = setTimeout(() => {
        const cur = fullRef.current;
        if (!cur || cur.phase !== 'judging') return;
        const subs = cur.submissionsForJudging ?? cur.submissions;
        if (!subs.length) return;
        const sub = subs[Math.floor(Math.random() * subs.length)];
        const newS = pickWinner(cur, sub.cardId);
        const w = checkWin(newS);
        applyState(w ? { ...newS, phase: 'gameOver', winner: w } : newS);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [gameState?.phase, gameState?.judgeIndex]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleKeepPrompt() {
    if (isHost) applyState({ ...fullRef.current, phase: 'submission' });
    else sendToHost({ type: 'JUDGE_KEEP_PROMPT' });
  }

  function handleSkipPrompt() {
    if (isHost) {
      const s = fullRef.current;
      const deck = [...s.promptDeck];
      deck.splice(Math.floor(Math.random() * (deck.length + 1)), 0, s.currentPrompt);
      const { prompt, promptDeck } = pickPrompt(deck);
      applyState({ ...s, currentPrompt: prompt, promptDeck, promptSkipped: true, phase: 'submission' });
    } else {
      sendToHost({ type: 'JUDGE_SKIP_PROMPT' });
    }
  }

  function handleSubmitCard() {
    if (!selectedCard) return;
    if (isHost) {
      const s = fullRef.current;
      try {
        const newS = processSubmission(s, myPid, selectedCard);
        const nonJudges = newS.players.filter((_, i) => i !== newS.judgeIndex);
        const allDone = nonJudges.every(p => newS.submissions.some(sub => sub.playerId === String(p.id)));
        allDone ? transitionToJudging(newS) : applyState(newS);
      } catch (e) { Alert.alert('Error', e.message); }
    } else {
      sendToHost({ type: 'SUBMIT_CARD', cardId: selectedCard });
      setGameState(prev => prev ? { ...prev, submitterIds: [...(prev.submitterIds ?? []), myPid] } : prev);
    }
    setSelectedCard(null);
  }

  function handlePickWinner() {
    if (!selectedSub) return;
    Alert.alert('Pick this answer?', 'Award the point?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, pick it!',
        onPress: () => {
          if (isHost) {
            const newS = pickWinner(fullRef.current, selectedSub);
            const w = checkWin(newS);
            applyState(w ? { ...newS, phase: 'gameOver', winner: w } : newS);
          } else {
            sendToHost({ type: 'JUDGE_PICK_WINNER', cardId: selectedSub });
          }
          setSelectedSub(null);
        },
      },
    ]);
  }

  function handleNextRound() {
    if (isHost) {
      const s = fullRef.current;
      if (s?.phase !== 'reveal') return;
      advanceRound(s);
    } else {
      sendToHost({ type: 'NEXT_ROUND' });
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (!gameState) {
    return (
      <View style={styles.container}>
        <Text style={styles.waitText}>Dealing cards…</Text>
      </View>
    );
  }

  const gs = gameState;
  const judge = gs.players[gs.judgeIndex];
  const isJudge = String(judge?.id) === myPid;
  const hasSubmitted = (gs.submitterIds ?? []).includes(myPid);
  const nonJudges = gs.players.filter((_, i) => i !== gs.judgeIndex);
  const pendingCount = nonJudges.length - (gs.submissionCount ?? 0);
  const displayPrompt = (isJudge && gs.phase === 'judgeSkip') ? privateJudgePrompt : gs.currentPrompt;

  // ── Game over ───────────────────────────────────────────────────────────────
  if (gs.phase === 'gameOver') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.gameOverTitle}>🎉 {gs.winner?.name} wins!</Text>
        <View style={styles.finalScoreboard}>
          {[...gs.players].sort((a, b) => b.score - a.score).map(p => (
            <View key={String(p.id)} style={styles.finalRow}>
              <Text style={styles.finalName}>
                {String(p.id) === String(gs.winner?.id) ? '🏆 ' : '    '}{p.name}
              </Text>
              <Text style={styles.finalScore}>{p.score}/{WIN_SCORE}</Text>
            </View>
          ))}
        </View>
        {(isSinglePlayer || isHost) && (
          <TouchableOpacity style={styles.primaryBtn} onPress={startNewGame}>
            <Text style={styles.primaryBtnText}>Play Again</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.secondaryBtnText}>Back to Menu</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Main game ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      {/* Scoreboard */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scoreRow} contentContainerStyle={styles.scoreRowContent}>
        {gs.players.map((p, i) => (
          <View key={String(p.id)} style={[styles.scoreChip, i === gs.judgeIndex && styles.scoreChipJudge]}>
            <Text style={styles.scoreChipName} numberOfLines={1}>{i === gs.judgeIndex ? '⚖️ ' : ''}{p.name}</Text>
            <Text style={styles.scoreChipScore}>{p.score}/{WIN_SCORE}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Prompt box */}
      <View style={styles.promptBox}>
        {displayPrompt ? (
          <Text style={styles.promptText}>{displayPrompt.text}</Text>
        ) : (
          <Text style={styles.waitText}>
            {gs.phase === 'judgeSkip' ? `⚖️ ${judge?.name} is choosing a prompt…` : '…'}
          </Text>
        )}
      </View>

      {/* judgeSkip — human judge */}
      {gs.phase === 'judgeSkip' && isJudge && (
        <View style={styles.centreSection}>
          <Text style={styles.hintText}>
            {gs.promptSkipped ? 'You already skipped — this prompt is locked in.' : 'Keep this prompt, or skip once to draw a new one.'}
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

      {/* judgeSkip — waiting */}
      {gs.phase === 'judgeSkip' && !isJudge && (
        <View style={styles.centreSection}>
          <Text style={styles.waitText}>⚖️ {judge?.name} is reviewing the prompt…</Text>
        </View>
      )}

      {/* submission — human is judge */}
      {gs.phase === 'submission' && isJudge && (
        <View style={styles.centreSection}>
          <Text style={styles.waitText}>
            Waiting for {pendingCount} player{pendingCount !== 1 ? 's' : ''} to submit…
          </Text>
        </View>
      )}

      {/* submission — human submitting */}
      {gs.phase === 'submission' && !isJudge && !hasSubmitted && (
        <>
          <Text style={styles.sectionLabel}>YOUR HAND — SWIPE TO BROWSE, TAP TO SELECT</Text>

          <View style={styles.deckArea}>
            {deckIndex > 0 && <View style={styles.peekLeft} pointerEvents="none" />}
            {deckIndex < myHand.length - 1 && <View style={styles.peekRight} pointerEvents="none" />}

            {/* Current card — draggable */}
            <Animated.View
              style={[styles.deckCardWrap, { transform: [{ translateX: Animated.add(dragX, cardEntryX) }] }]}
              {...deckPanResponder.panHandlers}
            >
              <TouchableOpacity
                style={[
                  styles.deckCard,
                  selectedCard === myHand[deckIndex]?.id && styles.deckCardSelected,
                ]}
                onPress={() => {
                  const card = myHand[deckIndex];
                  if (card) setSelectedCard(prev => prev === card.id ? null : card.id);
                }}
                activeOpacity={0.9}
              >
                <Image source={blankImage} style={styles.deckCardBgImage} />
                  {selectedCard === myHand[deckIndex]?.id && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>✓ Selected</Text>
                    </View>
                  )}
                  <Text style={styles.deckCardText}>{myHand[deckIndex]?.text}</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <Text style={styles.deckCounter}>{deckIndex + 1} / {myHand.length}</Text>

          <TouchableOpacity
            style={[styles.primaryBtn, !selectedCard && styles.btnDimmed]}
            onPress={handleSubmitCard}
            disabled={!selectedCard}
          >
            <Text style={styles.primaryBtnText}>Submit ✓</Text>
          </TouchableOpacity>
        </>
      )}

      {/* submission — already submitted */}
      {gs.phase === 'submission' && !isJudge && hasSubmitted && (
        <View style={styles.centreSection}>
          <Text style={styles.waitText}>
            ✅ Submitted! Waiting for {pendingCount} more{pendingCount !== 1 ? ' players' : ''}…
          </Text>
        </View>
      )}

      {/* judging — human judge */}
      {gs.phase === 'judging' && isJudge && (() => {
        judgeSubsRef.current = gs.anonymousSubmissions ?? [];
        return (
          <>
            <Text style={styles.sectionLabel}>Pick the funniest answer</Text>

            <View style={styles.deckArea}>
              {judgeDeckIndex > 0 && <View style={styles.peekLeft} pointerEvents="none" />}
              {judgeDeckIndex < (gs.anonymousSubmissions?.length ?? 0) - 1 && <View style={styles.peekRight} pointerEvents="none" />}

              <Animated.View
                style={[styles.deckCardWrap, { transform: [{ translateX: Animated.add(judgeCardDragX, judgeCardEntryX) }] }]}
                {...judgePanResponder.panHandlers}
              >
                <TouchableOpacity
                  style={[
                    styles.deckCard,
                    selectedSub === gs.anonymousSubmissions?.[judgeDeckIndex]?.cardId && styles.deckCardSelected,
                  ]}
                  onPress={() => {
                    const card = gs.anonymousSubmissions?.[judgeDeckIndex];
                    if (card) setSelectedSub(prev => prev === card.cardId ? null : card.cardId);
                  }}
                  activeOpacity={0.9}
                >
                  <Image source={blankImage} style={styles.deckCardBgImage} />
                    {selectedSub === gs.anonymousSubmissions?.[judgeDeckIndex]?.cardId && (
                      <View style={styles.selectedBadge}>
                        <Text style={styles.selectedBadgeText}>✓ Selected</Text>
                      </View>
                    )}
                    <Text style={styles.deckCardText}>{gs.anonymousSubmissions?.[judgeDeckIndex]?.cardText}</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            <Text style={styles.deckCounter}>{judgeDeckIndex + 1} / {gs.anonymousSubmissions?.length ?? 0}</Text>

            <TouchableOpacity
              style={[styles.primaryBtn, !selectedSub && styles.btnDimmed]}
              onPress={handlePickWinner}
              disabled={!selectedSub}
            >
              <Text style={styles.primaryBtnText}>Pick this answer ✓</Text>
            </TouchableOpacity>
          </>
        );
      })()}

      {/* judging — waiting for judge */}
      {gs.phase === 'judging' && !isJudge && (() => {
        const subs = gs.anonymousSubmissions ?? [];
        viewerSubsRef.current = subs;
        return (
          <>
            <Text style={styles.sectionLabel}>⚖️ {judge?.name} is deciding…</Text>

            {subs.length > 0 ? (
              <>
                <View style={styles.deckArea}>
                  {viewerDeckIndex > 0 && <View style={styles.peekLeft} pointerEvents="none" />}
                  {viewerDeckIndex < subs.length - 1 && <View style={styles.peekRight} pointerEvents="none" />}

                  <Animated.View
                    style={[styles.deckCardWrap, { transform: [{ translateX: Animated.add(viewerCardDragX, viewerCardEntryX) }] }]}
                    {...viewerPanResponder.panHandlers}
                  >
                    <View style={styles.deckCard}>
                      <Image source={blankImage} style={styles.deckCardBgImage} />
                      <Text style={styles.deckCardText}>{subs[viewerDeckIndex]?.cardText}</Text>
                    </View>
                  </Animated.View>
                </View>

                <Text style={styles.deckCounter}>{viewerDeckIndex + 1} / {subs.length}</Text>
              </>
            ) : (
              <View style={styles.centreSection}>
                <Text style={styles.waitText}>Waiting for submissions…</Text>
              </View>
            )}
          </>
        );
      })()}

      {/* reveal */}
      {gs.phase === 'reveal' && (() => {
        const winSub = gs.revealSubmissions.find(s => s.cardId === gs.lastWinningCardId);
        const winPlayer = gs.players.find(p => String(p.id) === String(gs.lastWinnerId));
        const otherSubs = gs.revealSubmissions.filter(s => s.cardId !== gs.lastWinningCardId);
        return (
          <ScrollView style={styles.revealScroll} contentContainerStyle={styles.revealContent}>
            <Text style={styles.revealWinLabel}>🏆 Winning answer</Text>
            <View style={styles.winCard}>
              <Image source={blankImage} style={styles.deckCardBgImage} />
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
                      <Image source={blankImage} style={styles.deckCardBgImage} />
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
  container: { flex: 1, backgroundColor: '#1a1a2e', padding: 16 },

  scoreRow: { flexGrow: 0, marginBottom: 12 },
  scoreRowContent: { gap: 8, paddingHorizontal: 2 },
  scoreChip: {
    backgroundColor: '#16213e', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', minWidth: 80,
  },
  scoreChipJudge: { backgroundColor: '#2a1a3e', borderWidth: 1.5, borderColor: '#9c27b0' },
  scoreChipName: { color: '#b0b0c0', fontSize: 12, fontWeight: 'bold', maxWidth: 90 },
  scoreChipScore: { color: '#e94560', fontSize: 14, fontWeight: 'bold', marginTop: 2 },

  promptBox: {
    backgroundColor: '#16213e', borderRadius: 14, padding: 20,
    marginBottom: 16, minHeight: 80, justifyContent: 'center',
  },
  promptText: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', lineHeight: 28 },

  centreSection: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  waitText: { color: '#b0b0c0', fontSize: 16, textAlign: 'center' },
  hintText: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 8 },
  sectionLabel: {
    color: '#b0b0c0', fontSize: 12, textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: 8,
  },

  cardList: { flex: 1, marginBottom: 12 },
  answerCard: {
    backgroundColor: '#16213e', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#334', padding: 14, marginBottom: 8,
  },
  answerCardSelected: { borderColor: '#e94560', backgroundColor: '#2a1020' },
  answerCardText: { color: '#ffffff', fontSize: 15, lineHeight: 21 },

  primaryBtn: {
    backgroundColor: '#e94560', borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center', marginBottom: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  secondaryBtn: {
    backgroundColor: '#16213e', borderRadius: 10, borderWidth: 1.5, borderColor: '#334',
    paddingVertical: 12, paddingHorizontal: 32, alignItems: 'center', marginBottom: 10,
  },
  secondaryBtnText: { color: '#b0b0c0', fontSize: 15, fontWeight: 'bold' },
  btnDimmed: { opacity: 0.4 },

  revealScroll: { flex: 1 },
  revealContent: { paddingBottom: 24 },
  revealWinLabel: {
    color: '#b0b0c0', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
  },
  winCard: {
    backgroundColor: '#1a3a1a', borderRadius: 14,
    borderWidth: 2, borderColor: '#4caf50', padding: 20, marginBottom: 10,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  winCardText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  revealWinnerName: {
    color: '#4caf50', fontSize: 15, fontWeight: 'bold', textAlign: 'center', marginBottom: 20,
  },
  revealOtherLabel: {
    color: '#666680', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  otherCard: {
    backgroundColor: '#16213e', borderRadius: 10, padding: 12,
    marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    overflow: 'hidden', position: 'relative',
  },
  otherCardText: { color: '#b0b0c0', fontSize: 14, flex: 1, marginRight: 8 },
  otherCardName: { color: '#555570', fontSize: 12 },

  gameOverTitle: {
    color: '#ffffff', fontSize: 32, fontWeight: 'bold',
    textAlign: 'center', marginBottom: 32, marginTop: 16,
  },
  finalScoreboard: { backgroundColor: '#16213e', borderRadius: 14, padding: 16, marginBottom: 32, gap: 10 },
  finalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  finalName: { color: '#ffffff', fontSize: 17 },
  finalScore: { color: '#e94560', fontSize: 17, fontWeight: 'bold' },

  deckArea: {
    flex: 1,
    position: 'relative',
    marginBottom: 8,
  },
  deckCardWrap: {
    flex: 1,
    marginHorizontal: 32,
    zIndex: 2,
  },
  deckCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#2a2a4e',
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  deckCardBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  deckCardSelected: {
    borderColor: '#e94560',
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  deckCardText: {
    color: '#ffffff',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    backgroundColor: '#e94560',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  peekLeft: {
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 16,
    width: 38,
    borderRadius: 12,
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#2a2a5e',
    opacity: 0.7,
    zIndex: 1,
  },
  peekRight: {
    position: 'absolute',
    right: 0,
    top: 16,
    bottom: 16,
    width: 38,
    borderRadius: 12,
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#2a2a5e',
    opacity: 0.7,
    zIndex: 1,
  },
  deckCounter: {
    color: '#555570',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
});
