# 6 项优化 — 实施计划

## 总览

| # | 项目 | 涉及文件 | 难度 |
|---|------|----------|------|
| 1 | 主页按钮+功能牌收窄 | `index.html` (CSS) | 简单 |
| 2 | 战斗中误触退出修复 | `index.html` (JS) | 简单 |
| 3 | PvP 第3局技能重置 Bug | `server/game.js` | 简单 |
| 4 | 计时系统（替代自动按钮） | `index.html` + `server/index.js` | 中等 |
| 5 | 匹配中放大镜动画 | `index.html` (CSS+JS) | 简单 |
| 6 | 5秒匹配机制（人→Bot） | `index.html` + `server/index.js` + `server/rooms.js` | 中等 |

---

## 1. 主页按钮收窄

### 现状
- `.mainBtns` 为 `flex-direction:column`，两个按钮宽度占满容器
- `.homeSkills` 使用 `grid-template-columns:1fr 1fr`，功能牌卡同样占满

### 改动
**CSS （index.html ~line 503）**

在 `/* spacing pass */` 块内追加/修改：

```css
.mainBtns{max-width:300px;margin-left:auto;margin-right:auto}
.homeMainBtn{max-width:300px;width:100%}
.homeSkills{max-width:300px;margin-left:auto;margin-right:auto}
```

效果：两个按钮和下面的技能卡都限制在 300px 宽，居中显示。

---

## 2. 战斗中误触退出修复

### 根本原因
1. **`setScreen()`（line 744）**：当 `pvp.phase==='battle'` 时调用 `socket.emit('leave_room')` 并清空 pvp。如果战斗中误触底部导航栏的"主页"等按钮，会直接退出对局。
2. **Nav 导航栏在战斗中仍然存在**：`renderBattle()` 不隐藏底部导航，nav 按钮始终可点。
3. 文档级 `click` 监听（line 1203 `hideSkillDetail()`）虽不致命，但可能干扰操作。

### 改动

**index.html JS**

**a) 战斗中禁用导航切换（line 744 `setScreen()`）**

在 `setScreen` 开头添加保护：

```js
function setScreen(s) {
  // 战斗中禁止切换页面
  if (battle && battle.phase && battle.phase !== 'result') return toast('对局中无法切换');
  if (pvp && (pvp.phase === 'battle' || pvp.phase === 'lobby')) return toast('对局中无法切换');
  ...
}
```

例外：`setScreen('home')` 在 `finishBattle()` 和 `showPvPGameOver()` 中的调用是因为 battle 已结束，这些调用在 `battle=null` / `pvp=null` 之后，所以不应触发保护。

**b) `renderBattle()` 时隐藏导航**

在 `renderBattle()` 生成的 HTML 中，或者在 battle 开始时隐藏 `.nav`：

```js
// renderBattle() 内部添加
q('#nav').style.display = 'none';

// 在 battle 结束后恢复
// finishBattle() 里恢复
q('#nav').style.display = '';
```

**c) 给 actionArea 内元素加 stopPropagation**

虽然 nav 已隐藏，加一层防御：

```js
// renderBattle() 内
qa('.skillBtn, .playBtn, .handScroll .playCard').forEach(el => {
  el.addEventListener('click', e => e.stopPropagation());
});
```

---

## 3. PvP 第3局技能重置 Bug

### 根本原因
`server/game.js` line 439-448 的 `nextRound()` 中有一段代码：当 `round === 3` 时，每方随机选择一个已使用的技能将其重置为未使用。

```js
if (battle.round === 3) {
  for (const rk of ['player', 'opp']) {
    let f = battle[rk];
    let usd = Object.values(f.skills).filter(sk => sk.used);
    if (usd.length) {
      let sk = usd[Math.floor(Math.random() * usd.length)];
      sk.used = false; sk.charge = 1;
    }
  }
}
```

这原本可能是设计为"第3局奖励一次额外使用"，但用户认为这是 Bug（不合理地重置了技能状态）。

### 改动
**`server/game.js` — 删除整个 `if (battle.round === 3)` 块**

删除 lines 439-448（从 `if (battle.round === 3)` 到关闭大括号）。

---

## 4. 计时系统

