const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const game = require('./game');
const rooms = require('./rooms');
const { initDb, addChatMessage, getChatMessages } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'client', 'admin.html')));

const { initDb } = require('./db');
initDb();

const { router: authRouter } = require('./auth');
app.use('/api/auth', authRouter);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 25000,
  pingTimeout: 15000,
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3000;

let onlineCount = 0;

io.on('connection', (socket) => {
  onlineCount++;
  io.emit('online_count', onlineCount);
  console.log(`[connect] ${socket.id} (online: ${onlineCount})`);
  socket.emit('online_count', onlineCount);
  socket.emit('chat_history', getChatMessages(30));

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

  // === PvP: List rooms ===
  socket.on('pvp_list_rooms', () => {
    socket.emit('room_list', rooms.listRooms());
  });

  // === PvP: Create room ===
  socket.on('pvp_create_room', ({ skills, name, roomName }) => {
    const roomId = rooms.createRoom(socket.id, name || '玩家', skills, 'pvp', 1, roomName);
    socket.join(roomId);
    socket.emit('room_created', { roomId, hostName: name || '玩家', roomName });
    io.emit('room_list', rooms.listRooms());
  });

  // === PvP: Join room ===
  socket.on('pvp_join_room', ({ roomId, skills, name }) => {
    const result = rooms.joinRoom(roomId, socket.id, name || '玩家', skills);
    if (result.error) return socket.emit('error', { msg: result.error });

    socket.join(roomId);
    const room = rooms.getRoom(roomId);

    // Notify room members (not auto-start — host decides)
    io.to(roomId).emit('player_joined', {
      players: room.players.map(p => ({ name: p.name, socketId: p.socketId }))
    });
    socket.emit('room_info', {
      roomId,
      hostId: room.hostId,
      roomName: room.roomName,
      players: room.players.map(p => ({ name: p.name, socketId: p.socketId }))
    });
    io.emit('room_list', rooms.listRooms());
  });

  // === PvP: Kick player ===
  socket.on('pvp_kick_player', ({ roomId, targetSocketId }) => {
    const room = rooms.getRoom(roomId);
    if (!room || room.hostId !== socket.id) return;
    const targetSock = io.sockets.sockets.get(targetSocketId);
    if (targetSock) { targetSock.emit('kicked'); targetSock.leave(roomId); }
    rooms.kickPlayer(roomId, targetSocketId);
    const updated = rooms.getRoom(roomId);
    if (updated) {
      io.to(roomId).emit('player_joined', {
        players: updated.players.map(p => ({ name: p.name, socketId: p.socketId }))
      });
    }
    io.emit('room_list', rooms.listRooms());
  });

  // === PvP: Host starts game ===
  socket.on('pvp_host_start', () => {
    const roomId = rooms.getPlayerRoom(socket.id);
    if (!roomId) return;
    const room = rooms.getRoom(roomId);
    if (!room || room.hostId !== socket.id || room.players.length < 2) return;
    room.phase = 'confirm';
    io.to(roomId).emit('room_confirm', {
      players: room.players.map(p => ({ name: p.name, socketId: p.socketId }))
    });
  });

  // === PvP: Confirm ready ===
  socket.on('pvp_confirm_ready', () => {
    const roomId = rooms.getPlayerRoom(socket.id);
    if (!roomId) return;
    const room = rooms.getRoom(roomId);
    if (!room || room.phase !== 'confirm') return;
    const p = room.players.find(p => p.socketId === socket.id);
    if (p) p.ready = true;
    if (room.players.length >= 2 && room.players.every(p => p.ready)) {
      const battle = rooms.startBattle(roomId);
      if (battle) {
        io.to(room.players[0].socketId).emit('game_state', game.buildPlayerView(battle, 'player'));
        io.to(room.players[1].socketId).emit('game_state', game.buildPlayerView(battle, 'opp'));
      }
    } else {
      io.to(roomId).emit('confirm_progress', {
        readyCount: room.players.filter(p => p.ready).length,
        total: room.players.length
      });
    }
  });

  // === PvP: Decline/exit during confirm ===
  socket.on('pvp_decline', () => {
    const roomId = rooms.getPlayerRoom(socket.id);
    if (!roomId) return;
    socket.leave(roomId);
    rooms.leaveRoom(socket.id);
    socket.emit('left_room');
    const room = rooms.getRoom(roomId);
    if (room && room.players.length > 0) {
      io.to(roomId).emit('player_joined', {
        players: room.players.map(p => ({ name: p.name, socketId: p.socketId }))
      });
    } else {
      io.to(roomId).emit('opponent_left');
      rooms.removeRoom(roomId);
    }
    io.emit('room_list', rooms.listRooms());
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

    // Acknowledge submission to the sender
    socket.emit('submitted', { side });

    // Check both submitted
    const otherSide = side === 'player' ? 'opp' : 'player';
    if (room.battle.submitted[otherSide]) {
      // Both submitted - resolve (with error handling to avoid crash disconnect)
      try {
        resolvePvPRound(room, roomId);
      } catch (e) {
        console.error('[resolvePvPRound error]', e);
        io.to(roomId).emit('error', { msg: '结算异常，请重开一局' });
      }
    } else {
      io.to(roomId).emit('opponent_submitted', { side });
      // Send fresh game_state to the waiting player so they see opponent's played cards
      const otherIdx = otherSide === 'player' ? 0 : 1;
      io.to(room.players[otherIdx].socketId).emit('game_state', game.buildPlayerView(room.battle, otherSide));
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
  socket.on('use_skill', ({ skillId, selected }) => {
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
    // Remember victim's discard length to detect newly discarded cards
    const victim = room.battle[side === 'player' ? 'opp' : 'player'];
    const dcLen = victim.discard.length;
    const logs = game.applySkill(side, skillId, room.battle, selected);
    room.battle.logs.push(...logs);
    // Check if any cards were discarded from the victim
    const lostCard = victim.discard.length > dcLen ? victim.discard[victim.discard.length - 1] : null;

    io.to(roomId).emit('skill_used', { side, skillId, name: game.SM[skillId]?.name, lostCard: lostCard ? { rank: lostCard.rank, suit: lostCard.suit } : null });
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
        io.to(room.players[0].socketId).emit('game_state', game.buildPlayerView(room.battle, 'player'));
        io.to(room.players[1].socketId).emit('game_state', game.buildPlayerView(room.battle, 'opp'));
      }
    } else {
      game.nextRound(room.battle);
      socket.emit('game_state', game.buildPlayerView(room.battle, 'player'));
      setTimeout(() => processAITurn(roomId), 500);
    }
  });

  // === PvP: Rematch (back to lobby) ===
  socket.on('pvp_rematch', () => {
    const roomId = rooms.getPlayerRoom(socket.id);
    if (!roomId) return;
    const room = rooms.getRoom(roomId);
    if (!room) return;
    room.phase = 'lobby';
    room.battle = null;
    room.players.forEach(p => { p.ready = false; });
    io.to(roomId).emit('room_rematch', {
      roomId, hostId: room.hostId, roomName: room.roomName,
      players: room.players.map(p => ({ name: p.name, socketId: p.socketId }))
    });
    io.emit('room_list', rooms.listRooms());
  });

  // === Leave room ===
  socket.on('leave_room', () => {
    const roomId = rooms.leaveRoom(socket.id);
    if (roomId) {
      socket.leave(roomId);
      const room = rooms.getRoom(roomId);
      if (room && room.players.length > 0) {
        if (room.phase === 'playing') {
          io.to(roomId).emit('opponent_left');
        } else {
          io.to(roomId).emit('player_joined', {
            players: room.players.map(p => ({ name: p.name, socketId: p.socketId }))
          });
        }
      } else {
        io.to(roomId).emit('opponent_left');
      }
      io.emit('room_list', rooms.listRooms());
    }
  });

  // === Disconnect ===
  socket.on('disconnect', () => {
    onlineCount = Math.max(0, onlineCount - 1);
    io.emit('online_count', onlineCount);
    console.log(`[disconnect] ${socket.id} (online: ${onlineCount})`);
    const roomId = rooms.leaveRoom(socket.id);
    if (roomId) {
      const room = rooms.getRoom(roomId);
      if (room && room.players.length > 0) {
        if (room.phase === 'playing') {
          io.to(roomId).emit('opponent_left');
        } else {
          io.to(roomId).emit('player_joined', {
            players: room.players.map(p => ({ name: p.name, socketId: p.socketId }))
          });
        }
      } else {
        io.to(roomId).emit('opponent_left');
      }
      io.emit('room_list', rooms.listRooms());
    }
  });

  // === Chat ===
  socket.on('chat_message', ({ name, text }) => {
    if (!text || typeof text !== 'string') return;
    const msg = text.trim().slice(0, 200);
    if (!msg) return;
    const displayName = (name || '匿名').slice(0, 12);
    const entry = { name: displayName, text: msg, time: Date.now() };
    addChatMessage(entry);
    io.emit('new_chat_message', entry);
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
  // Send per-perspective game state
  io.to(room.players[0].socketId).emit('game_state', game.buildPlayerView(room.battle, 'player'));
  io.to(room.players[1].socketId).emit('game_state', game.buildPlayerView(room.battle, 'opp'));
}

function finishGame(room, roomId) {
  const b = room.battle;
  if (b.mode === 'pvp') {
    const pWin = b.roundWins.player > b.roundWins.opp || b.opp.hp <= 0;
    const oWin = b.roundWins.opp > b.roundWins.player || b.player.hp <= 0;
    io.to(room.players[0].socketId).emit('game_over', { win: pWin, roundWins: { player: b.roundWins.player, opp: b.roundWins.opp }, playerHp: b.player.hp, oppHp: b.opp.hp });
    io.to(room.players[1].socketId).emit('game_over', { win: oWin, roundWins: { player: b.roundWins.opp, opp: b.roundWins.player }, playerHp: b.opp.hp, oppHp: b.player.hp });
  } else {
    const win = b.roundWins.player > b.roundWins.opp || b.opp.hp <= 0;
    io.to(roomId).emit('game_over', { win, roundWins: { ...b.roundWins }, playerHp: b.player.hp, oppHp: b.opp.hp });
  }
}

server.listen(PORT, () => {
  console.log(`[server] Poker online running on port ${PORT}`);
});
