// Manual Jest mock for @react-native-firebase/app.
// onlineTransport only ever calls getApp() to hand to getDatabase().
export function getApp() {
  return { name: "[DEFAULT]" };
}
