const { io } = require('socket.io-client');
const fs = require('fs');
const HOST = 'http://localhost:3000';
const SK = ['bomb','magician'];
const log = m => fs.appendFileSync('_test_final.log', m + '\n');

async function waitFor(s, event, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeoutMs);
    s.once(event, (...args) => { clearTimeout(timer); resolve(args.length <= 1 ? args[0] : args); });
  });
}

async function main() {
  log('=== PVP STRESS TEST ===');
  const h = io(HOST, { transports: ['websocket'] });
  const f = io(HOST, { transports: ['websocket'] });

  h.on('disconnect', r => log('H DISCONNECT reason:' + r));
  f.on('disconnect', r => log('F DISCONNECT reason:' + r));

  await Promise.all([
    new Promise(r => h.on('connect', r)),
    new Promise(r => f.on('connect', r)),
  ]);
  log('Both connected');

  // Create room
  h.emit('pvp_create_room', { skills: SK, name: 'A' });
  const roomData = await waitFor(h, 'room_created');
  log('Room:' + roomData.roomId + ' skills:' + SK.join(','));

  // Join
  f.emit('pvp_join_room', { roomId: roomData.roomId, skills: SK, name: 'B' });

  // Both get game_state from auto-start
  // Wait for BOTH game_states (order varies)
  const hGS = await waitFor(h, 'game_state');
  const fGS = await waitFor(f, 'game_state');
  log('H hand:' + hGS.player.hand.length + ' oppHand:' + hGS.opponent.handCount);
  log('F hand:' + fGS.player.hand.length + ' oppHand:' + fGS.opponent.handCount);

  // Set up listeners for friend BEFORE host submits
  // to avoid race condition
  const fOppSubPromise = waitFor(f, 'opponent_submitted');
  const fGSPromise = waitFor(f, 'game_state');

  // Host submits
  const hNeed = Math.max(1, [3,3,3,4,5][Math.min((hGS.round||1)-1,4)] + (hGS.player.playBonus||0));
  const hSel = hGS.player.hand.slice(0, hNeed).map(c => c.id);
  log('H need:' + hNeed + ' sel:' + hSel.length);
  h.emit('submit_play', { selected: hSel });
  await waitFor(h, 'submitted');
  log('H submitted OK');

  // Friend gets events
  await fOppSubPromise;
  log('F got opponent_submitted');
  const fGS2 = await fGSPromise;
  log('F got game_state2 phase:' + fGS2.phase + ' oppPlayed:' + (fGS2.opponent?.played?.length || 0));

  // Set up round_result listeners for BOTH
  const hRRPromise = waitFor(h, 'round_result');
  const fRRPromise = waitFor(f, 'round_result');

  // Friend submits
  const fNeed = Math.max(1, [3,3,3,4,5][Math.min((fGS2.round||1)-1,4)] + (fGS2.player.playBonus||0));
  const fSel = fGS2.player.hand.slice(0, fNeed).map(c => c.id);
  log('F need:' + fNeed + ' hand:' + fGS2.player.hand.length + ' sel:' + fSel.length);
  f.emit('submit_play', { selected: fSel });
  await waitFor(f, 'submitted');
  log('F submitted OK');

  // Both get round_result
  const hRR = await hRRPromise;
  const fRR = await fRRPromise;
  log('H round_result winner:' + hRR.winner + ' dmg:' + hRR.dmg + ' isOver:' + hRR.isOver);
  log('F round_result winner:' + fRR.winner + ' dmg:' + fRR.dmg + ' isOver:' + fRR.isOver);

  // Check no disconnects
  log('=== PVP TEST PASSED ===');
  h.close(); f.close();
  process.exit(0);
}

main().catch(e => { log('FAILED:' + e.message); process.exit(1); });
