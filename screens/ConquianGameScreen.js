import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Card from "../components/Card";
import GameHeader from "../components/GameHeader";
import EndOfRoundModal from "../components/EndOfRoundModal";
import StatsStrip from "../components/StatsStrip";
import {
  deal,
  doSelectPassCard,
  doDrawFromStock,
  doLayDownMeld,
  doExtendMeldFromHand,
  doTakeActiveCard,
  doTakeWithBorrow,
  doPassActiveCard,
  doDiscardCard,
  isValidMeld,
  canExtendMeld,
  aiMostIsolated,
  aiBestHandMeld,
  aiCanTake,
  meldedCount,
} from "../game/conquian";
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
import { addCoins } from "../game/wallet";
import { saveGame, loadGame, clearGame } from "../game/gameSaves";
import { recordWin } from "../game/profile";
import { getTableTheme } from "../game/tableThemes";
import TestBotToggle from "../components/TestBotToggle";
import { useTestBot, TEST_BOT_DELAY_MS } from "../game/testBot";
import { botLog, botLogError } from "../game/testBotLogger";

const BG = getTableTheme("conquian").table;
const SAVE_KEY_CONQUIAN = "@cardnight:save:conquian:default";
const SAVE_KEY_CONQUIAN_LEGACY = "@cardnight:save:rummy:conquian";

function toPublic(state) {
  return {
    phase: state.phase,
    players: state.players,
    winTarget: state.winTarget,
    stockSize: state.stock.length,
    deadPileSize: state.deadPile.length,
    activeCard: state.activeCard,
    melds: state.melds,
    handSizes: Object.fromEntries(
      Object.entries(state.hands).map(([id, h]) => [id, h.length]),
    ),
    passSelectionsStatus: Object.fromEntries(
      Object.entries(state.passSelections).map(([id, v]) => [id, v !== null]),
    ),
    currentPlayerIndex: state.currentPlayerIndex,
    turnPhase: state.turnPhase,
    winner: state.winner,
    tie: state.tie,
    originalDrawerIndex: state.originalDrawerIndex,
    activeCardSourcePid: state.activeCardSourcePid,
    chainPassedPids: state.chainPassedPids,
  };
}

