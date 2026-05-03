import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  chooseFiveCardDrawDiscards,
  comparePokerScores,
  createStandardDeck,
  dealPokerVariantHands,
  drawReplacementCards,
  evaluatePokerVariantHand,
  formatPokerCard,
  getPokerHandLabel,
  getPokerVariantConfig,
  shuffleDeck,
} from "../game/poker";
import {
  broadcastToClients,
  sendToClient,
  sendToHost,
  setClientListeners,
  setServerListeners,
} from "../game/GameNetwork";

const COMMUNITY_ACTION_LABELS = [
  "Reveal Flop",
  "Reveal Turn",
  "Reveal River",
  "Showdown",
];

const COMMUNITY_VISIBLE_COUNTS = [0, 3, 4, 5];

function isProbablyAIName(name) {
  return /^(cpu|ai|bot)/i.test(String(name ?? "").trim());
}

function normalizePlayers(routePlayers, myName, role, difficulty) {
  if (Array.isArray(routePlayers) && routePlayers.length > 0) {
    return routePlayers.map((entry, index) => {
      const rawName =
        typeof entry === "string"
          ? entry
          : (entry?.name ??
            entry?.label ??
            entry?.displayName ??
            `Player ${index + 1}`);

      const isLocal = rawName === myName || (!myName && index === 0);
      const explicitAI =
        typeof entry === "object" && entry !== null ? entry.isAI : undefined;

      const isAI =
        typeof explicitAI === "boolean"
          ? explicitAI
          : role === "singleplayer" || role === "ai" || !role
            ? !isLocal
            : isProbablyAIName(rawName);

      return {
        id: String(entry?.id ?? rawName ?? index),
        name: rawName,
        isLocal,
        isAI,
        cards: [],
        handResult: null,
      };
    });
  }

  const humanName = myName || "Player 1";

  if (role === "singleplayer" || role === "ai" || !role) {
    const aiCount = difficulty === "hard" ? 3 : difficulty === "medium" ? 2 : 1;

    return [
      {
        id: "local-player",
        name: humanName,
        isLocal: true,
        isAI: false,
        cards: [],
        handResult: null,
      },
      ...Array.from({ length: aiCount }, (_, index) => ({
        id: `cpu-${index + 1}`,
        name: `CPU ${index + 1}`,
        isLocal: false,
        isAI: true,
        cards: [],
        handResult: null,
      })),
    ];
  }

  return [
    {
      id: "local-player",
      name: humanName,
      isLocal: true,
      isAI: false,
      cards: [],
      handResult: null,
    },
  ];
}

function getLocalPlayerId(roster, myName, role) {
  if (role === "host" || role === "singleplayer" || role === "ai" || !role) {
    return "host";
  }

  const matchedPlayer = roster.find(
    (player) => !player.isAI && player.name === myName,
  );

  return String(matchedPlayer?.id ?? roster[0]?.id ?? "local-player");
}

function createHiddenCards(count, playerId) {
  return Array.from({ length: count }, (_, index) => ({
    id: `hidden-${playerId}-${index}`,
    hidden: true,
  }));
}

function getDrawStatusText(humanIds, submissions) {
  const submittedCount = humanIds.filter((id) =>
    Array.isArray(submissions[id]),
  ).length;

  if (submittedCount === 0) {
    return "Choose cards to discard, then press Draw Cards.";
  }

  if (submittedCount < humanIds.length) {
    return `Waiting for ${humanIds.length - submittedCount} player(s) to submit their discards.`;
  }

  return "Resolving draw...";
}

function getTableMessage(variantConfig, phase, streetIndex) {
  if (variantConfig.usesDrawPhase) {
    if (phase === "showdown") {
      return "Hand complete. Tap New Hand to play again.";
    }

    return "Choose cards to discard, then press Draw Cards.";
  }

  if (variantConfig.usesCommunityCards) {
    if (phase === "showdown") {
      return "Community cards are fully revealed. Tap New Hand to play again.";
    }

    if (streetIndex === 0) {
      return "Pre-flop is dealt. Reveal the flop when you are ready.";
    }

    if (streetIndex === 1) {
      return "The flop is showing. Reveal the turn when you are ready.";
    }

    if (streetIndex === 2) {
      return "The turn is showing. Reveal the river when you are ready.";
    }

    return "The river is showing. Tap Showdown to see the winner.";
  }

  if (variantConfig.usesStudCards) {
    if (phase === "showdown") {
      return "All seven cards are dealt. Tap New Hand to play again.";
    }

    return "Seven cards are dealt to each player. Tap Showdown to compare hands.";
  }

  return "Tap the action button to continue.";
}

