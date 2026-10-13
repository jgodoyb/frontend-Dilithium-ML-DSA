import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [
    (() => {
      const plugins = react();
      const list = (Array.isArray(plugins) ? plugins.flat() : [plugins]) as any[];
      for (const p of list) {
        if (p && typeof p === "object" && p.name === "vite:react-swc" && typeof p.config === "function") {
          const origConfig = p.config;
          p.config = (...args: [any, any]) => {
            const conf = (origConfig as any)(...args);
            if (conf) {
              if (conf.optimizeDeps?.esbuildOptions) {
                delete conf.optimizeDeps.esbuildOptions;
              }
              if ("esbuild" in conf) {
                delete conf.esbuild;
              }
            }
            return conf;
          };
        }
      }
      return plugins;
    })(),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
});
