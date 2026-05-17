import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  BackHandler,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createDeck, shuffleDeck, calculateHandValue } from "../game/deck";
import Card from "../components/Card";
import { scale, scaleFont } from "../game/responsive";
import GameHeader from "../components/GameHeader";
import EndOfRoundModal from "../components/EndOfRoundModal";
import StatsStrip from "../components/StatsStrip";
import {
  setServerListeners,
  broadcastToClients,
  setClientListeners,
  sendToHost,
  stopServer,
  disconnectFromHost,
} from "../game/GameNetwork";
import { getTableTheme } from "../game/tableThemes";

const BG = getTableTheme("blackjack").table;

// ─── Pure game-logic helpers (no React, easy to test) ────────────────────────

function dealCards(playerList, handNumber = 1) {
  const deck = shuffleDeck(createDeck());
  const n = playerList.length;

  // Standard interleaved deal: p1, p2, …, dealer, p1, p2, …, dealer
  const players = playerList.map((p, i) => ({
    id: p.id,
    name: p.name,
    hand: [deck[i], deck[n + 1 + i]],
    splitHand: null, // Card[] | null
    splitStatus: null, // null | 'playing' | 'stand' | 'bust'
    status: "playing", // 'playing' | 'stand' | 'bust'
    result: "", // '' | 'win' | 'lose' | 'push'
    splitResult: "", // '' | 'win' | 'lose' | 'push'
  }));

  const dealer = {
    hand: [deck[n], deck[n * 2 + 1]],
    status: "playing",
  };

  return {
    deck: deck.slice(n * 2 + 2),
    handNumber,
    phase: "playing", // 'playing' | 'results'
    currentPlayerIndex: 0,
    currentHandSlot: "main", // 'main' | 'split'
    players,
    dealer,
  };
}

function doSplit(state, playerIndex) {
  const p = state.players[playerIndex];
  const [newCard0, newCard1, ...restDeck] = state.deck;

  const players = state.players.map((pl, i) =>
    i === playerIndex
      ? {
          ...pl,
          hand: [p.hand[0], newCard0],
          splitHand: [p.hand[1], newCard1],
          splitStatus: "playing",
        }
      : pl,
  );

  return { ...state, deck: restDeck, players, currentHandSlot: "main" };
}

function doHit(state, playerIndex) {
  const [card, ...rest] = state.deck;
  const p = state.players[playerIndex];
  const slot = state.currentHandSlot;

  let updatedPlayer;
  if (slot === "split") {
    const newHand = [...p.splitHand, card];
    const bust = calculateHandValue(newHand) > 21;
    updatedPlayer = {
      ...p,
      splitHand: newHand,
      splitStatus: bust ? "bust" : "playing",
    };
  } else {
    const newHand = [...p.hand, card];
    const bust = calculateHandValue(newHand) > 21;
    updatedPlayer = { ...p, hand: newHand, status: bust ? "bust" : "playing" };
  }

  const players = state.players.map((pl, i) =>
    i === playerIndex ? updatedPlayer : pl,
  );
  const updated = { ...state, deck: rest, players };

  const isBust =
    slot === "split"
      ? updatedPlayer.splitStatus === "bust"
      : updatedPlayer.status === "bust";

  if (isBust) {
    // Main bust with a split still to play → switch to split slot (same player's turn)
    if (
      slot === "main" &&
      p.splitHand !== null &&
      p.splitStatus === "playing"
    ) {
      return { ...updated, currentHandSlot: "split" };
    }
    return advanceTurn(updated);
  }

  return updated;
}

function doStand(state, playerIndex) {
  const p = state.players[playerIndex];
  const slot = state.currentHandSlot;

  const updatedPlayer =
    slot === "split"
      ? { ...p, splitStatus: "stand" }
      : { ...p, status: "stand" };

  const players = state.players.map((pl, i) =>
    i === playerIndex ? updatedPlayer : pl,
  );
  const updated = { ...state, players };

  // Main stand with a split still to play → switch to split slot
  if (slot === "main" && p.splitHand !== null && p.splitStatus === "playing") {
    return { ...updated, currentHandSlot: "split" };
  }

  return advanceTurn(updated);
}

