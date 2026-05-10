import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FILES = {
  card_flip: require("../assets/sounds/card_flip.wav"),
  card_deal: require("../assets/sounds/card_deal.wav"),
  win: require("../assets/sounds/win.wav"),
  error: require("../assets/sounds/error.wav"),
};

const MUTED_KEY = "@cardnight:soundMuted";

let _muted = false;
const pool = {};

// Keep this function very small: it just loads the persisted mute flag and
// updates the module-level cache.
async function loadMutedFromStorage() {
  const raw = await AsyncStorage.getItem(MUTED_KEY);
  _muted = raw === "true";
}

export async function initSounds() {
  // Load mute preference first so playSound() can early-return immediately
  // after init.
  try {
    await loadMutedFromStorage();
  } catch {
    // ignore — default is unmuted
  }

  try {
    await setAudioModeAsync({ playsInSilentModeIOS: true });
  } catch {
    // degrade silently
  }

  try {
    for (const [key, source] of Object.entries(FILES)) {
      pool[key] = createAudioPlayer(source);
    }
  } catch {
    // degrade silently — no audio hardware, simulator, etc.
  }
}

export function getMuted() {
  return _muted;
}

export async function setMuted(value) {
  _muted = !!value;
  try {
    await AsyncStorage.setItem(MUTED_KEY, String(_muted));
  } catch {
    // If persistence fails, still keep the in-memory flag.
  }
}

export function playSound(name) {
  try {
    if (_muted) return;

    const player = pool[name];
    if (!player) return;
    player.seekTo(0);
    player.play();
  } catch {
    // ignore playback errors
  }
}
