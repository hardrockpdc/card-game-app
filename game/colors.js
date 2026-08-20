// Semantic colour tokens for app chrome.
//
// Table felts already had this (tablePalette.js + the per-game wrappers); the
// rest of the UI did not, and the same literals were retyped by hand across
// forty-odd files — roughly 935 hex values, with #ffffff, #c4c4d4, #e94560,
// #16213e and #7fb3ff accounting for most of them. Changing the accent meant a
// project-wide find-and-replace, and drift stayed invisible until two slightly
// different navies ended up side by side.
//
// This does NOT change any rendered colour. Every value below is one already
// shipping; the point is to give each a name and, where one literal was doing
// several unrelated jobs, to give each job its own token.
//
// ─── On the red ──────────────────────────────────────────────────────────────
// #e94560 was doing four different jobs: the Home screen's primary CTA, error
// text, a neutral count badge, and the positive "your turn" banner. A colour
// that means four things means nothing.
//
// Home's casino red is a DELIBERATE choice for the hub (confirmed 2026-08-03) —
// it should feel like game night, not a settings screen. So the red stays; what
// changes is that the other three roles stop borrowing it. `brandRed` and
// `error` share a value today and are still separate tokens, because they are
// separate ideas and only one of them is free to change.

// ─── Surfaces ────────────────────────────────────────────────────────────────
export const surface = "#1a1a2e"; // app background
export const surfaceRaised = "#16213e"; // cards, modals, panels
export const surfaceSunken = "#2a2a4a"; // wells, inactive chips
export const border = "#334"; // hairlines, outlined buttons

// ─── Text ────────────────────────────────────────────────────────────────────
export const textPrimary = "#ffffff";
export const textSecondary = "#c4c4d4";
export const textMuted = "#9090a8";
// Floor for text on `surface`. #444 was in use for hint text at roughly 1.4:1,
// which is invisible; nothing dimmer than this should carry meaning.
export const textFaint = "#9aa4c4";

// ─── Brand & accents ─────────────────────────────────────────────────────────
export const accent = "#7fb3ff"; // the blue used for links, focus, highlights
export const brandRed = "#e94560"; // Home hub CTA — deliberate casino energy
export const gold = "#ffd700"; // coins, rewards, prices
export const positive = "#4caf50"; // success, "your turn", affirmative states
export const primaryAction = "#2e9e54"; // the green primary button

// ─── Status ──────────────────────────────────────────────────────────────────
export const error = "#e94560"; // error text and invalid-input borders
export const warning = "#ffd479";

// ─── Interactive purples ─────────────────────────────────────────────────────
// Four unrelated purples were in use — #7c6cff (avatar ring), #6a5acd (profile
// button), #7878ff and #5555cc (TutorialOverlay dots and Next). None were in
// the stated palette and none matched each other. One family now.
export const highlight = "#7c6cff";
export const highlightDim = "#5b4fc7";
