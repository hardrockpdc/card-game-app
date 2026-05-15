import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
} from "react-native";
import { scale, scaleFont } from "../game/responsive";
import {
  setServerListeners,
  broadcastToClients,
  getConnectedPlayers,
  setClientListeners,
  sendToHost,
  disconnectFromHost,
  startBroadcasting,
  stopBroadcasting,
} from "../game/GameNetwork";
import {
  getRummyVariantLabel,
  getRummyVariantPlayerLimits,
} from "../game/rummy";

const GAMES = [
  {
    id: "blackjack",
    label: "Blackjack",
    screen: "MultiplayerGame",
    available: true,
    hasAI: false,
    minPlayers: 2,
    maxPlayers: 4,
  },
  {
    id: "goFish",
    label: "Go Fish",
    screen: "GoFishGame",
    available: true,
    hasAI: true,
    minPlayers: 2,
    maxPlayers: 4,
  },
  {
    id: "conquian",
    label: "Conquián",
    screen: "ConquianGame",
    available: true,
    hasAI: true,
    minPlayers: 2,
    maxPlayers: 4,
  },
  {
    id: "poker",
    label: "Poker",
    screen: "PokerGame",
    available: true,
    hasAI: true,
    minPlayers: 2,
    maxPlayers: 5,
  },
  {
    id: "rummy",
    label: "Rummy",
    screen: "RummyGame",
    available: true,
    hasAI: true,
    minPlayers: 2,
    maxPlayers: 4,
  },
  {
    id: "wildRound",
    label: "Wild Round",
    screen: "WildRoundGame",
    available: true,
    hasAI: false,
    minPlayers: 3,
    maxPlayers: 8,
  },
  {
    id: "lastCard",
    label: "Last Card",
    screen: "LastCardGame",
    available: true,
    hasAI: true,
    minPlayers: 2,
    maxPlayers: 8,
  },
];

const DEFAULT_MAX_PLAYERS = 4;

