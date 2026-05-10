import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { createDeck, shuffleDeck, calculateHandValue } from "../game/deck";
import Card from "../components/Card";
import { scale, scaleFont } from "../game/responsive";
import QuitButton from "../components/QuitButton";
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

function dealCards(playerList) {
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

  const [gameState, setGameState] = useState(null);
  // stateRef lets network callbacks always read the latest state without stale closures
  const stateRef = useRef(null);

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
    applyState(dealCards(initialPlayers));
  }

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

  function resultColor(r) {
    return r === "win" ? "#4caf50" : r === "lose" ? "#e94560" : "#ffd700";
  }
  function resultLabel(r) {
    if (r === "win") return "✓ WIN";
    if (r === "lose") return "✗ LOSE";
    if (r === "push") return "~ TIE";
    return "";
  }

  return (
    <View style={styles.screenRoot}>
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionName}>Dealer</Text>
            <Text style={styles.sectionValue}>
              {showFullDealer
                ? `= ${calculateHandValue(dealer.hand)}`
                : dealer.hand.length > 0 && !dealer.hand[0].hidden
                  ? `shows ${calculateHandValue([dealer.hand[0]])}`
                  : ""}
            </Text>
            {showFullDealer && dealer.status === "bust" && (
              <Text style={styles.labelBust}>BUST</Text>
            )}
          </View>
          <View style={styles.handRow}>
            {dealer.hand.map((card) => (
              <Card
                key={card.id}
                rank={card.rank}
                suit={card.suit}
                faceDown={!!card.hidden}
                sizeScale={2}
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
            <View
              key={String(player.id)}
              style={[styles.section, isCurrent && styles.sectionActive]}
            >
              {/* Section header */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionName}>
                  {player.name}
                  {isMe ? " (you)" : ""}
                </Text>
                {!hasSplit && (
                  <>
                    <Text style={styles.sectionValue}>= {mainHandValue}</Text>
                    {phase === "playing" && player.status === "bust" && (
                      <Text style={styles.labelBust}>BUST</Text>
                    )}
                    {phase === "playing" && player.status === "stand" && (
                      <Text style={styles.labelStand}>STAND</Text>
                    )}
                    {phase === "results" && player.result !== "" && (
                      <Text
                        style={[
                          styles.labelResult,
                          { color: resultColor(player.result) },
                        ]}
                      >
                        {resultLabel(player.result)}
                      </Text>
                    )}
                  </>
                )}
              </View>

              {/* Main hand label (only when split exists) */}
              {hasSplit && (
                <View style={styles.handLabelRow}>
                  <Text style={styles.handLabel}>
                    {isCurrent && slot === "main" ? "▶ " : ""}Hand 1 ={" "}
                    {mainHandValue}
                  </Text>
                  {phase === "playing" && player.status === "bust" && (
                    <Text style={styles.labelBust}>BUST</Text>
                  )}
                  {phase === "playing" && player.status === "stand" && (
                    <Text style={styles.labelStand}>STAND</Text>
                  )}
                  {phase === "results" && player.result !== "" && (
                    <Text
                      style={[
                        styles.labelResult,
                        { color: resultColor(player.result) },
                      ]}
                    >
                      {resultLabel(player.result)}
                    </Text>
                  )}
                </View>
              )}

              {/* Main hand cards */}
              <View
                style={[
                  styles.handRow,
                  hasSplit &&
                    isCurrent &&
                    slot === "main" &&
                    styles.activeHandBorder,
                ]}
              >
                {player.hand.map((card) => (
                  <Card
                    key={card.id}
                    rank={card.rank}
                    suit={card.suit}
                    sizeScale={2}
                  />
                ))}
              </View>

              {/* Split hand */}
              {hasSplit && (
                <>
                  <View style={styles.handLabelRow}>
                    <Text style={styles.handLabel}>
                      {isCurrent && slot === "split" ? "▶ " : ""}Hand 2 ={" "}
                      {splitHandValue}
                    </Text>
                    {phase === "playing" && player.splitStatus === "bust" && (
                      <Text style={styles.labelBust}>BUST</Text>
                    )}
                    {phase === "playing" && player.splitStatus === "stand" && (
                      <Text style={styles.labelStand}>STAND</Text>
                    )}
                    {phase === "results" && player.splitResult !== "" && (
                      <Text
                        style={[
                          styles.labelResult,
                          { color: resultColor(player.splitResult) },
                        ]}
                      >
                        {resultLabel(player.splitResult)}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.handRow,
                      isCurrent && slot === "split" && styles.activeHandBorder,
                    ]}
                  >
                    {player.splitHand.map((card) => (
                      <Card
                        key={card.id}
                        rank={card.rank}
                        suit={card.suit}
                        sizeScale={2}
                      />
                    ))}
                  </View>
                </>
              )}

              {/* Hit / Stand / Split — only for the active player on their turn */}
              {isMe && isMyTurn && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.hitBtn]}
                    onPress={() => handleAction("hit")}
                  >
                    <Text style={styles.actionBtnText}>Hit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.standBtn]}
                    onPress={() => handleAction("stand")}
                  >
                    <Text style={styles.actionBtnText}>Stand</Text>
                  </TouchableOpacity>
                  {canSplit && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.splitBtn]}
                      onPress={() => handleAction("split")}
                    >
                      <Text style={styles.actionBtnText}>Split</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Play Again — host only, after results */}
        {phase === "results" && isHost && (
          <TouchableOpacity
            style={styles.playAgainBtn}
            onPress={handlePlayAgain}
          >
            <Text style={styles.playAgainText}>🔄 Play Again</Text>
          </TouchableOpacity>
        )}
        {phase === "results" && !isHost && (
          <Text style={styles.waitText}>
            Waiting for host to deal a new hand…
          </Text>
        )}
      </ScrollView>
      <QuitButton
        onQuit={() => {
          if (isHost) {
            stopServer();
          } else {
            disconnectFromHost();
          }
          navigation.navigate("Home");
        }}
      />
    </View>
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
    padding: scale(14),
    paddingBottom: scale(40),
  },

  banner: {
    backgroundColor: "#e94560",
    borderRadius: scale(10),
    paddingVertical: scale(10),
    alignItems: "center",
    marginBottom: scale(12),
  },
  bannerResults: { backgroundColor: BG },
  bannerText: { color: "#fff", fontSize: scaleFont(16), fontWeight: "bold" },

  section: {
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(12),
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  sectionActive: {
    borderColor: "#ffd700",
    backgroundColor: "rgba(255,215,0,0.08)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scale(8),
    gap: scale(8),
  },
  sectionName: {
    color: "#fff",
    fontSize: scaleFont(16),
    fontWeight: "bold",
    flex: 1,
  },
  sectionValue: { color: "#ccc", fontSize: scaleFont(14) },

  labelBust: { color: "#e94560", fontWeight: "bold", fontSize: scaleFont(13) },
  labelStand: { color: "#999", fontWeight: "bold", fontSize: scaleFont(13) },
  labelResult: { fontWeight: "bold", fontSize: scaleFont(15) },

  handRow: { flexDirection: "row", flexWrap: "wrap" },
  activeHandBorder: {
    borderWidth: 2,
    borderColor: "#ffd700",
    borderRadius: scale(8),
    padding: scale(2),
  },

  handLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    marginTop: scale(10),
    marginBottom: scale(4),
  },
  handLabel: { color: "#ddd", fontSize: scaleFont(13), fontWeight: "bold" },

  actionRow: { flexDirection: "row", marginTop: scale(12), gap: scale(10) },
  actionBtn: {
    flex: 1,
    paddingVertical: scale(14),
    borderRadius: scale(8),
    alignItems: "center",
  },
  hitBtn: { backgroundColor: "#e94560" },
  standBtn: { backgroundColor: "#2980b9" },
  splitBtn: { backgroundColor: "#8e44ad" },
  actionBtnText: { color: "#fff", fontSize: scaleFont(16), fontWeight: "bold" },

  playAgainBtn: {
    backgroundColor: "#e94560",
    borderRadius: scale(10),
    paddingVertical: scale(16),
    alignItems: "center",
    marginTop: scale(4),
  },
  playAgainText: { color: "#fff", fontSize: scaleFont(18), fontWeight: "bold" },

  waitText: {
    color: "#aaa",
    textAlign: "center",
    fontSize: scaleFont(14),
    marginTop: scale(8),
  },
});
