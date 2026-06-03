import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
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
export default function StatsStrip({ gameId, items, bare }) {
  const theme = getTableTheme(gameId);
  const accent = theme.accent;
  // Landscape: lay each stat out as "LABEL value" on one line and trim the
  // strip's padding, so it occupies a single short row instead of two.
  // `bare` drops the outer border/background so the strip can be embedded
  // inside another container (e.g. the game header) without a box-in-box look.
  // Inline "LABEL value" rows when landscape, or whenever embedded (`bare`)
  // so a header-merged strip stays a single compact line in any orientation.
  const { width, height } = useWindowDimensions();
  const dense = width > height || bare;
  return (
    <View
      style={[
        styles.strip,
        dense && styles.stripDense,
        bare ? styles.stripBare : { borderColor: toRgba(theme.accent, 0.12) },
      ]}
    >
      <View style={styles.row}>
        {items?.map((item, idx) => {
          const showDivider = idx !== 0;
          const baseValueColor = item?.accent ? accent : styles.value.color;
          const valueColor = item?.valueColor ?? baseValueColor;

          return (
            <View
              key={`${item?.label ?? "item"}-${idx}`}
              style={[
                styles.item,
                showDivider ? styles.itemDivider : null,
                dense && styles.itemDense,
              ]}
            >
              <Text
                style={[styles.label, dense && styles.labelDense]}
                numberOfLines={1}
              >
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
  stripDense: {
    paddingVertical: scale(3),
    marginTop: scale(4),
  },
  stripBare: {
    borderWidth: 0,
    backgroundColor: "transparent",
    marginTop: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: 0,
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
  itemDense: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(5),
    paddingVertical: 0,
  },
  labelDense: {
    marginBottom: 0,
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
