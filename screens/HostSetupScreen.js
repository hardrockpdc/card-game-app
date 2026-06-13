import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as Network from "expo-network";
import * as Clipboard from "expo-clipboard";
import {
  startServer,
  stopServer,
  setServerListeners,
} from "../game/GameNetwork";
import { loadProfile, getDisplayName } from "../game/profile";
import { scale, scaleFont } from "../game/responsive";

export default function HostSetupScreen({ navigation }) {
  const [hostName, setHostName] = useState("Player");
  const [ipAddress, setIpAddress] = useState(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [serverReady, setServerReady] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapProfile() {
      const profile = await loadProfile();
      if (!isMounted) {
        return;
      }

      const name = getDisplayName(profile);
      setHostName(name);
      setIsLoadingProfile(false);
    }

    bootstrapProfile();

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
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      stopServer();
    });

    return () => {
      isMounted = false;
      unsubscribe();
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, [navigation]);

  async function handleCopyIP() {
    if (!ipAddress) return;
    await Clipboard.setStringAsync(ipAddress);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  }

  function goToLobby() {
    navigation.navigate("Lobby", {
      role: "host",
      hostName,
      hostIp: ipAddress,
    });
  }

  if (isLoadingProfile) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ActivityIndicator color="#7fb3ff" size="large" />
        <Text style={styles.loadingText}>Loading your profile…</Text>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Text style={styles.title}>Host a Game</Text>
      <View style={styles.suitRow}>
        <Text style={[styles.suit, styles.suitRed]}>♥</Text>
        <Text style={styles.suit}>♠</Text>
        <Text style={[styles.suit, styles.suitRed]}>♦</Text>
        <Text style={styles.suit}>♣</Text>
      </View>

      <Text style={styles.label}>Hosting as</Text>
      <View style={styles.nameBox}>
        <Text style={styles.nameText}>{hostName}</Text>
      </View>

      {/* IP address card — tap to copy */}
      <TouchableOpacity
        style={[styles.ipBox, copied && styles.ipBoxCopied]}
        onPress={handleCopyIP}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Copy IP address"
      >
        <Text style={styles.ipLabel}>Your WiFi IP Address</Text>
        {ipAddress ? (
          <Text style={styles.ipAddress}>{ipAddress}</Text>
        ) : (
          <ActivityIndicator
            color="#e94560"
            size="large"
            style={{ marginVertical: 8 }}
          />
        )}
        <Text style={[styles.ipHint, copied && styles.ipHintCopied]}>
          {copied ? "✓ Copied!" : "Tap to copy"}
        </Text>
      </TouchableOpacity>

      {/* Server status + player count row */}
      <View style={styles.statusRow}>
        {serverReady && <View style={styles.dot} />}
        <Text style={styles.statusText}>
          {serverReady
            ? `${playerCount} player${playerCount !== 1 ? "s" : ""} connected · port 7777`
            : "Starting…"}
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
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
    padding: scale(24),
  },
  loadingText: {
    color: "#c4c4d4",
    fontSize: scaleFont(15),
    marginTop: scale(12),
  },
  title: {
    fontSize: scaleFont(28),
    color: "#ffffff",
    fontWeight: "900",
    letterSpacing: 0.5,
    textShadowColor: "rgba(233,69,96,0.35)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
    marginBottom: scale(12),
  },
  suitRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: scale(16),
    marginBottom: scale(22),
  },
  suit: { color: "#5b5b75", fontSize: scaleFont(16) },
  suitRed: { color: "#e94560" },
  label: {
    color: "#c4c4d4",
    fontSize: scaleFont(13),
    textTransform: "uppercase",
    letterSpacing: scale(1),
    alignSelf: "flex-start",
    marginBottom: scale(6),
  },
  nameBox: {
    width: "100%",
    backgroundColor: "#16213e",
    borderRadius: scale(10),
    borderWidth: 1.5,
    borderColor: "#334",
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    marginBottom: scale(20),
  },
  nameText: {
    color: "#ffffff",
    fontSize: scaleFont(18),
    fontWeight: "bold",
  },
  ipBox: {
    width: "100%",
    backgroundColor: "#16213e",
    borderRadius: scale(14),
    borderWidth: 1.5,
    borderColor: "#e94560",
    padding: scale(20),
    alignItems: "center",
    marginBottom: scale(16),
  },
  ipLabel: {
    color: "#c4c4d4",
    fontSize: scaleFont(13),
    marginBottom: scale(6),
    textTransform: "uppercase",
    letterSpacing: scale(1),
  },
  ipAddress: {
    color: "#e94560",
    fontSize: scaleFont(38),
    fontWeight: "bold",
    letterSpacing: scale(3),
    marginBottom: scale(6),
  },
  ipHint: {
    color: "#9090a8",
    fontSize: scaleFont(12),
  },
  ipBoxCopied: {
    borderColor: "#4caf50",
  },
  ipHintCopied: {
    color: "#4caf50",
    fontWeight: "bold",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scale(28),
  },
  dot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: "#4caf50",
    marginRight: scale(8),
  },
  statusText: {
    color: "#c4c4d4",
    fontSize: scaleFont(14),
  },
  button: {
    backgroundColor: "#e94560",
    borderWidth: 1,
    borderColor: "#ff6b81",
    paddingHorizontal: scale(48),
    paddingVertical: scale(16),
    borderRadius: scale(16),
    marginBottom: scale(16),
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: scaleFont(18),
    fontWeight: "bold",
  },
  footnote: {
    color: "#555570",
    fontSize: scaleFont(12),
    textAlign: "center",
  },
});
