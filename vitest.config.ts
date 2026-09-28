import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// Resolve vitest from workers/r2-presign so we don't need it at the repo root.
const { defineConfig } = require("./workers/r2-presign/node_modules/vitest/dist/config.cjs");

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
