const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getUser, getUserById, getUserByUid, getUserFull, createUser, updateUser, getAllUsers, getStats, getLeaderboard, sendGlobalMail, sendMailToUser, getChatMessages, clearChatMessages, addEventLog, getEventStats, getAnnouncements, addAnnouncement, deleteAnnouncement, getServerConfig, setServerConfig, getSkillOverrides, setSkillOverride, getGameVersions, addGameVersion } = require('./db');

const router = express.Router();
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = require('crypto').randomBytes(32).toString('hex');
  if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENV) {
    console.log('[auth] WARNING: JWT_SECRET not set, using auto-generated key (sessions reset on restart)');
  } else {
    console.log('[auth] DEV: Generated random JWT_SECRET');
  }
}
const JWT_SECRET = process.env.JWT_SECRET;
const RANK_CONFIG = [
  { name: '新手局', icon: '🌱', stars: 0, desc: '前3场保护，不掉星' },
  { name: '青铜', icon: '🥉', stars: 3, desc: '赢+1星，输不掉星' },
  { name: '白银', icon: '🥈', stars: 3, desc: '赢+1星，输-1星' },
  { name: '黄金', icon: '🥇', stars: 4, desc: '赢+1星，输-1星' },
  { name: '铂金', icon: '💎', stars: 4, desc: '赢+1星，输-1星' },
  { name: '大师', icon: '👑', stars: 0, desc: '积分制，胜+25 / 负-15' },
  { name: '传奇', icon: '🌟', stars: 0, desc: '1500分以上进入传奇' }
];

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    // Session token check — prevent multi-device login
    const user = getUserFull(req.user.id);
    if (!user) return res.status(401).json({ error: '用户不存在' });
    if (user.session_token) {
      if (req.user.session_token !== user.session_token) {
        return res.status(401).json({ error: '账号在其他地方登录' });
      }
    } else {
      // First-time migration: existing user without session_token
      user.session_token = crypto.randomBytes(16).toString('hex');
      updateUser(user.id, { session_token: user.session_token });
    }
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期' });
  }
}

// Rate limiter: simple in-memory per-IP limiter
const rateLimitMap = new Map();
function rateLimit(maxRequests = 10, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = rateLimitMap.get(ip);
    if (!entry || now - entry.windowStart > windowMs) {
      entry = { windowStart: now, count: 0 };
      rateLimitMap.set(ip, entry);
    }
    entry.count++;
    if (entry.count > maxRequests) {
      return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
    }
    next();
  };
}
// Cleanup stale entries (entries older than 2 min)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.windowStart > 120000) rateLimitMap.delete(ip);
  }
}, 120000);

function adminMiddleware(req, res, next) {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: '无管理员权限' });
  }
  next();
}

router.post('/register', rateLimit(10), (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  if (username.length < 2 || username.length > 16) return res.status(400).json({ error: '用户名 2-16 个字符' });
  if (password.length < 4) return res.status(400).json({ error: '密码至少 4 位' });

  if (getUser(username)) return res.status(400).json({ error: '用户名已存在' });

  const hash = bcrypt.hashSync(password, 10);
  const user = createUser(username, hash);
  const sessionToken = crypto.randomBytes(16).toString('hex');
  updateUser(user.id, { session_token: sessionToken });

  // Welcome mail
  sendMailToUser(user.id, {
    id: Date.now().toString(36),
    from: 'system',
    title: '🎉 欢迎加入代号 001',
    body: '欢迎来到代号 001 — 一款策略与运气并重的扑克对决游戏！\n\n🎁 附上新手礼包，助你开局顺利。\n\n💡 点击主页左上角头像可以修改你的游戏昵称。\n\n快去功能牌仓库装备好你的牌组，开始第一场对战吧！',
    items: { coins: 18888, gems: 1888 },
    created_at: new Date().toISOString().slice(0,19).replace('T',' ')
  });

  const token = jwt.sign({ id: user.id, username, is_admin: 0, is_guest: 0, session_token: sessionToken }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, uid: user.uid, username, is_admin: 0, is_guest: 0 } });
});

