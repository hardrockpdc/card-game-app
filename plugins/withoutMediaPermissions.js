// Custom Expo config plugin that physically removes photo/media permissions
// from the generated AndroidManifest.
//
// Why: expo-image-picker's config plugin injects READ_MEDIA_IMAGES directly
// into the app's own manifest. Google Play flags that permission for non-gallery
// apps, and `android.blockedPermissions` (which just adds tools:node="remove")
// does NOT reliably strip a same-manifest entry. Card Night only uses the
// Android system photo picker for profile pictures, which needs no permission —
// so we delete these outright, after all other plugins have run.
const { withAndroidManifest } = require("@expo/config-plugins");

const BLOCKED = [
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
  "android.permission.READ_EXTERNAL_STORAGE",
];

module.exports = function withoutMediaPermissions(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    if (Array.isArray(manifest["uses-permission"])) {
      manifest["uses-permission"] = manifest["uses-permission"].filter(
        (perm) => !BLOCKED.includes(perm?.$?.["android:name"]),
      );
    }
    // Also drop maxSdkVersion-scoped duplicates if present.
    if (Array.isArray(manifest["uses-permission-sdk-23"])) {
      manifest["uses-permission-sdk-23"] = manifest[
        "uses-permission-sdk-23"
      ].filter((perm) => !BLOCKED.includes(perm?.$?.["android:name"]));
    }
    return cfg;
  });
};
