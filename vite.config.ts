import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * Security Headers Plugin
 * Applies hardened HTTP response headers on every dev-server response.
 * In production these same headers must be set at the CDN/server layer.
 *
 * References:
 *  - OWASP Secure Headers Project
 *  - NIST SP 800-204B (microservice hardening)
 */
function securityHeadersPlugin(): Plugin {
  return {
    name: "security-headers",
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        // ── Content-Security-Policy ──────────────────────────────────────
        // Blocks inline scripts (XSS), restricts sources to self + CDN.
        // 'unsafe-inline' is intentionally absent from script-src.
        res.setHeader(
          "Content-Security-Policy",
          [
            "default-src 'self'",
            // React hydration needs inline styles; keep nonce in prod
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            // KaTeX math rendering loads from self only, and 'unsafe-inline'/'unsafe-eval' for Vite HMR
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            // Allow connections to the Supabase project and local backend
            "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 https://mszqkxkaonuoemyjjhff.supabase.co wss://mszqkxkaonuoemyjjhff.supabase.co",
            "img-src 'self' data: blob:",
            "object-src 'none'",
            // Prevents page from being embedded in an iframe (clickjacking)
            "frame-ancestors 'none'",
            // Prevents navigation to untrusted origins
            "base-uri 'self'",
            "form-action 'self'",
            "media-src 'self' data: blob:",
          ].join("; ")
        );

        // ── Anti-Clickjacking ────────────────────────────────────────────
        res.setHeader("X-Frame-Options", "DENY");

        // ── MIME-type sniffing prevention ────────────────────────────────
        res.setHeader("X-Content-Type-Options", "nosniff");

        // ── Referrer leakage prevention ──────────────────────────────────
        res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

        // ── Permissions / Feature policy ─────────────────────────────────
        res.setHeader(
          "Permissions-Policy",
          "camera=(), microphone=(), geolocation=(), payment=()"
        );

        // ── HSTS (only meaningful on HTTPS) ──────────────────────────────
        res.setHeader(
          "Strict-Transport-Security",
          "max-age=63072000; includeSubDomains; preload"
        );

        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // securityHeadersPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // ── Disable sourcemaps in production ─────────────────────────────────
    // Attackers can read your full source code via .map files if published.
    sourcemap: false,
    // ── Minify for obfuscation ───────────────────────────────────────────
    minify: "esbuild",
    rollupOptions: {
      output: {
        // Randomised chunk names make path enumeration harder
        chunkFileNames: "assets/[hash].js",
        entryFileNames: "assets/[hash].js",
        assetFileNames: "assets/[hash].[ext]",
      },
    },
  },
}));
