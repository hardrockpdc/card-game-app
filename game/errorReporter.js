// Production error reporting.
//
// Before this, a release build reported nothing at all: game/logger.js was
// `export const warn = __DEV__ ? console.warn : () => {}`, so ErrorBoundary's
// componentDidCatch, every swallowed catch block and every "[onlineRoom] ...
// failed" evaporated. @sentry/react-native was in package.json but imported by
// no file in the project.
//
// This module is the only place that touches the Sentry SDK. Everything else
// goes through reportError / reportMessage, which means:
//   - the SDK is required defensively, like every other native module here, so
//     a dev build made before Sentry was linked is a no-op instead of a crash;
//   - the logic is unit-testable with an injected fake backend;
//   - swapping or removing the provider later touches one file.
//
// NOTE: native module — a rebuild is required before this does anything in a
// real build.
import { warn as devWarn } from "./logger";

let backend = null; // { init, captureException, captureMessage }
let enabled = false;
let resolved = false;

// Resolve the real SDK lazily and defensively. Tests inject via __setBackend.
function getBackend() {
  if (backend || resolved) return backend;
  resolved = true;
  try {
    const Sentry = require("@sentry/react-native");
    backend = {
      init: (opts) => Sentry.init(opts),
      captureException: (err) => Sentry.captureException(err),
      captureMessage: (msg, level) => Sentry.captureMessage(msg, level),
    };
  } catch (_) {
    // Not linked in this build — stay a no-op.
    backend = null;
  }
  return backend;
}

// Call once at startup. Without a DSN this stays disabled and every report
// becomes a no-op, so the app runs identically until a DSN is configured.
export function initErrorReporting({ dsn, environment, release } = {}) {
  if (enabled) return; // already initialised — don't re-init the SDK
  if (!dsn) return;

  const be = getBackend();
  if (!be) return;

  try {
    be.init({
      dsn,
      environment,
      release,
      // Crash reports only. No performance tracing, no session replay — this is
      // a children's card game and we collect the minimum that answers "what
      // broke". Keep this in step with the privacy policy.
      tracesSampleRate: 0,
      enableAutoSessionTracking: false,
      sendDefaultPii: false,
    });
    enabled = true;
  } catch (err) {
    // A missing/incompatible native module must never take the app down.
    devWarn("[errorReporter] init failed:", err);
    enabled = false;
  }
}

export function isReportingEnabled() {
  return enabled;
}

export function reportError(error, context) {
  if (!enabled) return;
  const be = getBackend();
  if (!be) return;
  try {
    // Callers sometimes have a string or a rejected non-Error value; the
    // backend wants a real Error so it can attach a stack.
    const err =
      error instanceof Error
        ? error
        : new Error(`Non-Error thrown: ${String(error)}`);
    if (context) err.context = context;
    be.captureException(err);
  } catch (_) {
    // Reporting must never itself throw into the caller.
  }
}

export function reportMessage(message, level = "warning") {
  if (!enabled) return;
  const be = getBackend();
  if (!be) return;
  try {
    be.captureMessage(String(message), level);
  } catch (_) {}
}

// ─── Test seams ──────────────────────────────────────────────────────────────
export function __setBackend(fake) {
  backend = fake;
  resolved = true;
}

export function __resetForTests() {
  backend = null;
  enabled = false;
  resolved = false;
}
