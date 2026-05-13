import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { createDeck, shuffleDeck } from "../game/deck";
import { addCoins } from "../game/wallet";
import { saveGame, loadGame, clearGame } from "../game/gameSaves";
import { recordWin } from "../game/profile";
import { getTableTheme } from "../game/tableThemes";

const BG = getTableTheme("gofish").table;
const SAVE_KEY_GOFISH = "@cardnight:save:gofish";
import { SafeAreaView } from "react-native-safe-area-context";
import Card from "../components/Card";
import { scale, scaleFont } from "../game/responsive";
import GameHeader from "../components/GameHeader";
import EndOfRoundModal from "../components/EndOfRoundModal";
import StatsStrip from "../components/StatsStrip";
import {
  setServerListeners,
  broadcastToClients,
  sendToClient,
  setClientListeners,
  sendToHost,
  stopServer,
  disconnectFromHost,
} from "../game/GameNetwork";

// ─── Game logic ───────────────────────────────────────────────────────────────

function dealGoFish(playerList) {
  let deck = shuffleDeck(createDeck());
  const perPlayer = playerList.length === 2 ? 7 : 5;
  const hands = {};
  let i = 0;
  for (const p of playerList) {
    hands[String(p.id)] = deck.slice(i, i + perPlayer);
    i += perPlayer;
  }
  let state = {
    phase: "playing",
    ocean: deck.slice(i),
    hands,
    books: Object.fromEntries(playerList.map((p) => [String(p.id), []])),
    currentPlayerIndex: 0,
    extraTurn: false,
    lastAction: null,
    players: playerList,
    winner: null,
    history: [],
  };
  for (const p of playerList) state = checkBooks(state, String(p.id));
  return state;
}

function checkBooks(state, pid) {
  const hand = state.hands[pid] || [];
  const counts = {};
  for (const c of hand) counts[c.rank] = (counts[c.rank] || 0) + 1;
  let newHand = [...hand];
  let newBooks = [...(state.books[pid] || [])];
  for (const [rank, n] of Object.entries(counts)) {
    if (n === 4) {
      newHand = newHand.filter((c) => c.rank !== rank);
      newBooks.push(rank);
    }
  }
  return {
    ...state,
    hands: { ...state.hands, [pid]: newHand },
    books: { ...state.books, [pid]: newBooks },
  };
}

function checkWin(state) {
  const totalBooks = Object.values(state.books).reduce(
    (s, b) => s + b.length,
    0,
  );
  const allEmpty = Object.values(state.hands).every((h) => h.length === 0);
  if (totalBooks === 13 || (allEmpty && state.ocean.length === 0)) {
    const maxBooks = Math.max(
      ...Object.values(state.books).map((b) => b.length),
      0,
    );
    const winnerId = Object.entries(state.books).find(
      ([, b]) => b.length === maxBooks,
    )?.[0];
    const winner =
      state.players.find((p) => String(p.id) === winnerId) || state.players[0];
    return { ...state, phase: "results", winner };
  }
  return state;
}

function nextTurn(state) {
  let nextIdx = (state.currentPlayerIndex + 1) % state.players.length;
  let s = { ...state, currentPlayerIndex: nextIdx, extraTurn: false };
  // If the next player has no cards but ocean has cards, draw one for them
  const nextPid = String(s.players[nextIdx].id);
  if (s.hands[nextPid].length === 0 && s.ocean.length > 0) {
    const [drawn, ...rest] = s.ocean;
    s = { ...s, ocean: rest, hands: { ...s.hands, [nextPid]: [drawn] } };
  }
  return s;
}