router.post('/login', rateLimit(10), (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });

  const user = getUser(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ error: '用户名或密码错误' });
  }

  const sessionToken = crypto.randomBytes(16).toString('hex');
  updateUser(user.id, { session_token: sessionToken, last_login: new Date().toISOString().slice(0,19).replace('T',' ') });
  const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin, is_guest: user.is_guest, session_token: sessionToken }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, uid: user.uid, username: user.username, is_admin: user.is_admin, is_guest: user.is_guest } });
});

router.get('/me', authMiddleware, (req, res) => {
  const user = getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({ user: { id: user.id, uid: user.uid, username: user.username, is_admin: user.is_admin, is_guest: user.is_guest, created_at: user.created_at, last_login: user.last_login, total_games: user.total_games, wins: user.wins } });
});

router.put('/save', authMiddleware, (req, res) => {
  const { game_data, total_games, wins } = req.body;
  const fields = {};
  if (game_data) {
    const ALLOWED = new Set(['coins','gems','chest','total','wins','activeChar','equipped','displayName','skills','chars','tasks','taskDate','lastDailyDate','history','handCounts','aiTier','aiStreak','titles','frames','cosmetic','ladderProtect','weeklyTasks','weeklyTaskDate','dailyFirstWinDate','loginStreak','lastLoginDate','vipPoints','passLevel','vipLevel']);
    const clean = {};
    for (const k of Object.keys(game_data)) {
      if (ALLOWED.has(k)) clean[k] = game_data[k];
    }
    fields.game_data = clean;
  }
  if (total_games !== undefined) fields.total_games = total_games;
  if (wins !== undefined) fields.wins = wins;
  updateUser(req.user.id, fields);
  res.json({ ok: true });
});

router.get('/load', authMiddleware, (req, res) => {
  const user = getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({
    game_data: user.game_data || {},
    total_games: user.total_games || 0,
    wins: user.wins || 0,
    user: { id: user.id, uid: user.uid, username: user.username, is_admin: user.is_admin }
  });
});

router.get('/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  res.json({ users: getAllUsers() });
});

router.get('/admin/stats', authMiddleware, adminMiddleware, (req, res) => {
  res.json(getStats());
});

router.put('/admin/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const user = getUserFull(id);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const { password, game_data, total_games, wins, coins, gems, rank, rankIdx, stars, points, chest } = req.body;
  const fields = {};

  if (password) fields.password = bcrypt.hashSync(password, 10);
  if (total_games !== undefined) fields.total_games = total_games;
  if (wins !== undefined) fields.wins = wins;

  if (coins !== undefined || gems !== undefined || rank !== undefined || rankIdx !== undefined || stars !== undefined || points !== undefined || chest !== undefined || game_data) {
    const gd = { ...(user.game_data || {}) };
    if (game_data) Object.assign(gd, game_data);
    if (coins !== undefined) gd.coins = coins;
    if (gems !== undefined) gd.gems = gems;
    if (rank !== undefined) gd.rank = rank;
    if (rankIdx !== undefined) gd.rankIdx = rankIdx;
    if (stars !== undefined) gd.stars = stars;
    if (points !== undefined) gd.points = points;
    if (chest !== undefined) gd.chest = chest;
    fields.game_data = gd;
  }

  updateUser(id, fields);
  res.json({ ok: true, user: getUserFull(id) });
});

router.delete('/admin/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const user = getUserFull(id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (user.is_admin) return res.status(403).json({ error: '不能删除管理员账号' });

  const { deleteUser } = require('./db');
  deleteUser(id);
  res.json({ ok: true });
});

// Leaderboard
router.get('/leaderboard', (req, res) => {
  res.json({ leaderboard: getLeaderboard() });
});

// Mail
router.get('/mail', authMiddleware, (req, res) => {
  const user = getUserFull(req.user.id);
  res.json({ mail: (user && user.mail) || [] });
});

