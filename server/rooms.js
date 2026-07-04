const game = require('./game');

const rooms = new Map();
const playerRooms = new Map(); // socketId → roomId

function createRoom(hostId, hostName, playerSkills, mode = 'pve', difficulty = 1, roomName) {
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const room = {
    id: roomId,
    mode,
    hostId,
    phase: 'lobby',
    roomName: roomName || (hostName + '的房间'),
    players: [{ socketId: hostId, name: hostName, side: 'player', ready: false }],
    battle: null,
    skillMap: { [hostId]: playerSkills },
    difficulty,
    created: Date.now()
  };
  rooms.set(roomId, room);
  playerRooms.set(hostId, roomId);
  return roomId;
}

function joinRoom(roomId, socketId, name, skills) {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  if (room.mode === 'pve') return { error: '该房间是单人模式' };
  if (room.phase !== 'lobby') return { error: '对局已开始' };
  if (room.players.length >= 2) return { error: '房间已满' };

  room.players.push({ socketId, name, side: 'opp', ready: false });
  room.skillMap[socketId] = skills;
  room.mode = 'pvp';
  playerRooms.set(socketId, roomId);
  return { success: true };
}

function startBattle(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  const pSkills = room.skillMap[room.players[0].socketId] || ['bomb', 'magician'];
  const oSkills = room.skillMap[room.players[1]?.socketId] || shuffleAI();

  if (room.mode === 'pvp') {
    game.resetUid();  // Reset card ID counter per battle
    const deck = game.newDeck();
    room.battle = game.createPvPBattle(
      deck, pSkills, oSkills,
      room.players[0].name, room.players[1].name
    );
    room.battle.roomId = roomId;
    room.battle.phase = 'select';
    room.battle.mode = 'pvp';
  } else {
    room.battle = game.createBattle(pSkills, oSkills, room.difficulty);
    room.battle.roomId = roomId;
    room.battle.mode = 'pve';
  }
  room.phase = 'playing';
  return room.battle;
}

function shuffleAI() {
  const pool = game.SKILLS.filter(s => s.tier !== 'T3');
  return game.shuffle(pool).slice(0, 2).map(s => s.id);
}

function getRoom(roomId) { return rooms.get(roomId); }
function getPlayerRoom(socketId) { return playerRooms.get(socketId); }

function leaveRoom(socketId) {
  const roomId = playerRooms.get(socketId);
  if (!roomId) return null;
  const room = rooms.get(roomId);
  playerRooms.delete(socketId);
  if (!room) return roomId;

  // Host leaving a PvP lobby → disband room
  if (room.mode === 'pvp' && room.hostId === socketId && room.phase === 'lobby') {
    for (const p of room.players) playerRooms.delete(p.socketId);
    rooms.delete(roomId);
    return roomId;
  }

  room.players = room.players.filter(p => p.socketId !== socketId);
  if (room.players.length === 0) {
    rooms.delete(roomId);
  }
  return roomId;
}

function removeRoom(roomId) {
  const room = rooms.get(roomId);
  if (room) {
    for (const p of room.players) playerRooms.delete(p.socketId);
    rooms.delete(roomId);
  }
}

// === Lobby helpers ===
function listRooms() {
  const list = [];
  for (const [id, room] of rooms) {
    if (room.mode === 'pvp' && room.phase === 'lobby' && !room.battle) {
      list.push({
        roomId: id,
        hostName: room.players[0]?.name || '未知',
        playerCount: room.players.length,
        maxPlayers: 2,
        roomName: room.roomName
      });
    }
  }
  return list;
}

function isHost(roomId, socketId) {
  const room = rooms.get(roomId);
  return room && room.hostId === socketId;
}

function kickPlayer(roomId, targetSocketId) {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  const idx = room.players.findIndex(p => p.socketId === targetSocketId);
  if (idx < 0) return { error: '玩家不在房间' };
  room.players.splice(idx, 1);
  playerRooms.delete(targetSocketId);
  return { success: true };
}

function isFull(roomId) {
  const room = rooms.get(roomId);
  return room && room.players.length >= 2;
}

// === Quick match queue ===
let quickMatchQueue = [];

function addToQuickMatch(socketId, skills, name, userId) {
  const idx = quickMatchQueue.findIndex(q => q.socketId !== socketId);
  if (idx >= 0) {
    const match = quickMatchQueue.splice(idx, 1)[0];
    return { matched: true, opponent: match };
  }
  quickMatchQueue.push({ socketId, skills, name, userId, timestamp: Date.now() });
  return { matched: false };
}

function removeFromQuickMatch(socketId) {
  quickMatchQueue = quickMatchQueue.filter(q => q.socketId !== socketId);
}

function isInQuickMatch(socketId) {
  return quickMatchQueue.some(q => q.socketId === socketId);
}

// === Reconnection support ===
function reconnectPlayer(roomId, oldSocketId, newSocketId) {
  const room = rooms.get(roomId);
  if (!room) return false;
  const p = room.players.find(p => p.socketId === oldSocketId);
  if (!p) return false;
  p.socketId = newSocketId;
  playerRooms.delete(oldSocketId);
  playerRooms.set(newSocketId, roomId);
  return true;
}

module.exports = {
  createRoom, joinRoom, startBattle,
  getRoom, getPlayerRoom, leaveRoom, removeRoom, shuffleAI,
  listRooms, isHost, kickPlayer, isFull,
  addToQuickMatch, removeFromQuickMatch, isInQuickMatch,
  reconnectPlayer
};
