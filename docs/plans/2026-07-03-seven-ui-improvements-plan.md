# 7 项 UI/UX 优化 — 实施计划

## 总览

| # | 项目 | 涉及位置 | 难度 |
|---|------|----------|------|
| 1 | 对局内容覆盖导航栏 | `renderBattle()` / `renderPvPBattle()` CSS | 简单 |
| 2 | 投降按钮替代"再看一下" | `showRoundResult()` / `showPvPResult()` + server | 中等 |
| 3 | 去掉出牌区标题 | `renderBattle()` / `renderPvPBattle()` HTML | 简单 |
| 4 | 血量 ❤ 加大 | CSS `.heart` | 简单 |
| 5 | 对局技能牌带美术图 | `skillButton()` + CSS | 中等 |
| 6 | 抽卡结果用美术图 | `showDraw()` | 简单 |
| 7 | 排行页去掉"开始对战" | `renderRank()` | 简单 |

---

## 1. 对局内容覆盖导航栏

### 现状
`renderBattle()` 和 `renderPvPBattle()` 开头 `q('#nav').style.display='none'` 直接隐藏导航。

### 改动
- **去掉** `q('#nav').style.display='none'`（两处）和 `display=''` 恢复（多处）
- **改为** 在 `renderBattle()` / `renderPvPBattle()` 中给 `#app` 加 `style="min-height:calc(100vh - 50px)"` 让内容占据导航栏位置
- 保持 setScreen 的战斗保护（已有），导航可见但不可切换

效果：导航栏保留在底部但不可点击，对局内容延伸覆盖其空间。

### 涉及改动
- `renderBattle()` (line ~887): 去掉 `q('#nav').style.display='none'`，给 `#app` 加 min-height
- `renderPvPBattle()` (line ~1085): 同上
- `finishBattle()` (line ~906): 去掉 `q('#nav').style.display=''`
- `showPvPGameOver()` (line ~1203): 去掉 `q('#nav').style.display=''`
- `setScreen()` (line ~744): 导航恢复逻辑保持不动

---

## 2. 投降按钮替代"再看一下"

### PvE（本地对战）
`showRoundResult()` (line ~902) 中：
- 第一个按钮文字从 "再看一下" → "投降"
- onclick 改为：关闭弹窗 → finishBattle()（视为失败）
- 注意：`finishBattle()` 会根据分数判定胜负，这里强制设为失败

### PvP（联机对战）
`showPvPResult()` (line ~1191) 中：
- 第一个按钮文字从 "再看一下" → "投降"
- onclick 改为：`socket.emit('pvp_surrender')` → 关闭弹窗

**server/index.js** 新增 `pvp_surrender` 事件：
```js
socket.on('pvp_surrender', () => {
  const roomId = playerRooms.get(socket.id);
  if (!roomId) return;
  const room = rooms.getRoom(roomId);
  if (!room || room.mode !== 'pvp') return;
  // 投降方判负，对手胜利
  const side = room.players[0].socketId === socket.id ? 'player' : 'opp';
  const winner = side === 'player' ? 'opp' : 'player';
  room.battle.roundWins[winner] = 3; // 强制胜利
  room.battle.phase = 'result';
  // ...结算并发送 game_over
  io.to(roomId).emit('game_over', { win: winner === 'opp' ? false : true, ... });
});
```

---

## 3. 去掉出牌区标题

### renderBattle() (line ~889)
去掉：
```html
<div class="zoneTitle">对手出牌区</div>
<div class="zoneTitle">我方出牌区</div>
```

### renderPvPBattle() (line ~1105)
同样去掉 zoneTitle。两处 zoneSpacer 也可去掉。

---

## 4. 血量 ❤ 加大

### CSS — `.heart`
当前（line ~355）：
```css
.heart{color:#d83d2c!important;filter:none!important}
```
改为：
```css
.heart{font-size:22px!important;color:#d83d2c!important;filter:none!important}
```

`.heart.empty` 同理保持统一样式。

### fighterHtml() 中的 HP 渲染
目前 `♥` 是文本字符，字号增大后自然变大。

