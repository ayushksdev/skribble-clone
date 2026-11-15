import { io } from 'socket.io-client';
import { server } from '../server/dist/index.js';

const PORT = process.env.PORT || 3001;
const SERVER_URL = `http://localhost:${PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runEnhancementsTestSuite() {
  console.log('\n🚀 Starting Test Suite for Fill Color Tool + Vote Kick System...');

  let passedTests = 0;

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
    // -------------------------------------------------------------
    // PART 1: FILL COLOR TOOL VERIFICATION
    // -------------------------------------------------------------
    console.log('\n=== Testing Feature 1: Fill Color Tool (Paint Bucket) ===');

    const clientHost = io(SERVER_URL, { reconnection: false });
    const clientGuest = io(SERVER_URL, { reconnection: false });

    await new Promise((res) => clientHost.on('connect', res));
    await new Promise((res) => clientGuest.on('connect', res));

    let roomCode = '';
    await new Promise((resolve) => {
      clientHost.emit(
        'create_room',
        {
          playerName: 'HostPainter',
          settings: { rounds: 2, drawTime: 30, wordChoices: 3, hintsCount: 1, isPublic: false },
        },
        (res) => {
          roomCode = res.data.code;
          resolve();
        }
      );
    });

    await new Promise((resolve) => {
      clientGuest.emit('join_room', { roomCode, playerName: 'GuestSpectator' }, resolve);
    });

    clientGuest.emit('player_ready', true);
    await sleep(150);

    // Host starts game
    let wordChoices = null;
    clientHost.on('word_choices', (choices) => {
      wordChoices = choices;
    });

    await new Promise((resolve) => {
      clientHost.emit('start_game', resolve);
    });

    await sleep(300);
    assert(Array.isArray(wordChoices) && wordChoices.length > 0, 'Game entered WORD_SELECTION');

    // Host chooses word -> enters DRAWING phase
    clientHost.emit('select_word', wordChoices[0]);
    await sleep(300);

    // Test 1: Drawer emits draw_fill
    let fillReceivedByGuest = null;
    clientGuest.on('draw_fill', (data) => {
      fillReceivedByGuest = data;
    });

    const testFillPayload = {
      strokeId: 'fill_stroke_123',
      tool: 'fill',
      color: '#DC2626',
      point: { x: 0.45, y: 0.55 },
    };

    clientHost.emit('draw_fill', testFillPayload);
    await sleep(250);

    assert(fillReceivedByGuest !== null, 'Non-drawer received draw_fill broadcast');
    assert(fillReceivedByGuest.color === '#DC2626', 'Fill color matched #DC2626');
    assert(fillReceivedByGuest.point.x === 0.45 && fillReceivedByGuest.point.y === 0.55, 'Fill coordinate normalized');

    // Test 2: Security test - Non-drawer cannot use fill tool
    let unauthorizedFillReceived = false;
    clientHost.on('draw_fill', (d) => {
      if (d.strokeId === 'hacker_fill') unauthorizedFillReceived = true;
    });

    clientGuest.emit('draw_fill', {
      strokeId: 'hacker_fill',
      tool: 'fill',
      color: '#000000',
      point: { x: 0.1, y: 0.1 },
    });
    await sleep(200);

    assert(!unauthorizedFillReceived, 'Server rejected unauthorized fill from non-drawer');

    // Test 3: Undo removes the fill stroke from authoritative canvas history
    let updatedCanvasState = null;
    clientGuest.on('canvas_state', (strokes) => {
      updatedCanvasState = strokes;
    });

    clientHost.emit('draw_undo');
    await sleep(200);

    assert(Array.isArray(updatedCanvasState), 'draw_undo synchronized updated canvas state');
    const hasFill = updatedCanvasState.some((s) => s.id === 'fill_stroke_123');
    assert(!hasFill, 'Undo successfully popped the fill operation from canvas history');

    clientHost.disconnect();
    clientGuest.disconnect();
    await sleep(300);

    // -------------------------------------------------------------
    // PART 2: VOTE KICK SYSTEM VERIFICATION
    // -------------------------------------------------------------
    console.log('\n=== Testing Feature 2: Vote Kick System (Democratic Moderation) ===');

    // Setup 4 clients: Host, VoterA, VoterB, BadUser (target)
    const host = io(SERVER_URL, { reconnection: false });
    const voterA = io(SERVER_URL, { reconnection: false });
    const voterB = io(SERVER_URL, { reconnection: false });
    const badUser = io(SERVER_URL, { reconnection: false });

    await Promise.all([
      new Promise((res) => host.on('connect', res)),
      new Promise((res) => voterA.on('connect', res)),
      new Promise((res) => voterB.on('connect', res)),
      new Promise((res) => badUser.on('connect', res)),
    ]);

    let kickRoomCode = '';
    let hostData = null;
    await new Promise((resolve) => {
      host.emit('create_room', { playerName: 'HostMod' }, (res) => {
        kickRoomCode = res.data.code;
        hostData = res.data.players[0];
        resolve();
      });
    });

    let voterAData = null;
    let voterBData = null;
    let badUserData = null;

    await new Promise((resolve) => {
      voterA.emit('join_room', { roomCode: kickRoomCode, playerName: 'AliceVoter' }, (res) => {
        voterAData = res.data.players.find((p) => p.name === 'AliceVoter');
        resolve();
      });
    });

    await new Promise((resolve) => {
      voterB.emit('join_room', { roomCode: kickRoomCode, playerName: 'BobVoter' }, (res) => {
        voterBData = res.data.players.find((p) => p.name === 'BobVoter');
        resolve();
      });
    });

    await new Promise((resolve) => {
      badUser.emit('join_room', { roomCode: kickRoomCode, playerName: 'TrollUser' }, (res) => {
        badUserData = res.data.players.find((p) => p.name === 'TrollUser');
        resolve();
      });
    });

    await sleep(200);

    // Test 4: Cannot vote kick yourself
    let selfKickError = null;
    await new Promise((resolve) => {
      voterA.emit('vote_kick_start', { targetId: voterAData.id }, (res) => {
        selfKickError = res.error;
        resolve();
      });
    });
    assert(Boolean(selfKickError), 'Rejected initiating vote kick against oneself');

    // Test 5: Cannot vote kick the host (protected moderator)
    let hostKickError = null;
    await new Promise((resolve) => {
      voterA.emit('vote_kick_start', { targetId: hostData.id }, (res) => {
        hostKickError = res.error;
        resolve();
      });
    });
    assert(Boolean(hostKickError), 'Rejected initiating vote kick against the room host');

    // Test 6: Valid vote kick initiation
    let voteStartedData = null;
    voterB.on('vote_kick_started', (data) => {
      voteStartedData = data;
    });

    let startSuccess = false;
    await new Promise((resolve) => {
      voterA.emit(
        'vote_kick_start',
        { targetId: badUserData.id, reason: 'Trolling in chat' },
        (res) => {
          startSuccess = res.success;
          resolve();
        }
      );
    });

    await sleep(200);
    assert(startSuccess, 'Voter A successfully started vote kick against TrollUser');
    assert(voteStartedData !== null, 'Room received vote_kick_started event');
    assert(voteStartedData.targetName === 'TrollUser', 'Vote target correctly identified');
    assert(voteStartedData.yesVotes === 1, 'Initiator automatically cast YES vote');
    assert(voteStartedData.requiredVotes === 2, 'Required majority threshold calculated as 2 (out of 2 eligible non-host voters)');

    // Test 7: Target cannot vote
    let targetVoteError = null;
    await new Promise((resolve) => {
      badUser.emit('vote_kick_cast', { vote: false }, (res) => {
        targetVoteError = res.error;
        resolve();
      });
    });
    assert(Boolean(targetVoteError), 'Target was prevented from voting on their own kick');

    // Test 8: Duplicate voting is rejected
    let duplicateVoteError = null;
    await new Promise((resolve) => {
      voterA.emit('vote_kick_cast', { vote: true }, (res) => {
        duplicateVoteError = res.error;
        resolve();
      });
    });
    assert(Boolean(duplicateVoteError), 'Duplicate vote submission by initiator was rejected');

    // Test 9: Host cannot vote (protected moderator)
    let hostVoteError = null;
    await new Promise((resolve) => {
      host.emit('vote_kick_cast', { vote: true }, (res) => {
        hostVoteError = res.error;
        resolve();
      });
    });
    assert(Boolean(hostVoteError), 'Protected host was prevented from voting in democratic kick');

    // Test 10: Second vote cast (Bob votes YES) -> Vote passes!
    let voteResultEvent = null;
    let kickedEventReceived = false;

    voterA.on('vote_kick_result', (res) => {
      voteResultEvent = res;
    });

    badUser.on('kicked_from_room', () => {
      kickedEventReceived = true;
    });

    await new Promise((resolve) => {
      voterB.emit('vote_kick_cast', { vote: true }, resolve);
    });

    await sleep(300);

    assert(voteResultEvent !== null && voteResultEvent.passed === true, 'Vote passed after reaching majority threshold (2 YES votes)');
    assert(kickedEventReceived, 'Target player received kicked_from_room socket notification');

    // Test 11: Kicked player cannot rejoin room
    let rejoinError = null;
    await new Promise((resolve) => {
      badUser.emit('join_room', { roomCode: kickRoomCode, playerName: 'TrollUser', playerId: badUserData.id }, (res) => {
        if (!res.success) {
          rejoinError = res.error;
        }
        resolve();
      });
    });

    assert(Boolean(rejoinError), 'Kicked player was prevented from rejoining the room (blacklist enforced)');

    console.log(`\n🎉 SUCCESS: All ${passedTests} Feature Enhancement Tests Passed!`);

    host.disconnect();
    voterA.disconnect();
    voterB.disconnect();
    badUser.disconnect();

    server.close(() => {
      console.log('✓ Test Server stopped cleanly\n');
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 1000);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runEnhancementsTestSuite();
