import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { scale, scaleFont } from "../game/responsive";

// Full-screen pause overlay shown to everyone when a player drops mid-game.
// Rendered as a Modal so it blocks all input to the game underneath until the
// player reconnects or the grace window expires. Counts down to `deadline`
// (a Date.now()-style timestamp the host broadcasts).
function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Two shapes:
//   • Pause (someone else dropped): pass name + deadline → shows a countdown and
//     "waiting…"; host may also pass onEndGame to end early.
//   • Self-disconnect (this device lost its own connection): pass title +
//     message + onRejoin/onLeave → no countdown, buttons to retry or leave.
export default function ReconnectOverlay({
  visible,
  name,
  deadline,
  onEndGame,
  title,
  message,
  onRejoin,
  onLeave,
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!visible || !deadline) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [visible, deadline]);

  if (!visible) return null;

  const remaining = deadline ? deadline - now : 0;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.icon}>⏸️</Text>
          <Text style={styles.title}>{title || "Game Paused"}</Text>
          <Text style={styles.body}>
            {message ? (
              message
            ) : (
              <>
                <Text style={styles.name}>{name || "A player"}</Text> lost
                connection.
              </>
            )}
          </Text>
          <ActivityIndicator
            color="#7fb3ff"
            style={{ marginVertical: scale(12) }}
          />
          {/* Countdown + waiting text only when there's a deadline (pause case). */}
          {deadline ? (
            <>
              <Text style={styles.timer}>{formatRemaining(remaining)}</Text>
              <Text style={styles.hint}>Waiting for them to reconnect…</Text>
            </>
          ) : null}
          {/* Host-only: don't wait out the timer — end the game for everyone. */}
          {onEndGame && (
            <TouchableOpacity
              style={styles.endBtn}
              onPress={onEndGame}
              activeOpacity={0.85}
            >
              <Text style={styles.endBtnText}>End Game</Text>
            </TouchableOpacity>
          )}
          {/* Self-disconnect: retry rejoining or bail out. */}
          {onRejoin && (
            <TouchableOpacity
              style={styles.rejoinBtn}
              onPress={onRejoin}
              activeOpacity={0.85}
            >
              <Text style={styles.rejoinBtnText}>Rejoin</Text>
            </TouchableOpacity>
          )}
          {onLeave && (
            <TouchableOpacity
              style={styles.leaveBtn}
              onPress={onLeave}
              activeOpacity={0.85}
            >
              <Text style={styles.leaveBtnText}>Leave</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8, 6, 24, 0.82)",
    alignItems: "center",
    justifyContent: "center",
    padding: scale(24),
  },
  card: {
    backgroundColor: "#141a24",
    borderRadius: scale(20),
    borderWidth: 1.5,
    borderColor: "#2c3750",
    paddingVertical: scale(24),
    paddingHorizontal: scale(28),
    alignItems: "center",
    minWidth: scale(240),
  },
  icon: {
    fontSize: scaleFont(34),
    marginBottom: scale(6),
  },
  title: {
    color: "#f5f7fb",
    fontSize: scaleFont(22),
    fontWeight: "900",
  },
  body: {
    color: "#c4c4d4",
    fontSize: scaleFont(15),
    textAlign: "center",
    marginTop: scale(6),
  },
  name: {
    color: "#7fb3ff",
    fontWeight: "800",
  },
  timer: {
    color: "#ffffff",
    fontSize: scaleFont(30),
    fontWeight: "900",
    letterSpacing: 1,
  },
  hint: {
    color: "#8a96ac",
    fontSize: scaleFont(13),
    marginTop: scale(4),
  },
  endBtn: {
    marginTop: scale(18),
    borderWidth: 1.5,
    borderColor: "#e94560",
    borderRadius: scale(10),
    paddingVertical: scale(10),
    paddingHorizontal: scale(24),
  },
  endBtnText: {
    color: "#e94560",
    fontSize: scaleFont(15),
    fontWeight: "800",
  },
  rejoinBtn: {
    marginTop: scale(6),
    backgroundColor: "#2e9e54",
    borderRadius: scale(10),
    paddingVertical: scale(12),
    paddingHorizontal: scale(36),
  },
  rejoinBtnText: {
    color: "#fff",
    fontSize: scaleFont(16),
    fontWeight: "800",
  },
  leaveBtn: {
    marginTop: scale(10),
    paddingVertical: scale(8),
    paddingHorizontal: scale(24),
  },
  leaveBtnText: {
    color: "#8a96ac",
    fontSize: scaleFont(14),
    fontWeight: "700",
  },
});
