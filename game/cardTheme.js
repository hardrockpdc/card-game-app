// Manages the active card theme and provides image lookups.
// React Native requires static require() paths, so every image for every
// theme must be listed explicitly here.

// ─── Rank / suit key maps ─────────────────────────────────────────────────────

const RANK_KEY = { A: 'a', J: 'j', Q: 'q', K: 'k' };
const SUIT_KEY = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };

// ─── Image maps per theme ─────────────────────────────────────────────────────

const NEON = {
  'a_spades':    require('../assets/cards/a_spades.png'),
  'a_hearts':    require('../assets/cards/a_hearts.png'),
  'a_diamonds':  require('../assets/cards/a_diamonds.png'),
  'a_clubs':     require('../assets/cards/a_clubs.png'),
  '2_spades':    require('../assets/cards/2_spades.png'),
  '2_hearts':    require('../assets/cards/2_hearts.png'),
  '2_diamonds':  require('../assets/cards/2_diamonds.png'),
  '2_clubs':     require('../assets/cards/2_clubs.png'),
  '3_spades':    require('../assets/cards/3_spades.png'),
  '3_hearts':    require('../assets/cards/3_hearts.png'),
  '3_diamonds':  require('../assets/cards/3_diamonds.png'),
  '3_clubs':     require('../assets/cards/3_clubs.png'),
  '4_spades':    require('../assets/cards/4_spades.png'),
  '4_hearts':    require('../assets/cards/4_hearts.png'),
  '4_diamonds':  require('../assets/cards/4_diamonds.png'),
  '4_clubs':     require('../assets/cards/4_clubs.png'),
  '5_spades':    require('../assets/cards/5_spades.png'),
  '5_hearts':    require('../assets/cards/5_hearts.png'),
  '5_diamonds':  require('../assets/cards/5_diamonds.png'),
  '5_clubs':     require('../assets/cards/5_clubs.png'),
  '6_spades':    require('../assets/cards/6_spades.png'),
  '6_hearts':    require('../assets/cards/6_hearts.png'),
  '6_diamonds':  require('../assets/cards/6_diamonds.png'),
  '6_clubs':     require('../assets/cards/6_clubs.png'),
  '7_spades':    require('../assets/cards/7_spades.png'),
  '7_hearts':    require('../assets/cards/7_hearts.png'),
  '7_diamonds':  require('../assets/cards/7_diamonds.png'),
  '7_clubs':     require('../assets/cards/7_clubs.png'),
  '8_spades':    require('../assets/cards/8_spades.png'),
  '8_hearts':    require('../assets/cards/8_hearts.png'),
  '8_diamonds':  require('../assets/cards/8_diamonds.png'),
  '8_clubs':     require('../assets/cards/8_clubs.png'),
  '9_spades':    require('../assets/cards/9_spades.png'),
  '9_hearts':    require('../assets/cards/9_hearts.png'),
  '9_diamonds':  require('../assets/cards/9_diamonds.png'),
  '9_clubs':     require('../assets/cards/9_clubs.png'),
  '10_spades':   require('../assets/cards/10_spades.png'),
  '10_hearts':   require('../assets/cards/10_hearts.png'),
  '10_diamonds': require('../assets/cards/10_diamonds.png'),
  '10_clubs':    require('../assets/cards/10_clubs.png'),
  'j_spades':    require('../assets/cards/j_spades.png'),
  'j_hearts':    require('../assets/cards/j_hearts.png'),
  'j_diamonds':  require('../assets/cards/j_diamonds.png'),
  'j_clubs':     require('../assets/cards/j_clubs.png'),
  'q_spades':    require('../assets/cards/q_spades.png'),
  'q_hearts':    require('../assets/cards/q_hearts.png'),
  'q_diamonds':  require('../assets/cards/q_diamonds.png'),
  'q_clubs':     require('../assets/cards/q_clubs.png'),
  'k_spades':    require('../assets/cards/k_spades.png'),
  'k_hearts':    require('../assets/cards/k_hearts.png'),
  'k_diamonds':  require('../assets/cards/k_diamonds.png'),
  'k_clubs':     require('../assets/cards/k_clubs.png'),
  'card_back':   require('../assets/cards/card_back.png'),
};

