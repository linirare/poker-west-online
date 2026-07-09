# 称号系统 & 头像框 — 设计计划

## 总览

在现有用户外显体系（头像+名称）基础上增加 **称号（Title）** 和 **头像框（Avatar Frame）** 两个装饰层。

| 维度 | 称号 | 头像框 |
|------|------|--------|
| 展现 | 名字旁的标签 | 头像周围的光效/边框 |
| 获取 | 成就/段位/活动 | 段位/成就/商城 |
| 唯一性 | 同时装备 1 个 | 同时装备 1 个 |

---

## 一、数据结构

### state 新增字段

```javascript
// 称号
state.titles = {
  unlocked: ['first_win'],  // 已解锁的称号 ID 数组
  equipped: ''              // 当前装备的称号 ID，空字符串=无
}

// 头像框
state.frames = {
  unlocked: ['default'],    // 已解锁的框 ID 数组
  equipped: 'default'       // 当前装备的框 ID
}
```

### initState() 调整

```javascript
// 在 initState() 返回值中追加：
titles: { unlocked: [], equipped: '' },
frames: { unlocked: ['default'], equipped: 'default' }
```

### ensureDefaults() 调整

确保旧玩家数据兼容：`if (!state.titles) state.titles = { unlocked: [], equipped: '' }`

---

## 二、称号定义

数据来源：`server/client/index.html`，新增常量 `TITLES`：

```javascript
const TITLES = [
  { id: 'first_win',     name: '初出茅庐',   desc: '获得首场胜利',            icon: '🎖️' },
  { id: 'streak_3',      name: '三连胜',      desc: '获得 3 连胜',             icon: '🔥' },
  { id: 'streak_5',      name: '五连胜',      desc: '获得 5 连胜',             icon: '⚡' },
  { id: 'streak_10',     name: '十连胜',      desc: '获得 10 连胜',            icon: '💫' },
  { id: 'rank_silver',   name: '白银选手',    desc: '达到白银段位',            icon: '🥈' },
  { id: 'rank_gold',     name: '黄金斗士',    desc: '达到黄金段位',            icon: '🥇' },
  { id: 'rank_platinum', name: '铂金领主',    desc: '达到铂金段位',            icon: '💎' },
  { id: 'rank_master',   name: '大师风范',    desc: '达到大师段位',            icon: '👑' },
  { id: 'rank_legend',   name: '传奇永恒',    desc: '达到传奇段位',            icon: '🌟' },
  { id: 'game_100',      name: '百战老兵',    desc: '累计 100 场对局',         icon: '⚔️' },
  { id: 'game_500',      name: '身经百战',    desc: '累计 500 场对局',         icon: '🗡️' },
  { id: 'royal_flush',   name: '天胡开局',    desc: '打出皇家同花顺',          icon: '🃏' },
  { id: 'all_chars',     name: '全角色收集',  desc: '解锁全部 4 个角色',       icon: '🎭' },
  { id: 'all_skills',    name: '全图鉴',      desc: '收集全部功能牌种类',      icon: '📚' },
  { id: 'first_gacha',   name: '命运的邂逅',  desc: '首次抽卡',                icon: '✨' },
  { id: 'gacha_100',     name: '豪掷千金',    desc: '累计抽卡 100 次',         icon: '💰' },
  { id: 'daily_7',       name: '持之以恒',    desc: '连续签到 7 天',           icon: '📅' },
  { id: 'winrate_60',    name: '常胜将军',    desc: '胜率 60%+（50 场以上）',  icon: '🏆' },
  { id: 'winrate_70',    name: '不败传说',    desc: '胜率 70%+（50 场以上）',  icon: '🏅' },
  { id: 'pvp_win',       name: '战场主宰',    desc: '赢得一场 PvP 对局',       icon: '🌐' },
];
```

### 解锁判定函数

