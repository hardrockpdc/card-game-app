import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View } from "react-native";
import { Gesture } from "react-native-gesture-handler";

import Card from "./Card";
import { getTopCard, getLegalTargets, moveAction } from "../game/solitaire";

// Where on the picked-up card the finger "holds" it: dead center of the grabbed
// card on both axes, so the stylus/finger sits in the middle of the card.
const GRAB_X = 0.5;
const GRAB_Y = 0.5;
const LIFT_SCALE = 1.25; // enlarge on pick-up so the run reads as "lifted"

function targetsEqual(a, b) {
  return a && b && a.type === b.type && a.index === b.index;
}

function sourceKey(source) {
  return `${source.type}:${source.index ?? ""}:${source.cardIndex ?? ""}`;
}

// Resolve the cards that move with a given source (the run being dragged).
function runFromSource(state, source) {
  if (!source) return [];
  if (source.type === "tableau") {
    const pile = state.tableau?.[source.index] || [];
    return pile.slice(source.cardIndex);
  }
  if (source.type === "waste") {
    const top = getTopCard(state.waste);
    return top ? [top] : [];
  }
  if (source.type === "foundation") {
    const top = getTopCard(state.foundations?.[source.index]);
    return top ? [top] : [];
  }
  if (source.type === "freecell") {
    const card = state.freecells?.[source.index];
    return card ? [card] : [];
  }
  return [];
}

/**
 * Drag-and-drop machinery for Solitaire (Klondike landscape pilot). Isolated
 * here so the game screen stays readable.
 *
 * Returns:
 *  - makeDragGesture(source): a gesture-handler Pan to attach to a draggable card
 *  - registerZone(key, target): a ref callback to attach to each drop zone
 *  - isLegalTarget(target): whether to highlight a column/foundation right now
 *  - draggingSource: the source currently being dragged (or null)
 *  - dragOverlay: the floating element to render once at the screen root
 */
