import { Alert, Platform } from "react-native";
import TcpSocket from "react-native-tcp-socket";
import UdpSocket from "react-native-udp";
import { log, warn } from "./logger";

export const PROTOCOL_VERSION = 1;

const PORT = 7777;
const DISCOVERY_PORT = 7778;
const BROADCAST_MS = 2000;
const IS_WEB = Platform.OS === "web";

// ─── Server state ─────────────────────────────────────────────────────────────
let server = null;
const clients = new Map(); // clientId -> socket
const playerNames = new Map(); // clientId -> name (auto-populated from JOIN messages)
let nextClientId = 1;

// Mutable listener object — any screen can call setServerListeners() to take over.
// Using a wrapper object so the socket closures always reference the latest version.
//
// NOTE: Only one screen can listen at a time. Calling setServerListeners() replaces
// the previous listeners entirely (last-write-wins). If two screens are briefly
// mounted at the same time during navigation, the second will silently take over
// and the first will stop receiving messages.
let serverListeners = {};

export function setServerListeners(listeners) {
  serverListeners = listeners || {};
}

export function startServer() {
  if (IS_WEB || server) return;

  server = TcpSocket.createServer((socket) => {
    const id = nextClientId++;
    clients.set(id, socket);
    serverListeners.onClientJoined?.({ id });

    // Let the client know which numeric id it was assigned on this TCP connection.
    // This prevents the UI from having to guess "me" by player name (which can collide).
    socket.write(
      JSON.stringify({
        type: "ASSIGNED_ID",
        clientId: id,
        protocolVersion: PROTOCOL_VERSION,
      }) + "\n",
    );

    // BUG-6: TCP is a byte stream — a message can arrive split across multiple
    // `data` events, or several messages can arrive in one. Buffer per socket and
    // only parse complete newline-terminated lines, keeping any partial remainder
    // for the next event. Without this, large messages (e.g. full-state broadcasts)
    // fragment, fail JSON.parse, and are silently dropped -> multiplayer desync.
    let buffer = "";
    socket.on("data", (data) => {
      buffer += data.toString();
      let idx;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (!line.trim()) continue;

        // Only the PARSE is swallowed (a partial/garbage line is expected on a
        // byte stream — skip it and keep reading). The message handler runs
        // outside this catch so a real bug in it surfaces in logs (NB-3) instead
        // of being silently eaten, but still can't kill the read loop.
        let msg;
        try {
          msg = JSON.parse(line);
        } catch (_) {
          continue;
        }

        if (msg.protocolVersion !== PROTOCOL_VERSION) {
          socket.write(
            JSON.stringify({
              type: "VERSION_MISMATCH",
              serverVersion: PROTOCOL_VERSION,
              protocolVersion: PROTOCOL_VERSION,
            }) + "\n",
          );
          socket.destroy();
          return;
        }

        // Auto-store player name whenever a JOIN message arrives
        if (msg.type === "JOIN" && msg.name) {
          playerNames.set(id, msg.name);
        }

        try {
          serverListeners.onMessage?.(msg, id);
        } catch (err) {
          warn("[Server] onMessage handler threw:", err);
        }
      }
    });

    const handleClose = () => {
      clients.delete(id);
      playerNames.delete(id);
      serverListeners.onClientLeft?.({ id });
    };
    socket.on("close", handleClose);
    socket.on("error", handleClose);
  });

  server.listen({ port: PORT, host: "0.0.0.0" }, () => {
    log(`[GameNetwork] Server listening on port ${PORT}`);
  });

  server.on("error", (err) => {
    log("[GameNetwork] Server error:", err.message);
  });
}

export function stopServer() {
  if (IS_WEB || !server) return;
  clients.forEach((socket) => socket.destroy());
  clients.clear();
  playerNames.clear();
  server.close();
  server = null;
  nextClientId = 1;
  serverListeners = {};
}

// Writing to a socket that is mid-close (e.g. a client that just disconnected)
// can throw. Guard each write so one dead socket can't abort a broadcast to the
// rest, or crash the host on a stray send.
function safeWrite(socket, data) {
  if (!socket) return;
  try {
    socket.write(data);
  } catch (err) {
    log("[GameNetwork] write failed:", err?.message);
  }
}

export function broadcastToClients(message) {
  if (IS_WEB) return;
  const data =
    JSON.stringify({ ...message, protocolVersion: PROTOCOL_VERSION }) + "\n";
  clients.forEach((socket) => safeWrite(socket, data));
}

export function sendToClient(clientId, message) {
  if (IS_WEB) return;
  safeWrite(
    clients.get(clientId),
    JSON.stringify({ ...message, protocolVersion: PROTOCOL_VERSION }) + "\n",
  );
}

export function getClientCount() {
  return clients.size;
}

// Returns [{ id, name }, ...] for every currently connected client
export function getConnectedPlayers() {
  if (IS_WEB) {
    return [];
  }

  const result = [];
  clients.forEach((_, id) => {
    result.push({ id, name: playerNames.get(id) || `Player ${id}` });
  });
  return result;
}

// ─── Client state ─────────────────────────────────────────────────────────────
let clientSocket = null;
let assignedClientId = null;

export function getAssignedClientId() {
  if (IS_WEB) return null;
  return assignedClientId;
}

// Mutable listener object — connectToHost sets the initial one,
// then LobbyScreen calls setClientListeners() to take over.
let clientListeners = {};

