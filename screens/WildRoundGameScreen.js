import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Animated,
  BackHandler,
  PanResponder,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GameHeader from "../components/GameHeader";
import EndOfRoundModal from "../components/EndOfRoundModal";
import StatsStrip from "../components/StatsStrip";
import {
  createDeck,
  dealHands,
  pickPrompt,
  processSubmission,
  pickWinner,
  checkWin,
} from "../game/wildround";
import {
  setServerListeners,
  broadcastToClients,
  getConnectedPlayers,
  sendToClient,
  setClientListeners,
  sendToHost,
  stopServer,
  disconnectFromHost,
} from "../game/GameNetwork";
import { scale, scaleFont } from "../game/responsive";
import { getTableTheme } from "../game/tableThemes";

const WIN_SCORE = 10;
const BG = getTableTheme("wildround").table;

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
    roundNumber: state.roundNumber,
    promptSkipped: state.promptSkipped,
    currentPrompt: state.phase === "judgeSkip" ? null : state.currentPrompt,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      handSize: (p.hand ?? []).length,
    })),
    submissionCount: state.submissions.length,
    submitterIds: state.submissions.map((s) => s.playerId),
    anonymousSubmissions:
      state.phase === "judging"
        ? (state.submissionsForJudging ?? state.submissions).map((s) => ({
            cardId: s.cardId,
            cardText: s.cardText,
          }))
        : [],
    revealSubmissions:
      state.phase === "reveal" ? (state.revealSubmissions ?? []) : [],
    lastWinnerId: state.lastWinnerId,
    lastWinningCardId: state.lastWinningCardId,
    winner: state.winner,
  };
}

