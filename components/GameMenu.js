import React, { useMemo, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { scale, scaleFont } from "../game/responsive";
import { getMuted, setMuted } from "../game/sounds";

function getHowToPlayGameId({ onHowToPlay, gameId }) {
  if (typeof onHowToPlay === "string") return onHowToPlay;
  if (gameId) return gameId;
  return null;
}

function isFunction(x) {
  return typeof x === "function";
}

export default function GameMenu({
  onRestart,
  onHowToPlay,
  onQuit,
  gameId,
  extraItems = [],
}) {
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);

  const [muted, setMutedState] = useState(getMuted());

  const howToPlayGameId = useMemo(
    () => getHowToPlayGameId({ onHowToPlay, gameId }),
    [onHowToPlay, gameId],
  );

  const defaultItems = useMemo(() => {
    return [
      {
        key: "restart",
        icon: "🔄",
        label: "Restart Game",
        onPress: () => {
          if (!isFunction(onRestart)) return;
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
                  onRestart();
                },
              },
            ],
            { cancelable: true },
          );
        },
        disabled: !isFunction(onRestart),
      },
      {
        key: "howto",
        icon: "📖",
        label: "How to Play",
        onPress: () => {
          if (isFunction(onHowToPlay)) {
            setOpen(false);
            onHowToPlay();
            return;
          }
          const params = howToPlayGameId
            ? { gameId: howToPlayGameId }
            : undefined;
          setOpen(false);
          navigation.navigate("HowToPlay", params);
        },
        disabled: false,
      },
      {
        key: "sound",
        icon: muted ? "🔇" : "🔊",
        label: `Sound: ${muted ? "Off" : "On"}`,
        onPress: async () => {
          const next = !muted;
          setMutedState(next);
          await setMuted(next);
        },
        disabled: false,
      },
      {
        key: "theme",
        icon: "🎨",
        label: "Card Theme",
        onPress: () => {
          setOpen(false);
          navigation.navigate("CardThemes");
        },
        disabled: false,
      },
      { key: "divider-after-theme", type: "divider" },
      {
        key: "quit",
        icon: "❌",
        label: "Quit Game",
        onPress: () => {
          if (!isFunction(onQuit)) return;
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
                  onQuit();
                },
              },
            ],
            { cancelable: true },
          );
        },
        disabled: !isFunction(onQuit),
      },
    ];
  }, [muted, onHowToPlay, onRestart, onQuit, howToPlayGameId, navigation]);

  const menuRows = useMemo(() => {
    const topExtra = (extraItems || []).map((it, idx) => ({
      key: `extra-${idx}`,
      icon: it.icon ?? "•",
      label: it.label ?? "Extra",
      onPress: () => {
        setOpen(false);
        if (isFunction(it.onPress)) it.onPress();
      },
      disabled: !isFunction(it.onPress),
    }));

    return [...topExtra, ...defaultItems];
  }, [extraItems, defaultItems]);

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
          <View style={styles.menuBox}>
            {menuRows.map((row) => {
              if (row.type === "divider") {
                return <View key={row.key} style={styles.divider} />;
              }

              return (
                <Pressable
                  key={row.key}
                  onPress={row.disabled ? undefined : row.onPress}
                  style={({ pressed }) => [
                    styles.menuRow,
                    row.disabled && styles.menuRowDisabled,
                    pressed && !row.disabled && styles.menuRowPressed,
                  ]}
                >
                  <Text style={styles.menuIcon}>{row.icon}</Text>
                  <Text style={styles.menuLabel}>{row.label}</Text>
                </Pressable>
              );
            })}
          </View>
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
