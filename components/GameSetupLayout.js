import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HapticPressable as Pressable } from "./Haptic";
import { scale, scaleFont } from "../game/responsive";

const ACCENT = "#77AEF7";

// Shared chrome for every game's setup screen so they all look identical:
// centered title (+ subtitle in portrait), one bordered panel holding the
// controls, and a full-width "Start Game" button. In landscape, when a screen
// has BOTH a variant grid and controls, they sit side by side.
//
// Screens compose the panel from the exported primitives below
// (OpponentStepper, DifficultyPills, SetupSection, SetupNote) plus any
// game-specific extras, passed via `variantSlot` and/or `controls`.
export default function GameSetupLayout({
  title,
  subtitle,
  variantSlot = null,
  controls = null,
  onStart,
  startLabel = "Start Game",
  startDisabled = false,
}) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const twoPane = isLandscape && !!variantSlot && !!controls;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.content, isLandscape && styles.contentLandscape]}>
        <Text
          style={[styles.title, isLandscape && styles.titleLandscape]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && !isLandscape ? (
          <Text style={styles.subtitle}>{subtitle}</Text>
        ) : null}

        <View style={[styles.panel, isLandscape && styles.panelLandscape]}>
          {twoPane ? (
            <View style={styles.paneRow}>
              <View style={styles.pane}>{variantSlot}</View>
              <View style={styles.pane}>{controls}</View>
            </View>
          ) : (
            <View style={styles.paneStack}>
              {variantSlot}
              {controls}
            </View>
          )}

          <Pressable
            onPress={onStart}
            disabled={startDisabled}
            style={({ pressed }) => [
              styles.playButton,
              startDisabled && styles.playButtonDisabled,
              pressed && !startDisabled && styles.playButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={startLabel}
          >
            <Text style={styles.playButtonText}>{startLabel}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

// A labelled block (uppercase label + content).
export function SetupSection({ label, children }) {
  return (
    <View style={styles.sectionBlock}>
      {label ? <Text style={styles.sectionLabel}>{label}</Text> : null}
      {children}
    </View>
  );
}

// −/+ stepper for the opponent count (used by every game with opponents).
export function OpponentStepper({
  value,
  min = 1,
  max = 3,
  onChange,
  label = "Opponents",
}) {
  return (
    <SetupSection label={label}>
      <View style={styles.stepperRow}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          style={({ pressed }) => [
            styles.stepperButton,
            value <= min && styles.stepperDisabled,
            pressed && value > min && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Fewer opponents"
        >
          <Text style={styles.stepperButtonText}>−</Text>
        </Pressable>
        <View style={styles.stepperValueWrap}>
          <Text style={styles.stepperValue}>{value}</Text>
        </View>
        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          style={({ pressed }) => [
            styles.stepperButton,
            value >= max && styles.stepperDisabled,
            pressed && value < max && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="More opponents"
        >
          <Text style={styles.stepperButtonText}>+</Text>
        </Pressable>
      </View>
    </SetupSection>
  );
}

// A row of equal-width selectable pills. `options`: [{ value|id, label, disabled }].
export function PillRow({ value, onChange, options }) {
  return (
    <View style={styles.pillRow}>
      {options.map((option) => {
        const v = option.value ?? option.id;
        const label = option.label ?? String(v);
        const selected = v === value;
        const disabled = !!option.disabled;
        return (
          <Pressable
            key={String(v)}
            onPress={() => {
              if (!disabled) onChange(v);
            }}
            disabled={disabled}
            style={({ pressed }) => [
              styles.pill,
              selected && styles.pillSelected,
              disabled && styles.pillDisabled,
              pressed && !disabled && styles.pillPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected, disabled }}
          >
            <Text
              style={[
                styles.pillText,
                selected && styles.pillTextSelected,
                disabled && styles.pillTextDisabled,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const DIFFICULTIES = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

// Easy / Medium / Hard pill row.
export function DifficultyPills({ value, onChange, label = "Difficulty" }) {
  return (
    <SetupSection label={label}>
      <PillRow value={value} onChange={onChange} options={DIFFICULTIES} />
    </SetupSection>
  );
}

// Small centered note under a control (e.g. Conquián's player/card summary).
export function SetupNote({ children }) {
  return <Text style={styles.constraintNote}>{children}</Text>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f1115",
  },
  content: {
    flex: 1,
    padding: scale(14),
    gap: scale(10),
  },
  contentLandscape: {
    padding: scale(10),
    gap: scale(6),
  },
  title: {
    color: "#f5f7fb",
    fontSize: scaleFont(34),
    fontWeight: "900",
    textAlign: "center",
  },
  titleLandscape: {
    fontSize: scaleFont(22),
  },
  subtitle: {
    color: "#a8b5c8",
    fontSize: scaleFont(15),
    lineHeight: scale(21),
    textAlign: "center",
  },
  panel: {
    flex: 1,
    borderRadius: scale(22),
    borderWidth: 1,
    borderColor: "#243042",
    backgroundColor: "#151a24",
    padding: scale(14),
    gap: scale(12),
  },
  panelLandscape: {
    padding: scale(10),
    gap: scale(8),
  },
  paneStack: {
    flex: 1,
    gap: scale(16),
    justifyContent: "flex-start",
  },
  paneRow: {
    flex: 1,
    flexDirection: "row",
    gap: scale(12),
  },
  pane: {
    flex: 1,
    gap: scale(12),
    justifyContent: "center",
  },
  sectionBlock: {
    gap: scale(8),
  },
  sectionLabel: {
    color: "#a8b5c8",
    fontSize: scaleFont(11),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  pillRow: {
    flexDirection: "row",
    gap: scale(8),
  },
  pill: {
    flex: 1,
    minHeight: scale(48),
    borderRadius: scale(999),
    borderWidth: 1.5,
    borderColor: "#2c3750",
    backgroundColor: "#182131",
    alignItems: "center",
    justifyContent: "center",
  },
  pillSelected: {
    borderColor: ACCENT,
    backgroundColor: "#21314a",
  },
  pillPressed: {
    opacity: 0.88,
  },
  pillDisabled: {
    opacity: 0.4,
  },
  pillText: {
    color: "#d3dcec",
    fontSize: scaleFont(14),
    fontWeight: "800",
  },
  pillTextSelected: {
    color: "#eef4ff",
  },
  pillTextDisabled: {
    color: "#6a7d96",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(20),
  },
  stepperButton: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    borderWidth: 1.5,
    borderColor: "#2c3750",
    backgroundColor: "#182131",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperDisabled: {
    opacity: 0.45,
  },
  stepperButtonText: {
    color: "#eef4ff",
    fontSize: scaleFont(28),
    fontWeight: "900",
    marginTop: scale(-2),
  },
  stepperValueWrap: {
    minWidth: scale(52),
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    color: "#f4f7fb",
    fontSize: scaleFont(30),
    fontWeight: "900",
  },
  constraintNote: {
    color: "#6a7d96",
    fontSize: scaleFont(12),
    marginTop: scale(2),
    textAlign: "center",
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  playButton: {
    borderRadius: scale(16),
    backgroundColor: ACCENT,
    alignItems: "center",
    paddingVertical: scale(14),
    marginTop: scale(4),
  },
  playButtonDisabled: {
    opacity: 0.45,
  },
  playButtonPressed: {
    opacity: 0.92,
  },
  playButtonText: {
    color: "#08111f",
    fontSize: scaleFont(16),
    fontWeight: "900",
  },
});
