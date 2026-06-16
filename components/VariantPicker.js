import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { HapticPressable as Pressable } from "./Haptic";

const DEFAULT_ACCENT_COLOR = "#E94560";

function hexToRgba(hex, alpha) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getOptionValue(option) {
  return option?.value ?? option?.id ?? "";
}

function getOptionLabel(option) {
  return option?.label ?? String(getOptionValue(option));
}

function VariantPicker({
  value,
  onChange,
  options = [],
  style,
  accentColor = DEFAULT_ACCENT_COLOR,
}) {
  const selectedBg = hexToRgba(accentColor, 0.12);

  return (
    <View style={[styles.container, style]}>
      {options.map((option) => {
        const optionValue = getOptionValue(option);
        const isSelected = optionValue === value;
        const hasDescription = Boolean(option?.description);

        return (
          <Pressable
            key={String(optionValue)}
            accessibilityRole="button"
            accessibilityLabel={getOptionLabel(option)}
            onPress={() => onChange?.(optionValue)}
            style={({ pressed }) => [
              styles.option,
              pressed && styles.optionPressed,
              isSelected && {
                borderColor: accentColor,
                backgroundColor: selectedBg,
              },
            ]}
          >
            <Text
              style={[
                styles.optionLabel,
                isSelected && styles.optionLabelSelected,
              ]}
            >
              {getOptionLabel(option)}
            </Text>

            {hasDescription ? (
              <Text
                style={[
                  styles.optionDescription,
                  isSelected && styles.optionDescriptionSelected,
                ]}
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
  container: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#0B1320",
    padding: 12,
    gap: 10,
  },
  option: {
    minHeight: 60,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
    justifyContent: "center",
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
    marginTop: 4,
    color: "#8FA0BA",
    fontSize: 12,
    lineHeight: 16,
  },
  optionDescriptionSelected: {
    color: "#DCE5F2",
  },
});

export default VariantPicker;
