import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎴 Card Games</Text>
      <Text style={styles.subtitle}>Play with friends, anywhere</Text>

      <TouchableOpacity
        style={styles.singlePlayerButton}
        onPress={() => navigation.navigate("SinglePlayerSetup")}
      >
        <Text style={styles.singlePlayerButtonText}>Single Player</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate("HostSetup")}
      >
        <Text style={styles.primaryButtonText}>Host a Game</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate("Join")}
      >
        <Text style={styles.secondaryButtonText}>Join a Game</Text>
      </TouchableOpacity>

      <View style={styles.bottomLinks}>
        <TouchableOpacity onPress={() => navigation.navigate("HowToPlay")}>
          <Text style={styles.linkText}>📖 How to Play</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
          <Text style={styles.linkText}>⚙️ Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#b0b0c0",
    marginBottom: 40,
  },
  singlePlayerButton: {
    backgroundColor: "transparent",
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#4caf50",
    marginBottom: 16,
    width: "80%",
    alignItems: "center",
  },
  singlePlayerButtonText: {
    color: "#4caf50",
    fontSize: 20,
    fontWeight: "bold",
  },
  primaryButton: {
    backgroundColor: "#e94560",
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 12,
    marginBottom: 16,
    width: "80%",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e94560",
    width: "80%",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#e94560",
    fontSize: 20,
    fontWeight: "bold",
  },
  bottomLinks: {
    position: "absolute",
    bottom: 40,
    flexDirection: "row",
    gap: 28,
  },
  linkText: {
    color: "#b0b0c0",
    fontSize: 16,
  },
});
