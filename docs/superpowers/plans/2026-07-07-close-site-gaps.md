# 站点策划案差距对齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all 7 gaps between the DEMO code and the site策划案 at gh.lirare.xyz/codename001-core/

**Architecture:** This project has a client-side PvE engine (`index.html`) and a server-side PvP engine (`game.js`). 6 of 7 changes touch only `index.html`. Only Task 1 (suit tiebreaker) requires changes in both files. The cosmetic system (Task 7) was claimed done in CHANGELOG v1.3.0 but the code is missing — must be implemented from scratch; server save whitelist already supports it.

**Tech Stack:** Vanilla JS client-side SPA in single `index.html`, Express + Socket.IO backend, SQLite via better-sqlite3

---

## Task 1: 花色踢脚 — compare() 评分向量相等时按花色决胜

**Files:**
- Modify: `server/game.js:152-158`
- Modify: `server/client/index.html:1027`
- Test: server/game.js already used in PvP, test by playing a PvP game where hands match

**Background:** Current `compare()` returns 0 when score vectors are identical — this means a tie. 策划案要求: when score vectors are equal, compare by suit order ♠ > ♥ > ♦ > ♣ on the cards used in the best 5-card hand.

**Implementation:**

- [ ] **Step 1: Modify `compare()` in `server/game.js`**

The function needs a 3rd parameter `cardsA` and `cardsB` — the best 5-card hands that produced the score. When score vectors are equal, compare the suits of the highest card in each hand.

Current code (line 152-158):
```js
function compare(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    let d = (a[i] || 0) - (b[i] || 0);
    if (d) return d;
  }
  return 0;
}
```

New code — add SUIT_ORDER constant and modify compare, then update all call sites:
```js
const SUIT_ORDER = { '♠': 4, '♥': 3, '♦': 2, '♣': 1 };
function compare(a, b, cardsA, cardsB) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    let d = (a[i] || 0) - (b[i] || 0);
    if (d) return d;
  }
  // Score identical → suit tiebreaker using best 5-card hands
  if (cardsA && cardsB) {
    // Sort cards by rank descending, then by suit order
    let sortedA = [...cardsA].sort((x, y) => y.rank - x.rank || (SUIT_ORDER[y.suit] || 0) - (SUIT_ORDER[x.suit] || 0));
    let sortedB = [...cardsB].sort((x, y) => y.rank - x.rank || (SUIT_ORDER[y.suit] || 0) - (SUIT_ORDER[x.suit] || 0));
    for (let i = 0; i < Math.max(sortedA.length, sortedB.length); i++) {
      if (i >= sortedA.length) return -1;
      if (i >= sortedB.length) return 1;
      if (sortedA[i].rank !== sortedB[i].rank) return sortedA[i].rank - sortedB[i].rank;
      let suitDiff = (SUIT_ORDER[sortedA[i].suit] || 0) - (SUIT_ORDER[sortedB[i].suit] || 0);
      if (suitDiff) return suitDiff;
    }
  }
  return 0;
}
```

Then update all call sites in `game.js` that pass score vectors to also pass the cards:
- Line 110: `if (!best || compare(ev.score, best.score) > 0) best = ev;` → `if (!best || compare(ev.score, best.score, ev.cards, best.cards) > 0) best = ev;`
- Line 117: same pattern
- `aiPickSkill` (line ~170): if it calls compare, update it
- Any other compare() call in game.js

- [ ] **Step 2: Modify `compare()` in `server/client/index.html`**

Same change at line 1027. Also update all call sites:
- Line 1025 (evaluate): two compare() calls
- Line 1027 (compare definition itself)
- Line 1012 (chooseBest): `if(!score||compare(ev.score,score)>0)`
- Line 1015 (resolveRound): `let cmp=compare(pe.score,oe.score)` → needs cards too

Update the resolveRound call at line 1015:
```js
let cmp = compare(pe.score, oe.score, pe.cards, oe.cards);
```

- [ ] **Step 3: Verify**

Start local server (`node server/index.js` from server/), play a PvE game and PvP game. Manually verify tie scenarios work.

