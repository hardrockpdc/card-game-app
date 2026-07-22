import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import ReconnectOverlay from "./ReconnectOverlay";
import { rejoinRoom, markHostConnected } from "../game/onlineRoom";
import { onlineGetRoomCode, onlineWatchHostConnected } from "../game/onlineTransport";

// Shared mid-game reconnect handling for online multiplayer. A drop is treated
// as "away", not "left":
//
// Phase 1 — a CLIENT backgrounding and returning:
//   HOST   detects a player leave  -> pause everyone + countdown (PAUSE true).
//          detects that player back -> resume + re-send state     (PAUSE false).
//          countdown expires        -> end the game               (GAME_OVER_DISCONNECT).
//   CLIENT returns to foreground    -> rejoinRoom() re-adds its slot (which the
//          host sees as a rejoin), and reacts to the host's PAUSE messages.
//
// Phase 2 — the HOST backgrounding and returning:
//   HOST   drops   -> its onDisconnect sets room `hostConnected=false` server-side
//          returns -> markHostConnected() flips it back true + resendState().
//   CLIENT watches room `hostConnected` (the host can't broadcast while asleep):
//          false -> pause ("The host lost connection") + grace countdown;
//          true  -> resume; countdown expires -> leave (onHostEnded).
//
// The game screen owns its own state + networking; it just calls the handlers
// this hook returns at the right spots and renders `overlay`.
//
// Intentional quit vs accidental drop:
//   - A client that taps "Quit" sends the host a LEAVE message BEFORE tearing
//     down. The host routes it to hostHandleClientQuit(id) → treats it as a
//     deliberate departure (no pause) and calls onPlayerGone(id, name, true).
//   - A slot vanishing WITHOUT a LEAVE is an accidental drop → pause + countdown;
//     if the countdown expires, onPlayerGone(id, name, false).
//   The screen owns onPlayerGone and decides whether the game ends or the player
//   is removed and play continues (Card Night: end at ≤3 players, remove at ≥4).
//   During a pause the host can also tap "End Game" on the overlay → onEndGame.
//
// Usage:
//   const rc = useOnlineReconnect({ role, graceMs, getPlayerName, isRealPlayer,
//     broadcast, resendState, onPlayerGone, onEndGame, onHostEnded });
//   host  setServerListeners: onClientLeft: ({id}) => rc.hostHandleClientLeft(id)
//                             onClientJoined: ({id}) => rc.hostHandleClientJoined(id)
//         onMessage: (msg, id) => { if (msg.type === "LEAVE") return rc.hostHandleClientQuit(id); ... }
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
  onPlayerGone, // (id, name, intentional) => void — a player left for good; screen ends or removes
  onEndGame, // (name) => void — host tapped "End Game" on the pause overlay
  // Client-only:
  onHostEnded, // (name) => void — host ended the game after a drop
} = {}) {
  const isHost = role === "host";
  const isClient = role === "client";

  const [pause, setPause] = useState(null); // { name, deadline } | null
  const pausedRef = useRef(false);
  const timerRef = useRef(null);
  const waitingForRef = useRef(null); // host: which player id we're paused on
  const hostAwayRef = useRef(false); // client: currently paused because host dropped
  const hostGraceRef = useRef(null); // client: host-away grace timer

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
        const goneId = waitingForRef.current;
        waitingForRef.current = null;
        setPaused(null);
        // Resume everyone else; the screen (onPlayerGone) then either ends the
        // game or removes the player and continues.
        broadcast?.({ type: "PAUSE", paused: false });
        const goneName = getPlayerName ? getPlayerName(goneId) : "A player";
        onPlayerGone?.(goneId, goneName, false);
      }, graceMs);
    },
    [isHost, isRealPlayer, getPlayerName, graceMs, broadcast, onPlayerGone, setPaused],
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

  // ── Host: a client tapped "Quit" (LEAVE message) → deliberate departure ──────
  // No pause. If we happened to already be paused waiting on this same player
  // (message/slot-removal reorder), clear that pause first, then let the screen
  // decide end-vs-remove.
  const hostHandleClientQuit = useCallback(
    (id) => {
      if (!isHost) return;
      const sid = String(id);
      if (pausedRef.current && waitingForRef.current === sid) {
        clearTimer();
        waitingForRef.current = null;
        setPaused(null);
        broadcast?.({ type: "PAUSE", paused: false });
      }
      const name = getPlayerName ? getPlayerName(sid) : "A player";
      onPlayerGone?.(sid, name, true);
    },
    [isHost, getPlayerName, broadcast, onPlayerGone, setPaused],
  );

  // ── Host: tapped "End Game" on the pause overlay → stop waiting, end for all ─
  const hostEndGameDuringPause = useCallback(() => {
    if (!isHost || !pausedRef.current) return;
    const name =
      waitingForRef.current && getPlayerName
        ? getPlayerName(waitingForRef.current)
        : "A player";
    clearTimer();
    waitingForRef.current = null;
    setPaused(null);
    broadcast?.({ type: "GAME_OVER_DISCONNECT", name });
    onEndGame?.(name);
  }, [isHost, getPlayerName, broadcast, onEndGame, setPaused]);

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

  // ── Host: on returning to the foreground, mark ourselves reconnected (flips
  //    room hostConnected back to true so clients resume) and re-send state so
  //    everyone resyncs. No-op in local mode (no room code). ──────────────────
  useEffect(() => {
    if (!isHost) return undefined;
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;
      const code = onlineGetRoomCode();
      if (!code) return;
      markHostConnected(code)
        .then(() => resendState?.())
        .catch(() => {});
    });
    return () => sub.remove();
  }, [isHost, resendState]);

  // ── Client: watch the room's hostConnected flag. The host can't broadcast a
  //    PAUSE while its phone is asleep, so a host drop is detected by reading the
  //    room record directly. false -> pause + grace countdown; true (or absent)
  //    -> resume. If the host stays away past the grace window, leave. ──────────
  const clearHostGrace = () => {
    if (hostGraceRef.current) {
      clearTimeout(hostGraceRef.current);
      hostGraceRef.current = null;
    }
  };
  useEffect(() => {
    if (!isClient) return undefined;
    const unsub = onlineWatchHostConnected((connected) => {
      if (connected === false) {
        if (hostAwayRef.current) return; // already paused on the host
        hostAwayRef.current = true;
        const deadline = Date.now() + graceMs;
        setPaused({ name: "The host", deadline });
        clearHostGrace();
        hostGraceRef.current = setTimeout(() => {
          clearHostGrace();
          hostAwayRef.current = false;
          setPaused(null);
          onHostEnded?.("The host");
        }, graceMs);
      } else {
        // true or null (absent flag → treat as connected)
        if (!hostAwayRef.current) return;
        hostAwayRef.current = false;
        clearHostGrace();
        setPaused(null);
      }
    });
    return () => {
      if (typeof unsub === "function") unsub();
      clearHostGrace();
    };
  }, [isClient, graceMs, onHostEnded, setPaused]);

  useEffect(() => () => {
    clearTimer();
    clearHostGrace();
  }, []);

  const overlay = (
    <ReconnectOverlay
      visible={!!pause}
      name={pause?.name}
      deadline={pause?.deadline}
      // Only the host, and only during a real pause, gets the "End Game" action.
      onEndGame={isHost && pause ? hostEndGameDuringPause : undefined}
    />
  );

  return {
    pausedRef,
    overlay,
    hostHandleClientLeft,
    hostHandleClientJoined,
    hostHandleClientQuit,
    clientHandleMessage,
  };
}
