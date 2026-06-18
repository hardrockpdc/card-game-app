import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  AccessibilityInfo,
  BackHandler,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureDetector } from "react-native-gesture-handler";
import { useFocusEffect } from "@react-navigation/native";

import Card from "../components/Card";
import useSolitaireDrag from "../components/useSolitaireDrag";
import GameHeader from "../components/GameHeader";
import GameMenuButton from "../components/GameMenuButton";
import EndOfRoundModal from "../components/EndOfRoundModal";
import Confetti from "../components/Confetti";
import { hapticWin } from "../game/haptics";
import StatsStrip from "../components/StatsStrip";
import { useLayoutMode } from "../game/useLayoutMode";
import {
  createSolitaireState,
  getTopCard,
  getVariantOption,
  newGameAction,
  solitaireReducer,
  tapAction,
  undoAction,
} from "../game/solitaire";
import { addCoins } from "../game/wallet";
import { recordWin } from "../game/profile";
import { saveGame, loadGame, clearGame } from "../game/gameSaves";
import { getTableTheme } from "../game/tableThemes";
import { scale } from "../game/responsive";

// expo-screen-orientation is a native module; guard the require so a dev build
// made before it was added doesn't crash — it simply won't lock until rebuilt.
let ScreenOrientation = null;
try {
  ScreenOrientation = require("expo-screen-orientation");
} catch {}

const BG = getTableTheme("solitaire").table;

function solitaireSaveKey(variantId) {
  return `@cardnight:save:solitaire:${variantId}`;
}

// Wraps the official reducer to allow full state restoration without
// modifying the game logic file.
function solitaireReducerWithRestore(state, action) {
  if (action.type === "__RESTORE__") return action.payload;
  return solitaireReducer(state, action);
}

function sameTarget(selected, target) {
  if (!selected || !target) {
    return false;
  }

  return (
    selected.type === target.type &&
    selected.index === target.index &&
    selected.row === target.row &&
    selected.col === target.col &&
    selected.cardIndex === target.cardIndex
  );
}

function isTableauSelection(selected, pileIndex, cardIndex) {
  return (
    selected?.type === "tableau" &&
    selected.index === pileIndex &&
    typeof selected.cardIndex === "number" &&
    cardIndex >= selected.cardIndex
  );
}

function isSpiderSelection(selected, pileIndex, cardIndex) {
  return (
    selected?.type === "tableau" &&
    selected.index === pileIndex &&
    typeof selected.cardIndex === "number" &&
    cardIndex >= selected.cardIndex
  );
}

function isPyramidSelection(selected, row, col) {
  return (
    selected?.type === "pyramid" && selected.row === row && selected.col === col
  );
}

function isTriPeaksSelection(selected, row, col) {
  return (
    selected?.type === "tripeaks" &&
    selected.row === row &&
    selected.col === col
  );
}

function CardSlot({
  card,
  label,
  onPress,
  selected = false,
  disabled = false,
  small = true,
  sizeScale = 1.1,
  animateReveal = false,
  style,
  onCardLayout,
  containerRef,
  dragGesture,
  highlighted = false,
  hidden = false,
}) {
  const inner = (
    <Pressable
      ref={containerRef}
      onPress={disabled ? undefined : onPress}
      onLayout={onCardLayout}
      style={({ pressed }) => [
        card ? styles.cardTouch : styles.emptyCard,
        style,
        selected && styles.cardTouchSelected,
        highlighted && styles.cardTouchHighlighted,
        pressed && !disabled && styles.cardTouchPressed,
        disabled && styles.cardTouchDisabled,
        hidden && styles.cardTouchHidden,
      ]}
    >
      {card ? (
        <Card
          rank={card.rankLabel}
          suit={card.symbol}
          faceDown={!card.faceUp}
          animateReveal={animateReveal}
          small={small}
          sizeScale={sizeScale}
        />
      ) : (
        <Text
          style={styles.emptyCardText}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {label}
        </Text>
      )}
    </Pressable>
  );

  // When a drag gesture is supplied the card becomes draggable. GestureDetector
  // attaches to the Pressable without adding a view, so the overlap layout is
  // unchanged; the small activeOffset means a plain tap still fires onPress.
  if (dragGesture) {
    return <GestureDetector gesture={dragGesture}>{inner}</GestureDetector>;
  }
  return inner;
}

