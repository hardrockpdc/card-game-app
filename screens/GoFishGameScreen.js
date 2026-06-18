import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  BackHandler,
} from "react-native";
import { HapticTouchable as TouchableOpacity } from "../components/Haptic";
import {
  dealGoFish,
  doAsk,
  toPublic,
  pickGoFishAIMove,
  sortHand,
} from "../game/gofish";
import { addCoins } from "../game/wallet";
import { saveGame, loadGame, clearGame } from "../game/gameSaves";
import { recordWin } from "../game/profile";
import { getTableTheme } from "../game/tableThemes";
import { hapticWin, hapticLose } from "../game/haptics";
import {
  GOFISH_TABLES,
  getGofishTableId,
  setGofishTable,
  subscribeGofishTable,
} from "../game/gofishTheme";
import TableThemePicker from "../components/TableThemePicker";

const BG = getTableTheme("gofish").table;
const SAVE_KEY_GOFISH = "@cardnight:save:gofish";
import { SafeAreaView } from "react-native-safe-area-context";
import Card from "../components/Card";
import { scale, scaleFont } from "../game/responsive";
import GameHeader from "../components/GameHeader";
import EndOfRoundModal from "../components/EndOfRoundModal";
import YourTurnBanner from "../components/YourTurnBanner";
import useYourTurnBanner from "../components/useYourTurnBanner";
import {
  setServerListeners,
  broadcastToClients,
  sendToClient,
  setClientListeners,
  sendToHost,
  stopServer,
  disconnectFromHost,
} from "../game/GameNetwork";

