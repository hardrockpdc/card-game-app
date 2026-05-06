import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Card from "../components/Card";
import { scale, scaleFont } from "../game/responsive";
import {
  broadcastToClients,
  sendToClient,
  sendToHost,
  setClientListeners,
  setServerListeners,
} from "../game/GameNetwork";

const {
  createRummyState,
  rummyReducer,
  rummyAiChooseMove,
  getRummyVariantLabel,
  calculateRummyDeadwood,
} = require("../game/rummy");

function findLocalPlayerIndex(players, myName, isHost) {
  if (isHost) {
    return 0;
  }

  const byName = players.findIndex((player) => player?.name === myName);
  return byName >= 0 ? byName : 0;
}

function getPlayerName(players, index) {
  return players?.[index]?.name || `Player ${index + 1}`;
}

function getMeldOwnerName(players, meld, index) {
  const ownerIndex = Number.isInteger(meld?.owner) ? meld.owner : -1;
  if (ownerIndex >= 0 && players?.[ownerIndex]) {
    return players[ownerIndex].name;
  }

  return `Meld ${index + 1}`;
}

function cloneMelds(melds) {
  return (melds || []).map((meld) => ({
    ...meld,
    cards: (meld.cards || []).map((card) => ({ ...card })),
  }));
}

function toPublicState(state) {
  const discardTop =
    state?.discardPile?.length > 0
      ? state.discardPile[state.discardPile.length - 1]
      : null;

  return {
    gameType: state.gameType,
    variantId: state.variantId,
    variantLabel: state.variantLabel,
    difficulty: state.difficulty,
    phase: state.phase,
    currentPlayerIndex: state.currentPlayerIndex,
    roundNumber: state.roundNumber,
    statusMessage: state.statusMessage,
    stockCount: state.stock?.length ?? 0,
    discardCount: state.discardPile?.length ?? 0,
    discardTop,
    winner: state.winner,
    tie: state.tie,
    scoreToWin: state.scoreToWin,
    minMeldSize: state.minMeldSize,
    knockLimit: state.knockLimit,
    players: (state.players || []).map((player, index) => ({
      id: player.id,
      name: player.name,
      isAI: Boolean(player.isAI),
      score: state.scores?.[index] ?? player.score ?? 0,
      knocked: Boolean(player.knocked),
      finished: Boolean(player.finished),
      handCount: state.hands?.[index]?.length ?? 0,
    })),
    melds: cloneMelds(state.melds),
  };
}

function normalizeVariantId(routeParams = {}) {
  return routeParams.variantId || routeParams.variant || "ginRummy";
}

function getActionLabel(state, isCurrentPlayer) {
  if (!isCurrentPlayer) {
    return "Waiting for turn…";
  }

  if (state.phase === "draw") {
    return "Draw a card from stock or discard";
  }

  if (state.phase === "discard") {
    return "Lay melds, extend a meld, or discard one card";
  }

  if (state.phase === "game-over") {
    return "Game over";
  }

  return "Rummy";
}

function RummyCard({
  card,
  small = false,
  selected = false,
  onPress,
  disabled = false,
}) {
  const isJoker = card?.rank === "JOKER";

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.cardWrap,
        small && styles.cardWrapSmall,
        selected && styles.cardWrapSelected,
        pressed && !disabled && styles.cardWrapPressed,
        disabled && styles.cardWrapDisabled,
      ]}
    >
      {isJoker ? (
        <View style={[styles.jokerCard, small && styles.jokerCardSmall]}>
          <Text style={styles.jokerEmoji}>🃏</Text>
          <Text style={styles.jokerText}>Joker</Text>
        </View>
      ) : (
        <Card rank={card.rank} suit={card.suit} small={small} />
      )}
    </Pressable>
  );
}

