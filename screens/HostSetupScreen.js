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

      if (!profile?.name) {
        navigation.navigate("Profile", {
          welcomeMessage: "Welcome! Set up your profile before hosting a game.",
        });
      }
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
    marginBottom: 6,
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
  ipBox: {
    width: "100%",
    backgroundColor: "#16213e",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e94560",
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  ipLabel: {
    color: "#b0b0c0",
    fontSize: 13,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  ipAddress: {
    color: "#e94560",
    fontSize: 38,
    fontWeight: "bold",
    letterSpacing: 3,
    marginBottom: 6,
  },
  ipHint: {
    color: "#666680",
    fontSize: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4caf50",
    marginRight: 8,
  },
  statusText: {
    color: "#b0b0c0",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#e94560",
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  footnote: {
    color: "#555570",
    fontSize: 12,
    textAlign: "center",
  },
});
