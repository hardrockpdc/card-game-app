import React, { useMemo, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { scale, scaleFont } from "../game/responsive";
import { getMuted, setMuted } from "../game/sounds";

function isFunction(x) {
  return typeof x === "function";
}

function MenuDivider({ k }) {
  return <View key={k} style={styles.divider} />;
}

export default function GameMenu({ menuItems }) {
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);

  const [muted, setMutedState] = useState(getMuted());

  const rows = useMemo(() => {
    const items = Array.isArray(menuItems) ? menuItems : [];

    return items.map((item, idx) => {
      const key = item?.key ?? `${item?.type ?? "item"}-${idx}`;

      if (item?.type === "divider") {
        return <MenuDivider key={key} k={key} />;
      }

      if (item?.type === "sound") {
        return (
          <Pressable
            key={key}
            onPress={() => {
              const next = !muted;
              setMutedState(next);
              setMuted(next);
              setOpen(false);
            }}
            style={({ pressed }) => [
              styles.menuRow,
              pressed && !item?.disabled && styles.menuRowPressed,
              item?.disabled && styles.menuRowDisabled,
            ]}
            disabled={item?.disabled}
          >
            <Text style={styles.menuIcon}>{muted ? "🔇" : "🔊"}</Text>
            <Text style={styles.menuLabel}>Sound: {muted ? "Off" : "On"}</Text>
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
                      setOpen(false);
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

      if (item?.type === "howto") {
        return (
          <Pressable
            key={key}
            onPress={() => {
              setOpen(false);
              const params = item?.gameId ? { gameId: item.gameId } : undefined;
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
              setOpen(false);
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
                      setOpen(false);
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
            setOpen(false);
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
    });
  }, [menuItems, muted, navigation]);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.hamburgerBtn,
          pressed && styles.hamburgerBtnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Open game menu"
      >
        <Text style={styles.hamburgerText}>☰</Text>
      </Pressable>

      <Modal
        transparent
        animationType="fade"
        visible={open}
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.menuBox}>{rows}</View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  hamburgerBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(14),
    backgroundColor: "rgba(20, 30, 55, 0.85)",
    borderWidth: 1,
    borderColor: "#334",
    alignItems: "center",
    justifyContent: "center",
  },
  hamburgerBtnPressed: {
    opacity: 0.85,
  },
  hamburgerText: {
    color: "#ffffff",
    fontSize: scaleFont(18),
    fontWeight: "900",
    lineHeight: scaleFont(18),
  },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: scale(84),
    paddingRight: scale(14),
  },

  menuBox: {
    width: scale(240),
    backgroundColor: "#141c28",
    borderRadius: scale(16),
    borderWidth: 1.5,
    borderColor: "#243042",
    overflow: "hidden",
  },

  divider: {
    height: 1,
    backgroundColor: "#243042",
    marginVertical: scale(6),
  },

  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
    paddingVertical: scale(12),
    paddingHorizontal: scale(14),
  },
  menuRowPressed: {
    backgroundColor: "rgba(127,179,255,0.10)",
  },
  menuRowDisabled: {
    opacity: 0.45,
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
