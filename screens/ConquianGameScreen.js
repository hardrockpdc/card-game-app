import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  BackHandler,
  Animated,
  AccessibilityInfo,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureDetector } from "react-native-gesture-handler";
import Card from "../components/Card";
import useConquianMeldDrag from "../components/useConquianMeldDrag";
import GameHeader from "../components/GameHeader";
import EndOfRoundModal from "../components/EndOfRoundModal";
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

const AI_MOVE_DELAY_MS = 700; // delay between AI opponent moves (ms)

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
    dealerIndex: state.dealerIndex,
    activeCardSourcePid: state.activeCardSourcePid,
    chainPassedPids: state.chainPassedPids,
    autoTook: state.autoTook ?? null,
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
  const lastSaveRef = useRef(0);
  const activeCardShakeRef = useRef(new Animated.Value(0)).current;
  // Auto-Take feedback: glow + pulse the card right where it lands in your meld,
  // so the instant draw→discard jump is readable (in-context, no flying overlay).
  const autoGlowPulse = useRef(new Animated.Value(1)).current;
  const reduceMotionRef = useRef(false);
  const lastAutoTookSigRef = useRef(null);
  const autoGlowTimerRef = useRef(null);
  const [highlightCardId, setHighlightCardId] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const [selectedHandIds, setSelectedHandIds] = useState(new Set());
  const [selectedMeldIdx, setSelectedMeldIdx] = useState(null);
  const [isActiveCardSelected, setIsActiveCardSelected] = useState(false);
  const [passCardId, setPassCardId] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [showRoundModal, setShowRoundModal] = useState(false);

  // Borrow mode state
  const [borrowMode, setBorrowMode] = useState(false);
  const [borrowGroups, setBorrowGroups] = useState([]);
  const [borrowPool, setBorrowPool] = useState([]);
  const [borrowSelCardId, setBorrowSelCardId] = useState(null);
  const [borrowTargetedMeldIdx, setBorrowTargetedMeldIdx] = useState(null);

  // Stage 1 drag-to-meld: cards dragged into the "New Meld" staging zone.
  const [stagedCards, setStagedCards] = useState([]);

  // Turn/phase announcement toast (replaces the persistent banner).
  const [toast, setToast] = useState(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef(null);

  // Wipe any legacy Conquián save (old key "@cardnight:save:rummy:conquian")
  // to rule out a stale-schema crash. Runs once on mount.
  useEffect(() => {
    clearGame(SAVE_KEY_CONQUIAN_LEGACY).catch(() => {});
  }, []);

  // Reset passCardId when phase changes (handles new game deal for clients)
  useEffect(() => {
    if (gameState?.phase !== "initialPass") setPassCardId(null);
  }, [gameState?.phase]);

  // Cache the reduced-motion preference (CLAUDE.md §2.4 — snap instead of animate).
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

  // ── Stage 1: drag-to-build a new meld ──────────────────────────────────────
  const { width: winWidth } = useWindowDimensions();
  const smallClamp = Math.min(Math.max(winWidth / 390, 0.85), 1.5);
  const smallCardW = Math.round(42 * smallClamp);
  const smallCardH = Math.round(60 * smallClamp);

  const meldDrag = useConquianMeldDrag({
    sizing: { cardW: smallCardW, cardH: smallCardH, cardScale: 1 },
    reduceMotionRef,
    moveCard: (source, target) => {
      // Drag a hand card OR the active card into the staging zone → stage it.
      if (
        (source.type === "hand" || source.type === "active") &&
        target.type === "newMeld"
      ) {
        setStagedCards((prev) =>
          prev.some((c) => c.id === source.cardId)
            ? prev
            : [...prev, source.card],
        );
        return true;
      }
      // Drag a staged card back out → unstage it (a hand card returns to the
      // hand; the active card returns to the Active slot since it's still the
      // game's active card).
      if (source.type === "staged" && target.type === "hand") {
        setStagedCards((prev) => prev.filter((c) => c.id !== source.cardId));
        return true;
      }
      return false;
    },
  });

  // Turn/phase toast: fire a ~3s pop-up when the announcement changes, instead of
  // a permanent banner taking up screen space.
  useEffect(() => {
    const gs = gameState;
    if (!gs) return;
    const mine =
      String(gs.players?.[gs.currentPlayerIndex]?.id) === String(myPid);
    let msg = null;
    if (gs.phase === "initialPass") {
      msg = "Initial Pass — pick a card to pass";
    } else if (gs.phase === "playing" && mine) {
      if (gs.turnPhase === "draw") msg = "Your turn — draw from stock";
      else if (gs.turnPhase === "action") msg = "Your turn — take or pass";
      else if (gs.turnPhase === "discard")
        msg =
          gs.autoTook && String(gs.autoTook.pid) === String(myPid)
            ? `Auto-added ${gs.autoTook.rank} of ${gs.autoTook.suit} — discard a card`
            : "Your turn — discard a card";
    } else if (gs.phase === "playing") {
      msg = `${gs.players?.[gs.currentPlayerIndex]?.name ?? "Opponent"}'s turn`;
    }
    if (!msg) return;

    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (reduceMotionRef.current) {
      toastAnim.setValue(1);
    } else {
      toastAnim.setValue(0);
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
    toastTimerRef.current = setTimeout(() => {
      if (reduceMotionRef.current) {
        setToast(null);
      } else {
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) setToast(null);
        });
      }
    }, 3000);
  }, [
    gameState?.phase,
    gameState?.turnPhase,
    gameState?.currentPlayerIndex,
    gameState?.autoTook?.id,
    myPid,
  ]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Clear the staging area whenever it's no longer my action phase (draw turn or
  // chain offer). Keeps staged cards across draw→action but drops them when the
  // active card changes (a new offer) so stale cards don't carry over.
  useEffect(() => {
    const mineActing =
      gameState &&
      String(gameState.players?.[gameState.currentPlayerIndex]?.id) ===
        String(myPid) &&
      gameState.turnPhase === "action";
    if (!mineActing) setStagedCards([]);
  }, [
    gameState?.turnPhase,
    gameState?.currentPlayerIndex,
    gameState?.activeCard?.id,
    myPid,
  ]);

  // When YOU get an auto-take, glow + pulse the card where it landed in your meld
  // so the instant draw→discard jump is readable. The reducer already placed the
  // real card; we just highlight it by id. Fires once per take.
  useEffect(() => {
    const at = gameState?.autoTook;
    const sig =
      at && String(at.pid) === String(myPid)
        ? `${at.pid}:${at.id}`
        : null;
    if (!sig || sig === lastAutoTookSigRef.current) return;
    lastAutoTookSigRef.current = sig;

    setHighlightCardId(at.id);
    if (autoGlowTimerRef.current) clearTimeout(autoGlowTimerRef.current);

    if (reduceMotionRef.current) {
      autoGlowPulse.setValue(1);
    } else {
      autoGlowPulse.setValue(1);
      Animated.sequence([
        Animated.timing(autoGlowPulse, {
          toValue: 1.28,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(autoGlowPulse, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Fade the highlight out after a beat.
    autoGlowTimerRef.current = setTimeout(() => setHighlightCardId(null), 1400);
  }, [gameState?.autoTook, myPid, autoGlowPulse]);

  // Clear the highlight timer on unmount.
  useEffect(() => {
    return () => {
      if (autoGlowTimerRef.current) clearTimeout(autoGlowTimerRef.current);
    };
  }, []);

  // When the active card changes (new round / new offer), reset the "selected" state.
  useEffect(() => {
    setIsActiveCardSelected(false);
  }, [gameState?.activeCard?.id]);

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
    if (!cp?.isAI) return;
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    aiTimerRef.current = setTimeout(() => {
      const s = fullRef.current;
      if (!s || s.phase !== "playing") return;
      const cp2 = s.players[s.currentPlayerIndex];
      if (!cp2?.isAI) return;
      try {
        runAITurn(s);
      } catch (err) {}
    }, AI_MOVE_DELAY_MS);
  }

  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

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

      // A free meld just laid down may have triggered a forced auto-take (the
      // reducer moves us to the discard phase). If so, don't also try to
      // take/pass — let the next cycle handle the discard.
      if (s.turnPhase !== "action") {
        applyState(s);
        return;
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
  // BUG-4 fix: throttle to once per 3 seconds (state mutates frequently during
  // meld preview / card selection — no need to write to disk on every tick).
  useEffect(() => {
    if (!isSinglePlayer || !fullRef.current) return;
    if (gameState?.phase === "results") {
      clearGame(SAVE_KEY_CONQUIAN);
      return;
    }
    const now = Date.now();
    if (now - lastSaveRef.current < 3000) return;
    lastSaveRef.current = now;
    saveGame(SAVE_KEY_CONQUIAN, { fullState: fullRef.current });
  }, [gameState]);

  useEffect(() => {
    if (!isHost) return;

    async function init() {
      if (isSinglePlayer && route?.params?.resumeFromSave) {
        const saved = await loadGame(SAVE_KEY_CONQUIAN);
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

  // Try to commit a take with the current selection. Returns true if committed.
  // Does NOT show error messages or open Rearrange — those are caller's responsibility.
  function tryCommitTake() {
    if (!gameState?.activeCard) return false;

    if (isHost) {
      const s = fullRef.current;
      if (!s || !s.activeCard) return false;

      if (selectedMeldIdx !== null) {
        const next = doTakeActiveCard(s, myPid, {
          type: "extend",
          meldIdx: selectedMeldIdx,
        });
        if (next !== s) {
          applyState(next);
          setSelectedHandIds(new Set());
          setSelectedMeldIdx(null);
          setIsActiveCardSelected(false);
          return true;
        }
      }

      if (selectedHandIds.size > 0) {
        const next = doTakeActiveCard(s, myPid, {
          type: "new",
          handCardIds: [...selectedHandIds],
        });
        if (next !== s) {
          applyState(next);
          setSelectedHandIds(new Set());
          setSelectedMeldIdx(null);
          setIsActiveCardSelected(false);
          return true;
        }
      }

      return false;
    }

    if (selectedMeldIdx !== null) {
      sendToHost({
        type: "ACTION",
        action: "takeExtend",
        meldIdx: selectedMeldIdx,
      });
      setSelectedHandIds(new Set());
      setSelectedMeldIdx(null);
      setIsActiveCardSelected(false);
      return true;
    }

    if (selectedHandIds.size > 0) {
      sendToHost({
        type: "ACTION",
        action: "takeMeld",
        handCardIds: [...selectedHandIds],
      });
      setSelectedHandIds(new Set());
      setSelectedMeldIdx(null);
      setIsActiveCardSelected(false);
      return true;
    }

    return false;
  }

  // Lay the selected hand cards down as a NEW meld (free action on your draw turn).
  function handleLayMeld() {
    const cardIds = [...selectedHandIds];
    if (cardIds.length === 0) return;
    if (isHost) {
      const s = fullRef.current;
      if (!s) return;
      const next = doLayDownMeld(s, myPid, cardIds);
      if (next !== s) {
        applyState(next);
        setSelectedHandIds(new Set());
        setSelectedMeldIdx(null);
      } else {
        setStatusMsg("Invalid meld");
      }
    } else {
      sendToHost({ type: "ACTION", action: "layMeld", cardIds });
      setSelectedHandIds(new Set());
      setSelectedMeldIdx(null);
    }
  }

  // Extend your targeted existing meld with the selected hand cards (free action).
  function handleAddToMeld() {
    if (selectedMeldIdx === null) return;
    const cardIds = [...selectedHandIds];
    if (cardIds.length === 0) return;
    if (isHost) {
      const s = fullRef.current;
      if (!s) return;
      const next = doExtendMeldFromHand(s, myPid, selectedMeldIdx, cardIds);
      if (next !== s) {
        applyState(next);
        setSelectedHandIds(new Set());
        setSelectedMeldIdx(null);
      } else {
        setStatusMsg("Can't add those cards to that meld");
      }
    } else {
      sendToHost({
        type: "ACTION",
        action: "extendMeld",
        meldIdx: selectedMeldIdx,
        cardIds,
      });
      setSelectedHandIds(new Set());
      setSelectedMeldIdx(null);
    }
  }

  function shakeActiveCard() {
    activeCardShakeRef.setValue(0);
    Animated.sequence([
      Animated.timing(activeCardShakeRef, {
        toValue: 1,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(activeCardShakeRef, {
        toValue: -1,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(activeCardShakeRef, {
        toValue: 1,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(activeCardShakeRef, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }

  // - If already selected: deselect (no shake).
  // - If a valid combination exists with current selections: commit immediately.
  // - Otherwise: select the active card (visual highlight) and shake to indicate
  //   the user needs to select hand cards or a meld first.
  function handleTapActiveCard() {
    const ac = gameState?.activeCard;
    if (!ac) return;
    if (!isMyTurn || turnPhase !== "action") return;

    if (isActiveCardSelected) {
      setIsActiveCardSelected(false);
      return;
    }

    if (tryCommitTake()) return;

    setIsActiveCardSelected(true);
    shakeActiveCard();
  }

  function handlePass() {
    if (isHost) {
      applyState(doPassActiveCard(fullRef.current));
    } else {
      sendToHost({ type: "ACTION", action: "pass" });
    }
  }

  function handleDiscard(cardId) {
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

    // Spec: subsequent games' dealer = previous game's winner. Fall back to random if there was no winner (tie).
    const prevWinner = fullRef.current?.winner;
    const nextDealerIndex =
      prevWinner && Array.isArray(initialPlayers)
        ? initialPlayers.findIndex(
            (p) => String(p.id) === String(prevWinner.id),
          )
        : -1;
    applyState(
      deal(initialPlayers, {
        dealerIndex: nextDealerIndex >= 0 ? nextDealerIndex : undefined,
      }),
    );
  }

  // ─── Borrow mode handlers ─────────────────────────────────────────────────────

  function enterBorrowMode() {
    const ac = gameState?.activeCard;
    if (!ac) return;
    const myMeldsNow = gameState?.melds?.[myPid] ?? [];
    setBorrowGroups(myMeldsNow.map((m) => [...m]));
    setBorrowPool([...myHand]);
    setBorrowSelCardId(null);
    setBorrowTargetedMeldIdx(null);
    setStatusMsg("");
    setBorrowMode(true);
  }

  function exitBorrowMode() {
    setBorrowMode(false);
    setBorrowGroups([]);
    setBorrowPool([]);
    setBorrowSelCardId(null);
    setBorrowTargetedMeldIdx(null);
    setStatusMsg("");
  }

  // Find which meld (if any) currently contains the active card. -1 if not placed.
  function findActiveCardMeldIdx() {
    const ac = gameState?.activeCard;
    if (!ac) return -1;
    return borrowGroups.findIndex((g) => g.some((c) => c.id === ac.id));
  }

  function handleBorrowCardTap(card, source) {
    if (source.type === "hero") {
      const ac = card;
      if (findActiveCardMeldIdx() !== -1) return;

      if (borrowTargetedMeldIdx !== null) {
        setBorrowGroups((prev) =>
          prev.map((g, i) => (i === borrowTargetedMeldIdx ? [...g, ac] : g)),
        );
        setBorrowTargetedMeldIdx(null);
        return;
      }

      setBorrowSelCardId((prev) => (prev === ac.id ? null : ac.id));
      return;
    }

    if (source.type === "group") {
      borrowReturnToPool(card.id, source.groupIdx);
      return;
    }

    if (source.type === "hand") {
      borrowSelectCard(card.id);
    }
  }

  function borrowSelectCard(cardId) {
    setBorrowSelCardId((prev) => (prev === cardId ? null : cardId));
  }

  function borrowMoveToGroup(groupIdx) {
    const ac = gameState?.activeCard;
    if (!borrowSelCardId) {
      // No card selected — just target this meld for the next tap.
      setBorrowTargetedMeldIdx((prev) => (prev === groupIdx ? null : groupIdx));
      return;
    }

    // Active card is selected — move it from "floating" into this meld.
    if (ac && borrowSelCardId === ac.id) {
      setBorrowGroups((prev) =>
        prev.map((g, i) => (i === groupIdx ? [...g, ac] : g)),
      );
      setBorrowSelCardId(null);
      setBorrowTargetedMeldIdx(null);
      return;
    }

    // A hand-pool card is selected — move it from the pool into this meld.
    const card = borrowPool.find((c) => c.id === borrowSelCardId);
    if (!card) return;
    setBorrowPool((prev) => prev.filter((c) => c.id !== borrowSelCardId));
    setBorrowGroups((prev) =>
      prev.map((g, i) => (i === groupIdx ? [...g, card] : g)),
    );
    setBorrowSelCardId(null);
    setBorrowTargetedMeldIdx(null);
  }

  function borrowReturnToPool(cardId, groupIdx) {
    const ac = gameState?.activeCard;
    const card = borrowGroups[groupIdx]?.find((c) => c.id === cardId);
    if (!card) return;

    setBorrowGroups((prev) =>
      prev.map((g, i) =>
        i === groupIdx ? g.filter((c) => c.id !== cardId) : g,
      ),
    );

    // If it's the active card, it "floats" again — don't put it in the hand pool.
    if (ac && card.id === ac.id) return;

    // Otherwise, return it to the hand pool.
    setBorrowPool((prev) => [...prev, card]);
  }

  function borrowAddNewMeld() {
    setBorrowGroups((prev) => [...prev, []]);
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

  // Commit the staged cards as a meld. If the active card is part of it, that's
  // a TAKE (active + hand cards → new meld → discard); otherwise it's a free
  // lay-down from the hand.
  function confirmStagedMeld() {
    if (stagedCards.length < 3) return;
    const ac = gameState?.activeCard;
    const usesActive = ac && stagedCards.some((c) => c.id === ac.id);

    if (usesActive) {
      const handCardIds = stagedCards
        .filter((c) => c.id !== ac.id)
        .map((c) => c.id);
      if (isHost) {
        const s = fullRef.current;
        if (!s) return;
        const next = doTakeActiveCard(s, myPid, {
          type: "new",
          handCardIds,
        });
        if (next !== s) {
          setStagedCards([]);
          applyState(next);
        } else {
          setStatusMsg("That's not a valid meld");
        }
      } else {
        sendToHost({ type: "ACTION", action: "takeMeld", handCardIds });
        setStagedCards([]);
      }
      return;
    }

    const cardIds = stagedCards.map((c) => c.id);
    if (isHost) {
      const s = fullRef.current;
      if (!s) return;
      const next = doLayDownMeld(s, myPid, cardIds);
      if (next !== s) {
        setStagedCards([]);
        applyState(next);
      } else {
        setStatusMsg("That's not a valid meld");
      }
    } else {
      sendToHost({ type: "ACTION", action: "layMeld", cardIds });
      setStagedCards([]);
    }
  }

  // When the active card is selected and the user changes their hand or meld
  // selection, try to commit again after state updates settle.
  useEffect(() => {
    if (!isActiveCardSelected) return;
    if (!isMyTurn || turnPhase !== "action") return;
    const handle = setTimeout(() => {
      tryCommitTake();
    }, 0);
    return () => clearTimeout(handle);
  }, [
    selectedHandIds,
    selectedMeldIdx,
    isActiveCardSelected,
    isMyTurn,
    turnPhase,
  ]);

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
    const prevWinner = fullRef.current?.winner;
    const nextDealerIndex =
      prevWinner && Array.isArray(initialPlayers)
        ? initialPlayers.findIndex(
            (p) => String(p.id) === String(prevWinner.id),
          )
        : -1;
    applyState(
      deal(initialPlayers, {
        dealerIndex: nextDealerIndex >= 0 ? nextDealerIndex : undefined,
      }),
    );
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
    const acPlacedIdx = findActiveCardMeldIdx();
    const acIsPlaced = acPlacedIdx !== -1;
    const acIsSelected = borrowSelCardId === ac?.id;
    const nonEmpty = borrowGroups.filter((g) => g.length > 0);
    const allValid = nonEmpty.every((g) => isValidMeld(g));
    const canConfirm = allValid && nonEmpty.length > 0;

    return (
      <SafeAreaView style={styles.safeArea}>
        {/* Top bar */}
        <View style={styles.borrowTopBar}>
          <TouchableOpacity
            onPress={exitBorrowMode}
            style={styles.borrowTopBtn}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.borrowTopBtnText}>✕ Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.borrowTopTitle}>Arrange</Text>
          <TouchableOpacity
            onPress={handleConfirmBorrow}
            disabled={!canConfirm}
            style={[
              styles.borrowTopBtn,
              styles.borrowTopBtnConfirm,
              !canConfirm && styles.borrowTopBtnDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Confirm"
            accessibilityState={{ disabled: !canConfirm }}
          >
            <Text
              style={[
                styles.borrowTopBtnText,
                styles.borrowTopBtnConfirmText,
                !canConfirm && styles.borrowTopBtnDisabledText,
              ]}
            >
              ✓ Confirm
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.borrowLayout}>
          <View style={styles.borrowHeroArea}>
            {/* Hero: "Place this card" */}
            <Text style={styles.borrowHeroLabel}>Place this card</Text>
            <View style={styles.borrowHeroRow}>
              {ac && !acIsPlaced ? (
                <TouchableOpacity
                  onPress={() => handleBorrowCardTap(ac, { type: "hero" })}
                  style={[
                    styles.borrowHeroCardWrap,
                    acIsSelected && styles.borrowHeroCardSelected,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Active card ${ac.rank} of ${ac.suit}`}
                  accessibilityHint="Tap to select or place"
                  activeOpacity={0.9}
                >
                  <Card rank={ac.rank} suit={ac.suit} />
                </TouchableOpacity>
              ) : (
                <View style={styles.borrowHeroCardPlaced}>
                  <Text style={styles.borrowHeroPlacedText}>✓ Placed</Text>
                </View>
              )}
            </View>

            {/* Validation badge */}
            <View style={styles.borrowValidRow}>
              <Text
                style={[
                  styles.borrowValidText,
                  allValid && nonEmpty.length > 0
                    ? styles.borrowValidOk
                    : styles.borrowValidWarn,
                ]}
              >
                {nonEmpty.length === 0
                  ? "⚠ No melds"
                  : allValid
                    ? "✓ All melds valid"
                    : "⚠ Some melds invalid"}
              </Text>
            </View>
          </View>

          <View style={styles.borrowMeldsSection}>
            {/* Your Melds */}
            <Text style={styles.borrowSectionLabel}>Your Melds</Text>
            <ScrollView
              style={styles.borrowMeldsScroll}
              contentContainerStyle={styles.borrowMeldsScrollContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {borrowGroups.map((group, idx) => {
                const valid = group.length >= 3 && isValidMeld(group);
                const invalid = group.length > 0 && !isValidMeld(group);
                const isTargeted = borrowTargetedMeldIdx === idx;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.borrowMeldRow,
                      valid && styles.borrowMeldRowValid,
                      invalid && styles.borrowMeldRowInvalid,
                      isTargeted && styles.borrowMeldRowTargeted,
                    ]}
                    onTouchEnd={(e) => {
                      if (e.target === e.currentTarget) borrowMoveToGroup(idx);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Meld ${idx + 1}`}
                    accessibilityHint="Tap to place selected card here, or to target this meld"
                  >
                    <View style={styles.borrowMeldHeader}>
                      <Text style={styles.borrowMeldLabel}>Meld {idx + 1}</Text>
                      <Text
                        style={[
                          styles.borrowMeldStatus,
                          valid && styles.borrowMeldStatusOk,
                          invalid && styles.borrowMeldStatusWarn,
                        ]}
                      >
                        {group.length === 0
                          ? "empty"
                          : valid
                            ? "✓ valid"
                            : "⚠ invalid"}
                      </Text>
                    </View>
                    <View style={styles.borrowMeldCardsRow}>
                      {group.length === 0 ? (
                        <Text style={styles.borrowMeldEmpty}>
                          Tap to place selected card here
                        </Text>
                      ) : (
                        group.map((card) => {
                          return (
                            <TouchableOpacity
                              key={card.id}
                              onPress={() =>
                                handleBorrowCardTap(card, {
                                  type: "group",
                                  groupIdx: idx,
                                })
                              }
                              accessibilityRole="button"
                              accessibilityLabel={`Remove ${card.rank} of ${card.suit}`}
                              accessibilityHint="Tap to return to your hand"
                              activeOpacity={0.9}
                            >
                              <Card rank={card.rank} suit={card.suit} small />
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  </View>
                );
              })}

              {/* + Create a new meld */}
              <TouchableOpacity
                onPress={borrowAddNewMeld}
                style={styles.borrowAddMeldBtn}
                accessibilityRole="button"
                accessibilityLabel="Create a new meld"
              >
                <Text style={styles.borrowAddMeldText}>
                  + Create a new meld
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <View style={styles.borrowHandSection}>
            {/* Your Hand */}
            <Text style={styles.borrowSectionLabel}>Your Hand</Text>
            <View style={[styles.borrowHandRow]}>
              {borrowPool.length === 0 ? (
                <Text style={styles.borrowHandEmpty}>(empty)</Text>
              ) : (
                borrowPool.map((card) => {
                  const isSel = borrowSelCardId === card.id;
                  return (
                    <TouchableOpacity
                      key={card.id}
                      onPress={() =>
                        handleBorrowCardTap(card, { type: "hand" })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`${card.rank} of ${card.suit}`}
                      accessibilityHint="Tap to select or place"
                      activeOpacity={0.9}
                    >
                      <View
                        style={[isSel ? styles.selectedWrapperSmall : null]}
                      >
                        <Card rank={card.rank} suit={card.suit} small />
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {statusMsg ? (
              <Text style={styles.errorMsg}>{statusMsg}</Text>
            ) : null}
          </View>
        </View>
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

  // Hand minus the cards currently staged in the New Meld zone (Stage 1 drag).
  const stagedIds = new Set(stagedCards.map((c) => c.id));
  const availableHand = myHand.filter((c) => !stagedIds.has(c.id));

  // Overlap melded cards so only ~1/4 of each shows (saves horizontal space).
  const meldOverlap = -Math.round(smallCardW * 0.74);

  // Active card staged into the New Meld zone (so the slot shows it as placed).
  const activeStaged =
    !!activeCard && stagedCards.some((c) => c.id === activeCard.id);
  const activeDragHidden =
    !!activeCard && meldDrag.draggingSource?.cardId === activeCard.id;

  const isDrawTurnFreeAction =
    isMyTurn &&
    turnPhase === "action" &&
    gameState.currentPlayerIndex === gameState.originalDrawerIndex &&
    (gameState.chainPassedPids?.length ?? 0) === 0;

  // The New Meld box is live whenever it's your turn to act on the active card
  // (your draw turn OR a chain offer). A hand-only meld still needs a draw turn;
  // a chain offer's meld must include the active card.
  const canStage = isMyTurn && turnPhase === "action";
  const stagedCommittable =
    isValidMeld(stagedCards) && (isDrawTurnFreeAction || activeStaged);

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

  // A player "seat" around the table. side = "top" | "left" | "right" | "bottom".
  // top/bottom are full-width horizontal bars; left/right are SIDEWAYS (rotated
  // 90°) boxes — fixed tall size so they frame the Active card with open space
  // inside, content anchored to the top. The dimension-swap wrapper reserves the
  // narrow-tall footprint. Empty seats still render a (dashed) box so the frame
  // never collapses. `compactSeat` (the bottom "You" seat) shows just the name +
  // count, since the full melds already live in the "Your Melds" area below.
  const renderSeat = (opp, side, compactSeat = false) => {
    const rotated = side === "left" || side === "right";
    const opPid = opp ? String(opp.id) : null;
    const isCurrent =
      opp && String(currentPlayer?.id) === opPid;
    const opMelds = opp ? gameState.melds?.[opPid] ?? [] : [];

    const box = (
      <View
        style={[
          styles.seatBox,
          rotated ? styles.seatBoxRotated : styles.seatBoxHoriz,
          side === "top" && styles.seatBoxTopWide,
          !opp && styles.seatEmpty,
          isCurrent && styles.opponentCardActive,
          rotated && {
            transform: [{ rotate: side === "left" ? "-90deg" : "90deg" }],
          },
        ]}
      >
        {opp && (
          <>
            <View style={styles.opponentHeader}>
              <Text style={styles.opponentName} numberOfLines={1}>
                {opp.name}
              </Text>
              <Text style={styles.opponentStats}>
                {meldedCount(gameState, opPid)}/{winTarget}
              </Text>
              {isCurrent && <Text style={styles.opponentTurnDot}>▶</Text>}
            </View>
            {!compactSeat && opMelds.length > 0 && (
              <View style={[styles.meldRow, styles.meldRowWrap]}>
                {opMelds.map((meld, idx) => (
                  <View key={idx} style={styles.meldGroup}>
                    {meld.map((card, ci) => (
                      <View
                        key={card.id}
                        style={ci > 0 ? { marginLeft: meldOverlap } : null}
                      >
                        <Card rank={card.rank} suit={card.suit} small />
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>
    );

    if (rotated)
      return (
        <View
          style={[
            styles.sideSeatWrap,
            side === "right" && styles.sideSeatWrapUp,
          ]}
        >
          {box}
        </View>
      );
    return box;
  };

  // ─── Main game screen ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader
        gameId="conquian"
        minimal
        leftInfo={
          <Text style={styles.headerStock}>Stock {stockSize}</Text>
        }
        menuItems={menuItems}
      />
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-8, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.container}
      >
        {/* Card table: the 4 seats frame the Active card (you at the bottom) */}
        <View style={styles.centerSection}>
          <View style={styles.tableTopRow}>
            {renderSeat(opponents[0], "top")}
          </View>
          <View style={styles.pileRow}>
            {renderSeat(opponents[1], "left")}
            <View style={styles.activeSlotBox}>
              <Text style={styles.pileLabel}>Active</Text>
              {activeCard && !activeStaged ? (
                isMyTurn && turnPhase === "action" ? (
                  <GestureDetector
                    gesture={meldDrag.makeDragGesture({
                      type: "active",
                      cardId: activeCard.id,
                      card: activeCard,
                    })}
                  >
                    <TouchableOpacity
                      onPress={handleTapActiveCard}
                      activeOpacity={0.7}
                      style={[
                        styles.activeCardTappable,
                        isActiveCardSelected && styles.activeCardSelected,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Take ${activeCard.rank} of ${activeCard.suit}`}
                      accessibilityHint="Drag into the New Meld zone, or tap to take"
                    >
                      <View style={activeDragHidden ? styles.cardHidden : null}>
                        <Card rank={activeCard.rank} suit={activeCard.suit} />
                      </View>
                      <Text style={styles.activeTapHint}>
                        {isActiveCardSelected ? "Pick cards to meld" : "Drag or tap"}
                      </Text>
                    </TouchableOpacity>
                  </GestureDetector>
                ) : (
                  <View>
                    <Card rank={activeCard.rank} suit={activeCard.suit} />
                  </View>
                )
              ) : activeStaged ? (
                <View style={styles.emptySlot}>
                  <Text style={styles.emptySlotText}>✓</Text>
                </View>
              ) : (
                <View style={styles.emptySlot}>
                  <Text style={styles.emptySlotText}>—</Text>
                </View>
              )}
            </View>
            {renderSeat(opponents[2], "right")}
          </View>
          <View style={styles.tableBottomRow}>
            {renderSeat(
              gameState.players.find((p) => String(p.id) === String(myPid)),
              "bottom",
              true,
            )}
          </View>

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
                  {meld.map((card, ci) => (
                    <View
                      key={card.id}
                      style={[
                        ci > 0 && { marginLeft: meldOverlap },
                        card.id === highlightCardId && { zIndex: 5 },
                      ]}
                    >
                      {card.id === highlightCardId ? (
                        <Animated.View
                          style={[
                            styles.autoGlow,
                            { transform: [{ scale: autoGlowPulse }] },
                          ]}
                        >
                          <Card rank={card.rank} suit={card.suit} small />
                        </Animated.View>
                      ) : (
                        <Card rank={card.rank} suit={card.suit} small />
                      )}
                    </View>
                  ))}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* New Meld staging zone — always visible; greyed off your turn */}
      <View
        style={[
          styles.meldSection,
          styles.stagePinned,
          !canStage && styles.stageDisabled,
        ]}
        pointerEvents={canStage ? "auto" : "none"}
      >
        <View style={styles.stageRow}>
          {/* Left: Meld + Clear, always visible, greyed when unusable */}
          <View style={styles.stageBtnCol}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.layBtn,
                !stagedCommittable && styles.actionBtnDisabled,
              ]}
              onPress={confirmStagedMeld}
              disabled={!stagedCommittable}
              accessibilityRole="button"
              accessibilityLabel="Confirm new meld"
            >
              <Text style={styles.actionBtnText}>
                {stagedCommittable ? "✓ Meld" : "Meld"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.passBtn,
                stagedCards.length === 0 && styles.actionBtnDisabled,
              ]}
              onPress={() => setStagedCards([])}
              disabled={stagedCards.length === 0}
              accessibilityRole="button"
              accessibilityLabel="Clear staged meld"
            >
              <Text style={styles.actionBtnText}>Clear</Text>
            </TouchableOpacity>
          </View>
          {/* Right: the drag-to-build box */}
          <View
            ref={
              canStage
                ? meldDrag.registerZone("newMeld", { type: "newMeld" })
                : undefined
            }
            collapsable={false}
            style={[
              styles.stageZone,
              styles.stageZoneFlex,
              stagedCommittable && styles.stageZoneValid,
            ]}
          >
            {stagedCards.length === 0 ? (
              <Text style={styles.stageHint}>
                {canStage
                  ? "Drag cards here to build a meld"
                  : "Build a meld on your turn"}
              </Text>
            ) : (
              stagedCards.map((card) => {
                const hidden = meldDrag.draggingSource?.cardId === card.id;
                return (
                  <GestureDetector
                    key={card.id}
                    gesture={meldDrag.makeDragGesture({
                      type: "staged",
                      cardId: card.id,
                      card,
                    })}
                  >
                    <View style={hidden ? styles.cardHidden : null}>
                      <Card rank={card.rank} suit={card.suit} small />
                    </View>
                  </GestureDetector>
                );
              })
            )}
          </View>
        </View>
      </View>

      {/* Hand + action buttons — pinned at the bottom of the screen */}
      <View style={[styles.handSection, styles.handPinned]}>
          {phase === "initialPass" && !myHasSubmittedPass && (
            <Text style={styles.sectionLabel}>Tap to select 1 card to pass</Text>
          )}
          <View style={styles.handActionsRow}>
            {/* Left: hand as two rows of up to 5; also the drop zone */}
            <View
              ref={
                canStage
                  ? meldDrag.registerZone("hand", { type: "hand" })
                  : undefined
              }
              collapsable={false}
              style={styles.handGrid}
            >
              {[0, 5].map((start) => (
                <View key={start} style={styles.handGridRow}>
                  {availableHand.slice(start, start + 5).map((card, localIdx) => {
                    const index = start + localIdx;
                    const isSelected =
                      phase === "initialPass"
                        ? passCardId === card.id
                        : selectedHandIds.has(card.id);
                    const tappable =
                      (phase === "initialPass" && !myHasSubmittedPass) ||
                      (turnPhase === "action" && isMyTurn) ||
                      (turnPhase === "discard" && isMyTurn);
                    const dragHidden =
                      meldDrag.draggingSource?.cardId === card.id;
                    const cardEl = (
                      <TouchableOpacity
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
                        <View
                          style={[
                            isSelected && styles.selectedWrapperSmall,
                            dragHidden && styles.cardHidden,
                          ]}
                        >
                          <Card rank={card.rank} suit={card.suit} small />
                        </View>
                      </TouchableOpacity>
                    );
                    // Your action phase: draggable into the staging zone; tap
                    // stays as a fallback.
                    if (canStage) {
                      return (
                        <GestureDetector
                          key={card.id}
                          gesture={meldDrag.makeDragGesture({
                            type: "hand",
                            cardId: card.id,
                            card,
                          })}
                        >
                          {cardEl}
                        </GestureDetector>
                      );
                    }
                    return React.cloneElement(cardEl, { key: card.id });
                  })}
                </View>
              ))}
            </View>

            {/* Right: action buttons column */}
            <View style={styles.actionColumn}>
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
                >
                  <Text style={styles.actionBtnText}>Confirm Pass</Text>
                </TouchableOpacity>
              )}
              {phase === "initialPass" && myHasSubmittedPass && (
                <Text style={styles.waitText}>Waiting…</Text>
              )}

              {phase === "playing" && isMyTurn && turnPhase === "draw" && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleDraw}
                  accessibilityRole="button"
                  accessibilityLabel="Draw from Stock"
                >
                  <Text style={styles.actionBtnText}>Draw</Text>
                </TouchableOpacity>
              )}

              {phase === "playing" && isMyTurn && turnPhase === "action" && (
                <>
                  {canAddToMeld && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.layBtn]}
                      onPress={handleAddToMeld}
                      accessibilityRole="button"
                      accessibilityLabel="Add to Meld"
                    >
                      <Text style={styles.actionBtnText}>Add to Meld</Text>
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
                    accessibilityLabel="Arrange"
                  >
                    <Text style={styles.actionBtnText}>Arrange</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.passBtn]}
                    onPress={handlePass}
                    accessibilityRole="button"
                    accessibilityLabel="Pass"
                  >
                    <Text style={styles.actionBtnText}>Pass</Text>
                  </TouchableOpacity>
                </>
              )}

              {phase === "playing" && isMyTurn && turnPhase === "discard" && (
                <Text style={styles.discardHint}>Tap a card to discard</Text>
              )}

              {phase === "playing" && !isMyTurn && (
                <Text style={styles.waitText}>
                  {(gameState.chainPassedPids?.length ?? 0) > 0
                    ? `Chain → ${currentPlayer?.name}…`
                    : `${currentPlayer?.name}…`}
                </Text>
              )}
            </View>
          </View>
        </View>
      {/* Floating drag layer for the meld workspace — above everything, no taps */}
      {meldDrag.dragOverlay}
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

  borrowLayout: {
    flex: 1,
    paddingTop: scale(12),
    paddingBottom: scale(12),
  },
  borrowHeroArea: {
    flexShrink: 0,
    paddingHorizontal: scale(12),
  },
  borrowMeldsSection: {
    flex: 1,
    minHeight: 0,
    paddingTop: scale(4),
  },
  borrowMeldsScroll: {
    flex: 1,
  },
  borrowMeldsScrollContent: {
    paddingBottom: scale(12),
  },
  borrowHandSection: {
    marginTop: "auto",
    flexShrink: 0,
    paddingHorizontal: scale(12),
    paddingTop: scale(8),
    paddingBottom: scale(8),
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
  // Turn/phase toast — absolute pill near the top, auto-dismisses.
  toast: {
    position: "absolute",
    top: scale(64),
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 50,
  },
  toastText: {
    backgroundColor: "rgba(22, 33, 62, 0.97)",
    color: "#ffffff",
    fontSize: scaleFont(13),
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: scale(8),
    paddingHorizontal: scale(18),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: "#2a3650",
    overflow: "hidden",
  },
  opponentCard: {
    backgroundColor: "#16213e",
    borderRadius: scale(10),
    paddingHorizontal: scale(6),
    paddingVertical: scale(4),
    borderWidth: 1.5,
    borderColor: "#334",
  },
  opponentCardActive: { borderColor: "#7fb3ff" },
  opponentCardMulti: {},
  opponentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginBottom: scale(2),
  },
  opponentName: {
    color: "#fff",
    fontSize: scaleFont(11),
    fontWeight: "bold",
    flexShrink: 1,
  },
  opponentTurnDot: {
    color: "#7fb3ff",
    fontSize: scaleFont(11),
  },
  opponentStats: {
    color: "#c4c4d4",
    fontSize: scaleFont(11),
  },
  opponentMeldScroll: { marginTop: scale(2) },

  centerSection: { paddingHorizontal: scale(12), marginBottom: scale(6) },
  // Middle band: tall enough that the fixed-size sideways side seats frame the
  // Active card and use the otherwise-empty vertical space.
  pileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: scale(232),
    marginBottom: scale(6),
  },
  tableTopRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: scale(6),
  },
  tableBottomRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: scale(6),
    marginBottom: scale(2),
  },
  seatBox: {
    backgroundColor: "#16213e",
    borderRadius: scale(8),
    borderWidth: 1.5,
    borderColor: "#334",
    paddingHorizontal: scale(5),
    paddingVertical: scale(4),
  },
  // All 4 seats share ONE footprint (232×100). Top/bottom lie flat; the sides
  // stand the same box on end (rotated 90°) → identical dimensions all around.
  seatBoxHoriz: {
    width: scale(232),
    height: scale(100),
    overflow: "hidden",
    justifyContent: "flex-start",
  },
  // Top seat stretches right to fill the row, stopping short of the right side
  // seat (100 wide + a small gap).
  seatBoxTopWide: { width: "auto", flexGrow: 1, marginRight: scale(108) },
  // Same footprint as seatBoxHoriz; the rotation makes it tall-and-narrow.
  // Clip + top-anchored content → open space inside, melds can't spill.
  seatBoxRotated: {
    width: scale(232),
    height: scale(100),
    overflow: "hidden",
    justifyContent: "flex-start",
  },
  sideSeatWrap: {
    width: scale(100),
    height: scale(232),
    alignItems: "center",
    justifyContent: "center",
  },
  // Nudge the right side seat up (the band is as tall as the wrap, so a negative
  // top margin pulls it toward the top seat).
  sideSeatWrapUp: { alignSelf: "flex-start", marginTop: -scale(100) },
  seatEmpty: {
    backgroundColor: "transparent",
    borderColor: "#2a3650",
    borderStyle: "dashed",
  },
  headerStock: {
    color: "#a4b1c4",
    fontSize: scaleFont(14),
    fontWeight: "700",
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
  autoGlow: {
    borderRadius: scale(7),
    shadowColor: "#7CFFB2",
    shadowOpacity: 0.95,
    shadowRadius: scale(8),
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  activeCardTappable: {
    alignItems: "center",
    padding: scale(4),
    borderRadius: scale(10),
    borderWidth: 2,
    borderColor: "#7fb3ff",
    backgroundColor: "rgba(127, 179, 255, 0.10)",
  },
  activeCardSelected: {
    borderColor: "#4caf50",
    backgroundColor: "rgba(76, 175, 80, 0.15)",
    transform: [{ translateY: -6 }],
  },
  activeTapHint: {
    color: "#7fb3ff",
    fontSize: scaleFont(10),
    marginTop: scale(2),
    fontWeight: "600",
  },
  emptySlot: {
    width: scale(70),
    height: scale(100),
    borderRadius: scale(8),
    borderWidth: 2,
    borderColor: "#7fb3ff",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.6,
  },
  emptySlotText: { color: "#7fb3ff", fontSize: scaleFont(20), opacity: 0.6 },
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
  meldGroupSelected: { borderColor: "#7fb3ff" },

  // Stage 1 drag-to-meld staging zone
  stageZone: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    minHeight: scale(72),
    borderRadius: scale(12),
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(127, 179, 255, 0.4)",
    backgroundColor: "rgba(127, 179, 255, 0.06)",
    padding: scale(6),
    marginTop: scale(4),
  },
  stageZoneValid: {
    borderStyle: "solid",
    borderColor: "#7CFFB2",
    backgroundColor: "rgba(124, 255, 178, 0.12)",
  },
  stageHint: {
    color: "#8aa0c6",
    fontSize: scaleFont(12),
    paddingHorizontal: scale(6),
  },
  stageRow: { flexDirection: "row-reverse", alignItems: "stretch", gap: scale(8) },
  stageBtnCol: { width: scale(86), gap: scale(6), justifyContent: "center" },
  stageZoneFlex: { flex: 1 },
  stageBtnRow: { flexDirection: "row", gap: scale(8), marginTop: scale(6) },
  cardHidden: { opacity: 0 },

  scrollArea: { flex: 1 },
  // Greyed-out New Meld zone when it's not your draw turn.
  stageDisabled: { opacity: 0.4 },
  // New Meld zone pinned just above the hand bar.
  stagePinned: {
    marginBottom: 0,
    paddingTop: scale(6),
    backgroundColor: "#0f1626",
    borderTopWidth: 1,
    borderTopColor: "#2a3650",
  },
  handSection: {
    paddingHorizontal: scale(12),
    marginBottom: scale(6),
  },
  // Pinned bottom bar (hand + action buttons).
  handPinned: {
    marginBottom: 0,
    paddingTop: scale(6),
    paddingBottom: scale(8),
    backgroundColor: "#0f1626",
    borderTopWidth: 1,
    borderTopColor: "#2a3650",
  },
  handContainer: {
    backgroundColor: "rgba(127, 179, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(127, 179, 255, 0.18)",
    borderRadius: scale(12),
    paddingVertical: scale(8),
    paddingHorizontal: scale(6),
    marginTop: scale(4),
  },
  handRow: { flexDirection: "row", flexWrap: "wrap" },
  // Hand (5×2 grid) + action buttons side by side.
  handActionsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scale(8),
    marginTop: scale(4),
  },
  handGrid: {
    backgroundColor: "rgba(127, 179, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(127, 179, 255, 0.18)",
    borderRadius: scale(12),
    paddingVertical: scale(8),
    paddingHorizontal: scale(6),
    flexShrink: 0,
  },
  handGridRow: { flexDirection: "row", alignItems: "center" },
  actionColumn: {
    flex: 1,
    gap: scale(6),
    justifyContent: "flex-start",
  },
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
  actionBtnPrimary: {
    paddingHorizontal: scale(22),
    paddingVertical: scale(12),
    minWidth: scale(120),
  },
  actionBtnSecondary: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    minWidth: scale(80),
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

  borrowTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    backgroundColor: "#16213e",
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a4a",
  },
  borrowTopTitle: {
    color: "#ffffff",
    fontSize: scaleFont(16),
    fontWeight: "bold",
  },
  borrowTopBtn: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(8),
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  borrowTopBtnConfirm: {
    backgroundColor: "#7fb3ff",
  },
  borrowTopBtnDisabled: {
    backgroundColor: "#2a2a4a",
  },
  borrowTopBtnText: {
    color: "#c4c4d4",
    fontSize: scaleFont(14),
    fontWeight: "bold",
  },
  borrowTopBtnConfirmText: {
    color: "#0a0a1a",
  },
  borrowTopBtnDisabledText: {
    color: "#666680",
  },

  borrowHeroLabel: {
    color: "#c4c4d4",
    fontSize: scaleFont(12),
    textTransform: "uppercase",
    letterSpacing: scale(1),
    textAlign: "center",
    marginTop: scale(12),
    marginBottom: scale(8),
  },
  borrowHeroRow: {
    alignItems: "center",
    marginBottom: scale(8),
    minHeight: scale(108),
    justifyContent: "center",
  },
  borrowHeroCardWrap: {
    padding: scale(6),
    borderRadius: scale(12),
    borderWidth: 2,
    borderColor: "#7fb3ff",
    backgroundColor: "rgba(127, 179, 255, 0.10)",
  },
  borrowHeroCardSelected: {
    borderColor: "#4caf50",
    backgroundColor: "rgba(76, 175, 80, 0.15)",
    transform: [{ translateY: -6 }],
  },
  borrowHeroCardPlaced: {
    padding: scale(20),
    borderRadius: scale(12),
    backgroundColor: "rgba(76, 175, 80, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.4)",
  },
  borrowHeroPlacedText: {
    color: "#4caf50",
    fontSize: scaleFont(14),
    fontWeight: "bold",
  },

  borrowValidRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: scale(12),
    paddingHorizontal: scale(12),
  },
  borrowValidText: {
    fontSize: scaleFont(12),
    fontWeight: "600",
  },
  borrowValidOk: {
    color: "#4caf50",
  },
  borrowValidWarn: {
    color: "#e0a93f",
  },

  borrowSectionLabel: {
    color: "#c4c4d4",
    fontSize: scaleFont(11),
    textTransform: "uppercase",
    letterSpacing: scale(1),
    marginHorizontal: scale(12),
    marginTop: scale(8),
    marginBottom: scale(4),
  },

  borrowMeldRow: {
    marginHorizontal: scale(12),
    marginBottom: scale(8),
    borderRadius: scale(10),
    borderWidth: 2,
    borderColor: "#2a2a4a",
    backgroundColor: "#16213e",
    padding: scale(8),
  },
  borrowMeldRowValid: {
    borderColor: "#4caf50",
  },
  borrowMeldRowInvalid: {
    borderColor: "#e94560",
  },
  borrowMeldRowTargeted: {
    borderColor: "#7fb3ff",
    backgroundColor: "rgba(127, 179, 255, 0.08)",
  },
  borrowMeldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scale(4),
  },
  borrowMeldLabel: {
    color: "#c4c4d4",
    fontSize: scaleFont(12),
    fontWeight: "600",
  },
  borrowMeldStatus: {
    fontSize: scaleFont(11),
    fontWeight: "600",
  },
  borrowMeldStatusOk: {
    color: "#4caf50",
  },
  borrowMeldStatusWarn: {
    color: "#e94560",
  },
  borrowMeldCardsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    minHeight: scale(40),
    alignItems: "center",
  },
  borrowMeldEmpty: {
    color: "#666680",
    fontSize: scaleFont(12),
    fontStyle: "italic",
    paddingHorizontal: scale(6),
  },

  borrowAddMeldBtn: {
    marginHorizontal: scale(12),
    marginVertical: scale(8),
    padding: scale(12),
    borderRadius: scale(10),
    borderWidth: 1.5,
    borderColor: "#7fb3ff",
    borderStyle: "dashed",
    alignItems: "center",
  },
  borrowAddMeldText: {
    color: "#7fb3ff",
    fontSize: scaleFont(13),
    fontWeight: "bold",
  },

  borrowHandRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: scale(12),
    backgroundColor: "rgba(127, 179, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(127, 179, 255, 0.18)",
    borderRadius: scale(12),
    paddingVertical: scale(8),
    marginHorizontal: scale(12),
    marginTop: scale(4),
  },
  borrowHandEmpty: {
    color: "#666680",
    fontSize: scaleFont(13),
    fontStyle: "italic",
    padding: scale(6),
  },
  borrowCardDragging: {
    opacity: 0.15,
  },
  borrowDragOverlay: {
    position: "absolute",
    zIndex: 50,
    elevation: 20,
  },
  borrowDragCardWrap: {
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  borrowHandRowTargeted: {
    borderColor: "#7fb3ff",
    backgroundColor: "rgba(127, 179, 255, 0.12)",
  },

  // Borrow mode
  borrowTitle: {
    color: "#fff",
    fontSize: scaleFont(24),
    fontWeight: "bold",
    textAlign: "center",
    marginTop: scale(8),
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
  borrowHint: {
    backgroundColor: "rgba(127, 179, 255, 0.10)",
    borderLeftWidth: 3,
    borderLeftColor: "#7fb3ff",
    borderRadius: scale(8),
    paddingVertical: scale(8),
    paddingHorizontal: scale(12),
    marginHorizontal: scale(12),
    marginBottom: scale(8),
  },
  borrowHintText: {
    color: "#c4c4d4",
    fontSize: scaleFont(13),
    lineHeight: scaleFont(18),
  },
});