export function setClientListeners(listeners) {
  clientListeners = listeners || {};
}

export function connectToHost(ip, callbacks) {
  if (IS_WEB) {
    callbacks?.onError?.(
      "Local multiplayer is only available in the native app.",
    );
    return;
  }

  if (clientSocket) return;

  // Store the initial callbacks so the socket closures always call the latest version
  clientListeners = callbacks || {};

  clientSocket = TcpSocket.createConnection({ port: PORT, host: ip }, () => {
    clientListeners.onConnected?.();
  });

  // BUG-6: buffer the incoming byte stream and parse only complete lines (see the
  // matching note on the server side). One buffer per connection.
  let buffer = "";
  clientSocket.on("data", (data) => {
    buffer += data.toString();
    let idx;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (!line.trim()) continue;

      // As on the server (NB-3): swallow only the parse of a partial/garbage
      // line; run the message handler outside the catch (with its own logged
      // guard) so a real handler bug surfaces instead of being silently eaten.
      let parsed;
      try {
        parsed = JSON.parse(line);
      } catch (_) {
        continue;
      }

      if (parsed.type === "VERSION_MISMATCH") {
        Alert.alert(
          "Update Required",
          "The host is running a different version of Card Night. Please update your app to join this game.",
          [{ text: "OK" }],
        );
        continue;
      }

      if (parsed.type === "ASSIGNED_ID") {
        assignedClientId = parsed.clientId;
      }

      try {
        clientListeners.onMessage?.(parsed);
      } catch (err) {
        warn("[Client] onMessage handler threw:", err);
      }
    }
  });

  clientSocket.on("close", () => {
    clientSocket = null;
    clientListeners.onDisconnected?.();
  });

  clientSocket.on("error", (err) => {
    clientSocket = null;
    clientListeners.onError?.(err.message || "Connection failed");
  });
}

export function sendToHost(message) {
  if (IS_WEB) return;
  safeWrite(
    clientSocket,
    JSON.stringify({ ...message, protocolVersion: PROTOCOL_VERSION }) + "\n",
  );
}

export function disconnectFromHost() {
  if (IS_WEB) {
    clientListeners = {};
    assignedClientId = null;
    return;
  }

  if (clientSocket) {
    clientSocket.destroy();
    clientSocket = null;
  }
  clientListeners = {};
  assignedClientId = null;
}

// ─── Game discovery (UDP broadcast) ──────────────────────────────────────────
// Host broadcasts "I'm here" every 2 s so clients can find the game automatically.

let broadcastSocket = null;
let broadcastTimer = null;

export function startBroadcasting(hostName, hostIp) {
  if (IS_WEB || broadcastSocket) return;

  const parts = (hostIp || "").split(".");
  const subnetBroadcast =
    parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.255` : null;

  log(`[Broadcast] Starting — hostIp: ${hostIp}, subnet: ${subnetBroadcast}`);

  broadcastSocket = UdpSocket.createSocket({ type: "udp4" });

  broadcastSocket.bind(0, () => {
    broadcastSocket.setBroadcast(true);
    log("[Broadcast] Socket ready");

    const payload = new TextEncoder().encode(
      JSON.stringify({
        type: "CARD_GAME",
        name: hostName,
        protocolVersion: PROTOCOL_VERSION,
      }),
    );

    const sendTo = (addr) => {
      broadcastSocket?.send(
        payload,
        0,
        payload.length,
        DISCOVERY_PORT,
        addr,
        (err) => {
          if (err) log(`[Broadcast] send error (${addr}):`, err.message);
        },
      );
    };

    const send = () => {
      // Always send to global broadcast; also send to subnet broadcast if we have a valid IP
      sendTo("255.255.255.255");
      if (subnetBroadcast) sendTo(subnetBroadcast);
    };

    send();
    broadcastTimer = setInterval(send, BROADCAST_MS);
  });

  broadcastSocket.on("error", (err) => {
    log("[Broadcast] socket error:", err.message);
  });
}

export function stopBroadcasting() {
  if (IS_WEB) return;
  if (broadcastTimer) {
    clearInterval(broadcastTimer);
    broadcastTimer = null;
  }
  if (broadcastSocket) {
    try {
      broadcastSocket.close();
    } catch (_) {}
    broadcastSocket = null;
  }
}

let discoverySocket = null;

export function startDiscovery(onGameFound) {
  if (IS_WEB || discoverySocket) return;

  discoverySocket = UdpSocket.createSocket({ type: "udp4" });

  discoverySocket.bind(DISCOVERY_PORT, () => {
    discoverySocket.setBroadcast(true);
    log("[Discovery] Listening on port", DISCOVERY_PORT);
  });

  discoverySocket.on("message", (data, rinfo) => {
    try {
      const msg = JSON.parse(data.toString());
      if (
        msg.type === "CARD_GAME" &&
        msg.protocolVersion === PROTOCOL_VERSION
      ) {
        onGameFound({ name: msg.name, ip: rinfo.address });
      }
    } catch (_) {}
  });

  discoverySocket.on("error", (err) => {
    log("[Discovery] socket error:", err.message);
  });
}

export function stopDiscovery() {
  if (IS_WEB) return;
  if (discoverySocket) {
    try {
      discoverySocket.close();
    } catch (_) {}
    discoverySocket = null;
  }
}
