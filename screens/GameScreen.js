import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Alert,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HapticTouchable as TouchableOpacity } from "../components/Haptic";
import { createDeck, shuffleDeck, calculateHandValue } from "../game/deck";
import Card from "../components/Card";
import GameHeader from "../components/GameHeader";
import { playSound } from "../game/sounds";
import { scale, scaleFont } from "../game/responsive";
import { getCoins, addCoins, subtractCoins } from "../game/wallet";
import { saveGame, loadGame, clearGame } from "../game/gameSaves";
import { recordWin } from "../game/profile";
import { recordAchievementEvent } from "../game/achievements";
import TutorialOverlay, { hasSeen } from "../components/TutorialOverlay";
import EndOfRoundModal from "../components/EndOfRoundModal";
import StatsStrip from "../components/StatsStrip";
import Confetti from "../components/Confetti";
import { hapticImpact, hapticWin, hapticLose, HapticStyle } from "../game/haptics";
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

// Blackjack is a few-card game, so the cards are sized up for readability.
// (Hands still wrap to a second row in the rare case of many cards.)
const CARD_SIZE_SCALE = 1.3;

// Casino-chip palette per denomination: { bg, edge (dashed ring), ring (inner) }.
const CHIP_COLORS = {
  10: { bg: "#b3242b", edge: "#e35a61", ring: "#f2c9cb" },
  25: { bg: "#1c7a43", edge: "#46c47e", ring: "#c9efd8" },
  50: { bg: "#1f5fa8", edge: "#5b9bdc", ring: "#cfe2f7" },
  100: { bg: "#2b3340", edge: "#616b7a", ring: "#c7cdd6" },
  250: { bg: "#6e2da6", edge: "#a866dc", ring: "#e2ccf6" },
};
const SAVE_KEY = "@cardnight:save:blackjack";

