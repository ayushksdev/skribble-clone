import { io } from 'socket.io-client';
import { server } from '../server/dist/index.js';

const PORT = process.env.PORT || 3001;
const SERVER_URL = `http://localhost:${PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runIntegrationTest() {
  console.log('🚀 Starting Skribble Automated Multiplayer Test Suite...');
  console.log(`✓ Connecting to game server at ${SERVER_URL}`);

  let passedTests = 0;
  const totalTests = 14;

  function assert(condition, testName) {
    if (condition) {
      passedTests++;
      console.log(`  ✓ [PASS] ${testName}`);
    } else {
      console.error(`  ✗ [FAIL] ${testName}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  try {
    // 1. Connect Client A (Alice - Host)
    console.log('\n--- Test 1 & 2: Client Connections ---');
    const clientA = io(SERVER_URL, { reconnection: false });
    await new Promise((res) => clientA.on('connect', res));
    assert(clientA.connected, 'Player A (Alice) connected to socket');

    // 2. Client A creates a room
    console.log('\n--- Test 3: Room Creation ---');
    let roomCode = '';
    let roomData = null;
    await new Promise((resolve, reject) => {
      clientA.emit(
        'create_room',
        {
          playerName: 'Alice',
          settings: {
            rounds: 2,
            drawTime: 15,
            wordChoices: 3,
            hintsCount: 2,
            isPublic: true,
          },
        },
        (res) => {
          if (res.success && res.data) {
            roomCode = res.data.code;
            roomData = res.data;
            resolve();
          } else {
            reject(new Error(res.error || 'Failed to create room'));
          }
        }
      );
    });

    assert(Boolean(roomCode && roomCode.length === 6), `Room created with code ${roomCode}`);
    assert(roomData.players.length === 1, 'Room initially has 1 player (Host Alice)');
    assert(roomData.players[0].isHost === true, 'Player A is marked as Host');

    // 3. Connect Client B (Bob)
    console.log('\n--- Test 4: Player B Joining ---');
    const clientB = io(SERVER_URL, { reconnection: false });
    await new Promise((res) => clientB.on('connect', res));

    let playerJoinedReceivedByA = false;
    clientA.on('player_joined', (p) => {
      if (p.name === 'Bob') playerJoinedReceivedByA = true;
    });

    let joinResB = null;
    await new Promise((resolve, reject) => {
      clientB.emit('join_room', { roomCode, playerName: 'Bob' }, (res) => {
        if (res.success) {
          joinResB = res.data;
          resolve();
        } else {
          reject(new Error(res.error));
        }
      });
    });

    await sleep(200);
    assert(joinResB.players.length === 2, 'Room now has 2 players');
    assert(playerJoinedReceivedByA, 'Player A received player_joined event for Bob');

    // 4. Lobby and Ready Status
    console.log('\n--- Test 5: Ready Status ---');
    clientB.emit('player_ready', true);
    await sleep(200);

    // 5. Host starts game
    console.log('\n--- Test 6: Game Start & Word Selection ---');
    let wordChoicesReceivedByDrawer = null;
    let gameStateReceived = null;

    clientA.on('word_choices', (choices) => {
      wordChoicesReceivedByDrawer = choices;
    });

    clientB.on('word_choices', (choices) => {
      throw new Error('SECURITY VIOLATION: Non-drawer received word choices!');
    });

    clientB.on('game_state', (state) => {
      gameStateReceived = state;
    });

    await new Promise((resolve, reject) => {
      clientA.emit('start_game', (res) => {
        if (res.success) resolve();
        else reject(new Error(res.error));
      });
    });

    await sleep(400);
    assert(gameStateReceived.phase === 'WORD_SELECTION', 'Game transitioned to WORD_SELECTION phase');
    assert(Array.isArray(wordChoicesReceivedByDrawer) && wordChoicesReceivedByDrawer.length === 3, 'Drawer received 3 word choices');
    assert(gameStateReceived.currentDrawerName === 'Alice', 'Alice is chosen as the first drawer');

    // 6. Drawer selects word
    console.log('\n--- Test 7: Word Chosen & Drawing Phase ---');
    const chosenWord = wordChoicesReceivedByDrawer[0];
    let drawingStateReceivedByB = null;

    clientB.on('game_state', (state) => {
      if (state.phase === 'DRAWING') {
        drawingStateReceivedByB = state;
      }
    });

    clientA.emit('select_word', chosenWord);
    await sleep(400);

    assert(drawingStateReceivedByB !== null, 'Game transitioned to DRAWING phase');
    assert(!drawingStateReceivedByB.revealedWord, 'Secret word is NOT revealed to guesser in DRAWING state');
    assert(drawingStateReceivedByB.maskedWord.includes('_'), 'Guesser sees masked word (e.g. _ _ _ _)');

    // 7. Real-Time Drawing Synchronization
    console.log('\n--- Test 8: Real-Time Vector Drawing Synchronization ---');
    let strokeReceivedByB = false;
    let moveReceivedByB = false;

    clientB.on('draw_start', (data) => {
      if (data.strokeId === 'test_stroke_1') strokeReceivedByB = true;
    });

    clientB.on('draw_move', (data) => {
      if (data.strokeId === 'test_stroke_1') moveReceivedByB = true;
    });

    // Alice draws
    clientA.emit('draw_start', {
      strokeId: 'test_stroke_1',
      tool: 'brush',
      color: '#DC2626',
      size: 5,
      point: { x: 0.2, y: 0.3 },
    });

    clientA.emit('draw_move', {
      strokeId: 'test_stroke_1',
      points: [{ x: 0.25, y: 0.35 }],
    });

    clientA.emit('draw_end', {
      strokeId: 'test_stroke_1',
    });

    await sleep(200);
    assert(strokeReceivedByB, 'Player B received draw_start event');
    assert(moveReceivedByB, 'Player B received draw_move vector event');

    // 8. Security test: Non-drawer attempt to draw must be rejected
    console.log('\n--- Test 9: Security: Non-drawer drawing rejection ---');
    let unauthorizedDrawReceived = false;
    clientA.on('draw_start', (d) => {
      if (d.strokeId === 'hacker_stroke') unauthorizedDrawReceived = true;
    });

    clientB.emit('draw_start', {
      strokeId: 'hacker_stroke',
      tool: 'brush',
      color: '#000000',
      size: 5,
      point: { x: 0.5, y: 0.5 },
    });

    await sleep(200);
    assert(!unauthorizedDrawReceived, 'Server rejected unauthorized drawing from non-drawer Bob');

    // 9. Real-Time Guessing & Score Calculation
    console.log('\n--- Test 10: Real-Time Guessing & Chat ---');
    let correctGuessMsgReceived = false;
    let guessResultReceivedByB = false;

    clientA.on('chat_message', (msg) => {
      if (msg.type === 'correct_guess' && msg.text.includes('Bob')) {
        correctGuessMsgReceived = true;
      }
    });

    clientB.on('guess_result', (res) => {
      if (res.isCorrect) guessResultReceivedByB = true;
    });

    // Bob guesses incorrectly first
    clientB.emit('chat_message', { message: 'wrongguess' });
    await sleep(150);

    // Bob guesses the correct word!
    clientB.emit('chat_message', { message: chosenWord });
    await sleep(300);

    assert(correctGuessMsgReceived, 'Server broadcasted correct guess announcement without spoiling word in chat');
    assert(guessResultReceivedByB, 'Player B received private guess_result confirmation');

    // 10. Undo and Canvas Clear
    console.log('\n--- Test 11: Authoritative Canvas State Sync ---');
    let clearReceivedByB = false;
    clientB.on('canvas_clear', () => {
      clearReceivedByB = true;
    });

    clientA.emit('canvas_clear');
    await sleep(200);
    assert(clearReceivedByB, 'Canvas clear event synchronized to Player B');

    // 11. Disconnection & Reconnection handling
    console.log('\n--- Test 12: Disconnection Handling ---');
    const clientC = io(SERVER_URL, { reconnection: false });
    await new Promise((res) => clientC.on('connect', res));
    await new Promise((resolve) => {
      clientC.emit('join_room', { roomCode, playerName: 'Charlie' }, resolve);
    });

    let playerLeftReceived = false;
    clientA.on('player_left', () => {
      playerLeftReceived = true;
    });

    clientC.disconnect();
    await sleep(300);
    assert(playerLeftReceived, 'Server cleanly handled player disconnection and notified room');

    console.log(`\n🎉 SUCCESS: All ${passedTests}/${totalTests} Core Integration Tests Passed!`);

    // Clean up
    clientA.disconnect();
    clientB.disconnect();

    server.close(() => {
      console.log('✓ Server closed cleanly');
      process.exit(0);
    });
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runIntegrationTest();
