import AsyncStorage from "@react-native-async-storage/async-storage";
import { LAST_CARD_TABLES } from "./lastCardTheme";

// Factory for a per-game, switchable table palette. Mirrors the persisted-setting
// pattern in game/sounds.js / lastCardTheme.js: a value held in memory + mirrored
// to AsyncStorage, with subscribe() so the screen re-renders on change.
//
// Every game reuses the same cohesive felt palettes (LAST_CARD_TABLES — see
// lastCardTheme.js for the field guide) but stores its OWN selection under its
// own key, so each game remembers its own table independently.
export function createTablePalette(storageKey, defaultId = "green") {
  const TABLES = LAST_CARD_TABLES;
  let _id = TABLES.some((t) => t.id === defaultId) ? defaultId : TABLES[0].id;
  const listeners = new Set();

  return {
    TABLES,
    getId() {
      return _id;
    },
    get() {
      return TABLES.find((t) => t.id === _id) ?? TABLES[0];
    },
    async init() {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw && TABLES.some((t) => t.id === raw)) _id = raw;
      } catch (_) {
        // keep default
      }
    },
    async set(id) {
      if (!TABLES.some((t) => t.id === id)) return;
      _id = id;
      listeners.forEach((fn) => {
        try {
          fn(_id);
        } catch (_) {}
      });
      try {
        await AsyncStorage.setItem(storageKey, id);
      } catch (_) {}
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
