const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.json');
let data = null;

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
    data = { users: [], nextId: 1 };
  }
  initDefaults();
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
    id: data.nextId++, username, password: hash,
    is_admin: 0, is_guest: isGuest,
    created_at: new Date().toISOString().slice(0,19).replace('T',' '),
    last_login: null, total_games: 0, wins: 0, game_data: {}
  };
  data.users.push(user);
  saveDb();
  return user;
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
    id: u.id, username: u.username, is_admin: u.is_admin, is_guest: u.is_guest,
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
    .filter(u => !u.is_admin && (u.total_games || 0) > 0)
    .map(u => ({
      username: u.username,
      total_games: u.total_games || 0,
      wins: u.wins || 0,
      win_rate: u.total_games > 0 ? Math.round((u.wins / u.total_games) * 10000) / 100 : 0,
      rankIdx: (u.game_data && u.game_data.rankIdx) || 0,
      stars: (u.game_data && u.game_data.stars) || 0,
      activeChar: (u.game_data && u.game_data.activeChar) || 'cowboy'
    }))
    .sort((a, b) => b.win_rate - a.win_rate || b.total_games - a.total_games)
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

module.exports = { initDb, getDb, saveDb, getUser, getUserById, getUserFull, createUser, updateUser, deleteUser, getAllUsers, getStats, getLeaderboard, sendGlobalMail };
