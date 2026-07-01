const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const game = require('./game');
const rooms = require('./rooms');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, '..', 'client')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3000;

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // === PvE: Create solo game vs AI ===
  socket.on('pve_start', ({ skills, difficulty = 1 }) => {
    const roomId = rooms.createRoom(socket.id, '你', skills, 'pve', difficulty);
    const battle = rooms.startBattle(roomId);
    if (!battle) return socket.emit('error', { msg: '创建失败' });

    socket.join(roomId);
    socket.emit('game_state', game.buildPlayerView(battle, 'player'));

    // AI auto-play after short delay
    setTimeout(() => {
      processAITurn(roomId);
    }, 600);
  });

  // === PvP: Create room ===
  socket.on('pvp_create_room', ({ skills, name }) => {
    const roomId = rooms.createRoom(socket.id, name || '玩家', skills, 'pvp');
    socket.join(roomId);
    socket.emit('room_created', { roomId });
  });

  // === PvP: Join room ===
  socket.on('pvp_join_room', ({ roomId, skills, name }) => {
    const result = rooms.joinRoom(roomId, socket.id, name || '玩家', skills);
    if (result.error) return socket.emit('error', { msg: result.error });

    socket.join(roomId);
    const room = rooms.getRoom(roomId);

    // Notify both players
    io.to(roomId).emit('opponent_joined', {
      players: room.players.map(p => ({ name: p.name, side: p.side }))
    });

    // Auto-start when both players are ready
    if (room.players.length === 2) {
      const battle = rooms.startBattle(roomId);
      if (!battle) return;

      // Send player view to each
      const hostSocket = room.players[0].socketId;
      const guestSocket = room.players[1].socketId;
      io.to(hostSocket).emit('game_state', game.buildPlayerView(battle, 'player'));
      io.to(guestSocket).emit('game_state', game.buildPlayerView(battle, 'opp'));
    }
  });

  // === PvP: Submit play ===
  socket.on('submit_play', ({ selected }) => {
    const roomId = rooms.getPlayerRoom(socket.id);
    if (!roomId) return;
    const room = rooms.getRoom(roomId);
    if (!room || !room.battle || room.battle.mode !== 'pvp') return;
    if (room.battle.phase !== 'select') return;

    const side = getSide(room, socket.id);
    if (!side) return;

    const fighter = room.battle[side];
    const need = game.roundNeed(side, room.battle);

    if (selected.length !== need) {
      return socket.emit('error', { msg: `需要选择 ${need} 张` });
    }

    // Execute play
    const playedCards = fighter.hand.filter(c => selected.includes(c.id));
    fighter.hand = fighter.hand.filter(c => !selected.includes(c.id));
    fighter.played = playedCards;
    fighter.discard.push(...playedCards);
    room.battle.submitted[side] = true;

    // Check both submitted
    const otherSide = side === 'player' ? 'opp' : 'player';
    if (room.battle.submitted[otherSide]) {
      // Both submitted - resolve
      resolvePvPRound(room, roomId);
    } else {
      io.to(roomId).emit('opponent_submitted', { side });
      socket.emit('submitted', { side });
    }
  });

  // === PvE: Player submit ===
  socket.on('player_play', ({ selected }) => {
    const roomId = rooms.getPlayerRoom(socket.id);
    if (!roomId) return;
    const room = rooms.getRoom(roomId);
    if (!room || !room.battle) return;
    if (room.battle.phase !== 'select') return;

    const p = room.battle.player;
    const need = game.roundNeed('player', room.battle);

    if (selected.length !== need) {
      return socket.emit('error', { msg: `需要选择 ${need} 张` });
    }

    p.played = p.hand.filter(c => selected.includes(c.id));
    p.hand = p.hand.filter(c => !selected.includes(c.id));
    p.discard.push(...p.played);
    room.battle.submitted.player = true;

    // AI is automatic, so resolve immediately
    const result = game.executeRound(room.battle);
    socket.emit('round_result', {
      winner: result.winner,
      pe: { name: result.pe.name, cat: result.pe.cat, cards: result.pe.cards },
      oe: { name: result.oe.name, cat: result.oe.cat, cards: result.oe.cards },
      dmg: result.dmg,
      isOver: game.isOver(room.battle),
      logs: [...room.battle.logs].slice(0, 50)
    });
    socket.emit('game_state', game.buildPlayerView(room.battle, 'player'));
  });

  // === PvP: Use skill ===
  socket.on('use_skill', ({ skillId }) => {
    const roomId = rooms.getPlayerRoom(socket.id);
    if (!roomId) return;
    const room = rooms.getRoom(roomId);
    if (!room || !room.battle || room.battle.phase !== 'select') return;

    const side = getSide(room, socket.id);
    if (!side) return;

    const fighter = room.battle[side];
    const sk = fighter.skills[skillId];
    if (!sk || sk.used || fighter.skillUses >= 2) return;

    sk.used = true; sk.charge = 0; fighter.skillUses++;
    const logs = game.applySkill(side, skillId, room.battle);
    room.battle.logs.push(...logs);

    io.to(roomId).emit('skill_used', { side, skillId, name: game.SM[skillId]?.name });
    socket.emit('game_state', game.buildPlayerView(room.battle, side));
    if (side === 'player') {
      socket.to(roomId).emit('game_state', game.buildPlayerView(room.battle, 'opp'));
    } else {
      socket.to(roomId).emit('game_state', game.buildPlayerView(room.battle, 'player'));
    }
  });

  // === PvE: Use skill ===
  socket.on('pve_skill', ({ skillId }) => {
    const roomId = rooms.getPlayerRoom(socket.id);
    if (!roomId) return;
    const room = rooms.getRoom(roomId);
    if (!room || !room.battle) return;

    const p = room.battle.player;
    const sk = p.skills[skillId];
    if (!sk || sk.used || p.skillUses >= 2) return;

    sk.used = true; sk.charge = 0; p.skillUses++;
    const logs = game.applySkill('player', skillId, room.battle);
    room.battle.logs.push(...logs);

    socket.emit('game_state', game.buildPlayerView(room.battle, 'player'));
    socket.emit('skill_used', { side: 'player', skillId, name: game.SM[skillId]?.name });
  });

  // === Next round ===
  socket.on('next_round', () => {
    const roomId = rooms.getPlayerRoom(socket.id);
    if (!roomId) return;
    const room = rooms.getRoom(roomId);
    if (!room || !room.battle) return;

    if (game.isOver(room.battle)) {
      finishGame(room, roomId);
      return;
    }

    if (room.battle.mode === 'pvp') {
      const side = getSide(room, socket.id);
      if (!side) return;
      room.battle.ready[side] = true;

      if (room.battle.ready.player && room.battle.ready.opp) {
        room.battle.ready = { player: false, opp: false };
        game.nextRound(room.battle);
        io.to(roomId).emit('game_state', game.buildPlayerView(room.battle, 'player'));
        io.to(roomId).emit('game_state_opp', game.buildPlayerView(room.battle, 'opp'));
      }
    } else {
      game.nextRound(room.battle);
      socket.emit('game_state', game.buildPlayerView(room.battle, 'player'));
      setTimeout(() => processAITurn(roomId), 500);
    }
  });

  // === Leave room ===
  socket.on('leave_room', () => {
    const roomId = rooms.leaveRoom(socket.id);
    if (roomId) {
      socket.leave(roomId);
      socket.to(roomId).emit('opponent_left');
      rooms.removeRoom(roomId);
    }
  });

  // === Disconnect ===
  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`);
    const roomId = rooms.leaveRoom(socket.id);
    if (roomId) {
      io.to(roomId).emit('opponent_left');
      rooms.removeRoom(roomId);
    }
  });
});

function getSide(room, socketId) {
  if (room.players[0]?.socketId === socketId) return 'player';
  if (room.players[1]?.socketId === socketId) return 'opp';
  return null;
}

function processAITurn(roomId) {
  const room = rooms.getRoom(roomId);
  if (!room || !room.battle || room.battle.phase !== 'select') return;

  // Auto-play AI: skills then cards
  const o = room.battle.opp;
  let avail = Object.values(o.skills).filter(s => !s.used);
  if (avail.length) {
    const cat = game.handCat(o.hand, room.battle.community);
    if (cat < 4 || Math.random() < 0.35) {
      const id = game.aiPickSkill('start', avail, 'start', room.difficulty, o.hp, room.battle.player.hp, room.battle.round);
      if (id && !o.skills[id]?.used) { o.skills[id].used = true; o.skills[id].charge = 0; game.applySkill('opp', id, room.battle); }
    }
  }

  const oppNeed = game.roundNeed('opp', room.battle);
  while (o.hand.length < oppNeed) o.hand.push(...game.draw(room.battle.deck, 1));
  const best = game.chooseBest(o.hand, oppNeed, room.battle.community, o.buff);
  o.played = best.map(c => ({ ...c }));
  o.hand = o.hand.filter(c => !best.includes(c));
  o.discard.push(...best);

  avail = Object.values(o.skills).filter(s => !s.used);
  if (avail.length) {
    const id = game.aiPickSkill('play', avail, 'play', room.difficulty, o.hp, room.battle.player.hp, room.battle.round);
    if (id && !o.skills[id]?.used) { o.skills[id].used = true; o.skills[id].charge = 0; game.applySkill('opp', id, room.battle); }
  }

  room.battle.submitted.opp = true;
  io.to(roomId).emit('ai_ready');

  // If player already submitted, resolve
  if (room.battle.submitted.player) {
    const result = game.executeRound(room.battle);
    io.to(roomId).emit('round_result', {
      winner: result.winner,
      pe: { name: result.pe.name, cat: result.pe.cat, cards: result.pe.cards },
      oe: { name: result.oe.name, cat: result.oe.cat, cards: result.oe.cards },
      dmg: result.dmg,
      isOver: game.isOver(room.battle),
      logs: [...room.battle.logs].slice(0, 50)
    });
    io.to(roomId).emit('game_state', game.buildPlayerView(room.battle, 'player'));
  }
}

function resolvePvPRound(room, roomId) {
  const p = room.battle.player, o = room.battle.opp;
  let pe = game.evaluate([...p.played, ...room.battle.community], { ...p.buff, played: p.played });
  let oe = game.evaluate([...o.played, ...room.battle.community], { ...o.buff, played: o.played });
  let cmp = game.compare(pe.score, oe.score);
  let winner = cmp > 0 ? 'player' : cmp < 0 ? 'opp' : 'tie';
  let dmg = winner === 'tie' ? 0 : 1;

  room.battle.last = { winner, pEval: pe, oEval: oe, dmg };
  if (winner === 'player') { o.hp = Math.max(0, o.hp - dmg); room.battle.roundWins.player++; }
  else if (winner === 'opp') { p.hp = Math.max(0, p.hp - dmg); room.battle.roundWins.opp++; }
  room.battle.phase = 'result';
  room.battle.logs.push(`本局结果：我方【${pe.name}】 vs 对手【${oe.name}】`);
  room.battle.submitted = { player: false, opp: false };

  io.to(roomId).emit('round_result', {
    winner,
    pe: { name: pe.name, cat: pe.cat, cards: pe.cards },
    oe: { name: oe.name, cat: oe.cat, cards: oe.cards },
    dmg, isOver: game.isOver(room.battle)
  });
  io.to(roomId).emit('game_state', game.buildPlayerView(room.battle, 'player'));
  io.to(roomId).emit('game_state_opp', game.buildPlayerView(room.battle, 'opp'));
}

function finishGame(room, roomId) {
  const b = room.battle;
  if (b.mode === 'pvp') {
    const pWin = b.roundWins.player > b.roundWins.opp || b.opp.hp <= 0;
    const oWin = b.roundWins.opp > b.roundWins.player || b.player.hp <= 0;
    io.to(room.players[0].socketId).emit('game_over', { win: pWin, roundWins: { ...b.roundWins }, playerHp: b.player.hp, oppHp: b.opp.hp });
    io.to(room.players[1].socketId).emit('game_over', { win: oWin, roundWins: { ...b.roundWins }, playerHp: b.opp.hp, oppHp: b.player.hp });
  } else {
    const win = b.roundWins.player > b.roundWins.opp || b.opp.hp <= 0;
    io.to(roomId).emit('game_over', { win, roundWins: { ...b.roundWins }, playerHp: b.player.hp, oppHp: b.opp.hp });
  }
}

server.listen(PORT, () => {
  console.log(`[server] Poker online running on port ${PORT}`);
});
