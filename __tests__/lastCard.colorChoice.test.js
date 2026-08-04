// A client that DREW a wild could never choose a colour, and the game froze.
//
// The colour picker is gated on a ref (pendingWildRef) holding the wild that is
// waiting on a colour. When a player taps a wild out of their own hand the
// screen sets that ref locally, so the host and a client both worked. But when
// the wild comes off the DECK, the play is resolved entirely inside the host's
// doHostDraw — and only the host set the ref there.
//
// The client had no way to learn about it either, because the broadcast state
// dropped both awaitingColorChoiceBy and pendingWildCard. So the client fell
// back to a guess ("I tapped the deck and the top card is a wild"), showed the
// picker, and left the ref null. onColorPick opens with
//
//     if (!s || !pending || s.gameOver) return;
//
// so every colour tap was a no-op. The client sat on the picker, the host sat
// waiting for CHOOSE_COLOR, and nobody could move — the game was over for
// everyone at the table, not just the player who drew.
//
// The screen needs a React renderer this Jest config deliberately doesn't have,
// so what is pinned here is the pure logic the fix rests on: the public state
// carries the pending choice, and both sides answer "who owes a colour?" from
// it identically.
import {
  applyCard,
  chooseColor,
  drawUntilPlayable,
  toPublicState,
  owesColorChoice,
  whyUnplayable,
  COLORS,
} from "../game/lastCard";

const HOST = "host";
const CLIENT = "u-client";

const wild = { id: 100, color: null, type: "wild", value: null };
const wildDraw4 = { id: 101, color: null, type: "wild_draw4", value: null };
const greenFive = { id: 5, color: "od_green", type: "number", value: 5 };
const crimsonTwo = { id: 32, color: "crimson", type: "number", value: 2 };

function baseState(overrides = {}) {
  return {
    drawPile: [],
    discardPile: [greenFive],
    hands: { [HOST]: [crimsonTwo], [CLIENT]: [wild] },
    players: [
      { id: HOST, name: "Host" },
      { id: CLIENT, name: "Client" },
    ],
    currentTurn: CLIENT,
    turnDirection: 1,
    activeColor: "od_green",
    pendingDraw: 0,
    pendingAction: null,
    awaitingColorChoiceBy: null,
    pendingWildCard: null,
    gameOver: false,
    winner: null,
    ...overrides,
  };
}

describe("the public state carries a pending colour choice", () => {
  test("awaitingColorChoiceBy and pendingWildCard survive the broadcast", () => {
    const played = applyCard(baseState(), CLIENT, wild, null);
    const pub = toPublicState(played);

    expect(pub.awaitingColorChoiceBy).toBe(CLIENT);
    expect(pub.pendingWildCard).toEqual(wild);
  });

  test("they are null, not undefined, when nobody owes a colour", () => {
    // undefined is dropped by Firebase's JSON encoding, so a client would read
    // the key as missing rather than as "explicitly nothing".
    const pub = toPublicState(baseState());

    expect(pub.awaitingColorChoiceBy).toBeNull();
    expect(pub.pendingWildCard).toBeNull();
  });

  test("hands are still never published", () => {
    const pub = toPublicState(baseState());

    expect(pub.hands).toBeUndefined();
    expect(pub.drawPile).toBeUndefined();
    expect(pub.players).toEqual([
      { id: HOST, name: "Host", cardCount: 1 },
      { id: CLIENT, name: "Client", cardCount: 1 },
    ]);
  });
});

describe("owesColorChoice answers the same on the host and on a client", () => {
  test("the player who played the wild owes the choice; nobody else does", () => {
    const played = applyCard(baseState(), CLIENT, wild, null);

    expect(owesColorChoice(played, CLIENT)).toBe(true);
    expect(owesColorChoice(played, HOST)).toBe(false);
  });

  test("the client reaches the same verdict from the public state alone", () => {
    const played = applyCard(baseState(), CLIENT, wild, null);
    const pub = toPublicState(played);

    expect(owesColorChoice(pub, CLIENT)).toBe(owesColorChoice(played, CLIENT));
    expect(owesColorChoice(pub, HOST)).toBe(owesColorChoice(played, HOST));
  });

  test("a numeric player id still matches its stringified form", () => {
    // Player ids are strings online and were numbers in older local games; a
    // strict === here is what made the old picker check unreliable.
    const played = applyCard(
      baseState({
        players: [
          { id: 0, name: "Host" },
          { id: 1, name: "Client" },
        ],
        hands: { 0: [crimsonTwo], 1: [wild] },
        currentTurn: "1",
      }),
      1,
      wild,
      null,
    );

    expect(owesColorChoice(played, 1)).toBe(true);
    expect(owesColorChoice(played, "1")).toBe(true);
    expect(owesColorChoice(played, 0)).toBe(false);
  });

  test("no state and no pending choice are both false, not a throw", () => {
    expect(owesColorChoice(null, CLIENT)).toBe(false);
    expect(owesColorChoice(baseState(), CLIENT)).toBe(false);
  });
});