### 4.1 移除自动按钮

- 删除 `toggleAuto()` 函数（line 860）
- 删除 `state.autoPlay` 相关的 `initState()` 初始化和 `ensureDefaults()`
- 删除 `renderBattle()` 中的自动按钮 HTML 和 `autoPlayTurn()` 调用

### 4.2 30秒出牌倒计时

**PvE（本地 battle）**

在 `renderBattle()` 中，`phase==='select'` 时启动一个 30s 定时器：

```js
let timer = 30;
let timerInterval = setInterval(() => {
  timer--;
  // 更新 UI 显示倒计时（在 hint 区域或旁边）
  if (timer <= 0) {
    clearInterval(timerInterval);
    // 自动选择最优出牌并提交
    autoSubmitPlay();
  }
}, 1000);
```

`autoSubmitPlay()` 实现：

```js
function autoSubmitPlay() {
  if (battle.phase !== 'select') return;
  let p = battle.player, need = roundNeed('player');
  battle.selected = [];
  let best = chooseBest(p.hand, need, p.buff);
  battle.selected = best.map(c => c.id);
  renderBattle();
  setTimeout(submitPlay, 300);
}
```

**PvP（Socket 模式）**

同样在 `renderPvPBattle()` 中添加 30s 定时器：

```js
// 仅在 phase==='select' && !mySubmitted 时启动
let timer = 30;
// 显示倒计时
// 到 0 时自动发最优牌给服务器
socket.emit('submit_play', { selected: bestIds });
```

### 4.3 5秒下一回合倒计时

在 `showRoundResult()` 中，当前"下一局"按钮改为自动倒计时：

```js
// 在 result 弹窗显示后，启动 5s 倒计时
let countdown = 5;
// 更新按钮文字为 "下一局 (5s)"
let cdInterval = setInterval(() => {
  countdown--;
  if (countdown <= 0) {
    clearInterval(cdInterval);
    // 如果是 PvE
    m.remove();
    nextRound();
    // 如果是 PvP
    // socket.emit('next_round');
  }
  // 更新按钮文字
}, 1000);
```

按钮点击仍可用（点击立即跳过倒计时）。

对于 PvP，`renderPvPBattle` 的 result 阶段同理。

### 4.4 "回到主页" = 投降

**PvE 对战**：当前 `finishBattle()` 中的 "回到主页" 直接退出，不影响记录。保持现状（PvE 不需要投降）。

**PvP 对战**：`showPvPGameOver()` 中的 "回到主页" 按钮当前已调用 `socket.emit('leave_room')` + `setScreen('home')`。这已经相当于投降（对手会收到 `opponent_left`）。不需要额外改动。

但在对局中途（非结算页面），如果用户刷新页面/断开连接，对手会收到 `opponent_left` 并自动胜利。这在 `server/index.js` line 355-376 的 `disconnect` 处理中已经实现。

---

## 5. 匹配中放大镜动画

### 5.1 CSS 动画

新增样式：

```css
@keyframes searchPulse {
  0% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(90deg) scale(1.1); }
  50% { transform: rotate(180deg) scale(1); }
  75% { transform: rotate(270deg) scale(1.1); }
  100% { transform: rotate(360deg) scale(1); }
}
@keyframes searchOrbit {
  0% { transform: translate(-40px, -40px); opacity: 0.3; }
  25% { transform: translate(40px, -20px); opacity: 0.8; }
  50% { transform: translate(40px, 40px); opacity: 0.3; }
  75% { transform: translate(-40px, 20px); opacity: 0.8; }
  100% { transform: translate(-40px, -40px); opacity: 0.3; }
}
```

### 5.2 弹窗 UI

```html
<div class="modalBox" style="text-align:center">
  <div class="searchAnimContainer">
    <div class="searchIcon">🔍</div>
  </div>
  <div class="title">正在匹配对手...</div>
  <div class="searchTimer" id="searchTimer">5s</div>
  <div class="muted">5秒内匹配真人，超时则对战 AI</div>
  <div class="btn dark" onclick="cancelMatchmaking()">取消</div>
</div>
```

---

## 6. 5秒匹配机制

### 6.1 匹配流程

