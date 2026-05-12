import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { scale, scaleFont } from "../game/responsive";
import { getTableTheme } from "../game/tableThemes";

/**
 * Single-row (wraps on narrow screens) live stats strip.
 *
 * Props:
 * - gameId: string (used to pull accent color from getTableTheme)
 * - items: Array<{ label: string, value: string | number, accent?: boolean }>
 */
export default function StatsStrip({ gameId, items }) {
  const theme = getTableTheme(gameId);
  const accent = theme.accent;
  const { width } = useWindowDimensions();

  const itemsPerRow = width < 360 ? 2 : 3;
  const itemBasis = Math.max(90, Math.floor(width / itemsPerRow) - scale(6));

  return (
    <View style={[styles.strip, { borderColor: `${theme.accent}20` }]}>
      <View style={styles.row}>
        {items?.map((item, idx) => {
          const isFirst = idx === 0;
          const valueColor = item?.accent ? accent : styles.value.color;

          return (
            <View
              key={`${item?.label ?? "item"}-${idx}`}
              style={[
                styles.item,
                !isFirst ? styles.itemDivider : null,
                { flexBasis: itemBasis, maxWidth: itemBasis },
              ]}
            >
              <Text style={styles.label} numberOfLines={1}>
                {(item?.label ?? "").toUpperCase()}
              </Text>
              <Text style={[styles.value, { color: valueColor }]}>
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
    paddingHorizontal: scale(14),
    paddingVertical: scale(6),
    marginTop: scale(6),
    borderRadius: scale(14),
    borderWidth: 1,
    backgroundColor: "rgba(15, 27, 45, 0.35)",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: scale(4),
  },
  item: {
    paddingVertical: scale(2),
    paddingHorizontal: scale(8),
    flexGrow: 0,
    flexShrink: 0,
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
