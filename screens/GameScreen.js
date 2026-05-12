import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createDeck, shuffleDeck, calculateHandValue } from "../game/deck";
import Card from "../components/Card";
import GameHeader from "../components/GameHeader";
import { playSound } from "../game/sounds";
import { scale, scaleFont } from "../game/responsive";
import { getCoins, addCoins, subtractCoins } from "../game/wallet";
import { saveGame, loadGame, clearGame } from "../game/gameSaves";
import { recordWin } from "../game/profile";
import TutorialOverlay, { hasSeen } from "../components/TutorialOverlay";
import EndOfRoundModal from "../components/EndOfRoundModal";
import { getTableTheme } from "../game/tableThemes";

const BG = getTableTheme("blackjack").table;
const ACCENT = getTableTheme("blackjack").accent;

const BLACKJACK_SLIDES = [
  {
    emoji: "🃏",
    title: "Beat the Dealer",
    body: "Try to get closer to 21 than the dealer without going over.",
  },
  {
    emoji: "👆",
    title: "Hit or Stand",
    body: "Tap HIT to take another card. Tap STAND to keep your total and let the dealer play.",
  },
  {
    emoji: "🪙",
    title: "Place Your Bet",
    body: "Choose a bet before each hand. Win = double your bet. Blackjack (Ace + 10-card) = 1.5×.",
  },
];

const BET_OPTIONS = [10, 25, 50, 100, 250];
const MIN_BET = 10;
const SAVE_KEY = "@cardnight:save:blackjack";

