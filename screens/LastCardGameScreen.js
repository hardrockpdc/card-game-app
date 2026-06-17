import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  useWindowDimensions,
  Alert,
  BackHandler,
  AccessibilityInfo,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import GameHeader from "../components/GameHeader";
import EndOfRoundModal from "../components/EndOfRoundModal";
import YourTurnBanner from "../components/YourTurnBanner";
import {
  COLORS,
  createDeck,
  dealHands,
  isPlayable,
  applyCard,
  chooseColor,
  drawCard,
  checkWin,
  getAIMove,
  getNextPlayer,
  drawUntilPlayable,
} from "../game/lastCard";
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
import { addCoins } from "../game/wallet";
import { saveGame, loadGame, clearGame } from "../game/gameSaves";
import { recordWin } from "../game/profile";
import { getTableTheme } from "../game/tableThemes";
import {
  hapticImpact,
  hapticButton,
  hapticWin,
  hapticLose,
  hapticError,
  HapticStyle,
} from "../game/haptics";

const SAVE_KEY_LASTCARD = "@cardnight:save:lastcard";

const BG = getTableTheme("lastcard").table;

const COLOR_HEX = {
  od_green: "#556B2F",
  crimson: "#B92841",
  turquoise: "#40E0D0",
  coral: "#FF7F50",
};

const COLOR_LABELS = {
  od_green: "OD Green",
  crimson: "Crimson",
  turquoise: "Turquoise",
  coral: "Coral",
};

