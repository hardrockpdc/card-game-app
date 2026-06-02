// Globals that React Native / Metro inject at runtime but Node does not.
// game/logger.js reads __DEV__ at module load, so any test importing a module
// that imports the logger (e.g. game/wildround.js) needs this defined first.
global.__DEV__ = false;
