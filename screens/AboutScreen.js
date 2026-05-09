import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { scale, scaleFont } from '../game/responsive';
import appJson from '../app.json';

const VERSION = appJson.expo.version;
const YEAR = new Date().getFullYear();
const PRIVACY_POLICY_URL = 'https://hardrockpdc.github.io/card-game-app/privacy';

export default function AboutScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.emoji}>🎴</Text>
        <Text style={styles.appName}>Card Night</Text>
        <Text style={styles.version}>Version {VERSION}</Text>

        <Text style={styles.description}>
          A local multiplayer card game collection for friends and family.
          Play Blackjack, Rummy, Go Fish, Poker, Solitaire, Conquián,
          Last Card, and Wild Round — all offline, no internet required.
        </Text>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Created by</Text>
          <Text style={styles.rowValue}>Pedro</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Built with</Text>
          <Text style={styles.rowValue}>React Native + Expo</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Copyright</Text>
          <Text style={styles.rowValue}>© {YEAR} Pedro</Text>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => {})}
          accessibilityRole="link"
        >
          <Text style={styles.linkText}>Privacy Policy</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    padding: scale(28),
    paddingTop: scale(40),
  },
  emoji: {
    fontSize: scaleFont(56),
    marginBottom: scale(8),
  },
  appName: {
    color: '#ffffff',
    fontSize: scaleFont(32),
    fontWeight: 'bold',
    marginBottom: scale(4),
  },
  version: {
    color: '#b0b0c0',
    fontSize: scaleFont(14),
    marginBottom: scale(24),
  },
  description: {
    color: '#c0c0d4',
    fontSize: scaleFont(15),
    textAlign: 'center',
    lineHeight: scale(22),
    marginBottom: scale(24),
    maxWidth: 380,
  },
  divider: {
    width: '100%',
    maxWidth: 380,
    height: 1,
    backgroundColor: '#2a2a44',
    marginVertical: scale(16),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 380,
    paddingVertical: scale(10),
    paddingHorizontal: scale(4),
  },
  rowLabel: {
    color: '#888898',
    fontSize: scaleFont(14),
  },
  rowValue: {
    color: '#e0e0f0',
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    paddingVertical: scale(14),
    paddingHorizontal: scale(4),
  },
  linkText: {
    color: '#8888ff',
    fontSize: scaleFont(15),
  },
  linkArrow: {
    color: '#8888ff',
    fontSize: scaleFont(18),
  },
  backBtn: {
    marginTop: scale(32),
    paddingVertical: scale(12),
    paddingHorizontal: scale(32),
    borderRadius: scale(10),
    borderWidth: 1.5,
    borderColor: '#4a4a6a',
  },
  backBtnText: {
    color: '#b0b0c0',
    fontSize: scaleFont(16),
    fontWeight: '600',
  },
});
