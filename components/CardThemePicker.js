import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { HapticTouchable as TouchableOpacity } from "./Haptic";
import { scale, scaleFont } from "../game/responsive";
import {
  THEMES_LIST,
  getThemePreviewImage,
  getTheme,
  setTheme,
  subscribe,
  isThemeUnlocked,
} from "../game/cardTheme";
import { updateProfile, loadProfile, subscribeProfile } from "../game/profile";

// In-game popup for changing the (global) card-art theme — mirrors the Table
// Theme picker's tap-to-apply feel, but shows real card previews since a theme
// is art, not a colour. Applies instantly and keeps the active one ticked;
// "Done" closes. Hosted in GameHeader / GameMenuButton so every game's menu can
// open it without leaving the table.
export default function CardThemePicker({ visible, onClose }) {
  const [active, setActive] = useState(getTheme());
  const [unlockedThemes, setUnlockedThemes] = useState([]);

  // Stay in sync if the theme changes elsewhere (e.g. the full Card Theme
  // screen reached from Profile).
  useEffect(() => subscribe((id) => setActive(id)), []);

  // Owned decks, so locked ones can't be selected here (unlock happens in the
  // full Card Deck screen).
  useEffect(() => {
    let mounted = true;
    loadProfile().then((p) => mounted && setUnlockedThemes(p.unlockedThemes || []));
    const unsub = subscribeProfile((p) => setUnlockedThemes(p.unlockedThemes || []));
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  function pick(key) {
    // Locked decks aren't selectable here — unlock them in the Card Deck screen.
    if (!isThemeUnlocked(key, unlockedThemes, active)) return;
    setTheme(key);
    setActive(key);
    updateProfile({ cardTheme: key }).catch(() => {});
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Tap the dimmed backdrop to dismiss; the panel swallows its own taps. */}
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close card theme picker"
      >
        <Pressable style={styles.panel} onPress={() => {}}>
          <Text style={styles.title}>Card Theme</Text>
          <ScrollView
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
          >
            {THEMES_LIST.map(([key], idx) => {
              const selected = key === active;
              const locked = !isThemeUnlocked(key, unlockedThemes, active);
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.card, selected && styles.cardSelected]}
                  onPress={() => pick(key)}
                  disabled={locked}
                  accessibilityRole="button"
                  accessibilityLabel={`Card style ${idx + 1}${locked ? " (locked)" : ""}`}
                  accessibilityState={{ selected, disabled: locked }}
                >
                  <Image
                    source={getThemePreviewImage(key)}
                    style={[styles.cardImg, locked && styles.cardImgLocked]}
                    resizeMode="contain"
                  />
                  {selected && (
                    <View style={styles.check}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  )}
                  {locked && (
                    <View style={styles.lockPill}>
                      <Text style={styles.lockPillText}>🔒</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const ACCENT = "#7fb3ff";

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    alignItems: "center",
    justifyContent: "center",
    padding: scale(20),
  },
  panel: {
    width: "100%",
    maxWidth: scale(420),
    maxHeight: "82%",
    backgroundColor: "#0F1B2D",
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: "#243042",
    paddingHorizontal: scale(16),
    paddingVertical: scale(18),
  },
  title: {
    color: "#f5f7fb",
    fontSize: scaleFont(22),
    fontWeight: "900",
    textAlign: "center",
    marginBottom: scale(14),
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: scale(12),
    paddingBottom: scale(6),
  },
  card: {
    width: scale(94),
    alignItems: "center",
    borderRadius: scale(12),
    borderWidth: 2,
    borderColor: "transparent",
    padding: scale(6),
  },
  cardSelected: {
    borderColor: ACCENT,
    backgroundColor: "rgba(127,179,255,0.10)",
  },
  cardImg: {
    width: scale(78),
    height: scale(109), // ~5:7
    borderRadius: scale(8),
  },
  cardImgLocked: {
    opacity: 0.35,
  },
  lockPill: {
    position: "absolute",
    top: scale(2),
    left: scale(2),
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: "#ffd479",
    alignItems: "center",
    justifyContent: "center",
  },
  lockPillText: {
    fontSize: scaleFont(11),
  },
  check: {
    position: "absolute",
    top: scale(2),
    right: scale(2),
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: {
    color: "#08111f",
    fontSize: scaleFont(13),
    fontWeight: "900",
  },
  doneBtn: {
    marginTop: scale(14),
    alignSelf: "center",
    paddingVertical: scale(12),
    paddingHorizontal: scale(44),
    borderRadius: scale(12),
    backgroundColor: ACCENT,
  },
  doneText: {
    color: "#08111f",
    fontSize: scaleFont(16),
    fontWeight: "800",
  },
});
