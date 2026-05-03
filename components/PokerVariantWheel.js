import React from "react";

import VariantPicker from "./VariantPicker";

export const POKER_VARIANT_OPTIONS = [
  { value: "texasHoldem", label: "Texas Hold'em" },
  { value: "omaha", label: "Omaha" },
  { value: "fiveCardDraw", label: "Five Card Draw" },
  { value: "sevenCardStud", label: "Seven Card Stud" },
];

function PokerVariantWheel({
  value,
  onChange,
  options = POKER_VARIANT_OPTIONS,
  style,
}) {
  return (
    <VariantPicker
      value={value}
      onChange={onChange}
      options={options}
      style={style}
      accentColor="#C1121F"
    />
  );
}

export default PokerVariantWheel;