const COWBOY = {
  'a_spades':    require('../assets/cards_cowboy/a_spades.png'),
  'a_hearts':    require('../assets/cards_cowboy/a_hearts.png'),
  'a_diamonds':  require('../assets/cards_cowboy/a_diamonds.png'),
  'a_clubs':     require('../assets/cards_cowboy/a_clubs.png'),
  '2_spades':    require('../assets/cards_cowboy/2_spades.png'),
  '2_hearts':    require('../assets/cards_cowboy/2_hearts.png'),
  '2_diamonds':  require('../assets/cards_cowboy/2_diamonds.png'),
  '2_clubs':     require('../assets/cards_cowboy/2_clubs.png'),
  '3_spades':    require('../assets/cards_cowboy/3_spades.png'),
  '3_hearts':    require('../assets/cards_cowboy/3_hearts.png'),
  '3_diamonds':  require('../assets/cards_cowboy/3_diamonds.png'),
  '3_clubs':     require('../assets/cards_cowboy/3_clubs.png'),
  '4_spades':    require('../assets/cards_cowboy/4_spades.png'),
  '4_hearts':    require('../assets/cards_cowboy/4_hearts.png'),
  '4_diamonds':  require('../assets/cards_cowboy/4_diamonds.png'),
  '4_clubs':     require('../assets/cards_cowboy/4_clubs.png'),
  '5_spades':    require('../assets/cards_cowboy/5_spades.png'),
  '5_hearts':    require('../assets/cards_cowboy/5_hearts.png'),
  '5_diamonds':  require('../assets/cards_cowboy/5_diamonds.png'),
  '5_clubs':     require('../assets/cards_cowboy/5_clubs.png'),
  '6_spades':    require('../assets/cards_cowboy/6_spades.png'),
  '6_hearts':    require('../assets/cards_cowboy/6_hearts.png'),
  '6_diamonds':  require('../assets/cards_cowboy/6_diamonds.png'),
  '6_clubs':     require('../assets/cards_cowboy/6_clubs.png'),
  '7_spades':    require('../assets/cards_cowboy/7_spades.png'),
  '7_hearts':    require('../assets/cards_cowboy/7_hearts.png'),
  '7_diamonds':  require('../assets/cards_cowboy/7_diamonds.png'),
  '7_clubs':     require('../assets/cards_cowboy/7_clubs.png'),
  '8_spades':    require('../assets/cards_cowboy/8_spades.png'),
  '8_hearts':    require('../assets/cards_cowboy/8_hearts.png'),
  '8_diamonds':  require('../assets/cards_cowboy/8_diamonds.png'),
  '8_clubs':     require('../assets/cards_cowboy/8_clubs.png'),
  '9_spades':    require('../assets/cards_cowboy/9_spades.png'),
  '9_hearts':    require('../assets/cards_cowboy/9_hearts.png'),
  '9_diamonds':  require('../assets/cards_cowboy/9_diamonds.png'),
  '9_clubs':     require('../assets/cards_cowboy/9_clubs.png'),
  '10_spades':   require('../assets/cards_cowboy/10_spades.png'),
  '10_hearts':   require('../assets/cards_cowboy/10_hearts.png'),
  '10_diamonds': require('../assets/cards_cowboy/10_diamonds.png'),
  '10_clubs':    require('../assets/cards_cowboy/10_clubs.png'),
  'j_spades':    require('../assets/cards_cowboy/j_spades.png'),
  'j_hearts':    require('../assets/cards_cowboy/j_hearts.png'),
  'j_diamonds':  require('../assets/cards_cowboy/j_diamonds.png'),
  'j_clubs':     require('../assets/cards_cowboy/j_clubs.png'),
  'q_spades':    require('../assets/cards_cowboy/q_spades.png'),
  'q_hearts':    require('../assets/cards_cowboy/q_hearts.png'),
  'q_diamonds':  require('../assets/cards_cowboy/q_diamonds.png'),
  'q_clubs':     require('../assets/cards_cowboy/q_clubs.png'),
  'k_spades':    require('../assets/cards_cowboy/k_spades.png'),
  'k_hearts':    require('../assets/cards_cowboy/k_hearts.png'),
  'k_diamonds':  require('../assets/cards_cowboy/k_diamonds.png'),
  'k_clubs':     require('../assets/cards_cowboy/k_clubs.png'),
  'card_back':   require('../assets/cards_cowboy/card_back.png'),
};