function buildShowdownOutcome(playersSnapshot, communitySnapshot, variant) {
  const evaluatedPlayers = playersSnapshot.map((player) => {
    const handResult = evaluatePokerVariantHand({
      variant,
      holeCards: player.cards,
      communityCards: communitySnapshot,
    });

    return {
      ...player,
      handResult,
    };
  });

  const rankedPlayers = evaluatedPlayers
    .slice()
    .sort((left, right) =>
      comparePokerScores(right.handResult?.score, left.handResult?.score),
    );

  const bestScore = rankedPlayers[0]?.handResult?.score ?? null;
  const winners = bestScore
    ? rankedPlayers.filter(
        (player) =>
          comparePokerScores(player.handResult?.score, bestScore) === 0,
      )
    : [];

  let statusText = "No winner could be determined.";
  if (winners.length === 1) {
    statusText = `${winners[0].name} wins with ${
      winners[0].handResult?.name ?? "a poker hand"
    }.`;
  } else if (winners.length > 1) {
    statusText = `Tie: ${winners
      .map((winner) => winner.name)
      .join(", ")} share the pot with ${
      winners[0].handResult?.name ?? "the same hand"
    }.`;
  }

  return {
    evaluatedPlayers,
    rankedPlayers,
    winners,
    statusText,
  };
}

function buildPublicState(fullState) {
  const isShowdown = fullState.phase === "showdown";

  return {
    variant: fullState.variant,
    handNumber: fullState.handNumber,
    phase: fullState.phase,
    streetIndex: fullState.streetIndex,
    visibleCommunityCount: fullState.visibleCommunityCount,
    communityCards: isShowdown
      ? fullState.communityCards
      : fullState.communityCards.slice(0, fullState.visibleCommunityCount),
    drawSubmissions: fullState.drawSubmissions,
    players: fullState.players.map((player) => ({
      id: player.id,
      name: player.name,
      isAI: player.isAI,
      isLocal: player.isLocal,
      cards: isShowdown
        ? player.cards
        : createHiddenCards(player.cards.length, player.id),
      handResult: isShowdown ? player.handResult : null,
    })),
    showdownResults: isShowdown ? fullState.showdownResults : null,
    statusText: fullState.statusText,
  };
}

function PokerCard({ card, hidden, selected, onPress }) {
  return (
    <Pressable
      onPress={hidden ? undefined : onPress}
      style={[
        styles.card,
        hidden && styles.cardBack,
        selected && styles.cardSelected,
        !hidden && (card?.color === "red" ? styles.redCard : styles.blackCard),
      ]}
    >
      <Text style={[styles.cardText, hidden && styles.cardBackText]}>
        {hidden ? "🂠" : formatPokerCard(card)}
      </Text>
    </Pressable>
  );
}

