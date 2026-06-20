import * as ImageManipulator from "expo-image-manipulator";

// Produce a network-transmittable version of a player's profile picture so other
// devices can render it:
//   - "avatar" presets are already tiny (just an id) → sent as-is
//   - "custom" photos are a local file URI (useless to others) → resized small
//     and base64-encoded into a data URI that ProfileAvatar can render directly
// Returns { photoType, photoValue } or null (→ name-initial fallback).
export async function toTransmittableAvatar(profile) {
  if (!profile) return null;
  if (profile.photoType === "avatar" && profile.photoValue) {
    return { photoType: "avatar", photoValue: profile.photoValue };
  }
  if (profile.photoType === "custom" && profile.photoValue) {
    try {
      const result = await ImageManipulator.manipulateAsync(
        profile.photoValue,
        [{ resize: { width: 120 } }],
        {
          compress: 0.6,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        },
      );
      if (result?.base64) {
        return {
          photoType: "custom",
          photoValue: `data:image/jpeg;base64,${result.base64}`,
        };
      }
    } catch (_) {
      // fall through to null (name-initial fallback)
    }
  }
  return null;
}
