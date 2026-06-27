// Online multiplayer room system (Firebase Realtime Database).
//
// Mirrors the role of game/GameNetwork.js (local TCP/UDP) but over Firebase,
// so players can play from anywhere — not just the same Wi-Fi. A "room" is a
// short code other players type in to join. The host owns the room; the
// anonymous Firebase uid (see game/firebase.js) identifies each player.
//
// This module only handles the LOBBY lifecycle (create / join / player list /
// leave / start). Actual in-game state sync comes in a later phase.
//
// NOTE: native module under the hood — needs a dev/production build, not Expo Go.
import {
  ref,
  get,
  set,
  update,
  remove,
  onValue,
  onDisconnect,
  serverTimestamp,
} from "@react-native-firebase/database";
import { getApp } from "@react-native-firebase/app";
import { getDatabase } from "@react-native-firebase/database";
import { ensureSignedIn, getUid } from "./firebase";
import { warn } from "./logger";

// Ambiguous-looking characters removed (no O/0, I/1) so codes are easy to read
// aloud and type. 4 chars from 32 symbols ≈ 1M combinations — plenty.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 4;

function randomCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function db() {
  return getDatabase(getApp());
}

function roomRef(code) {
  return ref(db(), `rooms/${code}`);
}

// Creates a fresh room with a unique code and the host as its first player.
// Returns { code, uid } on success, or null on failure.
export async function createRoom({ gameId, variant = null, tone = null, hostName }) {
  const uid = await ensureSignedIn();
  if (!uid) return null;

  // Find a code that isn't already taken (retry a few times on the rare clash).
  let code = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = randomCode();
    const snap = await get(roomRef(candidate));
    if (!snap.exists()) {
      code = candidate;
      break;
    }
  }
  if (!code) {
    warn("[onlineRoom] could not allocate a unique room code");
    return null;
  }

  try {
    await set(roomRef(code), {
      host: uid,
      gameId,
      variant,
      tone,
      status: "waiting",
      createdAt: serverTimestamp(),
      players: {
        [uid]: {
          name: hostName || "Host",
          isHost: true,
          joinedAt: serverTimestamp(),
        },
      },
    });

    // If the host's device drops, tear the whole room down.
    onDisconnect(roomRef(code)).remove();

    return { code, uid };
  } catch (err) {
    warn("[onlineRoom] createRoom failed:", err);
    return null;
  }
}

// Joins an existing waiting room by code. Returns { code, uid } on success or
// an { error } string the caller can show the user.
export async function joinRoom(code, { playerName }) {
  const uid = await ensureSignedIn();
  if (!uid) return { error: "Could not connect. Try again." };

  const cleanCode = String(code || "").trim().toUpperCase();
  if (cleanCode.length !== CODE_LENGTH) {
    return { error: "Enter a 4-letter room code." };
  }

  try {
    const snap = await get(roomRef(cleanCode));
    if (!snap.exists()) {
      return { error: "No room found with that code." };
    }
    const room = snap.val();
    if (room.status !== "waiting") {
      return { error: "That game has already started." };
    }

    const playerRef = ref(db(), `rooms/${cleanCode}/players/${uid}`);
    await set(playerRef, {
      name: playerName || "Player",
      isHost: false,
      joinedAt: serverTimestamp(),
    });

    // Drop our own slot if this device disconnects.
    onDisconnect(playerRef).remove();

    return { code: cleanCode, uid };
  } catch (err) {
    warn("[onlineRoom] joinRoom failed:", err);
    return { error: "Could not join the room." };
  }
}

// Listens to a room's live state. Calls cb(room) on every change, or cb(null)
// if the room is deleted (host left / closed). Returns an unsubscribe function.
export function subscribeToRoom(code, cb) {
  const r = roomRef(code);
  const handler = onValue(
    r,
    (snap) => cb(snap.exists() ? { code, ...snap.val() } : null),
    (err) => {
      warn("[onlineRoom] subscribe error:", err);
      cb(null);
    },
  );
  // onValue returns its own unsubscribe in the modular API.
  return handler;
}

// Host-only: change the selected game/variant while still in the lobby.
export async function updateRoomGame(code, { gameId, variant = null, tone = null }) {
  try {
    await update(roomRef(code), { gameId, variant, tone });
  } catch (err) {
    warn("[onlineRoom] updateRoomGame failed:", err);
  }
}

// Host-only: flip the room to "playing" so everyone's lobby advances together.
export async function startRoomGame(code) {
  try {
    await update(roomRef(code), { status: "playing" });
  } catch (err) {
    warn("[onlineRoom] startRoomGame failed:", err);
  }
}

// Leaves the room. If we're the host, the whole room is removed; otherwise just
// our own player slot is removed.
export async function leaveRoom(code, { isHost }) {
  const uid = getUid();
  try {
    if (isHost) {
      await remove(roomRef(code));
    } else if (uid) {
      await remove(ref(db(), `rooms/${code}/players/${uid}`));
    }
  } catch (err) {
    warn("[onlineRoom] leaveRoom failed:", err);
  }
}

export { CODE_LENGTH };
