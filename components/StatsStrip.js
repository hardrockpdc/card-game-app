import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { scale, scaleFont } from "../game/responsive";
import { getTableTheme } from "../game/tableThemes";

function toRgba(hex, alpha) {
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  if (h.length === 8) h = h.substring(0, 6);
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Single-row live stats strip. Items share space equally and never wrap.
 *
 * Props:
 * - gameId: string (used to pull accent color from getTableTheme)
 * - items: Array<{ label: string, value: string | number, accent?: boolean }>
 */
export default function StatsStrip({ gameId, items }) {
  const theme = getTableTheme(gameId);
  const accent = theme.accent;
  return (
    <View style={[styles.strip, { borderColor: toRgba(theme.accent, 0.12) }]}>
      <View style={styles.row}>
        {items?.map((item, idx) => {
          const showDivider = idx !== 0;
          const baseValueColor = item?.accent ? accent : styles.value.color;
          const valueColor = item?.valueColor ?? baseValueColor;

          return (
            <View
              key={`${item?.label ?? "item"}-${idx}`}
              style={[styles.item, showDivider ? styles.itemDivider : null]}
            >
              <Text style={styles.label} numberOfLines={1}>
                {(item?.label ?? "").toUpperCase()}
              </Text>
              <Text
                style={[styles.value, { color: valueColor }]}
                numberOfLines={1}
              >
                {typeof item?.value === "number"
                  ? String(item.value)
                  : (item?.value ?? "—")}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    width: "100%",
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    marginTop: scale(6),
    borderRadius: scale(14),
    borderWidth: 1,
    backgroundColor: "rgba(15, 27, 45, 0.35)",
  },
  row: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
  },
  item: {
    flex: 1,
    minWidth: 0,
    paddingVertical: scale(2),
    paddingHorizontal: scale(6),
  },
  itemDivider: {
    borderLeftWidth: 1,
    borderLeftColor: "#243042",
  },
  label: {
    fontSize: scaleFont(10),
    letterSpacing: 0.5,
    fontWeight: "800",
    color: "#95a4bb",
    marginBottom: scale(2),
  },
  value: {
    fontSize: scaleFont(13),
    fontWeight: "900",
    color: "#f5f7fb",
  },
});
