import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Use node environment for most tests (server-side logic, JWT, DB queries)
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
    // Override environment per file pattern for React component tests
    // Use @vitest-environment jsdom docblock comment in individual component test files
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
