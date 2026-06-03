import { useWindowDimensions } from "react-native";

// Aspect-ratio-aware layout hook (see RESPONSIVE_LAYOUT_PLAN.md).
// Returns the live width/height plus a coarse `mode`:
//   - "wide"     : clearly landscape-ish (ratio > 1.2)
//   - "tall"     : clearly portrait-ish (ratio < 0.85)
//   - "balanced" : square-ish, e.g. a Fold unfolded (between the two)
// Because it reads useWindowDimensions(), it re-runs on rotate AND fold/unfold,
// so layouts recompute automatically. Call it like any hook — above all early
// returns (CLAUDE.md §2.1).
export function useLayoutMode() {
  const { width, height } = useWindowDimensions();
  const ratio = width / height;
  let mode = "balanced";
  if (ratio > 1.2) mode = "wide";
  else if (ratio < 0.85) mode = "tall";
  return { width, height, mode };
}
