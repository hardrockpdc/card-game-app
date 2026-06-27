import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { HapticTouchable as TouchableOpacity } from "../components/Haptic";
import { loadProfile, getDisplayName } from "../game/profile";
import { joinRoom, CODE_LENGTH } from "../game/onlineRoom";
import { scale, scaleFont } from "../game/responsive";

export default function JoinOnlineScreen({ navigation }) {
  const [code, setCode] = useState("");
  const [playerName, setPlayerName] = useState("Player");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadProfile().then((p) => {
      if (mountedRef.current) setPlayerName(getDisplayName(p));
    });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function handleJoin() {
    setError(null);
    setJoining(true);
    const result = await joinRoom(code, { playerName });
    if (!mountedRef.current) return;
    setJoining(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    navigation.replace("OnlineLobby", {
      code: result.code,
      isHost: false,
      myName: playerName,
    });
  }

  const canJoin = code.trim().length === CODE_LENGTH && !joining;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Text style={styles.title}>Join Online</Text>
      <View style={styles.suitRow}>
        <Text style={[styles.suit, styles.suitRed]}>♥</Text>
        <Text style={styles.suit}>♠</Text>
        <Text style={[styles.suit, styles.suitRed]}>♦</Text>
        <Text style={styles.suit}>♣</Text>
      </View>

      <Text style={styles.label}>Enter the room code</Text>
      <TextInput
        style={styles.codeInput}
        value={code}
        onChangeText={(t) => {
          setError(null);
          setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH));
        }}
        placeholder="XKQP"
        placeholderTextColor="#444"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={CODE_LENGTH}
        returnKeyType="go"
        onSubmitEditing={() => canJoin && handleJoin()}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, !canJoin && styles.buttonDimmed]}
        onPress={handleJoin}
        disabled={!canJoin}
      >
        {joining ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Join Game</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.footnote}>
        Ask the host for their 4-letter room code
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
    marginBottom: scale(28),
  },
  suit: { color: "#5b5b75", fontSize: scaleFont(16) },
  suitRed: { color: "#e94560" },
  label: {
    color: "#c4c4d4",
    fontSize: scaleFont(13),
    textTransform: "uppercase",
    letterSpacing: scale(1),
    marginBottom: scale(10),
  },
  codeInput: {
    width: "100%",
    backgroundColor: "#16213e",
    borderRadius: scale(14),
    borderWidth: 1.5,
    borderColor: "#e94560",
    color: "#ffffff",
    fontSize: scaleFont(40),
    fontWeight: "bold",
    letterSpacing: scale(10),
    textAlign: "center",
    paddingVertical: scale(16),
    marginBottom: scale(16),
  },
  error: {
    color: "#e94560",
    fontSize: scaleFont(14),
    marginBottom: scale(12),
    textAlign: "center",
  },
  button: {
    backgroundColor: "#e94560",
    borderWidth: 1,
    borderColor: "#ff6b81",
    paddingHorizontal: scale(48),
    paddingVertical: scale(16),
    borderRadius: scale(16),
    marginBottom: scale(16),
    minWidth: scale(180),
    alignItems: "center",
  },
  buttonDimmed: { opacity: 0.4 },
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