export default function GameScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  // scroll padding 12*2=24, table horizontal padding 12*2=24
  const handWidth = width - 48;

  const isFree = route?.params?.mode === "free";
  const freeCoinsRef = useRef(1000);

  // ── Wallet state ──────────────────────────────────────────────────
  const [coins, setCoins] = useState(null);
  const [selectedBet, setSelectedBet] = useState(null);
  const [currentBet, setCurrentBet] = useState(0);
  const [coinsDelta, setCoinsDelta] = useState(0);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const currentBetRef = useRef(0);
  const payoutDoneRef = useRef(false);

  // ── Screen phase: 'betting' | 'playing' | 'result' ───────────────
  const [screenPhase, setScreenPhase] = useState("betting");

  // ── Game state ────────────────────────────────────────────────────
  const [deck, setDeck] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [splitHand, setSplitHand] = useState(null);
  const [activeHand, setActiveHand] = useState(0);
  const [dealerHand, setDealerHand] = useState([]);
  const [gameStatus, setGameStatus] = useState("idle");
  // gameStatus: 'idle' | 'playing' | 'bust' | 'dealerTurn' | 'finished'
  const [result, setResult] = useState("");
  const [splitResult, setSplitResult] = useState("");

  // ── Load wallet + check for saved game on mount ───────────────────
  useEffect(() => {
    if (isFree) {
      freeCoinsRef.current = 1000;
      setCoins(1000);
    } else {
      getCoins().then(setCoins);
    }
    hasSeen("blackjack").then((seen) => {
      if (!seen) setShowTutorial(true);
    });

    async function checkResume() {
      if (isFree || !route?.params?.resumeFromSave) return;
      const saved = await loadGame(SAVE_KEY);
      if (!saved) return;
      const bet = saved.currentBet ?? 0;
      currentBetRef.current = bet;
      setCurrentBet(bet);
      setSelectedBet(bet);
      setDeck(saved.deck ?? []);
      setPlayerHand(saved.playerHand ?? []);
      setSplitHand(saved.splitHand ?? null);
      setActiveHand(saved.activeHand ?? 0);
      setDealerHand(saved.dealerHand ?? []);
      setGameStatus(saved.gameStatus ?? "playing");
      setResult(saved.result ?? "");
      setSplitResult(saved.splitResult ?? "");
      setCoinsDelta(saved.coinsDelta ?? 0);
      setScreenPhase(saved.screenPhase ?? "playing");
    }
    checkResume();
  }, []);

  // ── Auto-save during active hand ──────────────────────────────────
  useEffect(() => {
    if (isFree || screenPhase === "betting") return;
    saveGame(SAVE_KEY, {
      screenPhase,
      currentBet: currentBetRef.current,
      deck,
      playerHand,
      splitHand,
      activeHand,
      dealerHand,
      gameStatus,
      result,
      splitResult,
      coinsDelta,
    });
  }, [
    screenPhase,
    playerHand,
    splitHand,
    dealerHand,
    gameStatus,
    result,
    splitResult,
    coinsDelta,
  ]);

  // ── Payout ────────────────────────────────────────────────────────
  // Called once per hand when it's fully resolved.
  // All result values are passed as parameters to avoid stale closure issues.
  async function resolveHandPayout(mainResult, sResult, hadSplit) {
    if (payoutDoneRef.current) return;
    payoutDoneRef.current = true;

    const bet = currentBetRef.current;
    let payout = 0;
    if (mainResult === "win") payout += bet * 2;
    else if (mainResult === "push") payout += bet;
    else if (mainResult === "blackjack") payout += bet + Math.floor(bet * 1.5);
    // 'lose': 0

    if (hadSplit) {
      if (sResult === "win") payout += bet * 2;
      else if (sResult === "push") payout += bet;
    }

    if (isFree) {
      freeCoinsRef.current += payout;
      setCoins(freeCoinsRef.current);
    } else {
      let newCoins;
      if (payout > 0) {
        newCoins = await addCoins(payout);
      } else {
        newCoins = await getCoins();
      }
      setCoins(newCoins);
    }

    const totalBet = hadSplit ? bet * 2 : bet;
    setCoinsDelta(payout - totalBet);
    if (payout > totalBet) {
      playSound("win");
      recordWin("blackjack");
    }
    setScreenPhase("result");
  }

  // ── Deal ──────────────────────────────────────────────────────────
  async function handleDeal() {
    if (!selectedBet || screenPhase !== "betting") return;

    const bet = selectedBet;
    currentBetRef.current = bet;
    payoutDoneRef.current = false;
    setCurrentBet(bet);
    clearGame(SAVE_KEY);

    // Deal cards synchronously before the async wallet call so the
    // UI transitions immediately without a blank flash.
    const newDeck = shuffleDeck(createDeck());
    const playerCards = [newDeck[0], newDeck[2]];
    const dealerCards = [newDeck[1], newDeck[3]];
    const remainingDeck = newDeck.slice(4);

    setDeck(remainingDeck);
    setPlayerHand(playerCards);
    setSplitHand(null);
    setActiveHand(0);
    setDealerHand(dealerCards);
    setResult("");
    setSplitResult("");
    setGameStatus("playing");
    setScreenPhase("playing");
    playSound("card_deal");

    if (isFree) {
      freeCoinsRef.current -= bet;
      setCoins(freeCoinsRef.current);
    } else {
      const newCoins = await subtractCoins(bet);
      setCoins(newCoins);
    }

    // Check for natural blackjack (21 on the first two cards)
    const playerVal = calculateHandValue(playerCards);
    const dealerVal = calculateHandValue(dealerCards);
    if (playerVal === 21) {
      const bjResult = dealerVal === 21 ? "push" : "blackjack";
      setResult(bjResult);
      setGameStatus("finished");
      resolveHandPayout(bjResult, "", false);
    }
  }

  // ── Split ─────────────────────────────────────────────────────────
  async function handleSplit() {
    if (coins === null || coins < currentBetRef.current) return;
    const newCoins = await subtractCoins(currentBetRef.current);
    setCoins(newCoins);
    const newCard0 = deck[0];
    const newCard1 = deck[1];
    setPlayerHand([playerHand[0], newCard0]);
    setSplitHand([playerHand[1], newCard1]);
    setDeck(deck.slice(2));
    setActiveHand(0);
  }

  // ── Hit ───────────────────────────────────────────────────────────
  function handleHit() {
    playSound("card_flip");
    const newCard = deck[0];
    const remainingDeck = deck.slice(1);
    setDeck(remainingDeck);

    if (activeHand === 0) {
      const newHand = [...playerHand, newCard];
      setPlayerHand(newHand);
      if (calculateHandValue(newHand) > 21) {
        setResult("lose");
        if (splitHand !== null) {
          setActiveHand(1); // bust on hand 0 → move to hand 1
        } else {
          setGameStatus("bust");
          resolveHandPayout("lose", "", false);
        }
      }
    } else {
      const newSplitHand = [...splitHand, newCard];
      setSplitHand(newSplitHand);
      if (calculateHandValue(newSplitHand) > 21) {
        setSplitResult("lose");
        runDealer(remainingDeck, playerHand, newSplitHand, result, "lose");
      }
    }
  }

  // ── Stand ─────────────────────────────────────────────────────────
  function handleStand() {
    if (splitHand !== null && activeHand === 0) {
      setActiveHand(1);
    } else {
      setGameStatus("dealerTurn");
      runDealer(deck, playerHand, splitHand, result, splitResult);
    }
  }

  // ── Dealer turn ───────────────────────────────────────────────────
  // All result values are passed explicitly to avoid stale closure issues
  // when called from inside handleHit.
  function runDealer(deckNow, mainHand, split, mainResultIn, sResultIn) {
    let currentDealerHand = [...dealerHand];
    let currentDeck = [...deckNow];
    while (calculateHandValue(currentDealerHand) < 17) {
      currentDealerHand.push(currentDeck[0]);
      currentDeck = currentDeck.slice(1);
    }
    setDealerHand(currentDealerHand);
    setDeck(currentDeck);
    const dealerTotal = calculateHandValue(currentDealerHand);

    let finalMain = mainResultIn;
    let finalSplit = sResultIn;

    if (mainResultIn !== "lose") {
      const playerTotal = calculateHandValue(mainHand);
      if (dealerTotal > 21 || playerTotal > dealerTotal) finalMain = "win";
      else if (dealerTotal > playerTotal) finalMain = "lose";
      else finalMain = "push";
      setResult(finalMain);
    }

    if (split !== null && sResultIn !== "lose") {
      const splitTotal = calculateHandValue(split);
      if (dealerTotal > 21 || splitTotal > dealerTotal) finalSplit = "win";
      else if (dealerTotal > splitTotal) finalSplit = "lose";
      else finalSplit = "push";
      setSplitResult(finalSplit);
    }

    setGameStatus("finished");
    resolveHandPayout(finalMain, finalSplit, split !== null);
  }

  // ── Continue (same bet, deal immediately) ────────────────────────
  async function handleContinueSameBet() {
    const bet = currentBetRef.current;
    let freshCoins;

    if (isFree) {
      if (freeCoinsRef.current < MIN_BET) freeCoinsRef.current = 1000;
      freshCoins = freeCoinsRef.current;
      setCoins(freshCoins);
    } else {
      clearGame(SAVE_KEY);
      freshCoins = await getCoins();
      setCoins(freshCoins);
      if (freshCoins < MIN_BET) {
        setShowGameOver(true);
        return;
      }
      // If they can no longer afford the same bet, fall back to betting screen.
      if (freshCoins < bet) {
        setCoinsDelta(0);
        setResult("");
        setSplitResult("");
        setGameStatus("idle");
        setSplitHand(null);
        setScreenPhase("betting");
        return;
      }
    }

    payoutDoneRef.current = false;
    setCurrentBet(bet);

    const newDeck = shuffleDeck(createDeck());
    const playerCards = [newDeck[0], newDeck[2]];
    const dealerCards = [newDeck[1], newDeck[3]];
    const remainingDeck = newDeck.slice(4);

    setDeck(remainingDeck);
    setPlayerHand(playerCards);
    setSplitHand(null);
    setActiveHand(0);
    setDealerHand(dealerCards);
    setResult("");
    setSplitResult("");
    setGameStatus("playing");
    setScreenPhase("playing");
    playSound("card_deal");

    if (isFree) {
      freeCoinsRef.current -= bet;
      setCoins(freeCoinsRef.current);
    } else {
      const newCoins = await subtractCoins(bet);
      setCoins(newCoins);
    }

    const playerVal = calculateHandValue(playerCards);
    const dealerVal = calculateHandValue(dealerCards);
    if (playerVal === 21) {
      const bjResult = dealerVal === 21 ? "push" : "blackjack";
      setResult(bjResult);
      setGameStatus("finished");
      resolveHandPayout(bjResult, "", false);
    }
  }

  // ── Adjust bet (go back to betting screen) ────────────────────────
  async function handleAdjustBet() {
    if (isFree) {
      if (freeCoinsRef.current < MIN_BET) {
        freeCoinsRef.current = 1000;
        setCoins(1000);
      }
    } else {
      clearGame(SAVE_KEY);
      const freshCoins = await getCoins();
      setCoins(freshCoins);
      if (freshCoins < MIN_BET) {
        setShowGameOver(true);
        return;
      }
    }
    setCoinsDelta(0);
    setResult("");
    setSplitResult("");
    setGameStatus("idle");
    setSplitHand(null);
    setScreenPhase("betting");
  }

  // ── Restart ───────────────────────────────────────────────────────
  function handleRestart() {
    clearGame(SAVE_KEY);
    if (isFree) freeCoinsRef.current = 1000;
    payoutDoneRef.current = false;
    setDeck([]);
    setPlayerHand([]);
    setSplitHand(null);
    setActiveHand(0);
    setDealerHand([]);
    setGameStatus("idle");
    setResult("");
    setSplitResult("");
    setCoinsDelta(0);
    setScreenPhase("betting");
  }

  const menuItems = [
    { type: "restart", onRestart: handleRestart },
    { type: "howto", gameId: "blackjack" },
    { type: "sound" },
    { type: "theme" },
    { type: "divider" },
    {
      type: "quit",
      onQuit: () => {
        clearGame(SAVE_KEY);
        navigation.navigate("Home");
      },
    },
  ];

  // ── Display values ────────────────────────────────────────────────
  const playerTotal = calculateHandValue(playerHand);
  const splitTotal = splitHand ? calculateHandValue(splitHand) : 0;
  const showFullDealerHand = gameStatus !== "playing" && gameStatus !== "idle";
  const dealerDisplayTotal = showFullDealerHand
    ? calculateHandValue(dealerHand)
    : dealerHand.length > 0
      ? calculateHandValue([dealerHand[0]])
      : 0;

  const canPlay = gameStatus === "playing";
  const gameOver = gameStatus === "bust" || gameStatus === "finished";

  const canSplit =
    canPlay &&
    activeHand === 0 &&
    splitHand === null &&
    playerHand.length === 2 &&
    playerHand[0]?.rank === playerHand[1]?.rank &&
    coins !== null &&
    coins >= currentBetRef.current;

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
        statusMessage = "🤝 Push — bet returned.";
        statusColor = "#ffd700";
      } else if (result === "blackjack") {
        statusMessage = "🃏 Blackjack! You win!";
        statusColor = "#4ade80";
      }
    }
  }

  const coinsDeltaLabel =
    coinsDelta > 0
      ? `+${coinsDelta} coins!`
      : coinsDelta < 0
        ? `${coinsDelta} coins`
        : "Bet returned";

  const isPlayingHand0 = splitHand !== null && activeHand === 0 && !gameOver;
  const isPlayingHand1 = splitHand !== null && activeHand === 1 && !gameOver;

  function resultIcon(r) {
    if (r === "win" || r === "blackjack") return " 🎉";
    if (r === "lose") return " 💥";
    if (r === "push") return " 🤝";
    return "";
  }

  // ── Betting screen ────────────────────────────────────────────────
  if (screenPhase === "betting") {
    return (
      <SafeAreaView style={styles.screen}>
        <GameHeader
          gameId="blackjack"
          title="Blackjack"
          subtitle={isFree ? "Free Play" : "Casino Mode"}
          menuItems={menuItems}
        />
        <ScrollView
          contentContainerStyle={styles.bettingContainer}
          showsVerticalScrollIndicator={false}
        >
          {isFree && (
            <Text style={styles.freePlayBadge}>🎮 Free Play — Play Money</Text>
          )}

          <View style={styles.walletDisplay}>
            <Text style={styles.walletLabel}>Your Balance</Text>
            <Text style={styles.walletAmount}>
              🪙 {coins !== null ? coins.toLocaleString() : "—"}
            </Text>
          </View>

          <Text style={styles.betLabel}>Select Your Bet</Text>
          <View style={styles.betRow}>
            {BET_OPTIONS.map((amount) => {
              const isSelected = selectedBet === amount;
              const canAfford = coins !== null && coins >= amount;
              return (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.betButton,
                    isSelected && styles.betButtonSelected,
                    !canAfford && styles.betButtonDisabled,
                  ]}
                  onPress={() => {
                    if (canAfford) setSelectedBet(amount);
                  }}
                  disabled={!canAfford}
                >
                  <Text
                    style={[
                      styles.betButtonText,
                      isSelected && styles.betButtonTextSelected,
                    ]}
                  >
                    {amount}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.dealButton,
              !selectedBet && styles.dealButtonDisabled,
            ]}
            onPress={handleDeal}
            disabled={!selectedBet}
          >
            <Text
              style={[
                styles.dealButtonText,
                !selectedBet && styles.dealButtonTextDisabled,
              ]}
            >
              {selectedBet
                ? `Deal  —  🪙 ${selectedBet}`
                : "Select a bet first"}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <TutorialOverlay
          visible={showTutorial}
          slides={BLACKJACK_SLIDES}
          gameId="blackjack"
          onDone={() => setShowTutorial(false)}
        />
      </SafeAreaView>
    );
  }

  // ── Playing / Result screen ───────────────────────────────────────
  return (
    <SafeAreaView style={styles.screen}>
      <GameHeader
        gameId="blackjack"
        title="Blackjack"
        leftInfo={
          <View style={styles.headerInfoRow}>
            <Text style={styles.headerCoins}>
              🪙 {coins !== null ? coins.toLocaleString() : "—"}
            </Text>
            {currentBet > 0 && (
              <Text style={styles.headerBet}>Bet: {currentBet}</Text>
            )}
          </View>
        }
        menuItems={menuItems}
      />

      <ScrollView
        style={styles.handsScroll}
        contentContainerStyle={styles.handsScrollContent}
      >
        <View style={styles.table}>
          {/* Dealer */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Dealer — {showFullDealerHand ? "total:" : "shows"}{" "}
              {dealerDisplayTotal}
            </Text>
            <View style={[styles.hand, { width: handWidth }]}>
              {dealerHand.map((card, index) => (
                <Card
                  key={card.id}
                  rank={card.rank}
                  suit={card.suit}
                  faceDown={index === 1 && !showFullDealerHand}
                  sizeScale={1}
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
            <View
              style={[
                styles.hand,
                isPlayingHand0 && styles.activeHand,
                { width: handWidth },
              ]}
            >
              {playerHand.map((card) => (
                <Card
                  key={card.id}
                  rank={card.rank}
                  suit={card.suit}
                  sizeScale={1}
                />
              ))}
            </View>
          </View>

          {/* Split hand */}
          {splitHand && (
            <View style={styles.section}>
              <Text style={styles.label}>
                {isPlayingHand1 ? "▶ Hand 2" : "Hand 2"}
                {" — total: "}
                {splitTotal}
                {gameOver ? resultIcon(splitResult) : ""}
              </Text>
              <View
                style={[
                  styles.hand,
                  isPlayingHand1 && styles.activeHand,
                  { width: handWidth },
                ]}
              >
                {splitHand.map((card) => (
                  <Card
                    key={card.id}
                    rank={card.rank}
                    suit={card.suit}
                    sizeScale={1}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Status shown during bust/dealer-turn before result modal appears */}
          {statusMessage !== "" && screenPhase !== "result" && (
            <Text style={[styles.status, { color: statusColor }]}>
              {statusMessage}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Action buttons */}
      {screenPhase === "playing" && !gameOver ? (
        <View style={styles.bottomArea}>
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
        </View>
      ) : null}

      <EndOfRoundModal
        visible={screenPhase === "result" || showGameOver}
        title={showGameOver ? "💸 Out of Coins!" : statusMessage}
        message={
          showGameOver
            ? "You're out of coins. Visit your Profile to reset your balance."
            : coinsDeltaLabel
        }
        showContinue={!showGameOver}
        showAdjustBet={!showGameOver}
        showLeave={true}
        leaveLabel={showGameOver ? "Go to Profile" : undefined}
        onContinue={handleContinueSameBet}
        onAdjustBet={handleAdjustBet}
        onLeave={() => {
          if (showGameOver) {
            setShowGameOver(false);
            navigation.navigate("Profile");
            return;
          }
          clearGame(SAVE_KEY);
          navigation.navigate("Home");
        }}
        tableColor={BG}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    padding: scale(20),
  },

  // ── Betting screen ────────────────────────────────────────────────
  bettingContainer: {
    flexGrow: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(20),
    paddingVertical: scale(24),
  },
  freePlayBadge: {
    color: "#7fb3ff",
    fontSize: scaleFont(13),
    fontWeight: "700",
    textAlign: "center",
    marginTop: scale(-8),
  },
  walletDisplay: {
    backgroundColor: "#0a4a24",
    borderRadius: scale(14),
    borderWidth: 1.5,
    borderColor: "#1a7a44",
    paddingVertical: scale(14),
    paddingHorizontal: scale(28),
    alignItems: "center",
    width: "100%",
  },
  walletLabel: {
    color: "#b0d4b0",
    fontSize: scaleFont(12),
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: scale(4),
  },
  walletAmount: {
    color: "#ffd700",
    fontSize: scaleFont(30),
    fontWeight: "bold",
  },
  betLabel: {
    color: "#e0e0e0",
    fontSize: scaleFont(14),
    textTransform: "uppercase",
    letterSpacing: 1,
    alignSelf: "flex-start",
  },
  betRow: {
    flexDirection: "row",
    gap: scale(8),
    width: "100%",
  },
  betButton: {
    flex: 1,
    minHeight: scale(52),
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: "#1a7a44",
    backgroundColor: "#0a4a24",
    alignItems: "center",
    justifyContent: "center",
  },
  betButtonSelected: {
    borderColor: "#ffd700",
    backgroundColor: "#1a4a10",
  },
  betButtonDisabled: {
    opacity: 0.3,
  },
  betButtonText: {
    color: "#e0e0e0",
    fontSize: scaleFont(15),
    fontWeight: "bold",
  },
  betButtonTextSelected: {
    color: "#ffd700",
  },
  dealButton: {
    width: "100%",
    minHeight: scale(78),
    borderRadius: scale(14),
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    marginTop: scale(4),
  },
  dealButtonDisabled: {
    backgroundColor: "#444",
    opacity: 0.8,
  },
  dealButtonText: {
    color: "#08111f",
    fontSize: scaleFont(23),
    fontWeight: "bold",
  },
  dealButtonTextDisabled: {
    color: "#aaaaaa",
  },

  // ── GameHeader leftInfo styles ────────────────────────────────────
  headerInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(14),
  },
  headerCoins: {
    color: "#ffd700",
    fontSize: scaleFont(15),
    fontWeight: "bold",
  },
  headerBet: {
    color: "#b0d4b0",
    fontSize: scaleFont(14),
    fontWeight: "bold",
  },

  // ── Playing/Result screen (cards & status) ───────────────────────
  handsScroll: {
    flex: 1,
    alignSelf: "stretch",
  },
  handsScrollContent: {
    flexGrow: 1,
    backgroundColor: BG,
    padding: scale(12),
  },
  table: {
    flexGrow: 1,
    backgroundColor: BG,
    borderRadius: scale(20),
    alignItems: "center",
    paddingHorizontal: scale(12),
    paddingVertical: scale(20),
    paddingBottom: scale(30),
  },
  bottomArea: {
    alignSelf: "stretch",
    alignItems: "center",
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
    marginVertical: scale(10),
  },
  coinsDeltaText: {
    fontSize: scaleFont(20),
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: scale(10),
  },
  coinsDeltaPositive: {
    color: "#ffd700",
  },
  coinsDeltaNegative: {
    color: "#ff6b6b",
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
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
});
