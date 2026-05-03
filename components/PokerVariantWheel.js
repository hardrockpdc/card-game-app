import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export const POKER_VARIANT_OPTIONS = [
  { value: "texasHoldem", label: "Texas Hold'em" },
  { value: "omaha", label: "Omaha" },
  { value: "fiveCardDraw", label: "Five Card Draw" },
  { value: "sevenCardStud", label: "Seven Card Stud" },
];

function PokerVariantWheel({
  value,
  onChange,
  options = POKER_VARIANT_OPTIONS,
  style,
}) {
  return (
    <View style={[styles.container, style]}>
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            onPress={() => onChange?.(option.value)}
            style={({ pressed }) => [
              styles.option,
              isSelected && styles.optionSelected,
              pressed && styles.optionPressed,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                isSelected && styles.optionTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#0B1320",
    padding: 12,
    gap: 10,
  },
  option: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  optionSelected: {
    backgroundColor: "rgba(193, 18, 31, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(193, 18, 31, 0.8)",
  },
  optionPressed: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  optionText: {
    color: "#A7B3C9",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  optionTextSelected: {
    color: "#F4F7FB",
    fontSize: 18,
  },
});

export default PokerVariantWheel;
