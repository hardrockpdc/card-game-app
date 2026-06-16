import React from "react";
import { Pressable, TouchableOpacity } from "react-native";

import { hapticButton } from "../game/haptics";

// Drop-in replacements for RN's Pressable / TouchableOpacity that play a light
// "tick" on press before running the caller's onPress. Use these for UI buttons
// so every tap feels responsive without wiring hapticButton() into each handler.
//
// Notes:
//  - When `disabled`, RN never calls onPress, so no buzz fires (correct).
//  - If no onPress is given, nothing is wrapped (e.g. a tap-swallowing panel
//    stays silent).
//  - All other props (style, accessibilityRole, children, ref…) pass straight
//    through, so these are true drop-ins.

export const HapticPressable = React.forwardRef(function HapticPressable(
  { onPress, ...rest },
  ref,
) {
  const handlePress = onPress
    ? (e) => {
        hapticButton();
        onPress(e);
      }
    : onPress;
  return <Pressable ref={ref} onPress={handlePress} {...rest} />;
});

export const HapticTouchable = React.forwardRef(function HapticTouchable(
  { onPress, ...rest },
  ref,
) {
  const handlePress = onPress
    ? (e) => {
        hapticButton();
        onPress(e);
      }
    : onPress;
  return <TouchableOpacity ref={ref} onPress={handlePress} {...rest} />;
});
