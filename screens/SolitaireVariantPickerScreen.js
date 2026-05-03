import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import SolitaireVariantWheel from '../components/SolitaireVariantWheel';
import { SPIDER_MODE_OPTIONS, VARIANT_OPTIONS } from '../game/solitaire';

export default function SolitaireVariantPickerScreen({ navigation, route }) {
  const initialVariantId = route?.params?.variantId || VARIANT_OPTIONS[0].id;
  const [variantId, setVariantId] = useState(initialVariantId);
  const [spiderMode, setSpiderMode] = useState(4);

  const selectedVariant = useMemo(
    () => VARIANT_OPTIONS.find((option) => option.id === variantId) || VARIANT_OPTIONS[0],
    [variantId]
  );

  const startGame = () => {
    navigation.navigate('SolitaireGame', {
      variantId,
      spiderMode: variantId === 'spider' ? spiderMode : undefined,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>Card Games</Text>
        <Text style={styles.title}>Solitaire</Text>
        <Text style={styles.subtitle}>
          Pick a mode, then start a new game.
        </Text>

        <View style={styles.panel}>
          <SolitaireVariantWheel value={variantId} onChange={setVariantId} />

          {variantId === 'spider' ? (
            <View style={styles.modeBlock}>
              <Text style={styles.modeLabel}>Spider suits</Text>
              <View style={styles.modeRow}>
                {SPIDER_MODE_OPTIONS.map((option) => {
                  const selected = option.id === spiderMode;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => setSpiderMode(option.id)}
                      style={({ pressed }) => [
                        styles.modeChip,
                        selected && styles.modeChipSelected,
                        pressed && styles.modeChipPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modeChipText,
                          selected && styles.modeChipTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.preview}>
            <Text style={styles.previewLabel}>Selected</Text>
            <Text style={styles.previewTitle}>{selectedVariant.label}</Text>
            <Text style={styles.previewDescription}>
              {selectedVariant.description}
            </Text>
          </View>

          <Pressable
            onPress={startGame}
            style={({ pressed }) => [
              styles.playButton,
              pressed && styles.playButtonPressed,
            ]}
          >
            <Text style={styles.playButtonText}>Start Game</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f1115',
  },
  content: {
    padding: 18,
    gap: 14,
  },
  kicker: {
    color: '#7fb3ff',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: '#f5f7fb',
    fontSize: 34,
    fontWeight: '900',
  },
  subtitle: {
    color: '#95a2b6',
    fontSize: 15,
    lineHeight: 21,
  },
  panel: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#243042',
    backgroundColor: '#151a24',
    padding: 16,
    gap: 16,
  },
  modeBlock: {
    gap: 8,
  },
  modeLabel: {
    color: '#dce5f2',
    fontSize: 14,
    fontWeight: '800',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  modeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2c3750',
    backgroundColor: '#182131',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modeChipSelected: {
    borderColor: '#77aef7',
    backgroundColor: '#21314a',
  },
  modeChipPressed: {
    opacity: 0.9,
  },
  modeChipText: {
    color: '#d3dcec',
    fontSize: 12,
    fontWeight: '800',
  },
  modeChipTextSelected: {
    color: '#eef4ff',
  },
  preview: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#223049',
    backgroundColor: '#101521',
    padding: 14,
    gap: 4,
  },
  previewLabel: {
    color: '#8799b8',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    fontWeight: '800',
  },
  previewTitle: {
    color: '#f4f7fb',
    fontSize: 20,
    fontWeight: '900',
  },
  previewDescription: {
    color: '#a5b3c7',
    fontSize: 13,
    lineHeight: 18,
  },
  playButton: {
    borderRadius: 16,
    backgroundColor: '#77aef7',
    alignItems: 'center',
    paddingVertical: 14,
  },
  playButtonPressed: {
    opacity: 0.92,
  },
  playButtonText: {
    color: '#08111f',
    fontSize: 16,
    fontWeight: '900',
  },
});