// Preset avatar choices (emoji + background color). Shared by the Profile
// screen's picker and the ProfileAvatar component so they never drift.

export const AVATAR_CHOICES = [
  { id: "avatar_01", emoji: "🐶", color: "#ff8a80" },
  { id: "avatar_02", emoji: "🐱", color: "#ffab91" },
  { id: "avatar_03", emoji: "🐰", color: "#ffd180" },
  { id: "avatar_04", emoji: "🐼", color: "#ffe57f" },
  { id: "avatar_05", emoji: "🦊", color: "#c5e1a5" },
  { id: "avatar_06", emoji: "🐨", color: "#b2dfdb" },
  { id: "avatar_07", emoji: "🐯", color: "#81d4fa" },
  { id: "avatar_08", emoji: "🦁", color: "#90caf9" },
  { id: "avatar_09", emoji: "🐮", color: "#b39ddb" },
  { id: "avatar_10", emoji: "🐷", color: "#f48fb1" },
  { id: "avatar_11", emoji: "🐸", color: "#a5d6a7" },
  { id: "avatar_12", emoji: "🐵", color: "#bcaaa4" },
  { id: "avatar_13", emoji: "🐔", color: "#fff59d" },
  { id: "avatar_14", emoji: "🦄", color: "#ce93d8" },
  { id: "avatar_15", emoji: "🐙", color: "#80cbc4" },
  { id: "avatar_16", emoji: "🦋", color: "#4dd0e1" },
  { id: "avatar_17", emoji: "🐝", color: "#fff176" },
  { id: "avatar_18", emoji: "🐢", color: "#aed581" },
  { id: "avatar_19", emoji: "🦉", color: "#ffcc80" },
  { id: "avatar_20", emoji: "🐬", color: "#64b5f6" },
];

export function getAvatarChoice(avatarId) {
  return AVATAR_CHOICES.find((choice) => choice.id === avatarId) || null;
}