const GIRLY = {
  'a_spades':    require('../assets/card_images_girly/a_spades.png'),
  'a_hearts':    require('../assets/card_images_girly/a_hearts.png'),
  'a_diamonds':  require('../assets/card_images_girly/a_diamonds.png'),
  'a_clubs':     require('../assets/card_images_girly/a_clubs.png'),
  '2_spades':    require('../assets/card_images_girly/2_spades.png'),
  '2_hearts':    require('../assets/card_images_girly/2_hearts.png'),
  '2_diamonds':  require('../assets/card_images_girly/2_diamonds.png'),
  '2_clubs':     require('../assets/card_images_girly/2_clubs.png'),
  '3_spades':    require('../assets/card_images_girly/3_spades.png'),
  '3_hearts':    require('../assets/card_images_girly/3_hearts.png'),
  '3_diamonds':  require('../assets/card_images_girly/3_diamonds.png'),
  '3_clubs':     require('../assets/card_images_girly/3_clubs.png'),
  '4_spades':    require('../assets/card_images_girly/4_spades.png'),
  '4_hearts':    require('../assets/card_images_girly/4_hearts.png'),
  '4_diamonds':  require('../assets/card_images_girly/4_diamonds.png'),
  '4_clubs':     require('../assets/card_images_girly/4_clubs.png'),
  '5_spades':    require('../assets/card_images_girly/5_spades.png'),
  '5_hearts':    require('../assets/card_images_girly/5_hearts.png'),
  '5_diamonds':  require('../assets/card_images_girly/5_diamonds.png'),
  '5_clubs':     require('../assets/card_images_girly/5_clubs.png'),
  '6_spades':    require('../assets/card_images_girly/6_spades.png'),
  '6_hearts':    require('../assets/card_images_girly/6_hearts.png'),
  '6_diamonds':  require('../assets/card_images_girly/6_diamonds.png'),
  '6_clubs':     require('../assets/card_images_girly/6_clubs.png'),
  '7_spades':    require('../assets/card_images_girly/7_spades.png'),
  '7_hearts':    require('../assets/card_images_girly/7_hearts.png'),
  '7_diamonds':  require('../assets/card_images_girly/7_diamonds.png'),
  '7_clubs':     require('../assets/card_images_girly/7_clubs.png'),
  '8_spades':    require('../assets/card_images_girly/8_spades.png'),
  '8_hearts':    require('../assets/card_images_girly/8_hearts.png'),
  '8_diamonds':  require('../assets/card_images_girly/8_diamonds.png'),
  '8_clubs':     require('../assets/card_images_girly/8_clubs.png'),
  '9_spades':    require('../assets/card_images_girly/9_spades.png'),
  '9_hearts':    require('../assets/card_images_girly/9_hearts.png'),
  '9_diamonds':  require('../assets/card_images_girly/9_diamonds.png'),
  '9_clubs':     require('../assets/card_images_girly/9_clubs.png'),
  '10_spades':   require('../assets/card_images_girly/10_spades.png'),
  '10_hearts':   require('../assets/card_images_girly/10_hearts.png'),
  '10_diamonds': require('../assets/card_images_girly/10_diamonds.png'),
  '10_clubs':    require('../assets/card_images_girly/10_clubs.png'),
  'j_spades':    require('../assets/card_images_girly/j_spades.png'),
  'j_hearts':    require('../assets/card_images_girly/j_hearts.png'),
  'j_diamonds':  require('../assets/card_images_girly/j_diamonds.png'),
  'j_clubs':     require('../assets/card_images_girly/j_clubs.png'),
  'q_spades':    require('../assets/card_images_girly/q_spades.png'),
  'q_hearts':    require('../assets/card_images_girly/q_hearts.png'),
  'q_diamonds':  require('../assets/card_images_girly/q_diamonds.png'),
  'q_clubs':     require('../assets/card_images_girly/q_clubs.png'),
  'k_spades':    require('../assets/card_images_girly/k_spades.png'),
  'k_hearts':    require('../assets/card_images_girly/k_hearts.png'),
  'k_diamonds':  require('../assets/card_images_girly/k_diamonds.png'),
  'k_clubs':     require('../assets/card_images_girly/k_clubs.png'),
  'card_back':   require('../assets/card_images_girly/card_back.png'),
};

