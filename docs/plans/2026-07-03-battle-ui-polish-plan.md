# 对局 UI 优化 — 第2轮实施计划

## 总览

| # | 项目 | 涉及位置 | 难度 |
|---|------|----------|------|
| 1 | 技能卡品质光效 | `skillButton()` + CSS | 简单 |
| 2 | 对手技能卡缩小 | `.oppSkillRow .battleSkillCard` CSS | 简单 |
| 3 | 我方技能卡+按钮高度激进压缩 | CSS `.battleSkillCard` + `.skillBar .btn` | 简单 |
| 4 | 抽卡用完整美术卡 | `showDraw()` + CSS | 简单 |

---

## 1. 技能卡品质光效

### 现状
`skillButton()` 输出的 `.battleSkillCard` 没有品质类名，所有卡统一棕边+浅色渐变，无法区分 T0/T1/T2/T3。

### 改动
`skillButton()` 的 HTML 中加 `tier-${s.tier}`：
```
class="battleSkillCard ${sk.used?'used':''} ${locked?'locked':''} tier-${s.tier}"
```

新增 CSS（匹配 inventory `skillCard` 的配色）：
```css
.battleSkillCard.tier-T0{border-color:#ffd15c;box-shadow:0 2px 0 #8b6d3d,0 0 12px rgba(255,209,92,.35)}
.battleSkillCard.tier-T1{border-color:#c986ff;box-shadow:0 2px 0 #8b6d3d,0 0 12px rgba(201,134,255,.28)}
.battleSkillCard.tier-T2{border-color:#6fc1ff;box-shadow:0 2px 0 #8b6d3d,0 0 12px rgba(111,193,255,.22)}
.battleSkillCard.tier-T3{border-color:#9b7650}
```

效果：T0 金光、T1 紫光、T2 蓝光、T3 无光，与仓库页功能牌一致。

---

## 2. 对手技能卡缩小

### 现状
`fighterHtml()` 中用 `skillButton(sk,true)` 渲染全尺寸卡（76×68px），在对手头像区域显得过大。

### 改动
新增 CSS 缩小对手区的卡：
```css
.oppSkillRow .battleSkillCard{width:52px;height:48px}
.oppSkillRow .battleSkillArt{height:26px;font-size:14px}
.oppSkillRow .battleSkillName{font-size:7px;padding:0 1px 1px}
.oppSkillRow .battleSkillInfo{width:12px;height:12px;font-size:7px;line-height:12px}
```

---

## 3. 我方技能卡+按钮激进压缩

### 现状
- `.battleSkillCard`: 76×68px，gap 4px → 还是太高
- `.skillBar .btn#playBtn`: min-height 34px → 不够明显

### 改动
激进降低：
```css
.battleSkillCard{height:54px}
.battleSkillArt{height:28px;font-size:16px}
.battleSkillName{font-size:8px;padding:0 1px 1px}
.skillBar{gap:3px}
.skillBar .btn#playBtn{min-height:26px;padding:1px 6px;font-size:11px}
```

卡宽保持 76px 不变（太窄了图放不下）。

---

## 4. 抽卡用完整美术卡

### 现状
`showDraw()` 对功能牌走 `skillCard(sk.id,false,true,'')`（compact 模式），卡偏小，美术图可能被压缩。

### 改动
改用非 compact 模式 + 调整 drawGrid 排布：
```
skillCard(sk.id,false,false,'')
```

drawGrid CSS 从行内 style 改为固定样式，一排放 3 张，卡片宽度 100%：
```css
.drawGrid.skillDraw{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0}
```

角色抽取（非技能卡）保留现有简化卡片样式。

---

## 修改文件清单

| 文件 | 改动项 |
|------|--------|
| `server/client/index.html` | 1-4 全部 |
