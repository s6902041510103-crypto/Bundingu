// Verification Test for Kahoot-style Answer Evaluation, Exclusive Roll Permission, and Auto-transition
const BASE_URL = 'http://localhost:3000';
const PIN = 'KA' + Math.floor(Math.random() * 8999 + 1000);

async function testKahootFlow() {
  console.log(`==================================================`);
  console.log(`🎯 Testing Kahoot-Style Gameplay Flow on PIN: ${PIN}`);
  console.log(`==================================================`);

  // Step 1: Two students join the room
  console.log('\n--- Step 1: Two Students Join Room ---');
  const p1Res = await fetch(`${BASE_URL}/api/game/${PIN}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'JOIN_GAME',
      gamePin: PIN,
      displayName: 'นักเรียนA',
      preferredAvatarId: 'avatar-01',
      sessionId: 'session-a-1',
    }),
  });
  const p1Data = await p1Res.json();
  const p1Id = p1Data.data.playerId;
  console.log('✅ Player 1 Joined:', p1Id);

  const p2Res = await fetch(`${BASE_URL}/api/game/${PIN}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'JOIN_GAME',
      gamePin: PIN,
      displayName: 'นักเรียนB',
      preferredAvatarId: 'avatar-02',
      sessionId: 'session-b-1',
    }),
  });
  const p2Data = await p2Res.json();
  const p2Id = p2Data.data.playerId;
  console.log('✅ Player 2 Joined:', p2Id);

  // Step 2: Teacher starts question
  console.log('\n--- Step 2: Teacher Starts Question ---');
  const startRes = await fetch(`${BASE_URL}/api/game/${PIN}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'START_QUESTION',
      gamePin: PIN,
      teacherId: 'teacher-1',
    }),
  });
  const startData = await startRes.json();
  console.log('Start Question Success:', startData.success);
  console.log('Status after start:', startData.data?.gameState?.gameStatus);
  if (startData.data?.gameState?.gameStatus !== 'countdown') {
    throw new Error('Expected countdown phase!');
  }

  // Step 3: Wait for 3s countdown to finish -> question phase
  console.log('\n--- Step 3: Waiting for 3s countdown to question phase ---');
  await new Promise(r => setTimeout(r, 3400));
  const qStateRes = await fetch(`${BASE_URL}/api/game/${PIN}/command`);
  const qStateData = await qStateRes.json();
  const currentStatus = qStateData.data?.gameState?.gameStatus;
  console.log('Game status now:', currentStatus);
  if (currentStatus !== 'question') {
    throw new Error(`Expected question phase, got ${currentStatus}`);
  }
  console.log('Question:', qStateData.data?.gameState?.currentQuestion?.question);

  const currentQId = qStateData.data?.gameState?.currentQuestion?.questionId || 'q1';

  // Step 4: Player 1 answers Correctly (Choice 0)
  console.log('\n--- Step 4: Player 1 Answers Correctly ---');
  const p1AnsRes = await fetch(`${BASE_URL}/api/game/${PIN}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'SUBMIT_ANSWER',
      gamePin: PIN,
      playerId: p1Id,
      questionId: currentQId,
      choiceIndex: 0,
      clientTimestamp: Date.now(),
    }),
  });
  const p1AnsData = await p1AnsRes.json();
  console.log('Player 1 Answer Result:', p1AnsData.data);
  if (!p1AnsData.data?.correct) {
    throw new Error('Expected Player 1 answer to be evaluated as correct!');
  }
  if (!p1AnsData.data?.earnedRoll) {
    throw new Error('Expected Player 1 to earn roll rights!');
  }
  console.log('✅ PASS: Player 1 receives correct=true and earnedRoll=true');

  // Step 5: Player 2 answers Incorrectly (Choice 2)
  console.log('\n--- Step 5: Player 2 Answers Incorrectly ---');
  const p2AnsRes = await fetch(`${BASE_URL}/api/game/${PIN}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'SUBMIT_ANSWER',
      gamePin: PIN,
      playerId: p2Id,
      questionId: currentQId,
      choiceIndex: 2,
      clientTimestamp: Date.now(),
    }),
  });
  const p2AnsData = await p2AnsRes.json();
  console.log('Player 2 Answer Result:', p2AnsData.data);
  if (p2AnsData.data?.correct) {
    throw new Error('Expected Player 2 answer to be evaluated as incorrect!');
  }
  if (p2AnsData.data?.earnedRoll) {
    throw new Error('Expected Player 2 to NOT earn roll rights!');
  }
  console.log('✅ PASS: Player 2 receives correct=false and earnedRoll=false');

  // Step 6: Wait 2s for auto-transition to rolling phase
  console.log('\n--- Step 6: Verifying Auto-Transition to Rolling Phase (1.5s delay) ---');
  await new Promise(r => setTimeout(r, 2200));
  const rollStateRes = await fetch(`${BASE_URL}/api/game/${PIN}/command`);
  const rollStateData = await rollStateRes.json();
  const phaseAfterAllAnswered = rollStateData.data?.gameState?.gameStatus;
  const rollQueue = rollStateData.data?.gameState?.rollQueue || [];
  const currentRoller = rollStateData.data?.gameState?.currentPlayerId;

  console.log('Phase after all answered:', phaseAfterAllAnswered);
  console.log('Roll Queue:', rollQueue);
  console.log('Current Roller:', currentRoller);

  if (phaseAfterAllAnswered !== 'rolling') {
    throw new Error(`Expected rolling phase, got ${phaseAfterAllAnswered}`);
  }
  if (!rollQueue.includes(p1Id)) {
    throw new Error('Correct answerer (p1) must be in rollQueue!');
  }
  if (rollQueue.includes(p2Id)) {
    throw new Error('Incorrect answerer (p2) must NOT be in rollQueue!');
  }
  if (currentRoller !== p1Id) {
    throw new Error(`Current roller must be p1, got ${currentRoller}`);
  }
  console.log('✅ PASS: Only correct answerer earned roll rights and is current roller');

  // Step 7: Player 2 tries to roll -> MUST BE REJECTED
  console.log('\n--- Step 7: Player 2 (Wrong Answer) Tries to Roll ---');
  const p2RollRes = await fetch(`${BASE_URL}/api/game/${PIN}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'ROLL_DICE',
      gamePin: PIN,
      playerId: p2Id,
    }),
  });
  const p2RollData = await p2RollRes.json();
  console.log('Player 2 Roll Response:', p2RollData);
  if (p2RollData.success) {
    throw new Error('Player 2 should be REJECTED from rolling!');
  }
  console.log('✅ PASS: Player 2 was correctly rejected from rolling!');

  // Step 8: Player 1 (Correct Answer) rolls dice -> MUST SUCCEED
  console.log('\n--- Step 8: Player 1 (Correct Answer) Rolls Dice ---');
  const p1RollRes = await fetch(`${BASE_URL}/api/game/${PIN}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'ROLL_DICE',
      gamePin: PIN,
      playerId: p1Id,
    }),
  });
  const p1RollData = await p1RollRes.json();
  console.log('Player 1 Roll Success:', p1RollData.success);
  console.log('Dice Value:', p1RollData.data?.dice?.value);
  console.log('Player 1 Final Position:', p1RollData.data?.finalPosition);

  if (!p1RollData.success) {
    throw new Error('Player 1 roll should succeed!');
  }
  if (p1RollData.data?.finalPosition <= 1) {
    throw new Error('Player 1 should advance forward on the board!');
  }
  console.log('✅ PASS: Player 1 successfully rolled and advanced on board!');

  // Step 9: Verify Board Size & Security Isolation
  console.log('\n--- Step 9: Board Size & Security Verification ---');
  const finalStateRes = await fetch(`${BASE_URL}/api/game/${PIN}/command`);
  const finalStateData = await finalStateRes.json();
  const finalState = finalStateData.data?.gameState;

  const totalCells = finalState?.board?.totalCells;
  console.log('Board Total Cells:', totalCells);
  if (totalCells !== 100) {
    throw new Error(`Board must be 100 cells, got ${totalCells}`);
  }

  // Security checks: ensure no server secrets leak
  if (finalState.currentQuestion?.correctAnswer !== undefined) {
    throw new Error('Security Breach: correctAnswer exposed in public state!');
  }
  if (finalState.dice?.rngSeed !== undefined) {
    throw new Error('Security Breach: rngSeed exposed in public state!');
  }
  console.log('✅ PASS: 100-cell board preserved, zero secret leakage verified');

  console.log('\n==================================================');
  console.log('🎉 ALL KAHOOT-STYLE GAMEPLAY FLOW CHECKS PASSED!');
  console.log('==================================================\n');
}

testKahootFlow().catch(err => {
  console.error('❌ Kahoot Flow Test Failed:', err);
  process.exit(1);
});