- [ ] **Step 4: Commit**

```
git add server/game.js server/client/index.html
git commit -m "fix: 花色踢脚 — 评分向量相等时按 ♠>♥>♦>♣ 决胜"
```

---

## Task 2: 抽卡保底 — drawSkills() 增加十连T2+保底 + 50抽T0保底

**Files:**
- Modify: `server/client/index.html:880`
- No server change — gacha is client-side only

**Background:** Current `drawSkills()` is pure random per pull. 策划案要求: 十连至少1张T2+, 累计50抽确保T0.

- [ ] **Step 1: Add pity counters to state init + ensureDefaults**

In `initState()` (line 763), add: `pityT2:0, pityT0:0`

In `ensureDefaults()` (line 732), add:
```js
if (state.pityT2 === undefined) state.pityT2 = 0;
if (state.pityT0 === undefined) state.pityT0 = 0;
```

- [ ] **Step 2: Modify `drawSkills(n)`**

Current function at line 880. Replace with:
```js
function drawSkills(n) {
  const cost = n === 10 ? 1000 : 100;
  if (state.gems < cost) return toast('钻石不足');
  state.gems -= cost;
  let results = [];
  let gotT2Plus = false;
  for (let i = 0; i < n; i++) {
    state.pityT0 = (state.pityT0 || 0) + 1;
    let pool = SKILLS;
    let r = Math.random();
    let tier;
    // 50抽保底: 累计50抽必出T0
    if (state.pityT0 >= 50) {
      tier = 'T0';
      state.pityT0 = 0;
    } else if (n === 10 && !gotT2Plus && i === n - 1) {
      // 十连保底: 最后1张还没出T2+ → 强制出
      tier = Math.random() < 0.18 ? 'T0' : Math.random() < 0.53 ? 'T1' : 'T2';
    } else {
      tier = r < 0.06 ? 'T0' : r < 0.23 ? 'T1' : r < 0.55 ? 'T2' : 'T3';
    }
    if (tier !== 'T3') gotT2Plus = true;
    if (tier === 'T0') state.pityT0 = 0;
    let p = pool.filter(s => s.tier === tier);
    let s = p[Math.floor(Math.random() * p.length)];
    state.skills[s.id] ??= { copies: 0, uses: 0 };
    state.skills[s.id].copies++;
    results.push({ icon: s.icon, name: s.name, sub: s.tier });
  }
  results.sort((a, b) => { var o = ['T0','T1','T2','T3']; return o.indexOf(a.sub) - o.indexOf(b.sub); });
  save();
  showDraw(results, '功能牌抽取');
}
```

- [ ] **Step 3: Add pity progress display** (optional but nice)

In `renderShop()` or `showSkillPool()`, display "已累计 X 抽未出 T0" and "十连保底T2+" info.

- [ ] **Step 4: Verify**

Load game, check that 10-pull always includes at least one T2+ card. Test 50-pull counter (or set pityT0 to 49 and verify next pull is T0).

- [ ] **Step 5: Commit**

```
git add server/client/index.html
git commit -m "feat: 抽卡保底 — 十连至少1张T2+，50抽保底T0"
```

---

## Task 3: 宝箱开箱 — openChest() 改为概率奖励

**Files:**
- Modify: `server/client/index.html:991`

**Background:** Current `openChest()` grants flat 50 gems when chest >= 10. 策划案要求: 开箱奖励 60% T3卡×1 / 30% T2卡×1 / 10% 100🪙, 日上限5箱, 第N箱需 10+(N-1)×2 点.

- [ ] **Step 1: Add chest counters to state init + ensureDefaults**

In `initState()`, add: `chestOpensToday:0, chestDate:''`

In `ensureDefaults()`:
```js
if (state.chestOpensToday === undefined) state.chestOpensToday = 0;
if (state.chestDate === undefined) state.chestDate = '';
```

- [ ] **Step 2: Modify `openChest()`**

Current function at line 991:
```js
function openChest() {
  if (state.chest < 10) return;
  state.chest = 0;
  state.gems += 50;
  save();
  toast('宝箱已开启！获得 50 钻石');
  renderHome();
}
```