function doAsk(state, fromId, targetId, rank) {
  const fromPid = String(fromId);
  const toPid = String(targetId);
  if (!state.hands[fromPid]?.some((c) => c.rank === rank)) return state;

  const targetHand = state.hands[toPid] || [];
  const matching = targetHand.filter((c) => c.rank === rank);
  const fromName = state.players.find((p) => String(p.id) === fromPid)?.name;
  const toName = state.players.find((p) => String(p.id) === toPid)?.name;
  const newHistory = [
    ...(state.history || []),
    { fromPid, toPid, rank, gotCards: matching.length > 0 },
  ];

  let s;
  let extraTurn = false;
  let lastAction;

  if (matching.length > 0) {
    s = {
      ...state,
      history: newHistory,
      hands: {
        ...state.hands,
        [toPid]: targetHand.filter((c) => c.rank !== rank),
        [fromPid]: [...state.hands[fromPid], ...matching],
      },
    };
    extraTurn = true;
    lastAction = `${fromName} asked ${toName} for ${rank}s — got ${matching.length}! 🎉`;
  } else if (state.ocean.length > 0) {
    const [drawn, ...rest] = state.ocean;
    s = {
      ...state,
      history: newHistory,
      ocean: rest,
      hands: { ...state.hands, [fromPid]: [...state.hands[fromPid], drawn] },
    };
    extraTurn = drawn.rank === rank;
    lastAction = extraTurn
      ? `${fromName} went fishing and caught a ${rank}! Extra turn! ⭐`
      : `${fromName} asked for ${rank}s — Go Fish! 🐟`;
  } else {
    s = { ...state, history: newHistory };
    lastAction = `${fromName} asked for ${rank}s — Go Fish! (Ocean empty) 🌊`;
  }

  s = checkBooks(s, fromPid);
  s = checkWin(s);
  if (s.phase === "results") return { ...s, lastAction };

  if (extraTurn) return { ...s, extraTurn: true, lastAction };
  return { ...nextTurn(s), extraTurn: false, lastAction };
}

function toPublic(state) {
  return {
    phase: state.phase,
    oceanSize: state.ocean.length,
    handSizes: Object.fromEntries(
      Object.entries(state.hands).map(([id, h]) => [id, h.length]),
    ),
    books: state.books,
    currentPlayerIndex: state.currentPlayerIndex,
    extraTurn: state.extraTurn,
    lastAction: state.lastAction,
    players: state.players,
    winner: state.winner,
  };
}

// ─── AI ───────────────────────────────────────────────────────────────────────

function pickGoFishAIMove(state, aiPid, opponents, difficulty) {
  const hand = state.hands[aiPid] || [];
  const history = state.history || [];

  if (difficulty === "easy") {
    const rank = hand[Math.floor(Math.random() * hand.length)].rank;
    const target = opponents[Math.floor(Math.random() * opponents.length)];
    return { rank, target };
  }

  // Rank with most cards (Medium + Hard start here)
  const counts = {};
  for (const c of hand) counts[c.rank] = (counts[c.rank] || 0) + 1;
  const bestRank = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

  if (difficulty === "medium") {
    // Check last 8 asks for someone who gave this rank
    const recentGiverPid = [...history]
      .reverse()
      .find(
        (h) =>
          h.rank === bestRank &&
          h.gotCards &&
          opponents.some((o) => String(o.id) === h.toPid),
      )?.toPid;
    const target = recentGiverPid
      ? (opponents.find((o) => String(o.id) === recentGiverPid) ??
        opponents[Math.floor(Math.random() * opponents.length)])
      : opponents[Math.floor(Math.random() * opponents.length)];
    return { rank: bestRank, target };
  }

  // Hard: score each opponent from full history
  const scores = {};
  for (const opp of opponents) {
    const oppPid = String(opp.id);
    scores[oppPid] = 0;
    for (const h of history) {
      if (h.toPid === oppPid && h.rank === bestRank) {
        scores[oppPid] = h.gotCards
          ? scores[oppPid] + 2
          : Math.max(scores[oppPid] - 1, 0);
      }
      if (h.fromPid === oppPid && h.rank === bestRank && h.gotCards) {
        scores[oppPid] += 1;
      }
    }
  }
  const maxScore = Math.max(...opponents.map((o) => scores[String(o.id)]));
  const target =
    maxScore > 0
      ? (opponents.find((o) => scores[String(o.id)] === maxScore) ??
        opponents[0])
      : opponents[Math.floor(Math.random() * opponents.length)];
  return { rank: bestRank, target };
}

