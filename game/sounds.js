import { Audio } from "expo-av";

const FILES = {
  card_flip: require("../assets/sounds/card_flip.wav"),
  card_deal: require("../assets/sounds/card_deal.wav"),
  win: require("../assets/sounds/win.wav"),
  error: require("../assets/sounds/error.wav"),
};

const pool = {};

export async function initSounds() {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    await Promise.all(
      Object.entries(FILES).map(async ([key, source]) => {
        const { sound } = await Audio.Sound.createAsync(source, {
          shouldPlay: false,
        });
        pool[key] = sound;
      }),
    );
  } catch {
    // degrade silently — no audio hardware, simulator, etc.
  }
}

export async function playSound(name) {
  try {
    const sound = pool[name];
    if (!sound) return;
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {
    // ignore playback errors
  }
}
