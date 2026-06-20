export const TABLE_THEMES = {
  blackjack: { table: "#35654D", accent: "#FFD700" },
  poker: { table: "#35654D", accent: "#FFD700" },
  solitaire: { table: "#01889F", accent: "#7FB3FF" },
  rummy: { table: "#B22222", accent: "#FFE4B5" },
  conquian: { table: "#0B1320", accent: "#7fb3ff" },
  gofish: { table: "#0D6E8C", accent: "#A8E6FF" },
  lastcard: { table: "#1a1a2e", accent: "#e94560" },
  wildround: { table: "#1a1a2e", accent: "#e94560" },
  whoami: { table: "#241432", accent: "#c792ea" },
};

export function getTableTheme(gameId) {
  return TABLE_THEMES[gameId] || TABLE_THEMES.blackjack;
}