const AI_MOVE_DELAY_MS = 700; // delay between AI opponent moves (ms)

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
  const [tableId, setTableId] = useState(getGofishTableId());
  const [showTablePicker, setShowTablePicker] = useState(false);
  const fullRef = useRef(null);
  const coinRewardedRef = useRef(false);
  const outcomeBuzzedRef = useRef(false); // fire win/lose haptic once per game
  const aiTimerRef = useRef(null);
  const hasMountedRef = useRef(false);
  const lastSaveRef = useRef(0); // BUG-4: auto-save throttle (once / 3s)
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
    aiTimerRef.current = setTimeout(() => {
      const s = fullRef.current;
      if (!s || s.phase !== "playing") return;
      const cp = s.players[s.currentPlayerIndex];
      if (!cp?.isAI) return;
      const aiPid = String(cp.id);
      const hand = s.hands[aiPid] || [];
      if (hand.length === 0) return;
      const opponents = s.players.filter((_, i) => i !== s.currentPlayerIndex);
      if (opponents.length === 0) return;
      try {
        const { rank, target } = pickGoFishAIMove(
          s,
          aiPid,
          opponents,
          difficulty,
        );
        applyState(doAsk(s, aiPid, target.id, rank));
      } catch (err) {}
    }, AI_MOVE_DELAY_MS);
  }

  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

  // Keep the table palette in sync (loaded at app start; may change via the
  // in-game Table Theme picker).
  useEffect(() => {
    setTableId(getGofishTableId());
    return subscribeGofishTable((id) => setTableId(id));
  }, []);

  const pal = GOFISH_TABLES.find((t) => t.id === tableId) ?? GOFISH_TABLES[0];

  // Auto-save after each state change in single-player.
  useEffect(() => {
    if (!isSinglePlayer || !fullRef.current) return;
    if (gameState?.phase === "results") {
      clearGame(SAVE_KEY_GOFISH);
      return;
    }
    // BUG-4: throttle to once / 3s.
    const now = Date.now();
    if (now - lastSaveRef.current < 3000) return;
    lastSaveRef.current = now;
    saveGame(SAVE_KEY_GOFISH, { fullState: fullRef.current });
  }, [gameState]);

  useEffect(() => {
    if (!isHost) return;

    async function init() {
      if (isSinglePlayer && route?.params?.resumeFromSave) {
        const saved = await loadGame(SAVE_KEY_GOFISH);
        if (saved?.fullState) {
          applyState(saved.fullState);
          // UX-3: enable the deal animation on the NEXT tick so the RESTORED
          // hand appears instantly (no replayed deal); cards drawn later still
          // animate normally.
          setTimeout(() => {
            hasMountedRef.current = true;
          }, 0);
          return;
        }
      }
      hasMountedRef.current = true;
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
    // Win/lose buzz, once per finished game.
    if (gameState?.phase === "results" && !outcomeBuzzedRef.current) {
      outcomeBuzzedRef.current = true;
      if (isWon) hapticWin();
      else hapticLose();
    }
    if (gameState?.phase !== "results") {
      coinRewardedRef.current = false;
      outcomeBuzzedRef.current = false;
      setCoinsEarned(0);
    }
  }, [gameState?.phase, gameState?.winner]);

  useEffect(() => {
    if (gameState?.phase === "results") {
      setShowRoundModal(true);
    }
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

  // UX-5: Android hardware back confirmation
  useEffect(() => {
    const onBack = () => {
      const message = isSinglePlayer
        ? "Your progress will be saved."
        : isHost
          ? "You'll end the game for everyone."
          : "You'll disconnect from the host.";
      Alert.alert("Leave Game?", message, [
        { text: "Stay", style: "cancel" },
        {
          text: "Leave",
          style: isSinglePlayer ? "default" : "destructive",
          onPress: () => {
            if (isSinglePlayer) {
              if (typeof handleSaveAndExit === "function") handleSaveAndExit();
              else navigation.navigate("Home");
            } else {
              if (isHost) stopServer();
              else disconnectFromHost();
              navigation.navigate("Home");
            }
          },
        },
      ]);
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => sub.remove();
  }, [navigation, isSinglePlayer, isHost]);

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
    {
      icon: "🎨",
      label: "Table Theme",
      onPress: () => setShowTablePicker(true),
    },
    { type: "divider" },
    { type: "quit", onQuit: handleQuit },
  ];

  // "Your Turn!" banner — flash when the turn flips to me. Computed above the
  // early return so the hook runs every render (hooks-order rule).
  const _players = gameState?.players ?? [];
  const _myIndex = _players.findIndex((p) =>
    isHost ? p.id === "host" : p.name === myName,
  );
  const showTurnBanner = useYourTurnBanner(
    !!gameState && _myIndex !== -1 && gameState.currentPlayerIndex === _myIndex,
    gameState?.phase === "playing",
  );

  if (!gameState) {
    return (
      <View style={[styles.loading, { backgroundColor: pal.rail }]}>
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
    <SafeAreaView style={[styles.screenRoot, { backgroundColor: pal.rail }]}>
      <GameHeader
        gameId="gofish"
        title="Go Fish"
        subtitle={isSinglePlayer ? "Single Player" : "Multiplayer"}
        menuItems={menuItems}
      />
      <View
        style={[
          styles.felt,
          { backgroundColor: pal.felt, borderColor: pal.feltBorder },
        ]}
      >
        {/* Opponents seated; on your turn, tap a seat to choose who to ask */}
        <View style={styles.seatsRow}>
          {players.map((p, idx) => {
            if (idx === myIndex) return null;
            const pid = String(p.id);
            const isActive = idx === currentPlayerIndex && phase !== "results";
            const isWinner = phase === "results" && String(winner?.id) === pid;
            const canTarget = isMyTurn && phase === "playing";
            const isSelected = selectedTarget === p.id;
            return (
              <TouchableOpacity
                key={pid}
                activeOpacity={canTarget ? 0.7 : 1}
                disabled={!canTarget}
                onPress={() => setSelectedTarget(isSelected ? null : p.id)}
                style={[
                  styles.seat,
                  { backgroundColor: pal.panel, borderColor: pal.panelBorder },
                  isActive && {
                    backgroundColor: pal.accentBg,
                    borderColor: pal.accent,
                  },
                  isWinner && styles.seatWinner,
                  isSelected && styles.seatSelected,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Ask ${p.name}`}
              >
                <Text style={styles.seatName} numberOfLines={1}>
                  {isWinner ? "🏆 " : ""}
                  {isActive ? "▶ " : ""}
                  {p.name}
                </Text>
                <Text style={styles.seatBooks}>
                  📚 {books[pid]?.length ?? 0}
                </Text>
                <Text style={styles.seatCards}>{handSizes[pid] ?? 0} cards</Text>
                {canTarget ? (
                  <Text
                    style={[
                      styles.seatTap,
                      isSelected && styles.seatTapSelected,
                    ]}
                  >
                    {isSelected ? "✓ asking" : "tap to ask"}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Center: the ocean (draw pool) + your books + status */}
        <View style={styles.board}>
          <View
            style={[
              styles.oceanPill,
              { backgroundColor: pal.panel, borderColor: pal.accent },
            ]}
          >
            <Text style={[styles.oceanLabel, { color: pal.accent }]}>
              🌊 OCEAN
            </Text>
            <Text style={styles.oceanValue}>{oceanSize}</Text>
          </View>
          <Text style={styles.myBooksText}>
            Your books: {books[String(myPlayer?.id)]?.length ?? 0}
          </Text>
          <Text
            style={[styles.statusLine, { color: pal.text }]}
            numberOfLines={1}
          >
            {phase === "results"
              ? `🏆 ${winner?.name} wins!`
              : isMyTurn && extraTurn
                ? "⭐ Extra turn!"
                : isMyTurn
                  ? selectedTarget !== null
                    ? `Asking ${players.find((p) => p.id === selectedTarget)?.name ?? ""}…`
                    : "▶ Your turn"
                  : `Waiting for ${currentPlayer?.name}…`}
          </Text>
          {lastAction ? (
            <Text style={styles.lastActionLine} numberOfLines={2}>
              {lastAction}
            </Text>
          ) : null}
        </View>

        {/* You: hand + ask */}
        <View style={[styles.youArea, { borderTopColor: pal.panelBorder }]}>
          <View style={styles.youLabelRow}>
            <Text style={styles.youLabel}>Your Hand ({displayHand.length})</Text>
            {isMyTurn && phase === "playing" ? (
              <Text style={styles.youHint}>tap a rank</Text>
            ) : null}
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.handScroll}
            contentContainerStyle={styles.handGrid}
          >
            {displayHand.map((card, index) => {
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
                  <Card
                    rank={card.rank}
                    suit={card.suit}
                    small
                    animateDeal={hasMountedRef.current}
                    dealDelay={displayHand.length <= 7 ? index * 100 : 0}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {isMyTurn && phase === "playing" ? (
            <TouchableOpacity
              style={[
                styles.askBtn,
                (!selectedRank || selectedTarget === null) &&
                  styles.askBtnDimmed,
              ]}
              onPress={handleAsk}
              disabled={!selectedRank || selectedTarget === null}
              accessibilityRole="button"
              accessibilityLabel={
                selectedRank && selectedTarget !== null
                  ? `Ask for ${selectedRank}s`
                  : "Ask"
              }
              accessibilityState={{
                disabled: !selectedRank || selectedTarget === null,
              }}
            >
              <Text style={styles.askBtnText}>
                {selectedRank && selectedTarget !== null
                  ? `Ask ${players.find((p) => p.id === selectedTarget)?.name ?? ""} for ${selectedRank}s →`
                  : "Pick a rank and a player"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

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

      <TableThemePicker
        visible={showTablePicker}
        tables={GOFISH_TABLES}
        currentId={tableId}
        onPick={(id) => {
          setGofishTable(id);
          setTableId(id);
          setShowTablePicker(false);
        }}
        onClose={() => setShowTablePicker(false)}
      />

      <YourTurnBanner visible={showTurnBanner} />
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

  felt: {
    flex: 1,
    margin: scale(10),
    borderRadius: scale(16),
    borderWidth: 1,
    paddingBottom: scale(4),
  },

  seatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: scale(10),
    paddingHorizontal: scale(10),
    paddingTop: scale(10),
  },
  seat: {
    width: scale(120),
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: "transparent",
    paddingVertical: scale(8),
    paddingHorizontal: scale(8),
  },
  seatActive: {
    borderColor: "#ffd700",
    backgroundColor: "rgba(255,215,0,0.10)",
  },
  seatWinner: {
    borderColor: "#4caf50",
    backgroundColor: "rgba(76,175,80,0.16)",
  },
  seatSelected: {
    borderColor: "#e94560",
    backgroundColor: "rgba(233,69,96,0.16)",
  },
  seatName: {
    color: "#fff",
    fontSize: scaleFont(13),
    fontWeight: "800",
    maxWidth: scale(112),
    textAlign: "center",
  },
  seatBooks: {
    color: "#ffd700",
    fontSize: scaleFont(13),
    fontWeight: "700",
    marginTop: scale(3),
  },
  seatCards: { color: "#cfe0e6", fontSize: scaleFont(11), marginTop: scale(1) },
  seatTap: {
    color: "#9fd0dd",
    fontSize: scaleFont(10),
    fontWeight: "700",
    marginTop: scale(4),
  },
  seatTapSelected: { color: "#ff8aa0" },

  board: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: scale(10),
    paddingHorizontal: scale(12),
  },
  oceanPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
    backgroundColor: "rgba(0,0,0,0.34)",
    borderRadius: scale(999),
    borderWidth: 1,
    borderColor: "rgba(168,230,255,0.4)",
    paddingVertical: scale(8),
    paddingHorizontal: scale(22),
  },
  oceanLabel: {
    color: "#a8e6ff",
    fontSize: scaleFont(13),
    fontWeight: "800",
    letterSpacing: scale(1.5),
  },
  oceanValue: { color: "#fff", fontSize: scaleFont(24), fontWeight: "900" },
  myBooksText: {
    color: "#ffd700",
    fontSize: scaleFont(14),
    fontWeight: "700",
  },
  statusLine: {
    color: "#fff",
    fontSize: scaleFont(15),
    fontWeight: "700",
    textAlign: "center",
  },
  lastActionLine: {
    color: "#d7eef5",
    fontSize: scaleFont(12),
    textAlign: "center",
  },

  youArea: {
    paddingHorizontal: scale(12),
    paddingTop: scale(8),
    gap: scale(8),
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  youLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  youLabel: { color: "#fff", fontSize: scaleFont(14), fontWeight: "800" },
  youHint: { color: "#9fd0dd", fontSize: scaleFont(12), fontWeight: "700" },
  // ~2 rows of small cards tall; wraps and scrolls if the hand grows.
  handScroll: { maxHeight: scale(154), flexGrow: 0 },
  handGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: scale(8),
    gap: scale(4),
  },
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
