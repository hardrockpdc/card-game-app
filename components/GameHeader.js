import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { scale, scaleFont } from "../game/responsive";
import { getTableTheme } from "../game/tableThemes";
import GameMenu from "./GameMenu";

export default function GameHeader({
  gameId,
  title,
  subtitle,
  leftInfo,
  extraButton,
  menuItems,
}) {
  const theme = getTableTheme(gameId);
  const accent = theme.accent;

  return (
    <View style={[styles.headerOuter]}>
      <View style={styles.headerCard}>
        <View style={styles.row}>
          <View style={styles.leftZone}>
            <Text style={[styles.kicker, { color: accent }]} numberOfLines={1}>
              {title?.toUpperCase?.() ?? ""}
            </Text>

            {leftInfo ? (
              <View style={styles.leftInfoWrap}>{leftInfo}</View>
            ) : (
              <>
                <Text style={styles.titleText} numberOfLines={1}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text style={styles.subtitleText} numberOfLines={1}>
                    {subtitle}
                  </Text>
                ) : null}
              </>
            )}
          </View>

          {extraButton ? (
            <View style={styles.extraZone}>{extraButton}</View>
          ) : null}

          <View style={styles.menuZone}>
            <GameMenu menuItems={menuItems} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerOuter: {
    width: "100%",
    paddingHorizontal: scale(14),
    paddingTop: scale(8),
  },
  headerCard: {
    backgroundColor: "#0F1B2D",
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: "#243042",
    padding: scale(14),
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
    marginTop: scale(0),
    marginBottom: scale(0),
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
  menuZone: {
    flexShrink: 0,
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
