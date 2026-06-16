import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
} from "react-native";
import { HapticTouchable as TouchableOpacity } from "../components/Haptic";
import { scale, scaleFont } from "../game/responsive";
import Card from "../components/Card";
import { POKER_VARIANT_OPTIONS } from "../components/PokerVariantWheel";
import { RUMMY_VARIANTS, RUMMY_VARIANT_OPTIONS } from "../game/rummy";
import { VARIANT_OPTIONS as SOLITAIRE_VARIANT_OPTIONS } from "../game/solitaire";

const GAME_THUMBS = {
  blackjack: require("../assets/images/thumb_blackjack.png"),
  goFish: require("../assets/images/thumb_gofish.png"),
  poker: require("../assets/images/thumb_poker.png"),
  rummy: require("../assets/images/thumb_rummy.png"),
  solitaire: require("../assets/images/thumb_solitaire.png"),
  lastcard: require("../assets/images/thumb_lastcard.png"),
};

const GAMES = [
  {
    id: "blackjack",
    label: "Blackjack",
    accent: "#e94560",
    thumb: GAME_THUMBS.blackjack,
  },
  {
    id: "goFish",
    label: "Go Fish",
    accent: "#1565c0",
    thumb: GAME_THUMBS.goFish,
  },
  // No dedicated thumb available for Conquián/Wild Round in /assets/images,
  // so Conquián uses card illustrations, Wild Round uses a text “prompt/answer” illustration.
  { id: "conquian", label: "Conquián", accent: "#6a1b9a", thumb: null },
  { id: "poker", label: "Poker", accent: "#e94560", thumb: GAME_THUMBS.poker },
  { id: "rummy", label: "Rummy", accent: "#e94560", thumb: GAME_THUMBS.rummy },
  {
    id: "solitaire",
    label: "Solitaire",
    accent: "#7fb3ff",
    thumb: GAME_THUMBS.solitaire,
  },
  {
    id: "lastcard",
    label: "Last Card",
    accent: "#e94560",
    thumb: GAME_THUMBS.lastcard,
  },
  { id: "wildround", label: "Wild Round", accent: "#6a1b9a", thumb: null },
];

const BLACKJACK = {
  goal: "Beat the dealer by getting closer to 21 — without going over.",
  steps: [
    {
      title: "Deal",
      text: "You get 2 cards. The dealer gets 2 cards, but 1 is face down.",
    },
    {
      title: "Count your total",
      text: "Number cards = face value. J/Q/K = 10. Ace = 1 or 11.",
    },
    {
      title: "Hit",
      text: "Draw another card. Your total goes up. Keep going or stop.",
    },
    { title: "Stand", text: "Stop and keep your current total." },
    { title: "Bust", text: "If you go over 21, you lose immediately." },
    {
      title: "Dealer’s turn",
      text: "After you stand, the dealer flips their hidden card and hits until they reach 17+.",
    },
    {
      title: "Win / Push",
      text: "Closest to 21 wins. If you tie, it’s a “push” (no one wins).",
    },
  ],
};

const GO_FISH = {
  goal: "Collect the most “books”. A book = all 4 cards of one rank.",
  steps: [
    {
      title: "Start",
      text: "Each player gets 7 cards. The rest form the Ocean.",
    },
    {
      title: "Ask",
      text: "Pick a rank you already have and ask another player: “Do you have any Kings?”",
    },
    {
      title: "If they have it",
      text: "They must give you ALL cards of that rank — and you get another turn.",
    },
    {
      title: "If they don’t",
      text: "They say “Go Fish!” and you draw 1 card from the Ocean.",
    },
    {
      title: "Match = bonus turn",
      text: "If your drawn card matches your asked rank, you go again.",
    },
    {
      title: "Books",
      text: "When you collect all 4 cards of a rank, lay them face-up as a book.",
    },
    {
      title: "Win",
      text: "When all books are made, whoever has the most books wins.",
    },
  ],
};

const CONQUIAN = {
  goal: "Be the first to meld enough cards to reach the meld target.",
  steps: [
    {
      title: "Know the deck + target",
      text: "Conquián uses a 40-card deck (8s, 9s, and 10s removed). Runs are A-2-3-4-5-6-7-J-Q-K (7 and J are adjacent).",
    },
    {
      title: "Active Slot",
      text: "A face-up card is placed in the Active Slot so everyone can see it.",
    },
    {
      title: "Take or Pass",
      text: "On your turn: TAKE (meld it right away) or PASS.",
    },
    {
      title: "Forced take",
      text: "If the Active card directly extends one of your table melds, you must take it — you can’t pass.",
    },
    {
      title: "If you Take",
      text: "You MUST meld using a SET (3–4 same rank) or a RUN (3+ same-suit consecutive).",
    },
    {
      title: "After melding",
      text: "Discard 1 card from your hand — that discard becomes the new Active Slot (chain starts).",
    },
    {
      title: "If you Pass",
      text: "The card is offered to the next player. If everyone passes, it goes to the Dead Pile.",
    },
    {
      title: "Win / Tie",
      text: "First player to reach the meld target wins. If stock runs out with no winner, it’s a Tie.",
    },
  ],
};