Replace with:
```js
function openChest() {
  // Daily reset
  const today = new Date().toDateString();
  if (state.chestDate !== today) {
    state.chestDate = today;
    state.chestOpensToday = 0;
  }
  // Nth chest threshold: 10 + (N-1)*2
  const required = 10 + (state.chestOpensToday || 0) * 2;
  if (state.chest < required) return toast(`还需 ${required - state.chest} 点开启第 ${(state.chestOpensToday||0)+1} 箱`);
  if (state.chestOpensToday >= 5) return toast('今日已开启5箱，明天再来吧');
  
  state.chest -= required;
  state.chestOpensToday = (state.chestOpensToday || 0) + 1;
  
  const r = Math.random();
  let reward;
  if (r < 0.6) {
    // 60% T3卡×1
    const pool = SKILLS.filter(s => s.tier === 'T3');
    const s = pool[Math.floor(Math.random() * pool.length)];
    state.skills[s.id] ??= { copies: 0, uses: 0 };
    state.skills[s.id].copies++;
    reward = { text: s.icon + ' ' + s.name + ' (T3)', icon: s.icon };
    toast('宝箱开启！获得 T3 功能牌：' + s.name);
  } else if (r < 0.9) {
    // 30% T2卡×1
    const pool = SKILLS.filter(s => s.tier === 'T2');
    const s = pool[Math.floor(Math.random() * pool.length)];
    state.skills[s.id] ??= { copies: 0, uses: 0 };
    state.skills[s.id].copies++;
    reward = { text: s.icon + ' ' + s.name + ' (T2)', icon: s.icon };
    toast('宝箱开启！获得 T2 功能牌：' + s.name);
  } else {
    // 10% 100🪙
    state.coins += 100;
    reward = { text: '🪙 100', icon: '🪙' };
    toast('宝箱开启！获得 100 金币');
  }
  save();
  renderHome();
}
```

Also update the chest UI in `renderHome()`: change the chest bar to show current/required points per chest level.

- [ ] **Step 3: Verify**

Play PvE to accumulate chest points, verify threshold increases per open (10, 12, 14, 16, 18), verify max 5 per day, verify reward distribution.

- [ ] **Step 4: Commit**

```
git add server/client/index.html
git commit -m "feat: 宝箱开箱 — 按概率出T3/T2/金币，日上限5箱，递增点数"
```

---

## Task 4: 大段保护 — 升入白银/黄金/铂金后给1次保护

**Files:**
- Modify: `server/client/index.html:884` (updateLadder)

**Background:** 策划案要求: 刚升入白银/黄金/铂金 → 获得1次大段保护，优先消耗。当前 `updateLadder()` 没有任何保护机制。

- [ ] **Step 1: Add protection field to state + ensureDefaults**

In `initState()`, add: `ladderProtect:0` (0 = no protection, 1 = has protection)

In `ensureDefaults()`:
```js
if (state.ladderProtect === undefined) state.ladderProtect = 0;
```

- [ ] **Step 2: Modify `updateLadder()` in the promotion path**

At line 884, find the promotion code in the `rankIdx <= 4` branch:
```js
if (state.stars >= cfg.stars && state.rankIdx < 5) {
  state.rankIdx++;
  state.stars = 0;
  return '升段！';
}
```

Add protection grant:
```js
if (state.stars >= cfg.stars && state.rankIdx < 5) {
  state.rankIdx++;
  state.stars = 0;
  // Grant protection when entering silver/gold/platinum (rankIdx 2/3/4)
  if (state.rankIdx >= 2 && state.rankIdx <= 4) {
    state.ladderProtect = 1;
  }
  return '升段！';
}
```

- [ ] **Step 3: Modify the demotion path to consume protection**

In the loss branch for `rankIdx <= 4`:
```js
} else if (state.rankIdx > 1) {
  state.stars--;
  if (state.stars < 0) {
    state.rankIdx--;
    state.stars = RANK_CONFIG[state.rankIdx].stars - 1;
    return '降段';
  }
}
```

