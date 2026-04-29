import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const contentMaxWidth = isTablet ? 560 : 460;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.content, { maxWidth: contentMaxWidth }]}>

          <Text style={styles.title}>Settings</Text>

          <Text style={styles.sectionLabel}>Appearance</Text>

          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('CardThemes')}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🃏</Text>
              <View>
                <Text style={styles.rowTitle}>Card Themes</Text>
                <Text style={styles.rowSubtitle}>Choose your card art style</Text>
              </View>
            </View>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>

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
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
  },
  sectionLabel: {
    color: '#b0b0c0',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#16213e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: '#334',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rowIcon: {
    fontSize: 28,
  },
  rowTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  rowSubtitle: {
    color: '#b0b0c0',
    fontSize: 13,
  },
  rowArrow: {
    color: '#b0b0c0',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
