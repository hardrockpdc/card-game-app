import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { scale, scaleFont } from "../game/responsive";

const GAMES = [
  { id: "blackjack", label: "Blackjack" },
  { id: "goFish", label: "Go Fish" },
  { id: "conquian", label: "Conquián" },
  { id: "poker", label: "Poker" },
];

const RULES = {
  blackjack: {
    goal: "Get a hand total closer to 21 than the dealer — without going over.",
    rules: [
      "Number cards are worth their face value. J, Q, K = 10. Ace = 1 or 11.",
      "You are dealt 2 cards. The dealer also gets 2 cards — but one is face down.",
      "Hit — take another card to increase your total.",
      "Stand — stop and keep your current total.",
      'If your total goes over 21 you "bust" and lose immediately.',
      "Once you stand, the dealer flips their hidden card. The dealer keeps hitting until they reach 17 or more.",
      'Whoever is closer to 21 wins. If you tie it is called a "push" — no one wins.',
    ],
  },
  goFish: {
    goal: 'Collect the most "books" — a book is all 4 cards of the same rank.',
    rules: [
      'Each player starts with 7 cards (5 cards for 3+ players). The rest form the "ocean" pile.',
      'On your turn, pick any rank that is in YOUR hand and ask another player: "Do you have any Kings?"',
      "If they have cards of that rank, they must hand all of them over — and you get to go again!",
      'If they have none, they say "Go Fish!" and you draw the top card from the ocean.',
      "If the card you drew matches the rank you asked for, show it and take another turn!",
      'When you collect all 4 cards of the same rank, lay them face-up as a "book".',
      "When all 13 books have been made, count them up — the player with the most books wins!",
    ],
  },
  conquian: {
    goal: "Be the first to meld enough cards — one more than your starting hand size.",
    rules: [
      "Uses a 40-card Mexican deck — the 8s, 9s, and 10s are removed. Rank order for runs: A 2 3 4 5 6 7 J Q K (7 and J are adjacent!).",
      "2 players: 10 cards each, need 11 melded. 3–4 players: 8 cards each, need 9 melded.",
      "A card is drawn from the stock and placed face-up in the Active Slot — everyone can see it.",
      "Players are offered the card in turn order. You can Take it or Pass it.",
      "If you Take: you must immediately meld the card with cards from your hand. A SET is 3–4 of the same rank. A RUN is 3+ same-suit consecutive cards.",
      "After melding the taken card, discard one card from your hand. That discard becomes the new Active Slot — offered to the others.",
      "If you Pass: the card is offered to the next player. Once you pass, you cannot take that card back.",
      "If everyone passes: the card goes to the Dead Pile and the next player draws a new card.",
      "If the stock runs out with no winner, the game is a Tie.",
      "First player to reach the meld target wins!",
    ],
  },
  poker: {
    goal: "Win chips by having the best 5-card hand at showdown, or by making everyone else fold.",
    hands: [
      "Royal Flush — A K Q J 10 all the same suit (unbeatable!)",
      "Straight Flush — 5 cards in a row, all same suit",
      "Four of a Kind — all 4 cards of the same rank",
      "Full House — 3 of a kind + a pair",
      "Flush — 5 cards all the same suit (any order)",
      "Straight — 5 cards in a row (any suits)",
      "Three of a Kind — 3 cards of the same rank",
      "Two Pair — two separate pairs",
      "One Pair — two cards of the same rank",
      "High Card — none of the above (lowest hand)",
    ],
    rules: [
      'Each player receives 2 private "hole" cards that only they can see.',
      "Two players post forced bets: the Small Blind (10 chips) and Big Blind (20 chips).",
      "Pre-Flop: everyone bets based on their 2 hole cards.",
      "The Flop: 3 community cards are placed face-up in the middle. Another betting round.",
      "The Turn: 1 more community card is added. Another betting round.",
      "The River: the final community card is added. Last betting round.",
      "Showdown: remaining players reveal their cards. Best 5-card hand using any combination of hole cards + community cards wins the pot.",
      "On your turn you can: Fold (give up your hand), Check (pass if no bet to you), Call (match the current bet), or Raise (increase the bet).",
    ],
  },
};

export default function HowToPlayScreen() {
  const [gameId, setGameId] = useState("blackjack");
  const info = RULES[gameId];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Game selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
      >
        <View style={styles.chipRow}>
          {GAMES.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[styles.chip, gameId === g.id && styles.chipSelected]}
              onPress={() => setGameId(g.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  gameId === g.id && styles.chipTextSelected,
                ]}
              >
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Goal */}
      <View style={styles.goalBox}>
        <Text style={styles.goalLabel}>Goal</Text>
        <Text style={styles.goalText}>{info.goal}</Text>
      </View>

      {/* Hand rankings (Poker only) */}
      {info.hands && (
        <>
          <Text style={styles.sectionHeader}>Hand Rankings (Best → Worst)</Text>
          {info.hands.map((hand, i) => (
            <View key={i} style={styles.ruleRow}>
              <Text style={styles.ruleBullet}>{i + 1}</Text>
              <Text style={styles.ruleText}>{hand}</Text>
            </View>
          ))}
        </>
      )}

      {/* Rules */}
      <Text style={styles.sectionHeader}>How to Play</Text>
      {info.rules.map((rule, i) => (
        <View key={i} style={styles.ruleRow}>
          <View style={styles.bulletCircle}>
            <Text style={styles.bulletNum}>{i + 1}</Text>
          </View>
          <Text style={styles.ruleText}>{rule}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#1a1a2e",
    padding: scale(16),
    paddingBottom: scale(40),
  },

  chipScroll: { marginBottom: scale(16) },
  chipRow: { flexDirection: "row", gap: scale(10), paddingVertical: scale(4) },
  chip: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    backgroundColor: "#16213e",
    borderWidth: 1.5,
    borderColor: "#334",
  },
  chipSelected: { backgroundColor: "#e94560", borderColor: "#e94560" },
  chipText: { color: "#c4c4d4", fontSize: scaleFont(14), fontWeight: "bold" },
  chipTextSelected: { color: "#fff" },

  goalBox: {
    backgroundColor: "#16213e",
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(20),
    borderLeftWidth: 4,
    borderLeftColor: "#e94560",
  },
  goalLabel: {
    color: "#e94560",
    fontSize: scaleFont(11),
    textTransform: "uppercase",
    letterSpacing: scale(1),
    marginBottom: scale(6),
    fontWeight: "bold",
  },
  goalText: { color: "#fff", fontSize: scaleFont(16), lineHeight: scale(24) },

  sectionHeader: {
    color: "#c4c4d4",
    fontSize: scaleFont(12),
    textTransform: "uppercase",
    letterSpacing: scale(1),
    marginBottom: scale(14),
    marginTop: scale(4),
  },

  ruleRow: {
    flexDirection: "row",
    marginBottom: scale(14),
    alignItems: "flex-start",
  },
  bulletCircle: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    backgroundColor: "#e94560",
    alignItems: "center",
    justifyContent: "center",
    marginRight: scale(12),
    marginTop: scale(1),
    flexShrink: 0,
  },
  bulletNum: { color: "#fff", fontSize: scaleFont(13), fontWeight: "bold" },
  ruleText: {
    flex: 1,
    color: "#e8e8f0",
    fontSize: scaleFont(15),
    lineHeight: scale(23),
  },
});