router.post('/mail/read/:id', authMiddleware, (req, res) => {
  const user = getUserFull(req.user.id);
  if (!user || !user.mail) return res.json({ ok: true });
  const m = user.mail.find(item => item.id === req.params.id);
  if (m) { m.read = true; updateUser(req.user.id, { mail: user.mail }); }
  res.json({ ok: true });
});

router.post('/mail/claim/:id', authMiddleware, (req, res) => {
  const user = getUserFull(req.user.id);
  if (!user || !user.mail) return res.json({ ok: true });
  const m = user.mail.find(item => item.id === req.params.id);
  if (!m || m.claimed) return res.json({ ok: true });

  m.claimed = true;
  m.read = true;

  if (m.items) {
    const gd = { ...(user.game_data || {}) };
    if (m.items.gems) gd.gems = (gd.gems || 0) + m.items.gems;
    if (m.items.coins) gd.coins = (gd.coins || 0) + m.items.coins;
    updateUser(req.user.id, { mail: user.mail, game_data: gd });
  } else {
    updateUser(req.user.id, { mail: user.mail });
  }

  res.json({ ok: true });
});

// Admin: send global mail
router.post('/admin/mail', authMiddleware, adminMiddleware, (req, res) => {
  const { title, body, items } = req.body;
  if (!title) return res.status(400).json({ error: '标题不能为空' });

  const mailItem = {
    id: Date.now().toString(36),
    from: 'system',
    title,
    body: body || '',
    items: items || null,
    created_at: new Date().toISOString().slice(0,19).replace('T',' ')
  };

  const sent = sendGlobalMail(mailItem);
  res.json({ ok: true, sentTo: sent });
});

// Admin: send mail by uid
router.post('/admin/mail/uid/:uid', authMiddleware, adminMiddleware, (req, res) => {
  const { title, body, items } = req.body;
  if (!title) return res.status(400).json({ error: '标题不能为空' });

  const user = getUserByUid(req.params.uid);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const mailItem = {
    id: Date.now().toString(36),
    from: 'system',
    title,
    body: body || '',
    items: items || null,
    created_at: new Date().toISOString().slice(0,19).replace('T',' ')
  };

  sendMailToUser(user.id, mailItem);
  res.json({ ok: true, user: user.username });
});

router.get('/chat/history', authMiddleware, adminMiddleware, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 200, 500);
  res.json({ messages: getChatMessages(limit) });
});

router.delete('/chat/clear', authMiddleware, adminMiddleware, (req, res) => {
  clearChatMessages();
  res.json({ success: true });
});

// Analytics tracking (fire-and-forget)
router.post('/track', authMiddleware, (req, res) => {
  const { event, info } = req.body;
  if (!event) return res.status(400).json({ error: 'event required' });
  addEventLog(req.user.id, event, info);
  res.json({ ok: true });
});
// Admin event stats
router.get('/admin/events', authMiddleware, adminMiddleware, (req, res) => {
  res.json(getEventStats());
});

// === Announcements ===
router.get('/config/announcements', (req, res) => {
  const list = getAnnouncements();
  res.json({ announcements: list.filter(a => a.enabled !== false).sort((a, b) => b.id - a.id).slice(0, 5) });
});

// Admin: announcements CRUD
router.get('/admin/announcements', authMiddleware, adminMiddleware, (req, res) => {
  res.json({ announcements: getAnnouncements() });
});

router.post('/admin/announcements', authMiddleware, adminMiddleware, (req, res) => {
  const { title, body, enabled } = req.body;
  if (!title) return res.status(400).json({ error: '标题不能为空' });
  const item = {
    id: Date.now(),
    title,
    body: body || '',
    enabled: enabled !== false,
    created_at: new Date().toISOString().slice(0,19).replace('T',' ')
  };
  addAnnouncement(item);
  res.json({ ok: true, announcement: item });
});

