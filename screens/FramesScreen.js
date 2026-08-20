import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { HapticTouchable as TouchableOpacity } from "../components/Haptic";
import ProfileAvatar from "../components/ProfileAvatar";
import { scale, scaleFont } from "../game/responsive";
import { TITLE_FONT } from "../game/typography";
import { FRAMES_LIST, getFramePrice, isFrameUnlocked } from "../game/frames";
import { getCoins } from "../game/wallet";
import { purchaseCosmetic } from "../game/shop";
import { loadProfile, updateProfile, subscribeProfile } from "../game/profile";
import { gold } from "../game/colors";

// Profile-frame shop: a grid of decorative rings previewed on the player's own
// avatar. Free "None" plus coin-unlocked frames (1,000 each). Mirrors the deck
// shop's gate + unlock flow; frames apply globally via profile.activeFrame.
export default function FramesScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [coins, setCoins] = useState(null);
  const [unlockedFrames, setUnlockedFrames] = useState([]);
  const [activeFrame, setActiveFrame] = useState("none");

  useEffect(() => {
    let mounted = true;
    getCoins().then((c) => mounted && setCoins(c));
    loadProfile().then((p) => {
      if (!mounted) return;
      setProfile(p);
      setUnlockedFrames(p.unlockedFrames || []);
      setActiveFrame(p.activeFrame || "none");
    });
    const unsub = subscribeProfile((p) => {
      setProfile(p);
      setUnlockedFrames(p.unlockedFrames || []);
      setActiveFrame(p.activeFrame || "none");
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  function applyFrame(id) {
    setActiveFrame(id);
    updateProfile({ activeFrame: id }).catch(() => {});
  }

  function handlePress(id) {
    if (isFrameUnlocked(id, unlockedFrames, activeFrame)) {
      applyFrame(id);
      return;
    }
    const price = getFramePrice(id);
    if (coins < price) {
      Alert.alert(
        "Not enough coins",
        `This frame costs ${price.toLocaleString()} coins. Win more games to earn coins!`,
      );
      return;
    }
    Alert.alert(
      "Unlock frame?",
      `Unlock this frame for ${price.toLocaleString()} coins?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlock",
          onPress: async () => {
            const next = [...unlockedFrames, id];
            const result = await purchaseCosmetic({
              price,
              apply: () => updateProfile({ unlockedFrames: next }),
            });
            setCoins(result.balance);
            if (!result.ok) {
              Alert.alert(
                "Unlock failed",
                result.reason === "insufficient"
                  ? "You don't have enough coins for that."
                  : "Something went wrong saving your unlock. Your coins have been returned.",
              );
              return;
            }
            setUnlockedFrames(next);
            applyFrame(id); // unlock + wear in one step
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.coinHeader}>
          <View style={styles.tagRow}>
            <Text style={styles.coinText}>🪙</Text>
            <Text style={styles.coinText}>
              {coins === null ? "—" : coins.toLocaleString()}
            </Text>
          </View>
        </View>
        <Text style={styles.title}>Profile Frames</Text>
        <Text style={styles.subtitle}>
          A decorative ring around your avatar
        </Text>

        <View style={styles.grid}>
          {FRAMES_LIST.map(([id, frame]) => {
            const unlocked = isFrameUnlocked(id, unlockedFrames, activeFrame);
            const active = id === activeFrame;
            const price = getFramePrice(id);
            return (
              <TouchableOpacity
                key={id}
                style={[styles.cell, active && styles.cellActive]}
                onPress={() => handlePress(id)}
                accessibilityRole="button"
                accessibilityLabel={`${frame.name}${unlocked ? "" : ` (locked, ${price} coins)`}`}
                accessibilityState={{ selected: active }}
              >
                <ProfileAvatar
                  profile={profile}
                  name={profile?.name}
                  size={scale(64)}
                  frame={id}
                />
                <Text style={styles.frameName}>{frame.name}</Text>
                {active ? (
                  <View style={styles.tagRow}>
                    <Text style={styles.activeTag}>✓</Text>
                    <Text style={styles.activeTag}>Active</Text>
                  </View>
                ) : unlocked ? (
                  <Text style={styles.useTag}>Wear</Text>
                ) : (
                  <View style={styles.tagRow}>
                    <Text style={styles.priceTag}>🔒</Text>
                    <Text style={styles.priceTag}>
                      {price.toLocaleString()}
                    </Text>
                    <Text style={styles.priceTag}>🪙</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    padding: scale(20),
  },
  coinHeader: {
    alignSelf: "flex-end",
  },
  coinText: {
    color: gold,
    fontSize: scaleFont(17),
    fontWeight: "bold",
  },
  title: {
    color: "#ffffff",
    fontSize: scaleFont(26),
    fontFamily: TITLE_FONT,
    marginTop: scale(4),
  },
  subtitle: {
    color: "#c4c4d4",
    fontSize: scaleFont(13),
    marginBottom: scale(20),
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: scale(14),
  },
  cell: {
    width: scale(104),
    backgroundColor: "#16213e",
    borderRadius: scale(14),
    borderWidth: 2,
    borderColor: "#2a2a4a",
    paddingVertical: scale(16),
    alignItems: "center",
    gap: scale(8),
  },
  cellActive: {
    borderColor: "#7fb3ff",
    backgroundColor: "rgba(127,179,255,0.10)",
  },
  frameName: {
    color: "#ffffff",
    fontSize: scaleFont(13),
    fontWeight: "bold",
  },
  activeTag: {
    color: "#4ade80",
    fontSize: scaleFont(12),
    fontWeight: "bold",
  },
  useTag: {
    color: "#7fb3ff",
    fontSize: scaleFont(12),
    fontWeight: "bold",
  },
  // Icon + label as separate Text nodes (an emoji + text in ONE Text node can
  // render just the emoji on Android after a re-layout).
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  priceTag: {
    color: gold,
    fontSize: scaleFont(12),
    fontWeight: "bold",
  },
  backBtn: {
    marginTop: scale(24),
    paddingVertical: scale(12),
    paddingHorizontal: scale(32),
    borderRadius: scale(10),
    borderWidth: 1.5,
    borderColor: "#4a4a6a",
  },
  backBtnText: {
    color: "#c4c4d4",
    fontSize: scaleFont(16),
    fontWeight: "600",
  },
});
