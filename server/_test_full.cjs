const { io } = require('socket.io-client');
const fs = require('fs');
const HOST = 'http://localhost:3000';
const SK = ['bomb','magician'];
const log = m => fs.appendFileSync('_test_full.log', m + '\n');

async function main() {
  log('=== FULL PVP TEST ===');
  const h = io(HOST, { transports: ['websocket'] });
  const f = io(HOST, { transports: ['websocket'] });
  const wait = (s, e) => new Promise(r => { s.once(e, (...a) => r(a)); });

  h.on('disconnect', r => log('H DISCONNECT reason:' + r));
  f.on('disconnect', r => log('F DISCONNECT reason:' + r));

  await Promise.all([
    new Promise(r => h.on('connect', r)),
    new Promise(r => f.on('connect', r)),
  ]);
  log('Both connected');

  // Create room
  h.emit('pvp_create_room', { skills: SK, name: 'A' });
  const [rd] = await wait(h, 'room_created');
  log('Room:' + rd.roomId);

  // Join
  f.emit('pvp_join_room', { roomId: rd.roomId, skills: SK, name: 'B' });
  const [hgs] = await wait(h, 'game_state');
  const [fgs] = await wait(f, 'game_state');
  log('Both got game_state, phase:' + hgs.phase + ' f_hand:' + fgs.player.hand.length);

  // Host submits
  const hNeed = Math.max(1, [3,3,3,4,5][Math.min((hgs.round||1)-1,4)] + (hgs.player.playBonus||0));
  const hSel = hgs.player.hand.slice(0, hNeed).map(c => c.id);
  h.emit('submit_play', { selected: hSel });
  await wait(h, 'submitted');
  log('Host submitted OK');

  // Friend should see opponent_submitted
  const [oppEv] = await wait(f, 'opponent_submitted');
  log('Friend got opponent_submitted:' + JSON.stringify(oppEv));

  // Friend should get game_state with host's played cards
  const [fgs2] = await wait(f, 'game_state');
  log('Friend got game_state2 phase:' + fgs2.phase + ' oppPlayed:' + (fgs2.opponent?.played?.length || 0));

  // Friend submits
  const fNeed = Math.max(1, [3,3,3,4,5][Math.min((fgs2.round||1)-1,4)] + (fgs2.player.playBonus||0));
  const fSel = fgs2.player.hand.slice(0, fNeed).map(c => c.id);
  f.emit('submit_play', { selected: fSel });
  await wait(f, 'submitted');
  log('Friend submitted OK');

  // Both should get round_result
  const [hrr, frr] = await Promise.all([
    wait(h, 'round_result').then(([d]) => d),
    wait(f, 'round_result').then(([d]) => d),
  ]);
  log('H round_result winner:' + hrr.winner + ' dmg:' + hrr.dmg + ' isOver:' + hrr.isOver);
  log('F round_result winner:' + frr.winner + ' dmg:' + frr.dmg + ' isOver:' + frr.isOver);

  // Both should get game_state after result
  const [hgs3, fgs3] = await Promise.all([
    wait(h, 'game_state').then(([d]) => d),
    wait(f, 'game_state').then(([d]) => d),
  ]);
  log('H after phase:' + hgs3.phase + ' hp:' + hgs3.player.hp);
  log('F after phase:' + fgs3.phase + ' hp:' + fgs3.player.hp);

  log('=== FULL TEST PASSED ===');
  h.close(); f.close();
  process.exit(0);
}

main().catch(e => { log('CRASH:' + e.message); process.exit(1); });