router.delete('/admin/announcements/:id', authMiddleware, adminMiddleware, (req, res) => {
  deleteAnnouncement(parseInt(req.params.id));
  res.json({ ok: true });
});

// Server config
router.get('/admin/config', authMiddleware, adminMiddleware, (req, res) => {
  res.json(getServerConfig());
});

router.put('/admin/config', authMiddleware, adminMiddleware, (req, res) => {
  const { maintenanceMode, maintenanceMessage } = req.body;
  const cfg = setServerConfig({ maintenanceMode, maintenanceMessage });
  res.json({ ok: true, config: cfg });
});

// Content roadmap: skill overrides
router.get('/admin/skills', authMiddleware, adminMiddleware, (req, res) => {
  res.json({ overrides: getSkillOverrides(), versions: getGameVersions() });
});
router.put('/admin/skills/toggle', authMiddleware, adminMiddleware, (req, res) => {
  const { skillId, enabled } = req.body;
  if (!skillId) return res.status(400).json({ error: 'skillId required' });
  setSkillOverride(skillId, enabled !== false);
  res.json({ ok: true, overrides: getSkillOverrides() });
});

// Server-authoritative ladder update (anti-cheat)
router.post('/ladder/update', authMiddleware, (req, res) => {
  const { won } = req.body;
  const user = getUserFull(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const gd = { ...(user.game_data || {}) };
  const total_games = (user.total_games || 0) + 1;
  const wins = (user.wins || 0) + (won ? 1 : 0);

  let rankIdx = gd.rankIdx || 0;
  let stars = gd.stars || 0;
  let points = gd.points || 1000;
  let streak = gd.streak || 0;
  let maxStreak = gd.maxStreak || 0;
  let newbieGames = gd.newbieGames || 0;
  let ladderProtect = gd.ladderProtect || 0;
  let msg = '';

  if (won) { streak++; maxStreak = Math.max(maxStreak, streak); } else streak = 0;

  if (rankIdx === 0) {
    newbieGames++;
    if (newbieGames >= 3) { rankIdx = 1; stars = 0; }
    msg = won ? '新手保护 +1场' : '新手保护，不掉星';
  } else if (rankIdx <= 4) {
    if (won) {
      stars++;
      if (streak >= 3 && rankIdx < 4) stars++;
      if (stars >= RANK_CONFIG[rankIdx].stars && rankIdx < 5) {
        rankIdx++; stars = 0;
        if (rankIdx >= 2 && rankIdx <= 4) ladderProtect = 1;
        msg = '升段！';
      } else msg = '天梯 +1星';
    } else if (rankIdx > 1) {
      if (ladderProtect > 0) { ladderProtect = 0; msg = '大段保护，不掉星'; }
      else {
        stars--;
        if (stars < 0) { rankIdx--; stars = RANK_CONFIG[rankIdx].stars - 1; msg = '降段'; }
        else msg = '天梯 -1星';
      }
    } else msg = '新手保护，不掉星';
  } else {
    points = (points || 1000) + (won ? 25 : -15);
    if (rankIdx === 5) {
      if (points >= 1500) { rankIdx = 6; points = 0; msg = '升段！传奇'; }
      else if (points < 900) { rankIdx = 4; stars = RANK_CONFIG[4].stars - 1; points = 1000; msg = '降段至铂金'; }
      else if (points < 0) points = 0;
    } else if (points < 0) points = 0;
    msg = won ? '天梯 +25分' : '天梯 -15分';
  }

  gd.rankIdx = rankIdx; gd.stars = stars; gd.points = points;
  gd.streak = streak; gd.maxStreak = maxStreak;
  gd.newbieGames = newbieGames; gd.ladderProtect = ladderProtect;

  updateUser(req.user.id, { game_data: gd, total_games, wins });
  res.json({ rankIdx, stars, points, streak, maxStreak, newbieGames, ladderProtect, msg });
});

module.exports = { router, authMiddleware, adminMiddleware, JWT_SECRET, jwt };