Change to:
```js
} else if (state.rankIdx > 1) {
  if (state.ladderProtect > 0) {
    state.ladderProtect = 0;
    return '大段保护，不掉星';
  }
  state.stars--;
  if (state.stars < 0) {
    state.rankIdx--;
    state.stars = RANK_CONFIG[state.rankIdx].stars - 1;
    return '降段';
  }
}
```

- [ ] **Step 4: Verify**

Play ranked games, trigger promotion to silver, then lose immediately — should see "大段保护，不掉星" instead of losing a star.

- [ ] **Step 5: Commit**

```
git add server/client/index.html
git commit -m "feat: 大段保护 — 升白银/黄金/铂金获1次保护"
```

---

## Task 5: 大师掉段 — 大师积分<900掉回铂金

**Files:**
- Modify: `server/client/index.html:884` (updateLadder)

**Background:** Current `updateLadder()` for rankIdx 5 (大师) only does `state.points = Math.max(0, points + (won?25:-15))` and promotes to legend at 1500pts. No demotion to platinum is implemented. 策划案要求: 大师积分 < 900 → 掉回铂金Ⅰ 3星.

- [ ] **Step 1: Modify the master tier loss path in `updateLadder()`**

At line 884, find the master tier code:
```js
state.points = Math.max(0, (state.points || 1000) + (won ? 25 : -15));
if (state.rankIdx === 5 && state.points >= 1500) state.rankIdx = 6;
return won ? '天梯 +25分' : '天梯 -15分';
```

Change to:
```js
state.points = (state.points || 1000) + (won ? 25 : -15);
if (state.rankIdx === 5) {
  if (state.points >= 1500) {
    state.rankIdx = 6;
    state.points = 0;
    return '升段！传奇';
  }
  if (state.points < 900) {
    state.rankIdx = 4; // 铂金Ⅰ
    state.stars = RANK_CONFIG[4].stars - 1; // 3星
    state.points = 1000;
    return '降段至铂金';
  }
}
return won ? '天梯 +25分' : '天梯 -15分';
```

Note: apply `Math.max` for the floor check differently — we want to allow points to go below 900 naturally to detect demotion, but still enforce a floor? Actually no — if the floor is enforced first, points can never go below 900. Remove the `Math.max(0, ...)` and let points go negative to detect demotion, then reset to 1000 after demotion.

```js
state.points = (state.points || 1000) + (won ? 25 : -15);
```

No `Math.max` wrapping — points can dip below 900.

- [ ] **Step 2: Verify**

Set `state.points = 910` and lose a match → 895 < 900 → demoted to platinum. Verify rankIdx becomes 4 and stars.

- [ ] **Step 3: Commit**

```
git add server/client/index.html
git commit -m "feat: 大师掉段 — 积分<900掉回铂金Ⅰ3星"
```

---

## Task 6: AI 三因子 — getAIParams() 增加动态调节

**Files:**
- Modify: `server/client/index.html:933` (getAIParams)
- Modify: `server/client/index.html:1020` (finishBattle — AI streak adjustment)
- Modify: `server/client/index.html` (aiStartSkill / aiUseSkills — skill quality adjustment)

**Background:** Current `getAIParams()` only uses `rank` + `aiTier` + fixed `tierBase/useBase`. 策划案要求 three dynamic factors:
1. 近期表现: 连胜/连败2场调档 + 3局冷却
2. 全局胜率校准: ≥30场且偏离目标 → 调基线
3. 技能品质校正: 最高装备tier × 0.15 降难度

- [ ] **Step 1: Modify `getAIParams()` to include all three factors**

Current function at line 933:
```js
function getAIParams() {
  const rank = state.rankIdx || 0, tier = state.aiTier || 0;
  const level = Math.min(20, rank * 3 + tier);
  const rankBonus = Math.min(0.3, rank * 0.045);
  const tierBase = [0.10, 0.30, 0.55];
  const useBase = [0.15, 0.40, 0.70];
  const skillRate = Math.min(0.88, tierBase[tier] + rankBonus);
  const useRate = Math.min(0.92, useBase[tier] + rankBonus);
  const pool = level <= 4 ? 'weak' : level <= 11 ? 'normal' : 'strong';
  return { skillRate, useRate, pool, level };
}
```

