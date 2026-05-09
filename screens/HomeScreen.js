import React, { useCallback, useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
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

      if (!hasProfileName(profile)) {
        navigation.navigate("Profile", {
          welcomeMessage: PROFILE_WELCOME_MESSAGE,
        });
      }
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
              {
                paddingVertical: buttonVertical,
                paddingHorizontal: buttonHorizontal,
              },
            ]}
            onPress={goToSinglePlayer}
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
            onPress={goToMultiplayer}
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
    marginBottom: 20,
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
    color: "#b0b0c0",
    fontSize: 16,
  },
});
