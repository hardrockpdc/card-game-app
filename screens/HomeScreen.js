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
      {Platform.OS === "android" && (
        <TouchableOpacity
          style={styles.quitButton}
          onPress={handleQuit}
          accessibilityRole="button"
          accessibilityLabel="Quit app"
        >
          <Text style={styles.quitButtonText}>✕</Text>
        </TouchableOpacity>
      )}
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

          {!isLoadingProfile && profileHasName && (
            <View style={styles.namePill}>
              <Text style={styles.namePillText}>Playing as {profileName}</Text>
            </View>
          )}

          {coins !== null && (
            <View style={styles.coinPill}>
              <Text style={styles.coinPillText}>
                🪙 {coins.toLocaleString()}
              </Text>
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
              Single Player
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
              Multiplayer
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
              Profile
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
    color: "#c4c4d4",
    textAlign: "center",
    marginBottom: 20,
  },
  quitButton: {
    position: "absolute",
    top: 12,
    right: 14,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "#2a3650",
  },
  quitButtonText: {
    color: "#e94560",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 20,
  },
  namePill: {
    backgroundColor: "#16213e",
    borderWidth: 1.5,
    borderColor: "#334",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 18,
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
    paddingVertical: 6,
    marginBottom: 20,
  },
  coinPillText: {
    color: "#ffd700",
    fontSize: 13,
    fontWeight: "bold",
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
  singlePlayerButtonDisabled: {
    borderColor: "#555",
    opacity: 0.55,
  },
  singlePlayerButtonText: {
    color: "#4caf50",
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
  profileButton: {
    backgroundColor: "transparent",
    borderRadius: 12,
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
