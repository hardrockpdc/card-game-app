import AsyncStorage from "@react-native-async-storage/async-storage";
import { LAST_CARD_TABLES } from "./lastCardTheme";

// Selectable table palettes for Rummy. Reuses the same cohesive felt palettes
// as Last Card (see lastCardTheme.js for the field guide), but stores its own
// selection so each game remembers its own table independently.
//
// Mirrors the persisted-setting pattern in game/sounds.js / lastCardTheme.js:
// a value held in memory + mirrored to AsyncStorage, with subscribe() so the
// screen re-renders on change.
export const RUMMY_TABLES = LAST_CARD_TABLES;

const KEY = "@cardnight:rummyTable";
const DEFAULT_ID = "green"; // classic card-table green reads best for a standard deck
let _id = DEFAULT_ID;
const listeners = new Set();

export function getRummyTableId() {
  return _id;
}

export function getRummyTable() {
  return RUMMY_TABLES.find((t) => t.id === _id) ?? RUMMY_TABLES[0];
}

export async function initRummyTable() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw && RUMMY_TABLES.some((t) => t.id === raw)) _id = raw;
  } catch (_) {
    // keep default
  }
}

export async function setRummyTable(id) {
  if (!RUMMY_TABLES.some((t) => t.id === id)) return;
  _id = id;
  listeners.forEach((fn) => {
    try {
      fn(_id);
    } catch (_) {}
  });
  try {
    await AsyncStorage.setItem(KEY, id);
  } catch (_) {}
}

export function subscribeRummyTable(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
