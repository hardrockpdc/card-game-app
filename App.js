import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './screens/HomeScreen';
import HostSetupScreen from './screens/HostSetupScreen';
import JoinScreen from './screens/JoinScreen';
import LobbyScreen from './screens/LobbyScreen';
import GameScreen from './screens/GameScreen';
import ResultsScreen from './screens/ResultsScreen';
import SettingsScreen from './screens/SettingsScreen';
import MultiplayerGameScreen from './screens/MultiplayerGameScreen';
import CrazyEightsGameScreen from './screens/CrazyEightsGameScreen';
import WarGameScreen from './screens/WarGameScreen';
import GoFishGameScreen from './screens/GoFishGameScreen';
import ConquianGameScreen from './screens/ConquianGameScreen';
import SnapGameScreen from './screens/SnapGameScreen';
import PokerGameScreen from './screens/PokerGameScreen';
import SinglePlayerSetupScreen from './screens/SinglePlayerSetupScreen';
import HowToPlayScreen from './screens/HowToPlayScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="HostSetup" component={HostSetupScreen} options={{ title: 'Host a Game' }} />
        <Stack.Screen name="Join" component={JoinScreen} options={{ title: 'Join a Game' }} />
        <Stack.Screen name="Lobby" component={LobbyScreen} options={{ title: 'Lobby' }} />
        <Stack.Screen name="Game" component={GameScreen} options={{ title: 'Blackjack' }} />
        <Stack.Screen name="Results" component={ResultsScreen} options={{ title: 'Results' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        <Stack.Screen name="MultiplayerGame" component={MultiplayerGameScreen} options={{ title: 'Blackjack' }} />
        <Stack.Screen name="CrazyEightsGame" component={CrazyEightsGameScreen} options={{ title: 'Crazy 8s' }} />
        <Stack.Screen name="WarGame" component={WarGameScreen} options={{ title: 'War' }} />
        <Stack.Screen name="GoFishGame" component={GoFishGameScreen} options={{ title: 'Go Fish' }} />
        <Stack.Screen name="ConquianGame" component={ConquianGameScreen} options={{ title: 'Conquián' }} />
        <Stack.Screen name="SnapGame" component={SnapGameScreen} options={{ title: 'Snap' }} />
        <Stack.Screen name="PokerGame" component={PokerGameScreen} options={{ title: 'Poker' }} />
        <Stack.Screen name="SinglePlayerSetup" component={SinglePlayerSetupScreen} options={{ title: 'Single Player' }} />
        <Stack.Screen name="HowToPlay" component={HowToPlayScreen} options={{ title: 'How to Play' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};