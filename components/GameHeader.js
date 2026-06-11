import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { scale, scaleFont } from "../game/responsive";
import { getTableTheme } from "../game/tableThemes";
import GameMenuItems, { MenuDivider } from "./GameMenu";

const KICKER_LABELS = {
  blackjack: "BLACKJACK",
  gofish: "GO FISH",
  poker: "POKER",
  conquian: "CONQUIAN",
  rummy: "RUMMY",
  solitaire: "SOLITAIRE",
  lastcard: "LAST CARD",
  wildround: "WILD ROUND",
};

export default function GameHeader({
  gameId,
  title,
  subtitle,
  leftInfo,
  extraButton,
  menuItems,
  minimal, // skinny header: hide the kicker/title/subtitle, just the menu button
}) {
  const theme = getTableTheme(gameId);
  const accent = theme.accent;
  const [open, setOpen] = useState(false);
  // Landscape: shrink the header to reclaim scarce vertical space (portrait
  // is unchanged). Affects every game's header consistently.
  const { width, height } = useWindowDimensions();
  const compact = width > height;

  return (
    <View style={[styles.headerOuter, compact && styles.headerOuterCompact]}>
      {open && (
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close game menu"
        />
      )}

      <View
        style={[
          styles.headerCard,
          compact && styles.headerCardCompact,
          minimal && styles.headerCardMinimal,
          { zIndex: 2 },
        ]}
      >
        {/* ── Top row: always visible ── */}
        <View style={styles.row}>
          <View style={styles.leftZone}>
            {!minimal && !compact && (
              <Text
                style={[styles.kicker, { color: accent }]}
                numberOfLines={1}
              >
                {KICKER_LABELS[gameId] ?? gameId?.toUpperCase?.() ?? ""}
              </Text>
            )}

            {!minimal &&
              (leftInfo ? (
                <View style={styles.leftInfoWrap}>{leftInfo}</View>
              ) : (
                <>
                  <Text
                    style={[
                      styles.titleText,
                      compact && styles.titleTextCompact,
                    ]}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  {subtitle ? (
                    <Text style={styles.subtitleText} numberOfLines={1}>
                      {subtitle}
                    </Text>
                  ) : null}
                </>
              ))}
          </View>

          {extraButton ? (
            <View style={styles.extraZone}>{extraButton}</View>
          ) : null}

          <Pressable
            onPress={() => setOpen((v) => !v)}
            style={({ pressed }) => [
              styles.hamburgerBtn,
              compact && styles.hamburgerBtnCompact,
              pressed && styles.hamburgerBtnPressed,
              open && styles.hamburgerBtnOpen,
            ]}
            accessibilityRole="button"
            accessibilityLabel={open ? "Close game menu" : "Open game menu"}
          >
            <Text style={styles.hamburgerText}>{open ? "✕" : "☰"}</Text>
          </Pressable>
        </View>

        {/* ── Expanded menu items ── */}
        {open && (
          <>
            <MenuDivider />
            <GameMenuItems
              menuItems={menuItems}
              onClose={() => setOpen(false)}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerOuter: {
    width: "100%",
    paddingHorizontal: scale(14),
    paddingTop: scale(8),
    position: "relative",
  },
  headerOuterCompact: {
    paddingTop: scale(4),
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    zIndex: 1,
  },
  headerCard: {
    backgroundColor: "#0F1B2D",
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: "#243042",
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
  },
  headerCardCompact: {
    paddingVertical: scale(6),
    borderRadius: scale(12),
  },
  headerCardMinimal: {
    paddingVertical: scale(5),
    borderRadius: scale(12),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
  },
  leftZone: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: scaleFont(11),
    fontWeight: "900",
    marginBottom: scale(2),
  },
  leftInfoWrap: {
    gap: scale(2),
  },
  titleText: {
    color: "#f5f7fb",
    fontSize: scaleFont(22),
    fontWeight: "900",
  },
  titleTextCompact: {
    fontSize: scaleFont(16),
  },
  subtitleText: {
    color: "#a4b1c4",
    fontSize: scaleFont(14),
    lineHeight: scaleFont(18),
    marginTop: scale(2),
  },
  extraZone: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  hamburgerBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(14),
    backgroundColor: "rgba(20, 30, 55, 0.85)",
    borderWidth: 1,
    borderColor: "#334",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  hamburgerBtnCompact: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(12),
  },
  hamburgerBtnPressed: {
    opacity: 0.75,
  },
  hamburgerBtnOpen: {
    borderColor: "#7FB3FF",
    backgroundColor: "rgba(30, 50, 90, 0.95)",
  },
  hamburgerText: {
    color: "#ffffff",
    fontSize: scaleFont(18),
    fontWeight: "900",
    lineHeight: scaleFont(20),
  },
});
