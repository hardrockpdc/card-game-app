import React from "react";

import VariantPicker from "./VariantPicker";
import { VARIANT_OPTIONS } from "../game/solitaire";

export default function SolitaireVariantWheel({
  value = VARIANT_OPTIONS[0]?.id,
  onChange,
  options = VARIANT_OPTIONS,
  style,
}) {
  return (
    <VariantPicker
      value={value}
      onChange={onChange}
      options={options}
      style={style}
      accentColor="#77AEF7"
    />
  );
}