```javascript
function checkTitleUnlock(titleId, context) {
  switch (titleId) {
    case 'first_win':    return state.wins >= 1;
    case 'streak_3':     return state.maxStreak >= 3;
    case 'streak_5':     return state.maxStreak >= 5;
    case 'streak_10':    return state.maxStreak >= 10;
    case 'rank_silver':  return state.rankIdx >= 1;
    case 'rank_gold':    return state.rankIdx >= 3;
    case 'rank_platinum':return state.rankIdx >= 4;
    case 'rank_master':  return state.rankIdx >= 5;
    case 'rank_legend':  return state.rankIdx >= 6;
    case 'game_100':     return state.total >= 100;
    case 'game_500':     return state.total >= 500;
    case 'royal_flush':  return (state.handCounts[9] || 0) >= 1;  // 皇家同花顺在手牌统计 index 9
    case 'all_chars':    return Object.values(state.chars).every(c => c.owned);
    case 'all_skills':   return Object.keys(SKILLS).every(id => (state.skills[id]?.copies || 0) > 0);
    case 'first_gacha':  return (state.totalGacha || 0) >= 1;
    case 'gacha_100':    return (state.totalGacha || 0) >= 100;
    case 'daily_7':      return (state.dailyStreak || 0) >= 7;
    case 'winrate_60':   return state.total >= 50 && state.wins/state.total >= 0.6;
    case 'winrate_70':   return state.total >= 50 && state.wins/state.total >= 0.7;
    case 'pvp_win':      return (state.pvpWins || 0) >= 1;
    default: return false;
  }
}
```

调用时机：`finishBattle()`、`showPvPGameOver()`、`drawSkills()`、`drawChars()`、`claimDailyBonus()` 等操作后调用 `checkAndUnlockTitles()` 遍历检查。

---

## 三、头像框定义

```javascript
const FRAMES = [
  { id: 'default',  name: '经典',     desc: '默认头像框',               css: '' },
  { id: 'silver',   name: '银质边框', desc: '达到白银段位',             css: 'frame-silver' },
  { id: 'gold',     name: '金质边框', desc: '达到黄金段位',             css: 'frame-gold' },
  { id: 'diamond',  name: '钻石边框', desc: '达到铂金段位',             css: 'frame-diamond' },
  { id: 'master',   name: '大师光环', desc: '达到大师段位',             css: 'frame-master' },
  { id: 'legend',   name: '传奇之辉', desc: '达到传奇段位',             css: 'frame-legend' },
  { id: 'royal',    name: '皇家同花顺', desc: '打出皇家同花顺',         css: 'frame-royal' },
  { id: 'collector', name: '收藏家',  desc: '解锁全部角色',             css: 'frame-collector' },
  { id: 'veteran',  name: '百战老兵', desc: '累计 100 场',              css: 'frame-veteran' },
  { id: 'streak10', name: '十连胜',   desc: '获得 10 连胜',             css: 'frame-streak10' },
  { id: 'premium',  name: '限定边框', desc: '商店购买（规划中）',       css: 'frame-premium' },
];
```

### 解锁判定

```javascript
function checkFrameUnlock(frameId) {
  switch (frameId) {
    case 'default':  return true;
    case 'silver':   return state.rankIdx >= 1;
    case 'gold':     return state.rankIdx >= 2;
    case 'diamond':  return state.rankIdx >= 4;
    case 'master':   return state.rankIdx >= 5;
    case 'legend':   return state.rankIdx >= 6;
    case 'royal':    return (state.handCounts[9] || 0) >= 1;
    case 'collector':return Object.values(state.chars).every(c => c.owned);
    case 'veteran':  return state.total >= 100;
    case 'streak10': return state.maxStreak >= 10;
    case 'premium':  return false; // 未来商城解锁
    default: return false;
  }
}
```

### CSS 实现

头像框通过 CSS class 实现，所有 avatar 容器增加 `frame-xxx` class。

