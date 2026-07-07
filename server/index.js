// JWT secret — env var preferred, auto-generate as fallback
if (!process.env.JWT_SECRET) {
  const crypto = require('crypto');
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENV) {
    console.log('[server] WARNING: JWT_SECRET not set, using auto-generated key (sessions reset on restart)');
  } else {
    console.log('[server] DEV: Generated random JWT_SECRET');
  }
}

const jwt = require('jsonwebtoken');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const game = require('./game');
const rooms = require('./rooms');
const { initDb, addChatMessage, getChatMessages, getUserById, getUserFull, updateUser } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client'), { maxAge: 0 }));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'client', 'admin.html')));

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
const QUICK_MATCH_TIMEOUT = 10000;

// Socket.io auth middleware — verify JWT + check session_token (prevents multi-login)
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Session token check — same logic as auth.js authMiddleware
      const user = getUserFull(decoded.id);
      if (user && user.session_token) {
        if (decoded.session_token !== user.session_token) {
          return next(new Error('账号在其他地方登录'));
        }
      }
      socket.userId = decoded.id;
    } catch (e) {
      if (e.message === '账号在其他地方登录') return next(e);
      /* invalid token, continue as guest */
    }
  }
  next();
});

let onlineCount = 0;

// Simple in-memory socket rate limiter (per socket, per event)
const socketRateLimit = new Map();
function checkSocketRate(socketId, event, maxPerMin = 30) {
  const key = socketId + ':' + event;
  const now = Date.now();
  let entry = socketRateLimit.get(key);
  if (!entry || now - entry.windowStart > 60000) {
    entry = { windowStart: now, count: 0 };
    socketRateLimit.set(key, entry);
  }
  entry.count++;
  return entry.count <= maxPerMin;
}
// Clean stale entries every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of socketRateLimit) {
    if (now - v.windowStart > 120000) socketRateLimit.delete(k);
  }
}, 300000);

