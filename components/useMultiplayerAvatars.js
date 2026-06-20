import { useEffect, useRef, useState } from "react";
import { broadcastToClients, sendToHost } from "../game/GameNetwork";
import { getCachedProfile } from "../game/profile";
import { AVATAR_CHOICES } from "../game/avatars";
import { toTransmittableAvatar } from "../game/avatarTransmit";

// Shares players' profile pictures across a multiplayer game so they can be
// rendered in seats / scoreboards / banners. Avatars are exchanged once at game
// start (NOT inside the per-turn state broadcasts, so big custom photos aren't
// re-sent every update):
//   - host seeds its own avatar + the bots' presets and broadcasts AVATARS
//   - each client sends its avatar to the host, which merges + re-broadcasts
//
// Usage in a game screen:
//   const { avatarById, handleHostMessage, handleClientMessage } =
//     useMultiplayerAvatars({ isHost, players: initialPlayers });
//   // host setServerListeners.onMessage: if (handleHostMessage(msg, id)) return;
//   // client setClientListeners.onMessage: if (handleClientMessage(msg)) return;
//   // render: <ProfileAvatar profile={avatarById[String(p.id)]} name={p.name} />
export default function useMultiplayerAvatars({ isHost, players }) {
  const [avatarById, setAvatarById] = useState({});
  const ref = useRef({});

  const merge = (updates) => {
    ref.current = { ...ref.current, ...updates };
    setAvatarById(ref.current);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mine = await toTransmittableAvatar(getCachedProfile());
      if (cancelled) return;
      if (isHost) {
        const seed = {};
        if (mine) seed["host"] = mine;
        (players || [])
          .filter((p) => p.isAI)
          .forEach((p, i) => {
            seed[String(p.id)] = {
              photoType: "avatar",
              photoValue:
                AVATAR_CHOICES[(i * 7 + 3) % AVATAR_CHOICES.length].id,
            };
          });
        merge(seed);
        broadcastToClients({ type: "AVATARS", map: ref.current });
      } else {
        sendToHost({ type: "AVATAR", avatar: mine });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Host: call from setServerListeners.onMessage. Returns true if it handled it.
  const handleHostMessage = (msg, clientId) => {
    if (msg?.type !== "AVATAR") return false;
    merge({ [String(clientId)]: msg.avatar ?? null });
    broadcastToClients({ type: "AVATARS", map: ref.current });
    return true;
  };

  // Client: call from setClientListeners.onMessage. Returns true if handled.
  const handleClientMessage = (msg) => {
    if (msg?.type !== "AVATARS") return false;
    ref.current = msg.map ?? {};
    setAvatarById(ref.current);
    return true;
  };

  return { avatarById, handleHostMessage, handleClientMessage };
}
