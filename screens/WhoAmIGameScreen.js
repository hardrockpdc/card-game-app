import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HapticTouchable as TouchableOpacity } from "../components/Haptic";
import GameHeader from "../components/GameHeader";
import EndOfRoundModal from "../components/EndOfRoundModal";
import {
  createGame,
  setSecret,
  askQuestion,
  recordAnswer,
  awardRound,
  toPublic,
  currentAsker,
} from "../game/whoami";
import {
  setServerListeners,
  broadcastToClients,
  sendToClient,
  setClientListeners,
  sendToHost,
  stopServer,
  disconnectFromHost,
} from "../game/GameNetwork";
import { scale, scaleFont } from "../game/responsive";
import { getTableTheme } from "../game/tableThemes";
import { hapticWin, hapticLose } from "../game/haptics";

const TARGET_WINS = 3;
const theme = getTableTheme("whoami");
const BG = theme.table;
const ACCENT = theme.accent;

// Test bots (canned content). They can't truly reason about free text — a bot
// judge picks a secret from this list and answers with simple logic; bot askers
// send generic questions to drive the turns. Enough to exercise the flow solo.
const BOT_DELAY_MS = 1300;
const BOT_SECRETS = [
  "Tom Hanks",
  "Batman",
  "Taylor Swift",
  "a giraffe",
  "Spider-Man",
  "Albert Einstein",
  "Mickey Mouse",
  "a slice of pizza",
  "Serena Williams",
  "Yoda",
];
const BOT_QUESTIONS = [
  "Are you a real person?",
  "Are you fictional?",
  "Are you an animal?",
  "Are you alive today?",
  "Are you in movies?",
  "Are you an athlete?",
  "Are you a musician?",
  "Do you wear a costume?",
];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default function WhoAmIGameScreen({ navigation, route }) {
  const { role, myName, players: initialPlayers } = route.params;
  const isHost = role === "host";
  const myPid = isHost
    ? "host"
    : String(initialPlayers.find((p) => p.name === myName)?.id ?? myName);

  const fullRef = useRef(null); // host authoritative state
  const botTimerRef = useRef(null);
  const [gameState, setGameState] = useState(null); // public view
  const [privateSecret, setPrivateSecret] = useState(null); // { text } — judge only
  const [secretText, setSecretText] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [showRoundModal, setShowRoundModal] = useState(false);

  // ── Host: apply + broadcast state ───────────────────────────────────────────
  function applyState(newState) {
    fullRef.current = newState;
    const pub = toPublic(newState);
    setGameState(pub);

    const amJudge =
      String(newState.players[newState.judgeIndex]?.id) === myPid;
    setPrivateSecret(amJudge && newState.secret ? newState.secret : null);

    broadcastToClients({ type: "GAME_STATE", state: pub });
    // The secret is sent ONLY to the current judge (never in the public state).
    if (newState.secret) {
      const judgeId = String(newState.players[newState.judgeIndex]?.id);
      if (judgeId !== "host") {
        sendToClient(judgeId, { type: "PRIVATE_SECRET", secret: newState.secret });
      }
    }
  }

  // ── Init (host deals the game) ──────────────────────────────────────────────
  useEffect(() => {
    if (!isHost) return;
    const s = createGame(initialPlayers, { target: TARGET_WINS });
    s.judgeIndex = Math.floor(Math.random() * s.players.length);
    applyState(s);
  }, []);

  // ── Host server listeners ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isHost) return;
    setServerListeners({
      onClientJoined: () => {},
      onClientLeft: () => {},
      onMessage: (msg, clientId) => {
        const s = fullRef.current;
        if (!s) return;
        const clientPid = String(clientId);
        const judgeId = String(s.players[s.judgeIndex]?.id);
        const askerId = String(currentAsker(s)?.id ?? "");

        switch (msg.type) {
          case "SET_SECRET":
            if (clientPid !== judgeId || s.phase !== "choosing") return;
            applyState(setSecret(s, msg.text));
            break;
          case "ASK_QUESTION":
            if (
              clientPid !== askerId ||
              s.phase !== "asking" ||
              s.pendingQuestion
            )
              return;
            applyState(askQuestion(s, msg.text));
            break;
          case "JUDGE_ANSWER":
            if (clientPid !== judgeId || !s.pendingQuestion) return;
            applyState(
              msg.answer === "gotit"
                ? awardRound(s)
                : recordAnswer(s, msg.answer),
            );
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
        if (msg.type === "PRIVATE_SECRET") setPrivateSecret(msg.secret ?? null);
      },
      onDisconnected: () =>
        Alert.alert("Disconnected", "Lost connection to the host.", [
          { text: "OK", onPress: () => navigation.navigate("Home") },
        ]),
    });
  }, []);

  // Clear stale inputs / secret as the round and phase change.
  useEffect(() => {
    if (gameState?.phase === "choosing") {
      setPrivateSecret(null);
      setSecretText("");
    }
    setQuestionText("");
  }, [gameState?.phase, gameState?.roundNumber]);

  // Game-over modal + haptics.
  useEffect(() => {
    if (gameState?.phase !== "gameOver") return;
    setShowRoundModal(true);
    if (String(gameState.winner?.id) === myPid) hapticWin();
    else hapticLose();
  }, [gameState?.phase]);

  // Host drives the test bots: when the current actor (judge or asker) is a bot,
  // auto-act after a short delay so the flow can be exercised on one device.
  useEffect(() => {
    if (!isHost) return;
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    const s = fullRef.current;
    if (!s || s.phase === "gameOver") return;

    let actorIsBot = false;
    if (s.phase === "choosing") actorIsBot = !!s.players[s.judgeIndex]?.isAI;
    else if (s.phase === "asking")
      actorIsBot = s.pendingQuestion
        ? !!s.players[s.judgeIndex]?.isAI
        : !!currentAsker(s)?.isAI;
    if (!actorIsBot) return;

    botTimerRef.current = setTimeout(() => {
      const cur = fullRef.current;
      if (!cur) return;
      if (cur.phase === "choosing" && cur.players[cur.judgeIndex]?.isAI) {
        applyState(setSecret(cur, pick(BOT_SECRETS)));
      } else if (cur.phase === "asking") {
        const judgeIsBot = !!cur.players[cur.judgeIndex]?.isAI;
        if (cur.pendingQuestion && judgeIsBot) {
          const secret = (cur.secret?.text || "").toLowerCase();
          const q = (cur.pendingQuestion.question || "").toLowerCase();
          if (secret && q.includes(secret)) applyState(awardRound(cur));
          else
            applyState(recordAnswer(cur, Math.random() < 0.35 ? "yes" : "no"));
        } else if (!cur.pendingQuestion && currentAsker(cur)?.isAI) {
          applyState(askQuestion(cur, pick(BOT_QUESTIONS)));
        }
      }
    }, BOT_DELAY_MS);
  }, [
    isHost,
    gameState?.phase,
    gameState?.roundNumber,
    gameState?.askerIndex,
    gameState?.pendingQuestion,
  ]);

  useEffect(
    () => () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    },
    [],
  );

  // ── Actions (host applies directly; clients send to host) ───────────────────
  function handleSetSecret() {
    const t = secretText.trim();
    if (!t) return;
    if (isHost) applyState(setSecret(fullRef.current, t));
    else {
      setPrivateSecret({ text: t }); // optimistic so the judge sees it instantly
      sendToHost({ type: "SET_SECRET", text: t });
    }
    setSecretText("");
  }

  function handleAsk() {
    const t = questionText.trim();
    if (!t) return;
    if (isHost) applyState(askQuestion(fullRef.current, t));
    else sendToHost({ type: "ASK_QUESTION", text: t });
    setQuestionText("");
  }

  function handleAnswer(answer) {
    if (isHost) {
      const s = fullRef.current;
      applyState(answer === "gotit" ? awardRound(s) : recordAnswer(s, answer));
    } else {
      sendToHost({ type: "JUDGE_ANSWER", answer });
    }
  }

  function handleQuit() {
    if (isHost) stopServer();
    else disconnectFromHost();
    navigation.navigate("Home");
  }

  function handlePlayAgain() {
    if (!isHost) return;
    setShowRoundModal(false);
    const s = createGame(initialPlayers, { target: TARGET_WINS });
    s.judgeIndex = Math.floor(Math.random() * s.players.length);
    applyState(s);
  }

  useEffect(() => {
    const onBack = () => {
      Alert.alert("Leave game?", "You'll leave this game.", [
        { text: "Stay", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: handleQuit },
      ]);
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => sub.remove();
  }, []);

  const menuItems = [{ type: "quit", onQuit: handleQuit }];

  // ── Derived view data ───────────────────────────────────────────────────────
  const phase = gameState?.phase;
  const players = gameState?.players ?? [];
  const judge = players[gameState?.judgeIndex];
  const judgeName = judge?.name ?? "the judge";
  const amJudge = String(gameState?.currentJudgeId) === myPid;
  const amAsker = String(gameState?.currentAskerId) === myPid;
  const pending = gameState?.pendingQuestion;
  const askerName =
    players.find((p) => String(p.id) === String(gameState?.currentAskerId))
      ?.name ?? "someone";

  const winnerName =
    String(gameState?.winner?.id) === myPid
      ? "You win!"
      : `${gameState?.winner?.name ?? "Someone"} wins!`;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: BG }]}>
      <GameHeader gameId="whoami" title="Who Am I?" menuItems={menuItems} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={scale(8)}
      >
        {!gameState ? (
          <View style={styles.center}>
            <Text style={styles.muted}>Setting up…</Text>
          </View>
        ) : (
          <>
            {/* Scoreboard */}
            <View style={styles.scoreRow}>
              {players.map((p) => {
                const isJudge = String(p.id) === String(gameState.currentJudgeId);
                return (
                  <View
                    key={String(p.id)}
                    style={[
                      styles.scoreChip,
                      isJudge && { borderColor: ACCENT },
                    ]}
                  >
                    <Text style={styles.scoreName} numberOfLines={1}>
                      {p.name}
                      {p.isAI ? " 🤖" : ""}
                      {isJudge ? " 🎙️" : ""}
                    </Text>
                    <Text style={[styles.scoreVal, { color: ACCENT }]}>
                      {p.score}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.roundLine}>
              Round {gameState.roundNumber} · first to {gameState.target} wins
            </Text>

            {/* ── Phase-specific controls (above the history so the keyboard
                never hides the text input) ── */}
            {phase === "choosing" &&
              (amJudge ? (
                <View style={styles.panel}>
                  <Text style={styles.prompt}>
                    You're the judge — type something for everyone to guess
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={secretText}
                    onChangeText={setSecretText}
                    placeholder="e.g. Tom Hanks, Batman, a giraffe…"
                    placeholderTextColor="#7a7a8c"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSetSecret}
                  />
                  <PrimaryButton label="Set It" onPress={handleSetSecret} />
                </View>
              ) : (
                <View style={styles.panel}>
                  <Text style={styles.muted}>
                    Waiting for {judgeName} to pick something to guess…
                  </Text>
                </View>
              ))}

            {phase === "asking" && amJudge && (
              <View style={styles.panel}>
                <Text style={styles.secretBadge}>
                  Your secret: {privateSecret?.text ?? "…"}
                </Text>
                {pending ? (
                  <>
                    <Text style={styles.prompt}>
                      <Text style={styles.qaWho}>{pending.askerName} asks: </Text>
                      {pending.question}
                    </Text>
                    <View style={styles.judgeBtns}>
                      <AnswerButton
                        label="Yes"
                        color="#2e7d32"
                        onPress={() => handleAnswer("yes")}
                      />
                      <AnswerButton
                        label="No"
                        color="#b23b3b"
                        onPress={() => handleAnswer("no")}
                      />
                    </View>
                    <PrimaryButton
                      label="🎉 You got it!"
                      onPress={() => handleAnswer("gotit")}
                    />
                  </>
                ) : (
                  <Text style={styles.muted}>
                    Waiting for {askerName} to ask…
                  </Text>
                )}
              </View>
            )}

            {phase === "asking" && !amJudge && (
              <View style={styles.panel}>
                {amAsker && !pending ? (
                  <>
                    <Text style={styles.prompt}>Your turn — ask a yes/no question</Text>
                    <TextInput
                      style={styles.input}
                      value={questionText}
                      onChangeText={setQuestionText}
                      placeholder="Are you a real person?"
                      placeholderTextColor="#7a7a8c"
                      autoFocus
                      returnKeyType="send"
                      onSubmitEditing={handleAsk}
                    />
                    <PrimaryButton label="Ask" onPress={handleAsk} />
                  </>
                ) : pending ? (
                  <Text style={styles.muted}>
                    {judgeName} is answering {pending.askerName}’s question…
                  </Text>
                ) : (
                  <Text style={styles.muted}>{askerName} is asking…</Text>
                )}
              </View>
            )}

            {/* Q&A history (fills the space below the controls) */}
            <ScrollView
              style={styles.history}
              contentContainerStyle={styles.historyContent}
            >
              {(gameState.history ?? []).length === 0 ? (
                <Text style={styles.muted}>
                  {phase === "choosing"
                    ? `${judgeName} is the judge this round.`
                    : "No questions yet — start asking!"}
                </Text>
              ) : (
                gameState.history
                  .map((h, i) => ({ h, i }))
                  .reverse()
                  .map(({ h, i }) => (
                    <View key={`h-${i}`} style={styles.qaRow}>
                    <Text style={styles.qaQ}>
                      <Text style={styles.qaWho}>{h.askerName}: </Text>
                      {h.question}
                    </Text>
                    <Text
                      style={[
                        styles.qaA,
                        h.answer === "gotit" && { color: "#7CFFB2" },
                        h.answer === "yes" && { color: "#7CFFB2" },
                        h.answer === "no" && { color: "#ff6b6b" },
                      ]}
                    >
                      {h.answer === "gotit"
                        ? "🎉 Got it!"
                        : h.answer === "yes"
                          ? "Yes"
                          : "No"}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </>
        )}
      </KeyboardAvoidingView>

      <EndOfRoundModal
        visible={showRoundModal}
        title={winnerName}
        message=""
        showContinue={isHost}
        showLeave
        isGameOver
        onContinue={handlePlayAgain}
        onLeave={() => {
          handleQuit();
        }}
        tableColor={BG}
      />
    </SafeAreaView>
  );
}

function PrimaryButton({ label, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, { backgroundColor: ACCENT }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function AnswerButton({ label, color, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.answerBtn, { backgroundColor: color }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.answerBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: {
    color: "#b8b8c8",
    fontSize: scaleFont(15),
    textAlign: "center",
    lineHeight: scaleFont(21),
  },
  scoreRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
    paddingHorizontal: scale(14),
    paddingTop: scale(10),
  },
  scoreChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(999),
    borderWidth: 1.5,
    borderColor: "#3a3a52",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  scoreName: {
    color: "#e6e6f0",
    fontSize: scaleFont(13),
    fontWeight: "700",
    maxWidth: scale(110),
  },
  scoreVal: { fontSize: scaleFont(14), fontWeight: "900" },
  roundLine: {
    color: "#8a8a9c",
    fontSize: scaleFont(12),
    textAlign: "center",
    marginTop: scale(8),
  },
  history: {
    flex: 1,
    marginHorizontal: scale(14),
    marginTop: scale(10),
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: "#2c2c40",
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  historyContent: { padding: scale(12), gap: scale(10) },
  qaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: scale(10),
  },
  qaQ: { flex: 1, color: "#e6e6f0", fontSize: scaleFont(14), lineHeight: scaleFont(19) },
  qaWho: { color: ACCENT, fontWeight: "800" },
  qaA: { fontSize: scaleFont(14), fontWeight: "900" },
  panel: {
    padding: scale(14),
    gap: scale(10),
    borderTopWidth: 1,
    borderTopColor: "#2c2c40",
  },
  prompt: {
    color: "#f4f4fb",
    fontSize: scaleFont(15),
    fontWeight: "700",
    textAlign: "center",
    lineHeight: scaleFont(21),
  },
  secretBadge: {
    color: "#fff",
    fontSize: scaleFont(15),
    fontWeight: "900",
    textAlign: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: scale(10),
    paddingVertical: scale(8),
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: "#3a3a52",
    color: "#fff",
    fontSize: scaleFont(16),
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
  },
  primaryBtn: {
    borderRadius: scale(14),
    alignItems: "center",
    paddingVertical: scale(14),
  },
  primaryBtnText: { color: "#0c0c14", fontSize: scaleFont(16), fontWeight: "900" },
  judgeBtns: { flexDirection: "row", gap: scale(10) },
  answerBtn: {
    flex: 1,
    borderRadius: scale(14),
    alignItems: "center",
    paddingVertical: scale(14),
  },
  answerBtnText: { color: "#fff", fontSize: scaleFont(16), fontWeight: "900" },
});
