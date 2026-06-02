// Manual Jest mock for AsyncStorage — an in-memory key/value store.
// Jest applies this automatically for the node_modules package, so any module
// that imports "@react-native-async-storage/async-storage" (wallet, gameSaves)
// gets this during tests. Call AsyncStorage.clear() in beforeEach to reset.
let store = {};

const AsyncStorage = {
  getItem: jest.fn(async (key) => (key in store ? store[key] : null)),
  setItem: jest.fn(async (key, value) => {
    store[key] = String(value);
  }),
  removeItem: jest.fn(async (key) => {
    delete store[key];
  }),
  clear: jest.fn(async () => {
    store = {};
  }),
};

export default AsyncStorage;