function PlayerHand({
  player,
  cards,
  hidden,
  showResult,
  selectedDiscardIndexes,
  onCardPress,
}) {
  const result = player.handResult ?? null;

  return (
    <View style={styles.playerCard}>
      <View style={styles.playerHeaderRow}>
        <Text style={styles.playerName}>
          {player.name}
          {player.isLocal ? " (You)" : ""}
        </Text>
        {player.isAI ? <Text style={styles.aiTag}>AI</Text> : null}
      </View>

      <View style={styles.cardRow}>
        {cards.map((card, index) => (
          <PokerCard
            key={card?.id ?? `${player.id}-${index}`}
            card={card}
            hidden={hidden}
            selected={selectedDiscardIndexes.includes(index)}
            onPress={() => onCardPress?.(index)}
          />
        ))}
      </View>

      {showResult && result ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>{getPokerHandLabel(result)}</Text>
          <Text style={styles.resultCards}>
            {result.cards.map((card) => formatPokerCard(card)).join("  ")}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function PokerGameScreen({ navigation, route }) {
  const params = route?.params ?? {};
  const {
    role = "singleplayer",
    myName = "Player 1",
    players = [],
    difficulty = "medium",
    variant = "texasHoldem",
  } = params;

  const variantConfig = useMemo(
    () => getPokerVariantConfig(variant),
    [variant],
  );
  const isSinglePlayerMode = role === "singleplayer" || role === "ai" || !role;
  const isHost = role === "host" || isSinglePlayerMode;
  const isClient = role === "client";

  const roster = useMemo(
    () => normalizePlayers(players, myName, role, difficulty),
    [players, myName, role, difficulty],
  );
  const localPlayerId = useMemo(
    () => getLocalPlayerId(roster, myName, role),
    [roster, myName, role],
  );
  const humanPlayerIds = useMemo(
    () =>
      roster
        .filter((player) => !player.isAI)
        .map((player) => String(player.id)),
    [roster],
  );

  const [gameState, setGameState] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const [selectedDiscardIndexes, setSelectedDiscardIndexes] = useState([]);

  const fullRef = useRef(null);

  const syncFromFullState = useCallback(
    (nextFullState) => {
      fullRef.current = nextFullState;
      const publicState = buildPublicState(nextFullState);

      setGameState(publicState);
      setMyHand(
        nextFullState.players.find(
          (player) => String(player.id) === String(localPlayerId),
        )?.cards ?? [],
      );

      if (nextFullState.phase !== "draw") {
        setSelectedDiscardIndexes([]);
      }

      if (isHost && !isSinglePlayerMode) {
        broadcastToClients({ type: "GAME_STATE", ...publicState });

        nextFullState.players.forEach((player) => {
          if (player.isAI || String(player.id) === String(localPlayerId)) {
            return;
          }

          sendToClient(player.id, {
            type: "PRIVATE_HAND",
            hand: player.cards,
          });
        });
      }
    },
    [isHost, isSinglePlayerMode, localPlayerId],
  );

  const createHandState = useCallback(() => {
    const freshDeck = shuffleDeck(createStandardDeck());
    const dealt = dealPokerVariantHands({
      variant,
      players: roster,
      deck: freshDeck,
    });

    const phase = variantConfig.usesDrawPhase
      ? "draw"
      : variantConfig.usesStudCards
        ? "ready"
        : "playing";

    return {
      variant,
      handNumber: (fullRef.current?.handNumber ?? 0) + 1,
      phase,
      streetIndex: 0,
      visibleCommunityCount: 0,
      communityCards: dealt.communityCards,
      deck: dealt.deck,
      players: dealt.players.map((player) => ({
        ...player,
        isLocal: String(player.id) === String(localPlayerId),
        isAI: Boolean(player.isAI),
        handResult: null,
      })),
      drawSubmissions: {},
      showdownResults: null,
      statusText: getTableMessage(variantConfig, phase, 0),
    };
  }, [localPlayerId, roster, variant, variantConfig]);

  const startNewHand = useCallback(() => {
    syncFromFullState(createHandState());
  }, [createHandState, syncFromFullState]);

  const finishWithShowdown = useCallback(
    (state, communitySnapshot) => {
      const outcome = buildShowdownOutcome(
        state.players,
        communitySnapshot,
        variant,
      );

      const nextState = {
        ...state,
        phase: "showdown",
        players: outcome.evaluatedPlayers.map((player) => ({
          ...player,
          isLocal: String(player.id) === String(localPlayerId),
          isAI: Boolean(player.isAI),
        })),
        showdownResults: {
          rankedPlayers: outcome.rankedPlayers,
          winners: outcome.winners,
        },
        statusText: outcome.statusText,
      };

      syncFromFullState(nextState);
    },
    [localPlayerId, syncFromFullState, variant],
  );

  const resolveCommunityRound = useCallback(() => {
    const current = fullRef.current;
    if (!current) {
      return;
    }

    finishWithShowdown(current, current.communityCards);
  }, [finishWithShowdown]);

  const resolveDrawPhase = useCallback(() => {
    const current = fullRef.current;
    if (!current || current.phase !== "draw") {
      return;
    }

    let workingDeck = current.deck.slice();
    const nextPlayers = current.players.map((player) => {
      const discardIndexes = player.isAI
        ? chooseFiveCardDrawDiscards(player.cards, difficulty)
        : (current.drawSubmissions[player.id] ?? []);

      const drawResult = drawReplacementCards(
        player.cards,
        discardIndexes,
        workingDeck,
      );
      workingDeck = drawResult.deck;

      return {
        ...player,
        cards: drawResult.hand,
        handResult: null,
      };
    });

    const nextState = {
      ...current,
      deck: workingDeck,
      players: nextPlayers,
      drawSubmissions: {},
      statusText: "Cards drawn. Comparing hands...",
    };

    finishWithShowdown(nextState, []);
  }, [difficulty, finishWithShowdown]);

  const applyDrawSubmission = useCallback(
    (playerId, discardIndexes) => {
      const current = fullRef.current;
      if (!current || current.phase !== "draw") {
        return;
      }

      const nextSubmissions = {
        ...current.drawSubmissions,
        [playerId]: discardIndexes,
      };
      const nextState = {
        ...current,
        drawSubmissions: nextSubmissions,
        statusText: getDrawStatusText(humanPlayerIds, nextSubmissions),
      };

      syncFromFullState(nextState);

      const allHumanSubmitted = humanPlayerIds.every((id) =>
        Array.isArray(nextSubmissions[id]),
      );

      if (allHumanSubmitted) {
        resolveDrawPhase();
      }
    },
    [humanPlayerIds, resolveDrawPhase, syncFromFullState],
  );

  const handlePrimaryAction = useCallback(() => {
    const current = fullRef.current ?? gameState;
    if (!current) {
      return;
    }

    if (variantConfig.usesDrawPhase) {
      if (current.phase === "showdown") {
        if (isHost) {
          startNewHand();
        }
        return;
      }

      const localSubmitted = Boolean(
        current.drawSubmissions?.[String(localPlayerId)],
      );

      if (isClient) {
        if (localSubmitted) {
          return;
        }

        sendToHost({
          type: "ACTION",
          action: "submitDraw",
          discardIndexes: selectedDiscardIndexes,
        });
        return;
      }

      applyDrawSubmission(localPlayerId, selectedDiscardIndexes);
      return;
    }

    if (!isHost) {
      Alert.alert(
        "Waiting for host",
        "Only the host can advance this poker table.",
      );
      return;
    }

    if (current.phase === "showdown") {
      startNewHand();
      return;
    }

    if (variantConfig.usesCommunityCards) {
      if (current.streetIndex < COMMUNITY_VISIBLE_COUNTS.length - 1) {
        const nextStreet = current.streetIndex + 1;
        const nextState = {
          ...current,
          streetIndex: nextStreet,
          visibleCommunityCount: COMMUNITY_VISIBLE_COUNTS[nextStreet],
          statusText: getTableMessage(variantConfig, "playing", nextStreet),
        };

        syncFromFullState(nextState);
        return;
      }

      resolveCommunityRound();
      return;
    }

    if (variantConfig.usesStudCards) {
      resolveCommunityRound();
    }
  }, [
    applyDrawSubmission,
    gameState,
    isClient,
    isHost,
    localPlayerId,
    resolveCommunityRound,
    selectedDiscardIndexes,
    startNewHand,
    syncFromFullState,
    variantConfig,
  ]);

  const toggleDiscardIndex = useCallback(
    (index) => {
      const current = fullRef.current;
      if (!variantConfig.usesDrawPhase || current?.phase !== "draw") {
        return;
      }

      const localSubmitted = Boolean(
        current.drawSubmissions?.[String(localPlayerId)],
      );

      if (localSubmitted) {
        return;
      }

      setSelectedDiscardIndexes((previous) => {
        if (previous.includes(index)) {
          return previous.filter((item) => item !== index);
        }

        return [...previous, index].sort((left, right) => left - right);
      });
    },
    [localPlayerId, variantConfig],
  );

  useEffect(() => {
    if (isClient) {
      setClientListeners({
        onMessage: (msg) => {
          if (msg.type === "GAME_STATE") {
            setGameState(msg);
          }

          if (msg.type === "PRIVATE_HAND") {
            setMyHand(msg.hand ?? []);
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

    if (isHost && !isSinglePlayerMode) {
      setServerListeners({
        onMessage: (msg, clientId) => {
          const current = fullRef.current;
          if (!current || msg.type !== "ACTION") {
            return;
          }

          if (current.phase === "draw" && msg.action === "submitDraw") {
            applyDrawSubmission(
              String(clientId),
              Array.isArray(msg.discardIndexes) ? msg.discardIndexes : [],
            );
          }
        },
      });

      return () => setServerListeners({});
    }

    startNewHand();
    return () => {};
  }, [
    applyDrawSubmission,
    isClient,
    isHost,
    isSinglePlayerMode,
    navigation,
    startNewHand,
  ]);

  const currentState = gameState ?? null;
  const localSubmitted = Boolean(
    currentState?.drawSubmissions?.[String(localPlayerId)],
  );
  const isLoading = !currentState;

  const boardCardsToShow = useMemo(() => {
    if (!currentState) {
      return [];
    }

    if (!variantConfig.usesCommunityCards) {
      return [];
    }

    if (currentState.phase === "showdown") {
      return currentState.communityCards;
    }

    return currentState.communityCards.slice(
      0,
      currentState.visibleCommunityCount,
    );
  }, [currentState, variantConfig]);

  const hiddenBoardCount = variantConfig.usesCommunityCards
    ? Math.max(
        0,
        (currentState?.communityCards?.length ?? 0) - boardCardsToShow.length,
      )
    : 0;

  const primaryActionLabel = useMemo(() => {
    if (!currentState) {
      return "Loading";
    }

    if (variantConfig.usesDrawPhase) {
      if (currentState.phase === "showdown") {
        return "New Hand";
      }

      if (isClient && localSubmitted) {
        return "Waiting...";
      }

      return "Draw Cards";
    }

    if (currentState.phase === "showdown") {
      return "New Hand";
    }

    if (variantConfig.usesCommunityCards) {
      return COMMUNITY_ACTION_LABELS[currentState.streetIndex] ?? "Showdown";
    }

    if (variantConfig.usesStudCards) {
      return "Showdown";
    }

    return "Continue";
  }, [currentState, isClient, localSubmitted, variantConfig]);

  const phaseLabel = useMemo(() => {
    if (!currentState) {
      return "";
    }

    if (variantConfig.usesCommunityCards) {
      if (currentState.phase === "showdown") {
        return "Showdown";
      }

      return (
        ["Pre-flop", "Flop", "Turn", "River"][currentState.streetIndex] ??
        "Table"
      );
    }

    if (variantConfig.usesDrawPhase) {
      return currentState.phase === "showdown" ? "Showdown" : "Draw";
    }

    if (variantConfig.usesStudCards) {
      return currentState.phase === "showdown" ? "Showdown" : "Stud";
    }

    return "Poker";
  }, [currentState, variantConfig]);

  const statusText =
    currentState?.statusText ?? getTableMessage(variantConfig, "playing", 0);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Dealing cards…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerCard}>
          <Text style={styles.title}>{variantConfig.label}</Text>
          <Text style={styles.subtitle}>
            Hand {currentState.handNumber} • {phaseLabel} • {role}
          </Text>
          <Text style={styles.message}>{statusText}</Text>
          <Text style={styles.smallText}>Difficulty: {difficulty}</Text>
          <Text style={styles.smallText}>Local player: {myName}</Text>
        </View>

        <View style={styles.tableCard}>
          <Text style={styles.sectionTitle}>Community Cards</Text>

          {variantConfig.usesCommunityCards ? (
            <View style={styles.communityRow}>
              {boardCardsToShow.map((card) => (
                <PokerCard key={card.id} card={card} hidden={false} />
              ))}
              {Array.from({ length: hiddenBoardCount }, (_, index) => (
                <PokerCard key={`board-back-${index}`} hidden card={null} />
              ))}
            </View>
          ) : (
            <Text style={styles.noCommunityText}>
              No community cards in this variant.
            </Text>
          )}
        </View>

        <Pressable
          disabled={
            isClient && !(variantConfig.usesDrawPhase && !localSubmitted)
          }
          onPress={handlePrimaryAction}
          style={({ pressed }) => [
            styles.primaryButton,
            isClient &&
              !(variantConfig.usesDrawPhase && !localSubmitted) &&
              styles.disabledButton,
            pressed && !isClient && styles.pressedButton,
          ]}
        >
          <Text style={styles.primaryButtonText}>{primaryActionLabel}</Text>
        </Pressable>

        {variantConfig.usesDrawPhase ? (
          <View style={styles.drawHintCard}>
            <Text style={styles.drawHintTitle}>Five Card Draw</Text>
            <Text style={styles.drawHintText}>
              Tap your own cards to mark discards, then press Draw Cards once.
            </Text>
          </View>
        ) : null}

        <View style={styles.playersSection}>
          <Text style={styles.sectionTitle}>Players</Text>

          {currentState.players.map((player, index) => {
            const isLocalPlayer =
              String(player.id) === String(localPlayerId) || player.isLocal;
            const displayCards = isLocalPlayer ? myHand : player.cards;
            const cardsHidden =
              currentState.phase !== "showdown" && !isLocalPlayer;
            const showResult =
              currentState.phase === "showdown" &&
              !!currentState.showdownResults;
            const selectedCards = isLocalPlayer ? selectedDiscardIndexes : [];

            return (
              <PlayerHand
                key={player.id ?? `${player.name}-${index}`}
                player={player}
                cards={displayCards}
                hidden={cardsHidden}
                showResult={showResult}
                selectedDiscardIndexes={selectedCards}
                onCardPress={isLocalPlayer ? toggleDiscardIndex : undefined}
              />
            );
          })}
        </View>

        {currentState.phase === "showdown" && currentState.showdownResults ? (
          <View style={styles.resultsCard}>
            <Text style={styles.sectionTitle}>Final Ranking</Text>
            {currentState.showdownResults.rankedPlayers.map((player, index) => {
              const isWinner = currentState.showdownResults.winners.some(
                (winner) => winner.id === player.id,
              );

              return (
                <View key={`rank-${player.id ?? index}`} style={styles.rankRow}>
                  <Text style={styles.rankText}>{index + 1}.</Text>
                  <Text style={styles.rankName}>
                    {player.name}
                    {isWinner ? " 👑" : ""}
                  </Text>
                  <Text style={styles.rankHand}>
                    {player.handResult?.name ?? "No hand"}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#071321",
  },
  loading: {
    flex: 1,
    backgroundColor: "#071321",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#ffffff",
    fontSize: 18,
  },
  container: {
    padding: 16,
    backgroundColor: "#071321",
    gap: 14,
  },
  headerCard: {
    backgroundColor: "#0f2140",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1d3a66",
    padding: 16,
    gap: 6,
  },
  title: {
    color: "#f4f7fb",
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: "#c7d3e3",
    fontSize: 14,
    fontWeight: "600",
  },
  message: {
    color: "#f2c2c2",
    fontSize: 14,
    lineHeight: 20,
  },
  smallText: {
    color: "#9eb1c9",
    fontSize: 12,
  },
  tableCard: {
    backgroundColor: "#0d1d35",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#18345d",
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    color: "#f4f7fb",
    fontSize: 18,
    fontWeight: "800",
  },
  communityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  noCommunityText: {
    color: "#9eb1c9",
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: "#b71c1c",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  pressedButton: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  disabledButton: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  drawHintCard: {
    backgroundColor: "#102544",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1e4273",
    padding: 14,
    gap: 4,
  },
  drawHintTitle: {
    color: "#f4f7fb",
    fontSize: 16,
    fontWeight: "800",
  },
  drawHintText: {
    color: "#c7d3e3",
    fontSize: 13,
    lineHeight: 18,
  },
  playersSection: {
    gap: 12,
  },
  playerCard: {
    backgroundColor: "#0f2140",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1d3a66",
    padding: 14,
    gap: 10,
  },
  playerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  playerName: {
    color: "#f4f7fb",
    fontSize: 16,
    fontWeight: "800",
  },
  aiTag: {
    color: "#f5c46b",
    fontSize: 12,
    fontWeight: "800",
  },
  cardRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  card: {
    width: 54,
    height: 74,
    borderRadius: 12,
    backgroundColor: "#f4f7fb",
    borderWidth: 1,
    borderColor: "#d7e0ee",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardSelected: {
    borderColor: "#d32f2f",
    borderWidth: 2,
    transform: [{ translateY: -3 }],
  },
  cardBack: {
    backgroundColor: "#17365f",
    borderColor: "#274d7f",
  },
  redCard: {
    borderColor: "#efb0b0",
  },
  blackCard: {
    borderColor: "#d7e0ee",
  },
  cardText: {
    color: "#16263a",
    fontSize: 15,
    fontWeight: "800",
  },
  cardBackText: {
    color: "#f4f7fb",
    fontSize: 22,
  },
  resultBox: {
    marginTop: 6,
    gap: 4,
  },
  resultLabel: {
    color: "#f5c46b",
    fontSize: 13,
    fontWeight: "800",
  },
  resultCards: {
    color: "#c7d3e3",
    fontSize: 12,
    lineHeight: 18,
  },
  resultsCard: {
    backgroundColor: "#102544",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e4273",
    padding: 16,
    gap: 10,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  rankText: {
    color: "#f4f7fb",
    fontSize: 14,
    fontWeight: "800",
    width: 24,
  },
  rankName: {
    color: "#f4f7fb",
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  rankHand: {
    color: "#c7d3e3",
    fontSize: 13,
    fontStyle: "italic",
    flexShrink: 1,
  },
});
