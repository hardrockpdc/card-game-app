// Pure decision logic behind EndOfRoundModal, kept out of the component so it
// can be unit-tested. The Jest config is node-only with no JSX transform, so
// anything living inside the .js component file is untestable by construction.
//
// Three decisions live here:
//  1. what the Android Back button does,
//  2. whether the coin badge shows and what number it prints,
//  3. whether a button press is a real press or a double-tap.

// Ignore a second press on the same modal inside this window. Without it, a
// double-tap on "Play Again" deals two hands, and a double-tap on a leave
// handler runs its cleanup (clearGame, handleQuit) twice.
export const PRESS_DEBOUNCE_MS = 600;

// Android Back at a results screen. Every current call site shows a Leave
// action, so leaving is the least surprising thing Back can do: the round is
// already over and there is nothing behind the modal to go back to. A caller
// that wants different behaviour passes onRequestClose.
//
// Returns null when neither is a function; the component substitutes a no-op,
// because RN's Modal needs a function or Back silently does nothing on Android.
export function resolveCloseHandler(onRequestClose, onLeave) {
  if (typeof onRequestClose === "function") return onRequestClose;
  if (typeof onLeave === "function") return onLeave;
  return null;
}

// The badge is fed by nine call sites. Coerce rather than trusting all nine to
// pass a number forever, and never print NaN, Infinity, or a negative reward.
export function coinBadge(coins) {
  const amount = Number(coins);
  if (!Number.isFinite(amount) || amount <= 0) return { show: false, text: "" };
  return { show: true, amount, text: `+${amount.toLocaleString()} 🪙` };
}

// A time-based gate rather than a sticky boolean. It expires on its own, so a
// caller whose action leaves the modal open can never strand a button in a
// permanently disabled state — the failure mode a latch-style guard has.
export function createPressGate(now = Date.now) {
  let last = 0;
  return {
    allow() {
      const t = now();
      if (t - last < PRESS_DEBOUNCE_MS) return false;
      last = t;
      return true;
    },
    reset() {
      last = 0;
    },
  };
}
