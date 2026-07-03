const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.json');
let data = null;
const UID_CACHE = new Set();

function generateUid() {
  let uid;
  do { uid = String(Math.floor(10000000 + Math.random() * 90000000)); }
  while (UID_CACHE.has(uid));
  UID_CACHE.add(uid);
  return uid;
}

function ensureUid(user) {
  if (!user.uid) { user.uid = generateUid(); saveDb(); }
  return user.uid;
}

function rebuildUidCache() {
  UID_CACHE.clear();
  for (const u of (data?.users || [])) {
    if (u.uid) UID_CACHE.add(u.uid);
  }
}

function getDb() {
  if (!data) throw new Error('Database not initialized');
  return data;
}

async function initDb() {
  if (fs.existsSync(DB_PATH)) {
    try {
      data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch { data = null; }
  }
  if (!data) {
    data = { users: [], chat: [], nextId: 1 };
  } else if (!data.chat) {
    data.chat = [];
  }
  initDefaults();
  rebuildUidCache();
  for (const user of data.users) {
    ensureUid(user);
  }
  saveDb();
  console.log('[db] Database ready (' + data.users.length + ' users)');
}

function saveDb() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[db] Save error:', e.message);
  }
}

function initDefaults() {
  const admin = data.users.find(u => u.is_admin);
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    data.users.push({
      id: data.nextId++, username: 'admin', password: hash,
      is_admin: 1, is_guest: 0, created_at: new Date().toISOString().slice(0,19).replace('T',' '),
      last_login: null, total_games: 0, wins: 0, game_data: {}
    });
    console.log('[db] Default admin created: admin / admin123');
    console.log('[db] ⚠️  WARNING: Change admin password immediately in production!');
  }
}

// Query helpers
function getUser(username) {
  return data.users.find(u => u.username === username) || null;
}

function getUserById(id) {
  return data.users.find(u => u.id === id) || null;
}

function createUser(username, hash, isGuest = 0) {
  const user = {
    id: data.nextId++, uid: generateUid(), username, password: hash,
    is_admin: 0, is_guest: isGuest,
    created_at: new Date().toISOString().slice(0,19).replace('T',' '),
    last_login: null, total_games: 0, wins: 0, game_data: {}
  };
  data.users.push(user);
  saveDb();
  return user;
}

function getUserByUid(uid) {
  return data.users.find(u => u.uid === uid) || null;
}

function updateUser(id, fields) {
  const user = data.users.find(u => u.id === id);
  if (!user) return;
  Object.assign(user, fields);
  saveDb();
}

function deleteUser(id) {
  const idx = data.users.findIndex(u => u.id === id);
  if (idx === -1) return false;
  data.users.splice(idx, 1);
  saveDb();
  return true;
}

function getUserFull(id) {
  const u = data.users.find(u => u.id === id);
  if (!u) return null;
  return { ...u };
}

function getAllUsers() {
  return data.users.map(u => ({
    id: u.id, uid: u.uid, username: u.username, is_admin: u.is_admin, is_guest: u.is_guest,
    created_at: u.created_at, last_login: u.last_login,
    total_games: u.total_games, wins: u.wins,
    game_data: u.game_data || {}
  })).sort((a, b) => a.id - b.id);
}

function getStats() {
  const total = data.users.length;
  const total_games = data.users.reduce((s, u) => s + (u.total_games || 0), 0);
  const recent = data.users
    .filter(u => u.last_login)
    .sort((a, b) => (b.last_login || '').localeCompare(a.last_login || ''))
    .slice(0, 10)
    .map(u => ({ username: u.username, last_login: u.last_login }));
  return { total_users: total, total_games, recent_users: recent };
}

function getLeaderboard() {
  return data.users
    .filter(u => !u.is_admin)
    .map(u => ({
      uid: u.uid,
      username: u.username,
      displayName: (u.game_data && u.game_data.displayName) || u.username,
      total_games: u.total_games || 0,
      wins: u.wins || 0,
      win_rate: u.total_games > 0 ? Math.round((u.wins / u.total_games) * 10000) / 100 : 0,
      rankIdx: (u.game_data && u.game_data.rankIdx) || 0,
      stars: (u.game_data && u.game_data.stars) || 0,
      activeChar: (u.game_data && u.game_data.activeChar) || 'cowboy',
      points: (u.game_data && u.game_data.points) || 1000
    }))
    .sort((a, b) => {
      if ((b.rankIdx || 0) !== (a.rankIdx || 0)) return (b.rankIdx || 0) - (a.rankIdx || 0);
      if ((b.rankIdx || 0) >= 5) return (b.points || 1000) - (a.points || 1000);
      return (b.stars || 0) - (a.stars || 0);
    })
    .slice(0, 100);
}

function sendGlobalMail(mailItem) {
  let count = 0;
  for (const user of data.users) {
    if (user.is_admin) continue;
    if (!user.mail) user.mail = [];
    user.mail.unshift({ ...mailItem, id: mailItem.id + '_' + user.id, read: false, claimed: false });
    count++;
  }
  saveDb();
  return count;
}

// Auto-save every 30s
setInterval(() => saveDb(), 30000);
process.on('exit', () => saveDb());
process.on('SIGINT', () => { saveDb(); process.exit(); });
process.on('SIGTERM', () => { saveDb(); process.exit(); });

function sendMailToUser(userId, mailItem) {
  const user = data.users.find(u => u.id === userId);
  if (!user) return false;
  if (!user.mail) user.mail = [];
  user.mail.unshift({ ...mailItem, id: mailItem.id + '_' + user.id, read: false, claimed: false });
  saveDb();
  return true;
}

function addChatMessage(msg) {
  if (!data.chat) data.chat = [];
  data.chat.push(msg);
  if (data.chat.length > 500) data.chat.splice(0, data.chat.length - 500);
  saveDb();
  return msg;
}

function getChatMessages(limit) {
  const chat = data.chat || [];
  return limit ? chat.slice(-limit) : chat;
}

function clearChatMessages() {
  data.chat = [];
  saveDb();
}

module.exports = { initDb, getDb, saveDb, getUser, getUserById, getUserByUid, getUserFull, createUser, updateUser, deleteUser, getAllUsers, getStats, getLeaderboard, sendGlobalMail, sendMailToUser, addChatMessage, getChatMessages, clearChatMessages };
