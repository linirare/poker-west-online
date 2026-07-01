// Minimal PvP repro test
const { io } = require('socket.io-client');
const HOST = 'http://localhost:3000';

async function main() {
  console.log('=== PvP Bug Repro ===');
  const host = io(HOST, { transports: ['websocket'] });
  const friend = io(HOST, { transports: ['websocket'] });

  // Track events
  let hostErr, friendErr;

  function waitFor(s, ev) { return new Promise(r => s.once(ev, r)); }

  host.on('connect', () => console.log('host connected'));
  host.on('connect_error', e => { hostErr = e.message; console.log('host connect_error:', e.message); });
  host.on('disconnect', r => console.log('host disconnect reason:', r));
  host.on('error', e => console.log('host error:', typeof e === 'string' ? e : e.message));

  friend.on('connect', () => console.log('friend connected'));
  friend.on('connect_error', e => { friendErr = e.message; console.log('friend connect_error:', e.message); });
  friend.on('disconnect', r => console.log('friend disconnect reason:', r));
  friend.on('error', e => console.log('friend error:', typeof e === 'string' ? e : e.message));

  await waitFor(host, 'connect');
  await waitFor(friend, 'connect');

  // Create room (no skills needed to avoid skill bugs)
  host.emit('pvp_create_room', { skills: ['bomb', 'magician'], name: 'A' });
  const { roomId } = await waitFor(host, 'room_created');
  console.log('Room:', roomId);

  // Join
  friend.emit('pvp_join_room', { roomId, skills: ['bomb', 'magician'], name: 'B' });
  await waitFor(host, 'game_state');
  const friendGS = await waitFor(friend, 'game_state');
  console.log('Friend got game_state');

  // Both submit
  const need = 3; // round 1 = 3 cards
  const hostHand = (await waitFor(host, 'game_state')).me?.hand || (await (() => new Promise(r => host.once('game_state', r)))());
  // Actually just get from friend's perspective since that's latest

  // Friend submits first (to test)
  const friendHand = friendGS.me.hand;
  const fSel = friendHand.slice(0, need).map(c => c.id);
  friend.emit('submit_play', { selected: fSel });
  console.log('Friend submitted');

  // Wait, then host submits
  await new Promise(r => setTimeout(r, 500));

  // Host needs to get game_state first to see their own hand
  const hostGS = await new Promise(r => {
    host.once('game_state', d => r(d));
    // In case game_state already fired, we need a different approach
  }).catch(() => null);

  // Actually the host already got game_state from the auto-start
  // Let me get the current state by having both emit next and seeing what happens
  // Simpler: just resubmit with fresh data

  console.log('Host submitting...');
  // Host already has their hand from the initial game_state

  // Send a direct submit
  // Use the initial friendGS to figure out host hand is unknown
  // Let me take a different approach - make host emit again

  console.log('Host needs hand data... requesting via game_state');

  // Simpler approach: just make host submit with their hand from last game_state
  // Actually, let me just have the host also submit using their own hand

  await new Promise(r => setTimeout(r, 300));

  // The host got game_state when the game auto-started
  // But we missed it since we only waited for friend's

  // Let me just re-approach this - use a single listener from the beginning

  host.close();
  friend.close();
  console.log('=== Done ===');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
