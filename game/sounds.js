import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

const FILES = {
  card_flip: require("../assets/sounds/card_flip.wav"),
  card_deal: require("../assets/sounds/card_deal.wav"),
  win: require("../assets/sounds/win.wav"),
  error: require("../assets/sounds/error.wav"),
};

const pool = {};

export async function initSounds() {
  try {
    await setAudioModeAsync({ playsInSilentModeIOS: true });
    for (const [key, source] of Object.entries(FILES)) {
      pool[key] = createAudioPlayer(source);
    }
  } catch {
    // degrade silently — no audio hardware, simulator, etc.
  }
}

export function playSound(name) {
  try {
    const player = pool[name];
    if (!player) return;
    player.seekTo(0);
    player.play();
  } catch {
    // ignore playback errors
  }
}
