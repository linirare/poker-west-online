const { io } = require('socket.io-client');
const fs = require('fs');
const HOST = 'http://localhost:3000';
const SK = ['bomb','magician'];
const log = m => fs.appendFileSync('_test3.log', m + '\n');

async function main() {
  log('=== START ===');
  const h = io(HOST, { transports: ['websocket'] });
  const f = io(HOST, { transports: ['websocket'] });
  const wait = (s, e) => new Promise(r => { s.once(e, (...args) => r(args)); });

  await Promise.all([
    new Promise(r => h.on('connect', r)),
    new Promise(r => f.on('connect', r)),
  ]);
  log('Both connected');

  h.emit('pvp_create_room', { skills: SK, name: 'A' });
  const [rd] = await wait(h, 'room_created');
  log('rd type:' + typeof rd + ' keys:' + Object.keys(rd || {}).join(','));
  log('rd JSON:' + JSON.stringify(rd));

  f.emit('pvp_join_room', { roomId: rd.roomId, skills: SK, name: 'B' });
  const [hgs] = await wait(h, 'game_state');
  log('hgs type:' + typeof hgs);
  log('hgs keys:' + (hgs ? Object.keys(hgs).join(',') : 'null'));
  log('hgs.phase:' + hgs?.phase);
  log('hgs.player type:' + typeof hgs?.player);
  log('hgs.player keys:' + (hgs?.player ? Object.keys(hgs.player).join(',') : 'null'));
  log('hgs.player.hand len:' + (hgs?.player?.hand?.length));
  log('hgs.round:' + hgs?.round);
  log('hgs.submitted:' + hgs?.submitted);

  if (hgs?.player?.hand) {
    const need = Math.max(1, [3,3,3,4,5][Math.min((hgs.round||1)-1,4)] + (hgs.player.playBonus||0));
    const sel = hgs.player.hand.slice(0, need).map(c => c.id);
    log('need:' + need + ' selLen:' + sel.length);

    h.emit('submit_play', { selected: sel });
    log('Submitted');

    const result = await Promise.race([
      wait(h, 'submitted').then(([d]) => 'submitted:' + JSON.stringify(d)),
      wait(h, 'error').then(([d]) => 'err:' + JSON.stringify(d)),
      wait(h, 'disconnect').then(r => 'dc:' + r),
      new Promise(r => setTimeout(r, 3000)).then(() => 'TIMEOUT'),
    ]);
    log('Result:' + result);
  } else {
    log('CANNOT SUBMIT - no hand data');
  }

  h.close(); f.close();
  log('=== END ===');
  process.exit(0);
}

main().catch(e => { log('CRASH:' + e.message + ' ' + e.stack); process.exit(1); });
