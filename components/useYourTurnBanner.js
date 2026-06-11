import { useEffect, useRef, useState } from "react";

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
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setVisible(false);
      }, 1500);
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
