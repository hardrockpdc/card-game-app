import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { RUMMY_VARIANT_OPTIONS } from "../game/rummy";

function RummyVariantWheel({
  value,
  onChange,
  options = RUMMY_VARIANT_OPTIONS,
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
                styles.optionLabel,
                isSelected && styles.optionLabelSelected,
              ]}
            >
              {option.label}
            </Text>
            <Text
              style={[
                styles.optionDescription,
                isSelected && styles.optionDescriptionSelected,
              ]}
            >
              {option.description}
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
    minHeight: 64,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "transparent",
    justifyContent: "center",
  },
  optionSelected: {
    backgroundColor: "rgba(233, 69, 96, 0.12)",
    borderColor: "rgba(233, 69, 96, 0.8)",
  },
  optionPressed: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  optionLabel: {
    color: "#A7B3C9",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  optionLabelSelected: {
    color: "#F4F7FB",
  },
  optionDescription: {
    color: "#8FA0BA",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  optionDescriptionSelected: {
    color: "#DCE5F2",
  },
});

export default RummyVariantWheel;