```
用户点击"快速匹配"
  → 显示匹配弹窗（放大镜动画 + 5s 倒计时）
  → 前端发 socket.emit('quick_match')
  → 后端尝试配对（维护一个排队队列）
  
  情况 A: 5 秒内找到对手
  → 后端创建 PvP 房间，发 game_state 给双方
  → 关闭匹配弹窗，开始 PvP 对战
  
  情况 B: 5 秒内未找到对手
  → 后端通知前端超时
  → 关闭匹配弹窗，开始 PvE 对战（本地 battle）
```

### 6.2 后端改动

**`server/rooms.js`** — 新增快速匹配队列：

```js
// 快速匹配队列 [{socketId, skills, name, timestamp}]
let quickMatchQueue = [];

function addToQuickMatch(socketId, skills, name) {
  // 检查队列中是否有等待的对手
  let idx = quickMatchQueue.findIndex(q => q.socketId !== socketId);
  if (idx >= 0) {
    let match = quickMatchQueue.splice(idx, 1)[0];
    return { matched: true, opponent: match };
  }
  // 无人等待，加入队列
  quickMatchQueue.push({ socketId, skills, name, timestamp: Date.now() });
  return { matched: false };
}

function removeFromQuickMatch(socketId) {
  quickMatchQueue = quickMatchQueue.filter(q => q.socketId !== socketId);
}

function cleanStaleQuickMatch(maxAge = 30000) {
  const now = Date.now();
  quickMatchQueue = quickMatchQueue.filter(q => now - q.timestamp < maxAge);
}
```

**`server/index.js`** — 新增 socket 事件：

```js
socket.on('quick_match', ({ skills, name }) => {
  const result = rooms.addToQuickMatch(socket.id, skills, name || '玩家');
  if (result.matched) {
    // 配对成功！创建房间
    const opp = result.opponent;
    const roomId = rooms.createRoom(socket.id, name || '玩家', skills, 'pvp', 1);
    // ... room setup, notifying both sides ...
    socket.emit('match_found', { roomId, ... });
    io.to(opp.socketId).emit('match_found', { ... });
  } else {
    // 加入等待队列，设 5s 超时
    socket.emit('in_queue');
    setTimeout(() => {
      // 5s 后检查是否还在队列中（未被匹配走）
      if (rooms.isInQuickMatch(socket.id)) {
        rooms.removeFromQuickMatch(socket.id);
        socket.emit('quick_match_timeout');
      }
    }, 5000);
  }
});

socket.on('quick_match_cancel', () => {
  rooms.removeFromQuickMatch(socket.id);
});

// disconnect 时清理
socket.on('disconnect', () => {
  rooms.removeFromQuickMatch(socket.id);
  // ... 原有逻辑
});
```

### 6.3 前端改动

**`index.html`**

- 新增 `showQuickMatchModal()` — 显示匹配弹窗 + 放大镜动画 + 5s 倒计时
- 新增 `cancelMatchmaking()` — 取消匹配
- 监听 `match_found` — 收到后关闭弹窗，开始 PvP
- 监听 `quick_match_timeout` — 关闭弹窗，自动开始 PvE（调用 `quickBattle()`）

**匹配入口**：
- 在 `showPvPHome()` 中增加"快速匹配"按钮（现有"联机对战"弹窗顶部）
- 或者在首页增加第三个按钮

---

## 修改文件清单

| 文件 | 改动项 |
|------|--------|
| `server/client/index.html` | 1, 2, 4, 5, 6 |
| `server/game.js` | 3（删除 round 3 代码块）|
| `server/index.js` | 4（PvP 计时通知）, 6（quick_match 事件）|
| `server/rooms.js` | 6（快速匹配队列）|

---

## 执行顺序

1. **#3 PvP 技能重置** — 最简改动，1 行删除
2. **#2 误触退出** — 导航保护 + 战斗中隐藏 nav
3. **#1 按钮收窄** — CSS 调整
4. **#5+#6 匹配系统** — 放大镜动画 + 5 秒匹配（后端+前端，需联调）
5. **#4 计时系统** — 依赖 #2 的稳定性保障

每个步骤改完 → 本地验证 → 不动部署。
