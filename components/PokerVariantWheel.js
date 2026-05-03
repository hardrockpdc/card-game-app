import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

export const POKER_VARIANT_OPTIONS = [
  { value: "texasHoldem", label: "Texas Hold'em" },
  { value: "omaha", label: "Omaha" },
  { value: "fiveCardDraw", label: "Five Card Draw" },
  { value: "sevenCardStud", label: "Seven Card Stud" },
];

const ITEM_HEIGHT = 56;
const WHEEL_HEIGHT = ITEM_HEIGHT * 3;
const WHEEL_PADDING = ITEM_HEIGHT;

function PokerVariantWheel({
  value,
  onChange,
  options = POKER_VARIANT_OPTIONS,
  style,
}) {
  const listRef = useRef(null);
  const [layoutReady, setLayoutReady] = useState(false);

  const selectedIndex = useMemo(() => {
    const index = options.findIndex((option) => option.value === value);
    return index >= 0 ? index : 0;
  }, [options, value]);

  useEffect(() => {
    if (!layoutReady) {
      return undefined;
    }

    const timer = setTimeout(() => {
      try {
        listRef.current?.scrollToIndex({
          index: selectedIndex,
          animated: false,
          viewPosition: 0.5,
        });
      } catch (error) {
        // Ignore occasional measurement timing issues on first render.
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [layoutReady, selectedIndex]);

  const handleMomentumScrollEnd = (event) => {
    const rawIndex = Math.round(
      event.nativeEvent.contentOffset.y / ITEM_HEIGHT,
    );
    const clampedIndex = Math.max(0, Math.min(options.length - 1, rawIndex));
    const nextValue = options[clampedIndex]?.value;

    if (nextValue && nextValue !== value) {
      onChange?.(nextValue);
    }
  };

  const renderItem = ({ item, index }) => {
    const isSelected = index === selectedIndex;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.label}
        onPress={() => onChange?.(item.value)}
        style={({ pressed }) => [
          styles.item,
          isSelected && styles.itemSelected,
          pressed && styles.itemPressed,
        ]}
      >
        <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.highlight} pointerEvents="none" />
      <FlatList
        ref={listRef}
        data={options}
        keyExtractor={(item) => item.value}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        onLayout={() => setLayoutReady(true)}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            try {
              listRef.current?.scrollToIndex({
                index: info.index,
                animated: false,
                viewPosition: 0.5,
              });
            } catch (error) {
              // Ignore retry failures; the next render will correct the scroll.
            }
          }, 50);
        }}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: WHEEL_PADDING + ITEM_HEIGHT * index,
          index,
        })}
        initialNumToRender={options.length}
        maxToRenderPerBatch={options.length}
        windowSize={3}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: WHEEL_HEIGHT,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#0B1320",
    overflow: "hidden",
  },
  highlight: {
    position: "absolute",
    left: 12,
    right: 12,
    top: ITEM_HEIGHT,
    height: ITEM_HEIGHT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(193, 18, 31, 0.8)",
    backgroundColor: "rgba(193, 18, 31, 0.12)",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: WHEEL_PADDING,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    marginHorizontal: 12,
  },
  itemSelected: {
    backgroundColor: "rgba(193, 18, 31, 0.05)",
  },
  itemPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  itemText: {
    color: "#A7B3C9",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  itemTextSelected: {
    color: "#F4F7FB",
    fontSize: 18,
  },
});

export default PokerVariantWheel;