Replace with:
```js
function getAIParams() {
  const rank = state.rankIdx || 0, tier = state.aiTier || 0;
  const level = Math.min(20, rank * 3 + tier);
  const rankBonus = Math.min(0.3, rank * 0.045);
  const tierBase = [0.10, 0.30, 0.55];
  const useBase = [0.15, 0.40, 0.70];
  
  // 因子①: 近期表现 — 连胜/连败调档（已由 finishBattle 维护 aiTier）
  // aiTier 已经在 finishBattle 中按 2连胜/2连败 调档，这里直接用它
  
  // 因子②: 全局胜率校准 — ≥30场且偏离50%±15%时调基线
  let winrateBonus = 0;
  const total = state.total || 0;
  if (total >= 30) {
    const wr = (state.wins || 0) / total;
    if (wr < 0.35) winrateBonus = -0.10;  // 胜率低 → 降难度（玩家需要帮助）
    else if (wr > 0.65) winrateBonus = 0.10; // 胜率高 → 升难度
  }
  
  // 因子③: 技能品质校正 — 最高装备tier × 0.15 降难度
  let skillQualityBonus = 0;
  const equipped = state.equipped || [];
  let highestTierIdx = 0; // 0=T3, 1=T2, 2=T1, 3=T0
  for (const id of equipped) {
    const s = SM[id];
    if (s) {
      const idx = ['T3','T2','T1','T0'].indexOf(s.tier);
      if (idx > highestTierIdx) highestTierIdx = idx;
    }
  }
  skillQualityBonus = -highestTierIdx * 0.15; // T0=-0.45, T1=-0.30, T2=-0.15, T3=0
  
  const adjustedSkillRate = Math.min(0.88, Math.max(0.05, tierBase[tier] + rankBonus + winrateBonus + skillQualityBonus));
  const adjustedUseRate = Math.min(0.92, Math.max(0.08, useBase[tier] + rankBonus + winrateBonus + skillQualityBonus));
  
  const pool = level <= 4 ? 'weak' : level <= 11 ? 'normal' : 'strong';
  return { skillRate: adjustedSkillRate, useRate: adjustedUseRate, pool, level };
}
```

- [ ] **Step 2: Verify**

Log in, play several PvE games, check `getAIParams()` values in console. Equip higher-tier skills and verify skill quality correction kicks in.

- [ ] **Step 3: Commit**

```
git add server/client/index.html
git commit -m "feat: AI三因子 — 胜率校准+技能品质校正+连胜调档"
```

---

## Task 7: 外装系统 — 称号+头像框

**Files:**
- Modify: `server/client/index.html` — add TITLES/FRAMES constants, unlock detection, UI, display wiring
- No server change needed — auth.js save whitelist already supports `titles`, `frames`, `cosmetic`

**Background:** CHANGELOG v1.3.0 claims this was implemented, but no TITLES/FRAMES code exists in current `index.html`. This is the largest task.

**策划案 requirements:**
- 8 titles: 初来乍到, 百战勇士, 沙场老兵, 天选之人, 神枪手, 钻石VIP, 最强王者, 收藏家
- 6 frames (border images for avatars)
- Unlock conditions based on achievements/rank
- Display in leaderboard, profile, and battle

- [ ] **Step 1: Add TITLES/FRAMES constants**

