// Jest config — scoped to the PURE game-logic modules in game/*.js.
//
// IMPORTANT: this is deliberately decoupled from the app's React Native build.
//  - `configFile: false` + `babelrc: false` tell babel-jest to IGNORE any root
//    babel.config.js. So when Task 2 later adds a root babel config (with the
//    reanimated plugin), it won't affect these tests, and these tests won't
//    affect the app build. The two babel setups never touch each other.
//  - We only transform import/export -> CommonJS via @babel/preset-env so Node
//    can run the modules. No React Native, no JSX — these tests cover pure logic.
//
// Run with: npm test
module.exports = {
  testEnvironment: "node",
  // Defines RN/Metro globals (e.g. __DEV__) that game/logger.js reads at load.
  setupFiles: ["<rootDir>/jest.setup.js"],
  // Only look for tests we wrote; never descend into node_modules or native dirs.
  // Deliberately relative, with no <rootDir> prefix: when the project lives on a
  // UNC path or a mapped network drive, Jest mangles the interpolated <rootDir>
  // into a malformed glob, matches zero files, and `npm test` silently passes
  // nothing at all. Relative patterns are resolved against rootDir anyway.
  testMatch: ["**/__tests__/**/*.test.js"],
  // Static image assets (png/jpg/…) can't be parsed by Jest — map them to a stub
  // so modules that require card art (game/cardTheme.js) are importable in tests.
  moduleNameMapper: {
    "\\.(png|jpe?g|gif|webp|svg)$": "<rootDir>/__mocks__/fileMock.js",
  },
  transform: {
    "^.+\\.js$": [
      "babel-jest",
      {
        configFile: false,
        babelrc: false,
        presets: [["@babel/preset-env", { targets: { node: "current" } }]],
      },
    ],
  },
};