export default function RummyGameScreen({ navigation, route }) {
  const params = route?.params ?? {};
  const variantId = normalizeVariantId(params);
  const {
    role = "singleplayer",
    myName = "Player 1",
    players = [],
    difficulty = "normal",
  } = params;

  const isSinglePlayer = role === "singleplayer" || role === "ai" || !role;
  const isHost = role === "host" || isSinglePlayer;

  const localPlayerIndex = useMemo(
    () => findLocalPlayerIndex(players, myName, isHost),
    [players, myName, isHost],
  );

  const [gameState, setGameState] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const [selectedHandIndexes, setSelectedHandIndexes] = useState([]);
  const [selectedMeldIndex, setSelectedMeldIndex] = useState(null);
  const [showHeaderDetails, setShowHeaderDetails] = useState(false);

  const fullRef = useRef(null);
  const aiTimerRef = useRef(null);

  const variantLabel =
    gameState?.variantLabel || getRummyVariantLabel(variantId);
  const currentPlayers = gameState?.players || players;
  const currentPlayerIndex = gameState?.currentPlayerIndex ?? 0;
  const currentPlayer = currentPlayers[currentPlayerIndex];
  const isMyTurn = currentPlayerIndex === localPlayerIndex;
  const currentPhase = gameState?.phase || "draw";
  const statusMessage = gameState?.statusMessage || "Loading…";
  const myMelds = (gameState?.melds || []).filter(
    (meld) => Number.isInteger(meld?.owner) && meld.owner === localPlayerIndex,
  );
  const myDeadwood = calculateRummyDeadwood(myHand, myMelds);
  const discardTop =
    gameState?.discardTop ||
    (fullRef.current?.discardPile?.length
      ? fullRef.current.discardPile[fullRef.current.discardPile.length - 1]
      : null);

  function clearSelection() {
    setSelectedHandIndexes([]);
    setSelectedMeldIndex(null);
  }

  function scheduleAI(state) {
    if (!isHost || state.phase === "game-over") {
      return;
    }

    const current = state.players?.[state.currentPlayerIndex];
    if (!current?.isAI) {
      return;
    }

    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
    }

    aiTimerRef.current = setTimeout(
      () => {
        const latest = fullRef.current;
        if (!latest || latest.phase === "game-over") {
          return;
        }

        const active = latest.players?.[latest.currentPlayerIndex];
        if (!active?.isAI) {
          return;
        }

        const move = rummyAiChooseMove(
          latest,
          latest.currentPlayerIndex,
          difficulty,
        );

        const next = rummyReducer(latest, {
          type: move.type,
          pid: latest.currentPlayerIndex,
          ...move,
        });

        if (next !== latest) {
          applyState(next);
        }
      },
      900 + Math.random() * 500,
    );
  }

  function applyState(nextState) {
    fullRef.current = nextState;
    setGameState(toPublicState(nextState));
    setMyHand(
      nextState.hands?.[localPlayerIndex]
        ? [...nextState.hands[localPlayerIndex]]
        : [],
    );
    clearSelection();

    if (!isSinglePlayer) {
      broadcastToClients({
        type: "GAME_STATE",
        ...toPublicState(nextState),
      });

      (nextState.players || []).forEach((player, index) => {
        if (player.isAI || String(player.id) === "host") {
          return;
        }

        sendToClient(player.id, {
          type: "PRIVATE_HAND",
          hand: nextState.hands?.[index] ? [...nextState.hands[index]] : [],
        });
      });
    }

    scheduleAI(nextState);
  }

  useEffect(() => {
    if (!isHost) {
      setClientListeners({
        onMessage: (msg) => {
          if (msg.type === "GAME_STATE") {
            setGameState(msg);
            clearSelection();
          }

          if (msg.type === "PRIVATE_HAND") {
            setMyHand(msg.hand || []);
          }
        },
        onDisconnected: () => {
          Alert.alert("Disconnected", "Lost connection to the host.", [
            { text: "OK", onPress: () => navigation.navigate("Home") },
          ]);
        },
      });

      return () => setClientListeners({});
    }

    const initialPlayers =
      Array.isArray(players) && players.length > 0
        ? players
        : [
            { id: "host", name: myName, isAI: false },
            { id: "ai_1", name: "Computer", isAI: true },
          ];

    applyState(
      createRummyState({
        variantId,
        players: initialPlayers,
        difficulty,
      }),
    );

    if (!isSinglePlayer) {
      setServerListeners({
        onMessage: (msg, clientId) => {
          const state = fullRef.current;
          if (!state || state.phase === "game-over") {
            return;
          }

          if (msg.type !== "ACTION") {
            return;
          }

          const playerIndex = state.players.findIndex(
            (player) => String(player.id) === String(clientId),
          );

          if (playerIndex !== state.currentPlayerIndex) {
            return;
          }

          const moveType = msg.moveType || msg.action || msg.typeName;
          if (!moveType) {
            return;
          }

          const next = rummyReducer(state, {
            type: moveType,
            pid: playerIndex,
            ...msg,
          });

          if (next !== state) {
            applyState(next);
          }
        },
      });
    }

    return () => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
      }
      if (!isSinglePlayer) {
        setServerListeners({});
      }
    };
  }, []);

  const canGoBack =
    typeof navigation?.canGoBack === "function"
      ? navigation.canGoBack()
      : false;

  function renderHeaderCard(isResults = false) {
    const winnerName =
      gameState?.winner != null
        ? getPlayerName(currentPlayers, gameState.winner)
        : "Nobody";
    const headerSubtitle = isResults
      ? gameState.tie
        ? "The round ended in a tie."
        : `${winnerName} wins the round.`
      : statusMessage;

    return (
      <View
        style={[
          styles.headerCard,
          !showHeaderDetails && styles.headerCardCollapsed,
        ]}
      >
        <Pressable
          onPress={() => setShowHeaderDetails((value) => !value)}
          style={({ pressed }) => [
            styles.headerToggleRow,
            pressed && styles.headerButtonPressed,
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>Rummy</Text>
            <Text style={styles.title}>{variantLabel}</Text>
          </View>

          <Text style={styles.headerToggleText}>
            {showHeaderDetails ? "HIDE" : "SHOW"}
          </Text>
        </Pressable>

        {showHeaderDetails ? (
          <>
            <Text style={styles.subtitle}>{headerSubtitle}</Text>

            {!isResults ? (
              <>
                <View style={styles.metaRow}>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillLabel}>Round</Text>
                    <Text style={styles.metaPillValue}>
                      {gameState.roundNumber || 1}
                    </Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillLabel}>Stock</Text>
                    <Text style={styles.metaPillValue}>
                      {gameState.stockCount ?? 0}
                    </Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillLabel}>Discard</Text>
                    <Text style={styles.metaPillValue}>
                      {gameState.discardCount ?? 0}
                    </Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillLabel}>Deadwood</Text>
                    <Text style={styles.metaPillValue}>{myDeadwood}</Text>
                  </View>
                </View>

                <Text style={styles.turnText}>
                  {getActionLabel(gameState, isMyTurn)}
                  {currentPlayer
                    ? ` • ${getPlayerName(currentPlayers, currentPlayerIndex)} to act`
                    : ""}
                </Text>
              </>
            ) : null}
          </>
        ) : null}
      </View>
    );
  }

  function dispatchAction(moveType, extra = {}) {
    const state = fullRef.current;
    if (!state) {
      return;
    }

    if (isHost) {
      const next = rummyReducer(state, {
        type: moveType,
        pid: localPlayerIndex,
        ...extra,
      });

      if (next !== state) {
        applyState(next);
      }
      return;
    }

    sendToHost({
      type: "ACTION",
      moveType,
      ...extra,
    });
  }

  function toggleCard(index) {
    if (!isMyTurn || currentPhase !== "discard" || gameState?.winner != null) {
      return;
    }

    setSelectedHandIndexes((previous) => {
      if (previous.includes(index)) {
        return previous.filter((item) => item !== index);
      }

      return [...previous, index].sort((left, right) => left - right);
    });

    setSelectedMeldIndex(null);
  }

  function toggleMeld(index) {
    if (!isMyTurn || currentPhase !== "discard" || gameState?.winner != null) {
      return;
    }

    const meld = gameState?.melds?.[index];
    if (!meld || meld.owner !== localPlayerIndex) {
      return;
    }

    setSelectedMeldIndex((previous) => (previous === index ? null : index));
    setSelectedHandIndexes([]);
  }

  function handleDrawStock() {
    if (!isMyTurn || currentPhase !== "draw") {
      return;
    }

    dispatchAction("draw-card");
  }

  function handleTakeDiscard() {
    if (!isMyTurn || currentPhase !== "draw" || !discardTop) {
      return;
    }

    dispatchAction("draw-card", { from: "discard" });
  }

  function handleLayMeld() {
    if (!isMyTurn || currentPhase !== "discard") {
      return;
    }

    dispatchAction("lay-meld", {
      cardIndexes: selectedHandIndexes,
    });
  }

  function handleExtendMeld() {
    if (!isMyTurn || currentPhase !== "discard") {
      return;
    }

    dispatchAction("extend-meld", {
      meldIndex: selectedMeldIndex,
      cardIndex: selectedHandIndexes[0],
    });
  }

  function handleDiscard() {
    if (!isMyTurn || currentPhase !== "discard") {
      return;
    }

    dispatchAction("discard-card", {
      cardIndex: selectedHandIndexes[0],
    });
  }

  function handleKnock() {
    if (!isMyTurn || currentPhase !== "discard") {
      return;
    }

    dispatchAction("knock");
  }

  function handlePlayAgain() {
    if (!isHost || !fullRef.current) {
      return;
    }

    applyState(
      createRummyState({
        variantId: fullRef.current.variantId,
        players: fullRef.current.players,
        difficulty: fullRef.current.difficulty,
      }),
    );
  }

  function renderCardList(cards, allowSelect = true) {
    return (
      <View style={styles.handRow}>
        {cards.map((card, index) => {
          const selected = selectedHandIndexes.includes(index);

          return (
            <RummyCard
              key={card.id || `${card.rank}-${card.suit}-${index}`}
              card={card}
              selected={selected}
              onPress={() => allowSelect && toggleCard(index)}
              disabled={!allowSelect}
            />
          );
        })}
      </View>
    );
  }

  if (!gameState) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Dealing cards…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (
    gameState.phase === "game-over" ||
    gameState.tie ||
    gameState.winner != null
  ) {
    const winnerName =
      gameState.winner != null
        ? getPlayerName(currentPlayers, gameState.winner)
        : "Nobody";

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderHeaderCard(true)}

          <View style={styles.resultsCard}>
            <Text style={styles.sectionTitle}>Final Scores</Text>
            {(gameState.players || []).map((player, index) => (
              <View key={player.id || index} style={styles.scoreRow}>
                <Text style={styles.scoreName}>
                  {player.name}
                  {index === localPlayerIndex ? " (you)" : ""}
                </Text>
                <Text style={styles.scoreValue}>
                  {gameState.players?.[index]?.score ??
                    fullRef.current?.scores?.[index] ??
                    0}
                </Text>
              </View>
            ))}
          </View>

          {isHost ? (
            <Pressable
              onPress={handlePlayAgain}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Play Again</Text>
            </Pressable>
          ) : (
            <Text style={styles.waitText}>
              Waiting for the host to start a new round…
            </Text>
          )}

          <Pressable
            onPress={() => navigation.navigate("Home")}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Home</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderHeaderCard(false)}

        <View style={styles.tableCard}>
          <Text style={styles.sectionTitle}>Table</Text>

          <View style={styles.tableTopRow}>
            <View style={styles.pileBox}>
              <Text style={styles.pileLabel}>Stock</Text>
              <Text style={styles.pileCount}>{gameState.stockCount ?? 0}</Text>
            </View>

            <View style={styles.pileBox}>
              <Text style={styles.pileLabel}>Discard</Text>
              {discardTop ? (
                <RummyCard card={discardTop} small />
              ) : (
                <Text style={styles.emptyPileText}>Empty</Text>
              )}
            </View>
          </View>

          <View style={styles.playersRow}>
            {(gameState.players || []).map((player, index) => (
              <View
                key={player.id || index}
                style={[
                  styles.playerChip,
                  index === currentPlayerIndex && styles.playerChipActive,
                  index === localPlayerIndex && styles.playerChipMe,
                ]}
              >
                <Text
                  style={[
                    styles.playerChipName,
                    index === currentPlayerIndex && styles.playerChipNameActive,
                  ]}
                >
                  {player.name}
                </Text>
                <Text style={styles.playerChipMeta}>
                  {player.handCount ?? 0} cards • {player.score ?? 0} pts
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.meldsCard}>
          <Text style={styles.sectionTitle}>Melds on the table</Text>

          {(gameState.melds || []).length > 0 ? (
            <View style={styles.meldsList}>
              {(gameState.melds || []).map((meld, index) => {
                const selected = selectedMeldIndex === index;
                const isOwn = meld.owner === localPlayerIndex;

                return (
                  <Pressable
                    key={`${meld.type || "meld"}-${index}`}
                    onPress={isOwn ? () => toggleMeld(index) : undefined}
                    style={({ pressed }) => [
                      styles.meldCard,
                      selected && styles.meldCardSelected,
                      pressed && isOwn && styles.meldCardPressed,
                      !isOwn && styles.meldCardDimmed,
                    ]}
                  >
                    <View style={styles.meldHeader}>
                      <Text style={styles.meldLabel}>
                        {meld.type?.toUpperCase() || "MELD"}
                      </Text>
                      <Text style={styles.meldOwner}>
                        {getMeldOwnerName(gameState.players, meld, index)}
                      </Text>
                    </View>
                    <View style={styles.meldCards}>
                      {(meld.cards || []).map((card, cardIndex) => (
                        <RummyCard
                          key={card.id || `${index}-${cardIndex}`}
                          card={card}
                          small
                          disabled
                        />
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyText}>No melds yet.</Text>
          )}
        </View>

        <View style={styles.handCard}>
          <Text style={styles.sectionTitle}>Your Hand ({myHand.length})</Text>
          <Text style={styles.helperText}>
            Tap cards to select them. Then lay a meld, extend one, or discard.
          </Text>

          {renderCardList(myHand, isMyTurn && currentPhase === "discard")}

          <View style={styles.actionRow}>
            {currentPhase === "draw" ? (
              <>
                <Pressable
                  onPress={handleDrawStock}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.drawButton,
                    pressed && styles.actionButtonPressed,
                  ]}
                >
                  <Text style={styles.actionButtonText}>Draw Stock</Text>
                </Pressable>

                <Pressable
                  onPress={handleTakeDiscard}
                  disabled={!discardTop}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.takeButton,
                    !discardTop && styles.actionButtonDisabled,
                    pressed && discardTop && styles.actionButtonPressed,
                  ]}
                >
                  <Text style={styles.actionButtonText}>Take Discard</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  onPress={handleLayMeld}
                  disabled={selectedHandIndexes.length < 3}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.layButton,
                    selectedHandIndexes.length < 3 &&
                      styles.actionButtonDisabled,
                    pressed &&
                      selectedHandIndexes.length >= 3 &&
                      styles.actionButtonPressed,
                  ]}
                >
                  <Text style={styles.actionButtonText}>Lay Meld</Text>
                </Pressable>

                <Pressable
                  onPress={handleExtendMeld}
                  disabled={
                    selectedHandIndexes.length !== 1 ||
                    selectedMeldIndex === null
                  }
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.extendButton,
                    (selectedHandIndexes.length !== 1 ||
                      selectedMeldIndex === null) &&
                      styles.actionButtonDisabled,
                    pressed &&
                      selectedHandIndexes.length === 1 &&
                      selectedMeldIndex !== null &&
                      styles.actionButtonPressed,
                  ]}
                >
                  <Text style={styles.actionButtonText}>Extend</Text>
                </Pressable>

                <Pressable
                  onPress={handleDiscard}
                  disabled={selectedHandIndexes.length !== 1}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.discardButton,
                    selectedHandIndexes.length !== 1 &&
                      styles.actionButtonDisabled,
                    pressed &&
                      selectedHandIndexes.length === 1 &&
                      styles.actionButtonPressed,
                  ]}
                >
                  <Text style={styles.actionButtonText}>Discard</Text>
                </Pressable>

                <Pressable
                  onPress={handleKnock}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.knockButton,
                    pressed && styles.actionButtonPressed,
                  ]}
                >
                  <Text style={styles.actionButtonText}>Knock</Text>
                </Pressable>
              </>
            )}
          </View>

          {selectedHandIndexes.length > 0 ? (
            <Text style={styles.selectionText}>
              Selected {selectedHandIndexes.length} card
              {selectedHandIndexes.length === 1 ? "" : "s"}
            </Text>
          ) : (
            <Text style={styles.selectionText}>No cards selected.</Text>
          )}

          {selectedMeldIndex !== null ? (
            <Text style={styles.selectionText}>
              Selected meld {selectedMeldIndex + 1}
            </Text>
          ) : null}
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
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
    gap: 14,
    backgroundColor: "#1a1a2e",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a2e",
  },
  loadingText: {
    color: "#b0b0c0",
    fontSize: 16,
  },
  headerCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#0B1320",
    padding: 16,
    gap: 10,
  },
  headerCardCollapsed: {
    paddingVertical: 12,
    gap: 8,
  },
  headerToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerButtonPressed: {
    opacity: 0.9,
  },
  headerToggleText: {
    color: "#f4f7fb",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.9,
    borderWidth: 1,
    borderColor: "#2f3c55",
    backgroundColor: "#1d2637",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  kicker: {
    color: "#7fb3ff",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    color: "#F4F7FB",
    fontSize: 30,
    fontWeight: "900",
  },
  subtitle: {
    color: "#A7B3C9",
    fontSize: 15,
    lineHeight: 21,
  },
  statusText: {
    color: "#DCE5F2",
    fontSize: 14,
    lineHeight: 20,
  },
  turnText: {
    color: "#95A4BB",
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#101521",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaPillLabel: {
    color: "#A7B3C9",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metaPillValue: {
    color: "#F4F7FB",
    fontSize: 12,
    fontWeight: "800",
  },
  tableCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#0B1320",
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    color: "#F4F7FB",
    fontSize: 18,
    fontWeight: "800",
  },
  tableTopRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  pileBox: {
    minWidth: 92,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#101521",
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  pileLabel: {
    color: "#A7B3C9",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  pileCount: {
    color: "#F4F7FB",
    fontSize: 22,
    fontWeight: "900",
  },
  emptyPileText: {
    color: "#7F8EA8",
    fontSize: 13,
    fontWeight: "700",
  },
  playersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  playerChip: {
    flexGrow: 1,
    minWidth: "47%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#101521",
    padding: 12,
    gap: 2,
  },
  playerChipActive: {
    borderColor: "#e94560",
    backgroundColor: "rgba(233, 69, 96, 0.12)",
  },
  playerChipMe: {
    borderColor: "#4caf50",
  },
  playerChipName: {
    color: "#F4F7FB",
    fontSize: 14,
    fontWeight: "800",
  },
  playerChipNameActive: {
    color: "#ffb0bf",
  },
  playerChipMeta: {
    color: "#A7B3C9",
    fontSize: 12,
    marginTop: 2,
  },
  meldsCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#0B1320",
    padding: 16,
    gap: 10,
  },
  meldsList: {
    gap: 10,
  },
  meldCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#2A3550",
    backgroundColor: "#101521",
    padding: 12,
    gap: 10,
  },
  meldCardSelected: {
    borderColor: "#7fb3ff",
    backgroundColor: "rgba(127, 179, 255, 0.1)",
  },
  meldCardPressed: {
    opacity: 0.92,
  },
  meldCardDimmed: {
    opacity: 0.9,
  },
  meldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  meldLabel: {
    color: "#DCE5F2",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  meldOwner: {
    color: "#95A4BB",
    fontSize: 12,
    fontWeight: "700",
  },
  meldCards: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  handCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#0B1320",
    padding: 16,
    gap: 12,
  },
  helperText: {
    color: "#A7B3C9",
    fontSize: 13,
    lineHeight: 18,
  },
  handRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cardWrap: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  cardWrapSmall: {
    transform: [{ scale: 0.92 }],
  },
  cardWrapSelected: {
    borderColor: "#4caf50",
    backgroundColor: "rgba(76, 175, 80, 0.12)",
    shadowColor: "#4caf50",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  cardWrapPressed: {
    opacity: 0.92,
  },
  cardWrapDisabled: {
    opacity: 1,
  },
  jokerCard: {
    width: 70,
    height: 100,
    borderRadius: 10,
    backgroundColor: "#202940",
    borderWidth: 1,
    borderColor: "#5c6f8a",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  jokerCardSmall: {
    width: 42,
    height: 60,
    borderRadius: 8,
    padding: 4,
  },
  jokerEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  jokerText: {
    color: "#F4F7FB",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    minHeight: 50,
    flexGrow: 1,
    minWidth: "22%",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  actionButtonPressed: {
    opacity: 0.9,
  },
  actionButtonDisabled: {
    opacity: 0.38,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  drawButton: {
    backgroundColor: "#1565c0",
  },
  takeButton: {
    backgroundColor: "#8e44ad",
  },
  layButton: {
    backgroundColor: "#2e7d32",
  },
  extendButton: {
    backgroundColor: "#7fb3ff",
  },
  discardButton: {
    backgroundColor: "#e94560",
  },
  knockButton: {
    backgroundColor: "#c1121f",
  },
  selectionText: {
    color: "#95A4BB",
    fontSize: 12,
    textAlign: "center",
  },
  resultsCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#0B1320",
    padding: 16,
    gap: 10,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2A3D",
  },
  scoreName: {
    color: "#F4F7FB",
    fontSize: 14,
    fontWeight: "700",
  },
  scoreValue: {
    color: "#DCE5F2",
    fontSize: 14,
    fontWeight: "900",
  },
  primaryButton: {
    backgroundColor: "#e94560",
    borderRadius: 18,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: "#16213e",
    borderRadius: 18,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#24344D",
  },
  secondaryButtonPressed: {
    opacity: 0.9,
  },
  secondaryButtonText: {
    color: "#DCE5F2",
    fontSize: 16,
    fontWeight: "800",
  },
  waitText: {
    color: "#A7B3C9",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 8,
  },
  emptyText: {
    color: "#95A4BB",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 6,
  },
});