function advanceTurn(state) {
  let nextIdx = state.currentPlayerIndex + 1;
  while (
    nextIdx < state.players.length &&
    state.players[nextIdx].status !== "playing"
  ) {
    nextIdx++;
  }
  if (nextIdx >= state.players.length) return runDealer(state);
  return { ...state, currentPlayerIndex: nextIdx, currentHandSlot: "main" };
}

function runDealer(state) {
  let hand = [...state.dealer.hand];
  let deck = [...state.deck];

  while (calculateHandValue(hand) < 17) hand.push(deck.shift());

  const dealerValue = calculateHandValue(hand);
  const dealerBust = dealerValue > 21;

  const players = state.players.map((p) => {
    // Main hand result
    let result;
    if (p.status === "bust") {
      result = "lose";
    } else {
      const pv = calculateHandValue(p.hand);
      if (dealerBust || pv > dealerValue) result = "win";
      else if (pv < dealerValue) result = "lose";
      else result = "push";
    }

    // Split hand result (if exists)
    let splitResult = "";
    if (p.splitHand !== null) {
      if (p.splitStatus === "bust") {
        splitResult = "lose";
      } else {
        const sv = calculateHandValue(p.splitHand);
        if (dealerBust || sv > dealerValue) splitResult = "win";
        else if (sv < dealerValue) splitResult = "lose";
        else splitResult = "push";
      }
    }

    return { ...p, result, splitResult };
  });

  return {
    ...state,
    deck,
    phase: "results",
    currentPlayerIndex: -1,
    currentHandSlot: "main",
    dealer: { hand, status: dealerBust ? "bust" : "stand" },
    players,
  };
}