export default function GameScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  // scroll padding 12*2=24, table horizontal padding 12*2=24
  const handWidth = width - 48;

  // ── Wallet state ──────────────────────────────────────────────────
  const [coins, setCoins] = useState(null);
  const [selectedBet, setSelectedBet] = useState(null);
  const [currentBet, setCurrentBet] = useState(0);
  const [coinsDelta, setCoinsDelta] = useState(0);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Win/loss streak (wins or losses in a row).
  const streakRef = useRef({ type: null, count: 0 }); // type: "W" | "L" | null
  const [streakLabel, setStreakLabel] = useState("—");

  function resetStreak() {
    streakRef.current = { type: null, count: 0 };
    setStreakLabel("—");
  }

  const currentBetRef = useRef(0);
  const payoutDoneRef = useRef(false);
  const modalDelayTimerRef = useRef(null);
  const hasMountedRef = useRef(false);

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
    getCoins().then(setCoins);
    hasSeen("blackjack").then((seen) => {
      if (!seen) setShowTutorial(true);
    });

    async function checkResume() {
      if (!route?.params?.resumeFromSave) return;
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
    if (screenPhase === "betting") return;
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

  useEffect(() => {
    // After the first render completes, flag mount-complete so future deals animate.
    // We use a microtask so this fires AFTER the initial render, before the next state update.
    const timer = setTimeout(() => {
      hasMountedRef.current = true;
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // UX-5: Android hardware back confirmation
  useEffect(() => {
    const onBack = () => {
      Alert.alert("Leave Game?", "Your current hand will be saved.", [
        { text: "Stay", style: "cancel" },
        {
          text: "Leave",
          onPress: () => navigation.navigate("Home"),
        },
      ]);
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => sub.remove();
  }, [navigation]);

  // Clean up the result-modal delay timer on unmount.
  useEffect(() => {
    return () => {
      if (modalDelayTimerRef.current) {
        clearTimeout(modalDelayTimerRef.current);
        modalDelayTimerRef.current = null;
      }
    };
  }, []);

  // ── Payout ────────────────────────────────────────────────────────
  // Called once per hand when it's fully resolved.
  // All result values are passed as parameters to avoid stale closure issues.
  async function resolveHandPayout(
    mainResult,
    sResult,
    hadSplit,
    dealerPlayed = false,
    freshDeal = false,
  ) {
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

    let newCoins;
    if (payout > 0) {
      newCoins = await addCoins(payout);
    } else {
      newCoins = await getCoins();
    }
    setCoins(newCoins);

    const totalBet = hadSplit ? bet * 2 : bet;
    const coinsDeltaNet = payout - totalBet;
    setCoinsDelta(coinsDeltaNet);

    // Outcome haptic: win = rising flourish, loss/bust = thud, push = nothing.
    if (coinsDeltaNet > 0) hapticWin();
    else if (coinsDeltaNet < 0) hapticLose();

    // Streak rules:
    // - coinsDeltaNet === 0 (push / bet returned) breaks the streak → "—"
    // - coinsDeltaNet > 0 => win streak ("W")
    // - coinsDeltaNet < 0 => loss streak ("L")
    if (coinsDeltaNet === 0) {
      resetStreak();
    } else {
      const nextType = coinsDeltaNet > 0 ? "W" : "L";
      const prev = streakRef.current;
      const nextCount = prev.type === nextType ? prev.count + 1 : 1;
      streakRef.current = { type: nextType, count: nextCount };
      setStreakLabel(`${nextCount}${nextType}`);
    }

    if (payout > totalBet) {
      playSound("win");
      recordWin("blackjack");
    }

    // UX-2: Delay the result modal so the player can see what happened before it's
    // covered. The full 2s is only needed when the dealer actually plays out a hand
    // (extra cards may animate in). A natural blackjack resolves instantly off the
    // deal, so `freshDeal` holds the modal long enough to watch the cards land + the
    // hole-card flip + read "Blackjack!". A mid-hand bust uses the short delay since
    // the player already saw their cards.
    const delayMs = dealerPlayed ? 2000 : freshDeal ? 2600 : 600;
    if (modalDelayTimerRef.current) clearTimeout(modalDelayTimerRef.current);
    modalDelayTimerRef.current = setTimeout(() => {
      setScreenPhase("result");
      modalDelayTimerRef.current = null;
    }, delayMs);
  }

  // ── Deal ──────────────────────────────────────────────────────────
  async function handleDeal() {
    if (modalDelayTimerRef.current) {
      clearTimeout(modalDelayTimerRef.current);
      modalDelayTimerRef.current = null;
    }
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
    hapticImpact(HapticStyle.Light);

    const newCoins = await subtractCoins(bet);
    setCoins(newCoins);

    // Check for natural blackjack (21 on the first two cards)
    const playerVal = calculateHandValue(playerCards);
    const dealerVal = calculateHandValue(dealerCards);
    if (playerVal === 21) {
      const bjResult = dealerVal === 21 ? "push" : "blackjack";
      setResult(bjResult);
      setGameStatus("finished");
      resolveHandPayout(bjResult, "", false, false, true);
      recordAchievementEvent("blackjackDealt"); // "Natural" achievement
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
    resolveHandPayout(finalMain, finalSplit, split !== null, true);
  }

  // ── Continue (same bet, deal immediately) ────────────────────────
  async function handleContinueSameBet() {
    if (modalDelayTimerRef.current) {
      clearTimeout(modalDelayTimerRef.current);
      modalDelayTimerRef.current = null;
    }
    const bet = currentBetRef.current;
    let freshCoins;

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
    hapticImpact(HapticStyle.Light);

    const newCoins = await subtractCoins(bet);
    setCoins(newCoins);

    const playerVal = calculateHandValue(playerCards);
    const dealerVal = calculateHandValue(dealerCards);
    if (playerVal === 21) {
      const bjResult = dealerVal === 21 ? "push" : "blackjack";
      setResult(bjResult);
      setGameStatus("finished");
      resolveHandPayout(bjResult, "", false, false, true);
      recordAchievementEvent("blackjackDealt"); // "Natural" achievement
    }
  }

  // ── Adjust bet (go back to betting screen) ────────────────────────
  async function handleAdjustBet() {
    if (modalDelayTimerRef.current) {
      clearTimeout(modalDelayTimerRef.current);
      modalDelayTimerRef.current = null;
    }
    clearGame(SAVE_KEY);
    const freshCoins = await getCoins();
    setCoins(freshCoins);
    if (freshCoins < MIN_BET) {
      setShowGameOver(true);
      return;
    }

    // Streak resets to "—" when adjusting bet.
    resetStreak();

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

    // Reset session stats on restart.
    resetStreak();
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
    { type: "theme" },
    { type: "divider" },
    {
      type: "quit",
      onQuit: () => {
        clearGame(SAVE_KEY);

        // Spec: reset streak on quit.
        resetStreak();

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

  // Celebrate when the player wins a hand (not on bust/lose/push).
  const playerWon =
    gameStatus === "finished" &&
    (result === "win" ||
      result === "blackjack" ||
      splitResult === "win" ||
      splitResult === "blackjack");

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
          subtitle="Casino"
          menuItems={menuItems}
        />
        <StatsStrip
          gameId="blackjack"
          items={[
            { label: "Coins", value: coins ?? "—", accent: true },
            {
              label: "Bet",
              value:
                screenPhase === "betting"
                  ? (selectedBet ?? "—")
                  : (currentBet ?? "—"),
            },
            {
              label: "Streak",
              value: streakLabel,
              accent: streakRef.current.type === "W",
            },
          ]}
        />
        <ScrollView
          contentContainerStyle={styles.bettingContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.betLabel}>Select Your Chip</Text>
          <View style={styles.betRow}>
            {BET_OPTIONS.map((amount) => {
              const isSelected = selectedBet === amount;
              const canAfford = coins !== null && coins >= amount;
              const c = CHIP_COLORS[amount] ?? CHIP_COLORS[10];
              return (
                <TouchableOpacity
                  key={amount}
                  activeOpacity={0.85}
                  style={[
                    styles.chip,
                    { backgroundColor: c.bg, borderColor: c.edge },
                    isSelected && styles.chipSelected,
                    !canAfford && styles.chipDisabled,
                  ]}
                  onPress={() => {
                    if (canAfford) setSelectedBet(amount);
                  }}
                  disabled={!canAfford}
                  accessibilityRole="button"
                  accessibilityLabel={`Bet ${amount}`}
                  accessibilityState={{ disabled: !canAfford, selected: isSelected }}
                >
                  <View style={[styles.chipRing, { borderColor: c.ring }]}>
                    <Text style={styles.chipAmount}>{amount}</Text>
                  </View>
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
            accessibilityRole="button"
            accessibilityLabel="Deal"
            accessibilityHint="Start the hand with your selected bet"
            accessibilityState={{ disabled: !selectedBet }}
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
        subtitle="Casino"
        menuItems={menuItems}
      />
      <StatsStrip
        gameId="blackjack"
        items={[
          { label: "Coins", value: coins ?? "—", accent: true },
          { label: "Bet", value: currentBet },
          {
            label: "Streak",
            value: streakLabel,
            accent: streakRef.current.type === "W",
          },
        ]}
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
                  animateReveal={index === 1}
                  sizeScale={CARD_SIZE_SCALE}
                  animateDeal={hasMountedRef.current}
                  dealDelay={dealerHand.length <= 2 ? index * 200 + 100 : 0}
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
              {playerHand.map((card, index) => (
                <Card
                  key={card.id}
                  rank={card.rank}
                  suit={card.suit}
                  sizeScale={CARD_SIZE_SCALE}
                  animateDeal={hasMountedRef.current}
                  dealDelay={playerHand.length <= 2 ? index * 200 : 0}
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
                {splitHand.map((card, index) => (
                  <Card
                    key={card.id}
                    rank={card.rank}
                    suit={card.suit}
                    sizeScale={CARD_SIZE_SCALE}
                    animateDeal={hasMountedRef.current}
                    dealDelay={splitHand.length <= 2 ? index * 100 : 0}
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
              accessibilityRole="button"
              accessibilityLabel="Hit"
              accessibilityHint="Take another card"
              accessibilityState={{ disabled: !canPlay }}
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
              accessibilityRole="button"
              accessibilityLabel="Stand"
              accessibilityHint="End your turn with current cards"
              accessibilityState={{ disabled: !canPlay }}
            >
              <Text style={styles.buttonText}>Stand</Text>
            </TouchableOpacity>

            {canSplit && (
              <TouchableOpacity
                style={[styles.button, styles.splitButton]}
                onPress={handleSplit}
                accessibilityRole="button"
                accessibilityLabel="Split"
                accessibilityHint="Split matching pair into two hands"
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

            // Spec: reset streak on quit/leave.
            resetStreak();

            navigation.navigate("Profile");
            return;
          }
          clearGame(SAVE_KEY);

          // Spec: reset streak on quit/leave.
          resetStreak();

          navigation.navigate("Home");
        }}
        tableColor={BG}
      />

      {/* Win celebration — rains over the table + result modal. */}
      <Confetti active={playerWon} />
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
    textAlign: "center",
  },
  betRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: scale(12),
    width: "100%",
  },
  chip: {
    width: scale(66),
    height: scale(66),
    borderRadius: scale(33),
    borderWidth: 3,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  chipRing: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  chipAmount: {
    color: "#ffffff",
    fontSize: scaleFont(15),
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  chipSelected: {
    borderColor: "#ffd700",
    borderStyle: "solid",
    transform: [{ translateY: -scale(6) }, { scale: 1.06 }],
    shadowColor: "#ffd700",
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  chipDisabled: {
    opacity: 0.3,
  },
  dealButton: {
    alignSelf: "stretch",
    minHeight: scale(96),
    borderRadius: scale(14),
    backgroundColor: "#cc2222",
    alignItems: "center",
    justifyContent: "center",
    marginTop: scale(4),
  },
  dealButtonDisabled: {
    backgroundColor: "#0f1a2c",
    opacity: 1,
  },
  dealButtonText: {
    color: "#ffffff",
    fontSize: scaleFont(18),
    fontWeight: "bold",
  },
  dealButtonTextDisabled: {
    color: "#ffffff",
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
    minHeight: scale(68),
    paddingHorizontal: scale(40),
    borderRadius: scale(10),
    justifyContent: "center",
    alignItems: "center",
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
    fontSize: scaleFont(12),
    fontWeight: "bold",
  },
});
