import {
  createGame,
  setSecret,
  askQuestion,
  recordAnswer,
  awardRound,
  nextRound,
  checkWin,
  toPublic,
  nonJudgePlayers,
  currentJudge,
  currentAsker,
} from "../game/whoami";

const PLAYERS = [
  { id: "a", name: "Ann" },
  { id: "b", name: "Bob" },
  { id: "c", name: "Cara" },
];

const fresh = (opts) => createGame(PLAYERS, opts);

describe("createGame", () => {
  test("starts in 'choosing' with judge 0, zeroed scores, default target 3", () => {
    const s = fresh();
    expect(s.phase).toBe("choosing");
    expect(s.judgeIndex).toBe(0);
    expect(s.secret).toBeNull();
    expect(s.target).toBe(3);
    expect(s.players.map((p) => p.score)).toEqual([0, 0, 0]);
    expect(s.players.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  test("respects a custom target", () => {
    expect(fresh({ target: 5 }).target).toBe(5);
  });
});

describe("judge/asker helpers", () => {
  test("judge is players[judgeIndex]; askers are everyone else", () => {
    const s = fresh();
    expect(currentJudge(s).name).toBe("Ann");
    expect(nonJudgePlayers(s).map((p) => p.name)).toEqual(["Bob", "Cara"]);
    expect(currentAsker(s).name).toBe("Bob"); // askerIndex 0
  });
});

describe("setSecret", () => {
  test("moves from choosing to asking and stores the secret", () => {
    const s = setSecret(fresh(), "  Tom Hanks  ");
    expect(s.phase).toBe("asking");
    expect(s.secret).toEqual({ text: "Tom Hanks" });
  });

  test("ignored if not in choosing, or if empty", () => {
    const s = fresh();
    expect(setSecret(s, "")).toBe(s);
    expect(setSecret(s, "   ")).toBe(s);
    const asking = setSecret(s, "Batman");
    expect(setSecret(asking, "Robin")).toBe(asking); // already asking
  });

  test("does not mutate the input", () => {
    const s = fresh();
    const snap = JSON.parse(JSON.stringify(s));
    setSecret(s, "Yoda");
    expect(s).toEqual(snap);
  });
});

describe("askQuestion", () => {
  const asking = () => setSecret(fresh(), "Yoda");

  test("sets a pending question for the current asker", () => {
    const s = askQuestion(asking(), "Are you fictional?");
    expect(s.pendingQuestion).toEqual({
      askerId: "b",
      askerName: "Bob",
      question: "Are you fictional?",
    });
  });

  test("ignored while a question is already pending, or if empty", () => {
    const s = askQuestion(asking(), "Real person?");
    expect(askQuestion(s, "Second?")).toBe(s);
    const a = asking();
    expect(askQuestion(a, "  ")).toBe(a);
  });
});

describe("recordAnswer", () => {
  const pending = () => askQuestion(setSecret(fresh(), "Yoda"), "Fictional?");

  test("logs the answer, clears pending, advances to the next asker", () => {
    const s = recordAnswer(pending(), "yes");
    expect(s.pendingQuestion).toBeNull();
    expect(s.history).toEqual([
      { askerId: "b", askerName: "Bob", question: "Fictional?", answer: "yes" },
    ]);
    expect(currentAsker(s).name).toBe("Cara"); // advanced from Bob
  });

  test("asker turn wraps around the non-judge players", () => {
    let s = pending(); // Bob asked
    s = recordAnswer(s, "no"); // -> Cara
    s = askQuestion(s, "Animal?");
    s = recordAnswer(s, "no"); // -> back to Bob
    expect(currentAsker(s).name).toBe("Bob");
  });

  test("ignored when nothing is pending or the answer is invalid", () => {
    const noPending = setSecret(fresh(), "Yoda");
    expect(recordAnswer(noPending, "yes")).toBe(noPending);
    const p = pending();
    expect(recordAnswer(p, "maybe")).toBe(p);
  });
});

describe("awardRound", () => {
  test("credits the current asker and rotates to the next round", () => {
    const s = awardRound(askQuestion(setSecret(fresh(), "Yoda"), "Is it Yoda?"));
    // Bob (asker) wins the round
    expect(s.players.find((p) => p.id === "b").score).toBe(1);
    expect(s.lastWinner).toEqual({ id: "b", name: "Bob" });
    // not yet at target -> next round, judge rotated to player 1 (Bob)
    expect(s.phase).toBe("choosing");
    expect(s.judgeIndex).toBe(1);
    expect(s.roundNumber).toBe(2);
    expect(s.history).toEqual([]); // cleared for the new round
    expect(s.secret).toBeNull();
  });

  test("ends the game when the asker reaches the target", () => {
    let s = fresh({ target: 1 });
    s = awardRound(askQuestion(setSecret(s, "Yoda"), "Yoda?"));
    expect(s.phase).toBe("gameOver");
    expect(s.winner.id).toBe("b");
    expect(s.winner.score).toBe(1);
  });
});

describe("nextRound", () => {
  test("rotates the judge and resets the round (scores persist)", () => {
    let s = fresh();
    s.players[0].score = 2; // give Ann a score
    const n = nextRound(s);
    expect(n.judgeIndex).toBe(1);
    expect(n.phase).toBe("choosing");
    expect(n.secret).toBeNull();
    expect(n.history).toEqual([]);
    expect(n.players[0].score).toBe(2); // preserved
    expect(n.roundNumber).toBe(2);
  });

  test("judge index wraps to 0 after the last player", () => {
    const s = { ...fresh(), judgeIndex: 2 };
    expect(nextRound(s).judgeIndex).toBe(0);
  });
});

describe("checkWin / toPublic", () => {
  test("checkWin returns the player at/over target, else null", () => {
    const s = fresh({ target: 2 });
    expect(checkWin(s)).toBeNull();
    s.players[2].score = 2;
    expect(checkWin(s).id).toBe("c");
  });

  test("toPublic strips the secret but keeps the public fields", () => {
    const s = askQuestion(setSecret(fresh(), "Tom Hanks"), "Real?");
    const pub = toPublic(s);
    expect(pub.secret).toBeUndefined();
    expect(pub.currentJudgeId).toBe("a");
    expect(pub.currentAskerId).toBe("b");
    expect(pub.pendingQuestion.question).toBe("Real?");
    expect(pub.target).toBe(3);
  });
});
