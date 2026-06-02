import React, { useEffect } from "react";
import { AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "./screens/HomeScreen";
import HostSetupScreen from "./screens/HostSetupScreen";
import JoinScreen from "./screens/JoinScreen";
import LobbyScreen from "./screens/LobbyScreen";
import GameScreen from "./screens/GameScreen";
import ResultsScreen from "./screens/ResultsScreen";
import SettingsScreen from "./screens/SettingsScreen";
import MultiplayerGameScreen from "./screens/MultiplayerGameScreen";
import GoFishGameScreen from "./screens/GoFishGameScreen";
import ConquianGameScreen from "./screens/ConquianGameScreen";
import ConquianSetupScreen from "./screens/ConquianSetupScreen";
import PokerGameScreen from "./screens/PokerGameScreen";
import PokerVariantPickerScreen from "./screens/PokerVariantPickerScreen";
import SinglePlayerSetupScreen from "./screens/SinglePlayerSetupScreen";
import SolitaireVariantPickerScreen from "./screens/SolitaireVariantPickerScreen";
import SolitaireGameScreen from "./screens/SolitaireGameScreen";
import RummyVariantPickerScreen from "./screens/RummyVariantPickerScreen";
import RummyGameScreen from "./screens/RummyGameScreen";
import HowToPlayScreen from "./screens/HowToPlayScreen";
import WildRoundGameScreen from "./screens/WildRoundGameScreen";
import LastCardGameScreen from "./screens/LastCardGameScreen";
import GameSetupScreen from "./screens/GameSetupScreen";
import GoFishPickerScreen from "./screens/GoFishPickerScreen";
import CardThemeScreen from "./screens/CardThemeScreen";
import MultiplayerMenuScreen from "./screens/MultiplayerMenuScreen";
import ProfileScreen from "./screens/ProfileScreen";
import AboutScreen from "./screens/AboutScreen";
import StatsScreen from "./screens/StatsScreen";
import { loadProfile } from "./game/profile";
import { setTheme } from "./game/cardTheme";
import { warn } from "./game/logger";
import { initSounds } from "./game/sounds";
import { ThemeProvider } from "./game/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import {
  stopServer,
  stopBroadcasting,
  stopDiscovery,
  disconnectFromHost,
} from "./game/GameNetwork";

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    loadProfile()
      .then((profile) => {
        if (profile?.cardTheme) {
          setTheme(profile.cardTheme);
        }
      })
      .catch((err) => {
        warn("Failed to load profile theme:", err);
      });
    initSounds();
  }, []);

  // Close TCP server and UDP sockets when the app moves to the background.
  // Prevents "port already in use" errors on the next host attempt when the
  // user never went through the normal back-button flow to trigger cleanup.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background") {
        stopServer();
        stopBroadcasting();
        stopDiscovery();
        // PERF-4: also drop client TCP socket so host sees us as left
        disconnectFromHost();
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Home"
              screenOptions={{
                headerStyle: { backgroundColor: "#1a1a2e" },
                headerTintColor: "#ffffff",
                headerTitleStyle: { fontWeight: "bold" },
              }}
            >
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="HostSetup"
                component={HostSetupScreen}
                options={{ title: "Host a Game" }}
              />
              <Stack.Screen
                name="Join"
                component={JoinScreen}
                options={{ title: "Join a Game" }}
              />
              <Stack.Screen
                name="Lobby"
                component={LobbyScreen}
                options={{ title: "Lobby" }}
              />
              <Stack.Screen
                name="Game"
                component={GameScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Results"
                component={ResultsScreen}
                options={{ title: "Results" }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: "Settings" }}
              />
              <Stack.Screen
                name="MultiplayerGame"
                component={MultiplayerGameScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="GoFishGame"
                component={GoFishGameScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ConquianSetup"
                component={ConquianSetupScreen}
                options={{ title: "Conquián" }}
              />
              <Stack.Screen
                name="ConquianGame"
                component={ConquianGameScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PokerGame"
                component={PokerGameScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PokerVariantPicker"
                component={PokerVariantPickerScreen}
                options={{ title: "Poker Variant" }}
              />
              <Stack.Screen
                name="SolitaireVariantPicker"
                component={SolitaireVariantPickerScreen}
                options={{ title: "Solitaire" }}
              />
              <Stack.Screen
                name="SolitaireGame"
                component={SolitaireGameScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="RummyVariantPicker"
                component={RummyVariantPickerScreen}
                options={{ title: "Rummy Variant" }}
              />
              <Stack.Screen
                name="RummyGame"
                component={RummyGameScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="SinglePlayerSetup"
                component={SinglePlayerSetupScreen}
                options={{ title: "Single Player" }}
              />
              <Stack.Screen
                name="HowToPlay"
                component={HowToPlayScreen}
                options={{ title: "How to Play" }}
              />
              <Stack.Screen
                name="WildRoundGame"
                component={WildRoundGameScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="LastCardGame"
                component={LastCardGameScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="GameSetup"
                component={GameSetupScreen}
                options={{ title: "Game Setup" }}
              />
              <Stack.Screen
                name="GoFishPicker"
                component={GoFishPickerScreen}
                options={{ title: "Go Fish" }}
              />
              <Stack.Screen
                name="CardThemes"
                component={CardThemeScreen}
                options={{ title: "Card Themes" }}
              />
              <Stack.Screen
                name="MultiplayerMenu"
                component={MultiplayerMenuScreen}
                options={{ title: "Multiplayer" }}
              />
              <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ title: "Profile" }}
              />
              <Stack.Screen
                name="About"
                component={AboutScreen}
                options={{ title: "About" }}
              />
              <Stack.Screen
                name="Stats"
                component={StatsScreen}
                options={{ title: "Stats" }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