describe("drawing into a wild is reported exactly like playing one", () => {
  test("a client who draws a wild owes the colour, and it is broadcast", () => {
    // The frozen-game path: the client taps the deck, the host draws for it,
    // the drawn wild is auto-played, and the client has to pick a colour with
    // nothing but the broadcast state to go on.
    const state = baseState({
      drawPile: [wildDraw4],
      hands: { [HOST]: [crimsonTwo], [CLIENT]: [crimsonTwo] },
    });

    const result = drawUntilPlayable(state, CLIENT);
    expect(result.playableCard).toEqual(wildDraw4);

    const played = applyCard(result.state, CLIENT, result.playableCard, null);
    const pub = toPublicState(played);

    expect(owesColorChoice(pub, CLIENT)).toBe(true);
    expect(pub.pendingWildCard).toEqual(wildDraw4);
    expect(pub.currentTurn).toBe(CLIENT);
  });

  test("the choice clears and the turn moves on once a colour comes back", () => {
    const played = applyCard(baseState(), CLIENT, wild, null);
    const resolved = chooseColor(played, CLIENT, COLORS[1]);
    const pub = toPublicState(resolved);

    expect(pub.activeColor).toBe(COLORS[1]);
    expect(pub.awaitingColorChoiceBy).toBeNull();
    expect(pub.pendingWildCard).toBeNull();
    expect(owesColorChoice(pub, CLIENT)).toBe(false);
    expect(pub.currentTurn).toBe(HOST);
  });

  test("a colour from anyone but the owing player is ignored", () => {
    const played = applyCard(baseState(), CLIENT, wild, null);

    expect(chooseColor(played, HOST, COLORS[2])).toBe(played);
  });
});

// A dimmed Wild +4 is the rule working (you may only play it when you can't
// match the colour), but the screen printed ONE line for every illegal card:
// "Can't play that — match Green or a 5." Say that to a player holding a Green
// 5 and you have named the card in their hand as the reason they can't play a
// different one. Wild +4 needs its own reason, and it is the only card whose
// legality depends on the REST of the hand rather than on the card itself.
describe("an illegal card explains itself correctly", () => {
  const greenTop = greenFive;

  test("a legal card has no reason at all", () => {
    expect(whyUnplayable(crimsonTwo, greenTop, "crimson", false)).toBeNull();
    expect(whyUnplayable(wild, greenTop, "od_green", true)).toBeNull();
  });

  test("a plain Wild is legal even holding a colour match — always", () => {
    // The card the players actually mean by "wilds should always be available".
    for (const activeColor of COLORS) {
      expect(whyUnplayable(wild, greenTop, activeColor, true)).toBeNull();
      expect(whyUnplayable(wild, greenTop, activeColor, false)).toBeNull();
    }
  });

  test("Wild +4 blocked by a colour match says so, not 'match the colour'", () => {
    expect(whyUnplayable(wildDraw4, greenTop, "od_green", true)).toBe(
      "draw4_has_color_match",
    );
  });

  test("Wild +4 is legal the moment the colour match is gone", () => {
    expect(whyUnplayable(wildDraw4, greenTop, "od_green", false)).toBeNull();
  });

  test("an ordinary mismatch gets the generic reason", () => {
    expect(whyUnplayable(crimsonTwo, greenTop, "od_green", true)).toBe(
      "no_match",
    );
  });

  test("no top card yet is a plain mismatch, not a crash", () => {
    expect(whyUnplayable(crimsonTwo, null, "od_green", false)).toBe("no_match");
    expect(whyUnplayable(null, greenTop, "od_green", false)).toBe("no_match");
  });
});