```css
/* 基础：头像容器是 44px 圆形，框是 border + box-shadow 组合 */

/* 银质：简单银色边框 + 微光 */
.frame-silver {
  box-shadow: 0 0 0 3px #c0c0c0, 0 0 8px rgba(192,192,192,.3);
}

/* 金质：金色边框 + 暖光 */
.frame-gold {
  box-shadow: 0 0 0 3px #f5c45a, 0 0 12px rgba(245,196,90,.4);
}

/* 钻石：蓝白渐变边框 + 冷光 */
.frame-diamond {
  box-shadow: 0 0 0 3px #6fc1ff, 0 0 14px rgba(111,193,255,.5);
}

/* 大师：紫色光晕 */
.frame-master {
  box-shadow: 0 0 0 3px #c986ff, 0 0 18px rgba(201,134,255,.5);
}

/* 传奇：金色光晕 + 旋转动画 */
.frame-legend {
  box-shadow: 0 0 0 3px #ffd700, 0 0 20px rgba(255,215,0,.5);
  animation: frameLegend 2s ease-in-out infinite;
}

/* 皇家同花顺：红金渐变 */
.frame-royal {
  box-shadow: 0 0 0 3px #ff6b35, 0 0 0 6px rgba(255,107,53,.2), 0 0 16px rgba(255,107,53,.4);
}

/* 收藏家：彩虹多色 */
.frame-collector {
  box-shadow: 0 0 0 3px #c986ff, 0 0 0 6px #6fc1ff, 0 0 0 9px #f5c45a;
}

/* 百战：铜色稳重 */
.frame-veteran {
  box-shadow: 0 0 0 3px #cd7f32, 0 0 10px rgba(205,127,50,.3);
}

/* 十连胜：火焰红光 */
.frame-streak10 {
  box-shadow: 0 0 0 3px #ff4444, 0 0 14px rgba(255,68,68,.5);
  animation: frameStreak 1s ease-in-out infinite;
}

/* 限定：紫色渐变 */
.frame-premium {
  box-shadow: 0 0 0 3px #9b59b6, 0 0 18px rgba(155,89,182,.5);
}

@keyframes frameLegend {
  0%, 100% { box-shadow: 0 0 0 3px #ffd700, 0 0 20px rgba(255,215,0,.5); }
  50% { box-shadow: 0 0 0 3px #ffd700, 0 0 30px rgba(255,215,0,.7), 0 0 50px rgba(255,215,0,.2); }
}

@keyframes frameStreak {
  0%, 100% { box-shadow: 0 0 0 3px #ff4444, 0 0 14px rgba(255,68,68,.5); }
  50% { box-shadow: 0 0 0 3px #ff6666, 0 0 22px rgba(255,68,68,.7); }
}
```

**大小适配**：不同大小的 avatar（44px 头像框、56px 用户菜单、58px 战斗内）统一用 box-shadow（不占布局空间），自动适配。

---

## 四、展示位置

### 4.1 顶部栏头像 `userAvatarHtml()` — line 757

**改动**：avatar 的 div 增加 `frame-xxx` class

```javascript
// 改造前
'<div class="userAvatar" style="..."></div>'

// 改造后 — 加上 frame class
const frameClass = state.frames.equipped ? FRAMES.find(f => f.id === state.frames.equipped)?.css || '' : '';
'<div class="userAvatar ' + frameClass + '" style="..."></div>'
```

**称号显示**：用户名旁增加 badge

```javascript
const titleName = state.titles.equipped ? (TITLES.find(t => t.id === state.titles.equipped)?.icon || '') : '';
// 在 userName 后追加：titleName ? '<span style="font-size:10px;margin-left:4px">'+titleName+'</span>' : ''
```

### 4.2 用户菜单 `showUserMenu()` — line 668

- 头像增大到 64px，加上 frame class
- 称号显示在 charName 下方

```javascript
// 在 charName 行下新增
const titleObj = TITLES.find(t => t.id === state.titles.equipped);
const titleLine = titleObj ? '<div class="small muted" style="margin-bottom:6px">' + titleObj.icon + ' ' + titleObj.name + '</div>' : '';
```

- 菜单底部增加"外装"按钮进入选择界面：

```javascript
'<div class="btn" onclick="this.closest(\'.modal\').remove();showCosmeticSelect()" style="margin-bottom:6px">🎨 外装</div>'
```

### 4.3 战斗内 `fighterHtml()` — line 950

- avatar div 增加 frame class
- fighterMeta 增加称号显示

```javascript
// fighterMeta 追加称号
const titleTag = state.titles.equipped ? ' <span class="tag">' + (TITLES.find(t => t.id === state.titles.equipped)?.icon || '') + ' ' + (TITLES.find(t => t.id === state.titles.equipped)?.name || '') + '</span>' : '';
// 拼接在 rarity · Lv.x 后面
```

### 4.4 PvP 大厅 `showPvPLobby()` — line 1123

