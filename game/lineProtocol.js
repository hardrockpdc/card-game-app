// Newline-delimited JSON framing for the local TCP transport.
//
// TCP is a byte stream: one logical message can arrive split across several
// `data` events, and several messages can arrive in one. Both the host and the
// client therefore buffer bytes and only parse complete newline-terminated
// lines, keeping any partial remainder for the next event.
//
// That logic used to be written out twice, inline in GameNetwork's two socket
// handlers, with no bound on the buffer. Nothing on the local network is
// authenticated — any device on the same Wi-Fi can open a socket to the game
// port — so a peer that streams bytes and never sends a newline grew the buffer
// until the process died. The protocolVersion check couldn't help: it only runs
// after a complete line has parsed, which never happened.
//
// Pulling it out here makes it a pure function: no sockets, no React Native, so
// it is directly unit-testable, and both call sites share one implementation.

// A single message is far below this. Full-state broadcasts are the largest
// thing on the wire and run to tens of KB; 1 MB is generous headroom while
// still bounding memory per connection.
export const MAX_LINE_BYTES = 1_000_000;

// Feed newly-received bytes into a buffer and pull out every complete line.
//
// Returns { buffer, lines, overflow }:
//   buffer   — the remainder to carry into the next call
//   lines    — complete, non-blank lines in arrival order
//   overflow — true if the pending buffer exceeded MAX_LINE_BYTES, meaning the
//              peer is sending an unterminated flood. The caller must destroy
//              the socket; the returned buffer is reset so nothing is retained.
export function feedLines(buffer, chunk) {
  let next = buffer + chunk;
  const lines = [];

  let idx;
  while ((idx = next.indexOf("\n")) !== -1) {
    const line = next.slice(0, idx);
    next = next.slice(idx + 1);
    if (line.trim()) lines.push(line);
  }

  // Only the UNTERMINATED remainder is capped. Any number of complete lines in
  // one chunk is fine — they've already been extracted above.
  if (next.length > MAX_LINE_BYTES) {
    return { buffer: "", lines, overflow: true };
  }

  return { buffer: next, lines, overflow: false };
}
