// M6 — every Card mounted its own accessibility listener.
//
// DealWrapper and FlipCard each called AccessibilityInfo.isReduceMotionEnabled()
// and each registered a 'reduceMotionChanged' subscription. A card rendered with
// both animateDeal and animateReveal paid for two of each. Solitaire renders up
// to 52 cards, so a single deal cost ~50-100 async native bridge calls and that
// many live listeners, torn down and rebuilt on every re-layout.
//
// The fix is one shared store for the whole app: a single native query, a single
// subscription, and every card reads the cached value. This tests the store's
// subscribe/notify contract — the React binding itself needs a renderer, which
// this Jest config (node, no JSX) deliberately doesn't have.
import {
  __setAccessibilityBackend,
  __resetForTests,
  initReduceMotion,
  getReduceMotion,
  subscribeReduceMotion,
} from "../game/reduceMotion";

function fakeA11y(initial = false) {
  const handlers = [];
  return {
    isReduceMotionEnabled: jest.fn(async () => initial),
    addEventListener: jest.fn((_event, cb) => {
      handlers.push(cb);
      return { remove: jest.fn() };
    }),
    __fire(value) {
      handlers.forEach((h) => h(value));
    },
    __handlerCount: () => handlers.length,
  };
}

beforeEach(() => {
  __resetForTests();
});

describe("M6 — the native accessibility API is queried once, not per card", () => {
  test("many subscribers cause exactly one native query and one listener", async () => {
    const a11y = fakeA11y(false);
    __setAccessibilityBackend(a11y);

    initReduceMotion();
    // 52 cards' worth of subscribers.
    const unsubs = [];
    for (let i = 0; i < 52; i++) unsubs.push(subscribeReduceMotion(() => {}));
    await Promise.resolve();

    expect(a11y.isReduceMotionEnabled).toHaveBeenCalledTimes(1);
    expect(a11y.addEventListener).toHaveBeenCalledTimes(1);
    expect(a11y.__handlerCount()).toBe(1);

    unsubs.forEach((u) => u());
  });

  test("repeat init calls do not add more native listeners", () => {
    const a11y = fakeA11y(false);
    __setAccessibilityBackend(a11y);

    initReduceMotion();
    initReduceMotion();
    initReduceMotion();

    expect(a11y.addEventListener).toHaveBeenCalledTimes(1);
  });
});

describe("value propagation", () => {
  test("the resolved native value becomes the cached value", async () => {
    const a11y = fakeA11y(true);
    __setAccessibilityBackend(a11y);

    initReduceMotion();
    await Promise.resolve();
    await Promise.resolve();

    expect(getReduceMotion()).toBe(true);
  });

  test("a system change notifies every subscriber", async () => {
    const a11y = fakeA11y(false);
    __setAccessibilityBackend(a11y);
    initReduceMotion();

    const a = jest.fn();
    const b = jest.fn();
    subscribeReduceMotion(a);
    subscribeReduceMotion(b);

    a11y.__fire(true);

    expect(a).toHaveBeenCalledWith(true);
    expect(b).toHaveBeenCalledWith(true);
    expect(getReduceMotion()).toBe(true);
  });

  test("unsubscribing stops delivery", () => {
    const a11y = fakeA11y(false);
    __setAccessibilityBackend(a11y);
    initReduceMotion();

    const cb = jest.fn();
    const unsub = subscribeReduceMotion(cb);
    unsub();

    a11y.__fire(true);

    expect(cb).not.toHaveBeenCalled();
  });

  test("a throwing subscriber cannot stop the others", () => {
    const a11y = fakeA11y(false);
    __setAccessibilityBackend(a11y);
    initReduceMotion();

    const good = jest.fn();
    subscribeReduceMotion(() => {
      throw new Error("render blew up");
    });
    subscribeReduceMotion(good);

    expect(() => a11y.__fire(true)).not.toThrow();
    expect(good).toHaveBeenCalledWith(true);
  });

  test("a missing accessibility API degrades to motion-enabled", async () => {
    __setAccessibilityBackend(null);
    initReduceMotion();
    await Promise.resolve();
    expect(getReduceMotion()).toBe(false);
  });
});