export default function LobbyScreen({ navigation, route }) {
  const { role, hostName, hostIp, playerName } = route.params || {};
  const isHost = role === "host";
  const myName = isHost ? hostName || "Host" : playerName || "Player";

  const [players, setPlayers] = useState([
    { id: isHost ? "host" : "me", name: myName, isMe: true, isHost },
  ]);
  const [selectedGame, setSelectedGame] = useState("conquian");
  const [selectedPokerVariant, setSelectedPokerVariant] = useState(
    route.params?.selectedPokerVariant || "texasHoldem",
  );
  const [selectedRummyVariant, setSelectedRummyVariant] = useState(
    route.params?.selectedRummyVariant || "ginRummy",
  );
  const [tone, setTone] = useState("family");

  // Ref so server-listener closures always see the latest AI list
  const aiPlayersRef = useRef([]);

  const selectedGameDef = GAMES.find((g) => g.id === selectedGame);
  const rummyLimits = getRummyVariantPlayerLimits(selectedRummyVariant);
  const minPlayers =
    selectedGame === "rummy"
      ? rummyLimits.minPlayers
      : (selectedGameDef?.minPlayers ?? 2);
  const maxPlayers =
    selectedGame === "rummy"
      ? rummyLimits.maxPlayers
      : (selectedGameDef?.maxPlayers ?? DEFAULT_MAX_PLAYERS);
  const selectedPokerLabel =
    selectedPokerVariant === "texasHoldem"
      ? "Texas Hold'em"
      : selectedPokerVariant === "omaha"
        ? "Omaha"
        : selectedPokerVariant === "fiveCardDraw"
          ? "Five Card Draw"
          : "Seven Card Stud";
  const selectedRummyLabel = getRummyVariantLabel(selectedRummyVariant);

  // ─── HOST setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isHost) return;

    if (hostIp) startBroadcasting(myName, hostIp);

    const existing = getConnectedPlayers();
    if (existing.length > 0) {
      setPlayers((prev) => [
        ...prev,
        ...existing.map((p) => ({
          id: p.id,
          name: p.name,
          isMe: false,
          isHost: false,
        })),
      ]);
    }

    setServerListeners({
      onClientJoined: () => {},
      onClientLeft: ({ id }) => {
        setPlayers((prev) => prev.filter((p) => p.id !== id));
        broadcastToClients({
          type: "PLAYER_LIST",
          players: buildPlayerList(
            myName,
            getConnectedPlayers(),
            aiPlayersRef.current,
          ),
        });
      },
      onMessage: (msg, clientId) => {
        if (msg.type === "JOIN") {
          setPlayers((prev) => {
            const without = prev.filter((p) => p.id !== clientId);
            return [
              ...without,
              { id: clientId, name: msg.name, isMe: false, isHost: false },
            ];
          });
          broadcastToClients({
            type: "PLAYER_LIST",
            players: buildPlayerList(
              myName,
              getConnectedPlayers(),
              aiPlayersRef.current,
            ),
          });
        }
      },
    });

    if (existing.length > 0) {
      broadcastToClients({
        type: "PLAYER_LIST",
        players: buildPlayerList(myName, existing, aiPlayersRef.current),
      });
    }

    return () => stopBroadcasting();
  }, []);

  const incomingPokerVariant = route.params?.selectedPokerVariant;
  useEffect(() => {
    if (incomingPokerVariant) {
      setSelectedPokerVariant(incomingPokerVariant);
    }
  }, [incomingPokerVariant]);

  const incomingRummyVariant = route.params?.selectedRummyVariant;
  useEffect(() => {
    if (incomingRummyVariant) {
      setSelectedRummyVariant(incomingRummyVariant);
    }
  }, [incomingRummyVariant]);

  // ─── CLIENT setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isHost) return;

    setClientListeners({
      onMessage: (msg) => {
        if (msg.type === "PLAYER_LIST") {
          setPlayers(
            msg.players.map((p) => ({
              ...p,
              isMe: p.name === myName,
              isHost: p.isHost || false,
            })),
          );
        } else if (msg.type === "START_GAME") {
          const game = GAMES.find((g) => g.id === msg.gameType) || GAMES[0];
          const extra = msg.tone ? { tone: msg.tone } : {};
          navigation.replace(game.screen, {
            role: "client",
            myName,
            players: msg.players,
            variant:
              msg.variant || msg.selectedPokerVariant || selectedPokerVariant,
            variantId:
              msg.variantId || msg.selectedRummyVariant || selectedRummyVariant,
            ...extra,
          });
        }
      },
      onDisconnected: () => {
        Alert.alert("Disconnected", "Lost connection to the host.", [
          { text: "OK", onPress: () => navigation.navigate("Home") },
        ]);
      },
    });

    sendToHost({ type: "JOIN", name: myName });

    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (e.data?.action?.type === "GO_BACK") {
        disconnectFromHost();
      }
    });
    return unsubscribe;
  }, []);

  // ─── AI player management (host only) ────────────────────────────────────
  function handleAddAI() {
    setPlayers((prev) => {
      const aiCount = prev.filter((p) => p.isAI).length;
      const newAI = {
        id: `ai_${Date.now()}`,
        name: aiCount === 0 ? "Computer" : `Computer ${aiCount + 1}`,
        isAI: true,
        isMe: false,
        isHost: false,
      };
      const next = [...prev, newAI];
      aiPlayersRef.current = next.filter((p) => p.isAI);
      broadcastToClients({
        type: "PLAYER_LIST",
        players: buildPlayerList(
          myName,
          getConnectedPlayers(),
          aiPlayersRef.current,
        ),
      });
      return next;
    });
  }

  function handleRemoveAI(id) {
    setPlayers((prev) => {
      const next = prev.filter((p) => p.id !== id);
      aiPlayersRef.current = next.filter((p) => p.isAI);
      broadcastToClients({
        type: "PLAYER_LIST",
        players: buildPlayerList(
          myName,
          getConnectedPlayers(),
          aiPlayersRef.current,
        ),
      });
      return next;
    });
  }

  // ─── Start game ────────────────────────────────────────────────────────────
  function handleStartGame() {
    if (players.length < minPlayers) {
      Alert.alert(
        "Not enough players",
        minPlayers > 2
          ? `${selectedGameDef?.label} needs at least ${minPlayers} players.`
          : "Add a Computer or wait for another player to join.",
      );
      return;
    }

    if (players.length > maxPlayers) {
      Alert.alert(
        "Too many players",
        `${selectedGameDef?.label} only supports up to ${maxPlayers} players.`,
      );
      return;
    }

    const game = GAMES.find((g) => g.id === selectedGame);
    const extra = selectedGame === "wildRound" ? { tone } : {};
    const pokerExtra =
      selectedGame === "poker"
        ? {
            variant: selectedPokerVariant,
            selectedPokerVariant,
          }
        : {};
    const rummyExtra =
      selectedGame === "rummy"
        ? {
            variant: selectedRummyVariant,
            variantId: selectedRummyVariant,
            selectedRummyVariant,
          }
        : {};

    broadcastToClients({
      type: "START_GAME",
      players,
      gameType: selectedGame,
      ...extra,
      ...pokerExtra,
      ...rummyExtra,
    });

    navigation.replace(game.screen, {
      role: "host",
      myName,
      players,
      ...extra,
      ...pokerExtra,
      ...rummyExtra,
    });
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  const canAddAI =
    isHost && selectedGameDef?.hasAI && players.length < maxPlayers;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lobby</Text>

      {isHost && (
        <View style={styles.gameSelectorSection}>
          <Text style={styles.sectionLabel}>Game</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.gameScroll}
          >
            {GAMES.map((game) => (
              <TouchableOpacity
                key={game.id}
                style={[
                  styles.gameChip,
                  selectedGame === game.id && styles.gameChipSelected,
                ]}
                onPress={() => setSelectedGame(game.id)}
              >
                <Text
                  style={[
                    styles.gameChipText,
                    selectedGame === game.id && styles.gameChipTextSelected,
                  ]}
                >
                  {game.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedGame === "poker" && (
            <TouchableOpacity
              style={styles.pokerVariantBtn}
              onPress={() =>
                navigation.navigate("PokerVariantPicker", {
                  mode: "lobby",
                  currentVariant: selectedPokerVariant,
                })
              }
            >
              <Text style={styles.pokerVariantBtnText}>
                Poker Variant: {selectedPokerLabel}
              </Text>
            </TouchableOpacity>
          )}

          {selectedGame === "rummy" && (
            <TouchableOpacity
              style={styles.rummyVariantBtn}
              onPress={() =>
                navigation.navigate("RummyVariantPicker", {
                  mode: "lobby",
                  currentVariant: selectedRummyVariant,
                })
              }
            >
              <Text style={styles.rummyVariantBtnText}>
                Rummy Variant: {selectedRummyLabel}
              </Text>
            </TouchableOpacity>
          )}

          {selectedGame === "wildRound" && (
            <View style={styles.toneRow}>
              {[
                { id: "family", label: "Family 🧒" },
                { id: "mature", label: "Mature 🔞" },
              ].map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.toneChip,
                    tone === t.id && styles.toneChipSelected,
                  ]}
                  onPress={() => setTone(t.id)}
                >
                  <Text
                    style={[
                      styles.toneChipText,
                      tone === t.id && styles.toneChipTextSelected,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      <Text style={styles.sectionLabel}>
        Players ({players.length}/{maxPlayers})
      </Text>

      <FlatList
        data={players}
        keyExtractor={(item) => String(item.id)}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.playerRow}>
            <View style={[styles.avatar, item.isAI && styles.avatarAI]}>
              <Text style={styles.avatarText}>
                {item.isAI ? "🤖" : item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.playerName}>{item.name}</Text>
            <View style={styles.badges}>
              {item.isHost && <Text style={styles.badge}>HOST</Text>}
              {item.isMe && (
                <Text style={[styles.badge, styles.badgeMe]}>YOU</Text>
              )}
              {item.isAI && (
                <Text style={[styles.badge, styles.badgeAI]}>CPU</Text>
              )}
            </View>
            {isHost && item.isAI && (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemoveAI(item.id)}
              >
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {isHost ? (
        <View style={styles.bottomSection}>
          {hostIp && (
            <View style={styles.ipRow}>
              <Text style={styles.ipLabel}>Your IP: </Text>
              <Text style={styles.ipValue}>{hostIp}</Text>
            </View>
          )}
          {canAddAI && (
            <TouchableOpacity style={styles.addAIBtn} onPress={handleAddAI}>
              <Text style={styles.addAIBtnText}>+ Add Computer</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.waitingText}>
            {players.length < minPlayers
              ? `${selectedGameDef?.label} needs at least ${minPlayers} players`
              : players.length > maxPlayers
                ? `${selectedGameDef?.label} only supports up to ${maxPlayers} players`
                : "Ready! Tap Start Game when everyone is here."}
          </Text>
          <TouchableOpacity
            style={[
              styles.startButton,
              (players.length < minPlayers || players.length > maxPlayers) &&
                styles.startButtonDimmed,
            ]}
            onPress={handleStartGame}
          >
            <Text style={styles.startButtonText}>Start Game</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.bottomSection}>
          <Text style={styles.waitingText}>
            Waiting for the host to start the game…
          </Text>
        </View>
      )}
    </View>
  );
}

function buildPlayerList(hostName, connectedPlayers, aiPlayers) {
  return [
    { id: "host", name: hostName, isHost: true },
    ...connectedPlayers.map((p) => ({ id: p.id, name: p.name, isHost: false })),
    ...aiPlayers.map((p) => ({ id: p.id, name: p.name, isAI: true })),
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    padding: scale(20),
    paddingTop: scale(28),
  },
  title: {
    fontSize: scaleFont(28),
    color: "#ffffff",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: scale(24),
  },
  sectionLabel: {
    color: "#b0b0c0",
    fontSize: scaleFont(13),
    textTransform: "uppercase",
    letterSpacing: scale(1),
    marginBottom: scale(10),
  },
  list: {
    flex: 1,
    backgroundColor: "#16213e",
    borderRadius: scale(14),
    marginBottom: scale(16),
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: scale(14),
  },
  avatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#e94560",
    alignItems: "center",
    justifyContent: "center",
    marginRight: scale(14),
  },
  avatarAI: {
    backgroundColor: "#6a1b9a",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: scaleFont(18),
    fontWeight: "bold",
  },
  playerName: {
    flex: 1,
    color: "#ffffff",
    fontSize: scaleFont(18),
  },
  badges: {
    flexDirection: "row",
    gap: scale(6),
  },
  badge: {
    backgroundColor: "#2a2a4a",
    color: "#b0b0c0",
    fontSize: scaleFont(11),
    fontWeight: "bold",
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(6),
    letterSpacing: scale(0.5),
  },
  badgeMe: {
    backgroundColor: "#1a3a1a",
    color: "#4caf50",
  },
  badgeAI: {
    backgroundColor: "#3a1a5a",
    color: "#ce93d8",
  },
  removeBtn: {
    marginLeft: scale(10),
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: "#3a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtnText: {
    color: "#e94560",
    fontSize: scaleFont(13),
    fontWeight: "bold",
  },
  separator: {
    height: 1,
    backgroundColor: "#1a1a2e",
    marginHorizontal: scale(14),
  },
  bottomSection: {
    alignItems: "center",
    paddingBottom: scale(16),
    gap: scale(12),
  },
  ipRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16213e",
    borderRadius: scale(8),
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
  },
  ipLabel: { color: "#b0b0c0", fontSize: scaleFont(13) },
  ipValue: {
    color: "#e94560",
    fontSize: scaleFont(15),
    fontWeight: "bold",
    letterSpacing: scale(1),
  },
  addAIBtn: {
    backgroundColor: "#3a1a5a",
    borderWidth: 1.5,
    borderColor: "#6a1b9a",
    paddingHorizontal: scale(32),
    paddingVertical: scale(12),
    borderRadius: scale(10),
  },
  addAIBtnText: {
    color: "#ce93d8",
    fontSize: scaleFont(15),
    fontWeight: "bold",
  },
  waitingText: {
    color: "#b0b0c0",
    fontSize: scaleFont(14),
    textAlign: "center",
  },
  startButton: {
    backgroundColor: "#e94560",
    paddingHorizontal: scale(56),
    paddingVertical: scale(16),
    borderRadius: scale(10),
  },
  startButtonDimmed: {
    opacity: 0.4,
  },
  startButtonText: {
    color: "#ffffff",
    fontSize: scaleFont(20),
    fontWeight: "bold",
  },
  gameSelectorSection: {
    width: "100%",
    marginBottom: scale(16),
  },
  gameScroll: {
    flexDirection: "row",
  },
  pokerVariantBtn: {
    marginTop: scale(10),
    backgroundColor: "#16213e",
    borderWidth: 1.5,
    borderColor: "#6a1b9a",
    borderRadius: scale(10),
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    alignItems: "center",
  },
  pokerVariantBtnText: {
    color: "#d7d2ff",
    fontSize: scaleFont(13),
    fontWeight: "bold",
  },
  rummyVariantBtn: {
    marginTop: scale(10),
    backgroundColor: "#16213e",
    borderWidth: 1.5,
    borderColor: "#e94560",
    borderRadius: scale(10),
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    alignItems: "center",
  },
  rummyVariantBtnText: {
    color: "#ffd8df",
    fontSize: scaleFont(13),
    fontWeight: "bold",
  },
  gameChip: {
    backgroundColor: "#16213e",
    borderWidth: 1.5,
    borderColor: "#334",
    borderRadius: scale(20),
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    marginRight: scale(8),
  },
  gameChipSelected: {
    backgroundColor: "#e94560",
    borderColor: "#e94560",
  },
  gameChipText: {
    color: "#b0b0c0",
    fontSize: scaleFont(14),
    fontWeight: "bold",
  },
  gameChipTextSelected: {
    color: "#ffffff",
  },
  toneRow: { flexDirection: "row", gap: scale(10), marginTop: scale(10) },
  toneChip: {
    flex: 1,
    paddingVertical: scale(8),
    borderRadius: scale(10),
    backgroundColor: "#16213e",
    borderWidth: 1.5,
    borderColor: "#334",
    alignItems: "center",
  },
  toneChipSelected: { backgroundColor: "#9c27b0", borderColor: "#9c27b0" },
  toneChipText: {
    color: "#b0b0c0",
    fontSize: scaleFont(13),
    fontWeight: "bold",
  },
  toneChipTextSelected: { color: "#ffffff" },
});