export default function WildRoundGameScreen({ navigation, route }) {
  const {
    role,
    myName,
    players: initialPlayers,
    tone: gameTone = "family",
  } = route.params;
  const isSinglePlayer = role === "singleplayer";
  const isHost = role === "host" || isSinglePlayer;
  const myPid = isHost
    ? "host"
    : String(initialPlayers.find((p) => p.name === myName)?.id ?? myName);

  const fullRef = useRef(null);
  const lastPromptRef = useRef(null);
  const [gameState, setGameState] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const [privateJudgePrompt, setPrivateJudgePrompt] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [deckIndex, setDeckIndex] = useState(0);
  const [judgeDeckIndex, setJudgeDeckIndex] = useState(0);
  const [viewerDeckIndex, setViewerDeckIndex] = useState(0);
  const [showRoundModal, setShowRoundModal] = useState(false);
  const { width, height } = useWindowDimensions();
  const [revealIndex, setRevealIndex] = useState(0);
  useEffect(() => {
    if (privateJudgePrompt) lastPromptRef.current = privateJudgePrompt;
    if (gameState?.currentPrompt)
      lastPromptRef.current = gameState.currentPrompt;
  }, [privateJudgePrompt, gameState?.currentPrompt]);

  useEffect(() => {
    if (!gameState || gameState.phase !== "gameOver") return;
    setShowRoundModal(true);
  }, [gameState?.phase]);
  const revealCardWidth = Math.max(width - 32, 0);
  const revealCardHeight = Math.round(height * 0.38);

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
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => dragX.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) {
          const next = Math.min(
            deckIndexRef.current + 1,
            myHandRef.current.length - 1,
          );
          if (next !== deckIndexRef.current) {
            cardEntryX.setValue(80);
            deckIndexRef.current = next;
            setDeckIndex(next);
            Animated.spring(cardEntryX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 120,
              friction: 10,
            }).start();
          }
        } else if (g.dx > 50) {
          const next = Math.max(deckIndexRef.current - 1, 0);
          if (next !== deckIndexRef.current) {
            cardEntryX.setValue(-80);
            deckIndexRef.current = next;
            setDeckIndex(next);
            Animated.spring(cardEntryX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 120,
              friction: 10,
            }).start();
          }
        }
        Animated.spring(dragX, { toValue: 0, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragX, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;

  const judgePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => judgeCardDragX.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        const subs = judgeSubsRef.current;
        if (g.dx < -50) {
          const next = Math.min(judgeIndexRef.current + 1, subs.length - 1);
          if (next !== judgeIndexRef.current) {
            judgeCardEntryX.setValue(80);
            judgeIndexRef.current = next;
            setJudgeDeckIndex(next);
            Animated.spring(judgeCardEntryX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 120,
              friction: 10,
            }).start();
          }
        } else if (g.dx > 50) {
          const next = Math.max(judgeIndexRef.current - 1, 0);
          if (next !== judgeIndexRef.current) {
            judgeCardEntryX.setValue(-80);
            judgeIndexRef.current = next;
            setJudgeDeckIndex(next);
            Animated.spring(judgeCardEntryX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 120,
              friction: 10,
            }).start();
          }
        }
        Animated.spring(judgeCardDragX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(judgeCardDragX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  const viewerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => viewerCardDragX.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        const subs = viewerSubsRef.current;
        if (g.dx < -50) {
          const next = Math.min(viewerIndexRef.current + 1, subs.length - 1);
          if (next !== viewerIndexRef.current) {
            viewerCardEntryX.setValue(80);
            viewerIndexRef.current = next;
            setViewerDeckIndex(next);
            Animated.spring(viewerCardEntryX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 120,
              friction: 10,
            }).start();
          }
        } else if (g.dx > 50) {
          const next = Math.max(viewerIndexRef.current - 1, 0);
          if (next !== viewerIndexRef.current) {
            viewerCardEntryX.setValue(-80);
            viewerIndexRef.current = next;
            setViewerDeckIndex(next);
            Animated.spring(viewerCardEntryX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 120,
              friction: 10,
            }).start();
          }
        }
        Animated.spring(viewerCardDragX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(viewerCardDragX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  // ── applyState ──────────────────────────────────────────────────────────────
  function applyState(newState) {
    fullRef.current = newState;
    const pub = toPublic(newState);
    setGameState(pub);

    if (isHost) {
      const me = newState.players.find((p) => String(p.id) === myPid);
      setMyHand(me?.hand ?? []);
      const amJudge =
        String(newState.players[newState.judgeIndex]?.id) === myPid;
      setPrivateJudgePrompt(
        newState.phase === "judgeSkip" && amJudge
          ? newState.currentPrompt
          : null,
      );
    }

    if (!isSinglePlayer) {
      broadcastToClients({ type: "GAME_STATE", state: pub });
      getConnectedPlayers().forEach(({ id: clientId }) => {
        const player = newState.players.find(
          (p) => String(p.id) === String(clientId),
        );
        if (!player) return;
        const msg = { type: "PRIVATE_HAND", hand: player.hand };
        const isClientJudge =
          String(newState.players[newState.judgeIndex]?.id) ===
          String(clientId);
        if (newState.phase === "judgeSkip" && isClientJudge)
          msg.judgePrompt = newState.currentPrompt;
        sendToClient(clientId, msg);
      });
    }
  }

  function transitionToJudging(s) {
    applyState({
      ...s,
      phase: "judging",
      submissionsForJudging: localShuffle([...s.submissions]),
    });
  }

  function advanceRound(s) {
    const nextJudgeIndex = (s.judgeIndex + 1) % s.players.length;
    const { prompt, promptDeck } = pickPrompt(s.promptDeck);
    applyState({
      ...s,
      phase: "judgeSkip",
      judgeIndex: nextJudgeIndex,
      roundNumber: (s.roundNumber ?? 1) + 1,
      currentPrompt: prompt,
      promptDeck,
      promptSkipped: false,
      submissions: [],
      submissionsForJudging: [],
      revealSubmissions: [],
      lastWinnerId: null,
      lastWinningCardId: null,
    });
  }

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isHost) startNewGame();
  }, []);

  function startNewGame() {
    const deck = createDeck(gameTone);
    const { players, answerDeck } = dealHands(initialPlayers, deck.answers);
    const judgeIndex = Math.floor(Math.random() * players.length);
    const { prompt, promptDeck } = pickPrompt(deck.prompts);
    applyState({
      tone: gameTone,
      phase: "judgeSkip",
      roundNumber: 1,
      players,
      judgeIndex,
      promptDeck,
      answerDeck,
      currentPrompt: prompt,
      promptSkipped: false,
      submissions: [],
      submissionsForJudging: [],
      revealSubmissions: [],
      lastWinnerId: null,
      lastWinningCardId: null,
      winner: null,
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
          case "JUDGE_KEEP_PROMPT":
            if (clientPid !== judgeId || s.phase !== "judgeSkip") return;
            applyState({ ...s, phase: "submission" });
            break;
          case "JUDGE_SKIP_PROMPT":
            if (
              clientPid !== judgeId ||
              s.phase !== "judgeSkip" ||
              s.promptSkipped
            )
              return;
            {
              const deck = [...s.promptDeck];
              deck.splice(
                Math.floor(Math.random() * (deck.length + 1)),
                0,
                s.currentPrompt,
              );
              const { prompt, promptDeck } = pickPrompt(deck);
              applyState({
                ...s,
                currentPrompt: prompt,
                promptDeck,
                promptSkipped: true,
                phase: "submission",
              });
            }
            break;
          case "SUBMIT_CARD":
            if (s.phase !== "submission") return;
            try {
              const newS = processSubmission(s, clientPid, msg.cardId);
              const nonJudges = newS.players.filter(
                (_, i) => i !== newS.judgeIndex,
              );
              const allDone = nonJudges.every((p) =>
                newS.submissions.some((sub) => sub.playerId === String(p.id)),
              );
              allDone ? transitionToJudging(newS) : applyState(newS);
            } catch (_) {}
            break;
          case "JUDGE_PICK_WINNER":
            if (clientPid !== judgeId || s.phase !== "judging") return;
            {
              const newS = pickWinner(s, msg.cardId);
              const w = checkWin(newS);
              applyState(w ? { ...newS, phase: "gameOver", winner: w } : newS);
            }
            break;
          case "NEXT_ROUND":
            if (s.phase !== "reveal") return;
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
        if (msg.type === "GAME_STATE") setGameState(msg.state);
        if (msg.type === "PRIVATE_HAND") {
          setMyHand(msg.hand ?? []);
          setPrivateJudgePrompt(msg.judgePrompt ?? null);
        }
      },
      onDisconnected: () => {
        Alert.alert("Disconnected", "Lost connection to the host.", [
          { text: "OK", onPress: () => navigation.navigate("Home") },
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
    setRevealIndex(0);
  }, [gameState?.phase]);

  // UX-5: Android hardware back confirmation.
  // Must stay ABOVE the `if (!gameState)` loading guard below — all hooks must
  // run before any early return, or the hook count changes between renders and
  // the screen crashes (see CLAUDE.md §2.1).
  useEffect(() => {
    const onBack = () => {
      Alert.alert(
        "Leave Game?",
        isHost
          ? "You'll end the game for everyone."
          : "You'll disconnect from the host.",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: () => {
              if (isHost) stopServer();
              else disconnectFromHost();
              navigation.navigate("Home");
            },
          },
        ],
      );
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => sub.remove();
  }, [navigation, isHost]);

  // ── AI automation (singleplayer only) ──────────────────────────────────────
  const aiPhase = gameState?.phase;
  const aiJudgeIndex = gameState?.judgeIndex;
  useEffect(() => {
    if (!isSinglePlayer || !gameState) return;
    const s = fullRef.current;
    if (!s) return;
    const isAIJudge = s.players[s.judgeIndex]?.id !== myPid;

    if (gameState.phase === "judgeSkip" && isAIJudge) {
      const t = setTimeout(() => {
        const cur = fullRef.current;
        if (!cur || cur.phase !== "judgeSkip") return;
        const shouldSkip = !cur.promptSkipped && Math.random() < 0.5;
        if (shouldSkip) {
          const deck = [...cur.promptDeck];
          deck.splice(
            Math.floor(Math.random() * (deck.length + 1)),
            0,
            cur.currentPrompt,
          );
          const { prompt, promptDeck } = pickPrompt(deck);
          applyState({
            ...cur,
            currentPrompt: prompt,
            promptDeck,
            promptSkipped: true,
            phase: "submission",
          });
        } else {
          applyState({ ...cur, phase: "submission" });
        }
      }, 1200);
      return () => clearTimeout(t);
    }

    if (gameState.phase === "submission") {
      const t = setTimeout(() => {
        const cur = fullRef.current;
        if (!cur || cur.phase !== "submission") return;
        let next = cur;
        const nonJudges = cur.players.filter((_, i) => i !== cur.judgeIndex);
        for (const p of nonJudges) {
          if (!p.isAI) continue;
          if (next.submissions.some((sub) => sub.playerId === String(p.id)))
            continue;
          const card = p.hand[Math.floor(Math.random() * p.hand.length)];
          try {
            next = processSubmission(next, p.id, card.id);
          } catch (_) {}
        }
        const allDone = nonJudges.every((p) =>
          next.submissions.some((sub) => sub.playerId === String(p.id)),
        );
        const humanIsNonJudge = nonJudges.some((p) => p.id === myPid);
        const humanSubmitted = next.submissions.some(
          (sub) => sub.playerId === myPid,
        );
        if (allDone && (!humanIsNonJudge || humanSubmitted)) {
          transitionToJudging(next);
        } else {
          applyState(next);
        }
      }, 900);
      return () => clearTimeout(t);
    }

    if (gameState.phase === "judging" && isAIJudge) {
      const t = setTimeout(() => {
        const cur = fullRef.current;
        if (!cur || cur.phase !== "judging") return;
        const subs = cur.submissionsForJudging ?? cur.submissions;
        if (!subs.length) return;
        const sub = subs[Math.floor(Math.random() * subs.length)];
        const newS = pickWinner(cur, sub.cardId);
        const w = checkWin(newS);
        applyState(w ? { ...newS, phase: "gameOver", winner: w } : newS);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [aiPhase, aiJudgeIndex]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleKeepPrompt() {
    if (isHost) applyState({ ...fullRef.current, phase: "submission" });
    else sendToHost({ type: "JUDGE_KEEP_PROMPT" });
  }

  function handleSkipPrompt() {
    if (isHost) {
      const s = fullRef.current;
      const deck = [...s.promptDeck];
      deck.splice(
        Math.floor(Math.random() * (deck.length + 1)),
        0,
        s.currentPrompt,
      );
      const { prompt, promptDeck } = pickPrompt(deck);
      applyState({
        ...s,
        currentPrompt: prompt,
        promptDeck,
        promptSkipped: true,
        phase: "submission",
      });
    } else {
      sendToHost({ type: "JUDGE_SKIP_PROMPT" });
    }
  }

  function handleSubmitCard() {
    if (!selectedCard) return;
    if (isHost) {
      const s = fullRef.current;
      try {
        const newS = processSubmission(s, myPid, selectedCard);
        const nonJudges = newS.players.filter((_, i) => i !== newS.judgeIndex);
        const allDone = nonJudges.every((p) =>
          newS.submissions.some((sub) => sub.playerId === String(p.id)),
        );
        allDone ? transitionToJudging(newS) : applyState(newS);
      } catch (e) {
        Alert.alert("Error", e.message);
      }
    } else {
      sendToHost({ type: "SUBMIT_CARD", cardId: selectedCard });
      setGameState((prev) =>
        prev
          ? { ...prev, submitterIds: [...(prev.submitterIds ?? []), myPid] }
          : prev,
      );
    }
    setSelectedCard(null);
  }

  function handlePickWinner() {
    if (!selectedSub) return;
    Alert.alert("Pick this answer?", "Award the point?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, pick it!",
        onPress: () => {
          if (isHost) {
            const newS = pickWinner(fullRef.current, selectedSub);
            const w = checkWin(newS);
            applyState(w ? { ...newS, phase: "gameOver", winner: w } : newS);
          } else {
            sendToHost({ type: "JUDGE_PICK_WINNER", cardId: selectedSub });
          }
          setSelectedSub(null);
        },
      },
    ]);
  }

  function handleNextRound() {
    if (isHost) {
      const s = fullRef.current;
      if (s?.phase !== "reveal") return;
      advanceRound(s);
    } else {
      sendToHost({ type: "NEXT_ROUND" });
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
  const displayPrompt =
    isJudge && gs.phase === "judgeSkip" ? privateJudgePrompt : gs.currentPrompt;

  // ── Main game ───────────────────────────────────────────────────────────────
  const menuItems = [
    {
      type: "restart",
      onRestart: isHost ? startNewGame : null,
      disabled: !isHost,
    },
    { type: "howto", gameId: "wildround" },
    { type: "theme" },
    { type: "divider" },
    {
      type: "quit",
      onQuit: () => {
        if (isHost) stopServer();
        else disconnectFromHost();
        navigation.navigate("Home");
      },
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <GameHeader
        gameId="wildround"
        title="Wild Round"
        subtitle={isSinglePlayer ? "Single Player" : "Multiplayer"}
        menuItems={menuItems}
      />
      <StatsStrip
        gameId="wildround"
        items={[
          {
            label: "Score",
            value:
              gs.players.find((p) => String(p.id) === String(myPid))?.score ??
              0,
            accent: true,
          },
          { label: "Round", value: gs.roundNumber ?? 1 },
          { label: "Judge", value: gs.players?.[gs.judgeIndex]?.name ?? "—" },
          {
            label: "To Win",
            value:
              WIN_SCORE -
              (gs.players.find((p) => String(p.id) === String(myPid))?.score ??
                0),
          },
        ]}
      />
      {/* Prompt box */}
      {gs.phase !== "reveal" && (
        <>
          {displayPrompt ? (
            <View style={styles.revealPromptSection}>
              <Text style={styles.revealPromptLabel}>THIS ROUND'S PROMPT</Text>
              <View style={styles.promptBox}>
                <Text style={styles.promptText}>{displayPrompt.text}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.waitText}>
              {gs.phase === "judgeSkip"
                ? `⚖️ ${judge?.name} is choosing a prompt…`
                : "…"}
            </Text>
          )}
        </>
      )}

      {/* judgeSkip — human judge */}
      {gs.phase === "judgeSkip" && isJudge && (
        <View style={styles.centreSection}>
          <Text style={styles.hintText}>
            {gs.promptSkipped
              ? "You already skipped — this prompt is locked in."
              : "Keep this prompt, or skip once to draw a new one."}
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleKeepPrompt}
            accessibilityRole="button"
            accessibilityLabel="Keep this prompt"
            accessibilityHint="Lock in the current prompt and proceed"
          >
            <Text style={styles.primaryBtnText}>Keep this prompt ✓</Text>
          </TouchableOpacity>
          {!gs.promptSkipped && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleSkipPrompt}
              accessibilityRole="button"
              accessibilityLabel="Skip — draw new prompt"
              accessibilityHint="Discard this prompt and draw a different one"
            >
              <Text style={styles.secondaryBtnText}>
                Skip — draw new prompt
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* judgeSkip — waiting */}
      {gs.phase === "judgeSkip" && !isJudge && (
        <View style={styles.centreSection}>
          <Text style={styles.waitText}>
            ⚖️ {judge?.name} is reviewing the prompt…
          </Text>
        </View>
      )}

      {/* submission — human is judge */}
      {gs.phase === "submission" && isJudge && (
        <View style={styles.centreSection}>
          <Text style={styles.waitText}>
            Waiting for {pendingCount} player{pendingCount !== 1 ? "s" : ""} to
            submit…
          </Text>
        </View>
      )}

      {/* submission — human submitting */}
      {gs.phase === "submission" && !isJudge && !hasSubmitted && (
        <>
          <View style={styles.deckArea}>
            <FlatList
              data={myHand}
              keyExtractor={(item) => String(item.id)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={revealCardWidth}
              decelerationRate="fast"
              disableIntervalMomentum
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.round(
                  event.nativeEvent.contentOffset.x /
                    Math.max(revealCardWidth, 1),
                );
                setDeckIndex(
                  Math.max(0, Math.min(nextIndex, myHand.length - 1)),
                );
              }}
              style={styles.submissionCarouselList}
              contentContainerStyle={styles.submissionCarouselContent}
              renderItem={({ item }) => {
                const isSelected = selectedCard === item.id;
                return (
                  <View
                    style={[
                      styles.submissionCarouselPage,
                      {
                        width: revealCardWidth,
                        height: revealCardHeight,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        styles.submissionCard,
                        isSelected && styles.submissionCardSelected,
                      ]}
                      onPress={() => {
                        setSelectedCard((prev) =>
                          prev === item.id ? null : item.id,
                        );
                      }}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.submissionCardText}>{item.text}</Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          </View>

          <Text style={styles.deckCounter}>
            {deckIndex + 1} / {myHand.length}
          </Text>

          <View
            style={styles.submissionDotsRow}
            accessibilityElementsHidden={true}
            importantForAccessibility="no-hide-descendants"
          >
            {myHand.map((card, index) => (
              <View
                key={String(card.id)}
                style={[
                  styles.submissionDot,
                  index === deckIndex && styles.submissionDotActive,
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, !selectedCard && styles.btnDimmed]}
            onPress={handleSubmitCard}
            disabled={!selectedCard}
            accessibilityRole="button"
            accessibilityLabel="Submit"
            accessibilityHint="Submit your selected card as your answer"
            accessibilityState={{ disabled: !selectedCard }}
          >
            <Text style={styles.primaryBtnText}>Submit ✓</Text>
          </TouchableOpacity>
        </>
      )}

      {/* submission — already submitted */}
      {gs.phase === "submission" && !isJudge && hasSubmitted && (
        <View style={styles.centreSection}>
          <Text style={styles.waitText}>
            ✅ Submitted! Waiting for {pendingCount} more
            {pendingCount !== 1 ? " players" : ""}…
          </Text>
        </View>
      )}

      {/* judging — human judge */}
      {gs.phase === "judging" &&
        isJudge &&
        (() => {
          judgeSubsRef.current = gs.anonymousSubmissions ?? [];
          return (
            <>
              <Text style={styles.sectionLabel}>Pick the funniest answer</Text>

              <View style={styles.deckArea}>
                {judgeDeckIndex > 0 && (
                  <View style={styles.peekLeft} pointerEvents="none" />
                )}
                {judgeDeckIndex <
                  (gs.anonymousSubmissions?.length ?? 0) - 1 && (
                  <View style={styles.peekRight} pointerEvents="none" />
                )}

                <Animated.View
                  style={[
                    styles.deckCardWrap,
                    {
                      transform: [
                        {
                          translateX: Animated.add(
                            judgeCardDragX,
                            judgeCardEntryX,
                          ),
                        },
                      ],
                    },
                  ]}
                  {...judgePanResponder.panHandlers}
                >
                  <TouchableOpacity
                    style={[
                      styles.deckCard,
                      selectedSub ===
                        gs.anonymousSubmissions?.[judgeDeckIndex]?.cardId &&
                        styles.deckCardSelected,
                    ]}
                    onPress={() => {
                      const card = gs.anonymousSubmissions?.[judgeDeckIndex];
                      if (card)
                        setSelectedSub((prev) =>
                          prev === card.cardId ? null : card.cardId,
                        );
                    }}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.deckCardText}>
                      {gs.anonymousSubmissions?.[judgeDeckIndex]?.cardText}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>

              <Text style={styles.deckCounter}>
                {judgeDeckIndex + 1} / {gs.anonymousSubmissions?.length ?? 0}
              </Text>

              <TouchableOpacity
                style={[styles.primaryBtn, !selectedSub && styles.btnDimmed]}
                onPress={handlePickWinner}
                disabled={!selectedSub}
                accessibilityRole="button"
                accessibilityLabel="Pick this answer"
                accessibilityHint="Select the current answer as the winner"
                accessibilityState={{ disabled: !selectedSub }}
              >
                <Text style={styles.primaryBtnText}>Pick this answer ✓</Text>
              </TouchableOpacity>
            </>
          );
        })()}

      {/* judging — waiting for judge */}
      {gs.phase === "judging" &&
        !isJudge &&
        (() => {
          const subs = gs.anonymousSubmissions ?? [];
          viewerSubsRef.current = subs;
          return (
            <>
              <Text style={styles.sectionLabel}>
                ⚖️ {judge?.name} is deciding…
              </Text>

              {subs.length > 0 ? (
                <>
                  <View style={styles.deckArea}>
                    {viewerDeckIndex > 0 && (
                      <View style={styles.peekLeft} pointerEvents="none" />
                    )}
                    {viewerDeckIndex < subs.length - 1 && (
                      <View style={styles.peekRight} pointerEvents="none" />
                    )}

                    <Animated.View
                      style={[
                        styles.deckCardWrap,
                        {
                          transform: [
                            {
                              translateX: Animated.add(
                                viewerCardDragX,
                                viewerCardEntryX,
                              ),
                            },
                          ],
                        },
                      ]}
                      {...viewerPanResponder.panHandlers}
                    >
                      <View style={styles.deckCard}>
                        <Text style={styles.deckCardText}>
                          {subs[viewerDeckIndex]?.cardText}
                        </Text>
                      </View>
                    </Animated.View>
                  </View>

                  <Text style={styles.deckCounter}>
                    {viewerDeckIndex + 1} / {subs.length}
                  </Text>
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
      {gs.phase === "reveal" &&
        (() => {
          const winSub = gs.revealSubmissions.find(
            (s) => s.cardId === gs.lastWinningCardId,
          );
          const winPlayer = gs.players.find(
            (p) => String(p.id) === String(gs.lastWinnerId),
          );
          const otherSubs = gs.revealSubmissions.filter(
            (s) => s.cardId !== gs.lastWinningCardId,
          );
          const revealCards = [
            ...(winSub
              ? [
                  {
                    ...winSub,
                    playerName: winPlayer?.name ?? "Winner",
                    isWinner: true,
                  },
                ]
              : []),
            ...otherSubs.map((sub) => {
              const player = gs.players.find(
                (p) => String(p.id) === String(sub.playerId),
              );
              return {
                ...sub,
                playerName: player?.name ?? "Unknown player",
                isWinner: false,
              };
            }),
          ];

          return (
            <View style={styles.revealScreen}>
              <View style={styles.revealBody}>
                <View style={styles.revealPromptSection}>
                  <Text style={styles.revealPromptLabel}>
                    THIS ROUND'S PROMPT
                  </Text>
                  <View style={styles.revealPromptCard}>
                    <Text style={styles.revealPromptText}>
                      {lastPromptRef.current?.text ?? "..."}
                    </Text>
                  </View>
                </View>

                <Text style={styles.revealWinnerLabel}>🏆 WINNER</Text>
                <Text style={styles.revealWinnerName}>
                  {winPlayer?.name ?? "Winner"}
                </Text>

                <View style={styles.revealCarouselSection}>
                  <FlatList
                    data={revealCards}
                    keyExtractor={(item) => String(item.cardId)}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={revealCardWidth}
                    decelerationRate="fast"
                    disableIntervalMomentum
                    onMomentumScrollEnd={(event) => {
                      const nextIndex = Math.round(
                        event.nativeEvent.contentOffset.x /
                          Math.max(revealCardWidth, 1),
                      );
                      setRevealIndex(
                        Math.max(
                          0,
                          Math.min(nextIndex, revealCards.length - 1),
                        ),
                      );
                    }}
                    style={styles.revealCarouselList}
                    contentContainerStyle={styles.revealCarouselContent}
                    renderItem={({ item }) => (
                      <View
                        style={[
                          styles.revealCarouselPage,
                          {
                            width: revealCardWidth,
                            height: revealCardHeight,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.revealAnswerCard,
                            item.isWinner
                              ? styles.revealAnswerCardWinner
                              : styles.revealAnswerCardLoser,
                          ]}
                        >
                          <Text style={styles.revealAnswerText}>
                            {item.cardText}
                          </Text>
                          <Text style={styles.revealCardPlayerName}>
                            {item.playerName}
                          </Text>
                        </View>
                      </View>
                    )}
                  />

                  <View
                    style={styles.revealDotsRow}
                    accessibilityElementsHidden={true}
                    importantForAccessibility="no-hide-descendants"
                  >
                    {revealCards.map((card, index) => (
                      <View
                        key={String(card.cardId)}
                        style={[
                          styles.revealDot,
                          index === revealIndex && styles.revealDotActive,
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.revealFooter}>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleNextRound}
                  accessibilityRole="button"
                  accessibilityLabel="Next Round"
                  accessibilityHint="Start the next round"
                >
                  <Text style={styles.primaryBtnText}>Next Round →</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}

      <EndOfRoundModal
        visible={showRoundModal}
        title={`🎉 ${gameState?.winner?.name ?? "Someone"} wins!`}
        message=""
        showContinue={isHost}
        showLeave
        isGameOver
        onContinue={() => {
          setShowRoundModal(false);
          startNewGame();
        }}
        onLeave={() => {
          if (isHost) stopServer();
          else disconnectFromHost();
          navigation.navigate("Home");
        }}
        tableColor={BG}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, padding: scale(16) },

  promptBox: {
    backgroundColor: "#2d1b69",
    borderRadius: scale(16),
    padding: scale(20),
    width: "100%",
  },
  promptText: {
    color: "#ffffff",
    fontSize: scaleFont(22),
    fontWeight: "700",
    textAlign: "center",
    lineHeight: scale(30),
  },

  centreSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: scale(16),
  },
  waitText: { color: "#c4c4d4", fontSize: scaleFont(16), textAlign: "center" },
  hintText: {
    color: "#888",
    fontSize: scaleFont(14),
    textAlign: "center",
    marginBottom: scale(8),
  },
  sectionLabel: {
    color: "#c4c4d4",
    fontSize: scaleFont(12),
    textTransform: "uppercase",
    letterSpacing: scale(1),
    marginBottom: scale(8),
  },

  cardList: { flex: 1, marginBottom: scale(12) },
  answerCard: {
    backgroundColor: "#16213e",
    borderRadius: scale(10),
    borderWidth: 1.5,
    borderColor: "#334",
    padding: scale(14),
    marginBottom: scale(8),
  },
  answerCardSelected: { borderColor: "#e94560", backgroundColor: "#2a1020" },
  answerCardText: {
    color: "#ffffff",
    fontSize: scaleFont(15),
    lineHeight: scale(21),
  },

  primaryBtn: {
    backgroundColor: "#e94560",
    borderRadius: scale(10),
    paddingVertical: scale(14),
    paddingHorizontal: scale(32),
    alignItems: "center",
    marginBottom: scale(10),
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: scaleFont(17),
    fontWeight: "bold",
  },
  secondaryBtn: {
    backgroundColor: "#16213e",
    borderRadius: scale(10),
    borderWidth: 1.5,
    borderColor: "#334",
    paddingVertical: scale(12),
    paddingHorizontal: scale(32),
    alignItems: "center",
    marginBottom: scale(10),
  },
  secondaryBtnText: {
    color: "#c4c4d4",
    fontSize: scaleFont(15),
    fontWeight: "bold",
  },
  btnDimmed: { opacity: 0.4 },

  revealScreen: {
    flex: 1,
  },
  revealBody: {
    flex: 1,
  },
  revealPromptSection: {
    marginBottom: scale(16),
  },
  revealPromptLabel: {
    color: "#888",
    fontSize: scaleFont(11),
    textTransform: "uppercase",
    letterSpacing: scale(2),
    marginBottom: scale(8),
  },
  revealPromptCard: {
    backgroundColor: "#2d1b69",
    borderRadius: scale(16),
    padding: scale(20),
    width: "100%",
  },
  revealPromptText: {
    color: "#ffffff",
    fontSize: scaleFont(22),
    lineHeight: scale(30),
    fontWeight: "700",
    textAlign: "center",
  },
  revealWinnerLabel: {
    color: "#FFD700",
    fontSize: scaleFont(18),
    fontWeight: "800",
    textAlign: "center",
    marginBottom: scale(4),
  },
  revealWinnerName: {
    color: "#ffffff",
    fontSize: scaleFont(16),
    fontWeight: "700",
    textAlign: "center",
    marginBottom: scale(16),
  },
  revealCarouselSection: {
    marginBottom: scale(16),
  },
  revealCarouselList: {
    flexGrow: 0,
  },
  revealCarouselContent: {
    alignItems: "stretch",
  },
  revealCarouselPage: {
    paddingRight: 0,
  },
  revealAnswerCard: {
    flex: 1,
    borderRadius: scale(22),
    paddingHorizontal: scale(20),
    paddingVertical: scale(22),
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1.5,
  },
  revealAnswerCardWinner: {
    backgroundColor: "#35286d",
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 10,
  },
  revealAnswerCardLoser: {
    backgroundColor: "#171a2d",
    borderColor: "#444444",
    opacity: 0.85,
  },
  revealAnswerText: {
    color: "#ffffff",
    fontSize: scaleFont(24),
    lineHeight: scale(32),
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },
  revealCardPlayerName: {
    color: "#c4c4d4",
    fontSize: scaleFont(14),
    textAlign: "center",
    marginTop: scale(16),
  },
  revealDotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: scale(12),
  },
  revealDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginHorizontal: scale(4),
    backgroundColor: "#666666",
  },
  revealDotActive: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: "#FFD700",
  },
  revealScoreLine: {
    color: "#FFD700",
    fontSize: scaleFont(16),
    fontWeight: "700",
    textAlign: "center",
    marginBottom: scale(12),
  },
  revealFooter: {
    marginTop: "auto",
  },

  deckArea: {
    flex: 1,
    position: "relative",
    marginBottom: scale(8),
  },
  deckCardWrap: {
    flex: 1,
    marginHorizontal: scale(26),
    zIndex: 2,
  },
  submissionCarouselList: {
    flexGrow: 0,
  },
  submissionCarouselContent: {
    alignItems: "stretch",
  },
  submissionCarouselPage: {
    flex: 0,
    marginHorizontal: 0,
  },
  submissionCard: {
    flex: 1,
    backgroundColor: "#1a1a3e",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: scale(16),
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    padding: scale(24),
  },
  submissionCardSelected: {
    borderColor: "#ffffff",
  },
  submissionCardText: {
    color: "#ffffff",
    fontSize: scaleFont(22),
    fontWeight: "700",
    textAlign: "center",
    lineHeight: scale(30),
  },
  deckCard: {
    flex: 1,
    backgroundColor: "#1a1a3e",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: scale(16),
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    padding: scale(24),
  },
  deckCardSelected: {
    borderColor: "#ffffff",
  },
  deckCardText: {
    color: "#ffffff",
    fontSize: scaleFont(22),
    fontWeight: "700",
    textAlign: "center",
    lineHeight: scale(30),
  },
  submissionDotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: scale(12),
  },
  submissionDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginHorizontal: scale(4),
    backgroundColor: "#666666",
  },
  submissionDotActive: {
    backgroundColor: "#ffffff",
  },
  peekLeft: {
    position: "absolute",
    left: 0,
    top: scale(16),
    bottom: scale(16),
    width: scale(38),
    borderRadius: scale(12),
    backgroundColor: "#16213e",
    opacity: 0.5,
    zIndex: 1,
  },
  peekRight: {
    position: "absolute",
    right: 0,
    top: scale(16),
    bottom: scale(16),
    width: scale(38),
    borderRadius: scale(12),
    backgroundColor: "#16213e",
    opacity: 0.5,
    zIndex: 1,
  },
  deckCounter: {
    color: "#555570",
    fontSize: scaleFont(13),
    textAlign: "center",
    marginBottom: scale(12),
  },
});