export default function useSolitaireDrag(state, dispatch, sizing) {
  const { cardW, cardH, cardScale, faceUpPeek } = sizing;

  // Keep the latest values visible to gesture callbacks, which are created once
  // (cached) and must not capture stale closures.
  const stateRef = useRef(state);
  stateRef.current = state;
  const sizingRef = useRef(sizing);
  sizingRef.current = sizing;
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const [drag, setDrag] = useState(null); // { source, run, legalTargets }
  const draggingRef = useRef(false); // synchronous "is a drag live" flag

  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lift = useRef(new Animated.Value(1)).current;

  // Drop zones: stable ref callbacks + their target descriptors + measured rects.
  const zoneNodes = useRef(new Map()); // key -> host node
  const zoneTargets = useRef(new Map()); // key -> target descriptor
  const refCbs = useRef(new Map()); // key -> stable ref callback
  const rectsRef = useRef(new Map()); // key -> { x, y, w, h, target }
  const rootRef = useRef({ x: 0, y: 0 }); // overlay layer window origin
  const overlayNode = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });

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

  const registerZone = useCallback((key, target) => {
    zoneTargets.current.set(key, target);
    if (!refCbs.current.has(key)) {
      refCbs.current.set(key, (node) => {
        if (node) zoneNodes.current.set(key, node);
        else zoneNodes.current.delete(key);
      });
    }
    return refCbs.current.get(key);
  }, []);

  // NB: use measure() (pageX/pageY) rather than measureInWindow(). pageX/pageY
  // are relative to the app root — the SAME coordinate space as gesture-handler's
  // absoluteX/absoluteY. measureInWindow is window-space, which in landscape is
  // offset from the gesture space by the cutout/nav inset, so the overlay landed
  // sideways. Using the matching space makes the inset cancel out.
  const measureZones = useCallback(() => {
    if (overlayNode.current?.measure) {
      overlayNode.current.measure((x, y, w, h, pageX, pageY) => {
        rootRef.current = { x: pageX, y: pageY };
      });
    }
    rectsRef.current = new Map();
    zoneNodes.current.forEach((node, key) => {
      if (!node?.measure) return;
      node.measure((x, y, w, h, pageX, pageY) => {
        rectsRef.current.set(key, {
          x: pageX,
          y: pageY,
          w,
          h,
          target: zoneTargets.current.get(key),
        });
      });
    });
  }, []);

  const overlayPos = useCallback((absX, absY) => {
    const s = sizingRef.current;
    return {
      x: absX - rootRef.current.x - s.cardW * GRAB_X,
      y: absY - rootRef.current.y - s.cardH * GRAB_Y,
    };
  }, []);

  const clearDrag = useCallback(() => {
    draggingRef.current = false;
    lift.setValue(1);
    setDrag(null);
  }, [lift]);

  const begin = useCallback(
    (source, absX, absY) => {
      const cur = stateRef.current;
      const run = runFromSource(cur, source);
      if (run.length === 0) return;
      // Any face-up card/stack can be picked up, even with no legal target — it
      // just lifts and springs back on release. legalTargets (possibly empty)
      // only drives the highlights + which drop actually connects.
      const legalTargets = getLegalTargets(cur, source);

      measureZones();
      const p = overlayPos(absX, absY);
      startPosRef.current = p;
      pan.setValue(p);
      if (reduceMotionRef.current) {
        lift.setValue(LIFT_SCALE);
      } else {
        Animated.spring(lift, {
          toValue: LIFT_SCALE,
          useNativeDriver: false,
          friction: 6,
          tension: 120,
        }).start();
      }
      draggingRef.current = true;
      setDrag({ source, run, legalTargets });
    },
    [lift, measureZones, overlayPos, pan],
  );

  const update = useCallback(
    (absX, absY) => {
      pan.setValue(overlayPos(absX, absY));
    },
    [overlayPos, pan],
  );

  const end = useCallback(
    (source, absX, absY) => {
      // Find a legal zone under the release point.
      const legal = getLegalTargets(stateRef.current, source);
      let hit = null;
      rectsRef.current.forEach((r) => {
        if (
          absX >= r.x &&
          absX <= r.x + r.w &&
          absY >= r.y &&
          absY <= r.y + r.h &&
          legal.some((t) => targetsEqual(t, r.target))
        ) {
          hit = r.target;
        }
      });

      if (hit) {
        dispatchRef.current(moveAction(source, hit));
        clearDrag();
        return;
      }

      // Invalid drop — spring the run back to where it was grabbed, then clear.
      if (reduceMotionRef.current) {
        clearDrag();
        return;
      }
      Animated.parallel([
        Animated.spring(pan, {
          toValue: startPosRef.current,
          useNativeDriver: false,
          friction: 7,
          tension: 90,
        }),
        Animated.timing(lift, {
          toValue: 1,
          duration: 140,
          useNativeDriver: false,
        }),
      ]).start(() => clearDrag());
    },
    [clearDrag, lift, pan],
  );

  // Cache one stable Pan gesture per source. Stable identity matters: the drag
  // start triggers a re-render, and if GestureDetector received a *new* gesture
  // object mid-interaction it could cancel the live drag. The callbacks read
  // refs, so a cached gesture never goes stale.
  const gestureCache = useRef(new Map());
  const makeDragGesture = useCallback(
    (source) => {
      const key = sourceKey(source);
      const existing = gestureCache.current.get(key);
      if (existing) return existing;
      const g = Gesture.Pan()
        // A little movement is needed to activate, so a plain tap still reaches
        // the underlying Pressable (tap-to-move stays as a fallback).
        .activeOffsetX([-8, 8])
        .activeOffsetY([-8, 8])
        // No reanimated — run callbacks on the JS thread so they can call
        // setState / dispatch / Animated.setValue directly.
        .runOnJS(true)
        .onStart((e) => begin(source, e.absoluteX, e.absoluteY))
        .onUpdate((e) => {
          if (draggingRef.current) update(e.absoluteX, e.absoluteY);
        })
        .onEnd((e) => {
          if (draggingRef.current) end(source, e.absoluteX, e.absoluteY);
        })
        .onFinalize(() => {
          // Safety net: if the gesture is cancelled mid-drag (e.g. another
          // gesture wins), don't strand the overlay on screen.
          if (draggingRef.current) clearDrag();
        });
      gestureCache.current.set(key, g);
      return g;
    },
    [begin, update, end, clearDrag],
  );

  const isLegalTarget = useCallback(
    (target) => !!drag && drag.legalTargets.some((t) => targetsEqual(t, target)),
    [drag],
  );

  const dragOverlay = (
    <View
      ref={(n) => {
        overlayNode.current = n;
      }}
      // collapsable={false} stops Android from flattening this empty, untouchable
      // layer away — without it measure() can't resolve a native view. Pre-warm on
      // layout so the first drag frame is already positioned (begin() re-measures).
      collapsable={false}
      onLayout={() => {
        overlayNode.current?.measure?.((x, y, w, h, pageX, pageY) => {
          rootRef.current = { x: pageX, y: pageY };
        });
      }}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {drag && (
        <Animated.View
          style={[
            styles.overlay,
            {
              width: cardW,
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { scale: lift },
              ],
            },
          ]}
        >
          {drag.run.map((card, i) => (
            <View
              key={card.id}
              style={[
                styles.overlayCard,
                // Pin each card to the exact tableau-card box so the grab offset
                // (cardW/2, cardH/2) lands the finger on the card's true center,
                // regardless of the Card's own internal margin.
                { width: cardW, height: cardH },
                i > 0 && { marginTop: faceUpPeek - cardH },
              ]}
            >
              <Card
                rank={card.rankLabel}
                suit={card.symbol}
                faceDown={!card.faceUp}
                small
                sizeScale={cardScale}
              />
            </View>
          ))}
        </Animated.View>
      )}
    </View>
  );

  return {
    makeDragGesture,
    registerZone,
    isLegalTarget,
    draggingSource: drag?.source || null,
    dragOverlay,
  };
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    // Lifted look: a soft shadow under the floating run.
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  overlayCard: {
    alignItems: "center",
    justifyContent: "center",
  },
});
