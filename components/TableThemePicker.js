import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { HapticPressable as Pressable } from "./Haptic";

// Reusable full-screen "Table Theme" picker overlay, shared by the games that
// support switchable table palettes (Rummy / Poker / Go Fish). Mirrors the
// original inline picker from Last Card.
//
// Props:
//   visible    – whether to render the overlay
//   tables     – array of palette objects (id, name, rail, panel, felt, accent…)
//   currentId  – id of the active palette (gets the ✓ + accent border)
//   onPick(id) – called when a palette is chosen
//   onClose()  – called when the Close button is tapped
export default function TableThemePicker({
  visible,
  tables = [],
  currentId,
  onPick,
  onClose,
}) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Text style={styles.title}>Table Theme</Text>
      <View style={styles.grid}>
        {tables.map((t) => {
          const selected = t.id === currentId;
          return (
            <Pressable
              key={t.id}
              onPress={() => onPick?.(t.id)}
              style={[
                styles.swatch,
                {
                  backgroundColor: t.felt,
                  borderColor: selected ? t.accent : t.feltBorder,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t.name}
            >
              <View style={styles.dots}>
                <View style={[styles.dot, { backgroundColor: t.rail }]} />
                <View style={[styles.dot, { backgroundColor: t.panel }]} />
                <View style={[styles.dot, { backgroundColor: t.accent }]} />
              </View>
              <Text style={[styles.name, { color: t.text }]}>{t.name}</Text>
              <Text
                style={[
                  styles.check,
                  { color: selected ? t.accent : "transparent" },
                ]}
              >
                ✓ Selected
              </Text>
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
    marginBottom: 8,
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
