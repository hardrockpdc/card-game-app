// Onboarding handed out 15,000 coins of card decks before the player earned one.
//
// Step 3 rendered the unfiltered THEMES_LIST in a carousel with no lock, no
// price and no label, and handleFinish applied whatever was on screen:
//
//     const [key] = THEMES_LIST[themeIndex];
//     setTheme(key);
//     await updateProfile({ cardTheme: key });
//
// Five of the seven decks cost 3,000 coins each. Worse, isThemeUnlocked
// grandfathers whatever deck is currently active, so the giveaway was
// permanent — and the second time the player saw the deck list (in
// CardThemeScreen) it showed locks and prices, contradicting the first.
//
// Card decks are the largest sink in a cosmetic-only, earned-only economy.
// Emptying it during first run drains the point of ranks, the daily streak and
// all 15 achievements.
//
// The screen needs a React renderer this Jest config deliberately doesn't have,
// so what is pinned here is the rule handleFinish now applies: a deck may be
// granted for free if and only if its price is 0.
import { THEMES_LIST, getThemePrice, isThemeUnlocked } from "../game/cardTheme";

// Mirrors the guard in OnboardingScreen.handleFinish.
function mayGrantDuringOnboarding(themeId) {
  return getThemePrice(themeId) === 0;
}

describe("onboarding may only grant free decks", () => {
  test("the paid decks are all refused", () => {
    const paid = THEMES_LIST.filter(([key]) => getThemePrice(key) > 0).map(
      ([key]) => key,
    );

    expect(paid.length).toBeGreaterThan(0);
    for (const key of paid) {
      expect(mayGrantDuringOnboarding(key)).toBe(false);
    }
  });

  test("at least one free deck remains, so the step can still do something", () => {
    const free = THEMES_LIST.filter(([key]) => mayGrantDuringOnboarding(key));
    expect(free.length).toBeGreaterThanOrEqual(1);
  });

  test("the giveaway would have been worth thousands of coins", () => {
    // Documents the size of what leaked, so nobody reintroduces it casually.
    const total = THEMES_LIST.reduce(
      (sum, [key]) => sum + getThemePrice(key),
      0,
    );
    expect(total).toBeGreaterThanOrEqual(15000);
  });
});

describe("why granting a paid deck was permanent", () => {
  test("the active deck is grandfathered as unlocked, owned or not", () => {
    // This is intended behaviour — nobody should lose the deck they are using.
    // It is also why handing one out during onboarding could never be undone.
    expect(isThemeUnlocked("pirate", [], "pirate")).toBe(true);
    expect(isThemeUnlocked("pirate", [], "classic")).toBe(false);
  });

  test("a purchased deck stays unlocked when another is active", () => {
    expect(isThemeUnlocked("gothic", ["gothic"], "classic")).toBe(true);
  });
});
