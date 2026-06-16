import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Alert,
  BackHandler,
} from "react-native";
import { HapticTouchable as TouchableOpacity } from "../components/Haptic";
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
  stopServer,
  getAssignedClientId,
} from "../game/GameNetwork";
import {
  getRummyVariantPlayerLimits,
  RUMMY_VARIANT_OPTIONS,
} from "../game/rummy";
import ScrollWheelPicker from "../components/ScrollWheelPicker";
import { POKER_VARIANT_OPTIONS } from "../components/PokerVariantWheel";
import ProfileAvatar from "../components/ProfileAvatar";
import { loadProfile, subscribeProfile } from "../game/profile";

const GAMES = [
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
const DEFAULT_POKER_VARIANT = "texasHoldem";
const DEFAULT_RUMMY_VARIANT = "ginRummy";

const WHEEL_OPTIONS = [
  { value: "goFish", title: "Go Fish" },
  { value: "conquian", title: "Conquián" },

  ...POKER_VARIANT_OPTIONS.map((v) => ({
    value: `poker:${v.value}`,
    title: "Poker",
    subtitle: v.label,
  })),

  ...RUMMY_VARIANT_OPTIONS.map((v) => ({
    value: `rummy:${v.value}`,
    title: "Rummy",
    subtitle: v.label,
  })),

  { value: "wildRound:family", title: "Wild Round", subtitle: "Family 🧒" },
  { value: "wildRound:mature", title: "Wild Round", subtitle: "Mature 🔞" },

  { value: "lastCard", title: "Last Card" },
];

function parseLobbySelection(value) {
  const safe = String(value ?? "conquian");
  if (safe.startsWith("poker:")) {
    return {
      gameId: "poker",
      pokerVariant: safe.split(":")[1] || DEFAULT_POKER_VARIANT,
    };
  }
  if (safe.startsWith("rummy:")) {
    return {
      gameId: "rummy",
      rummyVariant: safe.split(":")[1] || DEFAULT_RUMMY_VARIANT,
    };
  }
  if (safe.startsWith("wildRound:")) {
    return {
      gameId: "wildRound",
      tone: safe.split(":")[1] === "mature" ? "mature" : "family",
    };
  }
  return { gameId: safe };
}

export default function LobbyScreen({ navigation, route }) {
  const { role, hostName, hostIp, playerName } = route.params || {};
  const isHost = role === "host";
  const myName = isHost ? hostName || "Host" : playerName || "Player";

  const initialWheelValue = useMemo(() => {
    const incomingPokerVariant = route.params?.selectedPokerVariant;
    const incomingRummyVariant = route.params?.selectedRummyVariant;
    const incomingTone = route.params?.tone;

    if (incomingPokerVariant) return `poker:${incomingPokerVariant}`;
    if (incomingRummyVariant) return `rummy:${incomingRummyVariant}`;
    if (incomingTone) return `wildRound:${incomingTone}`;
    return "conquian";
  }, []);

  const [players, setPlayers] = useState([
    { id: isHost ? "host" : "me", name: myName, isMe: true, isHost },
  ]);

  const [selectedWheelValue, setSelectedWheelValue] =
    useState(initialWheelValue);

  // Local player's profile, so their own row shows their picture.
  const [myProfile, setMyProfile] = useState(null);
  useEffect(() => {
    let mounted = true;
    loadProfile().then((p) => {
      if (mounted) setMyProfile(p);
    });
    const unsub = subscribeProfile((p) => setMyProfile(p));
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const parsedSelection = useMemo(
    () => parseLobbySelection(selectedWheelValue),
    [selectedWheelValue],
  );

  const selectedGame = parsedSelection.gameId;
  const selectedPokerVariant =
    parsedSelection.gameId === "poker"
      ? parsedSelection.pokerVariant || DEFAULT_POKER_VARIANT
      : undefined;
  const selectedRummyVariant =
    parsedSelection.gameId === "rummy"
      ? parsedSelection.rummyVariant || DEFAULT_RUMMY_VARIANT
      : undefined;
  const tone =
    parsedSelection.gameId === "wildRound" ? parsedSelection.tone : undefined;

  const selectedGameDef = GAMES.find((g) => g.id === selectedGame) || GAMES[0];

  const rummyLimits = getRummyVariantPlayerLimits(
    selectedRummyVariant || DEFAULT_RUMMY_VARIANT,
  );

  const minPlayers =
    selectedGame === "rummy"
      ? rummyLimits.minPlayers
      : (selectedGameDef?.minPlayers ?? 2);

  const maxPlayers =
    selectedGame === "rummy"
      ? rummyLimits.maxPlayers
      : (selectedGameDef?.maxPlayers ?? DEFAULT_MAX_PLAYERS);

  const wheelAccentColor =
    selectedGame === "poker"
      ? "#C1121F"
      : selectedGame === "rummy"
        ? "#E94560"
        : selectedGame === "wildRound"
          ? "#77AEF7"
          : "#E94560";

  // Ref so server-listener closures always see the latest AI list
  const aiPlayersRef = useRef([]);

  // Assigned numeric clientId from host (set via ASSIGNED_ID TCP message)
  const assignedClientIdRef = useRef(null);

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

  // ─── CLIENT setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isHost) return;

    setClientListeners({
      onMessage: (msg) => {
        if (msg.type === "ASSIGNED_ID") {
          assignedClientIdRef.current = msg.clientId;
          return;
        }

        if (msg.type === "PLAYER_LIST") {
          const myId = assignedClientIdRef.current;

          setPlayers(
            msg.players.map((p) => {
              const isMeById =
                myId !== null && myId !== undefined
                  ? String(p.id) === String(myId)
                  : false;

              return {
                ...p,
                isMe: isMeById ? true : p.name === myName,
                isHost: p.isHost || false,
              };
            }),
          );
        } else if (msg.type === "START_GAME") {
          const game = GAMES.find((g) => g.id === msg.gameType) || GAMES[0];
          const extra = msg.tone ? { tone: msg.tone } : {};
          navigation.replace(game.screen, {
            role: "client",
            myName,
            assignedClientId: assignedClientIdRef.current,
            players: msg.players,
            variant:
              msg.variant || msg.selectedPokerVariant || DEFAULT_POKER_VARIANT,
            variantId:
              msg.variantId ||
              msg.selectedRummyVariant ||
              DEFAULT_RUMMY_VARIANT,
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

    // Join host
    // (server listeners will fill our player list)
    // eslint-disable-next-line no-unused-vars
    navigation;

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

  // UX-5: Android hardware back confirmation
  useEffect(() => {
    const onBack = () => {
      Alert.alert(
        "Leave Lobby?",
        isHost
          ? "You'll stop hosting and disconnect everyone."
          : "You'll be disconnected from the host.",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: () => {
              if (isHost) {
                stopServer();
                stopBroadcasting();
              } else {
                disconnectFromHost();
              }
              navigation.navigate("Home");
            },
          },
        ],
      );
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => sub.remove();
  }, [navigation, isHost]);

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

    const extra = selectedGame === "wildRound" ? { tone } : {};
    const pokerExtra =
      selectedGame === "poker"
        ? {
            variant: selectedPokerVariant,
            selectedPokerVariant: selectedPokerVariant,
          }
        : {};
    const rummyExtra =
      selectedGame === "rummy"
        ? {
            variant: selectedRummyVariant,
            variantId: selectedRummyVariant,
            selectedRummyVariant: selectedRummyVariant,
          }
        : {};

    stopBroadcasting();
    broadcastToClients({
      type: "START_GAME",
      players,
      gameType: selectedGame,
      ...extra,
      ...pokerExtra,
      ...rummyExtra,
    });

    navigation.replace(selectedGameDef.screen, {
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
      <View style={styles.suitRow}>
        <Text style={[styles.suit, styles.suitRed]}>♥</Text>
        <Text style={styles.suit}>♠</Text>
        <Text style={[styles.suit, styles.suitRed]}>♦</Text>
        <Text style={styles.suit}>♣</Text>
      </View>

      {isHost && (
        <View style={styles.gameSelectorSection}>
          <Text style={styles.sectionLabel}>Game</Text>

          <ScrollWheelPicker
            options={WHEEL_OPTIONS}
            value={selectedWheelValue}
            onChange={setSelectedWheelValue}
            itemHeight={48}
            visibleCount={3}
            accentColor={wheelAccentColor}
            style={{ marginTop: 0 }}
            titleFontSize={14}
            subtitleFontSize={10}
          />
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
            {item.isMe ? (
              <ProfileAvatar
                profile={myProfile}
                name={item.name}
                size={scale(40)}
                style={styles.avatarSpacing}
              />
            ) : (
              <View style={[styles.avatar, item.isAI && styles.avatarAI]}>
                <Text style={styles.avatarText}>
                  {item.isAI ? "🤖" : item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
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
          <Text style={styles.waitingText}>
            {players.length < minPlayers
              ? `${selectedGameDef?.label} needs at least ${minPlayers} players`
              : players.length > maxPlayers
                ? `${selectedGameDef?.label} only supports up to ${maxPlayers} players`
                : "Ready! Tap Start Game when everyone is here."}
          </Text>

          {canAddAI && (
            <TouchableOpacity style={styles.addAIBtn} onPress={handleAddAI}>
              <Text style={styles.addAIBtnText}>+ Add Computer</Text>
            </TouchableOpacity>
          )}

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
    paddingTop: scale(12),
  },
  title: {
    fontSize: scaleFont(28),
    color: "#ffffff",
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.5,
    textShadowColor: "rgba(233,69,96,0.35)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
    marginBottom: scale(8),
  },
  suitRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: scale(16),
    marginBottom: scale(16),
  },
  suit: { color: "#5b5b75", fontSize: scaleFont(16) },
  suitRed: { color: "#e94560" },
  sectionLabel: {
    color: "#c4c4d4",
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
  avatarSpacing: {
    marginRight: scale(14),
  },
  avatarText: {
    color: "#ffffff",
    fontSize: scaleFont(18),
    fontWeight: "bold",
  },
  playerName: {
    flex: 1,
    color: "#ffffff",
    fontSize: scaleFont(16),
    fontWeight: "600",
  },
  badges: {
    flexDirection: "row",
    gap: scale(6),
  },
  badge: {
    backgroundColor: "#2a2a4a",
    color: "#c4c4d4",
    fontSize: scaleFont(10),
    fontWeight: "bold",
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(6),
    letterSpacing: scale(0.5),
    overflow: "hidden",
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
  addAIBtn: {
    backgroundColor: "#3a1a5a",
    borderWidth: 1.5,
    borderColor: "#6a1b9a",
    paddingHorizontal: scale(32),
    paddingVertical: scale(12),
    borderRadius: scale(14),
  },
  addAIBtnText: {
    color: "#ce93d8",
    fontSize: scaleFont(15),
    fontWeight: "bold",
  },
  waitingText: {
    color: "#c4c4d4",
    fontSize: scaleFont(14),
    textAlign: "center",
  },
  startButton: {
    backgroundColor: "#e94560",
    borderWidth: 1,
    borderColor: "#ff6b81",
    paddingHorizontal: scale(56),
    paddingVertical: scale(16),
    borderRadius: scale(16),
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
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
    marginBottom: scale(10),
  },
});
