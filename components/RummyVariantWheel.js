import React from "react";

import { RUMMY_VARIANT_OPTIONS } from "../game/rummy";
import VariantPicker from "./VariantPicker";

function RummyVariantWheel({
  value,
  onChange,
  options = RUMMY_VARIANT_OPTIONS,
  style,
}) {
  return (
    <VariantPicker
      value={value}
      onChange={onChange}
      options={options}
      style={style}
      accentColor="#E94560"
    />
  );
}

export default RummyVariantWheel;
