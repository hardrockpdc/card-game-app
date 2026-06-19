// Poker variant options, imported by the Poker picker, Lobby, and How-To-Play.
//
// This file formerly also exported a "variant wheel" UI component (a thin
// wrapper over components/VariantPicker), but the pickers moved to
// GameSetupLayout / VariantOptionGrid and the wheel went unused. The dead wheel
// (plus VariantPicker and the Rummy/Solitaire wheels) was removed 2026-06-19;
// the filename is kept so the three importers don't need to change.
export const POKER_VARIANT_OPTIONS = [
  { value: "texasHoldem", label: "Texas Hold'em" },
  { value: "omaha", label: "Omaha" },
  { value: "fiveCardDraw", label: "Five Card Draw" },
  { value: "sevenCardStud", label: "Seven Card Stud" },
];
