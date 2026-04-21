// GameNetwork.js
// Handles all phone-to-phone communication for multiplayer games.
// Uses TCP sockets over local WiFi — works offline via hotspot.

import TcpSocket from 'react-native-tcp-socket';
import * as Network from 'expo-network';

const PORT = 7777; // The "door number" our game uses. Both host and clients use this.

// ==========================
// HOST FUNCTIONS
// ==========================

// Creates a host that listens for incoming player connections.
// onPlayerJoined: function called when a new player connects
// onMessageReceived: function called when a player sends a message
// Returns the server object (needed so we can close it later)
export function startHosting(onPlayerJoined, onMessageReceived) {
  const connectedPlayers = []; // list of connected player sockets

  const server = TcpSocket.createServer((socket) => {
    // A new player just connected!
    console.log('Player connected');
    connectedPlayers.push(socket);
    onPlayerJoined(socket, connectedPlayers.length);

    // Listen for messages from this player
    socket.on('data', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('Received from player:', message);
        onMessageReceived(message, socket);
      } catch (err) {
        console.log('Bad message from player:', err);
      }
    });

    // Handle disconnection
    socket.on('error', (err) => {
      console.log('Socket error:', err);
    });
    socket.on('close', () => {
      console.log('Player disconnected');
      const i = connectedPlayers.indexOf(socket);
      if (i > -1) connectedPlayers.splice(i, 1);
    });
  });

  server.listen({ port: PORT, host: '0.0.0.0' }, () => {
    console.log(`Hosting on port ${PORT}`);
  });

  // Attach a helper so we can broadcast messages to all players later
  server.broadcast = (message) => {
    const text = JSON.stringify(message);
    for (const player of connectedPlayers) {
      player.write(text);
    }
  };

  return server;
}

// Get this phone's local IP address so we can show it to others
export async function getHostIp() {
  try {
    const ip = await Network.getIpAddressAsync();
    return ip;
  } catch (err) {
    return 'unknown';
  }
}

// ==========================
// CLIENT FUNCTIONS
// ==========================

// Connect to a host using their IP address
// onConnected: called when successfully connected
// onMessageReceived: called when host sends a message
// Returns the socket (needed so we can send messages later)
export function connectToHost(hostIp, onConnected, onMessageReceived) {
  const socket = TcpSocket.createConnection(
    { port: PORT, host: hostIp },
    () => {
      console.log('Connected to host!');
      onConnected();
    }
  );

  socket.on('data', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received from host:', message);
      onMessageReceived(message);
    } catch (err) {
      console.log('Bad message from host:', err);
    }
  });

  socket.on('error', (err) => {
    console.log('Connection error:', err);
  });

  // Attach a helper so we can send messages to the host
  socket.sendToHost = (message) => {
    const text = JSON.stringify(message);
    socket.write(text);
  };

  return socket;
}