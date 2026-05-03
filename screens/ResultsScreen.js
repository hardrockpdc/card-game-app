import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { scale, scaleFont } from '../game/responsive';

export default function ResultsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Results Screen</Text>
      <Text style={styles.subtext}>Coming soon!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: scaleFont(28),
    color: '#ffffff',
    fontWeight: 'bold',
  },
  subtext: {
    fontSize: scaleFont(16),
    color: '#b0b0c0',
    marginTop: scale(10),
  },
});