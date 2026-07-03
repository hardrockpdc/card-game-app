import { getWinReward, getMemoryReward } from "../game/rewards";

describe("getWinReward", () => {
  test("multiplayer pays more than single-player", () => {
    expect(getWinReward("gofish", false)).toBe(100);
    expect(getWinReward("gofish", true)).toBe(250);
    expect(getWinReward("rummy", false)).toBe(150);
    expect(getWinReward("rummy", true)).toBe(350);
    expect(getWinReward("poker", false)).toBe(200);
    expect(getWinReward("poker", true)).toBe(500);
  });

  test("single-mode games ignore the other tier", () => {
    expect(getWinReward("solitaire", false)).toBe(150);
    expect(getWinReward("solitaire", true)).toBe(0); // no MP solitaire
    expect(getWinReward("whoami", true)).toBe(300);
    expect(getWinReward("whoami", false)).toBe(0); // no SP who-am-i
  });

  test("unknown game returns 0", () => {
    expect(getWinReward("nope", false)).toBe(0);
    expect(getWinReward(undefined, true)).toBe(0);
  });
});

describe("getMemoryReward", () => {
  test("pays more for harder boards", () => {
    expect(getMemoryReward("easy")).toBe(50);
    expect(getMemoryReward("medium")).toBe(75);
    expect(getMemoryReward("hard")).toBe(100);
  });

  test("unknown difficulty returns 0", () => {
    expect(getMemoryReward("bogus")).toBe(0);
    expect(getMemoryReward(undefined)).toBe(0);
  });
});