// Translucent version of a #rrggbb hex — used for the active-colour halo behind
// the discard pile. (A coloured glow via elevation doesn't render on Android, so
// we draw a soft colour wash instead.)
function colorWithAlpha(hex, alpha) {
  if (typeof hex !== "string" || hex[0] !== "#" || hex.length < 7) {
    return `rgba(85,85,85,${alpha})`;
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const LC = {
  card_back: require("../assets/card_images_lastcard/card_back.png"),
  od_green_0: require("../assets/card_images_lastcard/od_green_0.png"),
  od_green_1a: require("../assets/card_images_lastcard/od_green_1a.png"),
  od_green_1b: require("../assets/card_images_lastcard/od_green_1b.png"),
  od_green_2a: require("../assets/card_images_lastcard/od_green_2a.png"),
  od_green_2b: require("../assets/card_images_lastcard/od_green_2b.png"),
  od_green_3a: require("../assets/card_images_lastcard/od_green_3a.png"),
  od_green_3b: require("../assets/card_images_lastcard/od_green_3b.png"),
  od_green_4a: require("../assets/card_images_lastcard/od_green_4a.png"),
  od_green_4b: require("../assets/card_images_lastcard/od_green_4b.png"),
  od_green_5a: require("../assets/card_images_lastcard/od_green_5a.png"),
  od_green_5b: require("../assets/card_images_lastcard/od_green_5b.png"),
  od_green_6a: require("../assets/card_images_lastcard/od_green_6a.png"),
  od_green_6b: require("../assets/card_images_lastcard/od_green_6b.png"),
  od_green_7a: require("../assets/card_images_lastcard/od_green_7a.png"),
  od_green_7b: require("../assets/card_images_lastcard/od_green_7b.png"),
  od_green_8a: require("../assets/card_images_lastcard/od_green_8a.png"),
  od_green_8b: require("../assets/card_images_lastcard/od_green_8b.png"),
  od_green_9a: require("../assets/card_images_lastcard/od_green_9a.png"),
  od_green_9b: require("../assets/card_images_lastcard/od_green_9b.png"),
  od_green_skipa: require("../assets/card_images_lastcard/od_green_skipa.png"),
  od_green_skipb: require("../assets/card_images_lastcard/od_green_skipb.png"),
  od_green_reversea: require("../assets/card_images_lastcard/od_green_reversea.png"),
  od_green_reverseb: require("../assets/card_images_lastcard/od_green_reverseb.png"),
  od_green_draw2a: require("../assets/card_images_lastcard/od_green_draw2a.png"),
  od_green_draw2b: require("../assets/card_images_lastcard/od_green_draw2b.png"),
  crimson_0: require("../assets/card_images_lastcard/crimson_0.png"),
  crimson_1a: require("../assets/card_images_lastcard/crimson_1a.png"),
  crimson_1b: require("../assets/card_images_lastcard/crimson_1b.png"),
  crimson_2a: require("../assets/card_images_lastcard/crimson_2a.png"),
  crimson_2b: require("../assets/card_images_lastcard/crimson_2b.png"),
  crimson_3a: require("../assets/card_images_lastcard/crimson_3a.png"),
  crimson_3b: require("../assets/card_images_lastcard/crimson_3b.png"),
  crimson_4a: require("../assets/card_images_lastcard/crimson_4a.png"),
  crimson_4b: require("../assets/card_images_lastcard/crimson_4b.png"),
  crimson_5a: require("../assets/card_images_lastcard/crimson_5a.png"),
  crimson_5b: require("../assets/card_images_lastcard/crimson_5b.png"),
  crimson_6a: require("../assets/card_images_lastcard/crimson_6a.png"),
  crimson_6b: require("../assets/card_images_lastcard/crimson_6b.png"),
  crimson_7a: require("../assets/card_images_lastcard/crimson_7a.png"),
  crimson_7b: require("../assets/card_images_lastcard/crimson_7b.png"),
  crimson_8a: require("../assets/card_images_lastcard/crimson_8a.png"),
  crimson_8b: require("../assets/card_images_lastcard/crimson_8b.png"),
  crimson_9a: require("../assets/card_images_lastcard/crimson_9a.png"),
  crimson_9b: require("../assets/card_images_lastcard/crimson_9b.png"),
  crimson_skipa: require("../assets/card_images_lastcard/crimson_skipa.png"),
  crimson_skipb: require("../assets/card_images_lastcard/crimson_skipb.png"),
  crimson_reversea: require("../assets/card_images_lastcard/crimson_reversea.png"),
  crimson_reverseb: require("../assets/card_images_lastcard/crimson_reverseb.png"),
  crimson_draw2a: require("../assets/card_images_lastcard/crimson_draw2a.png"),
  crimson_draw2b: require("../assets/card_images_lastcard/crimson_draw2b.png"),
  turquoise_0: require("../assets/card_images_lastcard/turquoise_0.png"),
  turquoise_1a: require("../assets/card_images_lastcard/turquoise_1a.png"),
  turquoise_1b: require("../assets/card_images_lastcard/turquoise_1b.png"),
  turquoise_2a: require("../assets/card_images_lastcard/turquoise_2a.png"),
  turquoise_2b: require("../assets/card_images_lastcard/turquoise_2b.png"),
  turquoise_3a: require("../assets/card_images_lastcard/turquoise_3a.png"),
  turquoise_3b: require("../assets/card_images_lastcard/turquoise_3b.png"),
  turquoise_4a: require("../assets/card_images_lastcard/turquoise_4a.png"),
  turquoise_4b: require("../assets/card_images_lastcard/turquoise_4b.png"),
  turquoise_5a: require("../assets/card_images_lastcard/turquoise_5a.png"),
  turquoise_5b: require("../assets/card_images_lastcard/turquoise_5b.png"),
  turquoise_6a: require("../assets/card_images_lastcard/turquoise_6a.png"),
  turquoise_6b: require("../assets/card_images_lastcard/turquoise_6b.png"),
  turquoise_7a: require("../assets/card_images_lastcard/turquoise_7a.png"),
  turquoise_7b: require("../assets/card_images_lastcard/turquoise_7b.png"),
  turquoise_8a: require("../assets/card_images_lastcard/turquoise_8a.png"),
  turquoise_8b: require("../assets/card_images_lastcard/turquoise_8b.png"),
  turquoise_9a: require("../assets/card_images_lastcard/turquoise_9a.png"),
  turquoise_9b: require("../assets/card_images_lastcard/turquoise_9b.png"),
  turquoise_skipa: require("../assets/card_images_lastcard/turquoise_skipa.png"),
  turquoise_skipb: require("../assets/card_images_lastcard/turquoise_skipb.png"),
  turquoise_reversea: require("../assets/card_images_lastcard/turquoise_reversea.png"),
  turquoise_reverseb: require("../assets/card_images_lastcard/turquoise_reverseb.png"),
  turquoise_draw2a: require("../assets/card_images_lastcard/turquoise_draw2a.png"),
  turquoise_draw2b: require("../assets/card_images_lastcard/turquoise_draw2b.png"),
  coral_0: require("../assets/card_images_lastcard/coral_0.png"),
  coral_1a: require("../assets/card_images_lastcard/coral_1a.png"),
  coral_1b: require("../assets/card_images_lastcard/coral_1b.png"),
  coral_2a: require("../assets/card_images_lastcard/coral_2a.png"),
  coral_2b: require("../assets/card_images_lastcard/coral_2b.png"),
  coral_3a: require("../assets/card_images_lastcard/coral_3a.png"),
  coral_3b: require("../assets/card_images_lastcard/coral_3b.png"),
  coral_4a: require("../assets/card_images_lastcard/coral_4a.png"),
  coral_4b: require("../assets/card_images_lastcard/coral_4b.png"),
  coral_5a: require("../assets/card_images_lastcard/coral_5a.png"),
  coral_5b: require("../assets/card_images_lastcard/coral_5b.png"),
  coral_6a: require("../assets/card_images_lastcard/coral_6a.png"),
  coral_6b: require("../assets/card_images_lastcard/coral_6b.png"),
  coral_7a: require("../assets/card_images_lastcard/coral_7a.png"),
  coral_7b: require("../assets/card_images_lastcard/coral_7b.png"),
  coral_8a: require("../assets/card_images_lastcard/coral_8a.png"),
  coral_8b: require("../assets/card_images_lastcard/coral_8b.png"),
  coral_9a: require("../assets/card_images_lastcard/coral_9a.png"),
  coral_9b: require("../assets/card_images_lastcard/coral_9b.png"),
  coral_skipa: require("../assets/card_images_lastcard/coral_skipa.png"),
  coral_skipb: require("../assets/card_images_lastcard/coral_skipb.png"),
  coral_reversea: require("../assets/card_images_lastcard/coral_reversea.png"),
  coral_reverseb: require("../assets/card_images_lastcard/coral_reverseb.png"),
  coral_draw2a: require("../assets/card_images_lastcard/coral_draw2a.png"),
  coral_draw2b: require("../assets/card_images_lastcard/coral_draw2b.png"),
  wild_1: require("../assets/card_images_lastcard/wild_1.png"),
  wild_2: require("../assets/card_images_lastcard/wild_2.png"),
  wild_3: require("../assets/card_images_lastcard/wild_3.png"),
  wild_4: require("../assets/card_images_lastcard/wild_4.png"),
  wild_draw4_1: require("../assets/card_images_lastcard/wild_draw4_1.png"),
  wild_draw4_2: require("../assets/card_images_lastcard/wild_draw4_2.png"),
  wild_draw4_3: require("../assets/card_images_lastcard/wild_draw4_3.png"),
  wild_draw4_4: require("../assets/card_images_lastcard/wild_draw4_4.png"),
};

const COLOR_BASE = { od_green: 0, crimson: 25, turquoise: 50, coral: 75 };
const ACTION_SUFFIX = {
  19: "skipa",
  20: "reversea",
  21: "draw2a",
  22: "skipb",
  23: "reverseb",
  24: "draw2b",
};

function cardImage(card) {
  if (!card) return LC.card_back;
  if (card.type === "wild")
    return LC[`wild_${Math.floor((card.id - 100) / 2) + 1}`] ?? LC.wild_1;
  if (card.type === "wild_draw4")
    return (
      LC[`wild_draw4_${Math.floor((card.id - 101) / 2) + 1}`] ?? LC.wild_draw4_1
    );
  const rel = card.id - (COLOR_BASE[card.color] ?? 0);
  if (card.type === "number") {
    if (card.value === 0) return LC[`${card.color}_0`];
    return LC[`${card.color}_${card.value}${rel % 2 === 1 ? "a" : "b"}`];
  }
  return LC[`${card.color}_${ACTION_SUFFIX[rel]}`] ?? LC.card_back;
}

function cardTitle(card) {
  if (!card) return "";
  if (card.type === "number") return String(card.value);
  if (card.type === "wild") return "Wild";
  if (card.type === "wild_draw4") return "Wild +4";
  if (card.type === "draw2") return "+2";
  if (card.type === "skip") return "Skip";
  if (card.type === "reverse") return "Reverse";
  return card.type;
}

function cardLabel(card) {
  if (!card) return "";
  if (card.type === "number") return String(card.value);
  if (card.type === "wild") return "Wild";
  if (card.type === "wild_draw4") return "Wild +4";
  if (card.type === "draw2") return "+2";
  if (card.type === "skip") return "Skip";
  if (card.type === "reverse") return "Reverse";
  return card.type;
}

function buildInitialState(routePlayers) {
  const deck = createDeck();
  const { hands, remainingDeck } = dealHands(deck, routePlayers.length);
  let idx = remainingDeck.findIndex((c) => c.type === "number");
  if (idx < 0)
    idx = remainingDeck.findIndex(
      (c) => c.type !== "wild" && c.type !== "wild_draw4",
    );
  if (idx < 0) idx = 0;
  const startCard = remainingDeck[idx];
  const drawPile = remainingDeck.filter((_, i) => i !== idx);
  const playerHands = Object.fromEntries(
    routePlayers.map((p, i) => [String(p.id), hands[String(i)] ?? []]),
  );

  return {
    drawPile,
    discardPile: [startCard],
    hands: playerHands,
    players: routePlayers.map((p) => ({
      id: String(p.id),
      name: p.name,
      isAI: !!p.isAI,
    })),
    currentTurn: String(routePlayers[0]?.id ?? "host"),
    turnDirection: 1,
    activeColor: startCard.color ?? COLORS[0],
    pendingDraw: 0,
    pendingAction: null,
    skippedPlayer: null,
    awaitingColorChoiceBy: null,
    pendingWildCard: null,
    gameOver: false,
    winner: null,
  };
}

const MY_ID = "host";

function toPublic(state) {
  return {
    drawPileCount: state.drawPile.length,
    topCard: state.discardPile[state.discardPile.length - 1] ?? null,
    activeColor: state.activeColor,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      cardCount: state.hands[p.id]?.length ?? 0,
    })),
    currentTurn: state.currentTurn,
    turnDirection: state.turnDirection === 1 ? "clockwise" : "counterclockwise",
    pendingAction: state.pendingAction,
    gameOver: state.gameOver,
    winner: state.winner,
  };
}

