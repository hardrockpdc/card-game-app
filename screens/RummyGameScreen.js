import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HapticPressable as Pressable } from "../components/Haptic";

import Card from "../components/Card";
import Toast, { useToast } from "../components/Toast";
import GameHeader from "../components/GameHeader";
import YourTurnBanner from "../components/YourTurnBanner";
import useYourTurnBanner from "../components/useYourTurnBanner";
import EndOfRoundModal from "../components/EndOfRoundModal";
import TutorialOverlay, { hasSeen } from "../components/TutorialOverlay";
import TableThemePicker from "../components/TableThemePicker";
import { getTableTheme } from "../game/tableThemes";
import {
  RUMMY_TABLES,
  getRummyTableId,
  setRummyTable,
  subscribeRummyTable,
} from "../game/rummyTheme";
import { scale, scaleFont } from "../game/responsive";
import ProfileAvatar from "../components/ProfileAvatar";
import useMultiplayerAvatars from "../components/useMultiplayerAvatars";
import { addCoins } from "../game/wallet";
import { getWinReward } from "../game/rewards";
import { saveGame, loadGame, clearGame } from "../game/gameSaves";
import { recordWin } from "../game/profile";
import { hapticWin, hapticLose } from "../game/haptics";
import {
  broadcastToClients,
  sendToClient,
  sendToHost,
  setClientListeners,
  setServerListeners,
  stopServer,
  disconnectFromHost,
} from "../game/GameNetwork";
import {
  createRummyState,
  rummyReducer,
  rummyAiChooseMove,
  getRummyVariantLabel,
  calculateRummyDeadwood,
  canRummyPlayerKnock,
} from "../game/rummy";

const AI_MOVE_DELAY_MS = 700; // delay between AI opponent moves (ms)
const PILE_SCALE = 1.15; // make the Stock/Discard piles a bit larger to read

const BG = getTableTheme("rummy").table;

const GIN_RUMMY_SLIDES = [
  {
    emoji: "🃏",
    title: "Form Melds",
    body: "Build sets (3 cards of the same rank) or runs (3+ cards of the same suit in order).",
  },
  {
    emoji: "🔄",
    title: "Draw & Discard",
    body: "Each turn: draw a card from the stock or discard pile, then discard one from your hand.",
  },
  {
    emoji: "🏆",
    title: "Knock or Go Gin",
    body: 'Knock when your unmelded cards total 10 or less. Get all 10 cards into melds for "Gin" — worth 25 bonus points!',
  },
];

function findLocalPlayerIndex(players, myName, isHost) {
  if (isHost) {
    return 0;
  }

  const byName = players.findIndex((player) => player?.name === myName);
  return byName >= 0 ? byName : 0;
}

function getPlayerName(players, index) {
  return players?.[index]?.name || `Player ${index + 1}`;
}

function getMeldOwnerName(players, meld, index) {
  const ownerIndex = Number.isInteger(meld?.owner) ? meld.owner : -1;
  if (ownerIndex >= 0 && players?.[ownerIndex]) {
    return players[ownerIndex].name;
  }

  return `Meld ${index + 1}`;
}

function cloneMelds(melds) {
  return (melds || []).map((meld) => ({
    ...meld,
    cards: (meld.cards || []).map((card) => ({ ...card })),
  }));
}

function toPublicState(state) {
  const discardTop =
    state?.discardPile?.length > 0
      ? state.discardPile[state.discardPile.length - 1]
      : null;

  return {
    gameType: state.gameType,
    variantId: state.variantId,
    variantLabel: state.variantLabel,
    difficulty: state.difficulty,
    phase: state.phase,
    currentPlayerIndex: state.currentPlayerIndex,
    roundNumber: state.roundNumber,
    statusMessage: state.statusMessage,
    stockCount: state.stock?.length ?? 0,
    discardCount: state.discardPile?.length ?? 0,
    discardTop,
    winner: state.winner,
    tie: state.tie,
    scoreToWin: state.scoreToWin,
    minMeldSize: state.minMeldSize,
    knockLimit: state.knockLimit,
    players: (state.players || []).map((player, index) => ({
      id: player.id,
      name: player.name,
      isAI: Boolean(player.isAI),
      score: state.scores?.[index] ?? player.score ?? 0,
      knocked: Boolean(player.knocked),
      finished: Boolean(player.finished),
      handCount: state.hands?.[index]?.length ?? 0,
    })),
    melds: cloneMelds(state.melds),
  };
}

function normalizeVariantId(routeParams = {}) {
  return routeParams.variantId || routeParams.variant || "ginRummy";
}

function getActionLabel(state, isCurrentPlayer) {
  if (!isCurrentPlayer) {
    return "Waiting for turn…";
  }

  if (state.phase === "draw") {
    return "Draw a card from stock or discard";
  }

  if (state.phase === "discard") {
    return "Lay melds, extend a meld, or discard one card";
  }

  if (state.phase === "game-over") {
    return "Game over";
  }

  return "Rummy";
}

function RummyCard({
  card,
  small = false,
  selected = false,
  onPress,
  disabled = false,
  animateDeal = false,
  dealDelay = 0,
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.cardWrap,
        small && styles.cardWrapSmall,
        selected && styles.cardWrapSelected,
        pressed && !disabled && styles.cardWrapPressed,
        disabled && styles.cardWrapDisabled,
      ]}
    >
      {/* Jokers render through Card too, so they use the themed joker image. */}
      <Card
        rank={card.rank}
        suit={card.suit}
        small={small}
        animateDeal={animateDeal}
        dealDelay={dealDelay}
      />
    </Pressable>
  );
}

