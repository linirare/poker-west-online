# Poker West Online - 西部扑克

联机德州扑克变种对战游戏，支持 PvE（人机）和 PvP（玩家对战）。

## 在线地址

https://poker.lirare.xyz

## 项目结构

```
├── client/
│   └── index.html          # 前端界面（单文件，全部在浏览器端）
├── server/
│   ├── index.js            # 服务端入口，WebSocket 事件处理
│   ├── game.js             # 游戏引擎：牌型评估、技能系统、AI
│   └── rooms.js            # 房间管理
├── .github/workflows/
│   └── deploy.yml          # GitHub Actions 自动部署
└── package.json
```

## 本地开发

```bash
# 安装依赖
cd server && npm install

# 启动服务（默认端口 3000）
node index.js

# 浏览器打开
http://localhost:3000
```

## 部署

每次 push 到 `master` 分支自动触发部署到 Railway。也可以手动部署：

```bash
# 需要本地已登录 Railway
cd poker-online && railway up
```

GitHub 仓库：https://github.com/linirare/poker-west-online
