import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { HapticPressable as Pressable } from "./Haptic";
import { getFeltPrice, isFeltUnlocked } from "../game/feltShop";
import { getCoins, subtractCoins } from "../game/wallet";
import { loadProfile, subscribeProfile, updateProfile } from "../game/profile";

// Reusable full-screen "Table Theme" picker overlay, shared by every game with
// switchable table palettes (Go Fish / Poker / Rummy / Last Card). Free felts
// apply on tap; locked felts show a price and run a coin-unlock confirm before
// applying. Unlocks are GLOBAL (owned once, usable in every game) and persisted
// on the profile as `unlockedFelts`.
//
// Props:
//   visible    – whether to render the overlay
//   tables     – array of palette objects (id, name, price, felt, accent…)
//   currentId  – id of the active palette (gets the ✓ + accent border)
//   onPick(id) – called when a felt is chosen (only after it's unlocked)
//   onClose()  – called when the Close button is tapped
export default function TableThemePicker({
  visible,
  tables = [],
  currentId,
  onPick,
  onClose,
}) {
  const [coins, setCoins] = useState(0);
  const [unlockedFelts, setUnlockedFelts] = useState([]);

  useEffect(() => {
    let mounted = true;
    getCoins().then((c) => mounted && setCoins(c));
    loadProfile().then((p) => mounted && setUnlockedFelts(p.unlockedFelts || []));
    const unsub = subscribeProfile((p) =>
      setUnlockedFelts(p.unlockedFelts || []),
    );
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  // Refresh the coin balance each time the picker opens (coins may have changed
  // in-game since it was first mounted).
  useEffect(() => {
    if (visible) getCoins().then(setCoins);
  }, [visible]);

  if (!visible) return null;

  function handlePress(t) {
    if (isFeltUnlocked(t.id, unlockedFelts, currentId)) {
      onPick?.(t.id);
      return;
    }
    const price = getFeltPrice(t.id);
    if (coins < price) {
      Alert.alert(
        "Not enough coins",
        `The ${t.name} felt costs ${price.toLocaleString()} coins. Win more games to earn coins!`,
      );
      return;
    }
    Alert.alert(
      "Unlock felt?",
      `Unlock the ${t.name} felt for ${price.toLocaleString()} coins?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlock",
          onPress: async () => {
            const newBalance = await subtractCoins(price);
            setCoins(newBalance);
            const next = [...unlockedFelts, t.id];
            setUnlockedFelts(next);
            await updateProfile({ unlockedFelts: next }).catch(() => {});
            onPick?.(t.id); // unlock + apply in one step
          },
        },
      ],
    );
  }

  return (
    <View style={styles.overlay}>
      <Text style={styles.title}>Table Theme</Text>
      <View style={styles.coinPill}>
        <Text style={styles.coinPillText}>🪙 {coins.toLocaleString()}</Text>
      </View>
      <View style={styles.grid}>
        {tables.map((t) => {
          const selected = t.id === currentId;
          const unlocked = isFeltUnlocked(t.id, unlockedFelts, currentId);
          const price = getFeltPrice(t.id);
          return (
            <Pressable
              key={t.id}
              onPress={() => handlePress(t)}
              style={[
                styles.swatch,
                {
                  backgroundColor: t.felt,
                  borderColor: selected ? t.accent : t.feltBorder,
                },
                !unlocked && styles.swatchLocked,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${t.name}${unlocked ? "" : ` (locked, ${price} coins)`}`}
            >
              <View style={styles.dots}>
                <View style={[styles.dot, { backgroundColor: t.rail }]} />
                <View style={[styles.dot, { backgroundColor: t.panel }]} />
                <View style={[styles.dot, { backgroundColor: t.accent }]} />
              </View>
              <Text style={[styles.name, { color: t.text }]}>{t.name}</Text>
              {unlocked ? (
                <Text
                  style={[
                    styles.check,
                    { color: selected ? t.accent : "transparent" },
                  ]}
                >
                  ✓ Selected
                </Text>
              ) : (
                <Text style={styles.price}>🔒 {price.toLocaleString()} 🪙</Text>
              )}
            </Pressable>
          );
        })}
      </View>
      <Pressable
        style={styles.closeBtn}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Text style={styles.closeText}>Close</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    zIndex: 100,
    paddingHorizontal: 32,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  coinPill: {
    backgroundColor: "#16213e",
    borderWidth: 1.5,
    borderColor: "#b8860b",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 4,
  },
  coinPillText: {
    color: "#ffd700",
    fontSize: 14,
    fontWeight: "bold",
  },
  grid: {
    width: "100%",
    gap: 12,
  },
  swatch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  swatchLocked: {
    opacity: 0.85,
  },
  dots: {
    flexDirection: "row",
    gap: 5,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  check: {
    fontSize: 12,
    fontWeight: "800",
  },
  price: {
    color: "#ffd479",
    fontSize: 13,
    fontWeight: "800",
  },
  closeBtn: {
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 12,
    backgroundColor: "#16213e",
    borderWidth: 1.5,
    borderColor: "#334",
  },
  closeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});
