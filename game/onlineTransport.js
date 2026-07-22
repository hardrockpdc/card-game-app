// Firebase-backed implementation of the GameNetwork interface for ONLINE play.
//
// GameNetwork.js delegates here when the network mode is "online" (see
// setNetworkMode there). The goal is that game screens keep calling the same
// functions (broadcastToClients / sendToClient / sendToHost / listeners) and
// don't care whether the transport underneath is local TCP or Firebase.
//
// Message model over Realtime Database (under rooms/<code>/net):
//   broadcast        { seq, payload }      host → all clients (latest wins)
//   private/<uid>    { seq, payload }      host → one client  (latest wins)
//   toHost/<pushId>  { sender, payload }   client → host      (queue, drained)
//
// A monotonic `seq` is attached to broadcast/private writes so two identical
// consecutive messages still register as a change and fire the listener.
import {
  ref,
  onValue,
  onChildAdded,
  onChildChanged,
  push,
  set,
  remove,
} from "@react-native-firebase/database";
import { getApp } from "@react-native-firebase/app";
import { getDatabase } from "@react-native-firebase/database";
import { warn } from "./logger";

let config = null; // { code, uid, isHost }
let serverListeners = {};
let clientListeners = {};

// Active Firebase unsubscribe functions, cleared on teardown.
let subs = [];

// Per-message-type sequence numbers. Each message type gets its own slot so
// different types never overwrite each other (e.g. AVATARS clobbering
// GAME_STATE); seq forces a change event even on identical consecutive payloads.
const broadcastSeq = {}; // type -> seq
const privateSeq = {}; // `${uid}/${type}` -> seq

function db() {
  return getDatabase(getApp());
}
function netRef(path) {
  return ref(db(), `rooms/${config.code}/net/${path}`);
}

// Store each message as an opaque JSON STRING rather than a nested Firebase
// object. This avoids two RTDB gotchas that the local TCP transport (which uses
// JSON over the wire) never hits:
//   1. Firebase rejects values containing `undefined`.
//   2. Firebase silently drops empty arrays/objects (e.g. books:{}, history:[]),
//      which come back as `undefined` and crash renders.
// JSON.stringify mirrors the TCP behavior exactly and round-trips faithfully.
function encode(message) {
  try {
    return JSON.stringify(message ?? null);
  } catch (_) {
    return "null";
  }
}
function decode(str) {
  try {
    return typeof str === "string" ? JSON.parse(str) : null;
  } catch (_) {
    return null;
  }
}

export function setOnlineConfig(next) {
  config = next;
}

export function onlineGetAssignedClientId() {
  return config?.uid ?? null;
}

// The room code for the active online session, or null in local mode. Used by
// the reconnect hook to re-add our player slot after a background drop.
export function onlineGetRoomCode() {
  return config?.code ?? null;
}

// Client-side: watch THIS device's own connection to Firebase via the special
// `.info/connected` path. Lets a client notice it dropped off the network (a
// Wi-Fi blip, not a backgrounding) so it can show a "reconnecting" overlay and
// re-add its slot when the link returns. cb receives true/false. Returns an
// unsubscribe fn; a no-op in local mode.
export function onlineWatchConnection(cb) {
  if (!config?.code) return () => {};
  const r = ref(db(), ".info/connected");
  return onValue(
    r,
    (snap) => cb(snap.val() === true),
    (err) => warn("[onlineTransport] connection watch error:", err),
  );
}

// Client-side: watch the room's `hostConnected` flag so a client can pause when
// the host drops (the host can't broadcast a PAUSE while its phone is asleep, so
// this is read from the room record directly, not the net channel). cb receives
// true / false / null (absent → treat as connected). Returns an unsubscribe fn;
// a no-op in local mode (no room code).
export function onlineWatchHostConnected(cb) {
  if (!config?.code) return () => {};
  const r = ref(db(), `rooms/${config.code}/hostConnected`);
  return onValue(
    r,
    (snap) => cb(snap.exists() ? snap.val() : null),
    (err) => warn("[onlineTransport] hostConnected watch error:", err),
  );
}

