import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  THEMES_LIST,
  getThemePreviewImage,
  setTheme,
  getTheme,
  subscribe,
} from "../game/cardTheme";
import { updateProfile } from "../game/profile";

export default function CardThemeScreen() {
  const { width, height } = useWindowDimensions();

  const [activeTheme, setActiveTheme] = useState(getTheme());
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.max(
      0,
      THEMES_LIST.findIndex(([key]) => key === getTheme()),
    ),
  );
  const [confirmed, setConfirmed] = useState(false);

  const flatListRef = useRef(null);
  const confirmTimer = useRef(null);

  // Stay in sync if another screen changes the theme
  useEffect(() => subscribe((id) => setActiveTheme(id)), []);

  // Clean up timer on unmount
  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    },
    [],
  );

  function handleApply() {
    const [key] = THEMES_LIST[currentIndex];
    setTheme(key);
    updateProfile({ cardTheme: key }).catch(() => {});
    setActiveTheme(key);
    setConfirmed(true);
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setConfirmed(false), 1800);
  }

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
      setConfirmed(false);
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const previewHeight = Math.min(height * 0.48, 380);
  const previewWidth = previewHeight * 0.7;

  const currentKey = THEMES_LIST[currentIndex]?.[0];
  const isCurrentActive = currentKey === activeTheme;

  function buttonLabel() {
    if (confirmed) return "Theme applied! ✓";
    if (isCurrentActive) return "Active Theme";
    return "Use This Theme";
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Swipeable pages */}
      <FlatList
        ref={flatListRef}
        data={THEMES_LIST}
        keyExtractor={([key]) => key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialScrollIndex={currentIndex}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        renderItem={({ item: [key, theme] }) => (
          <View style={[styles.page, { width }]}>
            <Text style={styles.themeName}>{theme.name}</Text>

            <View style={styles.previewWrapper}>
              <Image
                source={getThemePreviewImage(key)}
                style={[
                  styles.previewCard,
                  { width: previewWidth, height: previewHeight },
                ]}
                resizeMode="contain"
              />
              {activeTheme === key && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>✓ Active</Text>
                </View>
              )}
            </View>

            <Text style={styles.swipeHint}>← swipe to browse →</Text>
          </View>
        )}
      />

      {/* Dot indicators */}
      <View style={styles.dotsRow}>
        {THEMES_LIST.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* Apply button */}
      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={[
            styles.applyBtn,
            isCurrentActive && !confirmed && styles.applyBtnDimmed,
            confirmed && styles.applyBtnConfirmed,
          ]}
          onPress={handleApply}
          disabled={isCurrentActive && !confirmed}
        >
          <Text style={styles.applyBtnText}>{buttonLabel()}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  themeName: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 24,
    letterSpacing: 1,
  },
  previewWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  previewCard: {
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  activeBadge: {
    position: "absolute",
    bottom: -14,
    backgroundColor: "#4caf50",
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#4caf50",
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  activeBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  swipeHint: {
    color: "#444",
    fontSize: 13,
    marginTop: 32,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#334",
  },
  dotActive: {
    width: 22,
    backgroundColor: "#e94560",
    borderRadius: 4,
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  applyBtn: {
    backgroundColor: "#e94560",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  applyBtnDimmed: {
    backgroundColor: "#3a1a2a",
  },
  applyBtnConfirmed: {
    backgroundColor: "#4caf50",
  },
  applyBtnText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
