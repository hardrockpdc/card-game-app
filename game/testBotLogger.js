// game/testBotLogger.js
// Dev-only logger for the test bot. All output is silenced in production.
//
// Filter Metro terminal output to a file (Windows PowerShell):
//   npx expo start --dev-client 2>&1 | Select-String "\[TestBot\]" | Tee-Object testbot.log
//
// Categories: MOVE, CRASH, GAMEOVER, RESTART, TOGGLE, BET, STATE

function safeStringify(data) {
  if (data === undefined || data === null) return String(data);
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

export function botLog(category, message, data) {
  if (!__DEV__) return;
  const ts = new Date().toISOString();
  const dataStr = data !== undefined ? ` ${safeStringify(data)}` : "";
  console.log(`[TestBot] ${ts} ${category} ${message}${dataStr}`);
}

export function botLogError(category, message, error) {
  if (!__DEV__) return;
  const ts = new Date().toISOString();
  const errMsg = error?.message ?? String(error);
  const stack = error?.stack ? `\n${error.stack}` : "";
  console.warn(`[TestBot] ${ts} ${category} ${message}: ${errMsg}${stack}`);
}