After the SKILLS array (around line 565), add:
```js
const TITLES = [
  { id: 'newcomer', name: '初来乍到', desc: '完成1场对战', icon: '🌱', check: s => (s.total || 0) >= 1 },
  { id: 'warrior', name: '百战勇士', desc: '完成100场对战', icon: '⚔️', check: s => (s.total || 0) >= 100 },
  { id: 'veteran', name: '沙场老兵', desc: '完成500场对战', icon: '🎖️', check: s => (s.total || 0) >= 500 },
  { id: 'chosen', name: '天选之人', desc: '达到铂金段位', icon: '👑', check: s => (s.rankIdx || 0) >= 4 },
  { id: 'sharpshooter', name: '神枪手', desc: '单场打出皇家同花顺', icon: '🎯', check: s => (s.handCounts?.[9] || 0) >= 1 },
  { id: 'diamond_vip', name: '钻石VIP', desc: '累计充值/签到30天', icon: '💎', check: s => { /* checked by achievement system */ return false } },
  { id: 'king', name: '最强王者', desc: '达到传奇段位', icon: '🏆', check: s => (s.rankIdx || 0) >= 6 },
  { id: 'collector', name: '收藏家', desc: '集齐20张不同功能牌', icon: '📚', check: s => { const owned = Object.values(s.skills || {}).filter(v => v.copies > 0).length; return owned >= 20; } },
];
const FRAMES = [
  { id: 'default', name: '默认', desc: '初始头像框', src: 'assets/frame_default.png' },
  { id: 'bronze', name: '青铜边框', desc: '达到青铜段位', src: 'assets/frame_bronze.png', check: s => (s.rankIdx || 0) >= 1 },
  { id: 'silver', name: '白银边框', desc: '达到白银段位', src: 'assets/frame_silver.png', check: s => (s.rankIdx || 0) >= 2 },
  { id: 'gold', name: '黄金边框', desc: '达到黄金段位', src: 'assets/frame_gold.png', check: s => (s.rankIdx || 0) >= 3 },
  { id: 'diamond', name: '铂金边框', desc: '达到铂金段位', src: 'assets/frame_diamond.png', check: s => (s.rankIdx || 0) >= 4 },
  { id: 'master', name: '大师边框', desc: '达到大师段位', src: 'assets/frame_master.png', check: s => (s.rankIdx || 0) >= 5 },
  { id: 'legend', name: '传奇边框', desc: '达到传奇段位', src: 'assets/frame_legend.png', check: s => (s.rankIdx || 0) >= 6 },
];
```

- [ ] **Step 2: Add state fields for cosmetic system**

In `ensureDefaults()`:
```js
if (!state.titles) state.titles = {};
if (!state.frames) state.frames = {};
if (!state.equippedTitle) state.equippedTitle = '';
if (!state.equippedFrame) state.equippedFrame = 'default';
```

- [ ] **Step 3: Add unlock detection function**

Add a function that checks all TITLES/FRAMES for newly unlocked ones:
```js
function checkCosmeticUnlocks() {
  if (!state.titles) state.titles = {};
  if (!state.frames) state.frames = {};
  let newUnlocks = [];
  for (const t of TITLES) {
    if (!state.titles[t.id] && t.check(state)) {
      state.titles[t.id] = { unlocked: true, equipped: false };
      newUnlocks.push('称号：' + t.name);
    }
  }
  for (const f of FRAMES) {
    if (f.check && !state.frames[f.id] && f.check(state)) {
      state.frames[f.id] = { unlocked: true };
      newUnlocks.push('头像框：' + f.name);
    }
  }
  if (newUnlocks.length) {
    toast('解锁新外装！' + newUnlocks.join('、'));
    save();
  }
}
```

- [ ] **Step 4: Insert unlock trigger points**

Call `checkCosmeticUnlocks()` after state loads and in relevant places:
- At end of `loadServerData()` (around line 729)
- In `finishBattle()` after state changes (around line 1020, after `save()` call)
- In `updateLadder()` after promotion

- [ ] **Step 5: Add `showCosmeticSelect()` UI**

