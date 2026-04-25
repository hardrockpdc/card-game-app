import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { connectToHost, disconnectFromHost, startDiscovery, stopDiscovery } from '../game/GameNetwork';

const STALE_MS = 6000;       // remove a game from the list if not heard from in 6 s
const CONNECT_TIMEOUT_MS = 8000;

export default function JoinScreen({ navigation }) {
  const [playerName, setPlayerName] = useState('');
  const [games, setGames] = useState([]);           // [{ name, ip, lastSeen }]
  const [status, setStatus] = useState('idle');     // 'idle' | 'connecting' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [connectingIp, setConnectingIp] = useState(null);
  const timeoutRef = useRef(null);
  const staleRef = useRef(null);

  useEffect(() => {
    // Start listening for UDP game announcements
    startDiscovery(({ name, ip }) => {
      setGames((prev) => {
        const without = prev.filter((g) => g.ip !== ip);
        return [...without, { name, ip, lastSeen: Date.now() }];
      });
    });

    // Every 2 s, remove games we haven't heard from in STALE_MS
    staleRef.current = setInterval(() => {
      setGames((prev) => prev.filter((g) => Date.now() - g.lastSeen < STALE_MS));
    }, 2000);

    const unsubscribe = navigation.addListener('beforeRemove', () => {
      cleanup();
    });

    return () => {
      cleanup();
      unsubscribe();
    };
  }, []);

  function cleanup() {
    stopDiscovery();
    clearInterval(staleRef.current);
    clearTimeout(timeoutRef.current);
    disconnectFromHost();
  }

  function handleJoin(ip) {
    if (status === 'connecting') return;

    setStatus('connecting');
    setConnectingIp(ip);
    setErrorMsg('');

    timeoutRef.current = setTimeout(() => {
      disconnectFromHost();
      setStatus('error');
      setConnectingIp(null);
      setErrorMsg('Could not connect — make sure you\'re on the same WiFi.');
    }, CONNECT_TIMEOUT_MS);

    connectToHost(ip, {
      onConnected: () => {
        clearTimeout(timeoutRef.current);
        stopDiscovery();
        clearInterval(staleRef.current);
        const name = playerName.trim() || 'Player';
        navigation.navigate('Lobby', { role: 'client', playerName: name });
      },
      onDisconnected: () => {
        clearTimeout(timeoutRef.current);
        setStatus('error');
        setConnectingIp(null);
        setErrorMsg('Lost connection to host.');
      },
      onMessage: () => {},
      onError: (err) => {
        clearTimeout(timeoutRef.current);
        setStatus('error');
        setConnectingIp(null);
        setErrorMsg(err || 'Could not connect.');
      },
    });
  }

  const isConnecting = status === 'connecting';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Text style={styles.title}>Join a Game</Text>

      <Text style={styles.label}>Your Name</Text>
      <TextInput
        style={[styles.nameInput, isConnecting && styles.inputDisabled]}
        value={playerName}
        onChangeText={setPlayerName}
        placeholder="Enter your name"
        placeholderTextColor="#555570"
        maxLength={20}
        autoFocus
        returnKeyType="done"
        editable={!isConnecting}
      />

      <Text style={styles.label}>Available Games</Text>

      {games.length === 0 ? (
        <View style={styles.emptyBox}>
          <ActivityIndicator color="#e94560" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyText}>Looking for games on your WiFi…</Text>
          <Text style={styles.emptyHint}>Make sure the host has tapped "Host a Game"</Text>
        </View>
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => item.ip}
          style={styles.list}
          renderItem={({ item }) => {
            const thisConnecting = isConnecting && connectingIp === item.ip;
            return (
              <View style={styles.gameRow}>
                <View style={styles.gameInfo}>
                  <Text style={styles.gameName}>{item.name}'s game</Text>
                  <Text style={styles.gameIp}>{item.ip}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.joinBtn, isConnecting && styles.joinBtnDisabled]}
                  onPress={() => handleJoin(item.ip)}
                  disabled={isConnecting}
                >
                  {thisConnecting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.joinBtnText}>Join</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {status === 'error' && errorMsg ? (
        <Text style={styles.errorText}>{errorMsg}</Text>
      ) : null}

      <Text style={styles.hint}>
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
    marginBottom: 8,
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
  inputDisabled: { opacity: 0.5 },
  emptyBox: {
    width: '100%',
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: '#b0b0c0',
    fontSize: 15,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyHint: {
    color: '#555570',
    fontSize: 13,
    textAlign: 'center',
  },
  list: {
    width: '100%',
    backgroundColor: '#16213e',
    borderRadius: 14,
    marginBottom: 16,
    maxHeight: 260,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  gameInfo: { flex: 1 },
  gameName: { color: '#ffffff', fontSize: 17, fontWeight: 'bold' },
  gameIp: { color: '#666680', fontSize: 13, marginTop: 2 },
  joinBtn: {
    backgroundColor: '#e94560',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  joinBtnDisabled: { opacity: 0.5 },
  joinBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  separator: {
    height: 1,
    backgroundColor: '#1a1a2e',
    marginHorizontal: 16,
  },
  errorText: {
    color: '#e94560',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  hint: {
    color: '#555570',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
});
