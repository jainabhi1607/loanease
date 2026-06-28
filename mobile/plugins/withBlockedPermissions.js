// Expo config plugin: strip Android storage/media permissions that are
// auto-merged into the manifest by expo-file-system / expo-sharing.
//
// Google Play's Personal Loans policy prohibits loan-facilitator apps from
// declaring these permissions (even with maxSdkVersion limits). Our usage only
// touches scoped internal storage (documentDirectory / cacheDirectory) plus the
// OS share sheet, so none of these are actually required — we remove them via
// the manifest merger's tools:node="remove".
const { AndroidConfig } = require('expo/config-plugins');

// Full set prohibited by Google Play's Personal Loans policy. Only
// READ/WRITE_EXTERNAL_STORAGE are actually injected today (by expo-file-system);
// the rest are blocked defensively so a future dependency update can't silently
// re-introduce a flagged permission and trigger another rejection.
const BLOCKED_PERMISSIONS = [
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_CONTACTS',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.READ_PHONE_NUMBERS',
  'android.permission.QUERY_ALL_PACKAGES',
];

module.exports = function withBlockedPermissions(config) {
  return AndroidConfig.Permissions.withBlockedPermissions(
    config,
    BLOCKED_PERMISSIONS
  );
};