export default function RummyGameScreen({ navigation, route }) {
  const params = route?.params ?? {};
  const variantId = normalizeVariantId(params);
  const {
    role = "singleplayer",
    myName = "Player 1",
    players = [],
    difficulty = "normal",
  } = params;

  const isSinglePlayer = role === "singleplayer" || role === "ai" || !role;
  const isHost = role === "host" || isSinglePlayer;
  const { avatarById, handleHostMessage, handleClientMessage } =
    useMultiplayerAvatars({ isHost, players });

  const localPlayerIndex = useMemo(
    () => findLocalPlayerIndex(players, myName, isHost),
    [players, myName, isHost],
  );

  // Small-card sizing so opponent/your melds can overlap compactly (matches
  // Conquián). 42 is Card's base small width; clamp mirrors Card.js.
  const { width: winW } = useWindowDimensions();
  const smallClamp = Math.min(Math.max(winW / 390, 0.85), 1.5);
  const meldOverlap = -Math.round(42 * smallClamp * 0.66);

  const [gameState, setGameState] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const [selectedHandIndexes, setSelectedHandIndexes] = useState([]);
  const [selectedMeldIndex, setSelectedMeldIndex] = useState(null);
  const [showHeaderDetails, setShowHeaderDetails] = useState(false);

  const fullRef = useRef(null);
  const aiTimerRef = useRef(null);
  const coinRewardedRef = useRef(false);
  const outcomeBuzzedRef = useRef(false); // fire win/lose haptic once per game
  const hasMountedRef = useRef(false);
  const handReadyTimerRef = useRef(null); // ACC-2: guaranteed hand re-reveal timer
  const reduceMotionRef = useRef(false);
  const lastSaveRef = useRef(0); // BUG-4: auto-save throttle (once / 3s)
  const {
    show: showToast,
    message: toastMessage,
    revision: toastRevision,
  } = useToast();
  const [coinsEarned, setCoinsEarned] = useState(0);
  // ACC-2: hide the hand from screen readers ONLY during the fresh-deal
  // animation, then re-reveal. Defaults to true (always accessible) so a
  // missed re-reveal can never permanently hide the hand — fail-safe.
  const [handReady, setHandReady] = useState(true);

  // Cache the reduced-motion preference so the ACC-2 hand-hide is skipped
  // when there's no deal animation to wait for (CLAUDE.md §2.4).
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) reduceMotionRef.current = v;
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => {
      reduceMotionRef.current = v;
    });
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  const [showTutorial, setShowTutorial] = useState(false);
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [tableId, setTableId] = useState(getRummyTableId());
  const [showTablePicker, setShowTablePicker] = useState(false);

  // Keep the table palette in sync (loaded at app start; may change via the
  // in-game Table Theme picker). Mirrors Last Card.
  useEffect(() => {
    setTableId(getRummyTableId());
    return subscribeRummyTable((id) => setTableId(id));
  }, []);

  const pal =
    RUMMY_TABLES.find((t) => t.id === tableId) ?? RUMMY_TABLES[0];

  const variantLabel =
    gameState?.variantLabel || getRummyVariantLabel(variantId);
  const currentPlayers = gameState?.players || players;
  const currentPlayerIndex = gameState?.currentPlayerIndex ?? 0;
  const currentPlayer = currentPlayers[currentPlayerIndex];
  const isMyTurn = currentPlayerIndex === localPlayerIndex;
  const currentPhase = gameState?.phase || "draw";
  const statusMessage = gameState?.statusMessage || "Loading…";
  // "Your Turn!" banner — flash when the turn flips to me.
  const showTurnBanner = useYourTurnBanner(
    !!gameState && isMyTurn,
    !!gameState && gameState.winner == null,
  );
  const myMelds = useMemo(() => {
    return (gameState?.melds || []).filter(
      (meld) =>
        Number.isInteger(meld?.owner) && meld.owner === localPlayerIndex,
    );
  }, [gameState?.melds, localPlayerIndex]);

  const myDeadwood = useMemo(() => {
    return calculateRummyDeadwood(myHand, myMelds);
  }, [myHand, myMelds]);

  // Whether I can legally knock right now (deadwood under the variant's limit,
  // plus any go-out conditions). Built from my own hand + the public melds so
  // it works for host and client. Used to show/hide the Knock button.
  const canKnock = useMemo(() => {
    if (!gameState) return false;
    const liteState = {
      variantId: gameState.variantId || variantId,
      players: gameState.players || [],
      hands: { [localPlayerIndex]: myHand },
      melds: gameState.melds || [],
    };
    return canRummyPlayerKnock(liteState, localPlayerIndex);
  }, [gameState, myHand, localPlayerIndex, variantId]);

  const discardTop =
    gameState?.discardTop ||
    (fullRef.current?.discardPile?.length
      ? fullRef.current.discardPile[fullRef.current.discardPile.length - 1]
      : null);

  function handleQuit() {
    if (isSinglePlayer) clearGame(`@cardnight:save:rummy:${variantId}`);
    else if (isHost) stopServer();
    else disconnectFromHost();
    navigation.navigate("Home");
  }

  function handleRestart() {
    if (isSinglePlayer) clearGame(`@cardnight:save:rummy:${variantId}`);
    const initPlayers =
      Array.isArray(players) && players.length > 0
        ? players
        : [
            { id: "host", name: myName, isAI: false },
            { id: "ai_1", name: "Computer", isAI: true },
          ];
    applyState(
      createRummyState({ variantId, players: initPlayers, difficulty }),
    );
  }

  function handleSaveAndExit() {
    if (!isSinglePlayer || !fullRef.current) return;
    saveGame(`@cardnight:save:rummy:${variantId}`, {
      fullState: fullRef.current,
    });
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
    { type: "howto", gameId: "rummy" },
    { type: "theme" },
    {
      icon: "🎨",
      label: "Table Theme",
      onPress: () => setShowTablePicker(true),
    },
    { type: "divider" },
    { type: "quit", onQuit: handleQuit },
  ];

  function clearSelection() {
    setSelectedHandIndexes([]);
    setSelectedMeldIndex(null);
  }

  function scheduleAI(state) {
    if (!isHost || state.phase === "game-over") {
      return;
    }

    const current = state.players?.[state.currentPlayerIndex];
    if (!current?.isAI) {
      return;
    }

    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
    }

    aiTimerRef.current = setTimeout(() => {
      const latest = fullRef.current;
      if (!latest || latest.phase === "game-over") {
        return;
      }

      const active = latest.players?.[latest.currentPlayerIndex];
      if (!active?.isAI) {
        return;
      }

      try {
        const move = rummyAiChooseMove(
          latest,
          latest.currentPlayerIndex,
          difficulty,
        );

        const next = rummyReducer(latest, {
          type: move.type,
          pid: latest.currentPlayerIndex,
          ...move,
        });

        if (next !== latest) {
          applyState(next);
        }
      } catch (err) {}
    }, AI_MOVE_DELAY_MS);
  }

  function applyState(nextState) {
    fullRef.current = nextState;
    setGameState(toPublicState(nextState));
    setMyHand(
      nextState.hands?.[localPlayerIndex]
        ? [...nextState.hands[localPlayerIndex]]
        : [],
    );
    clearSelection();

    if (!isSinglePlayer) {
      broadcastToClients({
        type: "GAME_STATE",
        ...toPublicState(nextState),
      });

      (nextState.players || []).forEach((player, index) => {
        if (player.isAI || String(player.id) === "host") {
          return;
        }

        sendToClient(player.id, {
          type: "PRIVATE_HAND",
          hand: nextState.hands?.[index] ? [...nextState.hands[index]] : [],
        });
      });
    }

    scheduleAI(nextState);
  }

  useEffect(() => {
    if (!isHost) {
      setClientListeners({
        onMessage: (msg) => {
          if (handleClientMessage(msg)) return;
          if (msg.type === "GAME_STATE") {
            setGameState(msg);
            clearSelection();
          }

          if (msg.type === "PRIVATE_HAND") {
            setMyHand(msg.hand || []);
          }
        },
        onDisconnected: () => {
          Alert.alert("Disconnected", "Lost connection to the host.", [
            { text: "OK", onPress: () => navigation.navigate("Home") },
          ]);
        },
      });

      return () => setClientListeners({});
    }

    const initialPlayers =
      Array.isArray(players) && players.length > 0
        ? players
        : [
            { id: "host", name: myName, isAI: false },
            { id: "ai_1", name: "Computer", isAI: true },
          ];

    const rummySaveKey = `@cardnight:save:rummy:${variantId}`;

    async function initGame() {
      if (isSinglePlayer && route?.params?.resumeFromSave) {
        const saved = await loadGame(rummySaveKey);
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
      // ACC-2: hide the hand from screen readers while the staggered deal
      // animates in (~10 cards × 100ms + 350ms), then guarantee a re-reveal.
      // Skip entirely when reduce-motion is on — no animation means no wait.
      if (!reduceMotionRef.current) {
        setHandReady(false);
        if (handReadyTimerRef.current) clearTimeout(handReadyTimerRef.current);
        handReadyTimerRef.current = setTimeout(() => setHandReady(true), 1400);
      }
      applyState(
        createRummyState({ variantId, players: initialPlayers, difficulty }),
      );
    }
    initGame();

    if (!isSinglePlayer) {
      setServerListeners({
        onMessage: (msg, clientId) => {
          if (handleHostMessage(msg, clientId)) return;
          const state = fullRef.current;
          if (!state || state.phase === "game-over") {
            return;
          }

          if (msg.type !== "ACTION") {
            return;
          }

          const playerIndex = state.players.findIndex(
            (player) => String(player.id) === String(clientId),
          );

          if (playerIndex !== state.currentPlayerIndex) {
            return;
          }

          const moveType = msg.moveType || msg.action || msg.typeName;
          if (!moveType) {
            return;
          }

          const next = rummyReducer(state, {
            ...msg,
            // type/pid must win over the wire envelope (msg.type is "ACTION");
            // spreading msg first then overriding fixes the move being ignored.
            type: moveType,
            pid: playerIndex,
          });

          if (next !== state) {
            applyState(next);
          }
        },
      });
    }

    return () => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
      }
      if (handReadyTimerRef.current) {
        clearTimeout(handReadyTimerRef.current);
      }
      if (!isSinglePlayer) {
        setServerListeners({});
      }
    };
  }, []);

  const canGoBack =
    typeof navigation?.canGoBack === "function"
      ? navigation.canGoBack()
      : false;

  function renderHeaderCard(isResults = false) {
    const winnerName =
      gameState?.winner != null
        ? getPlayerName(currentPlayers, gameState.winner)
        : "Nobody";
    const headerSubtitle = isResults
      ? gameState.tie
        ? "The round ended in a tie."
        : `${winnerName} wins the round.`
      : statusMessage;

    return (
      <View
        style={[
          styles.headerCard,
          !showHeaderDetails && styles.headerCardCollapsed,
        ]}
      >
        <Pressable
          onPress={() => setShowHeaderDetails((value) => !value)}
          style={({ pressed }) => [
            styles.headerToggleRow,
            pressed && styles.headerButtonPressed,
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>Rummy</Text>
            <Text style={styles.title}>{variantLabel}</Text>
          </View>

          <Text style={styles.headerToggleText}>
            {showHeaderDetails ? "HIDE" : "SHOW"}
          </Text>
        </Pressable>

        {showHeaderDetails ? (
          <>
            <Text style={styles.subtitle}>{headerSubtitle}</Text>

            {!isResults ? (
              <>
                <View style={styles.metaRow}>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillLabel}>Round</Text>
                    <Text style={styles.metaPillValue}>
                      {gameState.roundNumber || 1}
                    </Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillLabel}>Stock</Text>
                    <Text style={styles.metaPillValue}>
                      {gameState.stockCount ?? 0}
                    </Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillLabel}>Discard</Text>
                    <Text style={styles.metaPillValue}>
                      {gameState.discardCount ?? 0}
                    </Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillLabel}>Deadwood</Text>
                    <Text style={styles.metaPillValue}>{myDeadwood}</Text>
                  </View>
                </View>

                <Text style={styles.turnText}>
                  {getActionLabel(gameState, isMyTurn)}
                  {currentPlayer
                    ? ` • ${getPlayerName(currentPlayers, currentPlayerIndex)} to act`
                    : ""}
                </Text>
              </>
            ) : null}
          </>
        ) : null}
      </View>
    );
  }

  function dispatchAction(moveType, extra = {}, onFail) {
    if (isHost) {
      // Only the host holds the full authoritative state in fullRef.
      const state = fullRef.current;
      if (!state) {
        return;
      }
      const next = rummyReducer(state, {
        type: moveType,
        pid: localPlayerIndex,
        ...extra,
      });

      if (next !== state) {
        applyState(next);
      } else {
        onFail?.();
      }
      return;
    }

    // Client never has fullRef — just send the move; the host validates it.
    sendToHost({
      type: "ACTION",
      moveType,
      ...extra,
    });
  }

  function toggleCard(index) {
    if (!isMyTurn || currentPhase !== "discard" || gameState?.winner != null) {
      return;
    }

    setSelectedHandIndexes((previous) => {
      if (previous.includes(index)) {
        return previous.filter((item) => item !== index);
      }

      return [...previous, index].sort((left, right) => left - right);
    });

    setSelectedMeldIndex(null);
  }

  function toggleMeld(index) {
    if (!isMyTurn || currentPhase !== "discard" || gameState?.winner != null) {
      return;
    }

    const meld = gameState?.melds?.[index];
    if (!meld || meld.owner !== localPlayerIndex) {
      return;
    }

    setSelectedMeldIndex((previous) => (previous === index ? null : index));
    setSelectedHandIndexes([]);
  }

  function handleDrawStock() {
    if (!isMyTurn || currentPhase !== "draw") {
      return;
    }

    dispatchAction("draw-card");
  }

  function handleTakeDiscard() {
    if (!isMyTurn || currentPhase !== "draw" || !discardTop) {
      return;
    }

    dispatchAction("draw-card", { from: "discard" });
  }

  function handleLayMeld() {
    if (!isMyTurn || currentPhase !== "discard") {
      return;
    }

    dispatchAction("lay-meld", { cardIndexes: selectedHandIndexes }, () =>
      showToast("Invalid meld — cards must form a valid set or run"),
    );
  }

  function handleExtendMeld() {
    if (!isMyTurn || currentPhase !== "discard") {
      return;
    }

    dispatchAction(
      "extend-meld",
      { meldIndex: selectedMeldIndex, cardIndex: selectedHandIndexes[0] },
      () => showToast("That card doesn't extend the selected meld"),
    );
  }

  function handleDiscard() {
    if (!isMyTurn || currentPhase !== "discard") {
      return;
    }

    dispatchAction("discard-card", { cardIndex: selectedHandIndexes[0] }, () =>
      showToast("Draw a card before discarding"),
    );
  }

  function handleKnock() {
    if (!isMyTurn || currentPhase !== "discard") {
      return;
    }

    dispatchAction("knock", {}, () =>
      showToast("Can't knock yet — deadwood too high"),
    );
  }

  function handlePlayAgain() {
    if (!isHost || !fullRef.current) {
      return;
    }

    coinRewardedRef.current = false;
    setCoinsEarned(0);
    clearGame(`@cardnight:save:rummy:${variantId}`);
    applyState(
      createRummyState({
        variantId: fullRef.current.variantId,
        players: fullRef.current.players,
        difficulty: fullRef.current.difficulty,
      }),
    );
  }

  // Auto-save after each state change in single-player.
  // Must be before the early return below so hook call order is consistent.
  useEffect(() => {
    if (!isSinglePlayer || !fullRef.current) return;
    const key = `@cardnight:save:rummy:${variantId}`;
    const isOver =
      gameState?.phase === "game-over" ||
      gameState?.winner != null ||
      gameState?.tie;
    if (isOver) {
      clearGame(key);
      return;
    }
    // BUG-4: throttle to once / 3s (state mutates often during a turn).
    const now = Date.now();
    if (now - lastSaveRef.current < 3000) return;
    lastSaveRef.current = now;
    saveGame(key, { fullState: fullRef.current });
  }, [gameState]);

  useEffect(() => {
    if (!isSinglePlayer) return;
    const isWon =
      gameState?.winner != null &&
      !gameState?.tie &&
      gameState.winner === localPlayerIndex;
    if (isWon && !coinRewardedRef.current) {
      coinRewardedRef.current = true;
      const reward = getWinReward("rummy", !isSinglePlayer);
      addCoins(reward).then(() => setCoinsEarned(reward));
      recordWin("rummy");
    }
    // Win/lose buzz, once per finished game (a tie stays silent).
    if (
      gameState?.winner != null &&
      !gameState?.tie &&
      !outcomeBuzzedRef.current
    ) {
      outcomeBuzzedRef.current = true;
      if (isWon) hapticWin();
      else hapticLose();
    }
    if (gameState?.winner == null && !gameState?.tie) {
      coinRewardedRef.current = false;
      outcomeBuzzedRef.current = false;
      setCoinsEarned(0);
    }
  }, [gameState?.winner, gameState?.tie]);

  useEffect(() => {
    const isOver =
      gameState?.phase === "game-over" ||
      gameState?.winner != null ||
      gameState?.tie;
    // Tie the modal to the end state so it dismisses on clients when the host
    // starts a new game (otherwise it stays open and blocks the restart).
    setShowRoundModal(!!isOver);
  }, [gameState?.phase, gameState?.winner, gameState?.tie]);

  useEffect(() => {
    if (variantId !== "ginRummy") return;
    hasSeen("ginRummy").then((seen) => {
      if (!seen) setShowTutorial(true);
    });
  }, []);

  if (!gameState) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: pal.rail }]}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Dealing cards…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (
    gameState.phase === "game-over" ||
    gameState.tie ||
    gameState.winner != null
  ) {
    const winnerName =
      gameState.winner != null
        ? getPlayerName(currentPlayers, gameState.winner)
        : "Nobody";

    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: pal.rail }]}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { backgroundColor: pal.rail },
          ]}
        >
          {renderHeaderCard(true)}

          {isSinglePlayer &&
            gameState.winner === localPlayerIndex &&
            coinsEarned > 0 && (
              <Text style={styles.coinsEarnedText}>+{coinsEarned} coins!</Text>
            )}

          <View style={styles.resultsCard}>
            <Text style={styles.sectionTitle}>Final Scores</Text>
            {(gameState.players || []).map((player, index) => (
              <View key={player.id || index} style={styles.scoreRow}>
                <Text style={styles.scoreName}>
                  {player.name}
                  {index === localPlayerIndex ? " (you)" : ""}
                </Text>
                <Text style={styles.scoreValue}>
                  {gameState.players?.[index]?.score ??
                    fullRef.current?.scores?.[index] ??
                    0}
                </Text>
              </View>
            ))}
          </View>

          <EndOfRoundModal
            visible={showRoundModal}
            title={gameState.tie ? "🤝 It's a Tie!" : `🏆 ${winnerName} wins!`}
            message={
              isSinglePlayer &&
              gameState.winner === localPlayerIndex &&
              coinsEarned > 0
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
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Group every meld by owner, keeping each meld's global index (needed for
  // toggleMeld / extend). Opponent melds render under their bar; yours render
  // in the dedicated "Your melds" zone above the hand.
  const meldGroups = {};
  (gameState.melds || []).forEach((meld, index) => {
    const owner = Number.isInteger(meld?.owner) ? meld.owner : -1;
    (meldGroups[owner] = meldGroups[owner] || []).push({ meld, index });
  });
  const myMeldGroups = meldGroups[localPlayerIndex] || [];

  // A meld's cards as small, lightly overlapped tiles (saves width).
  const renderMeldCards = (cards) =>
    (cards || []).map((card, ci) => (
      <View
        key={card.id ? `${card.id}-${ci}` : ci}
        style={ci > 0 ? { marginLeft: meldOverlap } : null}
      >
        <Card rank={card.rank} suit={card.suit} small />
      </View>
    ));

  // One opponent as a full-width bar: name + hand count + score, with their
  // melds fanned beneath (Conquián-style).
  const renderOppBar = (player, index) => {
    const isActive = index === currentPlayerIndex;
    const isWinner = gameState.winner === index;
    const oppMelds = meldGroups[index] || [];
    return (
      <View
        key={player.id || index}
        style={[
          styles.oppBar,
          { backgroundColor: pal.panel, borderColor: pal.panelBorder },
          isActive && { backgroundColor: pal.accentBg, borderColor: pal.accent },
          isWinner && styles.oppBarWinner,
        ]}
      >
        <View style={styles.oppBarHeader}>
          <ProfileAvatar
            profile={avatarById[String(player.id)]}
            name={player.name}
            size={scale(26)}
            style={{ marginRight: scale(8) }}
          />
          <Text style={styles.oppName} numberOfLines={1}>
            {isWinner ? "🏆 " : ""}
            {player.name}
          </Text>
          <Text style={styles.oppMeta}>🂠 {player.handCount ?? 0}</Text>
          <Text style={styles.oppMeta}>{player.score ?? 0} pts</Text>
          {isActive ? (
            <Text style={[styles.oppTurnDot, { color: pal.accent }]}>▶</Text>
          ) : null}
        </View>
        {oppMelds.length > 0 ? (
          <View style={styles.oppMeldsRow}>
            {oppMelds.map(({ meld, index: gi }) => (
              <View key={gi} style={styles.oppMeldChip}>
                {renderMeldCards(meld.cards)}
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  const canDrawStock = isMyTurn && currentPhase === "draw";
  const canTakeDiscard = canDrawStock && !!discardTop;

  // Frame around each pile; glows with the table accent when it's tappable.
  const pileGlow = (active) => [
    styles.pileFrame,
    active
      ? {
          borderColor: pal.accent,
          backgroundColor: pal.accentBg,
          shadowColor: pal.accent,
          shadowOpacity: 0.95,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
          elevation: 10,
        }
      : { borderColor: "transparent" },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: pal.rail }]}>
      <GameHeader
        gameId="rummy"
        minimal
        leftInfo={
          <Text style={styles.headerInfo}>
            Stock {gameState.stockCount ?? 0} · Deadwood {myDeadwood}
          </Text>
        }
        menuItems={menuItems}
      />
      <YourTurnBanner visible={showTurnBanner} />

      {/* Opponents up top, piles centered below them */}
      <View
        style={[
          styles.centerSection,
          { backgroundColor: pal.felt, borderColor: pal.feltBorder },
        ]}
      >
        <View style={styles.oppStack}>
          {(gameState.players || []).map((player, index) =>
            index === localPlayerIndex ? null : renderOppBar(player, index),
          )}
        </View>

        <View style={styles.pileArea}>
          <View style={styles.pilesRow}>
            <Pressable
              onPress={handleDrawStock}
              disabled={!canDrawStock}
              style={({ pressed }) => [
                styles.pileBtn,
                pressed && canDrawStock && styles.pileBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Draw from stock"
            >
              <View style={pileGlow(canDrawStock)}>
                <Card faceDown sizeScale={PILE_SCALE} />
              </View>
              <Text style={styles.pileTag}>
                STOCK · {gameState.stockCount ?? 0}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleTakeDiscard}
              disabled={!canTakeDiscard}
              style={({ pressed }) => [
                styles.pileBtn,
                pressed && canTakeDiscard && styles.pileBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Take discard"
            >
              <View style={pileGlow(canTakeDiscard)}>
                {discardTop ? (
                  <Card
                    rank={discardTop.rank}
                    suit={discardTop.suit}
                    sizeScale={PILE_SCALE}
                  />
                ) : (
                  <View style={styles.pileEmptyBox}>
                    <Text style={styles.pileEmptyGlyph}>—</Text>
                  </View>
                )}
              </View>
              <Text style={styles.pileTag}>DISCARD</Text>
            </Pressable>
          </View>

          {canDrawStock ? (
            <Text style={[styles.drawHint, { color: pal.accent }]}>
              Tap a pile to draw
            </Text>
          ) : null}
        </View>
      </View>

      {/* Your melds — own zone just above the hand (tap to select for Extend) */}
      {myMeldGroups.length > 0 ? (
        <View style={styles.myMeldsZone}>
          <Text style={styles.zoneLabel}>Your melds</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.myMeldsStrip}
          >
            {myMeldGroups.map(({ meld, index }) => {
              const selected = selectedMeldIndex === index;
              return (
                <Pressable
                  key={index}
                  onPress={() => toggleMeld(index)}
                  style={({ pressed }) => [
                    styles.myMeldChip,
                    selected && {
                      borderColor: pal.accent,
                      backgroundColor: pal.accentBg,
                    },
                    pressed && styles.meldCardPressed,
                  ]}
                >
                  {renderMeldCards(meld.cards)}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Status line */}
      <Text style={styles.rummyStatusLine} numberOfLines={2}>
        {isMyTurn
          ? getActionLabel(gameState, true)
          : `Waiting for ${getPlayerName(currentPlayers, currentPlayerIndex)}…`}
      </Text>

      {/* Hand + actions, pinned at the bottom */}
      <View
        style={[
          styles.handPinned,
          { backgroundColor: pal.tray, borderTopColor: pal.panelBorder },
        ]}
      >
        <View style={styles.handHeader}>
          <Text style={styles.handTitle}>Your Hand ({myHand.length})</Text>
          {selectedHandIndexes.length > 0 ? (
            <Text style={styles.handSelInfo}>
              {selectedHandIndexes.length} selected
              {selectedMeldIndex !== null
                ? ` · meld ${selectedMeldIndex + 1}`
                : ""}
            </Text>
          ) : isMyTurn && currentPhase === "discard" ? (
            <Text style={styles.handSelInfo}>tap to select</Text>
          ) : null}
        </View>

        {isMyTurn && currentPhase === "discard" ? (
          <View style={styles.actionRow}>
            <Pressable
              onPress={handleLayMeld}
              disabled={selectedHandIndexes.length < 3}
              style={({ pressed }) => [
                styles.actionButton,
                styles.layButton,
                selectedHandIndexes.length < 3 && styles.actionButtonDisabled,
                pressed &&
                  selectedHandIndexes.length >= 3 &&
                  styles.actionButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Lay Meld"
              accessibilityHint="Place selected cards as a meld on the table"
              accessibilityState={{ disabled: selectedHandIndexes.length < 3 }}
            >
              <Text style={styles.actionButtonText}>Lay Meld</Text>
            </Pressable>

            <Pressable
              onPress={handleExtendMeld}
              disabled={
                selectedHandIndexes.length !== 1 || selectedMeldIndex === null
              }
              style={({ pressed }) => [
                styles.actionButton,
                styles.extendButton,
                (selectedHandIndexes.length !== 1 ||
                  selectedMeldIndex === null) &&
                  styles.actionButtonDisabled,
                pressed &&
                  selectedHandIndexes.length === 1 &&
                  selectedMeldIndex !== null &&
                  styles.actionButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Extend"
              accessibilityHint="Add selected card to a meld already on the table"
              accessibilityState={{
                disabled:
                  selectedHandIndexes.length !== 1 ||
                  selectedMeldIndex === null,
              }}
            >
              <Text style={styles.actionButtonText}>Extend</Text>
            </Pressable>

            <Pressable
              onPress={handleDiscard}
              disabled={selectedHandIndexes.length !== 1}
              style={({ pressed }) => [
                styles.actionButton,
                styles.discardButton,
                selectedHandIndexes.length !== 1 && styles.actionButtonDisabled,
                pressed &&
                  selectedHandIndexes.length === 1 &&
                  styles.actionButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Discard"
              accessibilityHint="Discard the selected card to end your turn"
              accessibilityState={{
                disabled: selectedHandIndexes.length !== 1,
              }}
            >
              <Text style={styles.actionButtonText}>Discard</Text>
            </Pressable>

            {canKnock && gameState?.winner == null ? (
              <Pressable
                onPress={handleKnock}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.knockButton,
                  pressed && styles.actionButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Knock"
                accessibilityHint="End the round and reveal all hands"
              >
                <Text style={styles.actionButtonText}>Knock</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View
          style={styles.handRow}
          accessibilityElementsHidden={!handReady}
          importantForAccessibility={
            handReady ? "auto" : "no-hide-descendants"
          }
        >
          {myHand.map((card, index) => {
            const selected = selectedHandIndexes.includes(index);
            const allowSelect = isMyTurn && currentPhase === "discard";
            return (
              <RummyCard
                key={`${card.id || `${card.rank}-${card.suit}`}-${index}`}
                card={card}
                small
                selected={selected}
                onPress={() => allowSelect && toggleCard(index)}
                disabled={!allowSelect}
                animateDeal={hasMountedRef.current}
                dealDelay={myHand.length <= 10 ? index * 100 : 0}
              />
            );
          })}
        </View>
      </View>

      <TableThemePicker
        visible={showTablePicker}
        tables={RUMMY_TABLES}
        currentId={tableId}
        onPick={(id) => {
          setRummyTable(id);
          setTableId(id);
          setShowTablePicker(false);
        }}
        onClose={() => setShowTablePicker(false)}
      />

      <Toast message={toastMessage} revision={toastRevision} />
      <TutorialOverlay
        visible={showTutorial}
        slides={GIN_RUMMY_SLIDES}
        gameId="ginRummy"
        onDone={() => setShowTutorial(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
    gap: 14,
    backgroundColor: BG,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BG,
  },
  loadingText: {
    color: "#c4c4d4",
    fontSize: 16,
  },

  // ── Conquián-style table layout ──
  headerInfo: {
    color: "#a4b1c4",
    fontSize: 14,
    fontWeight: "700",
  },
  centerSection: {
    flex: 1,
    margin: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  oppStack: { gap: 6 },
  oppBar: {
    backgroundColor: "#16213e",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#334",
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 40,
  },
  oppBarActive: {
    borderColor: "#ffd700",
    backgroundColor: "rgba(255,215,0,0.08)",
  },
  oppBarWinner: {
    borderColor: "#4caf50",
    backgroundColor: "rgba(76,175,80,0.14)",
  },
  oppBarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  oppName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    flexShrink: 1,
  },
  oppMeta: { color: "#cfe0f0", fontSize: 11, fontWeight: "700" },
  oppTurnDot: { color: "#ffd700", fontSize: 12, fontWeight: "900" },
  oppMeldsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },
  oppMeldChip: { flexDirection: "row" },

  pileArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  myMeldsZone: {
    paddingHorizontal: 12,
    paddingTop: 6,
    gap: 6,
  },
  zoneLabel: {
    color: "#A7B3C9",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  myMeldsStrip: { flexDirection: "row", gap: 12, paddingRight: 8 },
  myMeldChip: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "transparent",
    padding: 3,
  },
  myMeldChipSelected: {
    borderColor: "#7fb3ff",
    backgroundColor: "rgba(127, 179, 255, 0.10)",
  },
  handPinned: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
    backgroundColor: "#0f1626",
    borderTopWidth: 1,
    borderTopColor: "#2a3650",
  },

  // (Table Theme picker styles now live in components/TableThemePicker.js.)

  // ── Table layout ──
  seatRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 10,
  },
  seat: {
    minWidth: 104,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  seatActive: {
    borderColor: "#ffd700",
    backgroundColor: "rgba(255,215,0,0.10)",
  },
  seatWinner: {
    borderColor: "#4caf50",
    backgroundColor: "rgba(76,175,80,0.16)",
  },
  seatName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    maxWidth: 130,
    textAlign: "center",
  },
  seatMeta: { color: "#cfe0f0", fontSize: 11, marginTop: 2 },

  pilesRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 28,
  },
  pileBtn: { alignItems: "center", gap: 6 },
  pileBtnPressed: { opacity: 0.75 },
  pileFrame: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  pileBack: {
    width: 56,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#16213e",
    borderWidth: 1,
    borderColor: "#3a4a6a",
    alignItems: "center",
    justifyContent: "center",
  },
  pileBackGlyph: { color: "#8aa0c0", fontSize: 30 },
  pileEmptyBox: {
    width: 81,
    height: 115,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  pileEmptyGlyph: { color: "#8aa0c0", fontSize: 20 },
  pileTag: {
    color: "#cfe0f0",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  drawHint: {
    color: "#ffe08a",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginTop: -6,
  },

  meldsZone: { gap: 8 },
  meldsZoneLabel: {
    color: "#A7B3C9",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  meldsStrip: { flexDirection: "row", gap: 10, paddingRight: 8 },

  rummyStatusLine: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 12,
  },

  handHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  handTitle: { color: "#fff", fontSize: 15, fontWeight: "800" },
  handSelInfo: { color: "#9fd0dd", fontSize: 12, fontWeight: "700" },
  headerCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#0B1320",
    padding: 16,
    gap: 10,
  },
  headerCardCollapsed: {
    paddingVertical: 12,
    gap: 8,
  },
  headerToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerButtonPressed: {
    opacity: 0.9,
  },
  headerToggleText: {
    color: "#f4f7fb",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.9,
    borderWidth: 1,
    borderColor: "#2f3c55",
    backgroundColor: "#1d2637",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  kicker: {
    color: "#7fb3ff",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    color: "#F4F7FB",
    fontSize: 30,
    fontWeight: "900",
  },
  subtitle: {
    color: "#A7B3C9",
    fontSize: 15,
    lineHeight: 21,
  },
  statusText: {
    color: "#DCE5F2",
    fontSize: 14,
    lineHeight: 20,
  },
  turnText: {
    color: "#95A4BB",
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#101521",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaPillLabel: {
    color: "#A7B3C9",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metaPillValue: {
    color: "#F4F7FB",
    fontSize: 12,
    fontWeight: "800",
  },
  tableCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#0B1320",
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    color: "#F4F7FB",
    fontSize: 18,
    fontWeight: "800",
  },
  tableTopRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  pileBox: {
    minWidth: 92,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#101521",
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  pileLabel: {
    color: "#A7B3C9",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  pileCount: {
    color: "#F4F7FB",
    fontSize: 22,
    fontWeight: "900",
  },
  emptyPileText: {
    color: "#7F8EA8",
    fontSize: 13,
    fontWeight: "700",
  },
  playersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  playerChip: {
    flexGrow: 1,
    minWidth: "47%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#101521",
    padding: 12,
    gap: 2,
  },
  playerChipActive: {
    borderColor: "#e94560",
    backgroundColor: "rgba(233, 69, 96, 0.12)",
  },
  playerChipMe: {
    borderColor: "#4caf50",
  },
  playerChipName: {
    color: "#F4F7FB",
    fontSize: 14,
    fontWeight: "800",
  },
  playerChipNameActive: {
    color: "#ffb0bf",
  },
  playerChipMeta: {
    color: "#A7B3C9",
    fontSize: 12,
    marginTop: 2,
  },
  meldsCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#0B1320",
    padding: 16,
    gap: 10,
  },
  meldsList: {
    gap: 10,
  },
  meldCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#2A3550",
    backgroundColor: "#101521",
    padding: 12,
    gap: 10,
  },
  meldCardSelected: {
    borderColor: "#7fb3ff",
    backgroundColor: "rgba(127, 179, 255, 0.1)",
  },
  meldCardPressed: {
    opacity: 0.92,
  },
  meldCardDimmed: {
    opacity: 0.9,
  },
  meldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  meldLabel: {
    color: "#DCE5F2",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  meldOwner: {
    color: "#95A4BB",
    fontSize: 12,
    fontWeight: "700",
  },
  meldCards: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  handCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#0B1320",
    padding: 16,
    gap: 12,
  },
  helperText: {
    color: "#A7B3C9",
    fontSize: 13,
    lineHeight: 18,
  },
  handRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    columnGap: 0,
    rowGap: 6,
  },
  cardWrap: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  cardWrapSmall: {
    // No scale transform here: a transform shrinks the card visually but still
    // reserves the full-size layout box, leaving dead space between cards.
    // A small negative margin instead tucks the hand cards close together.
    marginHorizontal: -3,
  },
  cardWrapSelected: {
    borderColor: "#4caf50",
    backgroundColor: "rgba(76, 175, 80, 0.12)",
    shadowColor: "#4caf50",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  cardWrapPressed: {
    opacity: 0.92,
  },
  cardWrapDisabled: {
    opacity: 1,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    minHeight: 50,
    flexGrow: 1,
    minWidth: "22%",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  actionButtonPressed: {
    opacity: 0.9,
  },
  actionButtonDisabled: {
    opacity: 0.38,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  drawButton: {
    backgroundColor: "#1565c0",
  },
  takeButton: {
    backgroundColor: "#8e44ad",
  },
  layButton: {
    backgroundColor: "#2e7d32",
  },
  extendButton: {
    backgroundColor: "#7fb3ff",
  },
  discardButton: {
    backgroundColor: "#e94560",
  },
  knockButton: {
    backgroundColor: "#c1121f",
  },
  selectionText: {
    color: "#95A4BB",
    fontSize: 12,
    textAlign: "center",
  },
  coinsEarnedText: {
    color: "#ffd700",
    fontSize: scaleFont(20),
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: scale(12),
  },
  resultsCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#0B1320",
    padding: 16,
    gap: 10,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2A3D",
  },
  scoreName: {
    color: "#F4F7FB",
    fontSize: 14,
    fontWeight: "700",
  },
  scoreValue: {
    color: "#DCE5F2",
    fontSize: 14,
    fontWeight: "900",
  },
  primaryButton: {
    backgroundColor: "#e94560",
    borderRadius: 18,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: "#16213e",
    borderRadius: 18,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#24344D",
  },
  secondaryButtonPressed: {
    opacity: 0.9,
  },
  secondaryButtonText: {
    color: "#DCE5F2",
    fontSize: 16,
    fontWeight: "800",
  },
  waitText: {
    color: "#A7B3C9",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 8,
  },
  emptyText: {
    color: "#95A4BB",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 6,
  },
});