// ─── Hand sort ────────────────────────────────────────────────────────────────

const RANK_ORDER = {
  A: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  10: 10,
  J: 11,
  Q: 12,
  K: 13,
};
function sortHand(hand) {
  return [...hand].sort(
    (a, b) => (RANK_ORDER[a.rank] ?? 99) - (RANK_ORDER[b.rank] ?? 99),
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GoFishGameScreen({ navigation, route }) {
  const {
    role,
    myName,
    players: initialPlayers,
    difficulty = "medium",
  } = route.params;
  const isSinglePlayer = role === "singleplayer";
  const isHost = role === "host" || isSinglePlayer;

  const [gameState, setGameState] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const [selectedRank, setSelectedRank] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [showRoundModal, setShowRoundModal] = useState(false);
  const fullRef = useRef(null);
  const coinRewardedRef = useRef(false);
  const aiTimerRef = useRef(null);
  function applyState(next) {
    fullRef.current = next;
    setMyHand(next.hands["host"] ?? []);
    setGameState(toPublic(next));
    if (!isSinglePlayer) {
      broadcastToClients({ type: "GAME_STATE", ...toPublic(next) });
      next.players.forEach((p) => {
        if (p.id !== "host") {
          sendToClient(p.id, {
            type: "PRIVATE_HAND",
            hand: next.hands[String(p.id)] ?? [],
          });
        }
      });
    }
    scheduleAI(next);
  }

  function scheduleAI(state) {
    if (!isHost || state.phase !== "playing") return;
    const currentP = state.players[state.currentPlayerIndex];
    if (!currentP?.isAI) return;
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    aiTimerRef.current = setTimeout(
      () => {
        const s = fullRef.current;
        if (!s || s.phase !== "playing") return;
        const cp = s.players[s.currentPlayerIndex];
        if (!cp?.isAI) return;
        const aiPid = String(cp.id);
        const hand = s.hands[aiPid] || [];
        if (hand.length === 0) return;
        const opponents = s.players.filter(
          (_, i) => i !== s.currentPlayerIndex,
        );
        if (opponents.length === 0) return;
        const { rank, target } = pickGoFishAIMove(
          s,
          aiPid,
          opponents,
          difficulty,
        );
        applyState(doAsk(s, aiPid, target.id, rank));
      },
      1000 + Math.random() * 600,
    );
  }

  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

  // Auto-save after each state change in single-player.
  useEffect(() => {
    if (!isSinglePlayer || !fullRef.current) return;
    if (gameState?.phase === "results") {
      clearGame(SAVE_KEY_GOFISH);
      return;
    }
    saveGame(SAVE_KEY_GOFISH, { fullState: fullRef.current });
  }, [gameState]);

  useEffect(() => {
    if (!isHost) return;

    async function init() {
      if (isSinglePlayer && route?.params?.resumeFromSave) {
        const saved = await loadGame(SAVE_KEY_GOFISH);
        if (saved?.fullState) {
          applyState(saved.fullState);
          return;
        }
      }
      applyState(dealGoFish(initialPlayers));
    }
    init();

    if (!isSinglePlayer) {
      setServerListeners({
        onMessage: (msg, clientId) => {
          const state = fullRef.current;
          if (!state || msg.type !== "ACTION" || msg.action !== "ask") return;
          if (
            state.players.findIndex((p) => p.id === clientId) !==
            state.currentPlayerIndex
          )
            return;
          applyState(doAsk(state, clientId, msg.targetId, msg.rank));
        },
      });
    }
  }, []);

  useEffect(() => {
    if (isHost) return;
    setClientListeners({
      onMessage: (msg) => {
        if (msg.type === "GAME_STATE") setGameState(msg);
        if (msg.type === "PRIVATE_HAND") setMyHand(msg.hand);
      },
      onDisconnected: () =>
        Alert.alert("Disconnected", "Lost connection to the host.", [
          { text: "OK", onPress: () => navigation.navigate("Home") },
        ]),
    });
  }, []);

  function handleAsk() {
    if (!selectedRank || selectedTarget === null) return;
    if (isHost) {
      const state = fullRef.current;
      if (
        !state ||
        state.players.findIndex((p) => p.id === "host") !==
          state.currentPlayerIndex
      )
        return;
      applyState(doAsk(state, "host", selectedTarget, selectedRank));
    } else {
      sendToHost({
        type: "ACTION",
        action: "ask",
        targetId: selectedTarget,
        rank: selectedRank,
      });
    }
    setSelectedRank(null);
    setSelectedTarget(null);
  }

  useEffect(() => {
    if (!isSinglePlayer) return;
    const isWon =
      gameState?.phase === "results" && gameState?.winner?.id === "host";
    if (isWon && !coinRewardedRef.current) {
      coinRewardedRef.current = true;
      addCoins(500).then(() => setCoinsEarned(500));
      recordWin("gofish");
    }
    if (gameState?.phase !== "results") {
      coinRewardedRef.current = false;
      setCoinsEarned(0);
    }
  }, [gameState?.phase, gameState?.winner]);

  useEffect(() => {
    if (gameState?.phase === "results") setShowRoundModal(true);
  }, [gameState?.phase]);

  function handleQuit() {
    if (isSinglePlayer) clearGame(SAVE_KEY_GOFISH);
    else if (isHost) stopServer();
    else disconnectFromHost();
    navigation.navigate("Home");
  }

  function handleRestart() {
    if (isSinglePlayer) clearGame(SAVE_KEY_GOFISH);
    applyState(dealGoFish(initialPlayers));
  }

  function handleSaveAndExit() {
    if (!isSinglePlayer || !fullRef.current) return;
    saveGame(SAVE_KEY_GOFISH, { fullState: fullRef.current });
    navigation.navigate("Home");
  }

  const menuItems = [
    {
      type: "restart",
      onRestart: isHost ? handleRestart : null,
      disabled: !isHost,
    },
    ...(isSinglePlayer
      ? [{ type: "saveexit", onSaveExit: handleSaveAndExit }]
      : []),
    { type: "howto", gameId: "gofish" },
    { type: "theme" },
    { type: "divider" },
    { type: "quit", onQuit: handleQuit },
  ];

  if (!gameState) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Dealing cards…</Text>
      </View>
    );
  }

  const {
    phase,
    oceanSize,
    handSizes,
    books,
    currentPlayerIndex,
    extraTurn,
    lastAction,
    players,
    winner,
  } = gameState;
  const myIndex = players.findIndex((p) =>
    isHost ? p.id === "host" : p.name === myName,
  );
  const myPlayer = players[myIndex];
  const isMyTurn = currentPlayerIndex === myIndex;
  const currentPlayer = players[currentPlayerIndex];
  const displayHand = sortHand(myHand);

  return (
    <SafeAreaView style={styles.screenRoot}>
      <GameHeader
        gameId="gofish"
        title="Go Fish"
        subtitle={isSinglePlayer ? "Single Player" : "Multiplayer"}
        menuItems={menuItems}
      />
      <StatsStrip
        gameId="gofish"
        items={[
          {
            label: "Phase",
            value:
              phase === "results"
                ? "Results"
                : phase === "playing"
                  ? "Playing"
                  : phase,
          },
          {
            label: "Turn",
            value:
              isMyTurn && phase !== "results"
                ? extraTurn
                  ? "Extra Turn"
                  : "Your Turn"
                : `Turn: ${currentPlayer?.name ?? "—"}`,
          },
          { label: "Ocean", value: oceanSize, accent: true },
        ]}
      />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Banner */}
        <View
          style={[styles.banner, phase === "results" && styles.bannerResults]}
        >
          <Text style={styles.bannerText}>
            {phase === "results"
              ? `🏆  ${winner?.name} wins!`
              : isMyTurn && extraTurn
                ? "⭐  Extra turn!"
                : isMyTurn
                  ? "▶  Your turn"
                  : `Waiting for ${currentPlayer?.name}…`}
          </Text>
        </View>

        {/* Last action message */}
        {lastAction ? (
          <View style={styles.actionBox}>
            <Text style={styles.actionText}>{lastAction}</Text>
          </View>
        ) : null}

        {/* Ocean + Books summary */}
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>🌊 Ocean</Text>
            <Text style={styles.infoValue}>{oceanSize} cards</Text>
          </View>
          {players.map((p) => (
            <View key={String(p.id)} style={styles.infoCard}>
              <Text style={styles.infoLabel}>
                {p.name}
                {String(p.id) === String(myPlayer?.id) ? " (you)" : ""}
              </Text>
              <Text style={styles.infoValue}>
                {books[String(p.id)]?.length ?? 0} 📚
              </Text>
              <Text style={styles.infoSub}>
                {handSizes[String(p.id)] ?? 0} cards
              </Text>
            </View>
          ))}
        </View>

        {/* Other players — tap to select as target */}
        {isMyTurn && phase === "playing" && (
          <View style={styles.targetSection}>
            <Text style={styles.sectionLabel}>Ask who?</Text>
            <View style={styles.targetRow}>
              {players.map((p, idx) => {
                if (idx === myIndex) return null;
                const isSelected = selectedTarget === p.id;
                return (
                  <TouchableOpacity
                    key={String(p.id)}
                    style={[
                      styles.targetBtn,
                      isSelected && styles.targetBtnSelected,
                    ]}
                    onPress={() => setSelectedTarget(isSelected ? null : p.id)}
                  >
                    <Text
                      style={[
                        styles.targetBtnText,
                        isSelected && styles.targetBtnTextSelected,
                      ]}
                    >
                      {p.name}
                    </Text>
                    <Text style={styles.targetCardCount}>
                      {handSizes[String(p.id)] ?? 0} cards
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* My hand */}
        <View style={styles.mySection}>
          <Text style={styles.myLabel}>
            Your Hand ({displayHand.length} cards)
          </Text>
          {isMyTurn && phase === "playing" && (
            <Text style={styles.myHint}>
              Tap a card to pick the rank you want to ask for
            </Text>
          )}
          <View style={styles.handRow}>
            {displayHand.map((card) => {
              const isSelected = card.rank === selectedRank;
              return (
                <TouchableOpacity
                  key={card.id}
                  onPress={() => {
                    if (isMyTurn && phase === "playing")
                      setSelectedRank(
                        selectedRank === card.rank ? null : card.rank,
                      );
                  }}
                  style={[
                    styles.cardWrap,
                    isSelected && styles.cardSelected,
                    !isMyTurn && styles.cardDim,
                  ]}
                >
                  <Card rank={card.rank} suit={card.suit} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Ask button */}
        {isMyTurn && phase === "playing" && (
          <TouchableOpacity
            style={[
              styles.askBtn,
              (!selectedRank || selectedTarget === null) && styles.askBtnDimmed,
            ]}
            onPress={handleAsk}
            disabled={!selectedRank || selectedTarget === null}
          >
            <Text style={styles.askBtnText}>
              {selectedRank && selectedTarget !== null
                ? `Ask for ${selectedRank}s →`
                : "Pick a rank and a player first"}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <EndOfRoundModal
        visible={showRoundModal}
        title={`🏆 ${winner?.name ?? "Game Over"}!`}
        message={coinsEarned > 0 ? `+${coinsEarned} coins!` : ""}
        showContinue={isHost}
        showLeave
        onContinue={() => {
          setShowRoundModal(false);
          coinRewardedRef.current = false;
          setCoinsEarned(0);
          setSelectedRank(null);
          setSelectedTarget(null);
          applyState(dealGoFish(initialPlayers));
        }}
        onLeave={handleQuit}
        tableColor={BG}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: BG },
  loading: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { color: "#fff", fontSize: scaleFont(18) },
  container: {
    flexGrow: 1,
    backgroundColor: BG,
    padding: scale(14),
    paddingBottom: scale(40),
  },

  banner: {
    backgroundColor: "#e94560",
    borderRadius: scale(10),
    paddingVertical: scale(10),
    alignItems: "center",
    marginBottom: scale(10),
  },
  bannerResults: { backgroundColor: "#0d3d2e" },
  bannerText: { color: "#fff", fontSize: scaleFont(16), fontWeight: "bold" },

  actionBox: {
    backgroundColor: "#16213e",
    borderRadius: scale(10),
    padding: scale(12),
    marginBottom: scale(10),
    borderLeftWidth: 3,
    borderLeftColor: "#e94560",
  },
  actionText: { color: "#fff", fontSize: scaleFont(14) },

  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
    marginBottom: scale(12),
  },
  infoCard: {
    flex: 1,
    minWidth: scale(80),
    backgroundColor: "#16213e",
    borderRadius: scale(10),
    padding: scale(10),
    alignItems: "center",
  },
  infoLabel: {
    color: "#b0b0c0",
    fontSize: scaleFont(11),
    textAlign: "center",
    marginBottom: scale(4),
  },
  infoValue: { color: "#fff", fontSize: scaleFont(20), fontWeight: "bold" },
  infoSub: { color: "#666680", fontSize: scaleFont(11), marginTop: scale(2) },

  sectionLabel: {
    color: "#b0b0c0",
    fontSize: scaleFont(12),
    textTransform: "uppercase",
    letterSpacing: scale(1),
    marginBottom: scale(8),
  },

  targetSection: { marginBottom: scale(12) },
  targetRow: { flexDirection: "row", flexWrap: "wrap", gap: scale(10) },
  targetBtn: {
    flex: 1,
    minWidth: scale(100),
    backgroundColor: "#16213e",
    borderRadius: scale(10),
    padding: scale(14),
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#334",
  },
  targetBtnSelected: { backgroundColor: "#e94560", borderColor: "#e94560" },
  targetBtnText: { color: "#fff", fontSize: scaleFont(16), fontWeight: "bold" },
  targetBtnTextSelected: { color: "#fff" },
  targetCardCount: {
    color: "#aaa",
    fontSize: scaleFont(12),
    marginTop: scale(4),
  },

  mySection: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: scale(12),
    padding: scale(12),
    marginBottom: scale(12),
  },
  myLabel: {
    color: "#fff",
    fontSize: scaleFont(15),
    fontWeight: "bold",
    marginBottom: scale(6),
  },
  myHint: { color: "#888", fontSize: scaleFont(12), marginBottom: scale(10) },
  handRow: { flexDirection: "row", flexWrap: "wrap" },
  cardWrap: { borderRadius: scale(6) },
  cardSelected: {
    transform: [{ translateY: -10 }],
    shadowColor: "#ffd700",
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 10,
  },
  cardDim: { opacity: 0.55 },

  askBtn: {
    backgroundColor: "#e94560",
    borderRadius: scale(10),
    paddingVertical: scale(16),
    alignItems: "center",
    marginBottom: scale(12),
  },
  askBtnDimmed: { backgroundColor: "#6b2535" },
  askBtnText: { color: "#fff", fontSize: scaleFont(17), fontWeight: "bold" },
});
