import TcpSocket from 'react-native-tcp-socket';
import UdpSocket from 'react-native-udp';

const PORT = 7777;
const DISCOVERY_PORT = 7778;
const BROADCAST_MS = 2000;

// ─── Server state ─────────────────────────────────────────────────────────────
let server = null;
const clients = new Map();     // clientId -> socket
const playerNames = new Map(); // clientId -> name (auto-populated from JOIN messages)
let nextClientId = 1;

// Mutable listener object — any screen can call setServerListeners() to take over.
// Using a wrapper object so the socket closures always reference the latest version.
let serverListeners = {};

export function setServerListeners(listeners) {
  serverListeners = listeners || {};
}

export function startServer() {
  if (server) return;

  server = TcpSocket.createServer((socket) => {
    const id = nextClientId++;
    clients.set(id, socket);
    serverListeners.onClientJoined?.({ id });

    socket.on('data', (data) => {
      data.toString().split('\n').forEach((line) => {
        if (!line.trim()) return;
        try {
          const msg = JSON.parse(line);
          // Auto-store player name whenever a JOIN message arrives
          if (msg.type === 'JOIN' && msg.name) {
            playerNames.set(id, msg.name);
          }
          serverListeners.onMessage?.(msg, id);
        } catch (_) {}
      });
    });

    const handleClose = () => {
      clients.delete(id);
      playerNames.delete(id);
      serverListeners.onClientLeft?.({ id });
    };
    socket.on('close', handleClose);
    socket.on('error', handleClose);
  });

  server.listen({ port: PORT, host: '0.0.0.0' }, () => {
    console.log(`[GameNetwork] Server listening on port ${PORT}`);
  });

  server.on('error', (err) => {
    console.log('[GameNetwork] Server error:', err.message);
  });
}

export function stopServer() {
  if (!server) return;
  clients.forEach((socket) => socket.destroy());
  clients.clear();
  playerNames.clear();
  server.close();
  server = null;
  nextClientId = 1;
  serverListeners = {};
}

export function broadcastToClients(message) {
  const data = JSON.stringify(message) + '\n';
  clients.forEach((socket) => socket.write(data));
}

export function sendToClient(clientId, message) {
  const socket = clients.get(clientId);
  if (socket) socket.write(JSON.stringify(message) + '\n');
}

export function getClientCount() {
  return clients.size;
}

// Returns [{ id, name }, ...] for every currently connected client
export function getConnectedPlayers() {
  const result = [];
  clients.forEach((_, id) => {
    result.push({ id, name: playerNames.get(id) || `Player ${id}` });
  });
  return result;
}

// ─── Client state ─────────────────────────────────────────────────────────────
let clientSocket = null;

// Mutable listener object — connectToHost sets the initial one,
// then LobbyScreen calls setClientListeners() to take over.
let clientListeners = {};

export function setClientListeners(listeners) {
  clientListeners = listeners || {};
}

export function connectToHost(ip, callbacks) {
  if (clientSocket) return;

  // Store the initial callbacks so the socket closures always call the latest version
  clientListeners = callbacks || {};

  clientSocket = TcpSocket.createConnection({ port: PORT, host: ip }, () => {
    clientListeners.onConnected?.();
  });

  clientSocket.on('data', (data) => {
    data.toString().split('\n').forEach((line) => {
      if (!line.trim()) return;
      try {
        clientListeners.onMessage?.(JSON.parse(line));
      } catch (_) {}
    });
  });

  clientSocket.on('close', () => {
    clientSocket = null;
    clientListeners.onDisconnected?.();
  });

  clientSocket.on('error', (err) => {
    clientSocket = null;
    clientListeners.onError?.(err.message || 'Connection failed');
  });
}

export function sendToHost(message) {
  if (clientSocket) clientSocket.write(JSON.stringify(message) + '\n');
}

export function disconnectFromHost() {
  if (clientSocket) {
    clientSocket.destroy();
    clientSocket = null;
  }
  clientListeners = {};
}

// ─── Game discovery (UDP broadcast) ──────────────────────────────────────────
// Host broadcasts "I'm here" every 2 s so clients can find the game automatically.

let broadcastSocket = null;
let broadcastTimer = null;

export function startBroadcasting(hostName, hostIp) {
  if (broadcastSocket) return;

  // Derive subnet broadcast address (e.g. 192.168.1.5 → 192.168.1.255)
  const parts = hostIp.split('.');
  const broadcastAddr = `${parts[0]}.${parts[1]}.${parts[2]}.255`;

  broadcastSocket = UdpSocket.createSocket({ type: 'udp4' });

  broadcastSocket.bind(0, () => {
    broadcastSocket.setBroadcast(true);

    const payload = new TextEncoder().encode(JSON.stringify({ type: 'CARD_GAME', name: hostName }));

    const send = () => {
      broadcastSocket?.send(payload, 0, payload.length, DISCOVERY_PORT, broadcastAddr, (err) => {
        if (err) console.log('[Broadcast] send error:', err.message);
      });
    };

    send();
    broadcastTimer = setInterval(send, BROADCAST_MS);
  });

  broadcastSocket.on('error', (err) => {
    console.log('[Broadcast] socket error:', err.message);
  });
}

export function stopBroadcasting() {
  if (broadcastTimer) { clearInterval(broadcastTimer); broadcastTimer = null; }
  if (broadcastSocket) {
    try { broadcastSocket.close(); } catch (_) {}
    broadcastSocket = null;
  }
}

let discoverySocket = null;

export function startDiscovery(onGameFound) {
  if (discoverySocket) return;

  discoverySocket = UdpSocket.createSocket({ type: 'udp4' });

  discoverySocket.bind(DISCOVERY_PORT, () => {
    discoverySocket.setBroadcast(true);
    console.log('[Discovery] Listening on port', DISCOVERY_PORT);
  });

  discoverySocket.on('message', (data, rinfo) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'CARD_GAME') {
        onGameFound({ name: msg.name, ip: rinfo.address });
      }
    } catch (_) {}
  });

  discoverySocket.on('error', (err) => {
    console.log('[Discovery] socket error:', err.message);
  });
}

export function stopDiscovery() {
  if (discoverySocket) {
    try { discoverySocket.close(); } catch (_) {}
    discoverySocket = null;
  }
}
