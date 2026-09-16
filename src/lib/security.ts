/**
 * security.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side security utilities for Q-Proof Systems.
 *
 * ⚠️  These are DEFENCE-IN-DEPTH measures for the frontend layer.
 *     They MUST be replicated server-side (edge functions / backend) to be
 *     effective against determined attackers who bypass the JS layer entirely.
 */

import { useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// 1. RATE LIMITER  (CWE-307: Improper Restriction of Authentication Attempts)
// ═══════════════════════════════════════════════════════════════════════════

export interface RateLimitOptions {
  /** Max allowed calls within the window. */
  maxAttempts: number;
  /** Window size in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Remaining attempts before the window resets. */
  remaining: number;
  /** Max allowed calls within the window. */
  max: number;
  /** ISO string of when the window resets (undefined if not limited). */
  resetsAt?: string;
}

/**
 * useRateLimit — in-memory sliding-window rate limiter.
 */
export function useRateLimit(opts: RateLimitOptions) {
  const timestamps = useRef<number[]>([]);

  const check = useCallback((record: boolean = true): RateLimitResult => {
    const now = Date.now();
    const windowStart = now - opts.windowMs;

    // Prune expired entries (sliding window)
    timestamps.current = timestamps.current.filter((t) => t > windowStart);

    if (timestamps.current.length >= opts.maxAttempts) {
      const oldest = timestamps.current[0];
      const resetsAt = new Date(oldest + opts.windowMs).toISOString();
      return { allowed: false, remaining: 0, max: opts.maxAttempts, resetsAt };
    }

    // Record this attempt if requested
    if (record) {
      timestamps.current.push(now);
    }

    const remaining = opts.maxAttempts - timestamps.current.length;
    return { allowed: true, remaining, max: opts.maxAttempts };
  }, [opts.maxAttempts, opts.windowMs]);

  return { check };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. INPUT SANITISATION  (OWASP A03: Injection)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * sanitizeSignerId
 * Strips characters that have no business appearing in an email or UUID,
 * mitigating stored-XSS and injection if the value is later reflected in DOM
 * or sent to a backend query without server-side escaping.
 *
 * Allowed charset: alphanumeric, @, ., -, _, +
 */
export function sanitizeSignerId(value: string): string {
  return value.replace(/[^a-zA-Z0-9@.\-_+]/g, "").slice(0, 254);
}

/**
 * escapeHtml
 * Converts the 5 dangerous HTML characters to their entity equivalents.
 * Use this before inserting untrusted text into the DOM via innerHTML, or
 * before rendering raw strings in terminal-style panels.
 *
 * React's JSX already escapes text nodes, but this is useful for:
 *  - Content set via dangerouslySetInnerHTML
 *  - Strings rendered inside <pre> / terminal panels
 *  - Any value copied out to clipboard / log files
 */
export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. AUTH-STATE INTEGRITY NOTE
// ═══════════════════════════════════════════════════════════════════════════
//
// FINDING (HIGH): MockAuthContext stores isAuthenticated in React state.
// An attacker in the browser console CAN'T directly mutate React state from
// outside the component tree — window.__REACT_CONTEXT_DEVTOOLS__ only works
// in dev builds. However, if localStorage/sessionStorage were used for the
// flag a simple:
//   localStorage.setItem('isAuthenticated', 'true'); location.reload();
// would bypass the guard. The current in-memory approach is safer.
//
// RECOMMENDATION: If real auth is ever added, NEVER store roles or auth
// status in localStorage. Always derive them from a signed JWT validated
// server-side.
