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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GameHeader from "../components/GameHeader";
import EndOfRoundModal from "../components/EndOfRoundModal";
import YourTurnBanner from "../components/YourTurnBanner";
import useOnlineReconnect from "../components/useOnlineReconnect";
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
  removePlayer,
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
import { getWinReward } from "../game/rewards";
import { recordAchievementEvent } from "../game/achievements";
import { saveGame, loadGame, clearGame } from "../game/gameSaves";
import { recordWin } from "../game/profile";
import { getTableTheme } from "../game/tableThemes";
import {
  LAST_CARD_TABLES,
  getLastCardTableId,
  setLastCardTable,
  subscribeLastCardTable,
} from "../game/lastCardTheme";
import {
  hapticImpact,
  hapticButton,
  hapticWin,
  hapticLose,
  hapticError,
  HapticStyle,
} from "../game/haptics";
import { LC } from "../game/lastCardImages";
import ProfileAvatar from "../components/ProfileAvatar";
import useMultiplayerAvatars from "../components/useMultiplayerAvatars";
import TableThemePicker from "../components/TableThemePicker";

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

export default function LastCardGameScreen({ navigation, route }) {
  const {
    role,
    myName,
    players: initialPlayers,
    difficulty = "medium",
  } = route.params;
  const isSinglePlayer = role === "singleplayer";
  const isHost = role === "host" || isSinglePlayer;
  const { avatarById, handleHostMessage, handleClientMessage } =
    useMultiplayerAvatars({ isHost, players: initialPlayers });
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
  const [tableId, setTableId] = useState(getLastCardTableId());
  const [showTablePicker, setShowTablePicker] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const coinRewardedRef = useRef(false);
  const outcomeBuzzedRef = useRef(false); // fire win/lose haptic once per game
  const lastSaveRef = useRef(0); // BUG-4: auto-save throttle (once / 3s)

  // Mid-game reconnect: pause when a remote player drops, resume when they return.
  const reconnect = useOnlineReconnect({
    role,
    getPlayerName: (id) =>
      stateRef.current?.players.find((p) => String(p.id) === String(id))?.name ??
      "A player",
    isRealPlayer: (id) => {
      const p = stateRef.current?.players.find((x) => String(x.id) === String(id));
      return !!p && !p.isAI && String(p.id) !== MY_ID;
    },
    broadcast: broadcastToClients,
    resendState: () => broadcastState(stateRef.current),
    // A player left for good — either they tapped Quit (intentional) or their
    // reconnect grace expired. End the game at ≤3 players; at ≥4, drop them and
    // keep playing. Host quitting is handled separately (handleQuit → stopServer).
    onPlayerGone: (id, name, intentional) => {
      const s = fullRef.current;
      if (!s || s.gameOver) return;
      if (!s.players.some((p) => String(p.id) === String(id))) return; // already gone
      const reason = intentional ? "left the game" : "lost connection";

      if (s.players.length <= 3) {
        // Not enough players to continue — end for everyone.
        broadcastToClients({ type: "GAME_OVER_DISCONNECT", name });
        stopServer();
        Alert.alert("Game over", `${name} ${reason}.`, [
          { text: "OK", onPress: () => navigation.navigate("Home") },
        ]);
        return;
      }

      // Enough players remain — drop them and continue.
      const hadTurn =
        String(s.currentTurn) === String(id) ||
        String(s.awaitingColorChoiceBy) === String(id);
      applyState(removePlayer(s, id)); // updates refs + rebroadcasts roster/state
      setStatusMsg(`${name} ${reason}.`);
      if (hadTurn) {
        scheduleTimeout(turnTimerRef, () => handleTurn(stateRef.current), 400);
      }
    },
    // Host tapped "End Game" on the pause overlay. The hook already broadcast
    // GAME_OVER_DISCONNECT; just tear down and leave.
    onEndGame: () => {
      stopServer();
      navigation.navigate("Home");
    },
    onHostEnded: (name) => {
      Alert.alert(
        "Game ended",
        `${name} left and didn't reconnect in time.`,
        [{ text: "OK", onPress: () => navigation.navigate("Home") }],
      );
    },
  });

  // Keep the table palette in sync (loaded at app start; may change via the
  // in-game Table Colour picker).
  useEffect(() => {
    setTableId(getLastCardTableId());
    return subscribeLastCardTable((id) => setTableId(id));
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
      const reward = getWinReward("lastcard", !isSinglePlayer);
      addCoins(reward).then(() => setCoinsEarned(reward));
      recordWin("lastcard");
      recordAchievementEvent("win", { isMultiplayer: !isSinglePlayer });
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
    // Open the end-of-game modal on game over; close it again when a fresh game
    // starts (e.g. the host hit Play Again and a new "playing" state synced in),
    // otherwise the modal stays up on clients and blocks the restarted game.
    setShowRoundModal(phase === "gameOver");
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
      // Only the player who owes the color choice sees the picker — otherwise
      // the host pops it up too when a client plays a wild.
      next.awaitingColorChoiceBy && String(next.awaitingColorChoiceBy) === String(myPid)
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
    if (reconnect.pausedRef.current) return; // frozen while a player reconnects
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
      // Deck and discard are exhausted and the player has nothing playable —
      // pass the turn so the game can't freeze on a player who can neither
      // play nor draw.
      setStatusMsg(`${playerName} can't draw — no cards left. Turn passes.`);
      const passed = {
        ...result.state,
        currentTurn: getNextPlayer(result.state),
      };
      return resolveIfNeeded(passed);
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
        onClientJoined: ({ id }) => reconnect.hostHandleClientJoined(id),
        onClientLeft: ({ id }) => reconnect.hostHandleClientLeft(id),
        onMessage: (msg, clientId) => {
          if (handleHostMessage(msg, clientId)) return;
          // A deliberate quit (sent before the client tears down) — process even
          // while paused, so it can clear a pause we started on this player.
          if (msg.type === "LEAVE") {
            reconnect.hostHandleClientQuit(clientId);
            return;
          }
          if (reconnect.pausedRef.current) return; // ignore actions while paused
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
        if (reconnect.clientHandleMessage(msg)) return;
        if (handleClientMessage(msg)) return;
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
          // Update the status text from the synced state, otherwise the client
          // is stuck showing the initial "Dealing..." forever.
          if (shouldShowColorPicker) {
            setStatusMsg("Choose a color");
          } else if (msg.gameOver) {
            const w = msg.players?.find((p) => String(p.id) === String(msg.winner));
            setStatusMsg(`${w?.name ?? "Player"} wins!`);
          } else if (String(msg.currentTurn) === String(myPid)) {
            setStatusMsg("Your turn — tap a card to play");
          } else {
            const cur = msg.players?.find(
              (p) => String(p.id) === String(msg.currentTurn),
            );
            setStatusMsg(`${cur?.name ?? "Player"}'s turn...`);
          }
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
    // Host holds the full authoritative state. The client never does — it only
    // has the public state (gameState) plus its own hand (myHand), so build a
    // minimal state good enough for the local tap/turn/playability checks. The
    // host re-validates every move anyway.
    if (isHost) return fullRef.current;
    if (!gameState) return null;
    return {
      ...gameState,
      discardPile: gameState.topCard ? [gameState.topCard] : [],
      hands: { [myPid]: myHand },
      gameOver: gameState.gameOver,
      awaitingColorChoiceBy: gameState.awaitingColorChoiceBy ?? null,
    };
  }

  function onCardTap(card) {
    if (reconnect.pausedRef.current) return;
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
    if (reconnect.pausedRef.current) return;
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
    if (reconnect.pausedRef.current) return;
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

  // Cap keeps tablets looking right; the lower multiplier shrinks the piles on
  // phones (where 0.26·width was eating the screen — the cap never applied).
  const PILE_W = Math.min(width * 0.18, 108);
  const PILE_H = PILE_W * 1.4;
  // Size hand cards so at least 5 fit per row: full width minus the grid's
  // horizontal padding and the gaps between 5 cards, divided five ways (with a
  // 2px safety margin so rounding never wraps to 4).
  const HAND_COLS = 5;
  const HAND_GAP = scale(6); // matches styles.handGrid gap
  const HAND_W =
    Math.floor(
      (width - scale(10) * 2 - HAND_GAP * (HAND_COLS - 1)) / HAND_COLS,
    ) - 2;
  const HAND_H = Math.round(HAND_W * 1.4);
  const activeHex = COLOR_HEX[gameState?.activeColor] ?? "#555";
  const pal =
    LAST_CARD_TABLES.find((t) => t.id === tableId) ?? LAST_CARD_TABLES[0];

  // Deliberate multiplayer exit. A client sends LEAVE first (so the host drops
  // them immediately instead of pausing + waiting for a reconnect), THEN tears
  // down. A host quitting stops the server, which ends the game for everyone.
  function leaveMultiplayer() {
    if (isHost) {
      stopServer();
    } else {
      sendToHost({ type: "LEAVE" });
      disconnectFromHost();
    }
  }

  function handleQuit() {
    if (isSinglePlayer) clearGame(SAVE_KEY_LASTCARD);
    else leaveMultiplayer();
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
              leaveMultiplayer();
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
    {
      icon: "🎨",
      label: "Table Theme",
      onPress: () => setShowTablePicker(true),
    },
    { type: "divider" },
    { type: "quit", onQuit: handleQuit },
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: pal.rail }]}>
      <GameHeader
        gameId="lastcard"
        title="Last Card"
        subtitle={isSinglePlayer ? "Single Player" : "Multiplayer"}
        menuItems={menuItems}
      />

      {/* The table: a raised felt surface holding the seats + play area. */}
      <View
        style={[
          styles.felt,
          { backgroundColor: pal.felt, borderColor: pal.feltBorder },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.seatBar, { borderBottomColor: pal.feltBorder }]}
          contentContainerStyle={styles.seatBarContent}
        >
          {opponents.map((p) => {
            const isActive = p.id === gameState?.currentTurn;
            return (
              <View
                key={p.id}
                style={[
                  styles.seat,
                  {
                    backgroundColor: pal.panel,
                    borderColor: pal.panelBorder,
                  },
                  isActive && {
                    backgroundColor: pal.accentBg,
                    borderColor: pal.accent,
                  },
                ]}
              >
                <View style={styles.seatCardWrap}>
                  <ProfileAvatar
                    profile={avatarById[String(p.id)]}
                    name={p.name}
                    size={scale(48)}
                  />
                  <View
                    style={[
                      styles.seatCountBadge,
                      {
                        backgroundColor: pal.panelBorder,
                        borderColor: pal.rail,
                      },
                      isActive && { backgroundColor: pal.accent },
                    ]}
                  >
                    <Text
                      style={[
                        styles.seatCountText,
                        { color: isActive ? pal.onAccent : pal.text },
                      ]}
                    >
                      {p.cardCount}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.seatName,
                    { color: isActive ? pal.accent : pal.textDim },
                  ]}
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
              style={[styles.pileWrapper, { borderColor: pal.panelBorder }]}
              onPress={onDeckTap}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Draw from deck"
              accessibilityHint="Take a card from the draw pile"
            >
              <View
                style={[styles.cardShell, { width: PILE_W, height: PILE_H }]}
              >
                <Image
                  source={LC.card_back}
                  style={styles.cardArt}
                  resizeMode="contain"
                />
              </View>
              <View style={[styles.countBadge, { backgroundColor: pal.accent }]}>
                <Text style={[styles.countBadgeText, { color: pal.onAccent }]}>
                  {gameState?.drawPileCount ?? 0}
                </Text>
              </View>
            </TouchableOpacity>
            <Text style={[styles.pileLabel, { color: pal.textDim }]}>DRAW</Text>
          </View>

          {/* Direction of play */}
          <Text style={[styles.directionIcon, { color: pal.textDim }]}>
            {turnDirectionGlyph}
          </Text>

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
              <Text
                style={[styles.colorLabel, { color: pal.text }]}
                numberOfLines={1}
              >
                {COLOR_LABELS[gameState?.activeColor] ?? ""}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.statusBar,
            { backgroundColor: pal.status, borderColor: pal.feltBorder },
          ]}
        >
          <Text
            style={[styles.statusText, { color: pal.text }]}
            numberOfLines={2}
          >
            {statusMsg}
          </Text>
        </View>
      </View>

      <View style={[styles.handArea, { backgroundColor: pal.tray }]}>
        <Text style={[styles.handLabel, { color: pal.textDim }]}>
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
              <TouchableOpacity
                key={card.id}
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
                        { width: HAND_W, height: HAND_H },
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

      <TableThemePicker
        visible={showTablePicker}
        tables={LAST_CARD_TABLES}
        currentId={tableId}
        onPick={(id) => {
          setLastCardTable(id);
          setTableId(id);
          setShowTablePicker(false);
        }}
        onClose={() => setShowTablePicker(false)}
      />

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
        coins={isSinglePlayer && winner === myPid ? coinsEarned : 0}
        showContinue={isHost}
        showLeave
        isGameOver
        onContinue={() => {
          setShowRoundModal(false);
          onPlayAgain();
        }}
        onLeave={handleQuit}
        tableColor={pal.felt}
      />

      {reconnect.overlay}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  felt: {
    marginHorizontal: scale(10),
    marginTop: scale(8),
    borderRadius: scale(20),
    borderWidth: 1.5,
    overflow: "hidden",
  },
  seatBar: {
    maxHeight: scale(104),
    borderBottomWidth: 1,
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
  },
  seatCardWrap: {
    width: scale(48),
    height: scale(48),
    alignItems: "center",
    justifyContent: "center",
  },
  seatCountBadge: {
    position: "absolute",
    bottom: -scale(6),
    right: -scale(8),
    borderRadius: scale(10),
    minWidth: scale(20),
    height: scale(20),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(4),
    borderWidth: 1.5,
  },
  seatCountText: {
    fontSize: scaleFont(11),
    fontWeight: "bold",
  },
  seatName: {
    fontSize: scaleFont(11),
    fontWeight: "700",
    marginTop: scale(8),
    maxWidth: scale(64),
    textAlign: "center",
  },
  playArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(18),
    paddingVertical: scale(14),
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
    borderTopWidth: 1,
  },
  statusText: {
    fontSize: scaleFont(14),
    textAlign: "center",
    fontWeight: "500",
  },
  handArea: {
    flex: 1,
    marginHorizontal: scale(10),
    marginTop: scale(8),
    marginBottom: scale(6),
    borderRadius: scale(20),
    paddingTop: scale(10),
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
  // (Table Theme picker styles now live in components/TableThemePicker.js.)
});
