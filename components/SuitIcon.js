import React from "react";
import Svg, { Path } from "react-native-svg";

// Real vector card-suit icons, replacing the Unicode glyphs (♠♦♥♣) that
// rendered inconsistently across Android manufacturers' emoji fonts.
// Hand-built paths on a 24x24 grid — standard icon-grid geometry (heart/spade
// mirror each other's top lobes, club is a three-circle trefoil, diamond is
// a softened rhombus). Not pulled from any icon library, so no attribution
// needed; these are generic geometric shapes, same as the suits themselves.
//
// NOTE: authored without on-device rendering — the shapes are geometrically
// reasoned, not screenshot-verified. Flag if any suit looks off once built.
const PATHS = {
  spade:
    "M12,2 C12,2 4,10 4,15 C4,17.76 6.24,20 9,20 C10.19,20 11.27,19.57 12,18.87 C11.5,20.5 10,21.5 8,22 L16,22 C14,21.5 12.5,20.5 12,18.87 C12.73,19.57 13.81,20 15,20 C17.76,20 20,17.76 20,15 C20,10 12,2 12,2 Z",
  diamond:
    "M12,2 C13,2 20,10.5 20,12 C20,13.5 13,22 12,22 C11,22 4,13.5 4,12 C4,10.5 11,2 12,2 Z",
  heart:
    "M12,21.35 L10.55,20.03 C5.4,15.36 2,12.28 2,8.5 C2,5.42 4.42,3 7.5,3 C9.24,3 10.91,3.81 12,5.09 C13.09,3.81 14.76,3 16.5,3 C19.58,3 22,5.42 22,8.5 C22,12.28 18.6,15.36 13.45,20.04 L12,21.35 Z",
  club: "M12,3 C9.79,3 8,4.79 8,7 C8,7.68 8.17,8.31 8.46,8.87 C7.6,8.35 6.6,8.05 5.5,8.05 C3.29,8.05 1.5,9.84 1.5,12.05 C1.5,14.26 3.29,16.05 5.5,16.05 C6.83,16.05 8,15.4 8.74,14.4 C8.5,15.5 8,16.5 7,17.5 L9,19.5 L12,17 L15,19.5 L17,17.5 C16,16.5 15.5,15.5 15.26,14.4 C16,15.4 17.17,16.05 18.5,16.05 C20.71,16.05 22.5,14.26 22.5,12.05 C22.5,9.84 20.71,8.05 18.5,8.05 C17.4,8.05 16.4,8.35 15.54,8.87 C15.83,8.31 16,7.68 16,7 C16,4.79 14.21,3 12,3 Z",
};

// `suit`: "spade" | "diamond" | "heart" | "club". Falls back to nothing
// (renders an empty Svg) for an unknown id rather than crashing a tile.
export default function SuitIcon({ suit, size = 24, color = "#ffffff" }) {
  const d = PATHS[suit];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {d && <Path d={d} fill={color} />}
    </Svg>
  );
}