// ─── Host listeners ──────────────────────────────────────────────────────────
export function onlineSetServerListeners(listeners) {
  serverListeners = listeners || {};
  if (!config?.isHost) return;

  // Drain the client→host queue: process each message then delete it so the
  // queue stays small and we never reprocess on re-attach.
  const toHost = netRef("toHost");
  const unsubQueue = onChildAdded(toHost, (snap) => {
    const val = snap.val();
    const msg = val ? decode(val.payload) : null;
    if (msg) {
      try {
        serverListeners.onMessage?.(msg, val.sender);
      } catch (err) {
        warn("[onlineTransport] host onMessage threw:", err);
      }
    }
    remove(snap.ref).catch(() => {});
  });
  subs.push(unsubQueue);

  // Detect a player dropping: watch the room's player list and fire onClientLeft
  // for any uid that disappears.
  const playersRef = ref(db(), `rooms/${config.code}/players`);
  let known = null;
  const unsubPlayers = onValue(playersRef, (snap) => {
    const now = snap.exists() ? Object.keys(snap.val()) : [];
    if (known !== null) {
      for (const uid of known) {
        if (!now.includes(uid)) {
          try {
            serverListeners.onClientLeft?.({ id: uid });
          } catch (err) {
            warn("[onlineTransport] onClientLeft threw:", err);
          }
        }
      }
      // A uid REappearing means a dropped player reconnected (rejoinRoom).
      for (const uid of now) {
        if (!known.includes(uid)) {
          try {
            serverListeners.onClientJoined?.({ id: uid });
          } catch (err) {
            warn("[onlineTransport] onClientJoined threw:", err);
          }
        }
      }
    }
    known = now;
  });
  subs.push(unsubPlayers);
}

// ─── Client listeners ────────────────────────────────────────────────────────
export function onlineSetClientListeners(listeners) {
  clientListeners = listeners || {};
  if (config?.isHost) return;

  // Host → everyone. Each message type lives in its own child slot, so a late
  // client receives the latest of EVERY type on attach (onChildAdded replays
  // existing children) plus all future updates (onChildChanged).
  const onChild = (snap) => {
    const val = snap.val();
    const msg = val ? decode(val.payload) : null;
    if (msg) deliverToClient(msg);
  };
  subs.push(onChildAdded(netRef("broadcast"), onChild));
  subs.push(onChildChanged(netRef("broadcast"), onChild));

  // Host → me (private hand, etc.) — same per-type slot model.
  subs.push(onChildAdded(netRef(`private/${config.uid}`), onChild));
  subs.push(onChildChanged(netRef(`private/${config.uid}`), onChild));

  // Room removed (host left / closed) → treat as a disconnect.
  const roomRef = ref(db(), `rooms/${config.code}`);
  const unsubRoom = onValue(roomRef, (snap) => {
    if (!snap.exists()) {
      try {
        clientListeners.onDisconnected?.();
      } catch (_) {}
    }
  });
  subs.push(unsubRoom);
}

function deliverToClient(payload) {
  try {
    clientListeners.onMessage?.(payload);
  } catch (err) {
    warn("[onlineTransport] client onMessage threw:", err);
  }
}

// ─── Sending ─────────────────────────────────────────────────────────────────
export function onlineBroadcast(message) {
  if (!config?.isHost) return;
  const type = message?.type || "MSG";
  broadcastSeq[type] = (broadcastSeq[type] || 0) + 1;
  set(netRef(`broadcast/${type}`), {
    seq: broadcastSeq[type],
    payload: encode(message),
  }).catch((err) => warn("[onlineTransport] broadcast failed:", err));
}

export function onlineSendToClient(clientId, message) {
  if (!config?.isHost) return;
  const type = message?.type || "MSG";
  const key = `${clientId}/${type}`;
  privateSeq[key] = (privateSeq[key] || 0) + 1;
  set(netRef(`private/${clientId}/${type}`), {
    seq: privateSeq[key],
    payload: encode(message),
  }).catch((err) => warn("[onlineTransport] sendToClient failed:", err));
}

export function onlineSendToHost(message) {
  if (config?.isHost) return;
  push(netRef("toHost"), { sender: config.uid, payload: encode(message) }).catch(
    (err) => warn("[onlineTransport] sendToHost failed:", err),
  );
}

// ─── Teardown ────────────────────────────────────────────────────────────────
// Detach all listeners and close out the room. A host removes the whole room
// (which signals every client to disconnect); a client removes only its own
// player slot (so the host sees it leave).
export function onlineTeardown() {
  subs.forEach((unsub) => {
    try {
      if (typeof unsub === "function") unsub();
    } catch (_) {}
  });
  subs = [];
  if (config) {
    if (config.isHost) {
      remove(ref(db(), `rooms/${config.code}`)).catch(() => {});
    } else if (config.uid) {
      remove(ref(db(), `rooms/${config.code}/players/${config.uid}`)).catch(
        () => {},
      );
    }
  }
  serverListeners = {};
  clientListeners = {};
}

// Clear any stale net channel before a fresh game starts (host only).
export function onlineResetChannel() {
  if (!config?.isHost) return;
  remove(netRef("")).catch(() => {});
}
