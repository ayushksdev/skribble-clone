import { io } from 'socket.io-client';
import { server } from '../server/dist/index.js';

const PORT = 3001;
const SERVER_URL = `http://localhost:${PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testFullGameLifecycle() {
  console.log('\n🎮 Running Complete Multi-Round Game Lifecycle & Winner Test...');

  const clientA = io(SERVER_URL, { reconnection: false });
  const clientB = io(SERVER_URL, { reconnection: false });

  await new Promise((res) => clientA.on('connect', res));
  await new Promise((res) => clientB.on('connect', res));

  // 1. Create Room with 2 rounds and short draw time (5s) for fast automated verification
  let roomCode = '';
  await new Promise((resolve) => {
    clientA.emit(
      'create_room',
      {
        playerName: 'DrawerMaster',
        settings: {
          rounds: 2,
          drawTime: 5,
          wordChoices: 3,
          hintsCount: 1,
          isPublic: false,
        },
      },
      (res) => {
        roomCode = res.data.code;
        resolve();
      }
    );
  });

  await new Promise((resolve) => {
    clientB.emit('join_room', { roomCode, playerName: 'SuperGuesser' }, resolve);
  });

  clientB.emit('player_ready', true);
  await sleep(100);

  let roundEndCount = 0;
  let gameOverReceived = false;
  let winnerData = null;

  clientA.on('round_end', (res) => {
    roundEndCount++;
    console.log(`  ✓ Turn finished! Word revealed: "${res.word}" (Turn ${roundEndCount})`);
  });

  clientA.on('game_over', (data) => {
    gameOverReceived = true;
    winnerData = data;
    console.log(`  🏆 GAME OVER reached! Winner: ${data.winner.name} with ${data.winner.score} pts`);
  });

  // Drawer word picker listener
  clientA.on('word_choices', (choices) => {
    clientA.emit('select_word', choices[0]);
  });

  clientB.on('word_choices', (choices) => {
    clientB.emit('select_word', choices[0]);
  });

  // Drawer word listener to guess immediately
  clientA.on('current_drawer_word', (word) => {
    // Client A is drawing -> Client B guesses
    setTimeout(() => {
      clientB.emit('chat_message', { message: word });
    }, 400);
  });

  clientB.on('current_drawer_word', (word) => {
    // Client B is drawing -> Client A guesses
    setTimeout(() => {
      clientA.emit('chat_message', { message: word });
    }, 400);
  });

  // Start game
  await new Promise((resolve) => {
    clientA.emit('start_game', resolve);
  });

  // Wait for 2 rounds * 2 players = 4 turns to execute and complete
  console.log('  ⏳ Simulating 4 rotating turns across 2 rounds...');
  const maxWait = 45000;
  const startTime = Date.now();

  while (!gameOverReceived && Date.now() - startTime < maxWait) {
    await sleep(500);
  }

  if (gameOverReceived && winnerData) {
    console.log('  ✓ [PASS] Full game successfully completed through all rounds!');
    console.log(`  ✓ [PASS] Winner: ${winnerData.winner.name}`);
    console.log(`  ✓ [PASS] Final leaderboard count: ${winnerData.finalLeaderboard.length}`);
  } else {
    throw new Error(`Game did not finish within ${maxWait}ms. Turns completed: ${roundEndCount}`);
  }

  clientA.disconnect();
  clientB.disconnect();

  server.close(() => {
    console.log('✓ Multi-round lifecycle test passed cleanly!\n');
    process.exit(0);
  });
}

testFullGameLifecycle();
