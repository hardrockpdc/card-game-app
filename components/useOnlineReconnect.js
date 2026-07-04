import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import ReconnectOverlay from "./ReconnectOverlay";
import { rejoinRoom } from "../game/onlineRoom";
import { onlineGetRoomCode } from "../game/onlineTransport";

// Shared mid-game reconnect handling for online multiplayer (Phase 1: a CLIENT
// backgrounding and returning). A drop is treated as "away", not "left":
//
//   HOST   detects a player leave  -> pause everyone + countdown (PAUSE true).
//          detects that player back -> resume + re-send state     (PAUSE false).
//          countdown expires        -> end the game               (GAME_OVER_DISCONNECT).
//   CLIENT returns to foreground    -> rejoinRoom() re-adds its slot (which the
//          host sees as a rejoin), and reacts to the host's PAUSE messages.
//
// The game screen owns its own state + networking; it just calls the handlers
// this hook returns at the right spots and renders `overlay`.
//
// Usage:
//   const rc = useOnlineReconnect({ role, graceMs, getPlayerName, isRealPlayer,
//     broadcast, resendState, onGraceExpired, onHostEnded });
//   host  setServerListeners: onClientLeft: ({id}) => rc.hostHandleClientLeft(id)
//                             onClientJoined: ({id}) => rc.hostHandleClientJoined(id)
//   client setClientListeners onMessage: (msg) => { if (rc.clientHandleMessage(msg)) return; ... }
//   actions: if (rc.pausedRef.current) return;   render: {rc.overlay}
const DEFAULT_GRACE_MS = 60000;

export default function useOnlineReconnect({
  role, // "host" | "client" | undefined (single-player)
  graceMs = DEFAULT_GRACE_MS,
  // Host-only:
  getPlayerName, // (id) => string
  isRealPlayer, // (id) => bool  — exclude AI / the host itself / unknowns
  broadcast, // (msg) => void  — broadcastToClients
  resendState, // () => void    — re-broadcast current GAME_STATE + private hands
  onGraceExpired, // (name) => void — end the game
  // Client-only:
  onHostEnded, // (name) => void — host ended the game after a drop
} = {}) {
  const isHost = role === "host";
  const isClient = role === "client";

  const [pause, setPause] = useState(null); // { name, deadline } | null
  const pausedRef = useRef(false);
  const timerRef = useRef(null);
  const waitingForRef = useRef(null); // host: which player id we're paused on

  const setPaused = useCallback((next) => {
    pausedRef.current = !!next;
    setPause(next);
  }, []);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // ── Host: a player dropped → pause + countdown ──────────────────────────────
  const hostHandleClientLeft = useCallback(
    (id) => {
      if (!isHost || pausedRef.current) return;
      if (isRealPlayer && !isRealPlayer(id)) return;
      const name = getPlayerName ? getPlayerName(id) : "A player";
      const deadline = Date.now() + graceMs;
      waitingForRef.current = String(id);
      setPaused({ name, deadline });
      // One PAUSE message carrying a boolean (not separate PAUSE/RESUME types):
      // its single broadcast slot always holds the latest value, so a client
      // reconnecting can't replay a stale pause and get stuck.
      broadcast?.({ type: "PAUSE", paused: true, name, deadline });
      clearTimer();
      timerRef.current = setTimeout(() => {
        clearTimer();
        waitingForRef.current = null;
        setPaused(null);
        broadcast?.({ type: "GAME_OVER_DISCONNECT", name });
        onGraceExpired?.(name);
      }, graceMs);
    },
    [isHost, isRealPlayer, getPlayerName, graceMs, broadcast, onGraceExpired, setPaused],
  );

  // ── Host: the awaited player returned → resume + re-send state ──────────────
  const hostHandleClientJoined = useCallback(
    (id) => {
      if (!isHost || !pausedRef.current) return;
      if (waitingForRef.current && String(id) !== waitingForRef.current) return;
      clearTimer();
      waitingForRef.current = null;
      setPaused(null);
      broadcast?.({ type: "PAUSE", paused: false });
      resendState?.(); // make sure the reconnected client gets the current state
    },
    [isHost, broadcast, resendState, setPaused],
  );

  // ── Client: react to the host's pause/resume control messages ──────────────
  const clientHandleMessage = useCallback(
    (msg) => {
      if (!isClient || !msg) return false;
      if (msg.type === "PAUSE") {
        setPaused(msg.paused ? { name: msg.name, deadline: msg.deadline } : null);
        return true;
      }
      if (msg.type === "GAME_OVER_DISCONNECT") {
        setPaused(null);
        onHostEnded?.(msg.name);
        return true;
      }
      return false;
    },
    [isClient, onHostEnded, setPaused],
  );

  // ── Client: on returning to the foreground, re-add our slot so the host can
  //    detect the reconnect and resume. No-op in local mode (no room code). ────
  useEffect(() => {
    if (!isClient) return undefined;
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;
      const code = onlineGetRoomCode();
      if (code) rejoinRoom(code).catch(() => {});
    });
    return () => sub.remove();
  }, [isClient]);

  useEffect(() => () => clearTimer(), []);

  const overlay = (
    <ReconnectOverlay
      visible={!!pause}
      name={pause?.name}
      deadline={pause?.deadline}
    />
  );

  return {
    pausedRef,
    overlay,
    hostHandleClientLeft,
    hostHandleClientJoined,
    clientHandleMessage,
  };
}
