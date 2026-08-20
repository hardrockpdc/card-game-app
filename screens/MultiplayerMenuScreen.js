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
import { TITLE_FONT } from "../game/typography";
import { accent } from "../game/colors";

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
            Play with friends on the same Wi-Fi, or online with a room code
          </Text>

          <View style={styles.suitRow}>
            <Text style={[styles.suit, styles.suitRed]}>♥</Text>
            <Text style={styles.suit}>♠</Text>
            <Text style={[styles.suit, styles.suitRed]}>♦</Text>
            <Text style={styles.suit}>♣</Text>
          </View>

          <View style={styles.modeGroup}>
            <Text style={styles.modeGroupLabel}>
              ROOM CODE · DIFFERENT LOCATIONS
            </Text>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  paddingVertical: buttonVertical,
                  paddingHorizontal: buttonHorizontal,
                },
              ]}
              onPress={() =>
                navigation.navigate("MultiplayerGamePicker", {
                  mode: "online",
                })
              }
              accessibilityRole="button"
              accessibilityLabel="Host Online"
              accessibilityHint="Start an online game others can join with a code"
            >
              <View style={styles.btnLabel}>
                <Text
                  style={[
                    styles.primaryButtonText,
                    { fontSize: buttonTextSize },
                  ]}
                >
                  🌐
                </Text>
                <Text
                  style={[
                    styles.primaryButtonText,
                    { fontSize: buttonTextSize },
                  ]}
                >
                  Host Online
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                {
                  paddingVertical: buttonVertical,
                  paddingHorizontal: buttonHorizontal,
                },
              ]}
              onPress={() => navigation.navigate("JoinOnline")}
              accessibilityRole="button"
              accessibilityLabel="Join Online"
              accessibilityHint="Join an online game using a room code"
            >
              <View style={styles.btnLabel}>
                <Text
                  style={[
                    styles.secondaryButtonText,
                    { fontSize: buttonTextSize },
                  ]}
                >
                  🔑
                </Text>
                <Text
                  style={[
                    styles.secondaryButtonText,
                    { fontSize: buttonTextSize },
                  ]}
                >
                  Join Online
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.modeGroup}>
            <Text style={[styles.modeGroupLabel, styles.modeGroupLabelLocal]}>
              SAME WI-FI · NO INTERNET NEEDED
            </Text>

            <TouchableOpacity
              style={[
                styles.localPrimaryButton,
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
              <View style={styles.btnLabel}>
                <Text
                  style={[
                    styles.localPrimaryButtonText,
                    { fontSize: buttonTextSize },
                  ]}
                >
                  📡
                </Text>
                <Text
                  style={[
                    styles.localPrimaryButtonText,
                    { fontSize: buttonTextSize },
                  ]}
                >
                  Host Local
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.localSecondaryButton,
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
              <View style={styles.btnLabel}>
                <Text
                  style={[
                    styles.localSecondaryButtonText,
                    { fontSize: buttonTextSize },
                  ]}
                >
                  🔍
                </Text>
                <Text
                  style={[
                    styles.localSecondaryButtonText,
                    { fontSize: buttonTextSize },
                  ]}
                >
                  Join Local
                </Text>
              </View>
            </TouchableOpacity>
          </View>

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
    fontFamily: TITLE_FONT,
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
  disabledButtonText: {
    color: "#8b8ba3",
    fontWeight: "bold",
  },
  modeGroup: {
    width: "100%",
    alignItems: "center",
    marginBottom: scale(10),
  },
  modeGroupLabel: {
    alignSelf: "flex-start",
    color: "#e94560",
    fontSize: scaleFont(12),
    fontWeight: "bold",
    letterSpacing: 0.8,
    marginBottom: scale(8),
  },
  modeGroupLabelLocal: {
    color: accent,
  },
  // Icon + label as separate Text nodes (an emoji + text in ONE Text node can
  // render just the emoji on Android after a re-layout).
  btnLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
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
  localPrimaryButton: {
    width: "100%",
    maxWidth: 420,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: "#a8cdff",
    backgroundColor: accent,
    marginTop: scale(8),
    marginBottom: scale(14),
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  localPrimaryButtonText: {
    color: "#0f1b2d",
    fontWeight: "bold",
  },
  localSecondaryButton: {
    width: "100%",
    maxWidth: 420,
    borderRadius: scale(16),
    borderWidth: 2,
    borderColor: accent,
    backgroundColor: "rgba(127,179,255,0.12)",
    alignItems: "center",
    marginBottom: scale(18),
  },
  localSecondaryButtonText: {
    color: accent,
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