export default function ConquianGameScreen({ navigation, route }) {
  const {
    role,
    myName,
    players: initialPlayers,
    difficulty = "medium",
  } = route.params;
  const isSinglePlayer = role === "singleplayer";
  const isHost = role === "host" || isSinglePlayer;

  const PASS_RATES = { easy: 0.5, medium: 0.15, hard: 0.03 };
  const myPid = isHost
    ? "host"
    : String(initialPlayers.find((p) => p.name === myName)?.id ?? myName);

  const fullRef = useRef(null);
  const coinRewardedRef = useRef(false);
  const aiTimerRef = useRef(null);
  const hasMountedRef = useRef(false);
  const botRestartTimerRef = useRef(null);
  const { enabled: botEnabled } = useTestBot();
  const botEnabledRef = useRef(false);
  const [gameState, setGameState] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const [selectedHandIds, setSelectedHandIds] = useState(new Set());
  const [selectedMeldIdx, setSelectedMeldIdx] = useState(null);
  const [passCardId, setPassCardId] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [showRoundModal, setShowRoundModal] = useState(false);

  // Borrow mode state
  const [borrowMode, setBorrowMode] = useState(false);
  const [borrowGroups, setBorrowGroups] = useState([]);
  const [borrowPool, setBorrowPool] = useState([]);
  const [borrowSelCardId, setBorrowSelCardId] = useState(null);

  // Wipe any legacy Conquián save (old key "@cardnight:save:rummy:conquian")
  // to rule out a stale-schema crash. Runs once on mount.
  useEffect(() => {
    clearGame(SAVE_KEY_CONQUIAN_LEGACY).catch(() => {});
  }, []);

  // Reset passCardId when phase changes (handles new game deal for clients)
  useEffect(() => {
    if (gameState?.phase !== "initialPass") setPassCardId(null);
  }, [gameState?.phase]);

  // After the first render completes, flag mount-complete so future deals animate.
  // Prevents cards present at mount (resume / network arrival) from sliding in.
  useEffect(() => {
    const timer = setTimeout(() => {
      hasMountedRef.current = true;
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // ─── State management ────────────────────────────────────────────────────────

  function applyState(next) {
    fullRef.current = next;
    setMyHand(next.hands[myPid] ?? []);
    const pub = toPublic(next);
    setGameState(pub);
    setSelectedHandIds(new Set());
    setSelectedMeldIdx(null);
    setStatusMsg("");
    if (!isSinglePlayer) {
      broadcastToClients({ type: "GAME_STATE", ...pub });
      next.players.forEach((p) => {
        if (String(p.id) !== "host") {
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
    const cp = state.players[state.currentPlayerIndex];
    if (!cp?.isAI && !(botEnabledRef.current && isSinglePlayer)) return;
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    aiTimerRef.current = setTimeout(() => {
      const s = fullRef.current;
      if (!s || s.phase !== "playing") return;
      const cp2 = s.players[s.currentPlayerIndex];
      if (!cp2?.isAI && !(botEnabledRef.current && isSinglePlayer)) return;
      try {
        const _category =
          botEnabledRef.current && isSinglePlayer ? "MOVE_BOT" : "MOVE_AI";
        botLog(_category, "Conquian", {
          player: cp2.id,
          turnPhase: s.turnPhase,
        });
        runAITurn(s);
      } catch (err) {
        botLogError("CRASH", "Conquian", err);
      }
    }, TEST_BOT_DELAY_MS);
  }

  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

  useEffect(() => {
    botEnabledRef.current = botEnabled;
  }, [botEnabled]);

  function runAITurn(state) {
    const cp = state.players[state.currentPlayerIndex];
    if (!cp?.isAI) return;
    const aiPid = String(cp.id);

    if (state.turnPhase === "draw") {
      applyState(doDrawFromStock(state));
      return;
    }

    if (state.turnPhase === "action") {
      const isDrawTurn =
        state.currentPlayerIndex === state.originalDrawerIndex &&
        state.chainPassedPids.length === 0;

      let s = state;
      // Easy AI skips proactive free melding — medium/hard lay everything they can
      if (isDrawTurn && difficulty !== "easy") {
        let meldIds = aiBestHandMeld(s.hands[aiPid]);
        while (meldIds) {
          const next = doLayDownMeld(s, aiPid, meldIds);
          if (next === s) break;
          s = next;
          if (s.phase === "results") {
            applyState(s);
            return;
          }
          meldIds = aiBestHandMeld(s.hands[aiPid]);
        }
      }

      const passRate = PASS_RATES[difficulty] ?? 0.15;
      const meldAction = aiCanTake(s, aiPid);
      if (meldAction && Math.random() > passRate) {
        applyState(doTakeActiveCard(s, aiPid, meldAction));
      } else {
        applyState(doPassActiveCard(s));
      }
      return;
    }

    if (state.turnPhase === "discard") {
      const hand = state.hands[aiPid] ?? [];
      // Easy AI discards randomly; medium/hard discard most isolated card
      const cardId =
        difficulty === "easy"
          ? hand[Math.floor(Math.random() * hand.length)]?.id
          : aiMostIsolated(hand);
      if (cardId) applyState(doDiscardCard(state, aiPid, cardId));
      return;
    }
  }

  // ─── Initialization ──────────────────────────────────────────────────────────

  // Auto-save after each state change in single-player.
  useEffect(() => {
    if (!isSinglePlayer || !fullRef.current) return;
    if (gameState?.phase === "results") {
      clearGame(SAVE_KEY_CONQUIAN);
      return;
    }
    saveGame(SAVE_KEY_CONQUIAN, { fullState: fullRef.current });
  }, [gameState]);

  useEffect(() => {
    if (!isHost) return;

    async function init() {
      if (isSinglePlayer && route?.params?.resumeFromSave) {
        const saved = await loadGame(SAVE_KEY_CONQUIAN);
        if (saved?.fullState) {
          applyState(saved.fullState);
          return;
        }
      }
      botLog("GAMESTART", "Conquian", {
        players: initialPlayers.length,
        difficulty,
      });
      applyState(deal(initialPlayers));
    }
    init();

    if (!isSinglePlayer) {
      setServerListeners({
        onMessage: (msg, clientId) => {
          const s = fullRef.current;
          if (!s || msg.type !== "ACTION") return;
          handleClientAction(s, String(clientId), msg);
        },
      });
    }
  }, []);

  useEffect(() => {
    if (isHost) return;
    setClientListeners({
      onMessage: (msg) => {
        if (msg.type === "GAME_STATE") {
          setGameState(msg);
          setSelectedHandIds(new Set());
          setSelectedMeldIdx(null);
          setStatusMsg("");
        }
        if (msg.type === "PRIVATE_HAND") {
          setMyHand(msg.hand);
        }
      },
      onDisconnected: () =>
        Alert.alert("Disconnected", "Lost connection to the host.", [
          { text: "OK", onPress: () => navigation.navigate("Home") },
        ]),
    });
  }, []);

  // ─── Client action handler (host only) ───────────────────────────────────────

  function handleClientAction(s, clientPid, msg) {
    if (msg.action === "selectPassCard") {
      applyState(doSelectPassCard(s, clientPid, msg.cardId));
      return;
    }
    // For all playing-phase actions, verify it's this client's turn
    if (String(s.players[s.currentPlayerIndex]?.id) !== clientPid) return;

    switch (msg.action) {
      case "draw":
        applyState(doDrawFromStock(s));
        break;
      case "layMeld":
        applyState(doLayDownMeld(s, clientPid, msg.cardIds));
        break;
      case "extendMeld":
        applyState(
          doExtendMeldFromHand(s, clientPid, msg.meldIdx, msg.cardIds),
        );
        break;
      case "takeMeld":
        applyState(
          doTakeActiveCard(s, clientPid, {
            type: "new",
            handCardIds: msg.handCardIds,
          }),
        );
        break;
      case "takeExtend":
        applyState(
          doTakeActiveCard(s, clientPid, {
            type: "extend",
            meldIdx: msg.meldIdx,
          }),
        );
        break;
      case "pass":
        applyState(doPassActiveCard(s));
        break;
      case "discard":
        applyState(doDiscardCard(s, clientPid, msg.cardId));
        break;
      case "borrow":
        applyState(doTakeWithBorrow(s, clientPid, msg.finalMelds));
        break;
    }
  }

  // ─── Handlers ────────────────────────────────────────────────────────────────

  function handleConfirmPass() {
    if (!passCardId) return;
    if (isHost) {
      let s = doSelectPassCard(fullRef.current, myPid, passCardId);
      // Host always resolves AI pass selections (single-player and multiplayer)
      for (const p of initialPlayers) {
        if (p.isAI) {
          const hand = s.hands[String(p.id)] ?? [];
          const cardId =
            difficulty === "easy"
              ? hand[Math.floor(Math.random() * hand.length)]?.id
              : aiMostIsolated(hand);
          if (cardId) s = doSelectPassCard(s, String(p.id), cardId);
          if (s.phase === "playing") break;
        }
      }
      setPassCardId(null);
      applyState(s);
    } else {
      sendToHost({
        type: "ACTION",
        action: "selectPassCard",
        cardId: passCardId,
      });
      setPassCardId(null);
    }
  }

  function handleDraw() {
    if (!botEnabledRef.current) botLog("MOVE_USER", "Conquian draw");
    if (isHost) {
      const s = fullRef.current;
      if (!s) return;
      applyState(doDrawFromStock(s));
    } else {
      sendToHost({ type: "ACTION", action: "draw" });
    }
  }

  function toggleHandCard(cardId) {
    setSelectedHandIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
    setStatusMsg("");
  }

  function handleLayMeld() {
    if (!botEnabledRef.current) {
      const _hand = fullRef.current?.hands?.[myPid] ?? [];
      botLog("MOVE_USER", "Conquian lay meld", {
        cards: [...selectedHandIds].map((id) => {
          const c = _hand.find((x) => x.id === id);
          return c ? `${c.rank}${c.suit}` : id;
        }),
      });
    }
    if (isHost) {
      const s = fullRef.current;
      if (!s) return;
      const next = doLayDownMeld(s, myPid, [...selectedHandIds]);
      if (next === s) {
        setStatusMsg(
          "Invalid meld — select 3+ cards forming a valid set or run",
        );
        return;
      }
      applyState(next);
    } else {
      sendToHost({
        type: "ACTION",
        action: "layMeld",
        cardIds: [...selectedHandIds],
      });
      setSelectedHandIds(new Set());
    }
  }

  function handleAddToMeld() {
    if (selectedMeldIdx === null) return;
    if (isHost) {
      const s = fullRef.current;
      if (!s) return;
      const next = doExtendMeldFromHand(s, myPid, selectedMeldIdx, [
        ...selectedHandIds,
      ]);
      if (next === s) {
        setStatusMsg("Invalid extension");
        return;
      }
      applyState(next);
    } else {
      sendToHost({
        type: "ACTION",
        action: "extendMeld",
        meldIdx: selectedMeldIdx,
        cardIds: [...selectedHandIds],
      });
      setSelectedHandIds(new Set());
      setSelectedMeldIdx(null);
    }
  }

  function handleTakeMeld() {
    if (isHost) {
      const s = fullRef.current;
      if (!s || !s.activeCard) return;
      const next = doTakeActiveCard(s, myPid, {
        type: "new",
        handCardIds: [...selectedHandIds],
      });
      if (next === s) {
        setStatusMsg(
          "Invalid meld — active card + selected must form a valid set or run",
        );
        return;
      }
      applyState(next);
    } else {
      sendToHost({
        type: "ACTION",
        action: "takeMeld",
        handCardIds: [...selectedHandIds],
      });
      setSelectedHandIds(new Set());
    }
  }

  function handleTakeExtend() {
    if (selectedMeldIdx === null) return;
    if (isHost) {
      const s = fullRef.current;
      if (!s || !s.activeCard) return;
      const next = doTakeActiveCard(s, myPid, {
        type: "extend",
        meldIdx: selectedMeldIdx,
      });
      if (next === s) {
        setStatusMsg("Cannot extend that meld with the active card");
        return;
      }
      applyState(next);
    } else {
      sendToHost({
        type: "ACTION",
        action: "takeExtend",
        meldIdx: selectedMeldIdx,
      });
      setSelectedMeldIdx(null);
    }
  }

  function handleSmartTake() {
    if (!botEnabledRef.current) botLog("MOVE_USER", "Conquian take");
    if (isHost) {
      const s = fullRef.current;
      if (!s || !s.activeCard) return;
      // Prefer extending a targeted meld; fall back to new meld with selected hand cards
      if (selectedMeldIdx !== null) {
        const next = doTakeActiveCard(s, myPid, {
          type: "extend",
          meldIdx: selectedMeldIdx,
        });
        if (next !== s) {
          applyState(next);
          return;
        }
      }
      const next = doTakeActiveCard(s, myPid, {
        type: "new",
        handCardIds: [...selectedHandIds],
      });
      if (next !== s) {
        applyState(next);
        return;
      }
      setStatusMsg(
        "Select hand cards to meld with active card, or tap a meld to extend it",
      );
    } else {
      if (selectedMeldIdx !== null) {
        sendToHost({
          type: "ACTION",
          action: "takeExtend",
          meldIdx: selectedMeldIdx,
        });
        setSelectedMeldIdx(null);
      } else {
        sendToHost({
          type: "ACTION",
          action: "takeMeld",
          handCardIds: [...selectedHandIds],
        });
        setSelectedHandIds(new Set());
      }
    }
  }

  function handlePass() {
    if (!botEnabledRef.current) botLog("MOVE_USER", "Conquian pass");
    if (isHost) {
      applyState(doPassActiveCard(fullRef.current));
    } else {
      sendToHost({ type: "ACTION", action: "pass" });
    }
  }

  function handleDiscard(cardId) {
    if (!botEnabledRef.current) {
      const _c = (fullRef.current?.hands?.[myPid] ?? []).find(
        (x) => x.id === cardId,
      );
      botLog("MOVE_USER", "Conquian discard", {
        card: _c ? `${_c.rank}${_c.suit}` : cardId,
      });
    }
    if (isHost) {
      const s = fullRef.current;
      if (!s) return;
      const next = doDiscardCard(s, myPid, cardId);
      if (next !== s) {
        applyState(next);
      } else {
        setStatusMsg("Can't discard that card right now");
      }
    } else {
      sendToHost({ type: "ACTION", action: "discard", cardId });
    }
  }

  function handlePlayAgain() {
    if (!isHost) return;
    coinRewardedRef.current = false;
    setCoinsEarned(0);
    setPassCardId(null);
    clearGame(SAVE_KEY_CONQUIAN);
    botLog("GAMESTART", "Conquian", {
      players: initialPlayers.length,
      difficulty,
    });
    applyState(deal(initialPlayers));
  }

  // ─── Borrow mode handlers ─────────────────────────────────────────────────────

  function enterBorrowMode() {
    const ac = gameState?.activeCard;
    if (!ac) return;
    const myMeldsNow = gameState?.melds?.[myPid] ?? [];
    setBorrowGroups(myMeldsNow.map((m) => [...m]));
    setBorrowPool([ac, ...myHand]);
    setBorrowSelCardId(null);
    setStatusMsg("");
    setBorrowMode(true);
  }

  function exitBorrowMode() {
    setBorrowMode(false);
    setBorrowGroups([]);
    setBorrowPool([]);
    setBorrowSelCardId(null);
    setStatusMsg("");
  }

  function borrowSelectCard(cardId) {
    setBorrowSelCardId((prev) => (prev === cardId ? null : cardId));
  }

  function borrowMoveToGroup(groupIdx) {
    if (!borrowSelCardId) return;
    const card = borrowPool.find((c) => c.id === borrowSelCardId);
    if (!card) return;
    setBorrowPool((prev) => prev.filter((c) => c.id !== borrowSelCardId));
    setBorrowGroups((prev) =>
      prev.map((g, i) => (i === groupIdx ? [...g, card] : g)),
    );
    setBorrowSelCardId(null);
  }

  function borrowReturnToPool(cardId, groupIdx) {
    const card = borrowGroups[groupIdx]?.find((c) => c.id === cardId);
    if (!card) return;
    setBorrowGroups((prev) =>
      prev.map((g, i) =>
        i === groupIdx ? g.filter((c) => c.id !== cardId) : g,
      ),
    );
    setBorrowPool((prev) => [...prev, card]);
  }

  function handleConfirmBorrow() {
    const nonEmpty = borrowGroups.filter((g) => g.length > 0);
    if (isHost) {
      const s = fullRef.current;
      if (!s) return;
      const next = doTakeWithBorrow(s, myPid, nonEmpty);
      if (next === s) {
        setStatusMsg(
          "Invalid — every group must be a valid meld and the active card must be placed",
        );
        return;
      }
      exitBorrowMode();
      applyState(next);
    } else {
      const allValid =
        nonEmpty.length > 0 && nonEmpty.every((g) => isValidMeld(g));
      const ac = gameState?.activeCard;
      const hasActive = nonEmpty.some((g) => g.some((c) => c.id === ac?.id));
      if (!allValid || !hasActive) {
        setStatusMsg(
          "Invalid — every group must be a valid meld and the active card must be placed",
        );
        return;
      }
      sendToHost({ type: "ACTION", action: "borrow", finalMelds: nonEmpty });
      exitBorrowMode();
    }
  }

  // Must be before the early returns below so hook call order is consistent.
  useEffect(() => {
    if (!isSinglePlayer) return;
    const winner = gameState?.winner;
    const isWon =
      gameState?.phase === "results" &&
      !gameState?.tie &&
      String(winner?.id) === String(myPid);
    if (isWon && !coinRewardedRef.current) {
      coinRewardedRef.current = true;
      addCoins(500).then(() => setCoinsEarned(500));
      recordWin("conquian");
    }
    if (gameState?.phase !== "results") {
      coinRewardedRef.current = false;
      setCoinsEarned(0);
    }
  }, [gameState?.phase, gameState?.winner, gameState?.tie]);

  useEffect(() => {
    if (gameState?.phase === "results") {
      botLog("GAMEOVER", "Conquian", {
        winner: gameState?.winner?.id ?? null,
        tie: gameState?.tie,
      });
      setShowRoundModal(true);
    }
  }, [gameState?.phase]);

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

  // Bot: Auto-restart when game ends
  useEffect(() => {
    if (
      gameState?.phase !== "results" ||
      !botEnabledRef.current ||
      !isSinglePlayer
    )
      return;
    if (botRestartTimerRef.current) clearTimeout(botRestartTimerRef.current);
    botRestartTimerRef.current = setTimeout(() => {
      if (botEnabledRef.current) handleRestart();
    }, 1500);
    return () => {
      if (botRestartTimerRef.current) clearTimeout(botRestartTimerRef.current);
    };
  }, [gameState?.phase]);

  // ─── Guards ──────────────────────────────────────────────────────────────────

  if (!gameState) {
    return (
      <SafeAreaView style={styles.loading}>
        <Text style={styles.loadingText}>Dealing…</Text>
      </SafeAreaView>
    );
  }

  function handleQuit() {
    if (isSinglePlayer) clearGame(SAVE_KEY_CONQUIAN);
    else if (isHost) stopServer();
    else disconnectFromHost();
    navigation.navigate("Home");
  }

  function handleRestart() {
    if (isSinglePlayer) clearGame(SAVE_KEY_CONQUIAN);
    botLog("GAMESTART", "Conquian", {
      players: initialPlayers.length,
      difficulty,
    });
    applyState(deal(initialPlayers));
  }

  function handleSaveAndExit() {
    if (!isSinglePlayer || !fullRef.current) return;
    saveGame(SAVE_KEY_CONQUIAN, { fullState: fullRef.current });
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
    { type: "howto", gameId: "conquian" },
    { type: "theme" },
    { type: "divider" },
    { type: "quit", onQuit: handleQuit },
  ];

  // ─── Borrow mode overlay ──────────────────────────────────────────────────────

  if (borrowMode) {
    const ac = gameState?.activeCard;
    const nonEmpty = borrowGroups.filter((g) => g.length > 0);
    const allValid = nonEmpty.every((g) => isValidMeld(g));
    const hasActive = nonEmpty.some((g) => g.some((c) => c.id === ac?.id));
    const canConfirm = allValid && hasActive && nonEmpty.length > 0;

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.borrowTitle}>Rearrange Melds</Text>
          <Text style={styles.borrowSubtitle}>
            {hasActive
              ? "✓ Active card placed"
              : "⚠ Active card must be placed in a group"}
          </Text>

          {ac && (
            <View style={styles.borrowActiveRow}>
              <Text style={styles.sectionLabel}>Active Card</Text>
              <Card rank={ac.rank} suit={ac.suit} />
            </View>
          )}

          <Text style={styles.sectionLabel}>
            Your Melds — tap a group to add selected card · tap a card to return
            it to pool
          </Text>
          {borrowGroups.map((group, idx) => {
            const valid = group.length >= 3 && isValidMeld(group);
            const invalid = group.length > 0 && !isValidMeld(group);
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.borrowGroup,
                  valid && styles.borrowGroupValid,
                  invalid && styles.borrowGroupInvalid,
                ]}
                onPress={() => borrowMoveToGroup(idx)}
                activeOpacity={borrowSelCardId ? 0.6 : 1}
                accessibilityRole="button"
                accessibilityLabel={`Group ${idx + 1}`}
                accessibilityHint="Move selected card into this group"
              >
                <Text style={styles.borrowGroupLabel}>
                  Group {idx + 1}{" "}
                  {group.length === 0
                    ? "— tap to add selected card"
                    : valid
                      ? "✓"
                      : "✗ not valid yet"}
                </Text>
                <View style={styles.handRow}>
                  {group.map((card) => (
                    <TouchableOpacity
                      key={card.id}
                      onPress={() => borrowReturnToPool(card.id, idx)}
                    >
                      <Card rank={card.rank} suit={card.suit} small />
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={styles.addGroupBtn}
            onPress={() => setBorrowGroups((p) => [...p, []])}
            accessibilityRole="button"
            accessibilityLabel="New Group"
            accessibilityHint="Add a new empty meld group"
          >
            <Text style={styles.addGroupText}>+ New Group</Text>
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>
            Available Pool — tap to select
            {borrowSelCardId ? ", then tap a group above" : ""}
          </Text>
          <View style={styles.handRow}>
            {borrowPool.map((card) => (
              <TouchableOpacity
                key={card.id}
                onPress={() => borrowSelectCard(card.id)}
              >
                <View
                  style={[
                    borrowSelCardId === card.id
                      ? styles.selectedWrapperSmall
                      : null,
                    card.id === ac?.id ? styles.activeCardInPool : null,
                  ]}
                >
                  <Card rank={card.rank} suit={card.suit} small />
                </View>
              </TouchableOpacity>
            ))}
            {borrowPool.length === 0 && (
              <Text style={styles.emptyHint}>All cards placed</Text>
            )}
          </View>

          {statusMsg ? <Text style={styles.errorMsg}>{statusMsg}</Text> : null}

          <View style={[styles.actionBtnRow, { marginTop: 16 }]}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.passBtn]}
              onPress={exitBorrowMode}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              accessibilityHint="Exit rearrange mode without saving changes"
            >
              <Text style={styles.actionBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.takeBtn,
                !canConfirm && styles.actionBtnDisabled,
              ]}
              onPress={handleConfirmBorrow}
              disabled={!canConfirm}
              accessibilityRole="button"
              accessibilityLabel="Confirm"
              accessibilityHint="Save rearranged melds and continue"
              accessibilityState={{ disabled: !canConfirm }}
            >
              <Text style={styles.actionBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Derived values ───────────────────────────────────────────────────────────

  const { phase, turnPhase, activeCard, stockSize, deadPileSize, winTarget } =
    gameState;
  const isMyTurn =
    String(gameState.players[gameState.currentPlayerIndex]?.id) ===
    String(myPid);
  const myMelds = gameState.melds?.[myPid] ?? [];
  const myMelded = meldedCount(gameState, myPid);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const opponents = gameState.players.filter(
    (p) => String(p.id) !== String(myPid),
  );
  const selectedHandArr = myHand.filter((c) => selectedHandIds.has(c.id));
  const myHasSubmittedPass = gameState.passSelectionsStatus?.[myPid] === true;

  const isDrawTurnFreeAction =
    isMyTurn &&
    turnPhase === "action" &&
    gameState.currentPlayerIndex === gameState.originalDrawerIndex &&
    (gameState.chainPassedPids?.length ?? 0) === 0;

  const canLayMeld = isDrawTurnFreeAction && isValidMeld(selectedHandArr);
  const canAddToMeld =
    isDrawTurnFreeAction &&
    selectedMeldIdx !== null &&
    selectedHandArr.length >= 1 &&
    isValidMeld([...(myMelds[selectedMeldIdx] ?? []), ...selectedHandArr]);
  const canTakeMeld =
    isMyTurn &&
    turnPhase === "action" &&
    !!activeCard &&
    isValidMeld([activeCard, ...selectedHandArr]);
  const canTakeExtend =
    isMyTurn &&
    turnPhase === "action" &&
    !!activeCard &&
    selectedMeldIdx !== null &&
    canExtendMeld(myMelds[selectedMeldIdx] ?? [], activeCard);

  // ─── Results screen ───────────────────────────────────────────────────────────

  if (phase === "results") {
    const { winner, tie } = gameState;
    const iWon = String(winner?.id) === String(myPid);
    return (
      <SafeAreaView style={styles.resultsContainer}>
        <Text style={styles.resultsEmoji}>
          {tie ? "🤝" : iWon ? "🏆" : "👑"}
        </Text>
        <Text style={styles.resultsTitle}>
          {tie ? "It's a Tie!" : iWon ? "You Win!" : `${winner?.name} Wins!`}
        </Text>
        {iWon && isSinglePlayer && coinsEarned > 0 && (
          <Text style={styles.resultsCoins}>+{coinsEarned} coins!</Text>
        )}

        <View style={styles.scoreBoard}>
          {gameState.players.map((p) => {
            const pid = String(p.id);
            const melded = meldedCount(gameState, pid);
            const isWinner = !tie && String(winner?.id) === pid;
            const isMe = pid === String(myPid);
            const pct = Math.min(melded / winTarget, 1);
            return (
              <View
                key={pid}
                style={[styles.scoreRow, isWinner && styles.scoreRowWinner]}
              >
                <Text style={styles.scoreName} numberOfLines={1}>
                  {isWinner ? "★ " : ""}
                  {p.name}
                  {isMe ? " (you)" : ""}
                </Text>
                <View style={styles.scoreBarTrack}>
                  <View
                    style={[
                      styles.scoreBarFill,
                      { width: `${pct * 100}%` },
                      isWinner && styles.scoreBarFillWinner,
                    ]}
                  />
                </View>
                <Text style={styles.scoreCount}>
                  {melded}/{winTarget}
                </Text>
              </View>
            );
          })}
        </View>

        <EndOfRoundModal
          visible={showRoundModal}
          title={
            tie
              ? "🤝 It's a Tie!"
              : iWon
                ? "🏆 You Win!"
                : `👑 ${winner?.name} Wins!`
          }
          message={
            iWon && isSinglePlayer && coinsEarned > 0
              ? `+${coinsEarned} coins!`
              : ""
          }
          showContinue={isHost}
          showLeave
          isGameOver
          onContinue={() => {
            setShowRoundModal(false);
            handlePlayAgain();
          }}
          onLeave={() => navigation.navigate("Home")}
          tableColor={BG}
        />
      </SafeAreaView>
    );
  }

  // ─── Main game screen ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader
        gameId="conquian"
        title="Conquian"
        subtitle={isSinglePlayer ? "Single Player" : "Multiplayer"}
        extraButton={<TestBotToggle />}
        menuItems={menuItems}
      />
      <StatsStrip
        gameId="conquian"
        items={[
          {
            label: "Hand",
            value: myHand?.length ?? 0,
          },
          {
            label: "Melded",
            value: `${myMelded}/${winTarget}`,
            accent: true,
          },
          { label: "Stock", value: stockSize ?? 0 },
          {
            label: "Phase",
            value:
              phase === "initialPass"
                ? "Initial Pass"
                : phase === "playing"
                  ? "Playing"
                  : phase === "results"
                    ? "Results"
                    : phase,
          },
        ]}
      />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Opponents — single row across the top; cards wrap naturally */}
        <View style={styles.opponentsRow}>
          {opponents.map((p) => {
            const opPid = String(p.id);
            const isCurrent = String(currentPlayer?.id) === opPid;
            const opMelds = gameState.melds?.[opPid] ?? [];
            return (
              <View
                key={opPid}
                style={[
                  styles.opponentCard,
                  isCurrent && styles.opponentCardActive,
                  opponents.length > 1 && styles.opponentCardMulti,
                ]}
              >
                <View style={styles.opponentHeader}>
                  <Text style={styles.opponentName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  {isCurrent && <Text style={styles.opponentTurnDot}>▶</Text>}
                </View>
                <Text style={styles.opponentStats}>
                  {gameState.handSizes?.[opPid] ?? 0} cards ·{" "}
                  {meldedCount(gameState, opPid)}/{winTarget}
                </Text>
                {opMelds.length > 0 && (
                  <View style={[styles.meldRow, styles.meldRowWrap]}>
                    {opMelds.map((meld, idx) => (
                      <View key={idx} style={styles.meldGroup}>
                        {meld.map((card) => (
                          <Card
                            key={card.id}
                            rank={card.rank}
                            suit={card.suit}
                            small
                          />
                        ))}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Center — stock / active slot / dead pile + status */}
        <View style={styles.centerSection}>
          <View style={styles.pileRow}>
            <View style={styles.pileBox}>
              <Text style={styles.pileLabel}>Stock</Text>
              <Text style={styles.pileCount}>{stockSize}</Text>
            </View>

            <View style={styles.activeSlotBox}>
              <Text style={styles.pileLabel}>Active</Text>
              {activeCard ? (
                <Card rank={activeCard.rank} suit={activeCard.suit} />
              ) : (
                <View style={styles.emptySlot}>
                  <Text style={styles.emptySlotText}>—</Text>
                </View>
              )}
            </View>

            <View style={styles.pileBox}>
              <Text style={styles.pileLabel}>Dead</Text>
              <Text style={styles.pileCount}>{deadPileSize}</Text>
            </View>
          </View>

          <Text style={styles.myProgress}>
            You: {myHand.length} in hand · {myMelded}/{winTarget} melded
          </Text>

          {phase === "initialPass" && !myHasSubmittedPass && (
            <Text style={styles.phaseLabel}>Pick 1 card to pass clockwise</Text>
          )}
          {phase === "initialPass" && myHasSubmittedPass && (
            <Text style={styles.phaseLabel}>Waiting for other players…</Text>
          )}
          {phase === "playing" && isMyTurn && turnPhase === "draw" && (
            <Text style={styles.phaseLabel}>Your turn — draw from stock</Text>
          )}
          {phase === "playing" &&
            isMyTurn &&
            turnPhase === "action" &&
            isDrawTurnFreeAction && (
              <Text style={styles.phaseLabel}>
                Your turn — take/pass the drawn card, or select hand cards to
                meld
                {selectedHandArr.length > 0
                  ? ` · ${selectedHandArr.length} selected`
                  : ""}
                {selectedMeldIdx !== null
                  ? ` · meld ${selectedMeldIdx + 1} targeted`
                  : ""}
              </Text>
            )}
          {phase === "playing" &&
            isMyTurn &&
            turnPhase === "action" &&
            !isDrawTurnFreeAction && (
              <Text style={styles.phaseLabel}>
                Chain offer — Take or Pass
                {selectedHandArr.length > 0
                  ? ` · ${selectedHandArr.length} selected`
                  : ""}
                {selectedMeldIdx !== null
                  ? ` · meld ${selectedMeldIdx + 1} targeted`
                  : ""}
              </Text>
            )}
          {phase === "playing" && isMyTurn && turnPhase === "discard" && (
            <Text style={styles.phaseLabel}>
              Tap a card in your hand to discard
            </Text>
          )}
          {phase === "playing" && !isMyTurn && turnPhase !== "discard" && (
            <Text style={styles.phaseLabel}>
              {(gameState.chainPassedPids?.length ?? 0) > 0
                ? `Chain: ${currentPlayer?.name} deciding…`
                : `${currentPlayer?.name}'s turn…`}
            </Text>
          )}
          {phase === "playing" && !isMyTurn && turnPhase === "discard" && (
            <Text style={styles.phaseLabel}>
              {currentPlayer?.name} is discarding…
            </Text>
          )}
          {statusMsg ? <Text style={styles.errorMsg}>{statusMsg}</Text> : null}
        </View>

        {/* My melds */}
        {myMelds.length > 0 && (
          <View style={styles.meldSection}>
            <Text style={styles.sectionLabel}>Your Melds</Text>
            <View style={[styles.meldRow, styles.meldRowWrap]}>
              {myMelds.map((meld, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.meldGroup,
                    selectedMeldIdx === idx && styles.meldGroupSelected,
                  ]}
                  onPress={() => {
                    if (turnPhase !== "action" || !isMyTurn) return;
                    setSelectedMeldIdx((prev) => (prev === idx ? null : idx));
                    setStatusMsg("");
                  }}
                >
                  {meld.map((card) => (
                    <Card
                      key={card.id}
                      rank={card.rank}
                      suit={card.suit}
                      small
                    />
                  ))}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* My hand */}
        <View style={styles.handSection}>
          <Text style={styles.sectionLabel}>
            {phase === "initialPass" && !myHasSubmittedPass
              ? "Your Hand — tap to select 1 card to pass"
              : `Your Hand (${myHand.length})`}
          </Text>
          <View style={styles.handRow}>
            {myHand.map((card, index) => {
              const isSelected =
                phase === "initialPass"
                  ? passCardId === card.id
                  : selectedHandIds.has(card.id);
              const tappable =
                (phase === "initialPass" && !myHasSubmittedPass) ||
                (turnPhase === "action" && isMyTurn) ||
                (turnPhase === "discard" && isMyTurn);
              return (
                <TouchableOpacity
                  key={card.id}
                  disabled={!tappable}
                  onPress={() => {
                    if (phase === "initialPass") {
                      setPassCardId((prev) =>
                        prev === card.id ? null : card.id,
                      );
                      return;
                    }
                    if (turnPhase === "discard" && isMyTurn) {
                      handleDiscard(card.id);
                      return;
                    }
                    if (turnPhase === "action" && isMyTurn)
                      toggleHandCard(card.id);
                  }}
                >
                  <View style={isSelected ? styles.selectedWrapperSmall : null}>
                    <Card
                      rank={card.rank}
                      suit={card.suit}
                      small
                      animateDeal={hasMountedRef.current}
                      dealDelay={myHand.length <= 10 ? index * 100 : 0}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Action bar */}
        <View style={styles.actionBar}>
          {phase === "initialPass" && !myHasSubmittedPass && (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                !passCardId && styles.actionBtnDisabled,
              ]}
              onPress={handleConfirmPass}
              disabled={!passCardId}
              accessibilityRole="button"
              accessibilityLabel="Confirm Pass"
              accessibilityHint="Submit your chosen card to pass"
              accessibilityState={{ disabled: !passCardId }}
            >
              <Text style={styles.actionBtnText}>Confirm Pass</Text>
            </TouchableOpacity>
          )}

          {phase === "initialPass" && myHasSubmittedPass && (
            <Text style={styles.waitText}>Waiting for other players…</Text>
          )}

          {phase === "playing" && isMyTurn && turnPhase === "draw" && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleDraw}
              accessibilityRole="button"
              accessibilityLabel="Draw from Stock"
              accessibilityHint="Take a card from the stock pile"
            >
              <Text style={styles.actionBtnText}>Draw from Stock</Text>
            </TouchableOpacity>
          )}

          {phase === "playing" && isMyTurn && turnPhase === "action" && (
            <>
              <View style={styles.actionBtnRow}>
                {isDrawTurnFreeAction && (
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      styles.layBtn,
                      !canLayMeld && styles.actionBtnDisabled,
                    ]}
                    onPress={handleLayMeld}
                    disabled={!canLayMeld}
                    accessibilityRole="button"
                    accessibilityLabel="Lay Meld"
                    accessibilityHint="Place selected cards as a meld"
                    accessibilityState={{ disabled: !canLayMeld }}
                  >
                    <Text style={styles.actionBtnText}>Lay Meld</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.borrowBtn,
                    !activeCard && styles.actionBtnDisabled,
                  ]}
                  onPress={enterBorrowMode}
                  disabled={!activeCard}
                  accessibilityRole="button"
                  accessibilityLabel="Rearrange"
                  accessibilityHint="Reorganize your melds to place the active card"
                  accessibilityState={{ disabled: !activeCard }}
                >
                  <Text style={styles.actionBtnText}>Rearrange</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.takeBtn,
                    !activeCard && styles.actionBtnDisabled,
                  ]}
                  onPress={handleSmartTake}
                  disabled={!activeCard}
                  accessibilityRole="button"
                  accessibilityLabel="Take and Meld"
                  accessibilityHint="Add the active card to a meld"
                  accessibilityState={{ disabled: !activeCard }}
                >
                  <Text style={styles.actionBtnText}>Take + Meld</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.passBtn]}
                  onPress={handlePass}
                  accessibilityRole="button"
                  accessibilityLabel="Pass"
                  accessibilityHint="Pass the active card to the next player"
                >
                  <Text style={styles.actionBtnText}>Pass</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.hintText}>
                Select hand cards · tap a meld to target it · Rearrange to
                reorganize melds
              </Text>
            </>
          )}

          {phase === "playing" && isMyTurn && turnPhase === "discard" && (
            <Text style={styles.discardHint}>
              Tap a card in your hand to discard
            </Text>
          )}

          {phase === "playing" && !isMyTurn && (
            <Text style={styles.waitText}>
              {(gameState.chainPassedPids?.length ?? 0) > 0
                ? `Chain → ${currentPlayer?.name} deciding…`
                : `${currentPlayer?.name} is playing…`}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { color: "#fff", fontSize: scaleFont(20) },

  safeArea: { flex: 1, backgroundColor: BG },
  container: {
    backgroundColor: BG,
    paddingTop: scale(12),
    paddingBottom: scale(16),
  },

  resultsContainer: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    padding: scale(32),
  },
  resultsEmoji: { fontSize: scaleFont(52), marginBottom: scale(8) },
  resultsTitle: {
    color: "#fff",
    fontSize: scaleFont(30),
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: scale(8),
  },
  resultsCoins: {
    color: "#ffd700",
    fontSize: scaleFont(20),
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: scale(24),
  },
  scoreBoard: { width: "100%", marginBottom: scale(32), gap: scale(10) },
  scoreRow: {
    backgroundColor: "#16213e",
    borderRadius: scale(10),
    padding: scale(12),
    borderWidth: 1.5,
    borderColor: "#334",
  },
  scoreRowWinner: { borderColor: "#ffd700" },
  scoreName: {
    color: "#fff",
    fontSize: scaleFont(15),
    fontWeight: "bold",
    marginBottom: scale(6),
  },
  scoreBarTrack: {
    height: scale(8),
    backgroundColor: "#0d1117",
    borderRadius: scale(4),
    marginBottom: scale(4),
    overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%",
    backgroundColor: "#4caf50",
    borderRadius: scale(4),
  },
  scoreBarFillWinner: { backgroundColor: "#ffd700" },
  scoreCount: { color: "#c4c4d4", fontSize: scaleFont(12), textAlign: "right" },
  opponentsRow: {
    paddingHorizontal: scale(12),
    gap: scale(6),
    marginBottom: scale(6),
  },
  opponentCard: {
    backgroundColor: "#16213e",
    borderRadius: scale(10),
    padding: scale(10),
    borderWidth: 1.5,
    borderColor: "#334",
  },
  opponentCardActive: { borderColor: "#e94560" },
  opponentCardMulti: {},
  opponentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scale(2),
  },
  opponentName: {
    color: "#fff",
    fontSize: scaleFont(13),
    fontWeight: "bold",
    flex: 1,
  },
  opponentTurnDot: {
    color: "#e94560",
    fontSize: scaleFont(11),
    marginLeft: scale(4),
  },
  opponentStats: {
    color: "#c4c4d4",
    fontSize: scaleFont(11),
    marginBottom: scale(2),
  },
  opponentMeldScroll: { marginTop: scale(2) },

  centerSection: { paddingHorizontal: scale(12), marginBottom: scale(6) },
  pileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: scale(6),
  },
  pileBox: {
    alignItems: "center",
    backgroundColor: "#16213e",
    borderRadius: scale(10),
    padding: scale(10),
    minWidth: scale(68),
  },
  pileLabel: {
    color: "#c4c4d4",
    fontSize: scaleFont(11),
    textTransform: "uppercase",
    letterSpacing: scale(1),
    marginBottom: scale(2),
  },
  pileCount: { color: "#fff", fontSize: scaleFont(24), fontWeight: "bold" },
  activeSlotBox: { alignItems: "center" },
  emptySlot: {
    width: scale(70),
    height: scale(100),
    borderRadius: scale(8),
    borderWidth: 2,
    borderColor: "#334",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  emptySlotText: { color: "#555", fontSize: scaleFont(20) },
  myProgress: {
    color: "#4caf50",
    fontSize: scaleFont(13),
    textAlign: "center",
    marginBottom: scale(2),
  },
  phaseLabel: {
    color: "#c4c4d4",
    fontSize: scaleFont(12),
    textAlign: "center",
  },
  errorMsg: {
    color: "#e94560",
    fontSize: scaleFont(13),
    textAlign: "center",
    marginTop: scale(4),
  },

  meldSection: { paddingHorizontal: scale(12), marginBottom: scale(6) },
  sectionLabel: {
    color: "#c4c4d4",
    fontSize: scaleFont(11),
    textTransform: "uppercase",
    letterSpacing: scale(1),
    marginBottom: scale(4),
  },
  meldRow: { flexDirection: "row", gap: scale(6) },
  meldRowWrap: { flexWrap: "wrap", rowGap: scale(6) },
  meldGroup: {
    flexDirection: "row",
    borderRadius: scale(8),
    borderWidth: 2,
    borderColor: "transparent",
    padding: scale(2),
  },
  meldGroupSelected: { borderColor: "#e94560" },

  handSection: { paddingHorizontal: scale(12), marginBottom: scale(6) },
  handRow: { flexDirection: "row", flexWrap: "wrap" },
  selectedWrapper: {
    borderRadius: scale(10),
    borderWidth: 3,
    borderColor: "#4caf50",
    transform: [{ translateY: -10 }],
  },
  selectedWrapperSmall: {
    borderRadius: scale(7),
    borderWidth: 3,
    borderColor: "#4caf50",
    transform: [{ translateY: -8 }],
  },

  actionBar: {
    backgroundColor: "#16213e",
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderRadius: scale(12),
    marginHorizontal: scale(12),
    marginTop: scale(6),
  },
  actionBtnRow: {
    flexDirection: "row",
    gap: scale(8),
    marginBottom: scale(6),
    justifyContent: "center",
  },
  actionBtn: {
    backgroundColor: "#4caf50",
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    borderRadius: scale(10),
    alignItems: "center",
    justifyContent: "center",
    minWidth: scale(90),
  },
  actionBtnDisabled: { backgroundColor: "#2d5c35" },
  takeBtn: { backgroundColor: "#1565c0" },
  passBtn: { backgroundColor: "#b71c1c" },
  borrowBtn: { backgroundColor: "#6a1b9a" },
  layBtn: { backgroundColor: "#2e7d32" },
  actionBtnText: {
    color: "#fff",
    fontSize: scaleFont(11),
    fontWeight: "bold",
    textAlign: "center",
  },
  hintText: { color: "#666", fontSize: scaleFont(11), textAlign: "center" },
  discardHint: {
    color: "#e94560",
    fontSize: scaleFont(14),
    textAlign: "center",
    paddingVertical: scale(6),
  },
  waitText: {
    color: "#c4c4d4",
    fontSize: scaleFont(14),
    textAlign: "center",
    paddingVertical: scale(6),
  },

  // Borrow mode
  borrowTitle: {
    color: "#fff",
    fontSize: scaleFont(20),
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: scale(4),
  },
  borrowSubtitle: {
    color: "#c4c4d4",
    fontSize: scaleFont(13),
    textAlign: "center",
    marginBottom: scale(12),
  },
  borrowActiveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
    paddingHorizontal: scale(12),
    marginBottom: scale(8),
  },
  borrowGroup: {
    marginHorizontal: scale(12),
    marginBottom: scale(8),
    borderRadius: scale(10),
    borderWidth: 2,
    borderColor: "#334",
    backgroundColor: "#16213e",
    padding: scale(8),
  },
  borrowGroupValid: { borderColor: "#4caf50" },
  borrowGroupInvalid: { borderColor: "#e94560" },
  borrowGroupLabel: {
    color: "#c4c4d4",
    fontSize: scaleFont(12),
    marginBottom: scale(6),
  },
  addGroupBtn: {
    marginHorizontal: scale(12),
    marginBottom: scale(12),
    padding: scale(12),
    borderRadius: scale(10),
    borderWidth: 1.5,
    borderColor: "#6a1b9a",
    borderStyle: "dashed",
    alignItems: "center",
  },
  addGroupText: {
    color: "#b090c8",
    fontSize: scaleFont(14),
    fontWeight: "bold",
  },
  activeCardInPool: {
    borderRadius: scale(10),
    borderWidth: 2,
    borderColor: "#ffa000",
  },
  emptyHint: { color: "#555", fontSize: scaleFont(13), padding: scale(8) },
});
