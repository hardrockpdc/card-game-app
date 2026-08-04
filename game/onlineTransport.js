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
import { forgetHostedRoom } from "./roomCleanup";
import { warn } from "./logger";

let config = null; // { code, uid, isHost }
let serverListeners = {};
let clientListeners = {};

// Active Firebase unsubscribe functions, split by role so re-registering one
// side can't disturb the other.
//
// These MUST be detached before a new set is attached. Screens re-register
// freely — the lobby hands over to the game screen, effect cleanups call
// setClientListeners({}) to "clear" — and every one of those calls used to
// append another live subscription set that was never removed. That both
// silenced delivery (clientListeners became {} while the old subscriptions kept
// running) and multiplied every broadcast by the number of accumulated sets.
let serverSubs = [];
let clientSubs = [];

function detach(list) {
  list.forEach((unsub) => {
    try {
      if (typeof unsub === "function") unsub();
    } catch (_) {}
  });
  list.length = 0;
}

// Screens clear their listeners by passing an empty object (see the effect
// cleanups in RummyGameScreen). That has to mean "stop listening" — detach and
// stay detached — not "detach and immediately resubscribe with no handlers",
// which would leave live RTDB subscriptions feeding a handler set that can
// never deliver.
function hasHandlers(listeners) {
  return (
    !!listeners && Object.values(listeners).some((v) => typeof v === "function")
  );
}

// Per-message-type sequence numbers. Each message type gets its own slot so
// different types never overwrite each other (e.g. AVATARS clobbering
// GAME_STATE); seq forces a change event even on identical consecutive payloads.
const broadcastSeq = {}; // type -> seq
const privateSeq = {}; // `${uid}/${type}` -> seq

// Host-side roster of uids currently in the room, kept in sync by the players
// watcher in onlineSetServerListeners. Used to reject messages claiming to come
// from someone who isn't in the room. `null` means "no snapshot yet" — we can't
// validate, so we accept, rather than silently dropping a real player's opening
// message in the race before the first roster arrives. The database rule is the
// hard enforcement; this is defence in depth.
let knownPlayerIds = null;

function db() {
  return getDatabase(getApp());
}
function netRef(path) {
  return ref(db(), `rooms/${config.code}/net/${path}`);
}

