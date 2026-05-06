import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { createDeck, shuffleDeck, calculateHandValue } from "../game/deck";
import Card from "../components/Card";
import { scale, scaleFont } from "../game/responsive";

export default function GameScreen() {
  const [deck, setDeck] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [splitHand, setSplitHand] = useState(null); // null = no split active
  const [activeHand, setActiveHand] = useState(0); // 0 = main, 1 = split
  const [dealerHand, setDealerHand] = useState([]);
  const [gameStatus, setGameStatus] = useState("playing");
  // gameStatus: 'playing' | 'bust' | 'dealerTurn' | 'finished'
  const [result, setResult] = useState("");
  const [splitResult, setSplitResult] = useState("");
  // result / splitResult: '' | 'win' | 'lose' | 'push'

  useEffect(() => {
    startNewGame();
  }, []);

  function startNewGame() {
    const newDeck = shuffleDeck(createDeck());
    const playerCards = [newDeck[0], newDeck[2]];
    const dealerCards = [newDeck[1], newDeck[3]];
    const remainingDeck = newDeck.slice(4);

    setDeck(remainingDeck);
    setPlayerHand(playerCards);
    setSplitHand(null);
    setActiveHand(0);
    setDealerHand(dealerCards);
    setGameStatus("playing");
    setResult("");
    setSplitResult("");
  }

  function handleSplit() {
    const newCard0 = deck[0];
    const newCard1 = deck[1];
    setPlayerHand([playerHand[0], newCard0]);
    setSplitHand([playerHand[1], newCard1]);
    setDeck(deck.slice(2));
    setActiveHand(0);
  }

  function handleHit() {
    const newCard = deck[0];
    const remainingDeck = deck.slice(1);
    setDeck(remainingDeck);

    if (activeHand === 0) {
      const newHand = [...playerHand, newCard];
      setPlayerHand(newHand);
      if (calculateHandValue(newHand) > 21) {
        setResult("lose");
        if (splitHand !== null) {
          setActiveHand(1); // bust on hand 0 → automatically move to hand 1
        } else {
          setGameStatus("bust");
        }
      }
    } else {
      const newSplitHand = [...splitHand, newCard];
      setSplitHand(newSplitHand);
      if (calculateHandValue(newSplitHand) > 21) {
        setSplitResult("lose");
        // Pass fresh values because we just mutated deck/splitHand in this same call
        runDealer(remainingDeck, playerHand, newSplitHand, result, "lose");
      }
    }
  }

  function handleStand() {
    if (splitHand !== null && activeHand === 0) {
      setActiveHand(1); // hand 0 done → move to hand 1
    } else {
      setGameStatus("dealerTurn");
      // Closure values are fresh here — nothing was mutated above
      runDealer(deck, playerHand, splitHand, result, splitResult);
    }
  }

  // Runs the dealer turn and resolves both hands.
  // All parameters are passed explicitly to avoid stale closure issues
  // when called from inside handleHit.
  function runDealer(deckNow, mainHand, split, mainResult, sResult) {
    let currentDealerHand = [...dealerHand];
    let currentDeck = [...deckNow];

    while (calculateHandValue(currentDealerHand) < 17) {
      currentDealerHand.push(currentDeck[0]);
      currentDeck = currentDeck.slice(1);
    }

    setDealerHand(currentDealerHand);
    setDeck(currentDeck);

    const dealerTotal = calculateHandValue(currentDealerHand);

    // Evaluate main hand (skip if already busted)
    if (mainResult !== "lose") {
      const playerTotal = calculateHandValue(mainHand);
      if (dealerTotal > 21 || playerTotal > dealerTotal) setResult("win");
      else if (dealerTotal > playerTotal) setResult("lose");
      else setResult("push");
    }

    // Evaluate split hand (skip if already busted)
    if (split !== null) {
      if (sResult !== "lose") {
        const splitTotal = calculateHandValue(split);
        if (dealerTotal > 21 || splitTotal > dealerTotal) setSplitResult("win");
        else if (dealerTotal > splitTotal) setSplitResult("lose");
        else setSplitResult("push");
      }
    }

    setGameStatus("finished");
  }

  // Display calculations
  const playerTotal = calculateHandValue(playerHand);
  const splitTotal = splitHand ? calculateHandValue(splitHand) : 0;
  const showFullDealerHand = gameStatus !== "playing";
  const dealerDisplayTotal = showFullDealerHand
    ? calculateHandValue(dealerHand)
    : dealerHand.length > 0
      ? calculateHandValue([dealerHand[0]])
      : 0;

  const canPlay = gameStatus === "playing";
  const gameOver = gameStatus === "bust" || gameStatus === "finished";

  const canSplit =
    canPlay &&
    splitHand === null &&
    playerHand.length === 2 &&
    playerHand[0]?.rank === playerHand[1]?.rank;

  function resultIcon(r) {
    if (r === "win") return " 🎉";
    if (r === "lose") return " 💥";
    if (r === "push") return " 🤝";
    return "";
  }

  // Status message — only used when there is no split
  let statusMessage = "";
  let statusColor = "#ffd700";
  if (splitHand === null) {
    if (gameStatus === "bust") {
      statusMessage = "💥 Bust! You lose.";
      statusColor = "#ff6b6b";
    } else if (gameStatus === "finished") {
      if (result === "win") {
        statusMessage = "🎉 You win!";
        statusColor = "#4ade80";
      } else if (result === "lose") {
        statusMessage = "😞 Dealer wins.";
        statusColor = "#ff6b6b";
      } else if (result === "push") {
        statusMessage = "🤝 Push (tie).";
        statusColor = "#ffd700";
      }
    }
  }

  const isPlayingHand0 = splitHand !== null && activeHand === 0 && !gameOver;
  const isPlayingHand1 = splitHand !== null && activeHand === 1 && !gameOver;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Dealer */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Dealer — {showFullDealerHand ? "total:" : "shows"}{" "}
          {dealerDisplayTotal}
        </Text>
        <View style={styles.hand}>
          {dealerHand.map((card, index) => (
            <Card
              key={card.id}
              rank={card.rank}
              suit={card.suit}
              faceDown={index === 1 && !showFullDealerHand}
              sizeScale={1.5}
            />
          ))}
        </View>
      </View>

      {/* Main hand */}
      <View style={styles.section}>
        <Text style={styles.label}>
          {splitHand ? (isPlayingHand0 ? "▶ Hand 1" : "Hand 1") : "You"}
          {" — total: "}
          {playerTotal}
          {gameOver && splitHand ? resultIcon(result) : ""}
        </Text>
        <View style={[styles.hand, isPlayingHand0 && styles.activeHand]}>
          {playerHand.map((card) => (
            <Card
              key={card.id}
              rank={card.rank}
              suit={card.suit}
              sizeScale={1.5}
            />
          ))}
        </View>
      </View>

      {/* Split hand (only shown after split) */}
      {splitHand && (
        <View style={styles.section}>
          <Text style={styles.label}>
            {isPlayingHand1 ? "▶ Hand 2" : "Hand 2"}
            {" — total: "}
            {splitTotal}
            {gameOver ? resultIcon(splitResult) : ""}
          </Text>
          <View style={[styles.hand, isPlayingHand1 && styles.activeHand]}>
            {splitHand.map((card) => (
              <Card
                key={card.id}
                rank={card.rank}
                suit={card.suit}
                sizeScale={1.5}
              />
            ))}
          </View>
        </View>
      )}

      {/* Status message (no-split games only) */}
      {statusMessage !== "" && (
        <Text style={[styles.status, { color: statusColor }]}>
          {statusMessage}
        </Text>
      )}

      {/* Hit / Stand / Split buttons */}
      {!gameOver && (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.hitButton,
              !canPlay && styles.disabled,
            ]}
            onPress={handleHit}
            disabled={!canPlay}
          >
            <Text style={styles.buttonText}>Hit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.standButton,
              !canPlay && styles.disabled,
            ]}
            onPress={handleStand}
            disabled={!canPlay}
          >
            <Text style={styles.buttonText}>Stand</Text>
          </TouchableOpacity>

          {canSplit && (
            <TouchableOpacity
              style={[styles.button, styles.splitButton]}
              onPress={handleSplit}
            >
              <Text style={styles.buttonText}>Split</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Play Again */}
      {gameOver && (
        <TouchableOpacity style={styles.playAgainButton} onPress={startNewGame}>
          <Text style={styles.playAgainText}>🔄 Play Again</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#0d5c2e",
    alignItems: "center",
    padding: scale(20),
  },
  section: {
    alignItems: "center",
    marginVertical: scale(20),
  },
  label: {
    color: "#ffffff",
    fontSize: scaleFont(18),
    fontWeight: "bold",
    marginBottom: scale(10),
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
  status: {
    fontSize: scaleFont(24),
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: scale(15),
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: scale(20),
    gap: scale(10),
  },
  button: {
    paddingVertical: scale(15),
    paddingHorizontal: scale(40),
    borderRadius: scale(10),
  },
  hitButton: {
    backgroundColor: "#e94560",
  },
  standButton: {
    backgroundColor: "#2980b9",
  },
  splitButton: {
    backgroundColor: "#8e44ad",
  },
  disabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: scaleFont(18),
    fontWeight: "bold",
  },
  playAgainButton: {
    marginTop: scale(30),
    backgroundColor: "#e94560",
    paddingVertical: scale(15),
    paddingHorizontal: scale(50),
    borderRadius: scale(10),
  },
  playAgainText: {
    color: "#ffffff",
    fontSize: scaleFont(18),
    fontWeight: "bold",
  },
});
