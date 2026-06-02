import { deal, doSelectPassCard, doDrawFromStock } from "../game/conquian";

const dealtGame = () =>
  deal([{ id: "host" }, { id: "ai" }], { dealerIndex: 0 });

// Resolve the initial blind pass to reach the "playing" phase.
function playingGame() {
  const game = dealtGame();
  const a = doSelectPassCard(game, "host", game.hands.host[0].id);
  return doSelectPassCard(a, "ai", a.hands.ai[0].id);
}

describe("doSelectPassCard", () => {
  test("first selection records it; the pass resolves once both are in", () => {
    const game = dealtGame();
    const hostCard = game.hands.host[0].id;
    const aiCard = game.hands.ai[0].id;

    const afterHost = doSelectPassCard(game, "host", hostCard);
    expect(afterHost.phase).toBe("initialPass");
    expect(afterHost.passSelections.host).toBe(hostCard);
    expect(afterHost.passSelections.ai).toBeNull();

    const resolved = doSelectPassCard(afterHost, "ai", aiCard);
    expect(resolved.phase).toBe("playing");
    expect(resolved.turnPhase).toBe("draw");
    // Hands stay at 10: host gave away its card and received the ai's.
    expect(resolved.hands.host).toHaveLength(10);
    expect(resolved.hands.host.some((c) => c.id === hostCard)).toBe(false);
    expect(resolved.hands.host.some((c) => c.id === aiCard)).toBe(true);
  });

  test("selecting a card not in hand is a no-op", () => {
    const game = dealtGame();
    expect(doSelectPassCard(game, "host", "not-a-real-card")).toBe(game);
  });

  test("ignored outside the initialPass phase", () => {
    const game = { ...dealtGame(), phase: "playing" };
    expect(doSelectPassCard(game, "host", game.hands.host[0].id)).toBe(game);
  });
});

describe("doDrawFromStock", () => {
  test("draws the top of stock into the active-card slot", () => {
    const game = playingGame();
    const stockBefore = game.stock.length;
    const next = doDrawFromStock(game);

    expect(next.activeCard).toEqual(game.stock[0]);
    expect(next.turnPhase).toBe("action");
    expect(next.stock).toHaveLength(stockBefore - 1);
  });

  test("an empty stock ends the game in a tie", () => {
    const next = doDrawFromStock({ ...playingGame(), stock: [] });
    expect(next.phase).toBe("results");
    expect(next.tie).toBe(true);
  });

  test("ignored when it's not the draw phase", () => {
    const game = { ...playingGame(), turnPhase: "action" };
    expect(doDrawFromStock(game)).toBe(game);
  });
});