// SECURITY: per-player private state (hole cards, hands, the Who Am I? secret)
// deliberately lives OUTSIDE rooms/<code>. Firebase read rules cascade downward
// and can't be revoked by a descendant, and rooms/<code> must stay readable as a
// whole subtree (subscribeToRoom / joinRoom / rejoinRoom / markHostConnected all
// read it in one shot). Anything private parked under there would therefore be
// readable by every player in the room. See privateNet in database.rules.json,
// where the read rule is `$uid === auth.uid`.
function privateRef(uid, type) {
  return ref(db(), `privateNet/${config.code}/${uid}/${type}`);
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
  // Replace, never accumulate. Also makes setServerListeners({}) a genuine
  // detach rather than a silent re-subscribe.
  detach(serverSubs);
  knownPlayerIds = null;
  serverListeners = listeners || {};
  if (!config?.isHost || !hasHandlers(serverListeners)) return;

  // Drain the client→host queue: process each message then delete it so the
  // queue stays small and we never reprocess on re-attach.
  const toHost = netRef("toHost");
  const unsubQueue = onChildAdded(toHost, (snap) => {
    const val = snap.val();
    const msg = val ? decode(val.payload) : null;
    // `sender` is the identity every host-side turn check authorises against,
    // so it must be trustworthy. The database rule pins it to auth.uid (see
    // net/toHost/$pushId/sender), which is the real enforcement point — a
    // forged sender never lands in the first place. This check is defence in
    // depth for the window before the rules are re-deployed, and it drops any
    // message whose sender isn't a known player in the room.
    const sender = val?.sender;
    const known =
      sender && (knownPlayerIds === null || knownPlayerIds.has(String(sender)));
    if (msg && known) {
      try {
        serverListeners.onMessage?.(msg, sender);
      } catch (err) {
        warn("[onlineTransport] host onMessage threw:", err);
      }
    } else if (msg) {
      warn("[onlineTransport] dropped message from unknown sender:", sender);
    }
    remove(snap.ref).catch(() => {});
  });
  serverSubs.push(unsubQueue);

  // Detect a player dropping: watch the room's player list and fire onClientLeft
  // for any uid that disappears.
  const playersRef = ref(db(), `rooms/${config.code}/players`);
  let known = null;
  const unsubPlayers = onValue(playersRef, (snap) => {
    const now = snap.exists() ? Object.keys(snap.val()) : [];
    // Keep the sender allow-list in sync with the live roster (see the toHost
    // drain above). The host itself never routes through toHost, so it doesn't
    // need to be in here.
    knownPlayerIds = new Set(now.map(String));
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
  serverSubs.push(unsubPlayers);
}

// ─── Client listeners ────────────────────────────────────────────────────────
export function onlineSetClientListeners(listeners) {
  // Replace, never accumulate — see onlineSetServerListeners.
  detach(clientSubs);
  clientListeners = listeners || {};
  if (config?.isHost || !hasHandlers(clientListeners)) return;

  // Host → everyone. Each message type lives in its own child slot, so a late
  // client receives the latest of EVERY type on attach (onChildAdded replays
  // existing children) plus all future updates (onChildChanged).
  const onChild = (snap) => {
    const val = snap.val();
    const msg = val ? decode(val.payload) : null;
    if (msg) deliverToClient(msg);
  };
  clientSubs.push(onChildAdded(netRef("broadcast"), onChild));
  clientSubs.push(onChildChanged(netRef("broadcast"), onChild));

  // Host → me (private hand, etc.) — same per-type slot model, but read from
  // privateNet, which only this uid can read (see privateRef).
  const myPrivate = ref(db(), `privateNet/${config.code}/${config.uid}`);
  clientSubs.push(onChildAdded(myPrivate, onChild));
  clientSubs.push(onChildChanged(myPrivate, onChild));

  // Room gone (host left / closed) → treat as a disconnect. Also eject if the
  // room is a "zombie": present but with no `host` or status !== "playing". That
  // happens if the host ended the game (deleting the room) while we were offline
  // and our own reconnect re-created just our player slot — a room fragment with
  // no host to run the game. Without this check we'd sit in a dead game unable
  // to act. (Host-away in Phase 2 keeps the `host` field, so it isn't caught.)
  const roomRef = ref(db(), `rooms/${config.code}`);
  const unsubRoom = onValue(roomRef, (snap) => {
    const room = snap.exists() ? snap.val() : null;
    const dead = !room || !room.host || room.status !== "playing";
    if (dead) {
      try {
        clientListeners.onDisconnected?.();
      } catch (_) {}
    }
  });
  clientSubs.push(unsubRoom);
}

function deliverToClient(payload) {
  try {
    clientListeners.onMessage?.(payload);
  } catch (err) {
    warn("[onlineTransport] client onMessage threw:", err);
  }
}

// ─── Sending ─────────────────────────────────────────────────────────────────
// Returns the write promise. Callers that tear the room down immediately after
// a broadcast (a host quitting) have to wait for it — delete the room first and
// the message never reaches anyone, which is how a host leaving used to look
// like a network failure to every client.
export function onlineBroadcast(message) {
  if (!config?.isHost) return undefined;
  const type = message?.type || "MSG";
  broadcastSeq[type] = (broadcastSeq[type] || 0) + 1;
  return set(netRef(`broadcast/${type}`), {
    seq: broadcastSeq[type],
    payload: encode(message),
  }).catch((err) => warn("[onlineTransport] broadcast failed:", err));
}

export function onlineSendToClient(clientId, message) {
  if (!config?.isHost) return;
  const type = message?.type || "MSG";
  const key = `${clientId}/${type}`;
  privateSeq[key] = (privateSeq[key] || 0) + 1;
  set(privateRef(clientId, type), {
    seq: privateSeq[key],
    payload: encode(message),
  }).catch((err) => warn("[onlineTransport] sendToClient failed:", err));
}

export function onlineSendToHost(message) {
  if (config?.isHost) return;
  push(netRef("toHost"), {
    sender: config.uid,
    payload: encode(message),
  }).catch((err) => warn("[onlineTransport] sendToHost failed:", err));
}

// ─── Teardown ────────────────────────────────────────────────────────────────
// Detach all listeners and close out the room. A host removes the whole room
// (which signals every client to disconnect); a client removes only its own
// player slot (so the host sees it leave).
export function onlineTeardown() {
  detach(serverSubs);
  detach(clientSubs);
  if (config) {
    if (config.isHost) {
      const code = config.code;
      // ORDER MATTERS. privateNet is a sibling of rooms, so deleting the room
      // doesn't take it with it — it has to go explicitly or every player's
      // last hand is left behind. But its write rule authorises us by reading
      // rooms/<code>/host, so once the room is gone that check resolves to
      // null and the delete is REJECTED. Drop privateNet first, then the room.
      remove(ref(db(), `privateNet/${code}`))
        .catch(() => {})
        .then(() => remove(ref(db(), `rooms/${code}`)))
        .catch(() => {});
      // Clean teardown: drop the sweep record (see game/roomCleanup.js).
      forgetHostedRoom();
    } else if (config.uid) {
      remove(ref(db(), `rooms/${config.code}/players/${config.uid}`)).catch(
        () => {},
      );
    }
  }
  serverListeners = {};
  clientListeners = {};
  knownPlayerIds = null;
  // Drop the session too. Leaving it set meant onlineGetRoomCode() kept handing
  // back a dead code, and the reconnect hook reads that on AppState-active to
  // call rejoinRoom — trying to re-add our slot to a room that's already gone.
  config = null;
}

// Clear any stale net channel before a fresh game starts (host only).
export function onlineResetChannel() {
  if (!config?.isHost) return;
  remove(netRef("")).catch(() => {});
  remove(ref(db(), `privateNet/${config.code}`)).catch(() => {});
}
