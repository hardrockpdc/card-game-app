import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

export default function HomeScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isTablet = width >= 768;

  const titleSize = isSmallScreen ? 34 : isTablet ? 56 : 44;
  const subtitleSize = isSmallScreen ? 14 : 16;
  const buttonHorizontal = isSmallScreen ? 22 : isTablet ? 56 : 44;
  const buttonVertical = isSmallScreen ? 14 : 18;
  const buttonTextSize = isSmallScreen ? 18 : 20;
  const containerPadding = isSmallScreen ? 16 : 20;
  const contentMaxWidth = isTablet ? 520 : 440;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { padding: containerPadding },
        ]}
      >
        <View style={[styles.content, { maxWidth: contentMaxWidth }]}>
          <Text style={[styles.title, { fontSize: titleSize }]}>
            🎴 Card Night
          </Text>
          <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>
            Play with friends, anywhere
          </Text>

          <TouchableOpacity
            style={[
              styles.singlePlayerButton,
              {
                paddingVertical: buttonVertical,
                paddingHorizontal: buttonHorizontal,
              },
            ]}
            onPress={() => navigation.navigate("SinglePlayerSetup")}
          >
            <Text
              style={[
                styles.singlePlayerButtonText,
                { fontSize: buttonTextSize },
              ]}
            >
              Single Player
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                paddingVertical: buttonVertical,
                paddingHorizontal: buttonHorizontal,
              },
            ]}
            onPress={() => navigation.navigate("HostSetup")}
          >
            <Text
              style={[styles.primaryButtonText, { fontSize: buttonTextSize }]}
            >
              Host a Game
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
          >
            <Text
              style={[styles.secondaryButtonText, { fontSize: buttonTextSize }]}
            >
              Join a Game
            </Text>
          </TouchableOpacity>

          <View style={styles.bottomLinks}>
            <TouchableOpacity
              style={styles.bottomLink}
              onPress={() => navigation.navigate("HowToPlay")}
            >
              <Text style={styles.linkText}>📖 How to Play</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bottomLink}
              onPress={() => navigation.navigate("Settings")}
            >
              <Text style={styles.linkText}>⚙️ Settings</Text>
            </TouchableOpacity>
          </View>
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
  },
  content: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    color: "#b0b0c0",
    textAlign: "center",
    marginBottom: 36,
  },
  singlePlayerButton: {
    backgroundColor: "transparent",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#4caf50",
    marginBottom: 16,
    width: "100%",
    alignItems: "center",
    maxWidth: 420,
  },
  singlePlayerButtonText: {
    color: "#4caf50",
    fontWeight: "bold",
  },
  primaryButton: {
    backgroundColor: "#e94560",
    borderRadius: 12,
    marginBottom: 16,
    width: "100%",
    alignItems: "center",
    maxWidth: 420,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e94560",
    width: "100%",
    alignItems: "center",
    maxWidth: 420,
  },
  secondaryButtonText: {
    color: "#e94560",
    fontWeight: "bold",
  },
  bottomLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 32,
  },
  bottomLink: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  linkText: {
    color: "#b0b0c0",
    fontSize: 16,
  },
});
