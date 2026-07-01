const game = require('./game');

const rooms = new Map();
const playerRooms = new Map(); // socketId → roomId

function createRoom(hostId, hostName, playerSkills, mode = 'pve', difficulty = 1) {
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const room = {
    id: roomId,
    mode,
    hostId,
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
  if (room.players.length >= 2) return { error: '房间已满' };
  if (room.battle) return { error: '对局已开始' };

  room.players.push({ socketId, name, side: 'opp', ready: false });
  room.skillMap[socketId] = skills;
  playerRooms.set(socketId, roomId);
  room.mode = 'pvp';
  return { success: true };
}

function startBattle(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  const pSkills = room.skillMap[room.players[0].socketId] || ['bomb', 'magician'];
  const oSkills = room.skillMap[room.players[1]?.socketId] || shuffleAI();

  if (room.mode === 'pvp') {
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
  room.players = room.players.filter(p => p.socketId !== socketId);
  if (room.players.length === 0) {
    rooms.delete(roomId);
    return roomId;
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

module.exports = {
  createRoom, joinRoom, startBattle,
  getRoom, getPlayerRoom, leaveRoom, removeRoom, shuffleAI
};