const POKER_HAND_RANKINGS = [
  "Royal Flush — A K Q J 10 (all same suit)",
  "Straight Flush — 5 in a row, same suit",
  "Four of a Kind — all 4 cards same rank",
  "Full House — 3 of a kind + a pair",
  "Flush — 5 same suit (any order)",
  "Straight — 5 in a row (any suits)",
  "Three of a Kind — 3 same rank",
  "Two Pair — two separate pairs",
  "One Pair — 2 same rank",
  "High Card — none of the above",
];

function pokerVariantSteps(variantKey) {
  switch (variantKey) {
    case "texasHoldem":
      return [
        { title: "Hole cards", text: "You get 2 private cards (face down)." },
        {
          title: "Pre-Flop betting",
          text: "Everyone bets using only their hole cards.",
        },
        {
          title: "Flop / Turn / River",
          text: "5 community cards are dealt in 3 rounds: Flop (3), Turn (1), River (1).",
        },
        {
          title: "Betting rounds",
          text: "Bet again after Flop, after Turn, and after River.",
        },
        {
          title: "Showdown",
          text: "Make the best 5-card hand using ANY combo of hole + community cards.",
        },
      ];
    case "omaha":
      return [
        { title: "Hole cards", text: "You get 4 private cards (face down)." },
        {
          title: "Community cards",
          text: "5 community cards are dealt in 3 rounds (Flop/Turn/River).",
        },
        {
          title: "Rule that matters",
          text: "At showdown, you must use EXACTLY 2 hole cards + 3 community cards.",
        },
        {
          title: "Betting rounds",
          text: "Bet pre-flop, after flop, after turn, and after river.",
        },
        {
          title: "Showdown",
          text: "Best legal 5-card hand wins (with the Omaha hole-card rule).",
        },
      ];
    case "fiveCardDraw":
      return [
        { title: "Hole cards", text: "You get 5 private cards." },
        {
          title: "First betting round",
          text: "Bet before drawing replacements.",
        },
        {
          title: "Draw phase",
          text: "Choose some cards to discard, then draw replacement cards from the deck.",
        },
        { title: "Final betting round", text: "Bet again after the draw." },
        {
          title: "Showdown",
          text: "Your best 5-card hand (only your hole cards) wins.",
        },
      ];
    case "sevenCardStud":
      return [
        {
          title: "Hole cards",
          text: "Stud uses 7 total cards per player, with a mix of face up/face down cards.",
        },
        {
          title: "Multiple betting rounds",
          text: "Bet as more cards are dealt (round structure depends on the exact stud rules).",
        },
        {
          title: "Best 5-card hand",
          text: "At showdown, use the best 5 cards out of your 7.",
        },
        {
          title: "Hidden info",
          text: "Because some cards are face down, your hand strength is partly unknown until later rounds.",
        },
        { title: "Showdown", text: "Best hand wins." },
      ];
    default:
      return pokerVariantSteps("texasHoldem");
  }
}

const LASTCARD = {
  goal: "Empty your hand by matching the top discard card — first to play your last card wins!",
  steps: [
    {
      title: "How you play",
      text: "On your turn, swipe a card up (or tap it) to play a card that matches the top discard by COLOR or NUMBER.",
    },
    {
      title: "Action cards change turns",
      text: "Skip ⊘, Reverse ⟲, Draw 2 (+2), Wild, and Wild Draw 4 (+4) shake up the turn order.",
    },
    {
      title: "Wilds choose color",
      text: "Wild: choose any color. Wild Draw 4: choose any color, then opponent draws 4 and loses their turn.",
    },
    {
      title: "Draw until you can play",
      text: "If you can’t play, draw one card at a time until you can play.",
    },
    {
      title: "If the draw pile empties",
      text: "Shuffle the discard pile (except the top card) to form a new draw pile.",
    },
    { title: "Win", text: "Play your last card — you win immediately." },
  ],
};

const WILDROUND = {
  goal: "Win by being the judge that selects the funniest answers (first to 10 points).",
  steps: [
    {
      title: "Setup (each game / new round)",
      text: "Each player gets 10 answer cards. A judge is chosen, then rotates.",
    },
    {
      title: "Judge skip phase",
      text: "Only the judge sees the prompt. Judge can KEEP it or SKIP once to draw a new prompt.",
    },
    {
      title: "Submission phase",
      text: "Everyone else taps an answer card, then taps Submit. Round waits until all submissions are in.",
    },
    {
      title: "Judge picks winner",
      text: "Judge swipes through anonymous submissions and taps the winner.",
    },
    {
      title: "Reveal phase",
      text: "Winning answer is shown with the submitter name. Winner scores +1 point.",
    },
    {
      title: "Next round",
      text: "Cards go to discard, players redraw back up to 10, and the next judge is chosen.",
    },
  ],
};

