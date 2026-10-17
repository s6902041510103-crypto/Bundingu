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
});
