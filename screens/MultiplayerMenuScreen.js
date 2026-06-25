import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { HapticTouchable as TouchableOpacity } from "../components/Haptic";
import { scale, scaleFont } from "../game/responsive";

export default function MultiplayerMenuScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isTablet = width >= 768;

  const titleSize = isSmallScreen ? 30 : isTablet ? 40 : 34;
  const subtitleSize = isSmallScreen ? 14 : 16;
  const buttonTextSize = isSmallScreen ? 16 : 18;
  const buttonVertical = isSmallScreen ? 14 : 16;
  const buttonHorizontal = isSmallScreen ? 20 : 24;
  const contentMaxWidth = isTablet ? 520 : 440;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.content, { maxWidth: contentMaxWidth }]}>
          <Text style={[styles.title, { fontSize: titleSize }]}>
            Multiplayer
          </Text>
          <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>
            Local play is ready — online mode coming in a future update
          </Text>

          <View style={styles.suitRow}>
            <Text style={[styles.suit, styles.suitRed]}>♥</Text>
            <Text style={styles.suit}>♠</Text>
            <Text style={[styles.suit, styles.suitRed]}>♦</Text>
            <Text style={styles.suit}>♣</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.disabledButton,
              {
                paddingVertical: buttonVertical,
                paddingHorizontal: buttonHorizontal,
              },
            ]}
            disabled
            accessibilityRole="button"
            accessibilityLabel="Host Online (not available yet)"
            accessibilityState={{ disabled: true }}
          >
            <View style={styles.buttonTextRow}>
              <Text
                style={[
                  styles.disabledButtonText,
                  { fontSize: buttonTextSize },
                ]}
              >
                🔒  Host Online
              </Text>
              <Text style={styles.comingSoon}>Not available yet</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.disabledButton,
              {
                paddingVertical: buttonVertical,
                paddingHorizontal: buttonHorizontal,
              },
            ]}
            disabled
            accessibilityRole="button"
            accessibilityLabel="Join Online (not available yet)"
            accessibilityState={{ disabled: true }}
          >
            <View style={styles.buttonTextRow}>
              <Text
                style={[
                  styles.disabledButtonText,
                  { fontSize: buttonTextSize },
                ]}
              >
                🔒  Join Online
              </Text>
              <Text style={styles.comingSoon}>Not available yet</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                paddingVertical: buttonVertical,
                paddingHorizontal: buttonHorizontal,
              },
            ]}
            onPress={() => navigation.navigate("MultiplayerGamePicker")}
            accessibilityRole="button"
            accessibilityLabel="Host Local"
            accessibilityHint="Start hosting a game on your Wi-Fi network"
          >
            <Text
              style={[styles.primaryButtonText, { fontSize: buttonTextSize }]}
            >
              📡  Host Local
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              {
                paddingVertical: buttonVertical,
                paddingHorizontal: buttonHorizontal,
              },
            ]}
            onPress={() => navigation.navigate("Join")}
            accessibilityRole="button"
            accessibilityLabel="Join Local"
            accessibilityHint="Look for games being hosted on your Wi-Fi network"
          >
            <Text
              style={[styles.secondaryButtonText, { fontSize: buttonTextSize }]}
            >
              🔍  Join Local
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  container: {
    flexGrow: 1,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
    padding: scale(24),
  },
  content: {
    width: "100%",
    alignItems: "center",
  },
  title: {
    color: "#ffffff",
    fontWeight: "900",
    textAlign: "center",
    marginBottom: scale(8),
    letterSpacing: 0.5,
    textShadowColor: "rgba(233,69,96,0.35)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  subtitle: {
    color: "#c4c4d4",
    textAlign: "center",
    marginBottom: scale(16),
  },
  suitRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: scale(16),
    marginBottom: scale(26),
  },
  suit: {
    color: "#5b5b75",
    fontSize: scaleFont(18),
  },
  suitRed: {
    color: "#e94560",
  },
  disabledButton: {
    width: "100%",
    maxWidth: 420,
    borderRadius: scale(16),
    borderWidth: 2,
    borderColor: "#4a4a5f",
    backgroundColor: "#2a2a3d",
    marginBottom: scale(14),
  },
  disabledButtonText: {
    color: "#8b8ba3",
    fontWeight: "bold",
  },
  comingSoon: {
    color: "#c4c4d4",
    fontSize: scaleFont(12),
    marginTop: scale(4),
  },
  buttonTextRow: {
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    width: "100%",
    maxWidth: 420,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: "#ff6b81",
    backgroundColor: "#e94560",
    marginTop: scale(8),
    marginBottom: scale(14),
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  secondaryButton: {
    width: "100%",
    maxWidth: 420,
    borderRadius: scale(16),
    borderWidth: 2,
    borderColor: "#e94560",
    backgroundColor: "rgba(233,69,96,0.12)",
    alignItems: "center",
    marginBottom: scale(18),
  },
  secondaryButtonText: {
    color: "#e94560",
    fontWeight: "bold",
  },
  backButton: {
    paddingVertical: scale(8),
    paddingHorizontal: scale(16),
  },
  backButtonText: {
    color: "#c4c4d4",
    fontSize: scaleFont(16),
  },
});