function StepRow({ index, title, text, accent }) {
  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepIndex, { backgroundColor: accent }]}>
        <Text style={styles.stepIndexText}>{index + 1}</Text>
      </View>
      <View style={styles.stepBody}>
        <Text style={[styles.stepTitle, { color: accent }]}>{title}</Text>
        <Text style={styles.stepText}>{text}</Text>
      </View>
    </View>
  );
}

function Chip({ selected, onPress, children, accent }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.chip,
        selected ? { backgroundColor: accent, borderColor: accent } : null,
      ]}
    >
      {children}
    </TouchableOpacity>
  );
}

function GameIllustration({
  gameId,
  pokerVariantId,
  rummyVariantId,
  solitaireVariantId,
}) {
  if (gameId === "blackjack") {
    return (
      <View style={styles.illuWrap}>
        <Text style={styles.illuLabel}>Example hand</Text>
        <View style={styles.illuRow}>
          <View style={styles.illuCol}>
            <Text style={styles.illuSubLabel}>You</Text>
            <View style={styles.illuCardRow}>
              <Card rank="A" suit="♠" sizeScale={0.95} />
              <Card rank="10" suit="♥" sizeScale={0.95} />
            </View>
          </View>
          <View style={styles.illuCol}>
            <Text style={styles.illuSubLabel}>Dealer</Text>
            <View style={styles.illuCardRow}>
              <Card rank="K" suit="♦" faceDown sizeScale={0.95} />
              <Card rank="7" suit="♣" sizeScale={0.95} />
            </View>
            <Text style={styles.illuHint}>Dealer has 1 face-down card</Text>
          </View>
        </View>
      </View>
    );
  }

  if (gameId === "goFish") {
    return (
      <View style={styles.illuWrap}>
        <Text style={styles.illuLabel}>Turn snapshot</Text>
        <View style={styles.illuRow}>
          <View style={styles.illuCol}>
            <Text style={styles.illuSubLabel}>Your ask</Text>
            <View style={styles.illuCardRow}>
              <Card rank="K" suit="♠" small sizeScale={0.95} />
              <Card rank="K" suit="♥" small sizeScale={0.95} />
              <Card rank="4" suit="♦" small sizeScale={0.95} />
            </View>
            <Text style={styles.illuHint}>Ask for a rank you already have</Text>
          </View>
          <View style={styles.illuCol}>
            <Text style={styles.illuSubLabel}>Ocean</Text>
            <View style={styles.illuCardRow}>
              <Card rank="Q" suit="♣" faceDown small sizeScale={0.95} />
            </View>
            <Text style={styles.illuHint}>Draw when it’s “Go Fish!”</Text>
          </View>
        </View>
        <View style={styles.illuDivider} />
        <View style={styles.illuRow}>
          <View style={styles.illuCol}>
            <Text style={styles.illuSubLabel}>Book example</Text>
            <View style={styles.illuCardRow}>
              <Card rank="7" suit="♠" small sizeScale={0.95} />
              <Card rank="7" suit="♥" small sizeScale={0.95} />
              <Card rank="7" suit="♦" small sizeScale={0.95} />
              <Card rank="7" suit="♣" small sizeScale={0.95} />
            </View>
            <Text style={styles.illuHint}>4 of the same rank = 1 book</Text>
          </View>
        </View>
      </View>
    );
  }

  if (gameId === "conquian") {
    return (
      <View style={styles.illuWrap}>
        <Text style={styles.illuLabel}>Meld examples</Text>
        <View style={styles.illuRow}>
          <View style={styles.illuCol}>
            <Text style={styles.illuSubLabel}>Set (same rank)</Text>
            <View style={styles.illuCardRow}>
              <Card rank="6" suit="♠" small sizeScale={0.95} />
              <Card rank="6" suit="♥" small sizeScale={0.95} />
              <Card rank="6" suit="♦" small sizeScale={0.95} />
            </View>
          </View>
          <View style={styles.illuCol}>
            <Text style={styles.illuSubLabel}>Run (same suit)</Text>
            <View style={styles.illuCardRow}>
              <Card rank="J" suit="♣" small sizeScale={0.95} />
              <Card rank="Q" suit="♣" small sizeScale={0.95} />
              <Card rank="K" suit="♣" small sizeScale={0.95} />
            </View>
            <Text style={styles.illuHint}>Runs are consecutive</Text>
          </View>
        </View>
      </View>
    );
  }

  if (gameId === "poker") {
    return (
      <View style={styles.illuWrap}>
        <Text style={styles.illuLabel}>Example poker table</Text>
        <Text style={styles.illuHint}>
          This snapshot shows the idea behind poker variants.
        </Text>
        <View style={styles.illuRow}>
          <View style={styles.illuCol}>
            <Text style={styles.illuSubLabel}>Your hole cards</Text>
            <View style={styles.illuCardRow}>
              <Card rank="A" suit="♠" small sizeScale={0.95} />
              <Card rank="K" suit="♥" small sizeScale={0.95} />
            </View>
          </View>
          <View style={styles.illuCol}>
            <Text style={styles.illuSubLabel}>Board cards</Text>
            <View style={styles.illuCardRow}>
              <Card rank="10" suit="♣" small sizeScale={0.95} />
              <Card rank="J" suit="♣" small sizeScale={0.95} />
              <Card rank="Q" suit="♣" small sizeScale={0.95} />
            </View>
            <Text style={styles.illuHint}>
              Use the best legal 5 at showdown
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (gameId === "rummy") {
    return (
      <View style={styles.illuWrap}>
        <Text style={styles.illuLabel}>Meld examples (sets / runs)</Text>
        <View style={styles.illuRow}>
          <View style={styles.illuCol}>
            <Text style={styles.illuSubLabel}>Set</Text>
            <View style={styles.illuCardRow}>
              <Card rank="7" suit="♠" small sizeScale={0.95} />
              <Card rank="7" suit="♥" small sizeScale={0.95} />
              <Card rank="7" suit="♦" small sizeScale={0.95} />
            </View>
            <Text style={styles.illuHint}>3+ same rank</Text>
          </View>
          <View style={styles.illuCol}>
            <Text style={styles.illuSubLabel}>Run</Text>
            <View style={styles.illuCardRow}>
              <Card rank="4" suit="♣" small sizeScale={0.95} />
              <Card rank="5" suit="♣" small sizeScale={0.95} />
              <Card rank="6" suit="♣" small sizeScale={0.95} />
            </View>
            <Text style={styles.illuHint}>3+ same suit, consecutive</Text>
          </View>
        </View>
      </View>
    );
  }

  if (gameId === "solitaire") {
    return (
      <View style={styles.illuWrap}>
        <Text style={styles.illuLabel}>Solitaire foundation idea</Text>
        <Text style={styles.illuHint}>
          {solitaireVariantId === "klondike"
            ? "Klondike: alternate colors, build down."
            : solitaireVariantId === "spider"
              ? "Spider: build same-suit runs."
              : solitaireVariantId === "freecell"
                ? "FreeCell: use free cells to rearrange."
                : solitaireVariantId === "pyramid"
                  ? "Pyramid: remove pairs that add to 13."
                  : "TriPeaks: clear cards one rank away."}
        </Text>
        <View style={styles.illuRow}>
          <View style={styles.illuCol}>
            <Text style={styles.illuSubLabel}>Example descending run</Text>
            <View style={styles.illuCardRow}>
              <Card rank="9" suit="♥" small sizeScale={0.95} />
              <Card rank="8" suit="♣" small sizeScale={0.95} />
              <Card rank="7" suit="♦" small sizeScale={0.95} />
            </View>
          </View>
          <View style={styles.illuCol}>
            <Text style={styles.illuSubLabel}>Example foundation top</Text>
            <View style={styles.illuCardRow}>
              <Card rank="A" suit="♠" small sizeScale={0.95} />
              <Card rank="2" suit="♠" small sizeScale={0.95} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (gameId === "lastcard") {
    return (
      <View style={styles.illuWrap}>
        <Text style={styles.illuLabel}>Match the top card</Text>
        <Text style={styles.illuHint}>
          Last Card is like a color/number matching Uno-style game.
        </Text>
        <View style={styles.lastcardThumbWrap}>
          <Image
            source={GAME_THUMBS.lastcard}
            style={styles.lastcardThumb}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.illuHint}>
          Match by color OR number. If you can’t, draw until you can.
        </Text>
      </View>
    );
  }

  // wildround
  return (
    <View style={styles.illuWrap}>
      <Text style={styles.illuLabel}>Prompt + answers</Text>
      <View style={styles.wildPromptBox}>
        <Text style={styles.wildPromptLabel}>PROMPT</Text>
        <Text style={styles.wildPromptText}>Why am I crying right now?</Text>
      </View>
      <View style={styles.wildAnswersRow}>
        <View style={styles.wildAnswerCard}>
          <Text style={styles.wildAnswerText}>
            A surprise birthday cake on fire
          </Text>
        </View>
        <View style={styles.wildAnswerCard}>
          <Text style={styles.wildAnswerText}>
            The Wi‑Fi router is judging me
          </Text>
        </View>
      </View>
      <Text style={styles.illuHint}>
        Judge picks the funniest answer to score +1 point.
      </Text>
    </View>
  );
}

export default function HowToPlayScreen({ navigation, route }) {
  const routeGameId = route?.params?.gameId;
  const initialGameId =
    routeGameId && typeof routeGameId === "string" ? routeGameId : "blackjack";

  const [gameId, setGameId] = useState(initialGameId);

  const [pokerVariantId, setPokerVariantId] = useState("texasHoldem");
  const [rummyVariantId, setRummyVariantId] = useState("ginRummy");
  const [solitaireVariantId, setSolitaireVariantId] = useState("klondike");

  useEffect(() => {
    if (initialGameId && initialGameId !== gameId) setGameId(initialGameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGameId]);

  const selectedGame = useMemo(
    () => GAMES.find((g) => g.id === gameId) ?? GAMES[0],
    [gameId],
  );

  const accent = selectedGame.accent;

  const pokerVariant = useMemo(
    () =>
      POKER_VARIANT_OPTIONS.find((o) => o.value === pokerVariantId) ??
      POKER_VARIANT_OPTIONS[0],
    [pokerVariantId],
  );

  const rummyVariant = useMemo(
    () =>
      RUMMY_VARIANT_OPTIONS.find((o) => o.value === rummyVariantId) ??
      RUMMY_VARIANT_OPTIONS[0],
    [rummyVariantId],
  );

  const solitaireVariant = useMemo(
    () =>
      SOLITAIRE_VARIANT_OPTIONS.find((o) => o.id === solitaireVariantId) ??
      SOLITAIRE_VARIANT_OPTIONS[0],
    [solitaireVariantId],
  );

  const activeGoalAndSteps = useMemo(() => {
    if (gameId === "blackjack")
      return { goal: BLACKJACK.goal, steps: BLACKJACK.steps };

    if (gameId === "goFish")
      return { goal: GO_FISH.goal, steps: GO_FISH.steps };

    if (gameId === "conquian")
      return { goal: CONQUIAN.goal, steps: CONQUIAN.steps };

    if (gameId === "poker") {
      return {
        goal: "Win chips by having the best hand at showdown, or by making everyone fold.",
        steps: pokerVariantSteps(pokerVariantId),
      };
    }

    if (gameId === "rummy") {
      const cfg = RUMMY_VARIANTS[rummyVariantId] ?? RUMMY_VARIANTS.ginRummy;
      const variantNotes = [];
      if (cfg.includeJokers) variantNotes.push("Jokers are included.");
      if (cfg.requiresPureRun)
        variantNotes.push("Indian Rummy needs a pure run.");
      if (cfg.requiresTwoRuns)
        variantNotes.push("Indian Rummy needs two runs.");
      if (cfg.requireCanasta)
        variantNotes.push("Canasta requires canastas to go out.");

      return {
        goal: `Rummy variants: make valid melds and “go out” by knocking or winning ${cfg.scoreToWin ? `to ${cfg.scoreToWin}` : ""}.`,
        steps: [
          {
            title: "Draw",
            text: "On your turn, draw 1 card from the stock OR take 1 from the discard pile (top card).",
          },
          {
            title: "Meld (sets + runs)",
            text: "Lay down valid melds: sets (same rank) and runs (same suit, consecutive). Minimum meld size depends on the variant.",
          },
          {
            title: "Extend melds",
            text: "You can add cards to melds already on the table (when the rules allow it).",
          },
          {
            title: "Knock / Go out",
            text: "If your deadwood (unmelded cards) is low enough, you can knock (or finish with the variant’s win condition).",
          },
          {
            title: "Discard (end turn)",
            text: "Discard 1 card to end your turn and start the next player’s turn.",
          },
          {
            title: "Win",
            text: "Your variant-specific finish condition triggers the round end and awards points.",
          },
        ].map((s) => s),
        variantNotes,
      };
    }

    if (gameId === "solitaire") {
      const variantId = solitaireVariantId;
      const goalByVariant = {
        klondike: "Build foundations from Ace up to King using tableau moves.",
        spider:
          "Build same-suit runs from King down to Ace to clear the tableau.",
        freecell:
          "Use free cells to organize ordered stacks and complete foundations.",
        pyramid: "Remove pairs that add up to 13 (Kings remove alone).",
        tripeaks: "Clear cards one rank away from the waste card.",
      };

      const stepsByVariant = {
        klondike: [
          {
            title: "Stock → Waste",
            text: "Tap stock to draw. The waste top card is available to move.",
          },
          {
            title: "Tableau building",
            text: "Move cards to tableau by placing a card one rank lower and alternating colors.",
          },
          {
            title: "Foundations",
            text: "Move cards to the foundation piles in suit order from Ace to King.",
          },
          {
            title: "Sequences",
            text: "When you build a correct descending sequence, you can move it together (rules depend on exact UI selection).",
          },
          { title: "Win", text: "When all foundations are complete, you win." },
        ],
        spider: [
          {
            title: "Deal",
            text: "Deal to 10 columns. Face-down cards flip as the tableau changes.",
          },
          {
            title: "Build runs",
            text: "Move cards to build descending runs (same suit) from King toward Ace.",
          },
          {
            title: "Complete runs",
            text: "When a run is fully built (King-to-Ace), it can be cleared per the game rules.",
          },
          {
            title: "Stock",
            text: "Tap stock to deal another Spider row when available.",
          },
          { title: "Win", text: "Clear enough runs to win the game." },
        ],
        freecell: [
          {
            title: "Use free cells",
            text: "Free cells let you temporarily hold up to 4 cards.",
          },
          {
            title: "Move tableau stacks",
            text: "You can move cards/columns to rearrange, following descending + alternating color rules.",
          },
          { title: "Foundations", text: "Build up to King in suit order." },
          {
            title: "Empty slots are powerful",
            text: "More empty free cells / empty columns increase how big a stack you can move.",
          },
          { title: "Win", text: "Finish all foundations." },
        ],
        pyramid: [
          {
            title: "Pyramid + Waste",
            text: "The waste top card can pair with exposed pyramid cards.",
          },
          { title: "Remove pairs", text: "Remove pairs that add up to 13." },
          {
            title: "Kings alone",
            text: "A King (13) can be removed by itself.",
          },
          {
            title: "Expose new cards",
            text: "When cards are removed, new pyramid cards may become exposed.",
          },
          { title: "Win", text: "Clear the pyramid board." },
        ],
        tripeaks: [
          {
            title: "Waste is the target",
            text: "You can clear cards that are one rank away from the waste top.",
          },
          {
            title: "Clear cards",
            text: "Tap a card that’s ±1 away from the waste top rank.",
          },
          {
            title: "Expose new cards",
            text: "When you clear cards, cards underneath become exposed.",
          },
          {
            title: "Stock",
            text: "Tap stock to draw new waste cards when you get stuck.",
          },
          { title: "Win", text: "Clear the board." },
        ],
      };

      return {
        goal: goalByVariant[variantId] ?? goalByVariant.klondike,
        steps: stepsByVariant[variantId] ?? stepsByVariant.klondike,
      };
    }

    if (gameId === "lastcard")
      return { goal: LASTCARD.goal, steps: LASTCARD.steps };

    // wildround
    return { goal: WILDROUND.goal, steps: WILDROUND.steps };
  }, [gameId, pokerVariantId, rummyVariantId, solitaireVariantId]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>How to Play</Text>

        <View style={styles.heroBadgeRow}>
          <Text
            style={[styles.heroBadge, { borderColor: accent, color: accent }]}
          >
            {selectedGame.label}
          </Text>
          {gameId === "poker" ||
          gameId === "rummy" ||
          gameId === "solitaire" ? (
            <Text
              style={[
                styles.heroBadgeSecondary,
                { color: accent, borderColor: accent },
              ]}
            >
              Variant:{" "}
              {gameId === "poker"
                ? pokerVariant.label
                : gameId === "rummy"
                  ? rummyVariant.label
                  : solitaireVariant.label}
            </Text>
          ) : null}
        </View>

        <View style={styles.heroThumbWrap}>
          {selectedGame.thumb ? (
            <Image
              source={selectedGame.thumb}
              style={styles.heroThumb}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.heroThumbFallback}>
              <Text style={styles.heroThumbFallbackText}>
                {selectedGame.label}
              </Text>
              <Text style={styles.heroThumbFallbackHint}>
                Illustrated rules below
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.goalBox, { borderLeftColor: accent }]}>
          <Text style={[styles.goalLabel, { color: accent }]}>Goal</Text>
          <Text style={styles.goalText}>{activeGoalAndSteps.goal}</Text>

          {activeGoalAndSteps.variantNotes &&
          activeGoalAndSteps.variantNotes.length > 0 ? (
            <View style={styles.variantNotesBox}>
              {activeGoalAndSteps.variantNotes.map((n, i) => (
                <Text key={`${n}-${i}`} style={styles.variantNoteText}>
                  • {n}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      {/* Game selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
      >
        <View style={styles.chipRow}>
          {GAMES.map((g) => {
            const selected = gameId === g.id;
            return (
              <TouchableOpacity
                key={g.id}
                style={[
                  styles.chip,
                  selected
                    ? { backgroundColor: g.accent, borderColor: g.accent }
                    : null,
                ]}
                onPress={() => setGameId(g.id)}
                accessibilityRole="button"
                accessibilityLabel={`How to play ${g.label}`}
              >
                <View style={styles.chipTop}>
                  {g.thumb ? (
                    <Image
                      source={g.thumb}
                      style={styles.chipImg}
                      resizeMode="contain"
                    />
                  ) : (
                    <View
                      style={[
                        styles.chipImgFallback,
                        { borderColor: g.accent },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipImgFallbackText,
                          { color: g.accent },
                        ]}
                      >
                        ★
                      </Text>
                    </View>
                  )}
                  <Text
                    style={[
                      styles.chipText,
                      selected ? { color: "#fff" } : null,
                    ]}
                  >
                    {g.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Variant pickers */}
      {gameId === "poker" ? (
        <View style={styles.variantPickerWrap}>
          <Text style={styles.variantPickerTitle}>Poker variants</Text>
          <View style={styles.variantRow}>
            {POKER_VARIANT_OPTIONS.map((o) => {
              const selected = pokerVariantId === o.value;
              return (
                <Chip
                  key={o.value}
                  selected={selected}
                  onPress={() => setPokerVariantId(o.value)}
                  accent={accent}
                >
                  <Text
                    style={[
                      styles.variantChipText,
                      selected ? { color: "#fff" } : { color: "#c4c4d4" },
                    ]}
                  >
                    {o.label}
                  </Text>
                </Chip>
              );
            })}
          </View>
        </View>
      ) : null}

      {gameId === "rummy" ? (
        <View style={styles.variantPickerWrap}>
          <Text style={styles.variantPickerTitle}>Rummy variants</Text>
          <View style={styles.variantRow}>
            {RUMMY_VARIANT_OPTIONS.map((o) => {
              const selected = rummyVariantId === o.value;
              return (
                <Chip
                  key={o.value}
                  selected={selected}
                  onPress={() => setRummyVariantId(o.value)}
                  accent={accent}
                >
                  <Text
                    style={[
                      styles.variantChipText,
                      selected ? { color: "#fff" } : { color: "#c4c4d4" },
                    ]}
                  >
                    {o.label}
                  </Text>
                </Chip>
              );
            })}
          </View>
          <Text style={styles.variantHint}>
            Conquián is a separate game option in this app.
          </Text>
        </View>
      ) : null}

      {gameId === "solitaire" ? (
        <View style={styles.variantPickerWrap}>
          <Text style={styles.variantPickerTitle}>Solitaire modes</Text>
          <View style={styles.variantRow}>
            {SOLITAIRE_VARIANT_OPTIONS.map((o) => {
              const selected = solitaireVariantId === o.id;
              return (
                <Chip
                  key={o.id}
                  selected={selected}
                  onPress={() => setSolitaireVariantId(o.id)}
                  accent={accent}
                >
                  <Text
                    style={[
                      styles.variantChipText,
                      selected ? { color: "#fff" } : { color: "#c4c4d4" },
                    ]}
                  >
                    {o.label}
                  </Text>
                </Chip>
              );
            })}
          </View>
        </View>
      ) : null}

      <GameIllustration
        gameId={gameId}
        pokerVariantId={pokerVariantId}
        rummyVariantId={rummyVariantId}
        solitaireVariantId={solitaireVariantId}
      />

      {/* Poker hand rankings */}
      {gameId === "poker" ? (
        <View style={styles.rankList}>
          <Text style={styles.sectionHeader}>Hand Rankings (Best → Worst)</Text>
          {POKER_HAND_RANKINGS.map((hand, i) => (
            <View key={hand} style={styles.rankRow}>
              <Text style={[styles.rankIndex, { color: accent }]}>{i + 1}</Text>
              <Text style={styles.rankText}>{hand}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.sectionHeader}>How to Play</Text>
      {activeGoalAndSteps.steps.map((s, i) => (
        <StepRow
          key={`${s.title}-${i}`}
          index={i}
          title={s.title}
          text={s.text}
          accent={accent}
        />
      ))}

      <View style={styles.footerSpace} />
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

  hero: {
    marginBottom: scale(16),
  },
  heroTitle: {
    color: "#fff",
    fontSize: scaleFont(26),
    fontWeight: "bold",
    marginBottom: scale(8),
  },
  heroBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(10),
    alignItems: "center",
    marginBottom: scale(10),
  },
  heroBadge: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    fontWeight: "bold",
    backgroundColor: "rgba(255,255,255,0.04)",
    textAlign: "center",
    fontSize: scaleFont(14),
  },
  heroBadgeSecondary: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    fontWeight: "bold",
    backgroundColor: "rgba(255,255,255,0.03)",
    textAlign: "center",
    fontSize: scaleFont(13),
  },

  heroThumbWrap: {
    backgroundColor: "#16213e",
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: "#334",
    padding: scale(12),
    marginBottom: scale(12),
  },
  heroThumb: {
    width: "100%",
    height: scale(110),
  },
  heroThumbFallback: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: scale(12),
    gap: scale(6),
  },
  heroThumbFallbackText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: scaleFont(18),
    textAlign: "center",
  },
  heroThumbFallbackHint: {
    color: "#c4c4d4",
    fontSize: scaleFont(12),
    textAlign: "center",
  },

  goalBox: {
    backgroundColor: "#16213e",
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(20),
    borderLeftWidth: 5,
  },
  goalLabel: {
    fontSize: scaleFont(11),
    textTransform: "uppercase",
    letterSpacing: scale(1),
    marginBottom: scale(6),
    fontWeight: "bold",
  },
  goalText: {
    color: "#fff",
    fontSize: scaleFont(16),
    lineHeight: scale(24),
  },

  variantNotesBox: {
    marginTop: scale(10),
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: scale(10),
    padding: scale(12),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  variantNoteText: {
    color: "#e8e8f0",
    fontSize: scaleFont(13),
    lineHeight: scale(18),
    marginTop: scale(2),
  },

  chipScroll: { marginBottom: scale(16) },
  chipRow: { flexDirection: "row", gap: scale(10), paddingVertical: scale(4) },
  chip: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    borderRadius: scale(18),
    backgroundColor: "#16213e",
    borderWidth: 1.5,
    borderColor: "#334",
    minWidth: scale(150),
    maxWidth: scale(180),
  },
  chipTop: {
    flexDirection: "row",
    gap: scale(10),
    alignItems: "center",
    justifyContent: "center",
  },
  chipImg: { width: scale(32), height: scale(32) },
  chipImgFallback: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  chipImgFallbackText: { fontWeight: "bold" },
  chipText: { color: "#c4c4d4", fontSize: scaleFont(14), fontWeight: "bold" },

  sectionHeader: {
    color: "#c4c4d4",
    fontSize: scaleFont(12),
    textTransform: "uppercase",
    letterSpacing: scale(1),
    marginBottom: scale(14),
    marginTop: scale(6),
    fontWeight: "bold",
  },

  // Steps
  stepRow: {
    flexDirection: "row",
    marginBottom: scale(14),
    alignItems: "flex-start",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: scale(12),
    padding: scale(12),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  stepIndex: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    alignItems: "center",
    justifyContent: "center",
    marginTop: scale(1),
    marginRight: scale(12),
    flexShrink: 0,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
  },
  stepIndexText: { color: "#fff", fontSize: scaleFont(13), fontWeight: "bold" },
  stepBody: { flex: 1 },
  stepTitle: {
    fontSize: scaleFont(14),
    fontWeight: "bold",
    marginBottom: scale(6),
  },
  stepText: {
    color: "#e8e8f0",
    fontSize: scaleFont(15),
    lineHeight: scale(23),
  },

  // Illustrations
  illuWrap: {
    marginBottom: scale(16),
    backgroundColor: "#16213e",
    borderRadius: scale(12),
    padding: scale(14),
    borderWidth: 1.5,
    borderColor: "#334",
  },
  illuLabel: {
    color: "#fff",
    fontWeight: "bold",
    marginBottom: scale(10),
    fontSize: scaleFont(15),
  },
  illuRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(12),
    marginBottom: scale(8),
  },
  illuCol: { flex: 1, minWidth: 160 },
  illuSubLabel: {
    color: "#c4c4d4",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: scaleFont(11),
    fontWeight: "bold",
    marginBottom: scale(8),
  },
  illuCardRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  illuHint: {
    color: "#9090a8",
    marginTop: scale(8),
    fontSize: scaleFont(12),
    lineHeight: scale(16),
  },
  illuDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: scale(12),
  },

  lastcardThumbWrap: {
    marginTop: scale(6),
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: scale(10),
    padding: scale(10),
    alignItems: "center",
  },
  lastcardThumb: {
    width: "100%",
    height: scale(120),
  },

  wildPromptBox: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(12),
  },
  wildPromptLabel: {
    color: "#7fb3ff",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: scaleFont(11),
    marginBottom: scale(8),
  },
  wildPromptText: {
    color: "#fff",
    fontSize: scaleFont(16),
    lineHeight: scale(22),
    fontWeight: "700",
  },

  wildAnswersRow: { flexDirection: "row", gap: scale(10), flexWrap: "wrap" },
  wildAnswerCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: scale(12),
  },
  wildAnswerText: {
    color: "#e8e8f0",
    fontSize: scaleFont(13),
    lineHeight: scale(18),
    fontWeight: "700",
  },

  // Variant picker
  variantPickerWrap: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: scale(12),
    padding: scale(12),
    marginBottom: scale(16),
  },
  variantPickerTitle: {
    color: "#c4c4d4",
    fontSize: scaleFont(12),
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: scale(1),
    marginBottom: scale(10),
  },
  variantRow: { flexDirection: "row", flexWrap: "wrap", gap: scale(10) },
  variantChipText: { fontSize: scaleFont(13), fontWeight: "bold" },
  variantHint: {
    color: "#9090a8",
    marginTop: scale(10),
    fontSize: scaleFont(12),
    lineHeight: scale(16),
  },

  // Poker ranking
  rankList: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: scale(12),
    padding: scale(10),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: scale(12),
  },
  rankRow: {
    flexDirection: "row",
    gap: scale(12),
    marginBottom: scale(10),
    alignItems: "flex-start",
  },
  rankIndex: {
    fontWeight: "bold",
    fontSize: scaleFont(14),
    width: scale(20),
    textAlign: "right",
    paddingRight: scale(2),
  },
  rankText: {
    flex: 1,
    color: "#e8e8f0",
    fontSize: scaleFont(14),
    lineHeight: scale(20),
  },

  footerSpace: { height: scale(10) },
});
