// Integration verification test for student join and sync
const BASE_URL = 'http://localhost:3000';
const PIN = 'S' + Math.floor(Math.random() * 89999 + 10000);

async function run() {
  console.log('--- 1. Checking Initial Empty Room State ---');
  const getRes1 = await fetch(`${BASE_URL}/api/game/${PIN}/command`);
  const data1 = await getRes1.json();
  console.log('Room Status:', data1.data?.gameState?.gameStatus);
  console.log('Initial Players Count:', data1.data?.gameState?.players?.length || 0);

  if (data1.data?.gameState?.players?.length !== 0) {
    throw new Error('Initial players count should be 0!');
  }

  console.log('--- 2. Student Joins Room via /api/game/[pin]/command ---');
  const joinRes = await fetch(`${BASE_URL}/api/game/${PIN}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'JOIN_GAME',
      gamePin: PIN,
      displayName: 'น้องสมชาย',
      preferredAvatarId: 'avatar-07',
      sessionId: 'session-somchai-1',
    }),
  });
  const joinData = await joinRes.json();
  console.log('Join result success:', joinData.success);
  console.log('Assigned player ID:', joinData.data?.playerId);

  console.log('--- 3. Verifying Student Appears in Public GameState ---');
  const getRes2 = await fetch(`${BASE_URL}/api/game/${PIN}/command`);
  const data2 = await getRes2.json();
  const players = data2.data?.gameState?.players || [];
  console.log('Players in room now:', players.map(p => ({ name: p.displayName, avatar: p.avatarId, bonus: p.bonusMultiplier })));

  if (players.length !== 1 || players[0].displayName !== 'น้องสมชาย') {
    throw new Error('Student did not appear in game state!');
  }
  if (players[0].bonusMultiplier !== 5) {
    throw new Error('First student should have bonus multiplier 5!');
  }
  console.log('✅ Student joined and received Join Bonus x5!');

  console.log('--- 4. Teacher Starts Question ---');
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
  console.log('Start question success:', startData.success);
  console.log('Game status after start:', startData.data?.gameState?.gameStatus);

  console.log('--- 5. Waiting for Countdown (3s) to Question Phase ---');
  await new Promise(r => setTimeout(r, 3300));

  const getRes3 = await fetch(`${BASE_URL}/api/game/${PIN}/command`);
  const data3 = await getRes3.json();
  const qState = data3.data?.gameState;
  console.log('Current Phase:', qState?.gameStatus);
  console.log('Question Text:', qState?.currentQuestion?.question);
  console.log('Choices:', qState?.currentQuestion?.choices);

  if (qState?.gameStatus !== 'question') {
    throw new Error(`Expected question phase, got ${qState?.gameStatus}`);
  }
  if (!qState?.currentQuestion?.question) {
    throw new Error('Question should not be blank!');
  }

  console.log('🎉 ALL SYNC & INTEGRATION VERIFICATION CHECKS PASSED!');
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
