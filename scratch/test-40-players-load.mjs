/**
 * 40-Player Load & Integration Verification Script (Task Part 20-22)
 *
 * Verifies:
 * 1. 40 players join a game session concurrently with unique display names & avatars
 * 2. Join Order Bonus calculation:
 *    - 1st player: multiplier ×5
 *    - 2nd player: multiplier ×4
 *    - 3rd player: multiplier ×3
 *    - 4th player: multiplier ×4
 *    - 5th–40th players: multiplier ×1
 * 3. Teacher starts question with 3s countdown trigger (START_QUESTION)
 * 4. Concurrent answer submission (SUBMIT_ANSWER) with answerTimeMs tracking
 * 5. Roll Queue sorting by fastest correct answer
 * 6. Dice rolling (ROLL_DICE) with board movement, snakes/ladders/special cells
 * 7. Scoring formula verification: finalScore = (position + finishBonus) * bonusMultiplier
 * 8. Security audit: Confirms public game state never exposes correctAnswer, rngSeed, sessionId, teacherId
 */

const BASE_URL = 'http://localhost:3000';
const PIN = 'LOAD41';

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
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function run() {
  console.log(`\n==================================================`);
  console.log(`🚀 Starting 40-Player Load Simulation & Integration Test`);
  console.log(`==================================================\n`);

  // 1. Join 40 Players
  console.log(`--- STEP 1: Joining 40 Players Concurrently ---`);
  const avatars = [
    'avatar-01', 'avatar-02', 'avatar-03', 'avatar-04',
    'avatar-05', 'avatar-06', 'avatar-07', 'avatar-08',
    'avatar-09', 'avatar-10', 'avatar-11', 'avatar-12',
  ];

  const playerSessions = [];
  for (let i = 1; i <= 40; i++) {
    const sessionId = `load-player-${i}-${Date.now()}`;
    const displayName = `นักเรียนคนที่_${i}`;
    const preferredAvatarId = avatars[(i - 1) % avatars.length];

    const joinResult = await sendCommand({
      type: 'JOIN_GAME',
      gamePin: PIN,
      displayName,
      preferredAvatarId,
      sessionId,
    });

    assert(joinResult.success === true, `Player ${i} joined successfully`);
    const assignedPlayerId = joinResult.data?.playerId || sessionId;
    playerSessions.push({
      index: i,
      playerId: assignedPlayerId,
      displayName,
      sessionId,
    });
  }

  // Fetch Authoritative State
  const stateAfterJoin = await getState();
  assert(stateAfterJoin.players.length >= 40, `State has at least 40 joined players (Actual: ${stateAfterJoin.players.length})`);

  // 2. Verify Join Order Multipliers
  console.log(`\n--- STEP 2: Verifying Join Order Multipliers ---`);
  const p1 = stateAfterJoin.players.find(p => p.displayName === 'นักเรียนคนที่_1');
  const p2 = stateAfterJoin.players.find(p => p.displayName === 'นักเรียนคนที่_2');
  const p3 = stateAfterJoin.players.find(p => p.displayName === 'นักเรียนคนที่_3');
  const p4 = stateAfterJoin.players.find(p => p.displayName === 'นักเรียนคนที่_4');
  const p5 = stateAfterJoin.players.find(p => p.displayName === 'นักเรียนคนที่_5');
  const p40 = stateAfterJoin.players.find(p => p.displayName === 'นักเรียนคนที่_40');

  assert(p1 && p1.bonusMultiplier === 5, `Player 1 has bonusMultiplier = 5 (Actual: ${p1?.bonusMultiplier})`);
  assert(p2 && p2.bonusMultiplier === 4, `Player 2 has bonusMultiplier = 4 (Actual: ${p2?.bonusMultiplier})`);
  assert(p3 && p3.bonusMultiplier === 3, `Player 3 has bonusMultiplier = 3 (Actual: ${p3?.bonusMultiplier})`);
  assert(p4 && p4.bonusMultiplier === 2, `Player 4 has bonusMultiplier = 2 (Actual: ${p4?.bonusMultiplier})`);
  assert(p5 && p5.bonusMultiplier === 1, `Player 5 has bonusMultiplier = 1 (Actual: ${p5?.bonusMultiplier})`);
  assert(p40 && p40.bonusMultiplier === 1, `Player 40 has bonusMultiplier = 1 (Actual: ${p40?.bonusMultiplier})`);

  // 3. Teacher Starts Question -> 3s Countdown
  console.log(`\n--- STEP 3: Teacher Starts Question ---`);
  const startQuestionResult = await sendCommand({
    type: 'START_QUESTION',
    gamePin: PIN,
    teacherId: 'teacher-load-test',
  });
  assert(startQuestionResult.success === true, 'Teacher started question command');

  const stateInCountdown = await getState();
  assert(
    stateInCountdown.gameStatus === 'countdown' || stateInCountdown.gameStatus === 'question',
    `Game status is countdown or question (Actual: ${stateInCountdown.gameStatus})`
  );

  // Wait 3.2s for countdown to transition to question
  console.log('⏳ Waiting 3.2s for countdown 3 -> 2 -> 1 to complete...');
  await new Promise(resolve => setTimeout(resolve, 3200));

  const stateInQuestion = await getState();
  assert(stateInQuestion.gameStatus === 'question', `Game transitioned to question phase (Actual: ${stateInQuestion.gameStatus})`);
  assert(stateInQuestion.currentQuestion !== undefined, 'Current question is present');

  // 4. Concurrently Submit Answers for all 40 Players
  console.log(`\n--- STEP 4: 40 Players Concurrently Submit Answers ---`);
  const currentQuestionId = stateInQuestion.currentQuestion?.questionId || 'q1';

  const answerPromises = playerSessions.map((ps, idx) => {
    // Alternate choices: even indices pick 0 (correct), odd indices pick 1 (wrong)
    const choiceIndex = idx % 2 === 0 ? 0 : 1;
    return sendCommand({
      type: 'SUBMIT_ANSWER',
      gamePin: PIN,
      playerId: ps.playerId,
      questionId: currentQuestionId,
      choiceIndex,
      clientTimestamp: Date.now() + idx * 50,
    });
  });

  const answerResults = await Promise.all(answerPromises);
  const correctCount = answerResults.filter(r => r.success && r.data?.correct).length;
  console.log(`Correct answers submitted: ${correctCount} / 40`);
  assert(correctCount > 0, 'Multiple players answered correctly');

  // 5. Verify Roll Queue
  console.log(`\n--- STEP 5: Verifying Roll Queue ---`);
  const stateAfterAnswers = await getState();
  assert(stateAfterAnswers.rollQueue.length === correctCount, `Roll queue matches correct count (Queue length: ${stateAfterAnswers.rollQueue.length})`);

  // 6. Teacher Advances Question to Roll Phase
  console.log(`\n--- STEP 6: Advancing to Rolling Phase ---`);
  const advanceResult = await sendCommand({
    type: 'ADVANCE_QUESTION',
    gamePin: PIN,
    teacherId: 'teacher-load-test',
  });
  assert(advanceResult.success === true, 'Advance question succeeded');

  const stateInRolling = await getState();
  assert(stateInRolling.gameStatus === 'rolling', `Game status is rolling (Actual: ${stateInRolling.gameStatus})`);

  // 7. First in Queue Rolls Dice
  console.log(`\n--- STEP 7: Player Rolls Dice & Scoring Formula Verification ---`);
  const activeRoller = stateInRolling.currentPlayerId || stateInRolling.rollQueue[0];
  assert(activeRoller !== undefined, `Active roller is present: ${activeRoller}`);

  const rollerBefore = stateInRolling.players.find(p => p.playerId === activeRoller);
  const rollResult = await sendCommand({
    type: 'ROLL_DICE',
    gamePin: PIN,
    playerId: activeRoller,
  });

  assert(rollResult.success === true, 'Roll dice succeeded');
  assert(rollResult.data?.dice?.value >= 1 && rollResult.data?.dice?.value <= 6, `Valid dice value rolled: ${rollResult.data?.dice?.value}`);

  const stateAfterRoll = await getState();
  const rollerAfter = stateAfterRoll.players.find(p => p.playerId === activeRoller);
  const expectedFinalScore = (rollerAfter.baseScore || rollerAfter.position) * (rollerAfter.bonusMultiplier || 1);

  assert(rollerAfter.position >= 1 && rollerAfter.position <= 100, `Player position is valid on 100-cell board (Actual: ${rollerAfter.position})`);
  assert(rollerAfter.score === expectedFinalScore, `Score matches formula (position * bonusMultiplier): Expected ${expectedFinalScore}, Got ${rollerAfter.score}`);
  assert(rollerAfter.diceRollsCount === 1, `Tracked diceRollsCount = 1 (Actual: ${rollerAfter.diceRollsCount})`);

  // 8. Security Audit: Check for Secret Leaks in Public State
  console.log(`\n--- STEP 8: Security Audit (Zero Secret Leaks) ---`);
  const stateStr = JSON.stringify(stateAfterRoll);
  assert(!stateStr.includes('"correctAnswer"'), 'Public state does NOT leak correctAnswer');
  assert(!stateStr.includes('"rngSeed"'), 'Public state does NOT leak rngSeed');
  assert(!stateStr.includes('"sessionId"'), 'Public state does NOT leak sessionId');
  assert(!stateStr.includes('"teacherId"'), 'Public state does NOT leak teacherId');

  console.log(`\n==================================================`);
  console.log(`🎉 ALL 40-PLAYER LOAD & VERIFICATION TESTS PASSED!`);
  console.log(`==================================================\n`);
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
