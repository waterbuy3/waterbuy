// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  vite: {
    server: {
      port: 8080,
    },
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        manifest: false,
        injectRegister: "auto",
        workbox: {
          globPatterns: ["**/*.{js,css,html,png,svg,ico,webmanifest}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/firestore\.googleapis\.com/,
              handler: "NetworkFirst",
              options: {
                cacheName: "firebase-cache",
                networkTimeoutSeconds: 3,
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/firebase\.googleapis\.com/,
              handler: "NetworkFirst",
              options: {
                cacheName: "firebase-auth-cache",
                networkTimeoutSeconds: 3,
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
              handler: "CacheFirst",
              options: {
                cacheName: "image-cache",
                expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  },
});
