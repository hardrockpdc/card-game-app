// EndOfRoundModal hardening — the shared results modal every game ends in.
//
// Three defects the 2026-08-02 design audit found, each covered here:
//
//  1. <Modal> had no onRequestClose, so Android's Back button did nothing at
//     every game's win screen. Material requires System Back to always work.
//  2. The coin badge called coins.toLocaleString() on whatever nine call sites
//     passed, and rendered a negative or NaN badge without complaint.
//  3. Nothing debounced the buttons. A double-tap on "Play Again" fired
//     onContinue twice (Solitaire: restart() twice), and a double-tap on leave
//     ran clearGame/handleQuit twice.
//
// The component itself needs a renderer this Jest config deliberately doesn't
// have (node env, no JSX transform), so the decisions live in a pure module.
import {
  PRESS_DEBOUNCE_MS,
  coinBadge,
  createPressGate,
  resolveCloseHandler,
} from "../components/endOfRoundLogic";

describe("resolveCloseHandler — Android Back at the results screen", () => {
  test("falls back to onLeave, so Back leaves the finished game", () => {
    const onLeave = jest.fn();
    const handler = resolveCloseHandler(undefined, onLeave);
    expect(handler).toBe(onLeave);
  });

  test("an explicit onRequestClose wins over onLeave", () => {
    const onLeave = jest.fn();
    const onRequestClose = jest.fn();
    expect(resolveCloseHandler(onRequestClose, onLeave)).toBe(onRequestClose);
  });

  test("returns null when neither is callable, so the caller can no-op", () => {
    expect(resolveCloseHandler(undefined, undefined)).toBeNull();
    expect(resolveCloseHandler(null, "not a function")).toBeNull();
  });
});

describe("coinBadge", () => {
  test("shows a thousands-separated badge for a real reward", () => {
    const badge = coinBadge(1250);
    expect(badge.show).toBe(true);
    expect(badge.amount).toBe(1250);
    expect(badge.text).toBe(`+${(1250).toLocaleString()} 🪙`);
  });

  test("accepts a numeric string without crashing or printing junk", () => {
    expect(coinBadge("75")).toMatchObject({ show: true, amount: 75 });
  });

  test("hides for zero, absent, negative, and non-numeric coins", () => {
    for (const value of [0, undefined, null, -50, NaN, Infinity, "abc", {}]) {
      expect(coinBadge(value).show).toBe(false);
    }
  });
});

describe("createPressGate — double-tap protection", () => {
  test("lets the first press through and swallows an immediate second", () => {
    let now = 1000;
    const gate = createPressGate(() => now);

    expect(gate.allow()).toBe(true);
    now += 50;
    expect(gate.allow()).toBe(false);
  });

  test("reopens once the window expires, so a button never sticks", () => {
    let now = 1000;
    const gate = createPressGate(() => now);

    expect(gate.allow()).toBe(true);
    now += PRESS_DEBOUNCE_MS;
    expect(gate.allow()).toBe(true);
  });

  test("reset reopens the gate for a fresh showing of the modal", () => {
    let now = 1000;
    const gate = createPressGate(() => now);

    expect(gate.allow()).toBe(true);
    expect(gate.allow()).toBe(false);
    gate.reset();
    expect(gate.allow()).toBe(true);
  });

  test("a rapid burst of taps runs the action exactly once", () => {
    let now = 1000;
    const gate = createPressGate(() => now);
    const restart = jest.fn();

    for (let i = 0; i < 10; i += 1) {
      now += 20;
      if (gate.allow()) restart();
    }

    expect(restart).toHaveBeenCalledTimes(1);
  });
});
