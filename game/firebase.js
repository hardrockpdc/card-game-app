// Firebase wiring for online multiplayer.
//
// @react-native-firebase auto-initializes the native app from
// google-services.json (Android) at startup — there's no JS config object to
// pass. This module just exposes the pieces the app uses and a helper to make
// sure we have an anonymous auth session before touching the database.
//
// NOTE: native module — only works in a compiled dev/production build, NOT
// Expo Go. A rebuild is required after adding the Firebase packages.
import auth from "@react-native-firebase/auth";
import database from "@react-native-firebase/database";
import { warn } from "./logger";

// Signs the device in anonymously (no account/login UI). Firebase gives each
// install a stable uid we use to identify a player in a room. Safe to call
// repeatedly — if already signed in it just returns the current user.
export async function ensureSignedIn() {
  try {
    const current = auth().currentUser;
    if (current) return current.uid;
    const credential = await auth().signInAnonymously();
    return credential.user.uid;
  } catch (err) {
    warn("[firebase] anonymous sign-in failed:", err);
    return null;
  }
}

// The current player's uid, or null if not signed in yet.
export function getUid() {
  return auth().currentUser?.uid ?? null;
}

// Realtime Database root reference helper.
export function dbRef(path) {
  return database().ref(path);
}

export { auth, database };
