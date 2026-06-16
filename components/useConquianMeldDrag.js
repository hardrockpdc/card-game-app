import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View } from "react-native";
import { Gesture } from "react-native-gesture-handler";

import Card from "./Card";
import {
  hapticImpact,
  hapticButton,
  hapticError,
  HapticStyle,
} from "../game/haptics";

// Finger holds the card at its center on both axes.
const GRAB_X = 0.5;
const GRAB_Y = 0.5;
const LIFT_SCALE = 1.25; // enlarge on pick-up so the card reads as "lifted"

// Stable key per draggable source (type + card id + group). The gesture for a
// given key is cached; since a Conquián card id always means the same rank/suit,
// caching by id is safe.
function sourceKey(source) {
  return `${source.type}:${source.cardId ?? ""}:${source.groupIdx ?? ""}`;
}

/**
 * Drag-and-drop machinery for the Conquián meld workspace. Mirrors the proven
 * mechanics of `useSolitaireDrag` (gesture cache, measure() pageX/pageY,
 * collapsable overlay layer, lift spring, reduced-motion snap) but instead of
 * dispatching a reducer it calls a `moveCard(source, target)` callback so the
 * screen can mutate its local staging state.
 *
 * Args:
 *  - sizing: { cardW, cardH, cardScale } of the small card being dragged.
 *  - moveCard(source, target): called on a drop onto a registered zone. Return
 *    truthy if it changed something (no snap-back), falsy to snap back.
 *  - reduceMotionRef: optional shared ref; if omitted the hook tracks its own.
 *
 * source = { type:'hand'|'active'|'group', cardId, groupIdx?, card }
 * target = { type:'group'|'newMeld'|'hand', groupIdx? }
 *
 * Returns: { makeDragGesture(source), registerZone(key, target), draggingSource, dragOverlay }
 */
export default function useConquianMeldDrag({
  sizing,
  moveCard,
  reduceMotionRef,
}) {
  const sizingRef = useRef(sizing);
  sizingRef.current = sizing;
  const moveCardRef = useRef(moveCard);
  moveCardRef.current = moveCard;

  const [drag, setDrag] = useState(null); // { source } — source.card is rendered
  const draggingRef = useRef(false);

  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lift = useRef(new Animated.Value(1)).current;

  const zoneNodes = useRef(new Map());
  const zoneTargets = useRef(new Map());
  const refCbs = useRef(new Map());
  const rectsRef = useRef(new Map());
  const rootRef = useRef({ x: 0, y: 0 });
  const overlayNode = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });

  // Use the screen's reduced-motion ref if given; otherwise track our own.
  const localRM = useRef(false);
  const rmRef = reduceMotionRef || localRM;
  useEffect(() => {
    if (reduceMotionRef) return; // screen owns it
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) localRM.current = v;
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => {
      localRM.current = v;
    });
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, [reduceMotionRef]);

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

  // measure() (pageX/pageY) matches gesture-handler's absoluteX/absoluteY space;
  // measureInWindow would be offset by insets. See useSolitaireDrag for the saga.
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
      if (!source?.card) return;
      measureZones();
      const p = overlayPos(absX, absY);
      startPosRef.current = p;
      pan.setValue(p);
      if (rmRef.current) {
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
      setDrag({ source });
      hapticButton(); // soft tick when a card lifts
    },
    [lift, measureZones, overlayPos, pan, rmRef],
  );

  const update = useCallback(
    (absX, absY) => {
      pan.setValue(overlayPos(absX, absY));
    },
    [overlayPos, pan],
  );

  const snapBack = useCallback(() => {
    if (rmRef.current) {
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
  }, [clearDrag, lift, pan, rmRef]);

  const end = useCallback(
    (source, absX, absY) => {
      let hit = null;
      rectsRef.current.forEach((r) => {
        if (
          absX >= r.x &&
          absX <= r.x + r.w &&
          absY >= r.y &&
          absY <= r.y + r.h
        ) {
          hit = r.target;
        }
      });
      // A drop onto a registered zone asks the screen to move the card. If it
      // reports a real change, clear; otherwise spring the card back.
      if (hit && moveCardRef.current?.(source, hit)) {
        hapticImpact(HapticStyle.Light); // tap when a card lands in a zone
        clearDrag();
        return;
      }
      // Dropped onto a zone that rejected the card → a wrong move. (Released in
      // empty space stays silent — that's just putting it back.)
      if (hit) hapticError();
      snapBack();
    },
    [clearDrag, snapBack],
  );

  const gestureCache = useRef(new Map());
  const makeDragGesture = useCallback(
    (source) => {
      const key = sourceKey(source);
      const existing = gestureCache.current.get(key);
      if (existing) return existing;
      const g = Gesture.Pan()
        // Small activation threshold so a plain tap still reaches the underlying
        // Pressable (tap-to-place stays as a fallback).
        .activeOffsetX([-8, 8])
        .activeOffsetY([-8, 8])
        .runOnJS(true)
        .onStart((e) => begin(source, e.absoluteX, e.absoluteY))
        .onUpdate((e) => {
          if (draggingRef.current) update(e.absoluteX, e.absoluteY);
        })
        .onEnd((e) => {
          if (draggingRef.current) end(source, e.absoluteX, e.absoluteY);
        })
        .onFinalize(() => {
          if (draggingRef.current) clearDrag();
        });
      gestureCache.current.set(key, g);
      return g;
    },
    [begin, update, end, clearDrag],
  );

  const dragOverlay = (
    <View
      ref={(n) => {
        overlayNode.current = n;
      }}
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
              width: sizing.cardW,
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { scale: lift },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.overlayCard,
              { width: sizing.cardW, height: sizing.cardH },
            ]}
          >
            <Card
              rank={drag.source.card.rank}
              suit={drag.source.card.suit}
              small
              sizeScale={sizing.cardScale}
            />
          </View>
        </Animated.View>
      )}
    </View>
  );

  return {
    makeDragGesture,
    registerZone,
    draggingSource: drag?.source || null,
    dragOverlay,
  };
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
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
