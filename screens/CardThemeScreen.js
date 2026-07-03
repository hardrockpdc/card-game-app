import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  Alert,
  useWindowDimensions,
} from "react-native";
import { HapticTouchable as TouchableOpacity } from "../components/Haptic";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  THEMES_LIST,
  getThemePreviewImage,
  setTheme,
  getTheme,
  subscribe,
  getThemePrice,
  isThemeUnlocked,
} from "../game/cardTheme";
import {
  updateProfile,
  loadProfile,
  subscribeProfile,
} from "../game/profile";
import { getCoins, subtractCoins } from "../game/wallet";

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
  const [coins, setCoins] = useState(0);
  const [unlockedThemes, setUnlockedThemes] = useState([]);

  const flatListRef = useRef(null);
  const confirmTimer = useRef(null);

  // Stay in sync if another screen changes the theme
  useEffect(() => subscribe((id) => setActiveTheme(id)), []);

  // Load coin balance + owned decks; keep owned decks in sync with the profile.
  useEffect(() => {
    let mounted = true;
    getCoins().then((c) => mounted && setCoins(c));
    loadProfile().then((p) => mounted && setUnlockedThemes(p.unlockedThemes || []));
    const unsub = subscribeProfile((p) =>
      setUnlockedThemes(p.unlockedThemes || []),
    );
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  // Clean up timer on unmount
  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    },
    [],
  );

  function applyTheme(key) {
    setTheme(key);
    updateProfile({ cardTheme: key }).catch(() => {});
    setActiveTheme(key);
    setConfirmed(true);
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setConfirmed(false), 1800);
  }

  function handleApply() {
    const [key] = THEMES_LIST[currentIndex];
    applyTheme(key);
  }

  async function handleUnlock() {
    const [key, theme] = THEMES_LIST[currentIndex];
    const price = getThemePrice(key);
    if (coins < price) {
      Alert.alert(
        "Not enough coins",
        `The ${theme.name} deck costs ${price.toLocaleString()} coins. Win more games to earn coins!`,
      );
      return;
    }
    Alert.alert(
      "Unlock deck?",
      `Unlock the ${theme.name} deck for ${price.toLocaleString()} coins?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlock",
          onPress: async () => {
            const newBalance = await subtractCoins(price);
            setCoins(newBalance);
            const nextUnlocked = [...unlockedThemes, key];
            setUnlockedThemes(nextUnlocked);
            await updateProfile({ unlockedThemes: nextUnlocked }).catch(() => {});
            applyTheme(key); // unlock + apply in one step
          },
        },
      ],
    );
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
  const currentPrice = getThemePrice(currentKey);
  const currentUnlocked = isThemeUnlocked(
    currentKey,
    unlockedThemes,
    activeTheme,
  );

  function buttonLabel() {
    if (confirmed) return "Deck applied! ✓";
    if (!currentUnlocked) return `🔒 Unlock — ${currentPrice.toLocaleString()} 🪙`;
    if (isCurrentActive) return "Active Deck";
    return "Use This Deck";
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Coin balance */}
      <View style={styles.coinHeader}>
        <Text style={styles.coinText}>🪙 {coins.toLocaleString()}</Text>
      </View>

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
        renderItem={({ item: [key, theme] }) => {
          const unlocked = isThemeUnlocked(key, unlockedThemes, activeTheme);
          const price = getThemePrice(key);
          return (
            <View style={[styles.page, { width }]}>
              <View style={styles.previewWrapper}>
                <Image
                  source={getThemePreviewImage(key)}
                  style={[
                    styles.previewCard,
                    { width: previewWidth, height: previewHeight },
                    !unlocked && styles.previewLocked,
                  ]}
                  resizeMode="contain"
                />
                {activeTheme === key && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>✓ Active</Text>
                  </View>
                )}
                {!unlocked && (
                  <View style={styles.lockBadge}>
                    <Text style={styles.lockBadgeText}>
                      🔒 {price.toLocaleString()} 🪙
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.swipeHint}>← swipe to browse →</Text>
            </View>
          );
        }}
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
            !currentUnlocked && styles.unlockBtn,
            currentUnlocked &&
              isCurrentActive &&
              !confirmed &&
              styles.applyBtnDimmed,
            confirmed && styles.applyBtnConfirmed,
          ]}
          onPress={currentUnlocked ? handleApply : handleUnlock}
          disabled={currentUnlocked && isCurrentActive && !confirmed}
        >
          <Text
            style={[
              styles.applyBtnText,
              // Blue button uses dark text; the dimmed/confirmed states have
              // dark/green backgrounds and keep light text for contrast.
              (isCurrentActive || confirmed) && styles.applyBtnTextLight,
            ]}
          >
            {buttonLabel()}
          </Text>
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
  coinHeader: {
    alignItems: "flex-end",
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  coinText: {
    color: "#ffd479",
    fontSize: 17,
    fontWeight: "bold",
  },
  previewLocked: {
    opacity: 0.4,
  },
  lockBadge: {
    position: "absolute",
    top: -14,
    backgroundColor: "#2a2a3d",
    borderWidth: 1.5,
    borderColor: "#ffd479",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  lockBadgeText: {
    color: "#ffd479",
    fontSize: 14,
    fontWeight: "bold",
  },
  unlockBtn: {
    backgroundColor: "#ffd479",
  },
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
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
    backgroundColor: "#7fb3ff",
    borderRadius: 4,
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  applyBtn: {
    backgroundColor: "#7fb3ff",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  applyBtnDimmed: {
    backgroundColor: "#2a3340",
  },
  applyBtnConfirmed: {
    backgroundColor: "#4caf50",
  },
  applyBtnText: {
    color: "#08111f",
    fontSize: 18,
    fontWeight: "bold",
  },
  applyBtnTextLight: {
    color: "#ffffff",
  },
});
