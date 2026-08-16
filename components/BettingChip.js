import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { buildChipStyle } from "../game/chipStyle";

// A realistic casino-style betting chip for Blackjack's bet picker — same
// bevel/edge-spot/inlay anatomy as the profile-frame poker chips
// (game/chipStyle.js), just with a bet amount in the face instead of an
// avatar. `size` is the face (amount-label) diameter, matching how
// ProfileAvatar sizes its chip frames.
export default function BettingChip({
  amount,
  color,
  spotColor,
  size = 50,
  selected = false,
  disabled = false,
}) {
  const chip = buildChipStyle({ size, color, spotColor });

  return (
    <View
      style={[
        styles.wrap,
        selected && [styles.selected, { transform: [{ translateY: -size * 0.12 }, { scale: 1.06 }] }],
        disabled && styles.disabled,
      ]}
    >
      <LinearGradient
        colors={chip.bodyGradient}
        start={{ x: 0.15, y: 0.1 }}
        end={{ x: 0.9, y: 0.95 }}
        style={[
          styles.body,
          {
            width: chip.chipSize,
            height: chip.chipSize,
            borderRadius: chip.chipSize / 2,
            borderColor: chip.edgeColor,
          },
        ]}
      >
        {chip.spots.map((spot, i) => (
          <View
            key={i}
            style={[
              styles.spot,
              {
                left: spot.left,
                top: spot.top,
                width: spot.width,
                height: spot.height,
                backgroundColor: spotColor,
                transform: [{ rotate: spot.rotate }],
              },
            ]}
          />
        ))}
        <View
          style={[
            styles.inlay,
            {
              width: chip.inlaySize,
              height: chip.inlaySize,
              borderRadius: chip.inlaySize / 2,
              backgroundColor: chip.inlayColor,
            },
          ]}
        >
          <Text style={[styles.amount, { fontSize: Math.round(size * 0.3) }]}>
            {amount}
          </Text>
        </View>
        {/* Glossy highlight — a fixed diagonal streak reading as a
            reflection sitting on top of the chip, independent of its color. */}
        <LinearGradient
          colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0)"]}
          start={{ x: 0.1, y: 0.05 }}
          end={{ x: 0.55, y: 0.5 }}
          style={styles.gloss}
          pointerEvents="none"
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  selected: {
    shadowColor: "#ffd700",
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  disabled: {
    opacity: 0.3,
  },
  body: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  spot: {
    position: "absolute",
    borderRadius: 1,
  },
  inlay: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  amount: {
    color: "#ffffff",
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  gloss: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 9999,
  },
});
