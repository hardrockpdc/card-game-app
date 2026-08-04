// M4 — production had zero error visibility.
//
// game/logger.js was `export const warn = __DEV__ ? console.warn : () => {}`,
// so in a release build every diagnostic was a no-op: ErrorBoundary's
// componentDidCatch, the ~20 swallowed catch blocks, every
// "[onlineRoom] ... failed". A user hitting the "Something went wrong" screen
// produced no signal anywhere. Meanwhile @sentry/react-native sat in
// package.json and was imported by no file in the project.
//
// The backend is injectable so this logic is testable without the native SDK.
import {
  __setBackend,
  __resetForTests,
  initErrorReporting,
  reportError,
  reportMessage,
  isReportingEnabled,
} from "../game/errorReporter";

function fakeBackend() {
  return {
    init: jest.fn(),
    captureException: jest.fn(),
    captureMessage: jest.fn(),
  };
}

beforeEach(() => {
  __resetForTests();
});

describe("initialisation", () => {
  test("does nothing without a DSN, and reporting stays disabled", () => {
    const be = fakeBackend();
    __setBackend(be);

    initErrorReporting({ dsn: null });

    expect(be.init).not.toHaveBeenCalled();
    expect(isReportingEnabled()).toBe(false);
  });

  test("initialises once when given a DSN", () => {
    const be = fakeBackend();
    __setBackend(be);

    initErrorReporting({ dsn: "https://abc@example.ingest.sentry.io/1" });

    expect(be.init).toHaveBeenCalledTimes(1);
    expect(isReportingEnabled()).toBe(true);
  });

  test("repeat init calls do not re-initialise the SDK", () => {
    const be = fakeBackend();
    __setBackend(be);
    const opts = { dsn: "https://abc@example.ingest.sentry.io/1" };

    initErrorReporting(opts);
    initErrorReporting(opts);
    initErrorReporting(opts);

    expect(be.init).toHaveBeenCalledTimes(1);
  });

  test("a backend that throws on init cannot crash the app", () => {
    const be = fakeBackend();
    be.init = jest.fn(() => {
      throw new Error("native module missing");
    });
    __setBackend(be);

    expect(() =>
      initErrorReporting({ dsn: "https://abc@example.ingest.sentry.io/1" }),
    ).not.toThrow();
    expect(isReportingEnabled()).toBe(false);
  });
});

describe("reporting", () => {
  const enable = () => {
    const be = fakeBackend();
    __setBackend(be);
    initErrorReporting({ dsn: "https://abc@example.ingest.sentry.io/1" });
    return be;
  };

  test("reportError forwards an Error to the backend", () => {
    const be = enable();
    const err = new Error("boom");

    reportError(err, { where: "ErrorBoundary" });

    expect(be.captureException).toHaveBeenCalledTimes(1);
    expect(be.captureException.mock.calls[0][0]).toBe(err);
  });

  test("reportError wraps a non-Error so the backend always gets an Error", () => {
    const be = enable();

    reportError("just a string");

    const sent = be.captureException.mock.calls[0][0];
    expect(sent).toBeInstanceOf(Error);
    expect(sent.message).toContain("just a string");
  });

  test("reportMessage forwards text and level", () => {
    const be = enable();

    reportMessage("[onlineRoom] joinRoom failed", "warning");

    expect(be.captureMessage).toHaveBeenCalledWith(
      "[onlineRoom] joinRoom failed",
      "warning",
    );
  });

  test("reporting is a silent no-op when not initialised", () => {
    const be = fakeBackend();
    __setBackend(be);
    // No initErrorReporting call at all.

    expect(() => reportError(new Error("boom"))).not.toThrow();
    expect(() => reportMessage("hi", "warning")).not.toThrow();
    expect(be.captureException).not.toHaveBeenCalled();
    expect(be.captureMessage).not.toHaveBeenCalled();
  });

  test("a backend that throws while reporting cannot crash the caller", () => {
    const be = enable();
    be.captureException = jest.fn(() => {
      throw new Error("transport died");
    });

    expect(() => reportError(new Error("boom"))).not.toThrow();
  });
});