io.on('connection', (socket) => {
  onlineCount++;
  io.emit('online_count', onlineCount);
  console.log(`[connect] ${socket.id} (online: ${onlineCount})`);
  socket.emit('online_count', onlineCount);
  socket.emit('chat_history', getChatMessages(30));

  // === Unified match: PvP with AI fallback ===
  socket.on('start_match', ({ skills, name }) => {
    const result = rooms.addToQuickMatch(socket.id, skills, name || '玩家', socket.userId);
    if (result.matched) {
      // Opponent found! Create PvP room
      const opp = result.opponent;
      const roomId = rooms.createRoom(socket.id, name || '玩家', skills, 'pvp', 1);
      rooms.joinRoom(roomId, opp.socketId, opp.name || '玩家', opp.skills);
      const room = rooms.getRoom(roomId);
      if (room) {
        if (socket.userId) room.playerDBId = socket.userId;
        if (opp.userId) room.oppDBId = opp.userId;
      }
      socket.join(roomId);
      io.to(opp.socketId).emit('match_found', { roomId });
      // Start the battle directly
      setTimeout(() => {
        if (rooms.getRoom(roomId)) {
          rooms.getRoom(roomId).phase = 'confirm';
          const p = rooms.getRoom(roomId).players;
          p.forEach(pl => pl.ready = true);
          const battle = rooms.startBattle(roomId);
          if (battle) {
            io.to(p[0].socketId).emit('game_state', game.buildPlayerView(battle, 'player'));
            io.to(p[1].socketId).emit('game_state', game.buildPlayerView(battle, 'opp'));
          }
        }
      }, 300);
    } else {
      // In queue — set 10s timeout, then fallback to AI
      socket.emit('in_queue');
      setTimeout(() => {
        if (rooms.isInQuickMatch(socket.id)) {
          rooms.removeFromQuickMatch(socket.id);
          socket.emit('ai_fallback');
        }
      }, QUICK_MATCH_TIMEOUT);
    }
  });

  // === Cancel match ===
  socket.on('cancel_match', () => {
    rooms.removeFromQuickMatch(socket.id);
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

  // === PvE: Client-side battle finish → server rewards ===
  socket.on('pve_finish', ({ won }) => {
    if (!checkSocketRate(socket.id, 'pve_finish', 10)) return;
    const user = socket.userId ? getUserById(socket.userId) : null;
    if (user) {
      const gd = { ...(user.game_data || {}) };
      const activeChar = gd.activeChar || 'cowboy';
      const lv = (gd.chars && gd.chars[activeChar]?.lv) || 1;
      const RANK_MULT = [1.0, 1.2, 1.5, 1.8, 2.2, 2.6, 3.0];
      const mult = RANK_MULT[Math.min(gd.rankIdx || 0, 6)];
      let coins = Math.round((won ? 200 : 80) * mult);
      let gems = won ? 50 : 20;
      let chest = won ? 2 : 1;
      if (activeChar === 'cowboy') coins += 100 + (lv - 1) * 50;
      if (activeChar === 'miner' && won) gems += 50 + (lv - 1) * 30;
      if (activeChar === 'lily') chest = chest * (lv <= 3 ? 2 : 3);
      gd.coins = (gd.coins || 888) + coins;
      gd.gems = (gd.gems || 88) + gems;
      gd.chest = Math.min(10, (gd.chest || 0) + chest);
      gd.total = (gd.total || 0) + 1;
      if (won) gd.wins = (gd.wins || 0) + 1;
      updateUser(socket.userId, { game_data: gd });
      socket.emit('pve_rewards', { coins, gems, chest });
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

  // === PvP Surrender ===
  socket.on('pvp_surrender', () => {
    const roomId = rooms.getPlayerRoom(socket.id);
    if (!roomId) return;
    const room = rooms.getRoom(roomId);
    if (!room || room.mode !== 'pvp' || !room.battle) return;
    const surrenderingSide = room.players[0].socketId === socket.id ? 'player' : 'opp';
    const winningSide = surrenderingSide === 'player' ? 'opp' : 'player';
    room.battle.player.hp = surrenderingSide === 'player' ? 0 : 999;
    room.battle.opp.hp = winningSide === 'player' ? 999 : 0;
    finishGame(room, roomId);
    rooms.removeRoom(roomId);
  });

  // === Disconnect — with reconnection support ===
  socket.on('disconnect', () => {
    onlineCount = Math.max(0, onlineCount - 1);
    io.emit('online_count', onlineCount);
    rooms.removeFromQuickMatch(socket.id);
    console.log(`[disconnect] ${socket.id} (online: ${onlineCount})`);

    // Check if this is a PvP player in an active battle — start reconnection grace period
    const roomId = rooms.getPlayerRoom(socket.id);
    if (roomId) {
      const room = rooms.getRoom(roomId);
      if (room && room.mode === 'pvp' && room.phase === 'playing' && socket.userId) {
        room.reconnectingPlayers = room.reconnectingPlayers || {};
        if (!room.reconnectingPlayers[socket.userId]) {
          room.reconnectingPlayers[socket.userId] = { oldSocketId: socket.id };
        }
        room.reconnectingPlayers[socket.userId].timer = setTimeout(() => {
          const r2 = rooms.getRoom(roomId);
          if (r2 && r2.reconnectingPlayers && r2.reconnectingPlayers[socket.userId]) {
            delete r2.reconnectingPlayers[socket.userId];
            if (Object.keys(r2.reconnectingPlayers).length === 0) delete r2.reconnectingPlayers;
            rooms.leaveRoom(socket.id);
            io.to(roomId).emit('opponent_left');
            io.emit('room_list', rooms.listRooms());
          }
        }, 15000);
        io.to(roomId).emit('opponent_reconnecting');
        return; // Don't clean up — wait for reconnection
      }
    }

    // Normal cleanup for non-PvP or non-battle disconnects
    const leftRoomId = rooms.leaveRoom(socket.id);
    if (leftRoomId) {
      const leftRoom = rooms.getRoom(leftRoomId);
      if (leftRoom && leftRoom.players.length > 0) {
        if (leftRoom.phase === 'playing') {
          io.to(leftRoomId).emit('opponent_left');
        } else {
          io.to(leftRoomId).emit('player_joined', {
            players: leftRoom.players.map(p => ({ name: p.name, socketId: p.socketId }))
          });
        }
      } else {
        io.to(leftRoomId).emit('opponent_left');
      }
      io.emit('room_list', rooms.listRooms());
    }
  });

  // === Reconnect to PvP battle ===
  socket.on('reconnect_player', ({ roomId }) => {
    const room = rooms.getRoom(roomId);
    if (!room || room.mode !== 'pvp' || room.phase !== 'playing') return;
    if (!socket.userId) return;
    if (!room.reconnectingPlayers || !room.reconnectingPlayers[socket.userId]) return;

    const entry = room.reconnectingPlayers[socket.userId];
    const oldSocketId = entry.oldSocketId;
    clearTimeout(entry.timer);
    delete room.reconnectingPlayers[socket.userId];
    if (Object.keys(room.reconnectingPlayers).length === 0) delete room.reconnectingPlayers;

    if (rooms.reconnectPlayer(roomId, oldSocketId, socket.id)) {
      socket.join(roomId);
      const side = getSide(room, socket.id);
      if (side) {
        socket.emit('game_state', game.buildPlayerView(room.battle, side));
      }
      io.to(roomId).emit('opponent_reconnected');
      console.log(`[reconnect] Player reconnected to room ${roomId}`);
    }
  });

  // === Chat ===
  socket.on('chat_message', ({ name, text }) => {
    if (!checkSocketRate(socket.id, 'chat', 20)) return;
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

  // Flushbeliever and charge carryover (same as executeRound)
  for (const f of [p, o]) {
    if (f.buff.flushBeliever && f.played.length) {
      const sc = {};
      for (const c of [...f.played, ...room.battle.community]) {
        sc[c.suit] = (sc[c.suit] || 0) + 1;
        if (sc[c.suit] >= 3) {
          f.nextDrawBonus = (f.nextDrawBonus || 0) + 2;
          room.battle.logs.push(`${f === p ? '我方' : '对手'}同花信徒触发，下回合额外抽2张`);
          break;
        }
      }
    }
  }

  room.battle.phase = 'result';
  room.battle.logs.push(`本局结果：我方《${pe.name}》vs 对手《${oe.name}》`);
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
  const isPvP = b.mode === 'pvp';
  const RANK_MULT = [1.0, 1.2, 1.5, 1.8, 2.2, 2.6, 3.0];

  function calcAndPersist(won, dbUserId) {
    let coins, gems, chest;
    if (isPvP) {
      coins = won ? 200 : 80;
      gems = won ? 50 : 20;
      chest = won ? 2 : 1;
    } else {
      const tied = !won && b.roundWins.player === b.roundWins.opp;
      if (won) { coins = 200; gems = 50; chest = 2; }
      else if (tied) { coins = 120; gems = 25; chest = 1; }
      else { coins = 80; gems = 20; chest = 1; }
    }

    if (dbUserId) {
      const user = getUserById(dbUserId);
      if (user) {
        const gd = { ...(user.game_data || {}) };
        const mult = RANK_MULT[Math.min(gd.rankIdx || 0, 6)];
        coins = Math.round(coins * mult);

        // Character bonuses (PvE only)
        if (!isPvP) {
          const activeChar = gd.activeChar || 'cowboy';
          const lv = (gd.chars && gd.chars[activeChar]?.lv) || 1;
          if (activeChar === 'cowboy') coins += 100 + (lv - 1) * 50;
          if (activeChar === 'miner' && won) gems += 50 + (lv - 1) * 30;
          if (activeChar === 'lily') chest = chest * (lv <= 3 ? 2 : 3);
        }
        gd.coins = (gd.coins || 888) + coins;
        gd.gems = (gd.gems || 88) + gems;
        if (!isPvP) gd.chest = Math.min(10, (gd.chest || 0) + chest);
        gd.total = (gd.total || 0) + 1;
        if (won) gd.wins = (gd.wins || 0) + 1;
        updateUser(dbUserId, { game_data: gd });
      }
    }
    return { coins, gems, chest };
  }

  if (isPvP) {
    const pWin = b.roundWins.player > b.roundWins.opp || b.opp.hp <= 0;
    const oWin = b.roundWins.opp > b.roundWins.player || b.player.hp <= 0;
    const pRew = calcAndPersist(pWin, room.playerDBId);
    const oRew = calcAndPersist(oWin, room.oppDBId);
    io.to(room.players[0].socketId).emit('game_over', {
      win: pWin, roundWins: { player: b.roundWins.player, opp: b.roundWins.opp },
      playerHp: b.player.hp, oppHp: b.opp.hp, rewards: pRew
    });
    io.to(room.players[1].socketId).emit('game_over', {
      win: oWin, roundWins: { player: b.roundWins.opp, opp: b.roundWins.player },
      playerHp: b.opp.hp, oppHp: b.player.hp, rewards: oRew
    });
  } else {
    const win = b.roundWins.player > b.roundWins.opp || b.opp.hp <= 0;
    const rew = calcAndPersist(win, room.playerDBId);
    io.to(roomId).emit('game_over', { win, roundWins: { ...b.roundWins }, rewards: rew });
  }
  rooms.removeRoom(roomId);
}

server.listen(PORT, () => {
  console.log(`[server] Poker online running on port ${PORT}`);
});
