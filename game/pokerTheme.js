import { createTablePalette } from "./tablePalette";

// Poker table palette (classic green felt by default). See tablePalette.js.
const palette = createTablePalette("@cardnight:pokerTable", "green");

export const POKER_TABLES = palette.TABLES;
export const getPokerTableId = () => palette.getId();
export const getPokerTable = () => palette.get();
export const initPokerTable = () => palette.init();
export const setPokerTable = (id) => palette.set(id);
export const subscribePokerTable = (fn) => palette.subscribe(fn);
