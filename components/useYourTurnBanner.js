import { useEffect, useRef, useState } from "react";
import { hapticImpact, HapticStyle } from "../game/haptics";

// Flash the "Your Turn!" banner for ~1.5s whenever the turn flips TO the local
// player. `active` gates it (e.g. only during the playing phase, not on the
// results screen). Returns the `visible` flag to pass to <YourTurnBanner/>.
//
// Usage (call with the other hooks, ABOVE any early return):
//   const showTurnBanner = useYourTurnBanner(isMyTurn, phase === "playing");
//   ...
//   <YourTurnBanner visible={showTurnBanner} />
export default function useYourTurnBanner(isMyTurn, active = true) {
  const [visible, setVisible] = useState(false);
  const prevRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (active && isMyTurn && !prevRef.current) {
      // Turn just became mine → flash the banner for ~1.5s + a soft nudge.
      setVisible(true);
      hapticImpact(HapticStyle.Light);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setVisible(false);
      }, 1500);
    } else if (!isMyTurn || !active) {
      // No longer my turn → hide immediately so it never lingers into an
      // opponent's turn (don't wait out the timer).
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setVisible(false);
    }
    prevRef.current = isMyTurn;
  }, [isMyTurn, active]);

  // Clear the pending hide-timer on unmount.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return visible;
}
