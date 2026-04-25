import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
} from 'react-native';

const GAMES = [
  { id: 'blackjack', label: 'Blackjack', screen: 'MultiplayerGame', available: true },
  { id: 'goFish',    label: 'Go Fish',   screen: 'GoFishGame',      available: true },
  { id: 'conquian',  label: 'Conquián',  screen: 'ConquianGame',    available: true },
  { id: 'poker',     label: 'Poker',     screen: 'PokerGame',       available: true },
];
import {
  setServerListeners,
  broadcastToClients,
  getConnectedPlayers,
  setClientListeners,
  sendToHost,
  disconnectFromHost,
  startBroadcasting,
  stopBroadcasting,
} from '../game/GameNetwork';

export default function LobbyScreen({ navigation, route }) {
  const { role, hostName, hostIp, playerName } = route.params || {};
  const isHost = role === 'host';
  const myName = isHost ? (hostName || 'Host') : (playerName || 'Player');

  // Players list always starts with "me"
  // Host's id is always 'host'; clients get their numeric socket id from PLAYER_LIST
  const [players, setPlayers] = useState([
    { id: isHost ? 'host' : 'me', name: myName, isMe: true, isHost },
  ]);
  const [selectedGame, setSelectedGame] = useState('blackjack');

  // ─── HOST setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isHost) return;

    // Start advertising the game so the Join screen can find it automatically
    if (hostIp) startBroadcasting(myName, hostIp);

    // Load any players who already connected while on the HostSetup screen
    const existing = getConnectedPlayers();
    if (existing.length > 0) {
      setPlayers((prev) => [
        ...prev,
        ...existing.map((p) => ({ id: p.id, name: p.name, isMe: false, isHost: false })),
      ]);
    }

    // Take over server event handling now that we're in the Lobby
    setServerListeners({
      onClientJoined: () => {
        // Player connected but name not known yet — they'll send JOIN shortly
      },
      onClientLeft: ({ id }) => {
        setPlayers((prev) => prev.filter((p) => p.id !== id));
        // Broadcast updated list to remaining clients
        broadcastToClients({
          type: 'PLAYER_LIST',
          players: buildPlayerList(myName, getConnectedPlayers()),
        });
      },
      onMessage: (msg, clientId) => {
        if (msg.type === 'JOIN') {
          // Add (or update) this player in the list
          setPlayers((prev) => {
            const without = prev.filter((p) => p.id !== clientId);
            return [...without, { id: clientId, name: msg.name, isMe: false, isHost: false }];
          });
          // Broadcast fresh player list to all clients
          broadcastToClients({
            type: 'PLAYER_LIST',
            players: buildPlayerList(myName, getConnectedPlayers()),
          });
        }
      },
    });

    // If clients were already connected before the host navigated here,
    // they sent JOIN but there was no onMessage handler yet — broadcast now so they update.
    if (existing.length > 0) {
      broadcastToClients({
        type: 'PLAYER_LIST',
        players: buildPlayerList(myName, existing),
      });
    }

    return () => stopBroadcasting();
  }, []);

  // ─── CLIENT setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isHost) return;

    // Take over client event handling now that we're in the Lobby
    setClientListeners({
      onMessage: (msg) => {
        if (msg.type === 'PLAYER_LIST') {
          // Replace our list with the server's authoritative list,
          // but keep "me" tagged correctly
          setPlayers(
            msg.players.map((p) => ({
              ...p,
              isMe: p.name === myName,
              isHost: p.isHost || false,
            }))
          );
        } else if (msg.type === 'START_GAME') {
          const game = GAMES.find((g) => g.id === msg.gameType) || GAMES[0];
          navigation.replace(game.screen, {
            role: 'client',
            myName,
            players: msg.players,
          });
        }
      },
      onDisconnected: () => {
        Alert.alert('Disconnected', 'Lost connection to the host.', [
          { text: 'OK', onPress: () => navigation.navigate('Home') },
        ]);
      },
    });

    // Announce ourselves to the host
    sendToHost({ type: 'JOIN', name: myName });

    // Disconnect only when the user presses back — NOT when the app replaces
    // this screen with the game (navigation.replace fires beforeRemove too).
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (e.data?.action?.type === 'GO_BACK') {
        disconnectFromHost();
      }
    });
    return unsubscribe;
  }, []);

  // ─── Host starts the game ──────────────────────────────────────────────────
  function handleStartGame() {
    if (players.length < 2) {
      Alert.alert('Not enough players', 'Wait for at least one other player to join.');
      return;
    }
    const game = GAMES.find((g) => g.id === selectedGame);
    broadcastToClients({ type: 'START_GAME', players, gameType: selectedGame });
    navigation.replace(game.screen, { role: 'host', myName, players });
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lobby</Text>

      {isHost && (
        <View style={styles.gameSelectorSection}>
          <Text style={styles.sectionLabel}>Game</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gameScroll}>
            {GAMES.map((game) => (
              <TouchableOpacity
                key={game.id}
                style={[styles.gameChip, selectedGame === game.id && styles.gameChipSelected]}
                onPress={() => setSelectedGame(game.id)}
              >
                <Text style={[styles.gameChipText, selectedGame === game.id && styles.gameChipTextSelected]}>
                  {game.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={styles.sectionLabel}>Players ({players.length})</Text>

      <FlatList
        data={players}
        keyExtractor={(item) => String(item.id)}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.playerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.playerName}>{item.name}</Text>
            <View style={styles.badges}>
              {item.isHost && <Text style={styles.badge}>HOST</Text>}
              {item.isMe && <Text style={[styles.badge, styles.badgeMe]}>YOU</Text>}
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {isHost ? (
        <View style={styles.bottomSection}>
          <Text style={styles.waitingText}>
            {players.length === 1
              ? 'Waiting for players to join…'
              : 'Ready! Tap Start Game when everyone is here.'}
          </Text>
          <TouchableOpacity
            style={[styles.startButton, players.length < 2 && styles.startButtonDimmed]}
            onPress={handleStartGame}
          >
            <Text style={styles.startButtonText}>Start Game</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.bottomSection}>
          <Text style={styles.waitingText}>Waiting for the host to start the game…</Text>
        </View>
      )}
    </View>
  );
}

// Helper — builds the list the host broadcasts to clients
function buildPlayerList(hostName, connectedPlayers) {
  return [
    { id: 'host', name: hostName, isHost: true },
    ...connectedPlayers.map((p) => ({ id: p.id, name: p.name, isHost: false })),
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
    paddingTop: 28,
  },
  title: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  sectionLabel: {
    color: '#b0b0c0',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  list: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 14,
    marginBottom: 20,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e94560',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  playerName: {
    flex: 1,
    color: '#ffffff',
    fontSize: 18,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    backgroundColor: '#2a2a4a',
    color: '#b0b0c0',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    letterSpacing: 0.5,
  },
  badgeMe: {
    backgroundColor: '#1a3a1a',
    color: '#4caf50',
  },
  separator: {
    height: 1,
    backgroundColor: '#1a1a2e',
    marginHorizontal: 14,
  },
  bottomSection: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  waitingText: {
    color: '#b0b0c0',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  startButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 56,
    paddingVertical: 16,
    borderRadius: 10,
  },
  startButtonDimmed: {
    opacity: 0.4,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  gameSelectorSection: {
    width: '100%',
    marginBottom: 16,
  },
  gameScroll: {
    flexDirection: 'row',
  },
  gameChip: {
    backgroundColor: '#16213e',
    borderWidth: 1.5,
    borderColor: '#334',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  gameChipSelected: {
    backgroundColor: '#e94560',
    borderColor: '#e94560',
  },
  gameChipText: {
    color: '#b0b0c0',
    fontSize: 14,
    fontWeight: 'bold',
  },
  gameChipTextSelected: {
    color: '#ffffff',
  },
});
