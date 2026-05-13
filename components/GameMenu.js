import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { scale, scaleFont } from "../game/responsive";
import { getMuted, setMuted } from "../game/sounds";

function isFunction(x) {
  return typeof x === "function";
}

// Exported so GameHeader can render the divider between header row and items
export function MenuDivider() {
  return <View style={styles.divider} />;
}

// Pure item-list renderer — no modal, no hamburger button.
// GameHeader owns the open/close state and calls this when expanded.
export default function GameMenuItems({ menuItems, onClose }) {
  const navigation = useNavigation();
  const [muted, setMutedState] = useState(getMuted());

  const items = Array.isArray(menuItems) ? menuItems : [];

  return (
    <View>
      {items.map((item, idx) => {
        const key = item?.key ?? `${item?.type ?? "item"}-${idx}`;

        if (item?.type === "divider") {
          return <MenuDivider key={key} />;
        }

        if (item?.type === "sound") {
          return (
            <Pressable
              key={key}
              onPress={() => {
                const next = !muted;
                setMutedState(next);
                setMuted(next);
                if (isFunction(onClose)) onClose();
              }}
              style={({ pressed }) => [
                styles.menuRow,
                pressed && styles.menuRowPressed,
                item?.disabled && styles.menuRowDisabled,
              ]}
              disabled={item?.disabled}
            >
              <Text style={styles.menuIcon}>{muted ? "🔇" : "🔊"}</Text>
              <Text style={styles.menuLabel}>
                Sound: {muted ? "Off" : "On"}
              </Text>
            </Pressable>
          );
        }

        if (item?.type === "undo") {
          return (
            <Pressable
              key={key}
              onPress={() => {
                if (!isFunction(item?.onUndo)) return;
                if (isFunction(onClose)) onClose();
                item.onUndo();
              }}
              style={({ pressed }) => [
                styles.menuRow,
                pressed && !item?.disabled && styles.menuRowPressed,
                item?.disabled && styles.menuRowDisabled,
              ]}
              disabled={!isFunction(item?.onUndo) || item?.disabled}
            >
              <Text style={styles.menuIcon}>↩️</Text>
              <Text style={styles.menuLabel}>Undo</Text>
            </Pressable>
          );
        }

        if (item?.type === "restart") {
          return (
            <Pressable
              key={key}
              onPress={() => {
                if (!isFunction(item?.onRestart)) return;
                Alert.alert(
                  "Restart Game?",
                  "Current progress will be lost.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Restart",
                      style: "destructive",
                      onPress: () => {
                        if (isFunction(onClose)) onClose();
                        item.onRestart();
                      },
                    },
                  ],
                  { cancelable: true },
                );
              }}
              style={({ pressed }) => [
                styles.menuRow,
                pressed && !item?.disabled && styles.menuRowPressed,
                item?.disabled && styles.menuRowDisabled,
              ]}
              disabled={!isFunction(item?.onRestart) || item?.disabled}
            >
              <Text style={styles.menuIcon}>🔄</Text>
              <Text style={styles.menuLabel}>Restart Game</Text>
            </Pressable>
          );
        }

        if (item?.type === "saveexit") {
          return (
            <Pressable
              key={key}
              onPress={() => {
                if (!isFunction(item?.onSaveExit)) return;
                if (isFunction(onClose)) onClose();
                item.onSaveExit();
              }}
              style={({ pressed }) => [
                styles.menuRow,
                pressed && !item?.disabled && styles.menuRowPressed,
                item?.disabled && styles.menuRowDisabled,
              ]}
              disabled={!isFunction(item?.onSaveExit) || item?.disabled}
            >
              <Text style={styles.menuIcon}>💾</Text>
              <Text style={styles.menuLabel}>{"Save & Exit"}</Text>
            </Pressable>
          );
        }

        if (item?.type === "howto") {
          return (
            <Pressable
              key={key}
              onPress={() => {
                if (isFunction(onClose)) onClose();
                const params = item?.gameId
                  ? { gameId: item.gameId }
                  : undefined;
                navigation.navigate("HowToPlay", params);
              }}
              style={({ pressed }) => [
                styles.menuRow,
                pressed && !item?.disabled && styles.menuRowPressed,
                item?.disabled && styles.menuRowDisabled,
              ]}
              disabled={item?.disabled}
            >
              <Text style={styles.menuIcon}>📖</Text>
              <Text style={styles.menuLabel}>How to Play</Text>
            </Pressable>
          );
        }

        if (item?.type === "theme") {
          return (
            <Pressable
              key={key}
              onPress={() => {
                if (isFunction(onClose)) onClose();
                navigation.navigate("CardThemes");
              }}
              style={({ pressed }) => [
                styles.menuRow,
                pressed && !item?.disabled && styles.menuRowPressed,
                item?.disabled && styles.menuRowDisabled,
              ]}
              disabled={item?.disabled}
            >
              <Text style={styles.menuIcon}>🎨</Text>
              <Text style={styles.menuLabel}>Card Theme</Text>
            </Pressable>
          );
        }

        if (item?.type === "quit") {
          return (
            <Pressable
              key={key}
              onPress={() => {
                if (!isFunction(item?.onQuit)) return;
                Alert.alert(
                  "Quit this game?",
                  "Your progress will be lost.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Quit",
                      style: "destructive",
                      onPress: () => {
                        if (isFunction(onClose)) onClose();
                        item.onQuit();
                      },
                    },
                  ],
                  { cancelable: true },
                );
              }}
              style={({ pressed }) => [
                styles.menuRow,
                pressed && !item?.disabled && styles.menuRowPressed,
                item?.disabled && styles.menuRowDisabled,
              ]}
              disabled={!isFunction(item?.onQuit) || item?.disabled}
            >
              <Text style={styles.menuIcon}>❌</Text>
              <Text style={styles.menuLabel}>Quit Game</Text>
            </Pressable>
          );
        }

        // Generic fallback item
        const icon = item?.icon ?? "•";
        const label = item?.label ?? "Menu Item";
        const onPress = item?.onPress;

        return (
          <Pressable
            key={key}
            onPress={() => {
              if (isFunction(onClose)) onClose();
              if (isFunction(onPress)) onPress();
            }}
            style={({ pressed }) => [
              styles.menuRow,
              pressed && !item?.disabled && styles.menuRowPressed,
              item?.disabled && styles.menuRowDisabled,
            ]}
            disabled={!isFunction(onPress) || item?.disabled}
          >
            <Text style={styles.menuIcon}>{icon}</Text>
            <Text style={styles.menuLabel}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: "#243042",
    marginVertical: scale(4),
  },

  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
    paddingVertical: scale(11),
    paddingHorizontal: scale(4),
  },
  menuRowPressed: {
    backgroundColor: "rgba(127,179,255,0.10)",
    borderRadius: scale(8),
  },
  menuRowDisabled: {
    opacity: 0.35,
  },

  menuIcon: {
    width: scale(28),
    textAlign: "center",
    fontSize: scaleFont(16),
  },
  menuLabel: {
    flex: 1,
    color: "#f5f7fb",
    fontSize: scaleFont(15),
    fontWeight: "800",
  },
});