function StockSlot({ label, onPress, disabled = false, style }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.stockSlot,
        style,
        pressed && !disabled && styles.cardTouchPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <Text
        style={styles.stockLabel}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function formatTime(seconds) {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function SolitaireGameScreen({ navigation, route }) {
  const routeVariantId = route?.params?.variantId || "klondike";
  const routeSpiderMode = route?.params?.spiderMode || 4;

  const { width, height } = useLayoutMode();
  const isLandscape = width > height;
  const spiderBoardWidth = Math.max(width - 28, 500);

  // Measured size of the LEFT tableau region in landscape. Because the slots now
  // live in a side rail (not above the tableau), the tableau's own width/height
  // no longer depend on card size — so measuring them can't cause sizing
  // feedback (the vibration we hit before). Fallbacks apply until first measure.
  const [tableauBoxH, setTableauBoxH] = useState(0);
  const [tableauBoxW, setTableauBoxW] = useState(0);

  // Klondike has a dedicated landscape layout, so lock the screen to landscape
  // while it's focused and release it on leave. No-op without the native module
  // (i.e. on a dev build made before it was added) so nothing crashes.
  useFocusEffect(
    useCallback(() => {
      if (
        !ScreenOrientation ||
        !["klondike", "freecell", "spider", "pyramid", "tripeaks"].includes(
          routeVariantId,
        )
      ) {
        return undefined;
      }
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE,
      ).catch(() => {});
      return () => {
        // Restore the app-wide portrait default on the way out — don't just
        // unlock, which would leave rotation free and let a portrait screen
        // render sideways.
        ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        ).catch(() => {});
      };
    }, [routeVariantId]),
  );

  const [state, dispatch] = useReducer(solitaireReducerWithRestore, null, () =>
    createSolitaireState(routeVariantId, { spiderMode: routeSpiderMode }),
  );

  // ── Responsive tableau sizing (landscape rail layout) ───────────────────────
  // Shared by the column-based variants (Klondike, FreeCell). Card.js small-card
  // width = 42 * clamp(width/390, 0.85, 1.5) * sizeScale, so we derive sizeScale.
  const TAB_COLS =
    { klondike: 7, freecell: 8, spider: 10 }[routeVariantId] || 7;
  const KGAP = isLandscape ? 4 : 8; // tighter column spacing in landscape
  const cardClamp = Math.min(Math.max(width / 390, 0.85), 1.5);
  // Comfortable, CONSTANT overlap (the fraction of each stacked card left
  // visible). Cards are sized so a full column fits at this spacing rather than
  // the spacing being crushed to fit — easier to read and to drag-and-drop.
  const FU_FRAC = 0.2; // face-up: how much of each card stays visible
  const FD_FRAC = 0.05; // face-down: a smaller sliver

  let tabCardW;
  let slotW; // free cell / foundation / stock / waste slot size
  let tableauAvailH = Infinity; // landscape: the height a column must fit within

  if (isLandscape) {
    // Tableau fills the MEASURED left region: cards fill all columns across its
    // width, capped by its height so there's room to overlap. Stable to measure.
    const availW = tableauBoxW > 0 ? tableauBoxW : width * 0.68;
    const availH = tableauBoxH > 0 ? tableauBoxH : Math.max(height - 30, 150);
    const widthFillW = (availW - (TAB_COLS - 1) * KGAP) / TAB_COLS;
    // DYNAMIC: size cards so the CURRENT longest column fits at the comfortable
    // overlap. A column's height is cardH*units + chrome, where units = 1 + the
    // sum of the visible fractions of its overlapped cards. Cards are big when
    // columns are short and shrink only as a column grows — the overlap itself
    // never tightens. (Columns longer than this still get the compression
    // fallback in tableauColumnMargins, but it rarely triggers now.)
    let colFitH = Infinity;
    for (const pile of state.tableau || []) {
      const n = pile.length;
      if (!n) continue;
      let units = 1; // first card is full height
      for (let i = 1; i < n; i++) {
        units += pile[i - 1].faceUp ? FU_FRAC : FD_FRAC;
      }
      colFitH = Math.min(colFitH, (availH - 10) / units);
    }
    if (!Number.isFinite(colFitH)) colFitH = availH;
    const heightFitW = Math.max(colFitH, 50) / 1.43;
    // 0.95 = a touch smaller than the cap, leaving breathing room.
    tabCardW = Math.max(Math.min(widthFillW, heightFitW, 100) * 0.95, 34);
    // Rail = stats row + slot rows; size each slot from the available height so
    // all rows fit. FreeCell needs 4 rows (free cells 2x2 + foundations 2x2);
    // Klondike needs 3 (Stock/Waste + foundations 2x2).
    const railRows =
      routeVariantId === "freecell"
        ? 4
        : ["spider", "pyramid", "tripeaks"].includes(routeVariantId)
          ? 2
          : 3;
    // availH minus the rail's own padding (16) + stats row (~36) + foundations
    // gap (6) + inter-row gaps, split across the rows — so the slots stay inside
    // the rail's border.
    const slotBudgetH = (availH - 58 - railRows * 8) / railRows;
    slotW = Math.max(Math.min(Math.round(slotBudgetH / 1.43), 96), 40);
  } else {
    // Portrait (Klondike): bound by width so 7 columns fit; height cap keeps sane.
    const widthFit = (width - 28 - 24 - (7 - 1) * 8) / 7;
    const usableHeight = Math.max(height - 200, 240);
    const heightCap = (usableHeight * 0.34) / 1.43;
    tabCardW = Math.max(Math.min(widthFit, heightCap, 100), 34);
    slotW = Math.round(tabCardW);
  }

  const tabCardScale = tabCardW / (42 * cardClamp);
  const tabCardH = tabCardW * 1.43;
  const slotH = Math.round(slotW * 1.43);
  const slotScale = slotW / (42 * cardClamp);
  // Comfortable constant overlap; columns longer than DESIGN_LEN compress a bit
  // (per column) as a fallback — see tableauColumnMargins.
  const faceUpPeek = Math.round(tabCardH * FU_FRAC);
  const faceDownPeek = Math.round(tabCardH * FD_FRAC);

  if (isLandscape) {
    const availH = tableauBoxH > 0 ? tableauBoxH : Math.max(height - 30, 150);
    tableauAvailH = Math.max(availH - 6, tabCardH + 20);
  }

  // Per-column adaptive overlap, shared by the column variants. If a column's
  // natural height would overflow the available height (landscape), its overlaps
  // compress by one factor so it fits — short columns stay spread, long ones
  // bunch, nothing scrolls. Returns a marginTop per card index (0 for the first).
  //
  // Each rendered card box is the card plus the cardTouch chrome (padding 2 +
  // border 1 = 6px). The margin math MUST use that real box height, or the
  // unaccounted 6px/card accumulates and a long column spills off-screen.
  const CARD_CHROME = 6;
  const tableauColumnMargins = (pile) => {
    const boxH = tabCardH + CARD_CHROME;
    let natural = boxH;
    for (let i = 1; i < pile.length; i++) {
      natural += pile[i - 1].faceUp ? faceUpPeek : faceDownPeek;
    }
    let factor = 1;
    if (isLandscape && natural > tableauAvailH && natural > boxH) {
      factor = Math.max((tableauAvailH - boxH) / (natural - boxH), 0.04);
    }
    return pile.map((card, i) =>
      i === 0
        ? 0
        : -Math.round(
            boxH - (pile[i - 1].faceUp ? faceUpPeek : faceDownPeek) * factor,
          ),
    );
  };

  // Drag-and-drop (Klondike landscape pilot). The hook is always called (hooks
  // can't be conditional); its output is only wired into the Klondike landscape
  // render below.
  const {
    makeDragGesture,
    registerZone,
    isLegalTarget,
    draggingSource,
    dragOverlay,
  } = useSolitaireDrag(state, dispatch, {
    cardW: tabCardW,
    cardH: tabCardH,
    cardScale: tabCardScale,
    faceUpPeek,
  });
  // Drag-and-drop is wired for the "move cards between piles" variants. Pyramid
  // and TriPeaks are match/collect games and stay tap-only.
  const dragEnabled =
    isLandscape &&
    ["klondike", "freecell", "spider"].includes(state.variantId);

  const coinRewardedRef = useRef(false);
  const wonClearedRef = useRef(false);
  const lastSaveRef = useRef(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // Tracks whether the initial mount already dispatched newGameAction so the
  // restore effect (which fires after) knows if it should override it.
  const initialGameDispatched = useRef(false);

  // Spider run-complete fly-away animation state (UI-only).
  const spiderPrevCompletedRunsRef = useRef(0);
  const spiderPrevTableauCardsRef = useRef(new Map()); // cardId -> card (prev render)
  const spiderColumnLayoutsRef = useRef({}); // pileIndex -> { x, y } (current render)
  const spiderCardLayoutsRef = useRef({}); // cardId -> { x, y, w, h, pileIndex, cardIndex } (current render)

  // Snapshot of layouts/cards from the previous committed render, used to
  // animate the cards that were removed by spiderResolveCompletedRuns.
  const spiderPrevColumnLayoutsRef = useRef({}); // pileIndex -> { x, y } (prev render)
  const spiderPrevCardLayoutsRef = useRef({}); // cardId -> { x, y, w, h, pileIndex, cardIndex } (prev render)

  const spiderFlyAwayInProgressRef = useRef(false);
  const spiderPendingWinModalRef = useRef(false);
  const spiderWinModalTimeoutRef = useRef(null);
  const spiderFlyAwayTimeoutRef = useRef(null);

  const spiderFlyAwayAnimValuesRef = useRef(new Map()); // cardId -> { translateX, translateY, opacity, scale }
  const spiderFaceUpPeekRef = useRef(16); // faceUpPeek px — updated each render, read in fly-away effect
  const spiderTabCardWRef = useRef(0); // tabCardW px — updated each render
  const spiderTabCardHRef = useRef(0); // tabCardH px — updated each render
  // Refs used to measure where the Runs counter is, so a completed run can fly
  // into it (the tableau row is the ghost cards' coordinate origin).
  const spiderTableauRowRef = useRef(null);
  const spiderRunsPillRef = useRef(null);

  // Sync sizing refs after the refs are declared (can't write before useRef call).
  spiderFaceUpPeekRef.current = faceUpPeek;
  spiderTabCardWRef.current = tabCardW;
  spiderTabCardHRef.current = tabCardH;

  const [spiderFlyAwayCards, setSpiderFlyAwayCards] = useState([]); // { cardId, card, x, y, w, h }

  // P1: Cached reduced-motion preference. Read once on mount, updated on change.
  const reduceMotionRef = useRef(false);

  // BUG-4: Unified mount effect — always check for a saved game first,
  // regardless of resumeFromSave. Prevents hot-reload from clobbering
  // an in-progress game with a fresh deal.
  useEffect(() => {
    async function init() {
      const saved = await loadGame(solitaireSaveKey(routeVariantId));
      if (saved?.state) {
        dispatch({ type: "__RESTORE__", payload: saved.state });
        if (typeof saved.elapsed === "number") {
          setElapsed(saved.elapsed);
        }
        coinRewardedRef.current = false;
        setCoinsEarned(0);
        return;
      }
      initialGameDispatched.current = true;
      dispatch(newGameAction(routeVariantId, { spiderMode: routeSpiderMode }));
      coinRewardedRef.current = false;
      setCoinsEarned(0);
      setElapsed(0);
    }
    init();
  }, [routeVariantId, routeSpiderMode]);

  // P1: Subscribe to the system reduced-motion preference. When enabled,
  // the Spider fly-away animation is skipped entirely (cards just vanish + modal shows).
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) reduceMotionRef.current = enabled;
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        reduceMotionRef.current = enabled;
      },
    );
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  // P4: Cleanup any pending Spider animation timers on unmount so we don't
  // leak setTimeout callbacks if the user navigates away mid-animation.
  useEffect(() => {
    return () => {
      if (spiderFlyAwayTimeoutRef.current) {
        clearTimeout(spiderFlyAwayTimeoutRef.current);
        spiderFlyAwayTimeoutRef.current = null;
      }
      if (spiderWinModalTimeoutRef.current) {
        clearTimeout(spiderWinModalTimeoutRef.current);
        spiderWinModalTimeoutRef.current = null;
      }
      // Stop any in-flight animations to prevent state updates after unmount.
      spiderFlyAwayAnimValuesRef.current.forEach((anim) => {
        anim.translateY.stopAnimation();
        anim.opacity.stopAnimation();
        anim.scale.stopAnimation();
      });
      spiderFlyAwayAnimValuesRef.current.clear();
      spiderFlyAwayInProgressRef.current = false;
    };
  }, []);

  // Auto-save after every move; clear save on win (only once per win).
  useEffect(() => {
    const key = solitaireSaveKey(state.variantId || routeVariantId);
    if (state.status === "won") {
      if (!wonClearedRef.current) {
        wonClearedRef.current = true;
        clearGame(key);
      }
      return;
    }
    wonClearedRef.current = false;
    // PERF-3: throttle saves to once per 3 seconds (elapsed updates every second)
    const now = Date.now();
    if (now - lastSaveRef.current < 3000) return;
    lastSaveRef.current = now;
    saveGame(key, { state: { ...state, history: undefined }, elapsed });
  }, [state, elapsed]);

  useEffect(() => {
    if (state.status === "won" && !coinRewardedRef.current) {
      coinRewardedRef.current = true;
      addCoins(250).then(() => setCoinsEarned(250));
      recordWin("solitaire");
      hapticWin();
    }
    if (state.status !== "won") {
      coinRewardedRef.current = false;
      setCoinsEarned(0);
    }
  }, [state.status]);

  useEffect(() => {
    if (state.status !== "won") return;

    if (state.variantId === "spider") {
      const currCompletedRuns = state.completedRuns ?? 0;
      const justCompletedRun =
        currCompletedRuns > spiderPrevCompletedRunsRef.current;

      // If we just completed a run (same render) or the fly-away is already in progress,
      // delay the modal until the animation finishes.
      if (justCompletedRun || spiderFlyAwayInProgressRef.current) {
        spiderPendingWinModalRef.current = true;
        return;
      }
    }

    setShowRoundModal(true);
  }, [state.status, state.variantId, state.completedRuns]);

  useEffect(() => {
    if (state.variantId !== "spider") return;

    const currCompletedRuns = state.completedRuns ?? 0;
    const prevCompletedRuns = spiderPrevCompletedRunsRef.current;

    const currentCardsMap = new Map();
    const currentCardIds = new Set();

    for (let pileIndex = 0; pileIndex < state.tableau.length; pileIndex += 1) {
      const pile = state.tableau[pileIndex] || [];
      for (let cardIndex = 0; cardIndex < pile.length; cardIndex += 1) {
        const card = pile[cardIndex];
        currentCardsMap.set(card.id, card);
        currentCardIds.add(card.id);
      }
    }

    const justCompletedRuns = currCompletedRuns > prevCompletedRuns;

    // Trigger only when spider completed a run (i.e. card removals happened).
    if (justCompletedRuns && !spiderFlyAwayInProgressRef.current) {
      const prevCardLayouts = spiderPrevCardLayoutsRef.current; // cardId -> layout
      const prevColumnLayouts = spiderPrevColumnLayoutsRef.current; // pileIndex -> { x, y }
      const prevCardsMap = spiderPrevTableauCardsRef.current; // Map(cardId -> card)

      const removedIds = [];
      for (const cardId of Object.keys(prevCardLayouts)) {
        if (!currentCardIds.has(cardId)) removedIds.push(cardId);
      }

      if (removedIds.length > 0) {
        // Find the completion column: the one with the most removed cards.
        // That column is always where the final move landed. All ghosts fly
        // from this single column so the animation doesn't split across two.
        const pileCount = {};
        removedIds.forEach((id) => {
          const pi = prevCardLayouts[id]?.pileIndex;
          if (pi !== undefined)
            pileCount[pi] = (pileCount[pi] || 0) + 1;
        });
        const completionPileIndex = parseInt(
          Object.entries(pileCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0,
        );
        const completionColPos =
          prevColumnLayouts[completionPileIndex] || { x: 0, y: 0 };

        // Find the topmost removed card in the completion column (= the King).
        // Its y gives us the visual anchor for the whole stack.
        const completionColRemoved = removedIds.filter(
          (id) => prevCardLayouts[id]?.pileIndex === completionPileIndex,
        );
        const topLayout = completionColRemoved
          .map((id) => prevCardLayouts[id])
          .filter(Boolean)
          .sort((a, b) => (a.y ?? 0) - (b.y ?? 0))[0];
        const kingY = topLayout
          ? (completionColPos.y ?? 0) + (topLayout.y ?? 0)
          : completionColPos.y ?? 0;

        const peek = spiderFaceUpPeekRef.current || 16;
        const cardW = spiderTabCardWRef.current || 42;
        const cardH = spiderTabCardHRef.current || 60;

        // Sort cards King→Ace (rank 13→1) so they stack top-to-bottom correctly.
        const sortedIds = [...removedIds].sort((a, b) => {
          const ra = prevCardsMap.get(a)?.rank ?? 0;
          const rb = prevCardsMap.get(b)?.rank ?? 0;
          return rb - ra; // King first
        });

        const ghostCards = sortedIds
          .map((cardId, stackIndex) => {
            const layout = prevCardLayouts[cardId];
            const card = prevCardsMap.get(cardId);
            if (!layout || !card) return null;
            return {
              cardId,
              card,
              x: completionColPos.x ?? 0,
              y: kingY + stackIndex * peek,
              w: cardW,
              h: cardH,
            };
          })
          .filter(Boolean);

        if (ghostCards.length > 0) {
          // P1: If reduced motion is enabled, skip the animation entirely.
          if (reduceMotionRef.current) {
            if (spiderPendingWinModalRef.current) {
              spiderPendingWinModalRef.current = false;
              setShowRoundModal(true);
            }
            return;
          }

          // P4: Guard against starting a new fly-away while one is in progress.
          if (spiderFlyAwayInProgressRef.current) {
            return;
          }

          spiderFlyAwayInProgressRef.current = true;

          spiderFlyAwayAnimValuesRef.current.clear();
          const lastAnimCount = ghostCards.length;

          for (const ghost of ghostCards) {
            spiderFlyAwayAnimValuesRef.current.set(ghost.cardId, {
              translateX: new Animated.Value(0),
              translateY: new Animated.Value(0),
              opacity: new Animated.Value(1),
              scale: new Animated.Value(1),
            });
          }

          setSpiderFlyAwayCards(ghostCards);

          const isFinalRun = (state.completedRuns ?? 0) >= 8;
          const STAGGER_MS = isFinalRun ? 70 : 64;
          const ANIM_MS = isFinalRun ? 820 : 720;

          // Fly every ghost toward (targetX, targetY) — a point in the tableau
          // row's local coords that the card CENTERS head to. Cards accelerate
          // in (Easing.in) and shrink + fade as they're collected into the
          // Runs counter.
          const beginAnimation = (targetX, targetY) => {
            let finishedCount = 0;
            const finishOne = () => {
              finishedCount += 1;
              if (finishedCount === lastAnimCount) {
                spiderFlyAwayInProgressRef.current = false;
                setSpiderFlyAwayCards([]);
                if (spiderPendingWinModalRef.current) {
                  spiderPendingWinModalRef.current = false;
                  setShowRoundModal(true);
                }
              }
            };

            ghostCards.forEach((ghost, index) => {
              const anim = spiderFlyAwayAnimValuesRef.current.get(ghost.cardId);
              if (!anim) {
                finishOne();
                return;
              }

              const cardCenterX = ghost.x + ghost.w / 2;
              const cardCenterY = ghost.y + ghost.h / 2;
              const xTarget = targetX - cardCenterX;
              const yTarget = targetY - cardCenterY;
              const delay = index * STAGGER_MS;

              const animations = [
                Animated.timing(anim.translateX, {
                  toValue: xTarget,
                  duration: ANIM_MS,
                  delay,
                  easing: Easing.in(Easing.cubic),
                  useNativeDriver: true,
                }),
                Animated.timing(anim.translateY, {
                  toValue: yTarget,
                  duration: ANIM_MS,
                  delay,
                  easing: Easing.in(Easing.cubic),
                  useNativeDriver: true,
                }),
                Animated.timing(anim.scale, {
                  toValue: 0.25,
                  duration: ANIM_MS,
                  delay,
                  easing: Easing.in(Easing.cubic),
                  useNativeDriver: true,
                }),
                Animated.timing(anim.opacity, {
                  toValue: 0,
                  duration: Math.round(ANIM_MS * 0.45),
                  delay: delay + Math.round(ANIM_MS * 0.55),
                  easing: Easing.in(Easing.quad),
                  useNativeDriver: true,
                }),
              ];

              Animated.parallel(animations).start(finishOne);
            });
          };

          // Aim at the Runs counter if we can measure it; otherwise fall back to
          // flying up off the top-center of the screen.
          const runsNode = spiderRunsPillRef.current;
          const rowNode = spiderTableauRowRef.current;
          if (runsNode?.measureInWindow && rowNode?.measureInWindow) {
            rowNode.measureInWindow((rowX, rowY) => {
              runsNode.measureInWindow((pillX, pillY, pillW, pillH) => {
                const targetX = pillX + pillW / 2 - rowX;
                const targetY = pillY + pillH / 2 - rowY;
                beginAnimation(targetX, targetY);
              });
            });
          } else {
            beginAnimation(width / 2, -200);
          }
        }
      }
    }

    // Update "previous render" snapshots for the next move.
    spiderPrevCompletedRunsRef.current = currCompletedRuns;
    spiderPrevColumnLayoutsRef.current = { ...spiderColumnLayoutsRef.current };
    spiderPrevCardLayoutsRef.current = { ...spiderCardLayoutsRef.current };
    spiderPrevTableauCardsRef.current = currentCardsMap;
  }, [state.variantId, state.completedRuns, state.tableau]);

  useEffect(() => {
    if (state.moves === 0 || state.status === "won") return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [state.moves, state.status]);

  // UX-5: Android hardware back confirmation
  useEffect(() => {
    const onBack = () => {
      Alert.alert("Leave Game?", "Your progress will be saved.", [
        { text: "Stay", style: "cancel" },
        {
          text: "Leave",
          onPress: handleSaveAndExit,
        },
      ]);
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => sub.remove();
  }, []);

  const variant = useMemo(
    () => getVariantOption(state.variantId),
    [state.variantId],
  );

  const restart = () => {
    coinRewardedRef.current = false;
    setCoinsEarned(0);
    setElapsed(0);
    clearGame(solitaireSaveKey(state.variantId || routeVariantId));
    dispatch(newGameAction(state.variantId, { spiderMode: state.spiderMode }));
  };

  const handleSaveAndExit = () => {
    saveGame(solitaireSaveKey(state.variantId || routeVariantId), {
      state: { ...state, history: undefined },
      elapsed,
    });
    navigation.navigate("Home");
  };

  const menuItems = [
    {
      type: "undo",
      onUndo: () => dispatch(undoAction()),
      disabled: !state.history || state.history.length === 0,
    },
    { type: "restart", onRestart: restart },
    { type: "saveexit", onSaveExit: handleSaveAndExit },
    { type: "howto", gameId: "solitaire" },
    { type: "theme" },
    { type: "divider" },
    {
      type: "quit",
      onQuit: () => {
        clearGame(solitaireSaveKey(state.variantId || routeVariantId));
        navigation.navigate("Home");
      },
    },
  ];

  // Moves + Time only. Per-variant counts (stock, free cells, etc.) are already
  // visible on the board, so they'd be redundant here. These live inside the
  // header (replacing the title) in every orientation — see leftInfo below.
  const statsItems = [
    { label: "Moves", value: state.moves, accent: true },
    { label: "Time", value: formatTime(elapsed), accent: false },
  ];

  const renderKlondike = () => {
    const wasteTop = getTopCard(state.waste);

    const stockSlot = (
      <StockSlot
        label={state.stock.length > 0 ? `Stock ${state.stock.length}` : "↻"}
        onPress={() => dispatch(tapAction({ type: "stock" }))}
        style={{ width: slotW, height: slotH }}
      />
    );

    const wasteSlot = (
      <CardSlot
        card={wasteTop}
        label="Waste"
        sizeScale={slotScale}
        onPress={() => dispatch(tapAction({ type: "waste" }))}
        selected={sameTarget(state.selected, { type: "waste" })}
        dragGesture={
          dragEnabled && wasteTop
            ? makeDragGesture({ type: "waste" })
            : undefined
        }
        hidden={dragEnabled && draggingSource?.type === "waste"}
        style={{
          width: slotW,
          height: slotH,
          minWidth: slotW,
          minHeight: slotH,
        }}
      />
    );

    const foundationSlots = state.foundations.map((foundation, index) => {
      const top = getTopCard(foundation);
      const selected =
        state.selected?.type === "foundation" && state.selected.index === index;
      return (
        <CardSlot
          key={`foundation-${index}`}
          card={top}
          label={`F${index + 1}`}
          sizeScale={slotScale}
          onPress={() => dispatch(tapAction({ type: "foundation", index }))}
          selected={selected}
          containerRef={
            dragEnabled
              ? registerZone(`f-${index}`, { type: "foundation", index })
              : undefined
          }
          highlighted={
            dragEnabled && isLegalTarget({ type: "foundation", index })
          }
          style={{
            width: slotW,
            height: slotH,
            minWidth: slotW,
            minHeight: slotH,
          }}
        />
      );
    });

    const columns = state.tableau.map((pile, pileIndex) => {
      const margins = tableauColumnMargins(pile);
      const colHighlighted =
        dragEnabled && isLegalTarget({ type: "tableau", index: pileIndex });
      return (
        <View
          key={`klondike-${pileIndex}`}
          ref={
            dragEnabled
              ? registerZone(`t-${pileIndex}`, {
                  type: "tableau",
                  index: pileIndex,
                })
              : undefined
          }
          style={[
            styles.tableauColumn,
            colHighlighted && styles.tableauColumnHighlighted,
          ]}
        >
          {pile.length === 0 ? (
            <>
              <View
                style={[
                  styles.tableauTopSpacer,
                  isLandscape && styles.tableauTopSpacerLandscape,
                ]}
              />
              <Pressable
                onPress={() =>
                  dispatch(tapAction({ type: "tableau", index: pileIndex }))
                }
                style={({ pressed }) => [
                  styles.emptyColumnSlot,
                  pressed && styles.cardTouchPressed,
                  {
                    width: Math.round(tabCardW * 0.8),
                    height: Math.round(tabCardH * 0.8),
                    minWidth: Math.round(tabCardW * 0.8),
                    minHeight: Math.round(tabCardH * 0.8),
                  },
                ]}
              >
                <Text style={styles.emptyColumnText}>Empty</Text>
              </Pressable>
            </>
          ) : (
            <View
              style={[
                styles.tableauTopSpacer,
                isLandscape && styles.tableauTopSpacerLandscape,
              ]}
            />
          )}

          {pile.map((card, cardIndex) => {
            const selected = isTableauSelection(
              state.selected,
              pileIndex,
              cardIndex,
            );
            const source = {
              type: "tableau",
              index: pileIndex,
              cardIndex,
            };
            // Hide cards that are currently lifted in the drag overlay.
            const hidden =
              dragEnabled &&
              draggingSource?.type === "tableau" &&
              draggingSource.index === pileIndex &&
              cardIndex >= draggingSource.cardIndex;

            return (
              <CardSlot
                key={card.id}
                card={card}
                label=""
                animateReveal={true}
                sizeScale={tabCardScale}
                onPress={() => dispatch(tapAction(source))}
                selected={selected}
                disabled={!card.faceUp}
                dragGesture={
                  dragEnabled && card.faceUp
                    ? makeDragGesture(source)
                    : undefined
                }
                hidden={hidden}
                style={[
                  styles.stackCard,
                  cardIndex > 0 && { marginTop: margins[cardIndex] },
                ]}
              />
            );
          })}
        </View>
      );
    });

    // Landscape: tableau fills the left at full height; Stock/Waste/F1-F4 live
    // in a right rail beneath the stats + menu.
    if (isLandscape) {
      return (
        <View
          style={[styles.boardCard, styles.boardCardFill, styles.boardCardRow]}
        >
          <View
            style={[styles.tableauRow, styles.tableauRowFill]}
            onLayout={(e) => {
              const w = Math.round(e.nativeEvent.layout.width);
              const h = Math.round(e.nativeEvent.layout.height);
              setTableauBoxW((prev) => (Math.abs(prev - w) > 1 ? w : prev));
              setTableauBoxH((prev) => (Math.abs(prev - h) > 1 ? h : prev));
            }}
          >
            {columns}
          </View>

          <View style={styles.rightRail}>
            <View style={styles.landscapeHeaderRight}>
              <StatsStrip gameId="solitaire" items={statsItems} bare />
              <GameMenuButton menuItems={menuItems} />
            </View>
            <View style={styles.railSlotRow}>
              {stockSlot}
              {wasteSlot}
            </View>
            <View style={[styles.railSlotRow, styles.railFoundationsTop]}>
              {foundationSlots[0]}
              {foundationSlots[1]}
            </View>
            <View style={styles.railSlotRow}>
              {foundationSlots[2]}
              {foundationSlots[3]}
            </View>
          </View>
        </View>
      );
    }

    // Portrait: slots in a top row above the tableau.
    return (
      <View style={styles.boardCard}>
        <View style={[styles.topRow, styles.klondikeTopRow]}>
          {stockSlot}
          {wasteSlot}
          {foundationSlots}
        </View>
        <View style={styles.tableauRow}>{columns}</View>
      </View>
    );
  };

  const renderSpider = () => {
    const ghosts = spiderFlyAwayCards.map((ghost) => {
      const anim = spiderFlyAwayAnimValuesRef.current.get(ghost.cardId);
      if (!anim) return null;

      return (
        <Animated.View
          key={ghost.cardId}
          pointerEvents="none"
          accessibilityElementsHidden={true}
          importantForAccessibility="no-hide-descendants"
          style={{
            position: "absolute",
            left: ghost.x,
            top: ghost.y,
            width: ghost.w,
            height: ghost.h,
            opacity: anim.opacity,
            transform: [{ translateX: anim.translateX }, { translateY: anim.translateY }, { scale: anim.scale }],
            zIndex: 50,
            elevation: 20,
          }}
        >
          <Card
            rank={ghost.card.rankLabel}
            suit={ghost.card.symbol}
            faceDown={!ghost.card.faceUp}
            animateReveal={true}
            small={true}
            sizeScale={isLandscape ? tabCardScale : 1.1}
          />
        </Animated.View>
      );
    });

    const columns = state.tableau.map((pile, pileIndex) => {
      const margins = isLandscape ? tableauColumnMargins(pile) : null;
      const colHighlighted =
        dragEnabled && isLegalTarget({ type: "tableau", index: pileIndex });
      return (
        <View
          key={`spider-${pileIndex}`}
          ref={
            dragEnabled
              ? registerZone(`t-${pileIndex}`, {
                  type: "tableau",
                  index: pileIndex,
                })
              : undefined
          }
          style={[
            styles.tableauColumn,
            colHighlighted && styles.tableauColumnHighlighted,
          ]}
          onLayout={(e) => {
            const layout = e.nativeEvent.layout;
            spiderColumnLayoutsRef.current[pileIndex] = {
              x: layout.x,
              y: layout.y,
              w: layout.width,
              h: layout.height,
            };
          }}
        >
          {pile.length === 0 ? (
            <Pressable
              onPress={() =>
                dispatch(
                  tapAction({
                    type: "tableau",
                    index: pileIndex,
                    cardIndex: 0,
                  }),
                )
              }
              style={({ pressed }) => [
                styles.emptyColumnSlot,
                pressed && styles.cardTouchPressed,
                isLandscape && {
                  width: Math.round(tabCardW * 0.8),
                  height: Math.round(tabCardH * 0.8),
                  minWidth: Math.round(tabCardW * 0.8),
                  minHeight: Math.round(tabCardH * 0.8),
                },
              ]}
            >
              <Text style={styles.emptyColumnText}>Open</Text>
            </Pressable>
          ) : (
            <View
              style={[
                styles.tableauTopSpacer,
                isLandscape && styles.tableauTopSpacerLandscape,
              ]}
            />
          )}

          {pile.map((card, cardIndex) => {
            const selected = isSpiderSelection(
              state.selected,
              pileIndex,
              cardIndex,
            );
            const source = { type: "tableau", index: pileIndex, cardIndex };
            const hidden =
              dragEnabled &&
              draggingSource?.type === "tableau" &&
              draggingSource.index === pileIndex &&
              cardIndex >= draggingSource.cardIndex;

            return (
              <CardSlot
                key={card.id}
                card={card}
                label=""
                animateReveal={true}
                sizeScale={isLandscape ? tabCardScale : undefined}
                onPress={() => dispatch(tapAction(source))}
                selected={selected}
                disabled={!card.faceUp}
                dragGesture={
                  dragEnabled && card.faceUp
                    ? makeDragGesture(source)
                    : undefined
                }
                hidden={hidden}
                onCardLayout={(e) => {
                  const layout = e.nativeEvent.layout;
                  spiderCardLayoutsRef.current[card.id] = {
                    x: layout.x,
                    y: layout.y,
                    w: layout.width,
                    h: layout.height,
                    pileIndex,
                    cardIndex,
                  };
                }}
                style={[
                  styles.stackCard,
                  isLandscape
                    ? cardIndex > 0 && { marginTop: margins[cardIndex] }
                    : cardIndex > 0 && styles.stackCardOverlapSpider,
                ]}
              />
            );
          })}
        </View>
      );
    });

    // Landscape: 10 columns fill the left (no overflow clip so the run fly-away
    // isn't cut off); a compact right rail holds the deal pile + runs count.
    if (isLandscape) {
      return (
        <View
          style={[styles.boardCard, styles.boardCardFill, styles.boardCardRow]}
        >
          <View
            ref={spiderTableauRowRef}
            collapsable={false}
            style={[
              styles.tableauRowSpiderLandscape,
              // Lift the row (and its fly-away ghosts) above the right rail so a
              // completed run is visible as it flies into the Runs counter
              // instead of disappearing under the rail.
              { zIndex: 5, elevation: 5 },
            ]}
            onLayout={(e) => {
              const w = Math.round(e.nativeEvent.layout.width);
              const h = Math.round(e.nativeEvent.layout.height);
              setTableauBoxW((prev) => (Math.abs(prev - w) > 1 ? w : prev));
              setTableauBoxH((prev) => (Math.abs(prev - h) > 1 ? h : prev));
            }}
          >
            {columns}
            {ghosts}
          </View>

          <View style={[styles.rightRail, { zIndex: 1 }]}>
            <View style={styles.landscapeHeaderRight}>
              <StatsStrip gameId="solitaire" items={statsItems} bare />
              <GameMenuButton menuItems={menuItems} />
            </View>
            <View style={styles.railSlotRow}>
              <StockSlot
                label={
                  state.stock.length > 0
                    ? `Deal ${state.stock.length}`
                    : "No deal"
                }
                onPress={() => dispatch(tapAction({ type: "stock" }))}
                style={{ width: slotW, height: slotH }}
              />
            </View>
            <View style={[styles.railSlotRow, styles.railFoundationsTop]}>
              <View
                ref={spiderRunsPillRef}
                collapsable={false}
                style={styles.metaPill}
              >
                <Text style={styles.metaPillLabel}>Runs</Text>
                <Text style={styles.metaPillValue}>
                  {state.completedRuns || 0}/8
                </Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    // Portrait: deal + runs row, then the horizontal-scroll tableau.
    return (
      <View style={styles.boardCard}>
        <View style={styles.topRow}>
          <StockSlot
            label={
              state.stock.length > 0 ? `Deal ${state.stock.length}` : "No deal"
            }
            onPress={() => dispatch(tapAction({ type: "stock" }))}
          />

          <View style={styles.metaPill}>
            <Text style={styles.metaPillLabel}>Runs</Text>
            <Text style={styles.metaPillValue}>
              {state.completedRuns || 0}/8
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.spiderScrollContent}
        >
          <View
            style={[
              styles.tableauRow,
              styles.spiderTableauRow,
              { width: spiderBoardWidth, position: "relative" },
            ]}
          >
            {ghosts}
            {columns}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderFreeCell = () => {
    const railSlotStyle = {
      width: slotW,
      height: slotH,
      minWidth: slotW,
      minHeight: slotH,
    };

    const freeCellSlots = state.freecells.map((card, index) => {
      const selected =
        state.selected?.type === "freecell" && state.selected.index === index;
      const source = { type: "freecell", index };
      const cardSlot = (
        <CardSlot
          card={card}
          label={`Free ${index + 1}`}
          sizeScale={isLandscape ? slotScale : undefined}
          onPress={() => dispatch(tapAction({ type: "freecell", index }))}
          selected={selected}
          dragGesture={
            dragEnabled && card ? makeDragGesture(source) : undefined
          }
          highlighted={dragEnabled && isLegalTarget(source)}
          hidden={
            dragEnabled &&
            draggingSource?.type === "freecell" &&
            draggingSource.index === index
          }
          style={isLandscape ? railSlotStyle : styles.slotCard}
        />
      );
      // A free cell is both a drag source and a drop zone. Wrap it so the zone
      // ref lives on a View (the gesture owns the CardSlot) — no ref conflict.
      if (dragEnabled) {
        return (
          <View
            key={`freecell-${index}`}
            ref={registerZone(`fc-${index}`, source)}
            collapsable={false}
          >
            {cardSlot}
          </View>
        );
      }
      return React.cloneElement(cardSlot, { key: `freecell-${index}` });
    });

    const foundationSlots = state.foundations.map((foundation, index) => {
      const top = getTopCard(foundation);
      const selected =
        state.selected?.type === "foundation" && state.selected.index === index;
      return (
        <CardSlot
          key={`freecell-foundation-${index}`}
          card={top}
          label={`F${index + 1}`}
          sizeScale={isLandscape ? slotScale : undefined}
          onPress={() => dispatch(tapAction({ type: "foundation", index }))}
          selected={selected}
          containerRef={
            dragEnabled
              ? registerZone(`f-${index}`, { type: "foundation", index })
              : undefined
          }
          highlighted={
            dragEnabled && isLegalTarget({ type: "foundation", index })
          }
          style={isLandscape ? railSlotStyle : styles.slotCard}
        />
      );
    });

    const columns = state.tableau.map((pile, pileIndex) => {
      const margins = isLandscape ? tableauColumnMargins(pile) : null;
      const colHighlighted =
        dragEnabled && isLegalTarget({ type: "tableau", index: pileIndex });
      return (
        <View
          key={`freecell-${pileIndex}`}
          ref={
            dragEnabled
              ? registerZone(`t-${pileIndex}`, {
                  type: "tableau",
                  index: pileIndex,
                })
              : undefined
          }
          style={[
            styles.tableauColumn,
            colHighlighted && styles.tableauColumnHighlighted,
          ]}
        >
          {pile.length === 0 ? (
            <>
              <View
                style={[
                  styles.tableauTopSpacer,
                  isLandscape && styles.tableauTopSpacerLandscape,
                ]}
              />
              <Pressable
                onPress={() =>
                  dispatch(tapAction({ type: "tableau", index: pileIndex }))
                }
                style={({ pressed }) => [
                  styles.emptyColumnSlot,
                  pressed && styles.cardTouchPressed,
                  isLandscape && {
                    width: Math.round(tabCardW * 0.8),
                    height: Math.round(tabCardH * 0.8),
                    minWidth: Math.round(tabCardW * 0.8),
                    minHeight: Math.round(tabCardH * 0.8),
                  },
                ]}
              >
                <Text style={styles.emptyColumnText}>Empty</Text>
              </Pressable>
            </>
          ) : (
            <View
              style={[
                styles.tableauTopSpacer,
                isLandscape && styles.tableauTopSpacerLandscape,
              ]}
            />
          )}

          {pile.map((card, cardIndex) => {
            const selected = isTableauSelection(
              state.selected,
              pileIndex,
              cardIndex,
            );
            const source = { type: "tableau", index: pileIndex, cardIndex };
            const hidden =
              dragEnabled &&
              draggingSource?.type === "tableau" &&
              draggingSource.index === pileIndex &&
              cardIndex >= draggingSource.cardIndex;

            return (
              <CardSlot
                key={card.id}
                card={card}
                label=""
                animateReveal={true}
                sizeScale={isLandscape ? tabCardScale : undefined}
                onPress={() => dispatch(tapAction(source))}
                selected={selected}
                dragGesture={
                  dragEnabled && card.faceUp
                    ? makeDragGesture(source)
                    : undefined
                }
                hidden={hidden}
                style={[
                  styles.stackCard,
                  isLandscape
                    ? cardIndex > 0 && { marginTop: margins[cardIndex] }
                    : cardIndex > 0 && styles.stackCardOverlap,
                ]}
              />
            );
          })}
        </View>
      );
    });

    // Landscape: tableau fills the left; free cells + foundations in a right rail
    // (each as a 2x2 grid) beneath the stats + menu.
    if (isLandscape) {
      return (
        <View
          style={[styles.boardCard, styles.boardCardFill, styles.boardCardRow]}
        >
          <View
            style={[styles.tableauRow, styles.tableauRowFill]}
            onLayout={(e) => {
              const w = Math.round(e.nativeEvent.layout.width);
              const h = Math.round(e.nativeEvent.layout.height);
              setTableauBoxW((prev) => (Math.abs(prev - w) > 1 ? w : prev));
              setTableauBoxH((prev) => (Math.abs(prev - h) > 1 ? h : prev));
            }}
          >
            {columns}
          </View>

          <View style={styles.rightRail}>
            <View style={styles.landscapeHeaderRight}>
              <StatsStrip gameId="solitaire" items={statsItems} bare />
              <GameMenuButton menuItems={menuItems} />
            </View>
            <View style={styles.railSlotRow}>
              {freeCellSlots[0]}
              {freeCellSlots[1]}
            </View>
            <View style={styles.railSlotRow}>
              {freeCellSlots[2]}
              {freeCellSlots[3]}
            </View>
            <View style={[styles.railSlotRow, styles.railFoundationsTop]}>
              {foundationSlots[0]}
              {foundationSlots[1]}
            </View>
            <View style={styles.railSlotRow}>
              {foundationSlots[2]}
              {foundationSlots[3]}
            </View>
          </View>
        </View>
      );
    }

    // Portrait: free cells + foundations row, then the horizontal-scroll tableau.
    return (
      <View style={styles.boardCard}>
        <View style={[styles.topRow, styles.freeCellTopRow]}>
          <View style={[styles.freeCellGroup, styles.freeCellGroupSpaced]}>
            {freeCellSlots}
          </View>
          <View style={styles.foundationRow}>{foundationSlots}</View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.spiderScrollContent}
        >
          <View style={[styles.tableauRow, styles.freeCellTableauRow]}>
            {columns}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderPyramid = () => {
    const wasteTop = getTopCard(state.waste);
    const cleared = state.pyramidRows
      ? state.pyramidRows.reduce(
          (sum, row) =>
            sum + row.reduce((inner, card) => inner + (card ? 0 : 1), 0),
          0,
        )
      : 0;

    // Landscape: scaled + vertically-nested pyramid centered on the left, with
    // stock/waste/cleared + stats/menu in the right rail. No scroll.
    if (isLandscape) {
      const availW = tableauBoxW > 0 ? tableauBoxW : width * 0.66;
      const availH = tableauBoxH > 0 ? tableauBoxH : Math.max(height - 30, 150);
      const rows = state.pyramidRows;
      const nRows = rows.length || 7;
      const HGAP = 4;
      const VFRAC = 0.46; // each row reveals 46% of the row above
      const pcW = Math.max(
        Math.min(
          (availW - (nRows - 1) * HGAP) / nRows,
          availH / (1 + (nRows - 1) * VFRAC) / 1.43,
          96,
        ),
        30,
      );
      const pcH = pcW * 1.43;
      const pcScale = pcW / (42 * cardClamp);
      const rowMargin = -Math.round(pcH * (1 - VFRAC));

      return (
        <View
          style={[styles.boardCard, styles.boardCardFill, styles.boardCardRow]}
        >
          <View
            style={styles.shapeArea}
            onLayout={(e) => {
              const w = Math.round(e.nativeEvent.layout.width);
              const h = Math.round(e.nativeEvent.layout.height);
              setTableauBoxW((prev) => (Math.abs(prev - w) > 1 ? w : prev));
              setTableauBoxH((prev) => (Math.abs(prev - h) > 1 ? h : prev));
            }}
          >
            <View style={styles.shapeCenter}>
              {rows.map((row, rowIndex) => (
                <View
                  key={`pyr-${rowIndex}`}
                  style={[
                    styles.shapeRow,
                    { gap: HGAP, marginTop: rowIndex === 0 ? 0 : rowMargin },
                  ]}
                >
                  {row.map((card, colIndex) => {
                    if (!card) {
                      return (
                        <View
                          key={`pyr-sp-${rowIndex}-${colIndex}`}
                          style={{ width: pcW, height: pcH }}
                        />
                      );
                    }
                    const selected = isPyramidSelection(
                      state.selected,
                      rowIndex,
                      colIndex,
                    );
                    return (
                      <CardSlot
                        key={card.id}
                        card={card}
                        label=""
                        animateReveal={true}
                        sizeScale={pcScale}
                        onPress={() =>
                          dispatch(
                            tapAction({
                              type: "pyramid",
                              row: rowIndex,
                              col: colIndex,
                            }),
                          )
                        }
                        selected={selected}
                        disabled={!card.faceUp}
                        style={{
                          width: pcW,
                          height: pcH,
                          minWidth: pcW,
                          minHeight: pcH,
                        }}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.rightRail}>
            <View style={styles.landscapeHeaderRight}>
              <StatsStrip gameId="solitaire" items={statsItems} bare />
              <GameMenuButton menuItems={menuItems} />
            </View>
            <View style={styles.railSlotRow}>
              <StockSlot
                label={
                  state.stock.length > 0 ? `Stock ${state.stock.length}` : "↻"
                }
                onPress={() => dispatch(tapAction({ type: "stock" }))}
                style={{ width: slotW, height: slotH }}
              />
              <CardSlot
                card={wasteTop}
                label="Waste"
                sizeScale={slotScale}
                onPress={() => dispatch(tapAction({ type: "waste" }))}
                selected={sameTarget(state.selected, { type: "waste" })}
                style={{
                  width: slotW,
                  height: slotH,
                  minWidth: slotW,
                  minHeight: slotH,
                }}
              />
            </View>
            <View style={[styles.railSlotRow, styles.railFoundationsTop]}>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillLabel}>Cleared</Text>
                <Text style={styles.metaPillValue}>{cleared}/28</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    // Portrait: existing pyramid (top row + horizontal-scroll board).
    return (
      <View style={styles.boardCard}>
        <View style={styles.topRow}>
          <StockSlot
            label={state.stock.length > 0 ? `Stock ${state.stock.length}` : "↻"}
            onPress={() => dispatch(tapAction({ type: "stock" }))}
          />

          <CardSlot
            card={wasteTop}
            label="Waste"
            onPress={() => dispatch(tapAction({ type: "waste" }))}
            selected={sameTarget(state.selected, { type: "waste" })}
            style={styles.slotCard}
          />

          <View style={styles.metaPill}>
            <Text style={styles.metaPillLabel}>Cleared</Text>
            <Text style={styles.metaPillValue}>{cleared}/28</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.spiderScrollContent}
        >
          <View style={styles.pyramidBoard}>
            {state.pyramidRows.map((row, rowIndex) => (
              <View
                key={`pyramid-row-${rowIndex}`}
                style={[styles.pyramidRow, { marginLeft: rowIndex * 18 }]}
              >
                {row.map((card, colIndex) => {
                  if (!card) {
                    return (
                      <View
                        key={`pyramid-empty-${rowIndex}-${colIndex}`}
                        style={styles.pyramidSpacer}
                      />
                    );
                  }

                  const selected = isPyramidSelection(
                    state.selected,
                    rowIndex,
                    colIndex,
                  );

                  return (
                    <CardSlot
                      key={card.id}
                      card={card}
                      label=""
                      animateReveal={true}
                      onPress={() =>
                        dispatch(
                          tapAction({
                            type: "pyramid",
                            row: rowIndex,
                            col: colIndex,
                          }),
                        )
                      }
                      selected={selected}
                      disabled={!card.faceUp}
                      style={styles.slotCard}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderTriPeaks = () => {
    const wasteTop = getTopCard(state.waste);
    const cleared = state.boardRows
      ? state.boardRows.reduce(
          (sum, row) =>
            sum + row.reduce((inner, card) => inner + (card ? 0 : 1), 0),
          0,
        )
      : 0;

    // Landscape: scaled + nested peaks centered on the left, with
    // stock/waste/cleared + stats/menu in the right rail. No scroll.
    if (isLandscape) {
      const availW = tableauBoxW > 0 ? tableauBoxW : width * 0.66;
      const availH = tableauBoxH > 0 ? tableauBoxH : Math.max(height - 30, 150);
      const rows = state.boardRows;
      const nRows = rows.length || 4;
      const maxLen = Math.max(...rows.map((r) => r.length), 1);
      const HGAP = 3;
      const VFRAC = 0.5; // each row reveals 50% of the row above
      const ML_FRAC = 0.17; // per-row right offset, as a fraction of card width
      const pcW = Math.max(
        Math.min(
          (availW - (maxLen - 1) * HGAP) / (maxLen + (nRows - 1) * ML_FRAC),
          availH / (1 + (nRows - 1) * VFRAC) / 1.43,
          96,
        ),
        28,
      );
      const pcH = pcW * 1.43;
      const pcScale = pcW / (42 * cardClamp);
      const rowMargin = -Math.round(pcH * (1 - VFRAC));
      const mlUnit = pcW * ML_FRAC;

      return (
        <View
          style={[styles.boardCard, styles.boardCardFill, styles.boardCardRow]}
        >
          <View
            style={styles.shapeArea}
            onLayout={(e) => {
              const w = Math.round(e.nativeEvent.layout.width);
              const h = Math.round(e.nativeEvent.layout.height);
              setTableauBoxW((prev) => (Math.abs(prev - w) > 1 ? w : prev));
              setTableauBoxH((prev) => (Math.abs(prev - h) > 1 ? h : prev));
            }}
          >
            <View style={styles.shapeCenter}>
              {rows.map((row, rowIndex) => (
                <View
                  key={`tp-${rowIndex}`}
                  style={[
                    styles.shapeRow,
                    {
                      gap: HGAP,
                      marginTop: rowIndex === 0 ? 0 : rowMargin,
                      marginLeft: rowIndex * mlUnit,
                    },
                  ]}
                >
                  {row.map((card, colIndex) => {
                    if (!card) {
                      return (
                        <View
                          key={`tp-sp-${rowIndex}-${colIndex}`}
                          style={{ width: pcW, height: pcH }}
                        />
                      );
                    }
                    const selected = isTriPeaksSelection(
                      state.selected,
                      rowIndex,
                      colIndex,
                    );
                    return (
                      <CardSlot
                        key={card.id}
                        card={card}
                        label=""
                        animateReveal={true}
                        sizeScale={pcScale}
                        onPress={() =>
                          dispatch(
                            tapAction({
                              type: "tripeaks",
                              row: rowIndex,
                              col: colIndex,
                            }),
                          )
                        }
                        selected={selected}
                        disabled={!card.faceUp}
                        style={{
                          width: pcW,
                          height: pcH,
                          minWidth: pcW,
                          minHeight: pcH,
                        }}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.rightRail}>
            <View style={styles.landscapeHeaderRight}>
              <StatsStrip gameId="solitaire" items={statsItems} bare />
              <GameMenuButton menuItems={menuItems} />
            </View>
            <View style={styles.railSlotRow}>
              <StockSlot
                label={
                  state.stock.length > 0 ? `Stock ${state.stock.length}` : "↻"
                }
                onPress={() => dispatch(tapAction({ type: "stock" }))}
                style={{ width: slotW, height: slotH }}
              />
              <CardSlot
                card={wasteTop}
                label="Waste"
                sizeScale={slotScale}
                onPress={() => dispatch(tapAction({ type: "waste" }))}
                selected={sameTarget(state.selected, { type: "waste" })}
                style={{
                  width: slotW,
                  height: slotH,
                  minWidth: slotW,
                  minHeight: slotH,
                }}
              />
            </View>
            <View style={[styles.railSlotRow, styles.railFoundationsTop]}>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillLabel}>Cleared</Text>
                <Text style={styles.metaPillValue}>{cleared}/28</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    // Portrait: existing tri-peaks (top row + horizontal-scroll board).
    return (
      <View style={styles.boardCard}>
        <View style={styles.topRow}>
          <StockSlot
            label={state.stock.length > 0 ? `Stock ${state.stock.length}` : "↻"}
            onPress={() => dispatch(tapAction({ type: "stock" }))}
          />

          <CardSlot
            card={wasteTop}
            label="Waste"
            onPress={() => dispatch(tapAction({ type: "waste" }))}
            selected={sameTarget(state.selected, { type: "waste" })}
            style={styles.slotCard}
          />

          <View style={styles.metaPill}>
            <Text style={styles.metaPillLabel}>Cleared</Text>
            <Text style={styles.metaPillValue}>{cleared}/28</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.spiderScrollContent}
        >
          <View style={styles.triPeaksBoard}>
            {state.boardRows.map((row, rowIndex) => (
              <View
                key={`tripeaks-row-${rowIndex}`}
                style={[styles.triPeaksRow, { marginLeft: rowIndex * 12 }]}
              >
                {row.map((card, colIndex) => {
                  if (!card) {
                    return (
                      <View
                        key={`tripeaks-empty-${rowIndex}-${colIndex}`}
                        style={styles.triPeaksSpacer}
                      />
                    );
                  }

                  const selected = isTriPeaksSelection(
                    state.selected,
                    rowIndex,
                    colIndex,
                  );

                  return (
                    <CardSlot
                      key={card.id}
                      card={card}
                      label=""
                      animateReveal={true}
                      onPress={() =>
                        dispatch(
                          tapAction({
                            type: "tripeaks",
                            row: rowIndex,
                            col: colIndex,
                          }),
                        )
                      }
                      selected={selected}
                      disabled={!card.faceUp}
                      style={styles.slotCard}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  // Column-based variants with a dedicated landscape rail layout.
  const railLandscape =
    isLandscape &&
    ["klondike", "freecell", "spider", "pyramid", "tripeaks"].includes(
      state.variantId,
    );

  const endOfRoundModal = (
    <EndOfRoundModal
      visible={showRoundModal}
      title="🏆 You Won!"
      message={coinsEarned > 0 ? `+${coinsEarned} coins!` : ""}
      showContinue
      showLeave
      isGameOver
      onContinue={() => {
        setShowRoundModal(false);
        restart();
      }}
      onLeave={() => {
        clearGame(solitaireSaveKey(state.variantId || routeVariantId));
        navigation.navigate("Home");
      }}
      tableColor={BG}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* The landscape rail layout puts the stats + menu in the rail, so the
          header bar is dropped there. Every other case keeps the header. */}
      {!railLandscape && (
        <GameHeader
          gameId="solitaire"
          title={variant.label}
          leftInfo={<StatsStrip gameId="solitaire" items={statsItems} bare />}
          menuItems={menuItems}
        />
      )}

      {railLandscape ? (
        // No ScrollView: a flex:1 container that fills the screen so the board
        // physically can't scroll. The tableau measures itself and fits.
        <View style={styles.fillContainer}>
          {endOfRoundModal}
          {state.variantId === "klondike" ? renderKlondike() : null}
          {state.variantId === "freecell" ? renderFreeCell() : null}
          {state.variantId === "spider" ? renderSpider() : null}
          {state.variantId === "pyramid" ? renderPyramid() : null}
          {state.variantId === "tripeaks" ? renderTriPeaks() : null}
          {/* Floating drag layer — sits above the board, outside the tableau's
              overflow:hidden so a lifted run is never clipped. */}
          {dragEnabled ? dragOverlay : null}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            isLandscape && styles.contentLandscape,
          ]}
        >
          {endOfRoundModal}
          {state.variantId === "klondike" ? renderKlondike() : null}
          {state.variantId === "spider" ? renderSpider() : null}
          {state.variantId === "freecell" ? renderFreeCell() : null}
          {state.variantId === "pyramid" ? renderPyramid() : null}
          {state.variantId === "tripeaks" ? renderTriPeaks() : null}
        </ScrollView>
      )}

      {/* Win celebration — rains over the board + win modal, once per win. */}
      <Confetti active={state.status === "won"} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    padding: 14,
    gap: 14,
  },
  contentLandscape: {
    padding: 8,
    gap: 8,
  },
  fillContainer: {
    flex: 1,
    padding: 8,
  },
  boardCardFill: {
    flex: 1,
  },
  boardCardRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "stretch", // tableau + rail fill the full board height
  },
  tableauRowFill: {
    flex: 1,
    gap: 4, // condensed column spacing in landscape (matches KGAP)
    overflow: "hidden",
  },
  // Spider landscape: same fill, but NO overflow clip and position:relative so
  // the run-complete fly-away cards (absolute children) aren't cut off.
  tableauRowSpiderLandscape: {
    flex: 1,
    flexDirection: "row",
    gap: 4,
    alignItems: "flex-start",
    position: "relative",
  },
  rightRail: {
    gap: 8,
    alignItems: "stretch",
    backgroundColor: "#1b2433", // a touch lighter than the board (#141a24)
    borderWidth: 1,
    borderColor: "#2a3650",
    borderRadius: 14,
    padding: 8,
  },
  railSlotRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  railFoundationsTop: {
    marginTop: 6, // small gap between the Stock/Waste row and the foundations
  },
  statsBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: scale(8),
    paddingHorizontal: scale(4),
    paddingTop: scale(4),
    paddingBottom: scale(8),
  },

  spiderScrollContent: {
    paddingBottom: 2,
  },
  spiderTableauRow: {
    minWidth: 500,
    justifyContent: "flex-start",
    gap: 0,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#263146",
    backgroundColor: "#101521",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaPillLabel: {
    color: "#8799b8",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metaPillValue: {
    color: "#eff4fb",
    fontSize: 12,
    fontWeight: "900",
  },
  boardCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#233047",
    backgroundColor: "#141a24",
    padding: 12,
    gap: 14,
  },
  topRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  klondikeTopRow: {
    gap: 4,
    flexWrap: "nowrap",
    justifyContent: "space-between",
  },
  landscapeHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
    flexWrap: "wrap",
  },
  stockSlot: {
    width: 70,
    height: 98,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a3650",
    backgroundColor: "#0f1520",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  stockLabel: {
    color: "#d9e3f3",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  slotCard: {
    minWidth: 70,
    minHeight: 98,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTouch: {
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
    borderWidth: 1,
    borderColor: "transparent",
  },
  // Tap-to-select cue: enlarge the selected card/stack ~1.25x (matches the drag
  // lift) instead of a colored highlight. zIndex/elevation lift it above its
  // neighbours so the grown card isn't tucked under the next one.
  cardTouchSelected: {
    transform: [{ scale: 1.25 }],
    zIndex: 10,
    elevation: 6,
  },
  cardTouchPressed: {
    opacity: 0.92,
  },
  cardTouchDisabled: {
    opacity: 0.96,
  },
  // Drag-and-drop: a legal drop target (foundation slot) glows green. Keeps the
  // base borderWidth (1) and only recolors, so highlighting can't shift layout.
  cardTouchHighlighted: {
    borderColor: "#7CFFB2",
    backgroundColor: "rgba(124, 255, 178, 0.16)",
  },
  // A card that's currently lifted in the drag overlay is hidden in place.
  cardTouchHidden: {
    opacity: 0,
  },
  emptyCard: {
    width: 70,
    height: 98,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#34425f",
    backgroundColor: "#101521",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  emptyCardText: {
    color: "#7f8ea8",
    fontSize: 8,
    textAlign: "center",
    fontWeight: "800",
  },
  foundationRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  freeCellTopRow: {
    justifyContent: "flex-start",
  },
  freeCellGroup: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  freeCellGroupSpaced: {
    gap: 12,
  },
  freeCellTableauRow: {
    gap: 12,
  },
  tableauRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  tableauColumn: {
    flex: 1,
    minWidth: 34,
    alignItems: "center",
  },
  // Drag-and-drop: a column that's a legal drop target glows green. Background
  // tint only (no border) so it can't reflow the columns mid-drag.
  tableauColumnHighlighted: {
    borderRadius: 10,
    backgroundColor: "rgba(124, 255, 178, 0.12)",
  },
  tableauTopSpacer: {
    height: 16,
  },
  tableauTopSpacerLandscape: {
    height: 2, // move the columns up toward the top in landscape
  },
  emptyColumnSlot: {
    width: 70,
    height: 98,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#34425f",
    backgroundColor: "#101521",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  emptyColumnText: {
    opacity: 0,
    fontSize: 1,
    fontWeight: "800",
  },
  stackCard: {
    marginTop: 0,
  },
  stackCardOverlap: {
    marginTop: -44,
  },
  stackCardOverlapSpider: {
    marginTop: -38,
  },
  // Landscape spatial shapes (Pyramid / TriPeaks): centered, scaled, nested.
  shapeArea: {
    flex: 1,
    overflow: "hidden",
  },
  shapeCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  shapeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  pyramidBoard: {
    paddingTop: 4,
  },
  pyramidRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 4,
  },
  pyramidSpacer: {
    width: 70,
    height: 98,
  },
  triPeaksBoard: {
    paddingTop: 4,
  },
  triPeaksRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    marginTop: 4,
  },
  triPeaksSpacer: {
    width: 70,
    height: 98,
  },
});
