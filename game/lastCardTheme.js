import AsyncStorage from "@react-native-async-storage/async-storage";

// Selectable table palettes for Last Card only. Mirrors the persisted-setting
// pattern in game/sounds.js / game/haptics.js: a value held in memory + mirrored
// to AsyncStorage, with subscribe() so the screen re-renders on change.
//
// Each palette colours the table "furniture" (rail / felt / panels / accent),
// NOT the cards — the UNO-style card art and the active-colour halo are fixed.
//
// Field guide:
//   rail        outer background (the table edge / frame)
//   felt        the raised central play surface
//   feltBorder  inner highlight edge on the felt
//   panel       seat + status backgrounds (sit on the felt)
//   panelBorder hairline around panels
//   status      status-message strip background
//   tray        the bottom hand-tray background (sits on the rail)
//   accent      highlight colour (active seat, count badges)
//   accentBg    tinted fill behind the active seat
//   text        primary text on the table
//   textDim     dim labels (DRAW, names, direction)

export const LAST_CARD_TABLES = [
  {
    id: "indigo",
    name: "Indigo Night",
    rail: "#110f1c",
    felt: "#241a3a",
    feltBorder: "#3d2f5c",
    panel: "#1c1530",
    panelBorder: "#2a2042",
    status: "#160f24",
    tray: "#16101f",
    accent: "#e94560",
    accentBg: "#2a0f20",
    onAccent: "#ffffff",
    text: "#f0eefb",
    textDim: "#9a9ab0",
  },
  {
    id: "green",
    name: "Green Felt",
    rail: "#0c1410",
    felt: "#1b3a2e",
    feltBorder: "#2f5c47",
    panel: "#14302a",
    panelBorder: "#21463a",
    status: "#0f1d18",
    tray: "#0e1813",
    accent: "#ffd166",
    accentBg: "#33301a",
    onAccent: "#1a1405",
    text: "#f0f5ef",
    textDim: "#9bb0a4",
  },
  {
    id: "teal",
    name: "Teal Modern",
    rail: "#08161e",
    felt: "#123040",
    feltBorder: "#1f586e",
    panel: "#0f2632",
    panelBorder: "#1a3a48",
    status: "#0b1c25",
    tray: "#0a1820",
    accent: "#5ad1e6",
    accentBg: "#103040",
    onAccent: "#062029",
    text: "#eef6f9",
    textDim: "#93a8b0",
  },
];

const KEY = "@cardnight:lastCardTable";
const DEFAULT_ID = "indigo";
let _id = DEFAULT_ID;
const listeners = new Set();

export function getLastCardTableId() {
  return _id;
}

export function getLastCardTable() {
  return LAST_CARD_TABLES.find((t) => t.id === _id) ?? LAST_CARD_TABLES[0];
}

export async function initLastCardTable() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw && LAST_CARD_TABLES.some((t) => t.id === raw)) _id = raw;
  } catch (_) {
    // keep default
  }
}

export async function setLastCardTable(id) {
  if (!LAST_CARD_TABLES.some((t) => t.id === id)) return;
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

export function subscribeLastCardTable(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