// Strip the deck and hide dealer hole card for the broadcast to clients
function toBroadcast(state) {
  return {
    phase: state.phase,
    currentPlayerIndex: state.currentPlayerIndex,
    currentHandSlot: state.currentHandSlot,
    handNumber: state.handNumber,
    players: state.players,
    dealer: {
      hand: state.dealer.hand.map((c, i) =>
        i === 1 && state.phase === "playing"
          ? { id: "hidden", hidden: true }
          : c,
      ),
      status: state.dealer.status,
    },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MultiplayerGameScreen({ navigation, route }) {
  const { role, myName, players: initialPlayers } = route.params;
  const isHost = role === "host";

  const { width } = useWindowDimensions();
  const handWidth = width - 48; // matches single-player's 12*2+12*2 padding math

  const [gameState, setGameState] = useState(null);
  const [showRoundModal, setShowRoundModal] = useState(false);
  // stateRef lets network callbacks always read the latest state without stale closures
  const stateRef = useRef(null);
  // currentPlayersRef holds the live player list — updates when someone disconnects
  const currentPlayersRef = useRef(initialPlayers);

  function applyState(newState) {
    stateRef.current = newState;
    setGameState(newState);
    if (isHost) {
      broadcastToClients({ type: "GAME_STATE", ...toBroadcast(newState) });
    }
  }

  // ── Host: deal cards and listen for client actions ──
  useEffect(() => {
    if (!isHost) return;

    applyState(dealCards(initialPlayers));

    setServerListeners({
      onMessage: (msg, clientId) => {
        if (msg.type !== "ACTION") return;
        const state = stateRef.current;
        if (!state || state.phase !== "playing") return;

        const idx = state.players.findIndex((p) => p.id === clientId);
        if (idx !== state.currentPlayerIndex) return; // not their turn

        let newState;
        if (msg.action === "hit") newState = doHit(state, idx);
        else if (msg.action === "stand") newState = doStand(state, idx);
        else if (msg.action === "split") newState = doSplit(state, idx);
        else return;
        applyState(newState);
      },
      onClientLeft: ({ id }) => {
        // Keep the live player list in sync so Play Again deals to the right people
        currentPlayersRef.current = currentPlayersRef.current.filter(
          (p) => String(p.id) !== String(id),
        );
        // Auto-stand a disconnected player so the game can continue
        const state = stateRef.current;
        if (!state || state.phase !== "playing") return;
        const idx = state.players.findIndex((p) => p.id === id);
        if (idx === -1) return;
        applyState(doStand(state, idx));
      },
    });
  }, []);

  // ── Client: listen for game state updates from host ──
  useEffect(() => {
    if (isHost) return;

    setClientListeners({
      onMessage: (msg) => {
        if (msg.type === "GAME_STATE") setGameState(msg);
      },
      onDisconnected: () => {
        Alert.alert("Disconnected", "Lost connection to the host.", [
          { text: "OK", onPress: () => navigation.navigate("Home") },
        ]);
      },
    });
  }, []);

  useEffect(() => {
    if (gameState?.phase === "results") setShowRoundModal(true);
  }, [gameState?.phase]);

  // ── Actions ──
  function handleAction(action) {
    if (isHost) {
      const state = stateRef.current;
      if (!state || state.phase !== "playing") return;
      const myIdx = state.players.findIndex((p) => p.id === "host");
      if (state.currentPlayerIndex !== myIdx) return;
      let newState;
      if (action === "hit") newState = doHit(state, myIdx);
      else if (action === "stand") newState = doStand(state, myIdx);
      else if (action === "split") newState = doSplit(state, myIdx);
      else return;
      applyState(newState);
    } else {
      sendToHost({ type: "ACTION", action });
    }
  }

  function handlePlayAgain() {
    const nextHandNumber = (gameState?.handNumber ?? 1) + 1;
    setShowRoundModal(false);
    applyState(dealCards(currentPlayersRef.current, nextHandNumber));
  }

  function handleQuit() {
    if (isHost) stopServer();
    else disconnectFromHost();
    navigation.navigate("Home");
  }

  // UX-5: Android hardware back confirmation
  useEffect(() => {
    const onBack = () => {
      Alert.alert(
        "Leave Game?",
        isHost
          ? "You'll end the game for everyone."
          : "You'll disconnect from the host.",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: () => {
              if (isHost) stopServer();
              else disconnectFromHost();
              navigation.navigate("Home");
            },
          },
        ],
      );
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => sub.remove();
  }, [navigation, isHost]);

  const menuItems = [
    {
      type: "restart",
      onRestart: isHost ? handlePlayAgain : null,
      disabled: !isHost,
    },
    { type: "howto", gameId: "blackjack" },
    { type: "theme" },
    { type: "divider" },
    { type: "quit", onQuit: handleQuit },
  ];

  // ── Loading state ──
  if (!gameState) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Dealing cards…</Text>
      </View>
    );
  }

  const { phase, currentPlayerIndex, currentHandSlot, players, dealer } =
    gameState;

  // Find "me" in the players array
  const myIndex = players.findIndex((p) =>
    isHost ? p.id === "host" : p.name === myName,
  );
  const isMyTurn = phase === "playing" && currentPlayerIndex === myIndex;
  const showFullDealer = phase === "results";
  const currentPlayer =
    currentPlayerIndex >= 0 ? players[currentPlayerIndex] : null;

  // Split eligibility for the local player
  const myPlayer = myIndex >= 0 ? players[myIndex] : null;
  const canSplit =
    isMyTurn &&
    myPlayer?.splitHand === null &&
    (currentHandSlot ?? "main") === "main" &&
    myPlayer?.hand?.length === 2 &&
    myPlayer?.hand?.[0]?.rank === myPlayer?.hand?.[1]?.rank;

  const playersCount = players.length;
  const handNumber = gameState?.handNumber ?? 1;

  let statusText = "Waiting";
  if (phase === "playing") {
    statusText = isMyTurn ? "Your turn" : "Waiting";
  } else if (phase === "results") {
    statusText = "Dealer playing";
  }

  function resultColor(r) {
    return r === "win" ? "#4caf50" : r === "lose" ? "#e94560" : "#ffd700";
  }
  function resultLabel(r) {
    if (r === "win") return "✓ WIN";
    if (r === "lose") return "✗ LOSE";
    if (r === "push") return "~ TIE";
    return "";
  }

  function resultIcon(r) {
    if (r === "win") return "🎉 WIN";
    if (r === "lose") return "💥 LOSE";
    if (r === "push") return "🤝 TIE";
    return "";
  }

  function localResultMessage(r) {
    if (r === "win") return "🎉 You win!";
    if (r === "lose") return "😞 Dealer wins.";
    if (r === "push") return "🤝 Push — bet returned.";
    return "";
  }

  return (
    <SafeAreaView style={styles.screenRoot}>
      <GameHeader
        gameId="blackjack"
        title="Blackjack"
        subtitle="Multiplayer"
        menuItems={menuItems}
      />
      <StatsStrip
        gameId="blackjack"
        items={[
          { label: "Players", value: playersCount },
          { label: "Hand", value: handNumber },
          { label: "Status", value: statusText, accent: true },
        ]}
      />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Turn / phase banner */}
        <View
          style={[styles.banner, phase === "results" && styles.bannerResults]}
        >
          <Text style={styles.bannerText}>
            {phase === "results"
              ? "Game Over"
              : isMyTurn
                ? "▶  Your turn"
                : `Waiting for ${currentPlayer?.name}…`}
          </Text>
        </View>

        {/* Dealer */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Dealer — {showFullDealer ? "total:" : "shows"}{" "}
            {showFullDealer
              ? calculateHandValue(dealer.hand)
              : dealer.hand.length > 0 && !dealer.hand[0].hidden
                ? calculateHandValue([dealer.hand[0]])
                : 0}
            {showFullDealer && dealer.status === "bust" ? " 💥" : ""}
          </Text>
          <View style={[styles.hand, { width: handWidth }]}>
            {dealer.hand.map((card) => (
              <Card
                key={card.id}
                rank={card.rank}
                suit={card.suit}
                faceDown={!!card.hidden}
                sizeScale={1}
              />
            ))}
          </View>
        </View>

        {/* All players */}
        {players.map((player, index) => {
          const isMe = index === myIndex;
          const isCurrent = index === currentPlayerIndex && phase === "playing";
          const hasSplit = player.splitHand !== null;
          const mainHandValue = calculateHandValue(player.hand);
          const splitHandValue = hasSplit
            ? calculateHandValue(player.splitHand)
            : 0;
          const slot = currentHandSlot ?? "main";

          return (
            <View key={String(player.id)} style={styles.section}>
              {isMe &&
                phase === "results" &&
                !hasSplit &&
                player.result !== "" && (
                  <Text style={[styles.label, { fontSize: scaleFont(24) }]}>
                    {localResultMessage(player.result)}
                  </Text>
                )}

              {/* Main hand label */}
              <Text style={styles.label}>
                {hasSplit
                  ? (isCurrent && slot === "main" ? "▶ " : "") +
                    (isMe ? "Your Hand 1" : `${player.name}'s Hand 1`) +
                    ` — total: ${mainHandValue}`
                  : (isCurrent ? "▶ " : "") +
                    (isMe
                      ? `You — total: ${mainHandValue}`
                      : `${player.name} — total: ${mainHandValue}`)}
                {phase === "playing" && player.status === "bust" ? " 💥" : ""}
                {phase === "playing" && player.status === "stand" ? " ✋" : ""}
                {phase === "results" && player.result !== ""
                  ? !isMe || hasSplit
                    ? ` ${resultIcon(player.result)}`
                    : ""
                  : ""}
              </Text>

              <View
                style={[
                  styles.hand,
                  { width: handWidth },
                  isCurrent &&
                    (!hasSplit || slot === "main") &&
                    styles.activeHand,
                ]}
              >
                {player.hand.map((card) => (
                  <Card
                    key={card.id}
                    rank={card.rank}
                    suit={card.suit}
                    sizeScale={1}
                  />
                ))}
              </View>

              {/* Split hand */}
              {hasSplit && (
                <>
                  <Text style={styles.label}>
                    {(isCurrent && slot === "split" ? "▶ " : "") +
                      (isMe ? "Your Hand 2" : `${player.name}'s Hand 2`) +
                      ` — total: ${splitHandValue}`}
                    {phase === "playing" && player.splitStatus === "bust"
                      ? " 💥"
                      : ""}
                    {phase === "playing" && player.splitStatus === "stand"
                      ? " ✋"
                      : ""}
                    {phase === "results" && player.splitResult !== ""
                      ? ` ${resultIcon(player.splitResult)}`
                      : ""}
                  </Text>

                  <View
                    style={[
                      styles.hand,
                      { width: handWidth },
                      isCurrent && slot === "split" && styles.activeHand,
                    ]}
                  >
                    {player.splitHand.map((card) => (
                      <Card
                        key={card.id}
                        rank={card.rank}
                        suit={card.suit}
                        sizeScale={1}
                      />
                    ))}
                  </View>
                </>
              )}
            </View>
          );
        })}

        <EndOfRoundModal
          visible={showRoundModal}
          title="Hand Over"
          message={(() => {
            const main = myPlayer?.result ?? "";
            const split = myPlayer?.splitResult ?? "";
            const hadSplit = myPlayer?.splitHand !== null;

            if (!main) return "";

            if (hadSplit) {
              const toWord = (r) =>
                r === "win" ? "Won" : r === "lose" ? "Lost" : "Push";
              return `Hand 1: ${toWord(main)}  ·  Hand 2: ${toWord(split)}`;
            }

            if (main === "win") return "You won this hand!";
            if (main === "lose") return "Dealer wins.";
            if (main === "push") return "Push — bet returned.";
            return "";
          })()}
          showContinue={isHost}
          showLeave
          onContinue={handlePlayAgain}
          onLeave={handleQuit}
          tableColor={BG}
        />
      </ScrollView>

      {isMyTurn && (
        <View style={styles.bottomArea}>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.hitButton]}
              onPress={() => handleAction("hit")}
              accessibilityRole="button"
              accessibilityLabel="Hit"
              accessibilityHint="Take another card"
            >
              <Text style={styles.buttonText}>Hit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.standButton]}
              onPress={() => handleAction("stand")}
              accessibilityRole="button"
              accessibilityLabel="Stand"
              accessibilityHint="End your turn with current cards"
            >
              <Text style={styles.buttonText}>Stand</Text>
            </TouchableOpacity>
            {canSplit && (
              <TouchableOpacity
                style={[styles.button, styles.splitButton]}
                onPress={() => handleAction("split")}
                accessibilityRole="button"
                accessibilityLabel="Split"
                accessibilityHint="Split matching pair into two hands"
              >
                <Text style={styles.buttonText}>Split</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: BG },
  loading: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { color: "#fff", fontSize: scaleFont(18) },

  container: {
    flexGrow: 1,
    backgroundColor: BG,
    paddingHorizontal: scale(12),
    paddingVertical: scale(20),
    paddingBottom: scale(30),
    alignItems: "center",
  },

  banner: {
    width: "100%",
    backgroundColor: "#e94560",
    borderRadius: scale(10),
    paddingVertical: scale(10),
    alignItems: "center",
    marginBottom: scale(12),
  },
  bannerResults: { backgroundColor: BG },
  bannerText: { color: "#fff", fontSize: scaleFont(16), fontWeight: "bold" },

  section: {
    alignItems: "center",
    marginVertical: scale(16),
    width: "100%",
  },
  label: {
    color: "#ffffff",
    fontSize: scaleFont(18),
    fontWeight: "bold",
    marginBottom: scale(10),
    textAlign: "center",
  },
  hand: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  activeHand: {
    borderWidth: 2,
    borderColor: "#ffd700",
    borderRadius: scale(10),
    padding: scale(4),
  },

  bottomArea: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingHorizontal: scale(12),
    paddingBottom: scale(16),
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: scale(10),
  },
  button: {
    minHeight: scale(68),
    paddingHorizontal: scale(40),
    borderRadius: scale(10),
    justifyContent: "center",
    alignItems: "center",
  },
  hitButton: { backgroundColor: "#e94560" },
  standButton: { backgroundColor: "#2980b9" },
  splitButton: { backgroundColor: "#8e44ad" },
  buttonText: {
    color: "#ffffff",
    fontSize: scaleFont(14),
    fontWeight: "bold",
  },

  waitText: {
    color: "#aaa",
    textAlign: "center",
    fontSize: scaleFont(14),
    marginTop: scale(8),
  },
});
