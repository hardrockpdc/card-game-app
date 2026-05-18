// game/testBot.js
// ─────────────────────────────────────────────────────────────────────────────
// Test Bot — dev-only auto-play toggle.
//
// When ON, single-player game screens use their existing AI logic to play
// the human's hand too, then auto-restart on game over. The whole thing
// loops until the user toggles it off.
//
// The toggle is HIDDEN in production builds via `__DEV__` (a built-in
// React Native flag that's `true` while developing and `false` in any
// real build).
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState } from "react";

// The Context — a "box" that holds the bot state.
// Any component wrapped by TestBotProvider can read it via useTestBot().
const TestBotContext = createContext({
  enabled: false,
  setEnabled: () => {},
});

// Wraps the app and provides the bot state to everything inside.
// Put this once, near the top of App.js.
export function TestBotProvider({ children }) {
  const [enabled, setEnabled] = useState(false);

  return (
    <TestBotContext.Provider value={{ enabled, setEnabled }}>
      {children}
    </TestBotContext.Provider>
  );
}

// Hook (a function starting with "use") that any screen can call to
// read the current bot state and flip it on/off.
//
// Usage in a screen:
//   const { enabled, setEnabled } = useTestBot();
export function useTestBot() {
  return useContext(TestBotContext);
}

// Convenience flag — only true in development builds. Use this anywhere
// you want to hide bot-related UI from real users.
export const IS_DEV = __DEV__;

// Default delay between bot moves (ms). Matches the current AI feel.
export const TEST_BOT_DELAY_MS = 700;
