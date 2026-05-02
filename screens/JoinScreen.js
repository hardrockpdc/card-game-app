import React, { useState, useRef, useEffect } from "react";
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
} from "react-native";
import {
  connectToHost,
  disconnectFromHost,
  startDiscovery,
  stopDiscovery,
} from "../game/GameNetwork";
import { loadProfile, getDisplayName } from "../game/profile";

const STALE_MS = 6000;
const CONNECT_TIMEOUT_MS = 8000;

export default function JoinScreen({ navigation }) {
  const [playerName, setPlayerName] = useState("Player");
  const [games, setGames] = useState([]);
  const [status, setStatus] = useState("idle"); // 'idle' | 'connecting' | 'error'
  const [errorMsg, setErrorMsg] = useState("");
  const [connectingIp, setConnectingIp] = useState(null);
  const [manualIp, setManualIp] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const timeoutRef = useRef(null);
  const staleRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapProfile() {
      const profile = await loadProfile();
      if (!isMounted) {
        return;
      }

      const name = getDisplayName(profile);
      setPlayerName(name);
      setIsLoadingProfile(false);

      if (!profile?.name) {
        navigation.navigate("Profile", {
          welcomeMessage: "Welcome! Set up your profile before joining a game.",
        });
      }
    }

    bootstrapProfile();

    startDiscovery(({ name, ip }) => {
      setGames((prev) => {
        const without = prev.filter((g) => g.ip !== ip);
        return [...without, { name, ip, lastSeen: Date.now() }];
      });
    });

    staleRef.current = setInterval(() => {
      setGames((prev) =>
        prev.filter((g) => Date.now() - g.lastSeen < STALE_MS),
      );
    }, 2000);

    const unsubscribe = navigation.addListener("beforeRemove", () => {
      cleanup();
    });

    return () => {
      isMounted = false;
      cleanup();
      unsubscribe();
    };
  }, [navigation]);

  function cleanup() {
    stopDiscovery();
    clearInterval(staleRef.current);
    clearTimeout(timeoutRef.current);
    disconnectFromHost();
  }

  function handleJoin(ip) {
    if (status === "connecting") return;
    const trimmedIp = ip.trim();
    if (!trimmedIp) return;

    setStatus("connecting");
    setConnectingIp(trimmedIp);
    setErrorMsg("");

    timeoutRef.current = setTimeout(() => {
      disconnectFromHost();
      setStatus("error");
      setConnectingIp(null);
      setErrorMsg("Could not connect — make sure you're on the same WiFi.");
    }, CONNECT_TIMEOUT_MS);

    connectToHost(trimmedIp, {
      onConnected: () => {
        clearTimeout(timeoutRef.current);
        stopDiscovery();
        clearInterval(staleRef.current);
        navigation.navigate("Lobby", {
          role: "client",
          playerName,
        });
      },
      onDisconnected: () => {
        clearTimeout(timeoutRef.current);
        setStatus("error");
        setConnectingIp(null);
        setErrorMsg("Lost connection to host.");
      },
      onMessage: () => {},
      onError: (err) => {
        clearTimeout(timeoutRef.current);
        setStatus("error");
        setConnectingIp(null);
        setErrorMsg(err || "Could not connect.");
      },
    });
  }

  const isConnecting = status === "connecting";

  if (isLoadingProfile) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ActivityIndicator color="#e94560" size="large" />
        <Text style={styles.loadingText}>Loading your profile…</Text>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Text style={styles.title}>Join a Game</Text>

      <Text style={styles.label}>Joining as</Text>
      <View style={styles.nameBox}>
        <Text style={styles.nameText}>{playerName}</Text>
      </View>

      <Text style={styles.label}>Available Games</Text>

      {games.length === 0 ? (
        <View style={styles.emptyBox}>
          <ActivityIndicator color="#e94560" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyText}>Looking for games on your WiFi…</Text>
          <Text style={styles.emptyHint}>
            Make sure the host has tapped "Host a Game"
          </Text>
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
                  style={[
                    styles.joinBtn,
                    isConnecting && styles.joinBtnDisabled,
                  ]}
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

      {/* Manual IP entry */}
      <TouchableOpacity
        style={styles.manualToggle}
        onPress={() => {
          setShowManual((p) => !p);
          setErrorMsg("");
        }}
        disabled={isConnecting}
      >
        <Text style={styles.manualToggleText}>
          {showManual ? "▲ Hide manual entry" : "▼ Enter IP manually"}
        </Text>
      </TouchableOpacity>

      {showManual && (
        <View style={styles.manualRow}>
          <TextInput
            style={[styles.ipInput, isConnecting && styles.inputDisabled]}
            value={manualIp}
            onChangeText={setManualIp}
            placeholder="192.168.x.x"
            placeholderTextColor="#555570"
            keyboardType="decimal-pad"
            returnKeyType="go"
            onSubmitEditing={() => handleJoin(manualIp)}
            editable={!isConnecting}
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[
              styles.joinBtn,
              (!manualIp.trim() || isConnecting) && styles.joinBtnDisabled,
            ]}
            onPress={() => handleJoin(manualIp)}
            disabled={!manualIp.trim() || isConnecting}
          >
            {isConnecting && connectingIp === manualIp.trim() ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.joinBtnText}>Join</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {status === "error" && errorMsg ? (
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
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    color: "#b0b0c0",
    fontSize: 15,
    marginTop: 12,
  },
  title: {
    fontSize: 28,
    color: "#ffffff",
    fontWeight: "bold",
    marginBottom: 20,
  },
  label: {
    color: "#b0b0c0",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  nameBox: {
    width: "100%",
    backgroundColor: "#16213e",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#334",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  nameText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  inputDisabled: { opacity: 0.5 },
  emptyBox: {
    width: "100%",
    backgroundColor: "#16213e",
    borderRadius: 14,
    padding: 32,
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: {
    color: "#b0b0c0",
    fontSize: 15,
    marginBottom: 6,
    textAlign: "center",
  },
  emptyHint: {
    color: "#555570",
    fontSize: 13,
    textAlign: "center",
  },
  list: {
    width: "100%",
    backgroundColor: "#16213e",
    borderRadius: 14,
    marginBottom: 8,
    maxHeight: 260,
  },
  gameRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  gameInfo: { flex: 1 },
  gameName: { color: "#ffffff", fontSize: 17, fontWeight: "bold" },
  gameIp: { color: "#666680", fontSize: 13, marginTop: 2 },
  joinBtn: {
    backgroundColor: "#e94560",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
  },
  joinBtnDisabled: { opacity: 0.5 },
  joinBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "bold" },
  separator: {
    height: 1,
    backgroundColor: "#1a1a2e",
    marginHorizontal: 16,
  },
  manualToggle: {
    marginTop: 4,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  manualToggleText: {
    color: "#666680",
    fontSize: 13,
  },
  manualRow: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  ipInput: {
    flex: 1,
    backgroundColor: "#16213e",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#334",
    color: "#ffffff",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    color: "#e94560",
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
  },
  hint: {
    color: "#555570",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
});
