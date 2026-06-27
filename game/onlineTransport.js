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
  push,
  set,
  remove,
} from "@react-native-firebase/database";
import { getApp } from "@react-native-firebase/app";
import { getDatabase } from "@react-native-firebase/database";
import { warn, log } from "./logger";

let config = null; // { code, uid, isHost }
let serverListeners = {};
let clientListeners = {};

// Active Firebase unsubscribe functions, cleared on teardown.
let subs = [];

let broadcastSeq = 0;
const privateSeq = {}; // uid -> seq

function db() {
  return getDatabase(getApp());
}
function netRef(path) {
  return ref(db(), `rooms/${config.code}/net/${path}`);
}

// Firebase rejects any value containing `undefined` and throws away the whole
// write. The local TCP transport uses JSON.stringify, which silently drops
// undefined fields — so we mirror that here to keep messages compatible.
function clean(message) {
  try {
    return JSON.parse(JSON.stringify(message ?? null));
  } catch (_) {
    return null;
  }
}

export function setOnlineConfig(next) {
  config = next;
  broadcastSeq = 0;
}

export function onlineGetAssignedClientId() {
  return config?.uid ?? null;
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
    if (val && val.payload) {
      try {
        serverListeners.onMessage?.(val.payload, val.sender);
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
    }
    known = now;
  });
  subs.push(unsubPlayers);
}

// ─── Client listeners ────────────────────────────────────────────────────────
export function onlineSetClientListeners(listeners) {
  clientListeners = listeners || {};
  log("[onlineTransport] client setListeners; config=", config);
  if (config?.isHost) return;

  // Host → everyone.
  const unsubBroadcast = onValue(netRef("broadcast"), (snap) => {
    const val = snap.val();
    log(
      "[onlineTransport] client broadcast fire; exists=",
      snap.exists(),
      "type=",
      val?.payload?.type,
    );
    if (val && val.payload) deliverToClient(val.payload);
  });
  subs.push(unsubBroadcast);

  // Host → me (private hand, etc.).
  const unsubPrivate = onValue(netRef(`private/${config.uid}`), (snap) => {
    const val = snap.val();
    log(
      "[onlineTransport] client private fire; exists=",
      snap.exists(),
      "type=",
      val?.payload?.type,
    );
    if (val && val.payload) deliverToClient(val.payload);
  });
  subs.push(unsubPrivate);

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
  log("[onlineTransport] host broadcast write; type=", message?.type, "code=", config?.code);
  set(netRef("broadcast"), { seq: ++broadcastSeq, payload: clean(message) })
    .then(() => log("[onlineTransport] host broadcast write OK; type=", message?.type))
    .catch((err) => warn("[onlineTransport] broadcast failed:", err));
}

export function onlineSendToClient(clientId, message) {
  if (!config?.isHost) return;
  privateSeq[clientId] = (privateSeq[clientId] || 0) + 1;
  set(netRef(`private/${clientId}`), {
    seq: privateSeq[clientId],
    payload: clean(message),
  }).catch((err) => warn("[onlineTransport] sendToClient failed:", err));
}

export function onlineSendToHost(message) {
  if (config?.isHost) return;
  push(netRef("toHost"), { sender: config.uid, payload: clean(message) }).catch(
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
