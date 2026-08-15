// Dev logging, and the production path for warnings.
//
// `warn` used to be a hard no-op in release builds, which meant every swallowed
// failure in the app — Firebase writes, room joins, save/load, ErrorBoundary —
// was invisible once shipped. It now forwards to the error reporter in
// production instead of vanishing. `log` stays dev-only: it's chatty
// per-frame/per-message tracing that would be noise (and a cost) in a report.
//
// errorReporter is required lazily inside the function to avoid a module cycle:
// errorReporter imports this file for its own dev warnings.

export const log = __DEV__ ? console.log : () => {};

export const warn = __DEV__
  ? console.warn
  : (...args) => {
      try {
        const { reportMessage } = require("./errorReporter");
        reportMessage(
          args
            .map((a) => (a instanceof Error ? a.message : String(a)))
            .join(" "),
          "warning",
        );
      } catch (_) {
        // Never let logging break the caller.
      }
    };
