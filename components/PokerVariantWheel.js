// Poker variant options, imported by the Poker picker, Lobby, and How-To-Play.
//
// This file formerly also exported a "variant wheel" UI component (a thin
// wrapper over components/VariantPicker), but the pickers moved to
// GameSetupLayout / VariantOptionGrid and the wheel went unused. The dead wheel
// (plus VariantPicker and the Rummy/Solitaire wheels) was removed 2026-06-19;
// the filename is kept so the three importers don't need to change.
export const POKER_VARIANT_OPTIONS = [
  {
    value: "texasHoldem",
    label: "Texas Hold'em",
    description: "Two cards each, five shared — the classic.",
  },
  {
    value: "omaha",
    label: "Omaha",
    description: "Four in hand, but you must use exactly two.",
  },
  {
    value: "fiveCardDraw",
    label: "Five Card Draw",
    description: "Five of your own, swap the ones you don't want.",
  },
  {
    value: "sevenCardStud",
    label: "Seven Card Stud",
    description: "Seven cards each, no shared board.",
  },
];
