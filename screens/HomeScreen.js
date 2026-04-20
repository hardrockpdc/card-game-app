import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎴 Card Games</Text>
      <Text style={styles.subtitle}>Play with friends, anywhere</Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('HostSetup')}
      >
        <Text style={styles.primaryButtonText}>Host a Game</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('Join')}
      >
        <Text style={styles.secondaryButtonText}>Join a Game</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.settingsLink}
        onPress={() => navigation.navigate('Game')}
      >
        <Text style={styles.settingsLinkText}>🧪 Test Game Screen</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.settingsLink}
        onPress={() => navigation.navigate('Settings')}
      >
        <Text style={styles.settingsLinkText}>⚙️ Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#b0b0c0',
    marginBottom: 60,
  },
  primaryButton: {
    backgroundColor: '#e94560',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 12,
    marginBottom: 16,
    width: '80%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e94560',
    width: '80%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#e94560',
    fontSize: 20,
    fontWeight: 'bold',
  },
  settingsLink: {
    position: 'absolute',
    bottom: 40,
  },
  settingsLinkText: {
    color: '#b0b0c0',
    fontSize: 16,
  },
});