// Minimal manual mock for react-native.
//
// The real package is Flow-typed source that Jest can't parse (node_modules is
// not transformed, by design — see jest.config.js). This project's tests target
// pure logic, so only the handful of APIs that pure modules legitimately touch
// need to exist here. Anything else should stay out of game/*.js.
//
// Deliberately NOT a full RN shim: if a test needs real component rendering,
// that needs a proper RN preset, not more stubs bolted on here.

export const AccessibilityInfo = {
  isReduceMotionEnabled: async () => false,
  addEventListener: () => ({ remove: () => {} }),
};

export const Platform = {
  OS: "android",
  select: (obj) => obj.android ?? obj.default,
};

export const Dimensions = {
  get: () => ({ width: 390, height: 844 }),
  addEventListener: () => ({ remove: () => {} }),
};

export const Alert = { alert: () => {} };

export const AppState = {
  currentState: "active",
  addEventListener: () => ({ remove: () => {} }),
};
