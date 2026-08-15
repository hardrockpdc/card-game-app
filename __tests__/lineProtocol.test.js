// M2 — the local TCP transport buffered bytes with no upper bound.
//
// Nothing on the local network is authenticated: any device on the same Wi-Fi
// can open a socket to the game port. A peer that streams bytes and never sends
// a newline grew the read buffer until the host ran out of memory. The
// protocolVersion gate couldn't stop it — that only runs once a complete line
// has parsed, which never happens.
import { feedLines, MAX_LINE_BYTES } from "../game/lineProtocol";

describe("feedLines — framing behaviour that must be preserved", () => {
  test("extracts a single complete line", () => {
    const r = feedLines("", '{"a":1}\n');
    expect(r.lines).toEqual(['{"a":1}']);
    expect(r.buffer).toBe("");
    expect(r.overflow).toBe(false);
  });

  test("extracts several messages arriving in one chunk", () => {
    const r = feedLines("", '{"a":1}\n{"b":2}\n{"c":3}\n');
    expect(r.lines).toEqual(['{"a":1}', '{"b":2}', '{"c":3}']);
    expect(r.buffer).toBe("");
  });

  test("carries a partial message across chunks and reassembles it", () => {
    const a = feedLines("", '{"big":');
    expect(a.lines).toEqual([]);
    expect(a.buffer).toBe('{"big":');

    const b = feedLines(a.buffer, '"value"}\n');
    expect(b.lines).toEqual(['{"big":"value"}']);
    expect(b.buffer).toBe("");
  });

  test("keeps the trailing remainder when a chunk ends mid-message", () => {
    const r = feedLines("", '{"a":1}\n{"partial"');
    expect(r.lines).toEqual(['{"a":1}']);
    expect(r.buffer).toBe('{"partial"');
  });

  test("skips blank and whitespace-only lines", () => {
    const r = feedLines("", '\n  \n{"a":1}\n\n');
    expect(r.lines).toEqual(['{"a":1}']);
  });
});

describe("M2 — an unterminated flood is bounded", () => {
  test("a pending buffer over the cap reports overflow", () => {
    const flood = "x".repeat(MAX_LINE_BYTES + 1);
    const r = feedLines("", flood);
    expect(r.overflow).toBe(true);
  });

  test("overflow discards the buffer so nothing is retained", () => {
    const r = feedLines("", "x".repeat(MAX_LINE_BYTES + 1));
    // Assert on length, not the string itself — a failure here would otherwise
    // print a megabyte of 'x' into the console diff.
    expect(r.buffer).toHaveLength(0);
  });

  test("a flood accumulated across many chunks still trips the cap", () => {
    // The realistic attack: small writes, never a newline.
    let buffer = "";
    let tripped = false;
    const chunk = "x".repeat(100_000);
    for (let i = 0; i < 20; i++) {
      const r = feedLines(buffer, chunk);
      buffer = r.buffer;
      if (r.overflow) {
        tripped = true;
        break;
      }
    }
    expect(tripped).toBe(true);
    expect(buffer).toBe("");
  });

  test("a large but newline-terminated batch is NOT treated as overflow", () => {
    // Only the unterminated remainder is capped — legitimate full-state
    // broadcasts must keep working however big the batch is.
    const big = JSON.stringify({ pad: "y".repeat(MAX_LINE_BYTES) });
    const r = feedLines("", big + "\n");
    expect(r.overflow).toBe(false);
    expect(r.lines).toHaveLength(1);
  });

  test("a buffer exactly at the cap is not overflow", () => {
    const r = feedLines("", "x".repeat(MAX_LINE_BYTES));
    expect(r.overflow).toBe(false);
  });
});