Add function to show cosmetic selection modal:
```js
function showCosmeticSelect() {
  checkCosmeticUnlocks();
  let html = '<div class="modalBox" style="max-width:380px"><div class="title" style="color:#321707;margin-bottom:8px">🎨 外装</div>';
  // Titles section
  html += '<div style="font-weight:1000;margin-bottom:4px">称号</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px">';
  for (const t of TITLES) {
    const unlocked = state.titles?.[t.id];
    const equipped = state.equippedTitle === t.id;
    html += `<div class="shopItem" style="cursor:pointer;opacity:${unlocked?1:0.4};${equipped?'border-color:#ffd15c':''}" onclick="${unlocked?'selectCosmeticTitle(\''+t.id+'\');this.closest(\'.modal\').remove();showCosmeticSelect()':'toast(\'未解锁\')'}"><span>${t.icon} ${t.name}</span><span class="small muted">${unlocked?(equipped?'✓ 使用中':'点击装备'):t.desc}</span></div>`;
  }
  html += '</div>';
  // Frames section
  html += '<div style="font-weight:1000;margin-bottom:4px">头像框</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px">';
  for (const f of FRAMES) {
    const unlocked = !f.check || state.frames?.[f.id];
    const equipped = state.equippedFrame === f.id;
    html += `<div class="shopItem" style="cursor:pointer;opacity:${unlocked?1:0.4};${equipped?'border-color:#ffd15c':''}" onclick="${unlocked?'selectCosmeticFrame(\''+f.id+'\');this.closest(\'.modal\').remove();showCosmeticSelect()':'toast(\'未解锁\')'}"><span>${f.name}</span><span class="small muted">${unlocked?(equipped?'✓ 使用中':'点击装备'):f.desc}</span></div>`;
  }
  html += '</div>';
  html += '<div class="btn" onclick="this.closest(\'.modal\').remove()">关闭</div></div>';
  const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = html;
  document.body.appendChild(m);
  m.onclick = e => { if (e.target === m) m.remove(); };
}
function selectCosmeticTitle(id) {
  state.equippedTitle = id;
  save();
  toast('已装备称号：' + (TITLES.find(t => t.id === id)?.name || id));
}
function selectCosmeticFrame(id) {
  state.equippedFrame = id;
  save();
  toast('已装备头像框：' + (FRAMES.find(f => f.id === id)?.name || id));
}
```

- [ ] **Step 6: Add "外装" button to `showUserMenu()`**

In `showUserMenu()` (line 683), add a button:
```js
'<div class="btn" onclick="this.closest(\'.modal\').remove();showCosmeticSelect()" style="margin-bottom:6px">🎨 外装</div>' +
```

Insert before the "修改游戏名" button or "退出登录" button.

- [ ] **Step 7: Display equipped title in battle + topbar**

In `renderHome()` topbar area: after the user name, show the equipped title if any:
```js
const titleName = state.equippedTitle ? (TITLES.find(t => t.id === state.equippedTitle)?.name || '') : '';
// ... in the userAvatarHtml:
// Add title display below username
```

In `fighterHtml()` (battle display), show equipped title below the player name.

- [ ] **Step 8: Handle missing frame assets gracefully**

Since frame images may not exist yet, add an `onerror` handler to fall back gracefully:
```js
// When rendering frame: use onerror to hide broken img
<img src="assets/frame_gold.png" onerror="this.style.display='none'" ...>
```

- [ ] **Step 9: Verify**

Click user menu → see "外装" button → click → see title/frame list → equip one → verify it shows in home screen and battle.

- [ ] **Step 10: Commit**

```
git add server/client/index.html
git commit -m "feat: 外装系统 — 称号+头像框解锁/装备/展示"
```

---

## Verification Plan

After all tasks are complete:

1. Start local server: `cd server && node index.js`
2. Open `http://localhost:3000` in two browser tabs (two accounts)
3. Test each gap fix:
   - **花色踢脚**: Play a PvP where both get same hand type → should use suit tiebreaker
   - **抽卡保底**: Draw 10-pull → verify at least 1 T2+; Draw 50 singles → 50th should be T0
   - **宝箱**: Play PvE → open chest → verify random reward; open 5 chests → 6th blocked
   - **大段保护**: Reach silver → lose → see protection message
   - **大师掉段**: Set points to 910 → lose → should demote to platinum
   - **AI三因子**: Play PvE with high winrate → check getAIParams values
   - **外装**: Open user menu → click 外装 → equip title/frame → verify display

4. Deploy: push to master → Railway auto-deploys
