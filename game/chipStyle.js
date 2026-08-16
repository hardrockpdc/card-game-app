// Shared poker-chip bevel/spot geometry — one realistic-chip renderer used by
// both profile frames (game/frames.js, the chip family) and Blackjack's bet
// picker (components/BettingChip.js), so a chip looks the same wherever it
// appears and only has to be built once.

// Lightens (positive percent) or darkens (negative) a 6-digit hex color by
// blending toward white/black. Used to derive a chip's bevel gradient stops
// from its single base color, so each chip only has to define one color.
export function shadeColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  if (percent >= 0) {
    r += (255 - r) * percent;
    g += (255 - g) * percent;
    b += (255 - b) * percent;
  } else {
    r *= 1 + percent;
    g *= 1 + percent;
    b *= 1 + percent;
  }
  const clamp = (v) => Math.round(Math.min(255, Math.max(0, v)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

const SPOT_COUNT = 8;

// Poker-chip geometry for a face of pixel `size` (the innermost content
// circle — an avatar, or a bet-amount label). A real chip has three
// concentric zones, so this builds two nested rings around the face:
//   outer ring (rimWidth)   — spotted, diagonal bevel gradient (bodyGradient)
//   inner ring (inlayWidth) — plain, a lighter tint (inlayColor), no spots
//   face                    — whatever the caller renders inside
// Both `chipSize` (outer diameter) and `inlaySize` (the boundary between the
// two rings) are returned so the caller can nest them; the 8 edge spots are
// positioned (by plain trig, no SVG) on the OUTER ring's midline only, not
// spanning the whole body.
export function buildChipStyle({ size, color, spotColor, glow = false }) {
  const rimWidth = Math.max(3, Math.round(size * 0.1));
  const inlayWidth = Math.max(2, Math.round(size * 0.06));
  const bodyWidth = rimWidth + inlayWidth;
  const chipSize = size + bodyWidth * 2;
  const chipRadius = chipSize / 2;
  const inlaySize = size + inlayWidth * 2;

  const spotWidth = Math.max(2, Math.round(size * 0.045));
  const spotLength = Math.round(rimWidth * 0.85);
  // Spots sit centered on the OUTER ring's midline only — half hangs over
  // the outer edge, half over the rim/inlay boundary — reads as notches cut
  // into the rim, not the whole chip body.
  const spotDistance = chipRadius - rimWidth / 2;

  const spots = [];
  for (let i = 0; i < SPOT_COUNT; i++) {
    const angleDeg = (360 / SPOT_COUNT) * i;
    const angleRad = (angleDeg * Math.PI) / 180;
    const cx = chipRadius + spotDistance * Math.cos(angleRad);
    const cy = chipRadius + spotDistance * Math.sin(angleRad);
    spots.push({
      left: Math.round(cx - spotWidth / 2),
      top: Math.round(cy - spotLength / 2),
      width: spotWidth,
      height: spotLength,
      rotate: `${angleDeg + 90}deg`,
    });
  }

  const chip = {
    chipSize,
    inlaySize,
    color,
    spotColor,
    spots,
    // Diagonal bevel for the outer ring: lightened corner -> base -> darkened.
    bodyGradient: [shadeColor(color, 0.3), color, shadeColor(color, -0.35)],
    // The inlay ring is a flat, slightly darker tint — reads as a distinct
    // inner band, not just more of the same bevel.
    inlayColor: shadeColor(color, -0.15),
    edgeColor: shadeColor(color, -0.55),
  };
  if (glow) {
    chip.shadowColor = color;
    chip.shadowOpacity = 0.9;
    chip.shadowRadius = rimWidth * 1.4;
    chip.shadowOffset = { width: 0, height: 0 };
    chip.elevation = 8;
  }
  return chip;
}