---

## 5. 对局中技能牌带美术图

### 现状
`skillButton()` (line ~892) 渲染小按钮样式：
```html
<button class="skillBtn ..."><span class="charge">X</span><b>图标 名称</b><span>类型</span></button>
<button class="skillInfo" onclick="...">?</button>
```

### 改动
将 `skillButton()` 改为类似 `skillCard()` 的美术图卡片样式：

```js
function skillButton(sk, locked) {
  let s = SM[sk.id];
  let art = SKILL_ART[sk.id] || '';
  let artStyle = art ? `background-image:url('${art}');background-size:contain;background-position:center;background-repeat:no-repeat;` : '';
  return `<div class="battleSkillCard" onclick="${locked?'':`useSkill('player','${sk.id}')`}">
    ${art ? `<div class="battleSkillArt" style="${artStyle}"></div>` : `<div class="battleSkillIcon">${s.icon}</div>`}
    <div class="battleSkillName">${s.name}</div>
    <button class="battleSkillInfo" onclick="event.stopPropagation();showSkillDetail('${sk.id}')">?</button>
    ${sk.used?'<div class="battleSkillUsed">已用</div>':''}
  </div>`;
}
```

### 新增 CSS
```css
.battleSkillCard{position:relative;width:64px;height:88px;background:linear-gradient(180deg,#fffdf5,#f5e8cc);border:2px solid #c4a66a;border-radius:10px;overflow:hidden;cursor:pointer;flex-shrink:0}
.battleSkillArt{width:100%;height:54px}
.battleSkillIcon{text-align:center;font-size:24px;padding-top:12px}
.battleSkillName{text-align:center;font-size:10px;color:#2b1a0a;font-weight:1000;line-height:1.2}
.battleSkillInfo{position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:#c4a66a;color:#fff;font-size:11px;border:none;cursor:pointer;line-height:18px;text-align:center;padding:0}
.battleSkillUsed{position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:1000;border-radius:8px}
```

---

## 6. 抽卡结果用美术图

### 现状
`showDraw()` (line ~830) 用图标+名称展示：
```html
<div class="drawReveal ..."><div class="big">图标</div><b>名称</b><span class="small muted">稀有度</span></div>
```

### 改动
改为使用 `skillCard()` 风格的美术图卡片：

```js
function showDraw(arr, title) {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="modalBox"><div class="title" style="color:#321707">${title}</div><div class="drawGrid">${arr.map(x => {
    var sk = SKILLS.find(s => s.name === x.name);
    var art = sk ? (SKILL_ART[sk.id] || '') : '';
    var artStyle = art ? `background-image:url('${art}');background-size:contain;background-position:center;background-repeat:no-repeat;` : '';
    return '<div class="skillCard mini"><div class="skillArt" style="'+artStyle+'">'+(art?'':(sk?.icon||'🌟'))+'</div><div class="skillName">'+(sk?.name||x.name)+'</div><div class="skillTier '+x.sub+'">'+x.sub+'</div></div>';
  }).join('')}</div><div class="btn" id="okDraw">确定</div></div>`;
  document.body.appendChild(m);
  q('#okDraw').onclick = () => { m.remove(); renderShop(); };
}
```

需要复用 `skillCard` CSS（已有），新增 `.drawGrid` 使用 flex wrap。

---

## 7. 排行页去掉"开始对战"

### renderRank() (line ~835)
去掉这一行：
```js
<div class="btn" onclick="quickBattle()">开始对战</div>
```

保留排行榜和天梯信息。

---

## 修改文件清单

| 文件 | 改动项 |
|------|--------|
| `server/client/index.html` | 1-7 全部 |

## 执行顺序

1. **#7 排行按钮** — 1 行删除
2. **#3 出牌区标题** — 几行删除
3. **#4 血量加大** — 1 行 CSS
4. **#1 nav覆盖** — 隐藏改延伸
5. **#2 投降按钮** — PvE + PvP + server 事件
6. **#5 技能牌美术图** — skillButton 重写 + CSS
7. **#6 抽卡美术图** — showDraw 重写
