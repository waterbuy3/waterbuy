import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId:   "com.aquapure.waterdelivery",   // Change to your reverse-domain ID
  appName: "AquaPure",
  webDir:  "dist/client",                  // TanStack Start's client output
  server: {
    // Remove this block before building for Play Store release
    // url: "http://192.168.0.27:8082",    // for live-reload during dev
    // cleartext: true,
  },
  android: {
    buildOptions: {
      releaseType: "AAB",
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration:    2000,
      launchAutoHide:        true,
      backgroundColor:       "#1a6fd4",
      androidSplashResourceName: "splash",
      showSpinner:           false,
    },
    StatusBar: {
      style:           "LIGHT",
      backgroundColor: "#1a6fd4",
    },
    Keyboard: {
      resize:         "body",
      style:          "DARK",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
