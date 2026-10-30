import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: false })],
  test: {
    environment: "jsdom",
    // Mounting the app is slow when every file runs at once. 5s is not enough for those tests.
    testTimeout: 20000,
    globals: true,
    setupFiles: ["./tests/setup.js"],
    server: {
      deps: {
        inline: ["vuetify"],
      },
    },
  },
});
