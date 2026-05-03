import React, { useState, useEffect } from "react";
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
    };
  }, [navigation]);

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
      <Text style={styles.title}>Host a Game</Text>

      <Text style={styles.label}>Hosting as</Text>
      <View style={styles.nameBox}>
        <Text style={styles.nameText}>{hostName}</Text>
      </View>

      {/* IP address card */}
      <View style={styles.ipBox}>
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
        <Text style={styles.ipHint}>
          Joining players will find your game automatically
        </Text>
      </View>

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
    color: "#b0b0c0",
    fontSize: scaleFont(15),
    marginTop: scale(12),
  },
  title: {
    fontSize: scaleFont(28),
    color: "#ffffff",
    fontWeight: "bold",
    marginBottom: scale(20),
  },
  label: {
    color: "#b0b0c0",
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
    color: "#b0b0c0",
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
    color: "#666680",
    fontSize: scaleFont(12),
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
    color: "#b0b0c0",
    fontSize: scaleFont(14),
  },
  button: {
    backgroundColor: "#e94560",
    paddingHorizontal: scale(48),
    paddingVertical: scale(16),
    borderRadius: scale(10),
    marginBottom: scale(16),
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
