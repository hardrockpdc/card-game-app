import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

function hexToRgba(hex, alpha) {
  const clean = String(hex).replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function ScrollWheelPicker({
  options = [],
  value,
  onChange,
  itemHeight = 56,
  visibleCount = 5,
  accentColor = "#e94560",
  style,
  titleFontSize = 18,
  subtitleFontSize = 12,
}) {
  const listRef = useRef(null);
  const didMountRef = useRef(false);

  const resolvedSelectedIndex = useMemo(() => {
    if (!Array.isArray(options) || options.length === 0) return 0;
    const idx = options.findIndex((o) => o?.value === value);
    return idx >= 0 ? idx : 0;
  }, [options, value]);

  const [currentIndex, setCurrentIndex] = useState(resolvedSelectedIndex);

  useEffect(() => {
    setCurrentIndex(resolvedSelectedIndex);

    if (!didMountRef.current) {
      // Ensure the initial selection is aligned under the overlay.
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({
          offset: resolvedSelectedIndex * itemHeight,
          animated: false,
        });
      });
    }
  }, [resolvedSelectedIndex]);

  useEffect(() => {
    didMountRef.current = true;
  }, []);

  const safeVisibleCount = Math.max(3, Math.floor(visibleCount));
  const centerOffsetCount = Math.floor(safeVisibleCount / 2);

  const paddingTop = itemHeight * centerOffsetCount;
  const paddingBottom = itemHeight * centerOffsetCount;
  const containerHeight = itemHeight * safeVisibleCount;

  const selectionBg = hexToRgba(accentColor, 0.12);
  const selectionBorder = accentColor;

  function handleMomentumScrollEnd(event) {
    if (!Array.isArray(options) || options.length === 0) return;

    const y = event?.nativeEvent?.contentOffset?.y ?? 0;
    const rawIdx = y / itemHeight;
    const idx = clampNumber(Math.round(rawIdx), 0, options.length - 1);

    setCurrentIndex(idx);
    const nextValue = options[idx]?.value;
    if (nextValue !== value) onChange?.(nextValue);
  }

  const getItemLayout = (_, index) => ({
    length: itemHeight,
    offset: paddingTop + itemHeight * index,
    index,
  });

  const keyExtractor = (item) => String(item?.value ?? item?.id ?? "");

  return (
    <View style={[styles.outer, style, { height: containerHeight }]}>
      {/* Selection overlay */}
      <View
        pointerEvents="none"
        style={[
          styles.selectionOverlay,
          {
            top: paddingTop,
            height: itemHeight,
            borderColor: selectionBorder,
            backgroundColor: selectionBg,
          },
        ]}
      />

      <FlatList
        ref={listRef}
        data={options}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        style={styles.list}
        contentContainerStyle={{
          paddingTop,
          paddingBottom,
        }}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        disableIntervalMomentum
        onMomentumScrollEnd={handleMomentumScrollEnd}
        renderItem={({ item, index }) => {
          const isSelected = index === currentIndex;

          // Simple wheel feel: fade items away from center selection.
          const distance = Math.abs(index - currentIndex);
          const opacity = clampNumber(1 - distance * 0.28, 0.25, 1);
          const scale = isSelected ? 1.03 : distance === 1 ? 0.98 : 0.95;

          return (
            <View
              style={[
                styles.item,
                { height: itemHeight, opacity, transform: [{ scale }] },
              ]}
            >
              <Text
                style={[
                  styles.title,
                  {
                    fontSize: isSelected
                      ? titleFontSize
                      : Math.max(10, titleFontSize - 5),
                    color: isSelected ? "#fff" : "#A7B3C9",
                    fontWeight: isSelected ? "900" : "700",
                    letterSpacing: isSelected ? 0.2 : 0,
                  },
                ]}
                numberOfLines={1}
              >
                {item?.title ?? ""}
              </Text>
              {item?.subtitle ? (
                <Text
                  style={[
                    styles.subtitle,
                    {
                      fontSize: isSelected
                        ? subtitleFontSize
                        : Math.max(8, subtitleFontSize - 2),
                      color: isSelected ? "#FFD7DF" : "#7F8EA8",
                      fontWeight: isSelected ? "800" : "700",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.subtitle}
                </Text>
              ) : (
                <View style={{ height: 0 }} />
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#334",
    backgroundColor: "#0B1320",
    overflow: "hidden",
  },
  list: {
    flex: 1,
  },
  selectionOverlay: {
    position: "absolute",
    left: 10,
    right: 10,
    borderRadius: 14,
    borderWidth: 2,
    // backgroundColor set dynamically
  },
  item: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginTop: 2,
  },
});
