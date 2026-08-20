import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { scale, scaleFont } from "../game/responsive";

// Annotated screenshot for the How-to screen. Shows a captured game screenshot
// with numbered callout dots overlaid at percentage positions. The numbered
// control list rendered below it (the screen's IN_APP_CONTROLS) is the legend —
// dot #1 lines up with control #1, etc.
//
//   <HowToShot
//     source={require("../assets/howto/gofish.png")}
//     caption="On your turn…"
//     accent="#1565c0"
//     markers={[{ x: 50, y: 88 }, { x: 20, y: 30 }]}
//   />
//
// x/y are 0–100 percentages of the image box (top-left origin). The image keeps
// its real aspect ratio (read from the asset) so the markers line up; a max
// height keeps tall portrait shots reasonable.
const MAX_SHOT_HEIGHT = scale(440);

export default function HowToShot({ source, caption, markers = [], accent }) {
  const meta = source ? Image.resolveAssetSource(source) : null;
  const aspect =
    meta && meta.width && meta.height ? meta.width / meta.height : 0.5;

  return (
    <View style={styles.wrap}>
      <View style={[styles.frame, { aspectRatio: aspect, borderColor: accent }]}>
        <Image source={source} style={styles.image} resizeMode="cover" />
        {markers.map((m, i) => (
          <View
            key={`m-${i}`}
            style={[
              styles.marker,
              { left: `${m.x}%`, top: `${m.y}%`, backgroundColor: accent },
            ]}
          >
            <Text style={styles.markerText}>{i + 1}</Text>
          </View>
        ))}
      </View>

      {caption ? <Text style={styles.caption}>{caption}</Text> : null}

      {markers.map((m, i) =>
        m.label ? (
          <View key={`leg-${i}`} style={styles.legendRow}>
            <View style={[styles.legendNum, { backgroundColor: accent }]}>
              <Text style={styles.legendNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.legendText}>{m.label}</Text>
          </View>
        ) : null,
      )}
    </View>
  );
}

const MARKER = scale(26);

const styles = StyleSheet.create({
  wrap: {
    marginTop: scale(10),
    marginBottom: scale(6),
  },
  frame: {
    width: "100%",
    maxHeight: MAX_SHOT_HEIGHT,
    alignSelf: "center",
    borderRadius: scale(12),
    borderWidth: 1.5,
    overflow: "hidden",
    backgroundColor: "#0f1520",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  marker: {
    position: "absolute",
    width: MARKER,
    height: MARKER,
    borderRadius: MARKER / 2,
    borderWidth: 2,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    // Center the dot on its x/y point.
    marginLeft: -MARKER / 2,
    marginTop: -MARKER / 2,
  },
  markerText: {
    color: "#ffffff",
    fontSize: scaleFont(13),
    fontWeight: "900",
  },
  caption: {
    color: "#c4c4d4",
    fontSize: scaleFont(13),
    fontStyle: "italic",
    marginTop: scale(8),
    marginBottom: scale(2),
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
    marginTop: scale(8),
  },
  legendNum: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  legendNumText: {
    color: "#ffffff",
    fontSize: scaleFont(12),
    fontWeight: "900",
  },
  legendText: {
    flex: 1,
    color: "#e6e9f0",
    fontSize: scaleFont(14),
    lineHeight: scaleFont(19),
  },
});
