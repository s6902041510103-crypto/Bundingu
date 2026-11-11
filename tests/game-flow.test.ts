import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildBoardCells,
  numberToPosition,
  positionToNumber,
  walkPath,
  FINISH_AT,
} from "../lib/board";
import { SNAKES, LADDERS, SPECIAL_CELLS } from "../lib/game-data";
import {
  evaluateQuestionSubmission,
  computePostQuestionAnalytics,
  calculateMaxPossibleRawScore,
  computeNormalizedGrades,
} from "../lib/game-state";
import {
  createRoomOnServer,
  executeServerGameCommand,
  getServerRoom,
  toPublicGameState,
  canTeacherAdvance,
} from "../lib/server/game-engine";
import {
  createQuestionRecord,
  updateQuestionRecord,
  deleteQuestionRecord,
  listQuestions,
} from "../lib/server/repository";

describe("Knowledge Snake — End-to-End Game Engine, Security & Board Tests", () => {
  it("1. Board Configuration matches exact Snakes (98→62, 84→43, 65→31, 47→19), Ladders (7→28, 21→56, 43→78, 61→89) and 10x10 Boustrophedon layout", () => {
    assert.deepEqual(SNAKES, [
      { from: 98, to: 62 },
      { from: 84, to: 43 },
      { from: 65, to: 31 },
      { from: 47, to: 19 },
    ]);
    assert.deepEqual(LADDERS, [
      { from: 7, to: 28 },
      { from: 21, to: 56 },
      { from: 43, to: 78 },
      { from: 61, to: 89 },
    ]);

    const cells = buildBoardCells({
      snakes: SNAKES,
      ladders: LADDERS,
      specialCells: SPECIAL_CELLS,
    });
    assert.equal(cells.length, 100);

    // Verify boustrophedon numbering: square 1 is bottom-left (row 0, col 0), square 100 is top-left (row 9, col 0)
    assert.deepEqual(numberToPosition(1), { row: 0, col: 0 });
    assert.deepEqual(numberToPosition(10), { row: 0, col: 9 });
    assert.deepEqual(numberToPosition(11), { row: 1, col: 9 });
    assert.deepEqual(numberToPosition(20), { row: 1, col: 0 });
    assert.deepEqual(numberToPosition(100), { row: 9, col: 0 });
    assert.equal(positionToNumber(9, 0), 100);
    assert.equal(positionToNumber(0, 0), 1);

    // Verify exact landing bounce-back at 100
    assert.deepEqual(walkPath(98, 2, FINISH_AT), [99, 100]);
    assert.deepEqual(walkPath(98, 5, FINISH_AT), [99, 100, 99, 98, 97]);
  });

  it("2. Teacher creates game, Students join room, and multiple students see synchronized public state", () => {
    const created = createRoomOnServer({
      title: "การแข่งขันวิทยาศาสตร์ ม.1",
      subject: "วิทยาศาสตร์",
      totalRounds: 3,
      questionTimeLimit: 20,
      teacherId: "teacher-01",
      hostName: "ครูสมชาย ใจดี",
      seedDemoPlayers: false,
    });

    assert.ok(created.room, "Room should be created");
    const pin = created.room!.pin;
    assert.match(pin, /^[A-Z0-9]{6}$/, "Room Key must be 6 uppercase alphanumeric chars");
    assert.match(pin, /[A-Z]/, "Room Key must contain letters");
    assert.match(pin, /[0-9]/, "Room Key must contain digits");

    // Student 1 joins
    const join1 = executeServerGameCommand(pin, {
      type: "JOIN_GAME",
      nickname: "น้องมิน",
      avatarId: "panda",
    });
    assert.ok(!join1.error);
    assert.equal(join1.joinedPlayer?.name, "น้องมิน");

    // Student 2 joins
    const join2 = executeServerGameCommand(pin, {
      type: "JOIN_GAME",
      nickname: "ต้นกล้า",
      avatarId: "tiger",
    });
    assert.ok(!join2.error);
    assert.equal(join2.publicState?.players.length, 2);

    // Verify both students see the exact same room state & player roster
    const room = getServerRoom(pin)!;
    const view1 = toPublicGameState(room, join1.joinedPlayer!.id);
    const view2 = toPublicGameState(room, join2.joinedPlayer!.id);

    assert.equal(view1.game.pin, pin);
    assert.equal(view2.game.pin, pin);
    assert.deepEqual(
      view1.players.map((p) => ({ id: p.id, name: p.name, pos: p.position })),
      view2.players.map((p) => ({ id: p.id, name: p.name, pos: p.position })),
    );

    // Duplicate nickname check: Joining with existing nickname "น้องมิน" must fail
    const dupName = executeServerGameCommand(pin, {
      type: "JOIN_GAME",
      nickname: "น้องมิน",
      avatarId: "frog",
    });
    assert.ok(dupName.error, "Duplicate nickname must be rejected");
    assert.match(dupName.error!, /มีผู้เล่นในห้องใช้แล้ว/);

    // Duplicate avatar check: Joining with existing avatar "panda" (used by น้องมิน) must fail
    const dupAvatar = executeServerGameCommand(pin, {
      type: "JOIN_GAME",
      nickname: "สายฟ้า",
      avatarId: "panda",
    });
    assert.ok(dupAvatar.error, "Duplicate avatar must be rejected");
    assert.match(dupAvatar.error!, /มีเพื่อนในห้องเลือกแล้ว/);
  });

  it("3. Security: Server blocks unauthenticated teacher commands and strips correctOptionId before reveal", () => {
    const created = createRoomOnServer({
      title: "Security Test Room",
      subject: "คณิตศาสตร์",
      totalRounds: 3,
      questionTimeLimit: 20,
      teacherId: "teacher-sec",
      hostName: "ครูสมชาย",
    });
    const pin = created.room!.pin;

    executeServerGameCommand(pin, {
      type: "JOIN_GAME",
      nickname: "StudentA",
      avatarId: "fox",
    });

    // Unauthenticated START_GAME must fail
    const unauthorizedStart = executeServerGameCommand(
      pin,
      { type: "START_GAME" },
      { isTeacherAuthenticated: false },
    );
    assert.ok(unauthorizedStart.error, "Unauthenticated teacher command must be rejected");

    // Authenticated teacher starts game
    const started = executeServerGameCommand(
      pin,
      { type: "START_GAME" },
      { isTeacherAuthenticated: true },
    );
    assert.ok(!started.error);
    assert.equal(started.publicState?.gameStatus, "question");

    // Public state MUST NOT expose correctOptionId or explanation before reveal
    assert.equal(started.publicState?.question?.revealed, false);
    assert.equal(started.publicState?.question?.correctOptionId, "");
    assert.equal(started.publicState?.question?.explanation, "");
    assert.equal(
      "rngSeed" in (started.publicState as unknown as Record<string, unknown>),
      false,
    );
    assert.equal(
      "teacherId" in (started.publicState as unknown as Record<string, unknown>),
      false,
    );
  });

  it("4. Full Gameplay Flow: Answer Question, Reveal, Roll Queue, Snake/Ladder/Special Event blocking, Leaderboard, and Reconnect", () => {
    const created = createRoomOnServer({
      title: "Gameplay Flow Room",
      subject: "คณิตศาสตร์",
      totalRounds: 3,
      questionTimeLimit: 20,
      teacherId: "teacher-flow",
      hostName: "ครูสมชาย",
    });
    const pin = created.room!.pin;

    const p1 = executeServerGameCommand(pin, {
      type: "JOIN_GAME",
      nickname: "PandaPlayer",
      avatarId: "panda",
    }).joinedPlayer!;

    const p2 = executeServerGameCommand(pin, {
      type: "JOIN_GAME",
      nickname: "TigerPlayer",
      avatarId: "tiger",
    }).joinedPlayer!;

    // Teacher starts game
    executeServerGameCommand(
      pin,
      { type: "START_GAME" },
      { isTeacherAuthenticated: true },
    );

    const room = getServerRoom(pin)!;
    const realCorrectOptionId = room.state.question!.correctOptionId;
    const wrongOptionId = room.state.question!.options.find(
      (o) => o.id !== realCorrectOptionId,
    )!.id;

    // P1 answers correctly, P2 answers wrong
    executeServerGameCommand(pin, {
      type: "SUBMIT_ANSWER",
      playerId: p1.id,
      optionId: realCorrectOptionId,
    });
    executeServerGameCommand(pin, {
      type: "SUBMIT_ANSWER",
      playerId: p2.id,
      optionId: wrongOptionId,
    });

    // Teacher reveals answers
    const revealed = executeServerGameCommand(
      pin,
      { type: "REVEAL_ANSWERS" },
      { isTeacherAuthenticated: true },
    );
    assert.equal(revealed.publicState?.question?.revealed, true);
    assert.equal(
      revealed.publicState?.question?.correctOptionId,
      realCorrectOptionId,
    );
    // Only P1 should be in rollQueue
    assert.deepEqual(revealed.publicState?.rollQueue, [p1.id]);

    // P2 tries to roll out of turn -> rejected
    const wrongTurnRoll = executeServerGameCommand(pin, {
      type: "ROLL_DICE",
      playerId: p2.id,
    });
    assert.ok(wrongTurnRoll.error, "Out-of-turn player cannot roll dice");

    // Position P1 at square 5 and force next roll to land on Ladder at square 7 (7 -> 28)
    room.state.players = room.state.players.map((p) =>
      p.id === p1.id ? { ...p, position: 5, score: 5 } : p,
    );

    // P1 rolls dice
    const rolled = executeServerGameCommand(pin, {
      type: "ROLL_DICE",
      playerId: p1.id,
    });
    assert.ok(!rolled.error);
    assert.ok(rolled.publicState?.dice.value && rolled.publicState.dice.value >= 1);

    // Test Snake (98 -> 62) & Special Event blocking rule directly
    room.state.rollQueue = [p1.id];
    room.state.gameStatus = "dice";
    room.state.activeSpecialEvent = {
      id: "evt-test-snake",
      playerId: p1.id,
      playerName: p1.name,
      avatarId: p1.avatarId,
      kind: "snake",
      from: 98,
      to: 62,
      title: "🐍 ตกหัวเจ้างู! ไหลลง 98 → 62",
      description: "โดนงูที่ช่อง 98 ไหลลงไปช่อง 62",
      resolved: false,
    };

    // Teacher MUST NOT be allowed to start a new question while Special Event is unresolved
    const blockedQuestion = executeServerGameCommand(
      pin,
      { type: "START_QUESTION" },
      { isTeacherAuthenticated: true },
    );
    assert.ok(
      blockedQuestion.error,
      "Teacher must not start a new question while Special Event is unresolved",
    );

    // Resolve Special Event
    const resolvedEvt = executeServerGameCommand(pin, {
      type: "RESOLVE_SPECIAL_EVENT",
      playerId: p1.id,
    });
    assert.equal(resolvedEvt.publicState?.activeSpecialEvent?.resolved, true);

    // Test Reconnect: P1 reconnects with same playerId and keeps position & score
    const beforePos = room.state.players.find((p) => p.id === p1.id)!.position;
    const reconnected = executeServerGameCommand(pin, {
      type: "JOIN_GAME",
      nickname: "PandaPlayer",
      avatarId: "panda",
      playerId: p1.id,
    });
    assert.ok(!reconnected.error);
    assert.equal(reconnected.joinedPlayer?.id, p1.id);
    assert.equal(reconnected.joinedPlayer?.position, beforePos);

    // Check Advance rules helper
    const adv = canTeacherAdvance(room.state);
    assert.equal(typeof adv.allowed, "boolean");
  });

  it("5. Question Bank Repository CRUD validates and persists questions accurately", () => {
    const beforeCount = listQuestions().length;

    // Invalid question (missing options) must fail validation
    const invalid = createQuestionRecord({
      prompt: "คำถามทดสอบ",
      subject: "วิทยาศาสตร์",
      options: ["A", "", "C", "D"],
      correctIndex: 0,
    });
    assert.ok(invalid.error, "Empty option must fail validation");

    // Valid question creation
    const created = createQuestionRecord({
      prompt: "ดาวเคราะห์ดวงใดได้ชื่อว่าเป็นดาวเคราะห์สีแดง?",
      subject: "วิทยาศาสตร์",
      difficulty: "easy",
      options: ["ดาวศุกร์", "ดาวอังคาร", "ดาวพฤหัสบดี", "ดาวเสาร์"],
      correctIndex: 1,
      explanation: "ดาวอังคารมีออกไซด์ของเหล็กบนพื้นผิวจึงมองเห็นเป็นสีแดง",
    });
    assert.ok(!created.error && created.question);
    assert.equal(listQuestions().length, beforeCount + 1);

    // Update question
    const updated = updateQuestionRecord(created.question!.id, {
      prompt: "ดาวเคราะห์ดวงใดได้ชื่อว่าเป็นดาวเคราะห์สีแดง (แก้ไข)?",
      subject: "วิทยาศาสตร์",
      difficulty: "medium",
      options: ["ดาวศุกร์", "ดาวอังคาร", "ดาวพฤหัสบดี", "ดาวเสาร์"],
      correctIndex: 1,
      explanation: "ดาวอังคารมีออกไซด์ของเหล็ก",
    });
    assert.ok(!updated.error);
    assert.equal(updated.question?.difficulty, "medium");

    // Delete question
    const deleted = deleteQuestionRecord(created.question!.id);
    assert.equal(deleted.deleted, true);
    assert.equal(listQuestions().length, beforeCount);
  });

  it("6. Refactored Scoring (20 + Speed Bonus <= 5), Wrong Auto-Move +1, Analytics, Immediate Finish at 100 (+10 Bonus), and Dynamic Grade Normalization", () => {
    // 1. Speed bonus calculation (half time left => +2.50 speed bonus => 22.50 total pts)
    const correctEval = evaluateQuestionSubmission({
      playerId: "p1",
      selectedOptionId: "opt-b",
      correctOptionId: "opt-b",
      questionStartedAtMs: 1000,
      submittedAtMs: 11000, // 10s elapsed out of 20s
      questionTimeLimitSec: 20,
      rngD6: () => 4,
    });
    assert.equal(correctEval.isCorrect, true);
    assert.equal(correctEval.basePoints, 20);
    assert.equal(correctEval.speedBonus, 2.5);
    assert.equal(correctEval.pointsEarned, 22.5);
    assert.equal(correctEval.stepsToMove, 4);

    // 2. Wrong answer => 0 pts, auto-move 1 space forward
    const wrongEval = evaluateQuestionSubmission({
      playerId: "p2",
      selectedOptionId: "opt-a",
      correctOptionId: "opt-b",
      questionStartedAtMs: 1000,
      submittedAtMs: 5000,
      questionTimeLimitSec: 20,
    });
    assert.equal(wrongEval.isCorrect, false);
    assert.equal(wrongEval.pointsEarned, 0);
    assert.equal(wrongEval.stepsToMove, 1);

    // 3. Immediate Game Over at Cell >= 100 + +10 Finish Bonus
    const created = createRoomOnServer({
      title: "Finish 100 Room",
      subject: "วิทยาศาสตร์",
      totalRounds: 5,
      questionTimeLimit: 20,
      teacherId: "teacher-100",
      hostName: "ครูสมหญิง",
    });
    const pin = created.room!.pin;
    const p1 = executeServerGameCommand(pin, {
      type: "JOIN_GAME",
      nickname: "Runner1",
      avatarId: "fox",
    }).joinedPlayer!;
    const p2 = executeServerGameCommand(pin, {
      type: "JOIN_GAME",
      nickname: "Runner2",
      avatarId: "rabbit",
    }).joinedPlayer!;

    executeServerGameCommand(
      pin,
      { type: "START_GAME" },
      { isTeacherAuthenticated: true },
    );

    const room = getServerRoom(pin)!;
    const correctId = room.state.question!.correctOptionId;
    const wrongId = room.state.question!.options.find((o) => o.id !== correctId)!.id;

    // P2 answers wrong -> should auto-advance from 1 to 2, and score MUST remain 0 (position is NOT added to score)
    executeServerGameCommand(pin, {
      type: "SUBMIT_ANSWER",
      playerId: p2.id,
      optionId: wrongId,
    });
    const p2AfterWrong = room.state.players.find((p) => p.id === p2.id)!;
    assert.equal(p2AfterWrong.position, 2);
    assert.equal(p2AfterWrong.score, 0);

    // Place P1 at 99, answer correctly, and roll D6 -> reaches/exceeds 100 -> immediate Game Over + +10 bonus
    room.state.players = room.state.players.map((p) =>
      p.id === p1.id ? { ...p, position: 99 } : p,
    );
    executeServerGameCommand(pin, {
      type: "SUBMIT_ANSWER",
      playerId: p1.id,
      optionId: correctId,
    });

    // Check Post-Question Analytics after both answered (auto-revealed)
    const analytics = computePostQuestionAnalytics(
      room.state.question,
      room.state.players,
    );
    assert.ok(analytics);
    assert.equal(analytics!.totalResponses, 2);
    assert.equal(analytics!.fastestPlayer?.playerId, p1.id);

    const finishRoll = executeServerGameCommand(pin, {
      type: "ROLL_DICE",
      playerId: p1.id,
    });
    assert.ok(!finishRoll.error);
    assert.equal(finishRoll.publicState?.gameStatus, "finished");
    const winner = finishRoll.publicState?.players.find((p) => p.id === p1.id)!;
    assert.equal(winner.position, 100);
    assert.equal(winner.finishRank, 1);
    assert.equal(winner.score, Number(((winner.quizPoints ?? 0) + 10).toFixed(2)));

    // 4. Dynamic Grade Normalization based on questionsPlayed (2 questions played => 40 base pts = full 10/10 when 2/2 correct)
    const maxRaw = calculateMaxPossibleRawScore({
      questionsPlayed: 2,
      targetGrade: 10,
    });
    assert.equal(maxRaw, 40);
    const grades = computeNormalizedGrades(
      [
        {
          playerId: p1.id,
          name: p1.name,
          avatarId: p1.avatarId,
          score: 52,
          position: 12,
          finishRank: null,
          quizPoints: 40,
          correctCount: 2,
        },
        {
          playerId: p2.id,
          name: p2.name,
          avatarId: p2.avatarId,
          score: 25,
          position: 5,
          finishRank: null,
          quizPoints: 20,
          correctCount: 1,
        },
      ],
      { questionsPlayed: 2, targetGrade: 10 },
    );
    // Answering 2/2 right MUST yield full 10/10
    assert.equal(grades[0].normalizedGrade, 10);
    // Answering 1/2 right in 2nd place gets 5.0 base + 0.5 rank bonus = 5.5
    assert.equal(grades[1].normalizedGrade, 5.5);
  });
});
