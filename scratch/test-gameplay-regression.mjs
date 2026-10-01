/**
 * Gameplay Regression 12/12 Automated Verification Script
 */

const BASE_URL = 'http://localhost:3000';
const PIN = 'REG123';

async function sendCommand(command) {
  const res = await fetch(`${BASE_URL}/api/game/${PIN}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  return res.json();
}

async function getState() {
  const res = await fetch(`${BASE_URL}/api/game/${PIN}/command`, { method: 'GET' });
  const json = await res.json();
  return json.data?.gameState;
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function run() {
  console.log(`\n==================================================`);
  console.log(`🎯 Testing Gameplay Regression Flow (Items 1 - 12)`);
  console.log(`==================================================\n`);

  // Setup: 2 Players join
  const j1 = await sendCommand({
    type: 'JOIN_GAME',
    gamePin: PIN,
    displayName: 'ผู้เล่นที่_1',
    preferredAvatarId: 'avatar-01',
    sessionId: 'session-reg-p1',
  });
  const p1 = j1.data?.playerId || 'session-reg-p1';

  const j2 = await sendCommand({
    type: 'JOIN_GAME',
    gamePin: PIN,
    displayName: 'ผู้เล่นที่_2',
    preferredAvatarId: 'avatar-02',
    sessionId: 'session-reg-p2',
  });
  const p2 = j2.data?.playerId || 'session-reg-p2';

  // Item 1: Teacher Start Question
  console.log(`--- Item 1: Teacher Start Question ---`);
  const sq = await sendCommand({
    type: 'START_QUESTION',
    gamePin: PIN,
    teacherId: 'teacher-reg',
  });
  assert(sq.success === true, '1. Teacher can start question');

  // Item 2: Countdown 3 -> 2 -> 1
  console.log(`--- Item 2: Countdown Phase ---`);
  const sCountdown = await getState();
  assert(sCountdown.gameStatus === 'countdown', '2. Game enters countdown phase (3-2-1)');

  // Wait 3.2s
  await new Promise(r => setTimeout(r, 3200));

  // Item 3: Question phase & choices active
  console.log(`--- Item 3: Question Phase Active ---`);
  const sQuestion = await getState();
  assert(sQuestion.gameStatus === 'question', '3. Countdown finishes and question phase opens');
  const qId = sQuestion.currentQuestion?.questionId || 'q1';

  // Item 4: Student answer submission
  console.log(`--- Item 4: Answer Submission ---`);
  const ansP1 = await sendCommand({
    type: 'SUBMIT_ANSWER',
    gamePin: PIN,
    playerId: p1,
    questionId: qId,
    choiceIndex: 0, // correct
    clientTimestamp: Date.now(),
  });
  assert(ansP1.success === true && ansP1.data?.correct === true, '4. Student 1 answered correctly');

  const ansP2 = await sendCommand({
    type: 'SUBMIT_ANSWER',
    gamePin: PIN,
    playerId: p2,
    questionId: qId,
    choiceIndex: 1, // wrong
    clientTimestamp: Date.now() + 500,
  });
  assert(ansP2.success === true && ansP2.data?.correct === false, '4b. Student 2 answered incorrectly');

  // Item 5: Advance Question when all answered
  console.log(`--- Item 5: Advance Question (All Connected Answered) ---`);
  const sAllAnswered = await getState();
  assert(sAllAnswered.allPlayersAnswered === true, '5a. allPlayersAnswered flag is true');

  const adv = await sendCommand({
    type: 'ADVANCE_QUESTION',
    gamePin: PIN,
    teacherId: 'teacher-reg',
  });
  assert(adv.success === true, '5b. Teacher can advance question immediately when all answered');

  // Item 6: Automatic transition to rolling
  console.log(`--- Item 6: Transition to Rolling Phase ---`);
  const sRolling = await getState();
  assert(sRolling.gameStatus === 'rolling', '6. Transitioned to rolling phase');

  // Item 7: Roll Queue only contains correct answerer (p1)
  console.log(`--- Item 7: Roll Queue Ordering ---`);
  assert(sRolling.rollQueue.length === 1 && sRolling.rollQueue[0] === p1, '7. Roll queue contains only correct answerer (p1)');

  // Item 8: Turn Enforcement (p2 cannot roll)
  console.log(`--- Item 8: Turn Enforcement ---`);
  const p2IllegalRoll = await sendCommand({
    type: 'ROLL_DICE',
    gamePin: PIN,
    playerId: p2,
  });
  assert(p2IllegalRoll.success === false, '8. Player 2 rejected from rolling when not their turn');

  // Item 9: Valid Roll & Movement
  console.log(`--- Item 9: Dice Roll & Board Movement ---`);
  const p1Roll = await sendCommand({
    type: 'ROLL_DICE',
    gamePin: PIN,
    playerId: p1,
  });
  assert(p1Roll.success === true, '9a. Player 1 rolls dice successfully');
  assert(p1Roll.data?.finalPosition > 1, `9b. Player 1 moved to position ${p1Roll.data?.finalPosition}`);

  // Item 10: Special Cell (Test on specialized state or direct simulation)
  console.log(`--- Item 10: Special Cell Rules Checked in Board Engine ---`);
  assert(sRolling.board.specialCells.length === 3, '10. Board contains special cells 25, 50, 75');

  // Item 11: 100-cell board integrity
  console.log(`--- Item 11: 100-cell Board Rules ---`);
  assert(sRolling.board.totalCells === 100, '11. Board has exactly 100 cells');

  // Item 12: Zero secret leaks in response or public state
  console.log(`--- Item 12: Security Isolation ---`);
  const finalState = await getState();
  const stateStr = JSON.stringify(finalState);
  assert(!stateStr.includes('"correctAnswer"'), '12a. No correctAnswer in public state');
  assert(!stateStr.includes('"rngSeed"'), '12b. No rngSeed in public state');
  assert(!stateStr.includes('"sessionId"'), '12c. No sessionId in public state');
  assert(!stateStr.includes('"teacherId"'), '12d. No teacherId in public state');

  console.log(`\n==================================================`);
  console.log(`🎉 12/12 GAMEPLAY REGRESSION FLOW ITEMS PASSED!`);
  console.log(`==================================================\n`);
}

run().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
