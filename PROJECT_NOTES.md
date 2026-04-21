📋 Project Summary — Card Game App
🎯 The Vision
A cross-platform React Native mobile app for playing card games with friends and family. Works completely offline via local WiFi/hotspot (phones connect directly to each other — no internet needed). Each player uses their own phone (private hand). Up to 8+ players per game.
Important principle: Offline play is core to the app, not a nice-to-have. Airplane / no-WiFi scenarios covered via phone hotspot.
👤 About You (Pedro)

Total beginner — never coded before
Windows PC, Android phone (plus second Android for multiplayer testing)
Email: hardrockpdc@gmail.com
GitHub: yes (free, linked to above email)
Expo account: created, logged in via terminal
Prefers: tappable button questions (not typing), simple language, step-by-step, explanations of what each piece does

🗺️ Full Roadmap

✅ Phase 1: Install everything, project created, "Hello World" on phone
✅ Phase 2: All 7 screens built, navigation working (Home, HostSetup, Join, Lobby, Game, Results, Settings)
✅ Phase 3: Single-player Blackjack fully working (deal, hit, stand, bust, dealer AI, win/lose/push, play again)
🔜 Phase 4: Local multiplayer via react-native-tcp-socket (true offline, WiFi-based)
🔜 Phase 4.5: Multiplayer Blackjack (same game across phones)
🔜 Phase 5: Party card game (Cards Against Humanity-style — mix of original and open-source content)
🔜 Phase 6: Polish (sounds, animations, nicer card designs, in-app "how to host offline" helper)
🔜 Phase 7: More games (Poker, Go Fish, Crazy 8s, etc.)
🔜 Phase 8: Publish to Google Play and App Store

🛠️ Tech Stack Decisions

Framework: React Native + Expo (development build now, not Expo Go)
Navigation: React Navigation (native-stack)
Networking: react-native-tcp-socket + expo-network (chose this over Firebase because offline is essential)
Build system: EAS Build (Expo's cloud build service)
Source control: Git (local only so far, not yet pushed to GitHub)
Package ID: com.pedro.cardgameapp

📂 Current Project Structure
card-game-app/
├── assets/
├── components/
│   └── Card.js              (reusable playing card visual)
├── game/
│   └── deck.js              (createDeck, shuffleDeck, calculateHandValue)
├── screens/
│   ├── HomeScreen.js        (main menu — has temporary "🧪 Test Game Screen" button)
│   ├── HostSetupScreen.js   (placeholder "Coming soon!")
│   ├── JoinScreen.js        (placeholder "Coming soon!")
│   ├── LobbyScreen.js       (placeholder "Coming soon!")
│   ├── GameScreen.js        (FULLY WORKING Blackjack)
│   ├── ResultsScreen.js     (placeholder "Coming soon!")
│   └── SettingsScreen.js    (placeholder "Coming soon!")
├── App.js                   (navigation setup, all 7 screens wired)
├── app.json                 (com.pedro.cardgameapp, has EAS projectId)
├── eas.json                 (development/preview/production profiles)
└── package.json
🎨 Visual Style Established

Dark navy background (#1a1a2e)
Red/pink accent (#e94560) for primary buttons
Dark green card table (#0d5c2e) on game screen
White cards with red hearts/diamonds, black spades/clubs
Hidden card shown as red back with 🂠 symbol

✅ Git History

Commit 1: "Initial working app with navigation and 7 screens"
Commit 2: "Phase 3: Single-player Blackjack game complete"

📍 Where We Are Right Now
Just kicked off the EAS development build: eas build --profile development --platform android — currently running on Expo servers (~25 min). When it finishes, you'll install the custom APK on your Android, run npx expo start --dev-client, and reconnect. Then we start building real multiplayer.
🔮 Next Steps After Build Finishes

Install the custom APK on your Android phone (via QR code from build page)
Run npx expo start --dev-client in terminal
Open the new "Card Games" app on phone, scan QR, verify Blackjack still works
Begin Host a Game feature — host opens a room, phone starts listening for connections
Then Join a Game, Lobby, then multiplayer Blackjack

⚠️ Important Preferences / Principles

Always use tappable checkbox questions, not typed responses
Explain every new concept in plain English
Warn about decisions that could hurt later
Recommend simplest beginner path unless told otherwise
Don't write partial code and ask user to fill in — give complete ready-to-paste blocks
One phase per session when possible, small steps within each