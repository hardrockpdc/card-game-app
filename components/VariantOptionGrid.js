import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { scale, scaleFont } from "../game/responsive";

const ACCENT = "#77AEF7";

const optionValue = (o) => o?.value ?? o?.id;
const optionLabel = (o) => o?.label ?? String(optionValue(o));

// Shared, responsive variant-option grid used by every game's variant picker so
// they all look identical (blue accent, bordered cards, labels + descriptions).
// - Portrait: a single column. With `fill`, the options share the available
//   height; otherwise they're a comfortable fixed height.
// - Landscape (and 2+ options): a 2-column grid so it stays compact.
export default function VariantOptionGrid({
  value,
  onChange,
  options = [],
  fill = false,
}) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const twoCol = isLandscape && options.length > 1;
  const showDesc = !isLandscape && height >= 620;

  return (
    <View
      style={[
        styles.list,
        twoCol && styles.listTwoCol,
        fill && !isLandscape && styles.listFill,
      ]}
    >
      {options.map((option) => {
        const v = optionValue(option);
        const selected = v === value;
        return (
          <Pressable
            key={String(v)}
            onPress={() => onChange?.(v)}
            accessibilityRole="button"
            accessibilityLabel={optionLabel(option)}
            style={({ pressed }) => [
              styles.option,
              twoCol
                ? styles.optionTwoCol
                : fill && !isLandscape
                  ? styles.optionFill
                  : styles.optionStatic,
              selected && styles.optionSelected,
              pressed && styles.optionPressed,
            ]}
          >
            <Text
              style={[
                styles.optionLabel,
                selected && styles.optionLabelSelected,
              ]}
              numberOfLines={1}
            >
              {optionLabel(option)}
            </Text>
            {showDesc && option.description ? (
              <Text
                style={[
                  styles.optionDesc,
                  selected && styles.optionDescSelected,
                ]}
                numberOfLines={1}
              >
                {option.description}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: scale(8),
  },
  listFill: {
    flex: 1,
    justifyContent: "center",
  },
  listTwoCol: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "center",
  },
  option: {
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "rgba(255,255,255,0.02)",
    paddingHorizontal: scale(16),
    justifyContent: "center",
  },
  optionFill: {
    flex: 1,
    minHeight: scale(48),
    maxHeight: scale(96),
  },
  optionStatic: {
    minHeight: scale(56),
    paddingVertical: scale(10),
  },
  optionTwoCol: {
    width: "48%",
    minHeight: scale(50),
    maxHeight: scale(64),
  },
  optionSelected: {
    borderColor: ACCENT,
    backgroundColor: "rgba(119, 174, 247, 0.12)",
  },
  optionPressed: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  optionLabel: {
    color: "#A7B3C9",
    fontSize: scaleFont(17),
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  optionLabelSelected: {
    color: "#F4F7FB",
  },
  optionDesc: {
    marginTop: scale(4),
    color: "#8FA0BA",
    fontSize: scaleFont(12),
  },
  optionDescSelected: {
    color: "#DCE5F2",
  },
});
