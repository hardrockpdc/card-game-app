import React, { useState } from "react";
import { Modal, View, Text, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HapticTouchable as TouchableOpacity } from "./Haptic";
import { scale, scaleFont } from "../game/responsive";

const KEY_PREFIX = "@cardnight:tutorial:";

export async function hasSeen(gameId) {
  try {
    const val = await AsyncStorage.getItem(KEY_PREFIX + gameId);
    return val === "true";
  } catch {
    return false;
  }
}

export async function markSeen(gameId) {
  try {
    await AsyncStorage.setItem(KEY_PREFIX + gameId, "true");
  } catch {
    // non-fatal
  }
}

export default function TutorialOverlay({ visible, slides, gameId, onDone }) {
  const [index, setIndex] = useState(0);

  const isLast = index === slides.length - 1;

  function handleNext() {
    if (isLast) {
      markSeen(gameId);
      onDone();
    } else {
      setIndex(index + 1);
    }
  }

  function handleSkip() {
    markSeen(gameId);
    setIndex(0);
    onDone();
  }

  const slide = slides[index];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.emoji}>{slide.emoji}</Text>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.body}>{slide.body}</Text>

          <View style={styles.dots}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === index && styles.dotActive]}
              />
            ))}
          </View>

          <View style={styles.btnRow}>
            {!isLast && (
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.nextBtn, isLast && styles.nextBtnFull]}
              onPress={handleNext}
            >
              <Text style={styles.nextText}>{isLast ? "Got It!" : "Next"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    padding: scale(24),
  },
  card: {
    backgroundColor: "#1e1e38",
    borderRadius: scale(18),
    borderWidth: 1,
    borderColor: "#3a3a5c",
    padding: scale(28),
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
  },
  emoji: {
    fontSize: scaleFont(44),
    marginBottom: scale(12),
  },
  title: {
    color: "#ffffff",
    fontSize: scaleFont(20),
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: scale(12),
  },
  body: {
    color: "#c0c0d4",
    fontSize: scaleFont(15),
    textAlign: "center",
    lineHeight: scale(22),
    marginBottom: scale(24),
  },
  dots: {
    flexDirection: "row",
    gap: scale(8),
    marginBottom: scale(24),
  },
  dot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: "#3a3a5c",
  },
  dotActive: {
    backgroundColor: "#7878ff",
  },
  btnRow: {
    flexDirection: "row",
    gap: scale(12),
    width: "100%",
  },
  skipBtn: {
    flex: 1,
    paddingVertical: scale(12),
    borderRadius: scale(10),
    borderWidth: 1.5,
    borderColor: "#4a4a6a",
    alignItems: "center",
  },
  skipText: {
    color: "#888898",
    fontSize: scaleFont(15),
    fontWeight: "600",
  },
  nextBtn: {
    flex: 2,
    paddingVertical: scale(12),
    borderRadius: scale(10),
    backgroundColor: "#5555cc",
    alignItems: "center",
  },
  nextBtnFull: {
    flex: 1,
  },
  nextText: {
    color: "#ffffff",
    fontSize: scaleFont(15),
    fontWeight: "700",
  },
});
