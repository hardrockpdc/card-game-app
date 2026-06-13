import React, { useCallback, useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Alert,
  BackHandler,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  loadProfile,
  getDisplayName,
  hasProfileName,
  subscribeProfile,
} from "../game/profile";
import { getCoins } from "../game/wallet";

const PROFILE_WELCOME_MESSAGE =
  "Welcome! Set up your profile (you can change anything later)";

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

  const [profileName, setProfileName] = useState("Player");
  const [profileHasName, setProfileHasName] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [coins, setCoins] = useState(null);

  useFocusEffect(
    useCallback(() => {
      getCoins().then(setCoins);
    }, []),
  );

  useEffect(() => {
    let isMounted = true;

    async function bootstrapProfile() {
      const profile = await loadProfile();

      if (!isMounted) {
        return;
      }

      setProfileName(getDisplayName(profile));
      setProfileHasName(hasProfileName(profile));
      setIsLoadingProfile(false);
    }

    bootstrapProfile();

    const unsubscribeProfile = subscribeProfile((profile) => {
      setProfileName(getDisplayName(profile));
      setProfileHasName(hasProfileName(profile));
    });
    return () => {
      isMounted = false;
      unsubscribeProfile();
    };
  }, [navigation]);

  function goToSinglePlayer() {
    if (!profileHasName) {
      navigation.navigate("Profile", {
        welcomeMessage: PROFILE_WELCOME_MESSAGE,
      });
      return;
    }

    navigation.navigate("SinglePlayerSetup");
  }

  function goToMultiplayer() {
    navigation.navigate("MultiplayerMenu");
  }

  function goToProfile() {
    navigation.navigate("Profile", {
      welcomeMessage: PROFILE_WELCOME_MESSAGE,
    });
  }

  // Android-only: an explicit way to close the app from the home screen.
  // (iOS forbids apps from terminating themselves, so the button is hidden there.)
  function handleQuit() {
    Alert.alert("Quit Card Night?", "This will close the app.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Quit",
        style: "destructive",
        onPress: () => BackHandler.exitApp(),
      },
    ]);
  }

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

          <View style={styles.suitRow}>
            <Text style={[styles.suit, styles.suitRed]}>♥</Text>
            <Text style={styles.suit}>♠</Text>
            <Text style={[styles.suit, styles.suitRed]}>♦</Text>
            <Text style={styles.suit}>♣</Text>
          </View>

          {((!isLoadingProfile && profileHasName) || coins !== null) && (
            <View style={styles.headerRow}>
              {!isLoadingProfile && profileHasName && (
                <View style={styles.namePill}>
                  <Text style={styles.namePillText}>
                    Playing as {profileName}
                  </Text>
                </View>
              )}
              {coins !== null && (
                <View style={styles.coinPill}>
                  <Text style={styles.coinPillText}>
                    🪙 {coins.toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.singlePlayerButton,
              !profileHasName && styles.singlePlayerButtonDisabled,
              {
                paddingVertical: buttonVertical,
                paddingHorizontal: buttonHorizontal,
              },
            ]}
            onPress={goToSinglePlayer}
            accessibilityRole="button"
            accessibilityLabel="Single Player"
            accessibilityHint={
              !profileHasName
                ? "Set up your profile first to enable this button"
                : "Opens single-player game setup"
            }
            accessibilityState={{ disabled: !profileHasName }}
          >
            <Text
              style={[
                styles.singlePlayerButtonText,
                !profileHasName && styles.singlePlayerButtonTextDisabled,
                { fontSize: buttonTextSize },
              ]}
            >
              🎮  Single Player
            </Text>
            {!profileHasName && (
              <Text style={styles.singlePlayerButtonHint}>
                Set up your profile to play
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                paddingVertical: buttonVertical,
                paddingHorizontal: buttonHorizontal,
              },
            ]}
            onPress={goToMultiplayer}
            accessibilityRole="button"
            accessibilityLabel="Multiplayer"
            accessibilityHint="Opens the multiplayer menu"
          >
            <Text
              style={[styles.primaryButtonText, { fontSize: buttonTextSize }]}
            >
              🌐  Multiplayer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.profileButton,
              {
                paddingVertical: buttonVertical,
                paddingHorizontal: buttonHorizontal,
              },
            ]}
            onPress={goToProfile}
            accessibilityRole="button"
            accessibilityLabel="Profile"
            accessibilityHint="Open your profile to edit your name, photo, and card theme"
          >
            <Text
              style={[styles.profileButtonText, { fontSize: buttonTextSize }]}
            >
              👤  Profile
            </Text>
          </TouchableOpacity>

          <View style={styles.bottomLinks}>
            <TouchableOpacity
              style={styles.bottomLink}
              onPress={() => navigation.navigate("HowToPlay")}
              accessibilityRole="button"
              accessibilityLabel="How to Play"
            >
              <Text style={styles.linkText}>📖 How to Play</Text>
            </TouchableOpacity>
            {Platform.OS === "android" && (
              <TouchableOpacity
                style={styles.quitPill}
                onPress={handleQuit}
                accessibilityRole="button"
                accessibilityLabel="Quit Card Night"
              >
                <Text style={styles.quitPillText}>✕ Quit</Text>
              </TouchableOpacity>
            )}
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
    fontWeight: "900",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.5,
    textShadowColor: "rgba(233,69,96,0.35)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  subtitle: {
    color: "#c4c4d4",
    textAlign: "center",
    marginBottom: 14,
  },
  suitRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 22,
  },
  suit: {
    color: "#5b5b75",
    fontSize: 18,
  },
  suitRed: {
    color: "#e94560",
  },
  headerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginBottom: 26,
  },
  quitPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "rgba(233,69,96,0.14)",
    borderWidth: 1,
    borderColor: "rgba(233,69,96,0.55)",
  },
  quitPillText: {
    color: "#ff6b81",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  namePill: {
    backgroundColor: "#16213e",
    borderWidth: 1.5,
    borderColor: "#334",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  namePillText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold",
  },
  coinPill: {
    backgroundColor: "#16213e",
    borderWidth: 1.5,
    borderColor: "#b8860b",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  coinPillText: {
    color: "#ffd700",
    fontSize: 13,
    fontWeight: "bold",
  },
  singlePlayerButton: {
    backgroundColor: "#2e9e54",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3fbf6d",
    marginBottom: 14,
    width: "100%",
    alignItems: "center",
    maxWidth: 420,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  singlePlayerButtonDisabled: {
    backgroundColor: "#2a3340",
    borderColor: "#3a4456",
    opacity: 0.85,
    shadowOpacity: 0,
    elevation: 0,
  },
  singlePlayerButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  singlePlayerButtonTextDisabled: {
    color: "#888",
  },
  singlePlayerButtonHint: {
    color: "#888",
    fontSize: 12,
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: "#e94560",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ff6b81",
    marginBottom: 14,
    width: "100%",
    alignItems: "center",
    maxWidth: 420,
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
  profileButton: {
    backgroundColor: "rgba(106,90,205,0.12)",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#6a5acd",
    width: "100%",
    alignItems: "center",
    maxWidth: 420,
  },
  profileButtonText: {
    color: "#d7d2ff",
    fontWeight: "bold",
  },
  bottomLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 32,
  },
  bottomLink: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  linkText: {
    color: "#c4c4d4",
    fontSize: 16,
  },
});