const HP = {
  'a_spades':    require('../assets/card_images_hp/a_spades.png'),
  'a_hearts':    require('../assets/card_images_hp/a_hearts.png'),
  'a_diamonds':  require('../assets/card_images_hp/a_diamonds.png'),
  'a_clubs':     require('../assets/card_images_hp/a_clubs.png'),
  '2_spades':    require('../assets/card_images_hp/2_spades.png'),
  '2_hearts':    require('../assets/card_images_hp/2_hearts.png'),
  '2_diamonds':  require('../assets/card_images_hp/2_diamonds.png'),
  '2_clubs':     require('../assets/card_images_hp/2_clubs.png'),
  '3_spades':    require('../assets/card_images_hp/3_spades.png'),
  '3_hearts':    require('../assets/card_images_hp/3_hearts.png'),
  '3_diamonds':  require('../assets/card_images_hp/3_diamonds.png'),
  '3_clubs':     require('../assets/card_images_hp/3_clubs.png'),
  '4_spades':    require('../assets/card_images_hp/4_spades.png'),
  '4_hearts':    require('../assets/card_images_hp/4_hearts.png'),
  '4_diamonds':  require('../assets/card_images_hp/4_diamonds.png'),
  '4_clubs':     require('../assets/card_images_hp/4_clubs.png'),
  '5_spades':    require('../assets/card_images_hp/5_spades.png'),
  '5_hearts':    require('../assets/card_images_hp/5_hearts.png'),
  '5_diamonds':  require('../assets/card_images_hp/5_diamonds.png'),
  '5_clubs':     require('../assets/card_images_hp/5_clubs.png'),
  '6_spades':    require('../assets/card_images_hp/6_spades.png'),
  '6_hearts':    require('../assets/card_images_hp/6_hearts.png'),
  '6_diamonds':  require('../assets/card_images_hp/6_diamonds.png'),
  '6_clubs':     require('../assets/card_images_hp/6_clubs.png'),
  '7_spades':    require('../assets/card_images_hp/7_spades.png'),
  '7_hearts':    require('../assets/card_images_hp/7_hearts.png'),
  '7_diamonds':  require('../assets/card_images_hp/7_diamonds.png'),
  '7_clubs':     require('../assets/card_images_hp/7_clubs.png'),
  '8_spades':    require('../assets/card_images_hp/8_spades.png'),
  '8_hearts':    require('../assets/card_images_hp/8_hearts.png'),
  '8_diamonds':  require('../assets/card_images_hp/8_diamonds.png'),
  '8_clubs':     require('../assets/card_images_hp/8_clubs.png'),
  '9_spades':    require('../assets/card_images_hp/9_spades.png'),
  '9_hearts':    require('../assets/card_images_hp/9_hearts.png'),
  '9_diamonds':  require('../assets/card_images_hp/9_diamonds.png'),
  '9_clubs':     require('../assets/card_images_hp/9_clubs.png'),
  '10_spades':   require('../assets/card_images_hp/10_spades.png'),
  '10_hearts':   require('../assets/card_images_hp/10_hearts.png'),
  '10_diamonds': require('../assets/card_images_hp/10_diamonds.png'),
  '10_clubs':    require('../assets/card_images_hp/10_clubs.png'),
  'j_spades':    require('../assets/card_images_hp/j_spades.png'),
  'j_hearts':    require('../assets/card_images_hp/j_hearts.png'),
  'j_diamonds':  require('../assets/card_images_hp/j_diamonds.png'),
  'j_clubs':     require('../assets/card_images_hp/j_clubs.png'),
  'q_spades':    require('../assets/card_images_hp/q_spades.png'),
  'q_hearts':    require('../assets/card_images_hp/q_hearts.png'),
  'q_diamonds':  require('../assets/card_images_hp/q_diamonds.png'),
  'q_clubs':     require('../assets/card_images_hp/q_clubs.png'),
  'k_spades':    require('../assets/card_images_hp/k_spades.png'),
  'k_hearts':    require('../assets/card_images_hp/k_hearts.png'),
  'k_diamonds':  require('../assets/card_images_hp/k_diamonds.png'),
  'k_clubs':     require('../assets/card_images_hp/k_clubs.png'),
  'card_back':   require('../assets/card_images_hp/card_back.png'),
};

// ─── Theme registry ───────────────────────────────────────────────────────────

const ALL = { neon: NEON, cowboy: COWBOY, girly: GIRLY, hp: HP };

// Theme definitions — used by SettingsScreen to render the picker
export const THEME_DEFS = [
  { id: 'neon',   label: 'Neon',     preview: require('../assets/cards/card_back.png') },
  { id: 'cowboy', label: 'Cowboy',   preview: require('../assets/cards_cowboy/card_back.png') },
  { id: 'girly',  label: 'Girly',    preview: require('../assets/card_images_girly/card_back.png') },
  { id: 'hp',     label: 'Hogwarts', preview: require('../assets/card_images_hp/card_back.png') },
];

// ─── Active theme state + listener pattern ────────────────────────────────────

let _activeTheme = 'neon';
const _listeners = new Set();

export function setTheme(id) {
  if (!ALL[id]) return;
  _activeTheme = id;
  _listeners.forEach(fn => fn(id));
}

export function getTheme() {
  return _activeTheme;
}

// Subscribe to theme changes; returns an unsubscribe function
export function subscribe(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

// ─── Image getters ────────────────────────────────────────────────────────────

export function getCardImage(rank, suit) {
  const rankKey = RANK_KEY[rank] ?? String(rank).toLowerCase();
  const suitKey = SUIT_KEY[suit] ?? suit;
  return ALL[_activeTheme]?.[`${rankKey}_${suitKey}`];
}

export function getCardBackImage() {
  return ALL[_activeTheme]?.['card_back'];
}