- 玩家卡片（paper div）中的头像占位增加称号/框
- 实际 PvP 头像显示用的是 socket 传递的 name 和 charIcon，称号/框暂不在 PvP 对局间同步（v1 只本地可见，v2 可考虑同步）

### 4.5 排行榜 `renderRank()` / `fetchLeaderboard()` — line 875

- 排行榜条目增加称号和框显示
- 需要后端返回 `displayName` 的同时也返回 `title` 和 `frame` 字段
- 或者先在 v1 只显示本地玩家自己的称号/框

v1 方案：排行榜条目用 `esc(x.displayName || x.username)` 追加称号图标（不依赖后端改动）。

### 4.6 聊天 — `chatMsgHtml()` （行 ~598 附近）

称号显示在发言者名字旁：

```javascript
// chatMsgHtml 中 chatName 后面追加称号 icon
```

---

## 五、选择界面 `showCosmeticSelect()`

新增函数，打开一个 modal 含两个 tab：

```
┌──────────────────────────┐
│  🎨 外装                 │
│  [称号]  [头像框]          │ ← tab 切换
│──────────────────────────│
│  当前：初出茅庐 🎖️       │ ← 当前装备
│                          │
│  ┌───┐ ┌───┐ ┌───┐     │
│  │🎖️ │ │🔥 │ │⚡│     │ ← 已解锁格子
│  │初  │ │三  │ │五  │     │
│  │出  │ │连  │ │连  │     │
│  │茅  │ │胜  │ │胜  │     │
│  │庐  │ │    │ │    │     │
│  └───┘ └───┘ └───┘     │
│  ┌───┐ ┌───┐           │
│  │🔒 │ │🔒 │           │ ← 未解锁（灰色锁）
│  │?? │ │?? │           │
│  │   │ │   │           │
│  └───┘ └───┘           │
│                          │
│  [装备]  [关闭]           │
└──────────────────────────┘
```

头像框 tab 同理，预览框效果（用当前用户头像演示）。

每个格子在已装备时显示"✓ 使用中"标记。

---

## 六、解锁触发时机

| 时机 | 检查内容 | 位置 |
|------|----------|------|
| `finishBattle()` PvE 结束 | 胜场/连胜/总局数/牌型/胜率相关称号 | line 965 |
| `showPvPGameOver()` PvP 结束 | PvP 胜利称号 | line 1301 |
| `updateLadder()` 段位更新后 | 段位称号+框 | line 874 |
| `drawSkills()` / `drawChars()` 抽卡后 | 抽卡/全图鉴/全角色 | line 870-871 |
| `claimDailyBonus()` 签到后 | 签到连续 | line 829 |
| `openChest()` / 其他 | — | — |

每次检查调用 `checkAndUnlockTitles()` + `checkAndUnlockFrames()`，有新解锁时 toast 提示"🎉 解锁称号：XXX"。

```javascript
function checkAndUnlockTitles() {
  let newUnlock = false;
  for (const t of TITLES) {
    if (state.titles.unlocked.includes(t.id)) continue;
    if (checkTitleUnlock(t.id)) {
      state.titles.unlocked.push(t.id);
      newUnlock = true;
      setTimeout(() => toast('🎉 解锁称号：' + t.icon + ' ' + t.name), 100);
    }
  }
  if (newUnlock) save();
}
```

---

## 七、涉及改动文件汇总

| 文件 | 改动量 | 内容 |
|------|--------|------|
| `server/client/index.html` | 大 | 新增 TITLES/FRAMES 常量 + CSS + check 函数 + 展示点 + 选择界面 + initState ensureDefaults 扩展 |
| `server/index.js` | 小 | 可选：让 PvP game_over 传递称号/框信息 |

---

## 八、实施顺序（建议）

1. **数据层**：常量定义 + initState + ensureDefaults + save/load 兼容
2. **解锁逻辑**：checkTitleUnlock + checkFrameUnlock + 触发时机插入
3. **展示**：topbar → 用户菜单 → 战斗内 → 排行榜 → 聊天
4. **选择界面**：showCosmeticSelect + tab 切换 + 装备操作
5. **CSS 动画**：各 frame 的 box-shadow 定义
6. **验证**：手动测试每个解锁条件、展示点、装备切换
