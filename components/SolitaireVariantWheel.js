import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { VARIANT_OPTIONS } from '../game/solitaire';

export default function SolitaireVariantWheel({
  value = VARIANT_OPTIONS[0]?.id,
  onChange,
  options = VARIANT_OPTIONS,
}) {
  return (
    <View style={styles.wheel}>
      {options.map((option) => {
        const selected = option.id === value;

        return (
          <Pressable
            key={option.id}
            onPress={() => onChange?.(option.id)}
            style={({ pressed }) => [
              styles.option,
              selected && styles.optionSelected,
              pressed && styles.optionPressed,
            ]}
          >
            <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
              {option.label}
            </Text>
            <Text style={[styles.optionDescription, selected && styles.optionDescriptionSelected]}>
              {option.description}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wheel: {
    gap: 10,
  },
  option: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2a3346',
    backgroundColor: '#171d2a',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionSelected: {
    borderColor: '#7fb3ff',
    backgroundColor: '#202a3f',
  },
  optionPressed: {
    opacity: 0.88,
  },
  optionLabel: {
    color: '#f2f6ff',
    fontSize: 17,
    fontWeight: '700',
  },
  optionLabelSelected: {
    color: '#cfe2ff',
  },
  optionDescription: {
    color: '#9aa8bf',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  optionDescriptionSelected: {
    color: '#d1ddf0',
  },
});