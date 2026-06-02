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
  // Only look for tests we wrote; never descend into node_modules or native dirs.
  testMatch: ["<rootDir>/__tests__/**/*.test.js"],
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
