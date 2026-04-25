import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Network from 'expo-network';
import { startServer, stopServer, setServerListeners } from '../game/GameNetwork';

export default function HostSetupScreen({ navigation }) {
  const [hostName, setHostName] = useState('');
  const [ipAddress, setIpAddress] = useState(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [serverReady, setServerReady] = useState(false);

  useEffect(() => {
    Network.getIpAddressAsync().then((ip) => setIpAddress(ip));

    // Start server (no args — listeners are set separately so Lobby can take over later)
    startServer();
    setServerReady(true);

    // Wire up handlers for this screen (just track the count)
    setServerListeners({
      onClientJoined: () => setPlayerCount((c) => c + 1),
      onClientLeft: () => setPlayerCount((c) => Math.max(0, c - 1)),
    });

    // Stop the server if the user backs out to the Home screen
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      stopServer();
    });

    return unsubscribe;
  }, []);

  function goToLobby() {
    const name = hostName.trim() || 'Host';
    navigation.navigate('Lobby', { role: 'host', hostName: name, hostIp: ipAddress });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Text style={styles.title}>Host a Game</Text>

      {/* Host name */}
      <Text style={styles.label}>Your Name</Text>
      <TextInput
        style={styles.nameInput}
        value={hostName}
        onChangeText={setHostName}
        placeholder="Enter your name"
        placeholderTextColor="#555570"
        maxLength={20}
        autoFocus
        returnKeyType="done"
      />

      {/* IP address card */}
      <View style={styles.ipBox}>
        <Text style={styles.ipLabel}>Your WiFi IP Address</Text>
        {ipAddress ? (
          <Text style={styles.ipAddress}>{ipAddress}</Text>
        ) : (
          <ActivityIndicator color="#e94560" size="large" style={{ marginVertical: 8 }} />
        )}
        <Text style={styles.ipHint}>Joining players will find your game automatically</Text>
      </View>

      {/* Server status + player count row */}
      <View style={styles.statusRow}>
        {serverReady && <View style={styles.dot} />}
        <Text style={styles.statusText}>
          {serverReady ? `${playerCount} player${playerCount !== 1 ? 's' : ''} connected · port 7777` : 'Starting…'}
        </Text>
      </View>

      {/* Go to Lobby button */}
      <TouchableOpacity style={styles.button} onPress={goToLobby}>
        <Text style={styles.buttonText}>Go to Lobby →</Text>
      </TouchableOpacity>

      <Text style={styles.footnote}>
        Everyone must be on the same WiFi or hotspot
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    color: '#b0b0c0',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  nameInput: {
    width: '100%',
    backgroundColor: '#16213e',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#334',
    color: '#ffffff',
    fontSize: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  ipBox: {
    width: '100%',
    backgroundColor: '#16213e',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e94560',
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  ipLabel: {
    color: '#b0b0c0',
    fontSize: 13,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ipAddress: {
    color: '#e94560',
    fontSize: 38,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginBottom: 6,
  },
  ipHint: {
    color: '#666680',
    fontSize: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4caf50',
    marginRight: 8,
  },
  statusText: {
    color: '#b0b0c0',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#e94560',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footnote: {
    color: '#555570',
    fontSize: 12,
    textAlign: 'center',
  },
});
