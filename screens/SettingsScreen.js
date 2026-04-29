import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setTheme, getTheme, THEME_DEFS } from '../game/cardTheme';

export default function SettingsScreen() {
  const [activeTheme, setActiveTheme] = useState(getTheme());

  function handleSelect(id) {
    setTheme(id);
    setActiveTheme(id);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Settings</Text>

        <Text style={styles.sectionLabel}>Card Theme</Text>
        <Text style={styles.sectionHint}>Tap a theme — cards update live in all games</Text>

        <View style={styles.grid}>
          {THEME_DEFS.map((theme) => {
            const isActive = theme.id === activeTheme;
            return (
              <TouchableOpacity
                key={theme.id}
                style={[styles.themeCard, isActive && styles.themeCardActive]}
                onPress={() => handleSelect(theme.id)}
                activeOpacity={0.75}
              >
                <Image source={theme.preview} style={styles.previewImage} />
                <View style={styles.themeFooter}>
                  <Text style={[styles.themeLabel, isActive && styles.themeLabelActive]}>
                    {theme.label}
                  </Text>
                  {isActive && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#1a1a2e',
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 28,
  },
  sectionLabel: {
    color: '#b0b0c0',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  sectionHint: {
    color: '#666',
    fontSize: 13,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  themeCard: {
    width: '47%',
    backgroundColor: '#16213e',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#334',
  },
  themeCardActive: {
    borderColor: '#4caf50',
    backgroundColor: '#0d2e16',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 0.7,
    resizeMode: 'cover',
  },
  themeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  themeLabel: {
    color: '#b0b0c0',
    fontSize: 15,
    fontWeight: 'bold',
  },
  themeLabelActive: {
    color: '#4caf50',
  },
  checkmark: {
    color: '#4caf50',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