// Swipe-up-to-play tuning.
const SWIPE_PLAY_THRESHOLD = 56; // px upward to count as a play
const SWIPE_FOLLOW_MAX = 150; // clamp how far the card follows the finger
const SWIPE_FLY = 130; // fly-up distance on release-to-play

// Wraps a hand card so an upward swipe plays it (tap still works as a fallback).
// Only an upward drag activates; sideways/downward is left to the scroll list.
function SwipeToPlayCard({ card, onPlay, playable, reduceMotionRef, children }) {
  const ty = useRef(new Animated.Value(0)).current;
  const onPlayRef = useRef(onPlay);
  onPlayRef.current = onPlay;
  const cardRef = useRef(card);
  cardRef.current = card;
  const playableRef = useRef(playable);
  playableRef.current = playable;

  const gesture = useRef(
    Gesture.Pan()
      .activeOffsetY(-12) // start only on an upward drag
      .failOffsetX([-24, 24]) // sideways → not a play (let the list scroll)
      .runOnJS(true)
      .onUpdate((e) => {
        if (e.translationY < 0) {
          ty.setValue(Math.max(e.translationY, -SWIPE_FOLLOW_MAX));
        }
      })
      .onEnd((e) => {
        const intendsPlay =
          e.translationY < -SWIPE_PLAY_THRESHOLD || e.velocityY < -900;
        const rm = reduceMotionRef?.current;
        const springBack = () => {
          if (rm) ty.setValue(0);
          else
            Animated.spring(ty, {
              toValue: 0,
              useNativeDriver: true,
              friction: 7,
              tension: 90,
            }).start();
        };
        if (!intendsPlay) {
          springBack();
          return;
        }
        if (playableRef.current) {
          // Fly the card up, then play it.
          if (rm) {
            ty.setValue(0);
            onPlayRef.current(cardRef.current);
          } else {
            Animated.timing(ty, {
              toValue: -SWIPE_FLY,
              duration: 130,
              useNativeDriver: true,
            }).start(() => {
              ty.setValue(0);
              onPlayRef.current(cardRef.current);
            });
          }
        } else {
          // Not playable: snap back and let onPlay surface the shake/feedback.
          springBack();
          onPlayRef.current(cardRef.current);
        }
      }),
  ).current;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={{ transform: [{ translateY: ty }] }}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

export default function LastCardGameScreen({ navigation, route }) {
  const {
    role,
    myName,
    players: initialPlayers,
    difficulty = "medium",
  } = route.params;
  const isSinglePlayer = role === "singleplayer";
  const isHost = role === "host" || isSinglePlayer;
  const myPid = isHost
    ? MY_ID
    : String(initialPlayers.find((p) => p.name === myName)?.id ?? myName);
  const { width } = useWindowDimensions();

  const fullRef = useRef(null);
  const mountedRef = useRef(true);
  const stateRef = useRef(null);
  const phaseRef = useRef("playing");
  const lockedRef = useRef(false);
  const pendingWildRef = useRef(null);
  const awaitingDrawRef = useRef(false);
  const aiTimerRef = useRef(null);
  const turnTimerRef = useRef(null);
  const colorTimerRef = useRef(null);
  const yourTurnTimerRef = useRef(null);
  const prevTurnRef = useRef(null);
  const [gameState, setGameState] = useState(null);
  const [showYourTurnBanner, setShowYourTurnBanner] = useState(false);
  const [myHand, setMyHand] = useState([]);
  const [statusMsg, setStatusMsg] = useState("Dealing...");
  const [phase, setPhase] = useState("playing");
  const [winner, setWinner] = useState(null);
  const [shakeId, setShakeId] = useState(null);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [showRoundModal, setShowRoundModal] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const coinRewardedRef = useRef(false);
  const outcomeBuzzedRef = useRef(false); // fire win/lose haptic once per game
  const lastSaveRef = useRef(0); // BUG-4: auto-save throttle (once / 3s)

  // Reduced-motion: swipe-to-play snaps instead of animating when enabled.
  const reduceMotionRef = useRef(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) reduceMotionRef.current = v;
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (v) => {
        reduceMotionRef.current = v;
      },
    );
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  useEffect(
    () => () => {
      mountedRef.current = false;
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
      if (colorTimerRef.current) clearTimeout(colorTimerRef.current);
      if (yourTurnTimerRef.current) clearTimeout(yourTurnTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!isSinglePlayer) return;
    const isWon = phase === "gameOver" && winner === myPid;
    if (isWon && !coinRewardedRef.current) {
      coinRewardedRef.current = true;
      clearGame(SAVE_KEY_LASTCARD);
      addCoins(500).then(() => setCoinsEarned(500));
      recordWin("lastcard");
    }
    // Win/lose buzz, once per finished game.
    if (phase === "gameOver" && !outcomeBuzzedRef.current) {
      outcomeBuzzedRef.current = true;
      if (isWon) hapticWin();
      else hapticLose();
    }
    if (phase !== "gameOver") {
      coinRewardedRef.current = false;
      outcomeBuzzedRef.current = false;
      setCoinsEarned(0);
    }
  }, [phase, winner]);

  useEffect(() => {
    if (phase === "gameOver") {
      setShowRoundModal(true);
    }
  }, [phase]);

  // Auto-save after each state update in single-player.
  useEffect(() => {
    if (!isSinglePlayer || !fullRef.current) return;
    // BUG-4: throttle to once / 3s.
    const now = Date.now();
    if (now - lastSaveRef.current < 3000) return;
    lastSaveRef.current = now;
    saveGame(SAVE_KEY_LASTCARD, { fullState: fullRef.current });
  }, [gameState]);

  // Show "Your Turn!" banner whenever the turn transitions to the local player.
  useEffect(() => {
    const currentTurn = gameState?.currentTurn;
    if (
      currentTurn === myPid &&
      prevTurnRef.current !== myPid &&
      phase === "playing"
    ) {
      setShowYourTurnBanner(true);
      scheduleTimeout(
        yourTurnTimerRef,
        () => setShowYourTurnBanner(false),
        1500,
      );
    }
    prevTurnRef.current = currentTurn;
  }, [gameState?.currentTurn]);

  function scheduleTimeout(ref, fn, ms) {
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(() => {
      ref.current = null;
      fn();
    }, ms);
  }

  function triggerShake(cardId) {
    setShakeId(cardId);
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 9,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -9,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 6,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -6,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 55,
        useNativeDriver: true,
      }),
    ]).start(() => setShakeId(null));
  }

  function broadcastState(next) {
    if (isSinglePlayer) return;
    const pub = toPublic(next);
    broadcastToClients({ type: "GAME_STATE", ...pub });
    next.players.forEach((p) => {
      if (p.id === "host") return;
      sendToClient(p.id, {
        type: "PRIVATE_HAND",
        hand: next.hands[p.id] ?? [],
      });
    });
  }

  function applyState(next) {
    fullRef.current = next;
    stateRef.current = next;
    const pub = toPublic(next);
    setGameState(pub);
    setMyHand(next.hands[myPid] ?? []);
    setWinner(next.winner ?? null);
    setPhase(
      next.awaitingColorChoiceBy
        ? "colorPicker"
        : next.gameOver
          ? "gameOver"
          : "playing",
    );
    if (next.gameOver && next.winner) {
      setStatusMsg(
        `${next.players.find((p) => p.id === next.winner)?.name ?? "Player"} wins!`,
      );
    }
    if (!next.awaitingColorChoiceBy && !next.gameOver) {
      pendingWildRef.current = null;
    }
    broadcastState(next);
  }

  function hasPlayableCard(state, pid) {
    const hand = state.hands[pid] ?? [];
    const topCard = state.discardPile[state.discardPile.length - 1];
    const hasColorMatch = hand.some((c) => c.color === state.activeColor);
    return hand.some((c) =>
      isPlayable(c, topCard, state.activeColor, hasColorMatch),
    );
  }

  function nextTurnNow(state) {
    if (state.gameOver) return state;
    const w = checkWin(state);
    if (w) {
      return {
        ...state,
        gameOver: true,
        winner: w,
      };
    }
    if (state.pendingDraw > 0) {
      const pid = state.currentTurn;
      const name = state.players.find((p) => p.id === pid)?.name ?? pid;
      let s = state;
      for (let i = 0; i < state.pendingDraw; i++) {
        const r = drawCard(s, pid);
        s = r.state;
        if (!r.drawnCard) break;
      }
      const next = {
        ...s,
        pendingDraw: 0,
        pendingAction: null,
        currentTurn: getNextPlayer(s),
      };
      setStatusMsg(
        pid === myPid
          ? `You draw ${state.pendingDraw} cards and lose your turn!`
          : `${name} draws ${state.pendingDraw} cards!`,
      );
      return next;
    }
    return state;
  }

  function handleTurn(s) {
    if (!s || !mountedRef.current) return;
    if (phaseRef.current === "colorPicker") return;

    const winnerId = checkWin(s);
    if (winnerId) {
      const next = { ...s, gameOver: true, winner: winnerId };
      applyState(next);
      return;
    }

    if (s.pendingDraw > 0) {
      const next = nextTurnNow(s);
      applyState(next);
      scheduleTimeout(turnTimerRef, () => handleTurn(stateRef.current), 1100);
      return;
    }

    if (s.currentTurn === myPid) {
      lockedRef.current = false;
      const hasPlay = hasPlayableCard(s, myPid);
      setStatusMsg(
        hasPlay
          ? "Your turn — tap a card to play"
          : "No cards to play — tap deck to draw",
      );
      if (!isHost) return;
      if (isSinglePlayer) {
        scheduleTimeout(aiTimerRef, () => doHostAITurn(), 1200);
      }
      return;
    }

    lockedRef.current = true;
    const currentName =
      s.players.find((p) => p.id === s.currentTurn)?.name ?? "Player";
    setStatusMsg(`${currentName}'s turn...`);

    if (isHost) {
      const currentPlayer = s.players.find((p) => p.id === s.currentTurn);
      if (currentPlayer?.isAI) {
        scheduleTimeout(
          aiTimerRef,
          () => doHostAITurn(),
          1000 + Math.random() * 500,
        );
      }
    }
  }

  function finishTurn(next) {
    applyState(next);
    scheduleTimeout(turnTimerRef, () => handleTurn(stateRef.current), 300);
  }

  function resolveIfNeeded(next) {
    const w = checkWin(next);
    if (w) {
      const final = { ...next, gameOver: true, winner: w };
      applyState(final);
      return final;
    }
    return next;
  }

  function doHostCardPlay(playerId, card, chosenColor = null) {
    const s = fullRef.current;
    if (!s || s.gameOver) return s;
    const next = applyCard(s, playerId, card, chosenColor);
    if (next === s) return s;
    return resolveIfNeeded(next);
  }

  function doHostDraw(playerId) {
    const s = fullRef.current;
    if (!s || s.gameOver) return s;
    const result = drawUntilPlayable(s, playerId);
    const playerName =
      s.players.find((p) => p.id === playerId)?.name ?? "Player";

    if (!result.drawnCard) {
      setStatusMsg(`${playerName} cannot draw any more cards.`);
      return resolveIfNeeded(result.state);
    }

    const drawCount =
      (result.state.hands[playerId]?.length ?? 0) -
      (s.hands[playerId]?.length ?? 0);
    const drawn = result.playableCard;
    let next;

    if (drawn.type === "wild" || drawn.type === "wild_draw4") {
      pendingWildRef.current = drawn;
      setPhase("colorPicker");
      setStatusMsg(
        `${playerName} draws ${drawCount} card${drawCount !== 1 ? "s" : ""} and must choose a color`,
      );
      next = applyCard(result.state, playerId, drawn, null);
    } else {
      setStatusMsg(
        `${playerName} draws ${drawCount} card${drawCount !== 1 ? "s" : ""} and plays ${cardLabel(drawn)}`,
      );
      next = applyCard(result.state, playerId, drawn, null);
    }

    return resolveIfNeeded(next);
  }

  function doHostAITurn() {
    const s = fullRef.current;
    if (!s || s.gameOver) return;
    const current = s.players.find((p) => p.id === s.currentTurn);
    if (!current?.isAI) return;

    try {
      const move = getAIMove(s, current.id);
      if (move) {
        const next = doHostCardPlay(current.id, move.card, move.chosenColor);
        if (next !== s) {
          const parts = [`${current.name} plays ${cardLabel(move.card)}`];
          if (move.card.type === "skip") parts.push("— skips next player!");
          if (move.card.type === "reverse") parts.push("— reverses direction!");
          if (move.card.type === "draw2") parts.push("— next player draws 2!");
          if (move.card.type === "wild_draw4")
            parts.push("— next player draws 4!");
          if (move.chosenColor)
            parts.push(`— picks ${COLOR_LABELS[move.chosenColor]}`);
          setStatusMsg(parts.join(" "));
          applyState(next);
          scheduleTimeout(
            turnTimerRef,
            () => handleTurn(stateRef.current),
            1100,
          );
          return;
        }
      }

      let nextState = s;
      let drawn = null;
      let count = 0;
      while (true) {
        const r = drawCard(nextState, current.id);
        nextState = r.state;
        if (!r.drawnCard) break;
        drawn = r.drawnCard;
        count += 1;
        const topCard = nextState.discardPile[nextState.discardPile.length - 1];
        const hand = nextState.hands[current.id] ?? [];
        const hasColorMatch = hand.some(
          (c) => c.color === nextState.activeColor,
        );
        if (isPlayable(drawn, topCard, nextState.activeColor, hasColorMatch))
          break;
      }

      if (!drawn) {
        const final = { ...nextState, currentTurn: getNextPlayer(nextState) };
        setStatusMsg(`${current.name} cannot draw any more cards.`);
        applyState(resolveIfNeeded(final));
        scheduleTimeout(turnTimerRef, () => handleTurn(stateRef.current), 1100);
        return;
      }

      setStatusMsg(
        `${current.name} draws ${count} card${count !== 1 ? "s" : ""}`,
      );
      applyState(nextState);

      const topCard = nextState.discardPile[nextState.discardPile.length - 1];
      const hand = nextState.hands[current.id] ?? [];
      const hasColorMatch = hand.some((c) => c.color === nextState.activeColor);
      if (isPlayable(drawn, topCard, nextState.activeColor, hasColorMatch)) {
        scheduleTimeout(
          turnTimerRef,
          () => {
            const fresh = stateRef.current;
            if (!fresh || fresh.gameOver || fresh.currentTurn !== current.id)
              return;
            const chosenColor =
              drawn.type === "wild" || drawn.type === "wild_draw4"
                ? (() => {
                    const counts = {};
                    for (const c of fresh.hands[current.id] ?? []) {
                      if (c.color) counts[c.color] = (counts[c.color] || 0) + 1;
                    }
                    const entries = Object.entries(counts);
                    if (!entries.length) {
                      return COLORS[Math.floor(Math.random() * COLORS.length)];
                    }
                    return entries.reduce((best, cur) =>
                      cur[1] > best[1] ? cur : best,
                    )[0];
                  })()
                : null;
            const final = resolveIfNeeded(
              applyCard(fresh, current.id, drawn, chosenColor),
            );
            applyState(final);
            scheduleTimeout(
              turnTimerRef,
              () => handleTurn(stateRef.current),
              300,
            );
          },
          900,
        );
      } else {
        const final = { ...nextState, currentTurn: getNextPlayer(nextState) };
        applyState(resolveIfNeeded(final));
        scheduleTimeout(turnTimerRef, () => handleTurn(stateRef.current), 1100);
      }
    } catch (err) {}
  }

  useEffect(() => {
    if (!isHost) return;

    async function init() {
      if (isSinglePlayer && route?.params?.resumeFromSave) {
        const saved = await loadGame(SAVE_KEY_LASTCARD);
        if (saved?.fullState) {
          applyState(saved.fullState);
          scheduleTimeout(turnTimerRef, () => handleTurn(saved.fullState), 300);
          return;
        }
      }
      const next = buildInitialState(initialPlayers);
      applyState(next);
      scheduleTimeout(turnTimerRef, () => handleTurn(next), 300);
    }
    init();

    if (!isSinglePlayer) {
      setServerListeners({
        onClientJoined: () => {},
        onClientLeft: ({ id }) => {
          setStatusMsg(`Player ${id} left the game.`);
        },
        onMessage: (msg, clientId) => {
          const s = fullRef.current;
          if (!s || s.gameOver) return;
          const pid = String(clientId);

          if (msg.type === "JOIN") return;

          if (msg.type === "PLAY_CARD") {
            if (s.currentTurn !== pid || s.awaitingColorChoiceBy) return;
            const hand = s.hands[pid] ?? [];
            const card = hand.find((c) => c.id === msg.cardId);
            if (!card) return;

            const isWild = card.type === "wild" || card.type === "wild_draw4";
            const nextState = applyCard(s, pid, card, msg.chosenColor ?? null);
            if (nextState === s) return;
            const final = resolveIfNeeded(nextState);
            applyState(final);

            if (isWild && !msg.chosenColor) {
              setStatusMsg(
                `${s.players.find((p) => p.id === pid)?.name ?? "Player"} played a wild card.`,
              );
              return;
            }

            scheduleTimeout(
              turnTimerRef,
              () => handleTurn(stateRef.current),
              300,
            );
            return;
          }

          if (msg.type === "DRAW_CARD") {
            if (s.currentTurn !== pid || s.awaitingColorChoiceBy) return;
            const nextState = doHostDraw(pid);
            applyState(nextState);
            scheduleTimeout(
              turnTimerRef,
              () => handleTurn(stateRef.current),
              300,
            );
            return;
          }

          if (msg.type === "CHOOSE_COLOR") {
            if (String(s.awaitingColorChoiceBy) !== pid) return;
            const nextState = resolveIfNeeded(chooseColor(s, pid, msg.color));
            if (nextState === s) return;
            applyState(nextState);
            scheduleTimeout(
              turnTimerRef,
              () => handleTurn(stateRef.current),
              300,
            );
          }
        },
      });
    }
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isHost) return;
    setClientListeners({
      onMessage: (msg) => {
        if (msg.type === "GAME_STATE") {
          const shouldShowColorPicker =
            awaitingDrawRef.current &&
            msg.currentTurn === myPid &&
            msg.topCard &&
            (msg.topCard.type === "wild" || msg.topCard.type === "wild_draw4");

          awaitingDrawRef.current = false;
          setGameState(msg);
          setWinner(msg.winner ?? null);
          setPhase((prev) => {
            if (msg.gameOver) return "gameOver";
            if (shouldShowColorPicker) return "colorPicker";
            if (prev === "colorPicker" && msg.currentTurn === myPid)
              return "colorPicker";
            return "playing";
          });
          if (shouldShowColorPicker) setStatusMsg("Choose a color");
        }
        if (msg.type === "PRIVATE_HAND") {
          setMyHand(msg.hand ?? []);
        }
      },
      onDisconnected: () =>
        Alert.alert("Disconnected", "Lost connection to the host.", [
          { text: "OK", onPress: () => navigation.navigate("Home") },
        ]),
    });
  }, []);

  useEffect(() => {
    if (!isSinglePlayer || !gameState) return;
    const s = fullRef.current;
    if (!s) return;
    scheduleTimeout(turnTimerRef, () => handleTurn(s), 300);
  }, [
    gameState?.currentTurn,
    gameState?.pendingDraw,
    gameState?.awaitingColorChoiceBy,
  ]);

  function getCurrentState() {
    return fullRef.current;
  }

  function onCardTap(card) {
    const s = getCurrentState();
    if (!s || s.gameOver) return;
    if (phaseRef.current === "colorPicker") return;
    if (s.currentTurn !== myPid) return;
    if (s.awaitingColorChoiceBy) return;
    if (lockedRef.current) return;

    const hand = s.hands[myPid] ?? [];
    const topCard = s.discardPile[s.discardPile.length - 1];
    const hasColorMatch = hand.some((c) => c.color === s.activeColor);
    if (!isPlayable(card, topCard, s.activeColor, hasColorMatch)) {
      triggerShake(card.id);
      hapticError(); // sharp "nope" on an illegal card
      return;
    }

    hapticImpact(HapticStyle.Light); // satisfying tap when a card plays

    if (card.type === "wild" || card.type === "wild_draw4") {
      pendingWildRef.current = card;
      setPhase("colorPicker");
      setStatusMsg("Choose a color");
      if (isHost) {
        const next = applyCard(s, myPid, card, null);
        applyState(next);
      } else {
        sendToHost({ type: "PLAY_CARD", cardId: card.id });
      }
      return;
    }

    lockedRef.current = true;
    if (isHost) {
      const next = resolveIfNeeded(applyCard(s, myPid, card, null));
      if (next !== s) {
        applyState(next);
        scheduleTimeout(turnTimerRef, () => handleTurn(stateRef.current), 300);
      }
    } else {
      sendToHost({ type: "PLAY_CARD", cardId: card.id });
    }
    lockedRef.current = false;
  }

  function onDeckTap() {
    const s = getCurrentState();
    if (!s || s.gameOver) return;
    if (phaseRef.current === "colorPicker") return;
    if (s.currentTurn !== myPid) return;
    if (s.awaitingColorChoiceBy) return;
    if (lockedRef.current) return;

    const hasPlay = hasPlayableCard(s, myPid);
    if (hasPlay) return;

    hapticButton(); // tick when you draw from the deck

    lockedRef.current = true;
    if (isHost) {
      const next = doHostDraw(myPid);
      if (next !== s) {
        applyState(next);
        scheduleTimeout(turnTimerRef, () => handleTurn(stateRef.current), 300);
      }
    } else {
      awaitingDrawRef.current = true;
      setStatusMsg("Drawing...");
      sendToHost({ type: "DRAW_CARD" });
    }
    lockedRef.current = false;
  }

  function onColorPick(color) {
    const s = getCurrentState();
    const pending = pendingWildRef.current;
    if (!s || !pending || s.gameOver) return;

    hapticButton(); // tick when picking a wild color

    pendingWildRef.current = null;
    setPhase("playing");
    setStatusMsg("");

    if (isHost) {
      const next = resolveIfNeeded(chooseColor(s, myPid, color));
      if (next !== s) {
        applyState(next);
        scheduleTimeout(turnTimerRef, () => handleTurn(stateRef.current), 300);
      }
      return;
    }

    sendToHost({ type: "CHOOSE_COLOR", color });
  }

  function onPlayAgain() {
    if (!isHost) return;
    coinRewardedRef.current = false;
    setCoinsEarned(0);
    const next = buildInitialState(initialPlayers);
    applyState(next);
    setStatusMsg("Dealing...");
    setPhase("playing");
    lockedRef.current = false;
    scheduleTimeout(turnTimerRef, () => handleTurn(next), 300);
  }

  const topCard = gameState?.topCard ?? null;
  const myCards = myHand;
  const hasPlayable = getCurrentState()
    ? hasPlayableCard(getCurrentState(), myPid)
    : false;
  const opponents = (gameState?.players ?? []).filter((p) => p.id !== myPid);
  const isMyTurn = gameState?.currentTurn === myPid;
  const turnDirectionGlyph =
    gameState?.turnDirection === "clockwise" ? "↻" : "↺";

  const PILE_W = Math.min(width * 0.26, 108);
  const PILE_H = PILE_W * 1.4;
  const HAND_W = Math.min(width * 0.195, 84);
  const HAND_H = HAND_W * 1.4;
  const activeHex = COLOR_HEX[gameState?.activeColor] ?? "#555";

  function handleQuit() {
    if (isSinglePlayer) clearGame(SAVE_KEY_LASTCARD);
    else if (isHost) stopServer();
    else disconnectFromHost();
    navigation.navigate("Home");
  }

  function handleRestart() {
    if (isSinglePlayer) clearGame(SAVE_KEY_LASTCARD);
    const next = buildInitialState(initialPlayers);
    applyState(next);
    scheduleTimeout(turnTimerRef, () => handleTurn(next), 300);
  }

  function handleSaveAndExit() {
    if (!isSinglePlayer || !fullRef.current) return;
    saveGame(SAVE_KEY_LASTCARD, { fullState: fullRef.current });
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
    { type: "howto", gameId: "lastcard" },
    { type: "theme" },
    { type: "divider" },
    { type: "quit", onQuit: handleQuit },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <GameHeader
        gameId="lastcard"
        title="Last Card"
        subtitle={isSinglePlayer ? "Single Player" : "Multiplayer"}
        menuItems={menuItems}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.seatBar}
        contentContainerStyle={styles.seatBarContent}
      >
        {opponents.map((p) => {
          const isActive = p.id === gameState?.currentTurn;
          return (
            <View
              key={p.id}
              style={[styles.seat, isActive && styles.seatActive]}
            >
              <View style={styles.seatCardWrap}>
                <Image
                  source={LC.card_back}
                  style={styles.seatCardBack}
                  resizeMode="contain"
                />
                <View
                  style={[
                    styles.seatCountBadge,
                    isActive && styles.seatCountBadgeActive,
                  ]}
                >
                  <Text style={styles.seatCountText}>{p.cardCount}</Text>
                </View>
              </View>
              <Text
                style={[styles.seatName, isActive && styles.seatNameActive]}
                numberOfLines={1}
              >
                {isActive ? "▶ " : ""}
                {p.name}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.playArea}>
        {/* Draw pile */}
        <View style={styles.pileColumn}>
          <TouchableOpacity
            style={styles.pileWrapper}
            onPress={onDeckTap}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Draw from deck"
            accessibilityHint="Take a card from the draw pile"
          >
            <View style={[styles.cardShell, { width: PILE_W, height: PILE_H }]}>
              <Image
                source={LC.card_back}
                style={styles.cardArt}
                resizeMode="contain"
              />
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {gameState?.drawPileCount ?? 0}
              </Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.pileLabel}>DRAW</Text>
        </View>

        {/* Direction of play */}
        <Text style={styles.directionIcon}>{turnDirectionGlyph}</Text>

        {/* Discard pile — haloed + ringed in the active colour */}
        <View style={styles.pileColumn}>
          <View
            style={[
              styles.discardHalo,
              { backgroundColor: colorWithAlpha(activeHex, 0.22) },
            ]}
          >
            <View style={[styles.pileWrapper, { borderColor: activeHex }]}>
              {topCard ? (
                <View
                  style={[styles.cardShell, { width: PILE_W, height: PILE_H }]}
                >
                  <Image
                    source={cardImage(topCard)}
                    style={styles.cardArt}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View
                  style={[styles.emptyPile, { width: PILE_W, height: PILE_H }]}
                />
              )}
            </View>
          </View>
          <View style={styles.colorTag}>
            <View style={[styles.colorDot, { backgroundColor: activeHex }]} />
            <Text style={styles.colorLabel} numberOfLines={1}>
              {COLOR_LABELS[gameState?.activeColor] ?? ""}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.statusBar}>
        <Text style={styles.statusText} numberOfLines={2}>
          {statusMsg}
        </Text>
      </View>

      <View style={styles.handArea}>
        <Text style={styles.handLabel}>
          {isMyTurn ? "YOUR TURN" : "YOUR HAND"}
          {"  "}({myCards.length})
        </Text>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.handGrid}
        >
          {myCards.map((card) => {
            const playable = topCard
              ? isPlayable(
                  card,
                  topCard,
                  gameState?.activeColor,
                  myCards.some((c) => c.color === gameState?.activeColor),
                )
              : false;
            const isShaking = card.id === shakeId;
            const shouldDimUnplayable = difficulty === "easy" && !playable;
            return (
              <SwipeToPlayCard
                key={card.id}
                card={card}
                onPlay={onCardTap}
                playable={playable}
                reduceMotionRef={reduceMotionRef}
              >
                <TouchableOpacity
                  onPress={() => onCardTap(card)}
                  activeOpacity={0.85}
                >
                  <Animated.View
                    style={
                      isShaking
                        ? { transform: [{ translateX: shakeAnim }] }
                        : null
                    }
                  >
                    <View
                      style={[
                        styles.cardShell,
                        {
                          width: HAND_W,
                          height: HAND_H,
                          marginHorizontal: 3,
                        },
                        shouldDimUnplayable && styles.dimmed,
                      ]}
                    >
                      <Image
                        source={cardImage(card)}
                        style={styles.cardArt}
                        resizeMode="contain"
                      />
                      <Text style={styles.cardFallbackText}>
                        {cardTitle(card)}
                      </Text>
                    </View>
                  </Animated.View>
                </TouchableOpacity>
              </SwipeToPlayCard>
            );
          })}
        </ScrollView>
      </View>

      {phase === "colorPicker" && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>Choose a color:</Text>
          <View style={styles.colorGrid}>
            {COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[styles.colorBtn, { backgroundColor: COLOR_HEX[color] }]}
                onPress={() => onColorPick(color)}
                accessibilityRole="button"
                accessibilityLabel={COLOR_LABELS[color]}
                accessibilityHint="Set this as the active color"
              >
                <Text style={styles.colorBtnText}>{COLOR_LABELS[color]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <YourTurnBanner visible={showYourTurnBanner} />

      <EndOfRoundModal
        visible={showRoundModal}
        title={
          winner
            ? winner === myPid
              ? "🏆 You Win!"
              : `${(gameState?.players ?? []).find((p) => p.id === winner)?.name ?? "Player"} wins!`
            : "Game Over"
        }
        message={
          isSinglePlayer && winner === myPid && coinsEarned > 0
            ? `+${coinsEarned} coins!`
            : ""
        }
        showContinue={isHost}
        showLeave
        isGameOver
        onContinue={() => {
          setShowRoundModal(false);
          onPlayAgain();
        }}
        onLeave={handleQuit}
        tableColor={BG}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  seatBar: {
    maxHeight: scale(104),
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e3a",
  },
  seatBarContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    flexGrow: 1,
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    gap: scale(12),
  },
  seat: {
    alignItems: "center",
    width: scale(72),
    paddingVertical: scale(6),
    paddingHorizontal: scale(4),
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  seatActive: {
    backgroundColor: "#2a0f20",
    borderColor: "#e94560",
  },
  seatCardWrap: {
    width: scale(40),
    height: scale(54),
    alignItems: "center",
    justifyContent: "center",
  },
  seatCardBack: {
    width: scale(40),
    height: scale(54),
    borderRadius: scale(6),
  },
  seatCountBadge: {
    position: "absolute",
    bottom: -scale(6),
    right: -scale(8),
    backgroundColor: "#3a3a5a",
    borderRadius: scale(10),
    minWidth: scale(20),
    height: scale(20),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(4),
    borderWidth: 1.5,
    borderColor: "#0f0f24",
  },
  seatCountBadgeActive: {
    backgroundColor: "#e94560",
  },
  seatCountText: {
    color: "#fff",
    fontSize: scaleFont(11),
    fontWeight: "bold",
  },
  seatName: {
    color: "#9a9ab0",
    fontSize: scaleFont(11),
    fontWeight: "600",
    marginTop: scale(8),
    maxWidth: scale(64),
    textAlign: "center",
  },
  seatNameActive: {
    color: "#ff6b6b",
    fontWeight: "800",
  },
  playArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(20),
    paddingVertical: scale(20),
    paddingHorizontal: scale(8),
  },
  pileColumn: {
    alignItems: "center",
    gap: scale(8),
  },
  pileLabel: {
    color: "#5b5b78",
    fontSize: scaleFont(10),
    fontWeight: "800",
    letterSpacing: scale(1.5),
  },
  discardHalo: {
    borderRadius: scale(18),
    padding: scale(10),
  },
  colorTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
  },
  pileWrapper: {
    borderRadius: scale(10),
    borderWidth: 2,
    borderColor: "#2a2a4a",
    overflow: "visible",
  },
  cardShell: {
    borderRadius: scale(10),
    backgroundColor: "#f4efe7",
    borderWidth: 1,
    borderColor: "#d8cbb8",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: scale(4),
  },
  cardArt: {
    width: "100%",
    height: "100%",
  },
  cardFallbackText: {
    position: "absolute",
    bottom: scale(6),
    left: scale(6),
    color: "#3b2a1a",
    fontSize: scaleFont(10),
    fontWeight: "800",
    opacity: 0.85,
  },
  countBadge: {
    position: "absolute",
    top: -scale(8),
    right: -scale(8),
    backgroundColor: "#e94560",
    borderRadius: scale(10),
    minWidth: scale(22),
    height: scale(22),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(4),
  },
  countBadgeText: {
    color: "#fff",
    fontSize: scaleFont(11),
    fontWeight: "bold",
  },
  emptyPile: {
    borderRadius: scale(8),
    backgroundColor: "#1a1a3a",
  },
  directionIcon: {
    color: "#8a8aa8",
    fontSize: scaleFont(34),
  },
  colorDot: {
    width: scale(14),
    height: scale(14),
    borderRadius: scale(7),
    borderWidth: 2,
    borderColor: "#fff",
  },
  colorLabel: {
    color: "#d4d4e4",
    fontSize: scaleFont(12),
    fontWeight: "700",
    textAlign: "center",
    maxWidth: scale(90),
  },
  statusBar: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(16),
    minHeight: scale(44),
    backgroundColor: "#12122a",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#1e1e3a",
  },
  statusText: {
    color: "#e0e0ff",
    fontSize: scaleFont(14),
    textAlign: "center",
    fontWeight: "500",
  },
  handArea: {
    flex: 1,
    paddingTop: scale(8),
    paddingBottom: scale(4),
  },
  handLabel: {
    color: "#666",
    fontSize: scaleFont(10),
    textTransform: "uppercase",
    letterSpacing: scale(1),
    textAlign: "center",
    marginBottom: scale(6),
  },
  handGrid: {
    paddingHorizontal: scale(10),
    paddingBottom: scale(10),
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: scale(6),
  },
  dimmed: {
    opacity: 0.38,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(16),
    zIndex: 100,
    paddingHorizontal: scale(32),
  },
  overlayTitle: {
    color: "#fff",
    fontSize: scaleFont(22),
    fontWeight: "bold",
    marginBottom: scale(8),
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(14),
    justifyContent: "center",
  },
  colorBtn: {
    width: scale(130),
    height: scale(70),
    borderRadius: scale(14),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  colorBtnText: {
    color: "#fff",
    fontSize: scaleFont(16),
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  winTitle: {
    color: "#fff",
    fontSize: scaleFont(32),
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: scale(12),
  },
  winCoinsText: {
    color: "#ffd700",
    fontSize: scaleFont(20),
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: scale(14),
  },
  winBtn: {
    backgroundColor: "#e94560",
    borderRadius: scale(12),
    paddingVertical: scale(14),
    paddingHorizontal: scale(48),
    alignItems: "center",
    width: "100%",
  },
  winBtnSecondary: {
    backgroundColor: "#16213e",
    borderWidth: 1.5,
    borderColor: "#334",
  },
  winBtnText: {
    color: "#fff",
    fontSize: scaleFont(18),
    fontWeight: "bold",
  },
});
