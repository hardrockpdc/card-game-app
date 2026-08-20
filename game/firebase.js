// Firebase wiring for online multiplayer.
//
// @react-native-firebase auto-initializes the native app from
// google-services.json (Android) at startup — there's no JS config object to
// pass. This module exposes the pieces the app uses and a helper to make sure
// we have an anonymous auth session before touching the database.
//
// Uses the v22+ modular API (getAuth/getDatabase/...) — the older namespaced
// style (auth().x) is deprecated and slated for removal.
//
// NOTE: native module — only works in a compiled dev/production build, NOT
// Expo Go. A rebuild is required after adding the Firebase packages.
import { getApp } from "@react-native-firebase/app";
import { getAuth, signInAnonymously } from "@react-native-firebase/auth";
import { getDatabase, ref } from "@react-native-firebase/database";
import { warn } from "./logger";

// Signs the device in anonymously (no account/login UI). Firebase gives each
// install a stable uid we use to identify a player in a room. Safe to call
// repeatedly — if already signed in it just returns the current user.
export async function ensureSignedIn() {
  try {
    const authInstance = getAuth(getApp());
    const current = authInstance.currentUser;
    if (current) return current.uid;
    const credential = await signInAnonymously(authInstance);
    return credential.user.uid;
  } catch (err) {
    warn("[firebase] anonymous sign-in failed:", err);
    return null;
  }
}

// The current player's uid, or null if not signed in yet.
export function getUid() {
  return getAuth(getApp()).currentUser?.uid ?? null;
}

// Realtime Database reference helper for a given path.
export function dbRef(path) {
  return ref(getDatabase(getApp()), path);
}

export { getApp, getAuth, getDatabase };
