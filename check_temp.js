
const LS='wild_poker_h5_v1';
const SUITS=['♠','♥','♦','♣'];let uid=1;let battle=null;
const PLAY_COUNTS=[3,3,3,4,5], HAND_LIMIT=7;
const TIERS=['T0','T1','T2','T3'];
const SKILLS=[
{id:'fivejoker',tier:'T0',icon:'🃏',name:'5-Joker',type:'策略',effect:'前4回合抽1张；第5回合抽Joker百搭'},
{id:'magician',tier:'T0',icon:'🎩',name:'魔术师',type:'复制',effect:'复制一张自己手牌'},
{id:'thief',tier:'T0',icon:'🕵️',name:'神偷',type:'偷取',effect:'偷一张对方手牌'},
{id:'fate',tier:'T0',icon:'✨',name:'命运一击',type:'转化',effect:'弃一张牌，获得同花色A'},
{id:'hacker',tier:'T0',icon:'💻',name:'黑客',type:'复制',effect:'复制对手一张手牌'},
{id:'lucky',tier:'T1',icon:'🍀',name:'幸运日',type:'增幅',effect:'本回合若打出顺子，视为同花顺'},
{id:'destroyer',tier:'T1',icon:'🧩',name:'破坏专家',type:'干扰',effect:'随机弃掉对手2张手牌'},
{id:'glove',tier:'T1',icon:'🧤',name:'白手套',type:'复制',effect:'复制一张公共牌到手牌'},
{id:'burst',tier:'T1',icon:'⏫',name:'提前爆发',type:'额外',effect:'本回合可以多打1张牌'},
{id:'god',tier:'T1',icon:'🎲',name:'赌神',type:'抽牌',effect:'随机获得A/K/Q一张'},
{id:'plusminus',tier:'T2',icon:'➕',name:'加一减一',type:'调整',effect:'选择一张手牌点数+1或-1'},
{id:'intel',tier:'T2',icon:'📋',name:'情报员',type:'选抽',effect:'额外抽2张，选1张加入手牌'},
{id:'inspect',tier:'T2',icon:'🔍',name:'我要验牌',type:'信息',effect:'查看对方当前全部手牌'},
{id:'recycle',tier:'T2',icon:'♻️',name:'回收',type:'回收',effect:'从弃牌记录取回1张曾打出的牌'},
{id:'lock',tier:'T2',icon:'🔒',name:'封锁',type:'干扰',effect:'对手本回合少打一张牌'},
{id:'shuffle',tier:'T3',icon:'🔀',name:'洗牌师',type:'置换',effect:'弃1张手牌，抽2张新牌'},
{id:'rogue',tier:'T3',icon:'🔁',name:'交换师',type:'交换',effect:'选1张手牌与对方随机1张交换'},
{id:'gambler',tier:'T2',icon:'🎲',name:'幸运赌徒',type:'随机',effect:'60%额外抽3张，否则弃1张手牌'},
{id:'flushbeliever',tier:'T2',icon:'♠️',name:'同花信徒',type:'预支',effect:'本回合若打出同花组合，下回合额外抽2张'},
{id:'delay',tier:'T2',icon:'⏳',name:'拖延',type:'干扰',effect:'令对手下回合少抽1张牌'},
{id:'bomb',tier:'T2',icon:'🌀',name:'扰乱',type:'干扰',effect:'随机弃掉对方1张手牌'},
{id:'charge',tier:'T3',icon:'⚡',name:'蓄力',type:'策略',effect:'本回合少打一张，下回合多打一张'}
];
const SM=Object.fromEntries(SKILLS.map(s=>[s.id,s]));
const SKILL_ART={fivejoker:'assets/skill_fivejoker_cutout.png',magician:'assets/skill_magician_cutout.png',thief:'assets/skill_thief_cutout.png',fate:'assets/skill_fate_cutout.png',hacker:'assets/skill_hacker_cutout.png',glove:'assets/skill_glove_cutout.png',lucky:'assets/skill_lucky_cutout.png',god:'assets/skill_god_cutout.png',destroyer:'assets/skill_destroyer_cutout.png',burst:'assets/skill_burst_cutout.png'};
function preloadAssets(){const urls=[];for(const k in SKILL_ART)urls.push(SKILL_ART[k]);for(const c of CHARS){urls.push(c.art,c.avatar,c.avatar56,c.avatar44)}urls.push('assets/logo.png');urls.forEach(u=>{const i=new Image();i.src=u})}
const CHAR_ART_ID={cowboy:'boy',sheriff:'redgirl',lily:'blonde',miner:'strongman'};
const CHARS=[
{id:'cowboy',icon:'🌟',name:'牛仔',rarity:'普通',effect:'金币收益 +5%起，每级额外+2%',art:'assets/hero_boy.png',avatar:'assets/avatar_boy_64.png',avatar56:'assets/avatar_boy_56.png',avatar44:'assets/avatar_boy_44.png'},
{id:'sheriff',icon:'🛡️',name:'守护队长',rarity:'稀有',effect:'胜利额外钻石 +2💎起，每级+1💎',art:'assets/hero_redgirl.png',avatar:'assets/avatar_redgirl_64.png',avatar56:'assets/avatar_redgirl_56.png',avatar44:'assets/avatar_redgirl_44.png'},
{id:'lily',icon:'🎀',name:'幸运莉莉',rarity:'史诗',effect:'宝箱进度加速，每级+1进度',art:'assets/hero_blonde.png',avatar:'assets/avatar_blonde_64.png',avatar56:'assets/avatar_blonde_56.png',avatar44:'assets/avatar_blonde_44.png'},
{id:'miner',icon:'💎',name:'宝石收藏家',rarity:'传说',effect:'抽卡折扣 5%起，每级折扣+3%',art:'assets/hero_strongman.png',avatar:'assets/avatar_strongman_64.png',avatar56:'assets/avatar_strongman_56.png',avatar44:'assets/avatar_strongman_44.png'}
];
const CM=Object.fromEntries(CHARS.map(c=>[c.id,c]));
const CHARS_BY_NAME=Object.fromEntries(CHARS.map(c=>[c.name,c]));
const RANK_CONFIG=[
{name:'新手局',icon:'🌱',stars:0,desc:'前3场保护，不掉星'},
{name:'青铜',icon:'🥉',stars:3,desc:'赢+1星，输不掉星'},
{name:'白银',icon:'🥈',stars:3,desc:'赢+1星，输-1星'},
{name:'黄金',icon:'🥇',stars:4,desc:'赢+1星，输-1星'},
{name:'铂金',icon:'💎',stars:4,desc:'赢+1星，输-1星'},
{name:'大师',icon:'👑',stars:0,desc:'积分制，胜+25 / 负-15'},
{name:'传奇',icon:'🌟',stars:0,desc:'1500分以上进入传奇'}
];
let state={};
let currentUser = null;
const TOKEN_KEY = 'poker_token';

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers['Authorization'] = 'Bearer ' + token;
  try {
    const res = await fetch('/api/auth' + path, { ...opts, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '请求失败');
    return data;
  } catch(e) {
    if (e.message !== 'Failed to fetch') throw e;
    return null;
  }
}

function showAuthModal() {
  const exists = q('#authModal'); if (exists) return;
  const m = document.createElement('div'); m.className = 'modal'; m.id = 'authModal';
  m.innerHTML =
'<div class="modalBox" style="text-align:center;max-width:360px">' +
  '<img src="assets/logo.png" style="height:40px;margin-bottom:12px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))" alt="代号 001">' +
  '<div style="display:flex;gap:4px;margin-bottom:12px">' +
    '<div class="btn" id="authTabLogin" style="flex:1;min-height:36px;padding:6px">登录</div>' +
    '<div class="btn dark" id="authTabReg" style="flex:1;min-height:36px;padding:6px">注册</div>' +
  '</div>' +
  '<div id="authLoginForm">' +
    '<input id="loginUser" placeholder="用户名" style="width:100%;padding:10px;margin-bottom:8px;border:2px solid #8b7550;border-radius:12px;font-size:14px;outline:none;background:#f5e8d0;color:#2a1607;text-align:center;box-sizing:border-box">' +
    '<input id="loginPass" type="password" placeholder="密码" style="width:100%;padding:10px;margin-bottom:10px;border:2px solid #8b7550;border-radius:12px;font-size:14px;outline:none;background:#f5e8d0;color:#2a1607;text-align:center;box-sizing:border-box">' +
    '<div class="btn" id="loginBtn" style="margin-bottom:6px">登录</div>' +
  '</div>' +
  '<div id="authRegForm" class="hidden">' +
    '<input id="regUser" placeholder="用户名（2-16字）" style="width:100%;padding:10px;margin-bottom:8px;border:2px solid #8b7550;border-radius:12px;font-size:14px;outline:none;background:#f5e8d0;color:#2a1607;text-align:center;box-sizing:border-box">' +
    '<input id="regPass" type="password" placeholder="密码（至少4位）" style="width:100%;padding:10px;margin-bottom:10px;border:2px solid #8b7550;border-radius:12px;font-size:14px;outline:none;background:#f5e8d0;color:#2a1607;text-align:center;box-sizing:border-box">' +
    '<div class="btn" id="regBtn" style="margin-bottom:6px">注册</div>' +
  '</div>' +
  '<div class="small muted">登录后数据自动云端保存</div>' +
'</div>';
  document.body.appendChild(m);
  q('#authTabLogin').onclick = () => { q('#authLoginForm').classList.remove('hidden'); q('#authRegForm').classList.add('hidden'); q('#authTabLogin').className = 'btn'; q('#authTabReg').className = 'btn dark'; };
  q('#authTabReg').onclick = () => { q('#authRegForm').classList.remove('hidden'); q('#authLoginForm').classList.add('hidden'); q('#authTabReg').className = 'btn'; q('#authTabLogin').className = 'btn dark'; };
  q('#loginBtn').onclick = handleLogin;
  q('#regBtn').onclick = handleRegister;
  q('#loginPass').onkeydown = (e) => { if (e.key === 'Enter') handleLogin(); };
  q('#regPass').onkeydown = (e) => { if (e.key === 'Enter') handleRegister(); };
}

function hideAuthModal() { const m = q('#authModal'); if (m) m.remove(); }

async function handleLogin() {
  const u = q('#loginUser').value.trim(), p = q('#loginPass').value;
  if (!u || !p) return toast('请填写用户名和密码');
  q('#loginBtn').textContent = '登录中...';
  try {
    const d = await api('/login', { method: 'POST', body: JSON.stringify({ username: u, password: p }) });
    if (!d) return toast('无法连接服务器');
    localStorage.setItem(TOKEN_KEY, d.token);
    currentUser = d.user;
    await afterLogin();
  } catch(e) { toast(e.message); q('#loginBtn').textContent = '登录'; }
}

async function handleRegister() {
  const u = q('#regUser').value.trim(), p = q('#regPass').value;
  if (!u || !p) return toast('请填写用户名和密码');
  if (p.length < 4) return toast('密码至少4位');
  q('#regBtn').textContent = '注册中...';
  try {
    const d = await api('/register', { method: 'POST', body: JSON.stringify({ username: u, password: p }) });
    if (!d) return toast('无法连接服务器');
    localStorage.setItem(TOKEN_KEY, d.token);
    currentUser = d.user;
    state = initState(); save();
    await afterLogin();
    startTutorial();
  } catch(e) { toast(e.message); q('#regBtn').textContent = '注册'; }
}

function showChangeName() {
  if (!currentUser) return toast('未登录');
  const m = document.createElement('div'); m.className = 'modal'; m.id = 'nameModal';
  m.innerHTML = '<div class="modalBox" style="text-align:center;max-width:320px">' +
    '<div class="title" style="color:#321707">✏️ 修改游戏名</div>' +
    '<p class="small muted" style="margin:6px 0">消耗 100💎，当前剩余 '+state.gems+'💎</p>' +
    '<input id="nameInput" class="chatInput" style="width:100%;margin:8px 0" value="'+(state.displayName||currentUser.username||'')+'" placeholder="输入新游戏名" maxlength="12">' +
    '<div class="grid2"><div class="btn" id="nameConfirmBtn">确认修改</div><div class="btn dark" onclick="this.closest(\'.modal\').remove()">取消</div></div>' +
    '</div>';
  document.body.appendChild(m);
  q('#nameConfirmBtn').onclick = function() {
    const v = q('#nameInput').value.trim();
    if (!v || v.length < 1 || v.length > 12) return toast('游戏名 1-12 个字符');
    if (state.gems < 100) return toast('钻石不足');
    state.gems -= 100;
    state.displayName = v;
    save();
    m.remove();
    setScreen(currentScreen);
    toast('✅ 游戏名已修改');
  };
}

function showUserMenu() {
  if (!currentUser) return toast('未登录');
  const c=CM[state.activeChar];const icon=c?c.icon:'🌟';const charName=c?c.name:'牛仔';
  const dn=state.displayName||currentUser.username;const uid=currentUser.uid||'--------';
  const m = document.createElement('div'); m.className = 'modal'; m.id = 'userMenuModal';
  m.innerHTML = '<div class="modalBox" style="text-align:center;max-width:300px">' +
    '<div class="userAvatar" style="margin:0 auto 8px;width:56px;height:56px;font-size:32px;cursor:default">'+icon+'</div>' +
    '<div style="font-weight:1000;font-size:16px;margin-bottom:2px">' + dn + '</div>' +
    '<div class="small muted" style="margin-bottom:2px">' + charName + '</div>' +
    '<div class="small muted" style="margin-bottom:10px">UID #' + uid + ' · ' + (currentUser.is_admin ? '🛠️ 管理员' : '玩家') + '</div>' +
    '<div class="btn" onclick="this.closest(\'.modal\').remove();showChangeName()" style="margin-bottom:6px">✏️ 修改游戏名</div>' +
    '<div class="btn red" id="logoutConfirmBtn">退出登录</div>' +
    '<div class="small muted" style="margin-top:8px;cursor:pointer" onclick="this.closest(\'.modal\').remove()">关闭</div>' +
    '</div>';
  document.body.appendChild(m);
  q('#logoutConfirmBtn').onclick = function() {
    localStorage.removeItem(TOKEN_KEY);
    currentUser = null;
    state = initState(); save();
    m.remove();
    showAuthModal();
  };
}

function handleLogout() {
  localStorage.removeItem(TOKEN_KEY);
  currentUser = null;
  state = initState(); save();
  showAuthModal();
}

async function afterLogin() {
  try {
    const d = await api('/load');
    const gd = d.game_data || {};
    if (Object.keys(gd).length > 0) {
      state = { ...initState(), ...gd };
    } else {
      const localData = loadLocalData();
      if (localData) { state = localData; try { await api('/save', { method: 'PUT', body: JSON.stringify({ game_data: state, total_games: state.total || 0, wins: state.wins || 0 }) }); } catch(e) {} }
      else { state = initState(); }
    }
    if (d.total_games !== undefined) state.total = d.total_games;
    if (d.wins !== undefined) state.wins = d.wins;
    if (d.user) currentUser = d.user;
  } catch(e) { state = initState(); }
  checkDailyReset(); ensureDefaults(); save(); hideAuthModal(); render('home'); pvpConnect();
}

function ensureDefaults() {
  state.chars.cowboy = { owned: true, lv: 1, shards: 0, ...(state.chars?.cowboy || {}) };
  if (state.aiTier === undefined) state.aiTier = 0;
  if (state.aiStreak === undefined) state.aiStreak = 0;
  if (!state.handCounts) state.handCounts = [0,0,0,0,0,0,0,0,0,0];
  if (state.rankIdx === undefined) state.rankIdx = 0;
  if (state.stars === undefined) state.stars = 0;
  if (state.points === undefined) state.points = 1000;
  if (state.newbieGames === undefined) state.newbieGames = 0;
  if (state.streak === undefined) state.streak = 0;
  if (state.maxStreak === undefined) state.maxStreak = state.streak || 0;
  if (state.displayName === undefined) state.displayName = '';
}

let _saveTimer = null;
function serverSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    try {
      await api('/save', { method: 'PUT', body: JSON.stringify({ game_data: state, total_games: state.total || 0, wins: state.wins || 0 }) });
    } catch(e) { /* silent */ }
  }, 2000);
}

function q(s){return document.querySelector(s)}function qa(s){return [...document.querySelectorAll(s)]}
function initState(){return{coins:888,gems:88,rank:820,rankIdx:0,stars:0,points:1000,newbieGames:0,total:0,wins:0,streak:0,maxStreak:0,chest:0,aiTier:0,aiStreak:0,handCounts:[0,0,0,0,0,0,0,0,0,0],activeChar:'cowboy',equipped:[],displayName:'',skills:Object.fromEntries(SKILLS.map(s=>[s.id,{copies:3,uses:0}])),chars:{cowboy:{owned:true,lv:1,shards:0},sheriff:{owned:true,lv:1,shards:0},lily:{owned:false,lv:1,shards:0},miner:{owned:false,lv:1,shards:0}},tasks:{play:0,useSkill:0,winRound:0,straight:0},taskDate:'',history:[]}}
function loadLocalData(){try{const raw=localStorage.getItem(LS);if(raw){const d=JSON.parse(raw);if(d&&typeof d==='object'&&'coins' in d)return d}}catch(e){}return null}
function load(){try{state=JSON.parse(localStorage.getItem('poker_legacy_debug'))||initState()}catch(e){state=initState()}ensureDefaults();save()}
function save(){localStorage.setItem(LS,JSON.stringify(state));serverSave()}
function rankCfg(){return RANK_CONFIG[Math.min(state.rankIdx||0,RANK_CONFIG.length-1)]}
function rankProgressText(){const c=rankCfg();if((state.rankIdx||0)===0)return `${state.newbieGames||0}/3 场保护期`;if((state.rankIdx||0)>=5)return `${state.points||1000} 分`;return `${state.stars||0}/${c.stars} 星`}
let currentScreen='home';function setScreen(s){if(battle&&battle.phase!=='result')return toast('对局中无法切换');if(pvp&&pvp.phase==='battle')return toast('对局中无法切换');q('#nav').style.display='';currentScreen=s;if(pvp&&(pvp.phase==='lobby'||pvp.phase==='battle')){socket.emit('leave_room');pvp=null}render(s)}
function render(screen='home'){renderNav(screen);if(screen==='home'){renderHome();fetchMail();restoreChat()}if(screen==='deck')renderDeck();if(screen==='chars')renderChars();if(screen==='shop')renderShop();if(screen==='rank')renderRank();if(screen==='teach')renderTeach()}
function updateTopbar(){const pills=q('#app')?.querySelectorAll?.('.pill');if(pills)pills.forEach(p=>{const t=p.textContent;if(t.startsWith('🪙'))p.innerHTML='<span class="ci">🪙</span> '+state.coins;if(t.startsWith('💎'))p.textContent='💎 '+state.gems})}
function renderNav(active){const items=[['home','nav_home_cutout.png','主页'],['deck','nav_deck_cutout.png','功能牌'],['chars','nav_chars_cutout.png','角色'],['shop','nav_shop_cutout.png','抽卡'],['rank','nav_rank_cutout.png','排行']];q('#nav').innerHTML=items.map(i=>`<button class="${active===i[0]?'active':''}" onclick="setScreen('${i[0]}')"><img class="navIcon" src="assets/${i[1]}" alt=""><span class="navLabel">${i[2]}</span></button>`).join('')}
function userAvatarHtml(){const c=CM[state.activeChar];const av=c?.avatar44||'assets/avatar_boy_44.png';const dn=state.displayName||currentUser?.username||'旅行者';const uid=currentUser?.uid||'--------';return '<div class="userHead" onclick="showUserMenu()"><div class="userAvatar" style="background-image:url(\''+av+'\');background-size:cover;background-position:center"></div><div><div class="userName">'+dn+'</div><div class="userId">#'+uid+'</div></div></div>'}
function topbar(title,sub=''){if(!currentUser)return `<div class="topbar"><div><div class="title">${title}</div>${sub?`<div class="sub">${sub}</div>`:''}</div><div class="res"><span class="pill"><span class="ci">🪙</span> ${state.coins}</span><span class="pill">💎 ${state.gems}</span></div></div>`;return `<div class="topbar">${userAvatarHtml()}<div class="res"><span class="pill"><span class="ci">🪙</span> ${state.coins}</span><span class="pill">💎 ${state.gems}</span></div></div>`}
function renderHome(){const rc=rankCfg();const rankText=rankProgressText();const charArt=CM[state.activeChar]?.art||'assets/char_boy.png';q('#app').innerHTML=`${topbar('代号 001')}
<div class="homeLayout">
  <div class="heroArt" style="background-image:linear-gradient(transparent 55%,rgba(0,0,0,0.2)),url('${charArt}')">
    <div class="heroContent">
      <img class="heroLogoImg" src="assets/logo.png" alt="代号 001">
      <div class="heroRankBox">
        <div class="heroRankTop">
          <div class="heroRankTitle">🏆 当前段位</div>
          <div class="heroRankValue">${rc.icon} ${rc.name} · ${rankText}</div>
        </div>
        <div class="heroRankBar"><i style="width:${(state.rankIdx||0)===0?Math.min(100,(state.newbieGames||0)/3*100):(state.rankIdx||0)<5?Math.min(100,(state.stars||0)/rc.stars*100):Math.min(100,(state.points||1000)/1500*100)}%"></i></div>
        <div class="heroRankMeta">
          <span>⚔️ ${state.total||0} 场</span>
          <span>🔥 ${state.streak||0} 连胜</span>
          <span>🎁 ${state.chest||0}/10</span>
        </div>
      </div>
    </div>
  </div>
  <div class="mainBtns">
    <div class="btn homeMainBtn" onclick="quickBattle()">🃏 开始对战</div>
    <div class="btn homeMainBtn" onclick="showPvPHome()">🌐 联机对战</div>
  </div>
  <div class="homeSkills" onclick="setScreen('deck')">
    ${function(){var e=state.equipped.filter(function(id){return state.skills[id]?.copies>0});if(!e.length)return '<div class="noEquippedSkill" onclick="event.stopPropagation();setScreen(\'deck\')">无上阵卡牌</div>';return e.map(function(id){return skillCard(id,true,true,'goDeck')}).join('')}()}
  </div>
</div>
<div class="chatBox">
  <div class="chatHeader" onclick="toggleChat()">
    <span>💬 聊天</span>
    <span class="chatBadge hidden" id="chatBadge">0</span>
    <span id="onlineCount" style="margin-left:auto;font-size:10px;color:#8daa7a">🟢 0</span>
    <span class="chatToggle" id="chatToggle">▸</span>
  </div>
  <div class="chatBody collapsed" id="chatBody">
    <div class="chatMsgs" id="chatMsgs">
      <div class="chatMsg" style="color:#d0b890;font-size:13px;padding:6px 0;border:0">连接后可聊天...</div>
    </div>
    <div class="chatInputRow">
      <input class="chatInput" id="chatInput" placeholder="说点什么..." maxlength="200" onkeydown="if(event.key==='Enter')sendChat()">
      <div class="btn chatSend" onclick="sendChat()">发送</div>
    </div>
  </div>
</div>
<div class="homeNavFab" style="top:calc(70px + var(--safeT,0px))" onclick="startTutorial()">📖</div>
<div class="homeNavFab" style="top:calc(126px + var(--safeT,0px))" onclick="setScreen('teach')">🏆</div>
<div class="homeNavFab" style="top:calc(182px + var(--safeT,0px))" onclick="showAchievements()">📊</div>
<div class="dailyFab" onclick="showDailyProgress()">📋</div>
	<div class="mailFab" id="mailFab" onclick="showMailModal()">✉️<div class="mailBadge hidden" id="mailBadge">0</div></div>`}
var TASK_REWARDS=[['play',15],['useSkill',15],['winRound',15],['straight',25]]
function taskLine(t,v,max,i){const done=v>=max;return `<div class="shopItem"><div>${done?'✅':'⬜'} ${t}<br><span class="small muted">进度 ${Math.min(v,max)}/${max} · 奖励 ${TASK_REWARDS[i][1]}💎</span></div><span class="pill" style="${done?'background:#c9822d;color:#fff':''}" onclick="${done?'claimTask('+i+')':''}">${done?'可领奖':'进行中'}</span></div>`}
function ownedSkills(){return Object.keys(state.skills).filter(id=>(state.skills[id].copies||0)>0).sort((a,b)=>TIERS.indexOf(SM[a].tier)-TIERS.indexOf(SM[b].tier)||SM[a].name.localeCompare(SM[b].name,'zh'))}
function renderDeck(){const owned=ownedSkills();const equipped=state.equipped.filter(id=>(state.skills[id]?.copies||0)>0);state.equipped=equipped;save();let html=`${topbar('功能牌仓库','功能牌为消耗品：带入一局就消耗1张，不走升级')}
<div class="panel"><b>当前带入：${equipped.length}/2</b><div class="hr"></div><div class="grid3">${equipped.map(id=>skillCard(id,true,true,'toggleEquip')).join('')||'<div class="paper">暂无带入牌</div>'}</div></div>`;
for(const tier of TIERS){const list=owned.filter(id=>SM[id].tier===tier);if(!list.length)continue;html+=`<div class="tierHead ${tier}">${tier}<span>${tier==='T0'?'最强级别':tier==='T1'?'高级':tier==='T2'?'中级':'普通'}</span></div><div class="grid3">${list.map(id=>skillCard(id,equipped.includes(id),true,'toggleEquip')).join('')}</div>`}
html+=`<div class="paper small">未抽到或库存为0的功能牌不展示。去抽卡页可获得更多库存。</div>`;q('#app').innerHTML=html}
function skillCard(id,equipped,compact,toggleFn){var s=SM[id],n=state.skills[id]?.copies||0;var fn=toggleFn||'toggleEquip';var hasArt=!!SKILL_ART[id];var cls='skillCard artFull tier-'+s.tier+(hasArt?' hasArt':' noArt')+(equipped?' equipped':'')+(compact?' compact':'')+(s.name.length>4?' longName':'');var mark=s.name.replace('5-','').slice(0,1);var art=hasArt?'<img class="skillCardFullArt" src="'+SKILL_ART[id]+'" alt="'+s.name+'">':'<div class="skillCardPlaceholder" data-mark="'+mark+'"></div>';return '<div class="'+cls+'" onclick="'+fn+'(\''+id+'\')"><div class="skillCardArtPanel">'+art+'</div><span class="countBadge">×'+n+'</span><button class="skillInfoBtn" onclick="event.stopPropagation();showSkillDetail(\''+id+'\',this)">?</button><div class="skillCardName"><span>'+s.name+'</span></div></div>'}

function claimTask(i){var k=['play','useSkill','winRound','straight'][i],m=[3,5,6,1][i];if(state.tasks[k]<m)return;if(state.tasks[k]===-1)return toast('\u5DF2\u9886\u53D6');state.tasks[k]=-1;state.gems+=TASK_REWARDS[i][1];save();toast('+'+TASK_REWARDS[i][1]+'\u{1F48E}');renderHome()}
function toggleEquip(id){if(!state.skills[id]||state.skills[id].copies<=0)return;let e=state.equipped||[];if(e.includes(id))e=e.filter(x=>x!==id);else{if(e.length>=2)return toast('每局只能带入2张功能牌');e.push(id)}state.equipped=e;save();renderDeck()}
function goDeck(){setScreen('deck')}
function toggleEquipBattle(id){if(!state.skills[id]||state.skills[id].copies<=0)return;let e=state.equipped||[];if(e.includes(id))e=e.filter(x=>x!==id);else{if(e.length>=2)return toast('每局只能带入2张功能牌');e.push(id)}state.equipped=e;save();renderBattleSelect()}
function renderBattleSelect(){const e=(state.equipped||[]).filter(id=>state.skills[id]?.copies>0);const all=ownedSkills().filter(id=>!e.includes(id));q('#app').innerHTML=`${topbar(state.mode==='ranked'?'天梯准备':'对战准备','直接在此选择2张功能牌带入对局')}
<div class="btn ${e.length===2?'':'disabled'}" onclick="startBattle()">${e.length===2?'🃏 开始对战':'还需选择'+(2-e.length)+'张功能牌'}</div>
<div class="panel"><b>已选功能牌（点击取消）</b><div class="hr"></div><div class="grid3">${e.length?e.map(id=>skillCard(id,true,true,'toggleEquipBattle')).join(''):'<div class="paper" style="text-align:center;color:#8b7550">请选择2张功能牌</div>'}</div></div>
${all.length?`<div class="panel"><b>可用功能牌（点击选择）</b><div class="hr"></div>${TIERS.map(function(t){var tierSkills=all.filter(function(id){return SM[id].tier===t});if(!tierSkills.length)return '';return '<div class="tierHead '+t+'">'+t+'<span>'+(t==='T0'?'最强':t==='T1'?'高级':t==='T2'?'中级':'普通')+'</span></div><div class="grid3">'+tierSkills.map(function(id){return skillCard(id,false,true,'toggleEquipBattle')}).join('')+'</div>'}).join('')}</div></div>`:''}
<div class="panel"><b>AI 对手</b><div class="hr"></div><div class="small muted" style="text-align:center;padding:8px">AI 强度随段位和连胜自动调整</div></div>`;qa('.skillCard').forEach(function(el){el.onclick=function(){var id=el.getAttribute('onclick');if(id){var m=id.match(/'(.*?)'/);if(m)toggleEquipBattle(m[1])}}})}
function renderChars(){let html=`${topbar('角色','角色正常升级，主要影响局外收益和轻量对局保护')}`;for(const c of CHARS){const cs=state.chars[c.id]||{owned:false,lv:1,shards:0};if(!cs.owned&&cs.shards<=0)continue;const need=charNeed(cs.lv),goldNeed=need*80;html+=`<div class="charCard"><div style="display:flex;gap:10px;align-items:center"><div class="avatar" style="background-image:url('${c.avatar}');background-size:cover;background-position:center;width:64px;height:64px;font-size:0;border-radius:50%;overflow:hidden">${c.icon}</div><div style="flex:1"><div class="skillName">${c.name} <span class="pill">Lv.${cs.lv}</span></div><div class="small muted">${c.rarity}</div><div class="skillEffect">${c.effect}</div><div class="levelBar"><i style="width:${Math.min(100,cs.shards/need*100)}%"></i></div><div class="small muted">碎片 ${cs.shards}/${need} · <span class="ci">🪙</span>${goldNeed}</div></div></div><div class="grid2" style="margin-top:8px"><div class="btn dark" onclick="activeChar('${c.id}')">${state.activeChar===c.id?'已上阵':'上阵'}</div><div class="btn ${cs.shards>=need&&state.coins>=goldNeed?'':'disabled'}" onclick="upChar('${c.id}')">升级 <span class="ci">🪙</span>${goldNeed}</div></div></div>`}q('#app').innerHTML=html}
function charNeed(lv){return 8+lv*4}function charLv(id){return state.chars[id]?.lv||1}function activeChar(id){if(!state.chars[id]?.owned)return;state.activeChar=id;save();renderChars()}function upChar(id){const c=state.chars[id];const need=charNeed(c.lv);if(c.shards<need||state.coins<need*80)return toast('碎片或金币不足');c.shards-=need;state.coins-=need*80;c.lv++;save();renderChars();toast('角色升级成功')}
function renderShop(){q('#app').innerHTML=`${topbar('抽卡商店','获得功能牌库存与角色碎片')}
<div class="panel"><b>功能牌卡包</b><div class="hr"></div><div class="shopItem"><div>单抽功能牌<br><span class="small muted">随机获得1张功能牌库存</span></div><div class="btn" onclick="drawSkills(1)">💎100</div></div><div class="shopItem"><div>十连功能牌<br><span class="small muted">至少1张T1以上</span></div><div class="btn" onclick="drawSkills(10)">💎1000</div></div><div class="shopItem"><div><span class="small muted">概率：T0 6% / T1 17% / T2 32% / T3 45%</span></div><div class="btn dark" onclick="showSkillPool()">📋 奖池预览</div></div></div>
<div class="panel"><b>角色招募</b><div class="hr"></div><div class="shopItem"><div>单抽角色<br><span class="small muted">随机获得角色或碎片</span></div><div class="btn" onclick="drawChars(1)">💎100</div></div><div class="shopItem"><div>十连角色<br><span class="small muted">额外碎片奖励</span></div><div class="btn" onclick="drawChars(10)">💎1000</div></div></div>
`}

function showSkillPool(){const tiers=['T0','T1','T2','T3'];const tierNames={'T0':'最强 6%','T1':'高级 17%','T2':'中级 32%','T3':'普通 45%'};const tierColors={'T0':'#ff6b35','T1':'#9b59b6','T2':'#2e86de','T3':'#7f8c8d'};let html='<div class="modalBox" style="max-width:400px"><div class="title" style="color:#321707">📋 功能牌奖池</div><div style="max-height:65vh;overflow-y:auto">';for(const t of tiers){const pool=SKILLS.filter(s=>s.tier===t);html+=`<div style="margin:8px 0"><div style="font-weight:1000;color:${tierColors[t]};margin-bottom:4px">${t} — ${tierNames[t]}</div>${pool.map(s=>`<div class="shopItem" style="cursor:pointer" onclick="showSkillDetail('${s.id}')"><span>${s.icon} ${s.name}</span><span class="small muted">${s.effect}</span></div>`).join('')}</div>`}html+=`<div style="margin:8px 0;padding:8px;background:rgba(0,0,0,.05);border-radius:8px"><b>角色招募</b><div class="small muted" style="margin-top:4px">4个角色等概率抽取<br>已拥有角色→获得+3碎片<br>新角色→直接解锁</div><div style="margin-top:4px">${CHARS.map(c=>`<span style="display:inline-block;margin:2px 4px">${c.icon} ${c.name}</span>`).join('')}</div></div>`;html+='</div><div class="btn" id="closePool">关闭</div></div>';const m=document.createElement('div');m.className='modal';m.innerHTML=html;document.body.appendChild(m);q('#closePool').onclick=()=>{m.remove()};m.onclick=function(e){if(e.target===m)m.remove()}}
function drawSkills(n){var disc=state.activeChar==='miner'?Math.min(0.3,0.05+(charLv(state.activeChar)-1)*0.03):0;const cost=Math.floor((n===10?1000:100)*(1-disc));if(state.gems<cost)return toast('钻石不足');state.gems-=cost;let results=[];for(let i=0;i<n;i++){let pool=SKILLS;let r=Math.random();let tier=r<.06?'T0':r<.23?'T1':r<.55?'T2':'T3';let p=pool.filter(s=>s.tier===tier);let s=p[Math.floor(Math.random()*p.length)];state.skills[s.id]??={copies:0,uses:0};state.skills[s.id].copies++;results.push({icon:s.icon,name:s.name,sub:s.tier})}results.sort((a,b)=>{var o=['T0','T1','T2','T3'];return o.indexOf(a.sub)-o.indexOf(b.sub)});save();showDraw(results,'功能牌抽取')}
function drawChars(n){var disc=state.activeChar==='miner'?Math.min(0.3,0.05+(charLv(state.activeChar)-1)*0.03):0;const cost=Math.floor((n===10?1000:100)*(1-disc));if(state.gems<cost)return toast('钻石不足');state.gems-=cost;let results=[];for(let i=0;i<n;i++){let c=CHARS[Math.floor(Math.random()*CHARS.length)],cs=state.chars[c.id]??{owned:false,lv:1,shards:0};if(cs.owned){cs.shards+=3;results.push({icon:c.icon,name:c.name,sub:'重复 +3碎片'})}else{cs.owned=true;results.push({icon:c.icon,name:c.name,sub:'新角色'})}state.chars[c.id]=cs}save();showDraw(results,'角色招募')}
function showDraw(arr,title){const m=document.createElement('div');m.className='modal';m.innerHTML=`<div class="modalBox"><div class="title" style="color:#321707">${title}</div><div class="drawGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:6px 0">${arr.map(x=>{var sk=SKILLS.find(s=>s.name===x.name);if(sk)return skillCard(sk.id,false,false,'');var mark=x.name.replace('5-','').slice(0,1);return '<div class="skillCard artFull noArt tier-T2" style="width:80px;min-height:105px"><div class="skillCardArtPanel"><div class="skillCardPlaceholder" data-mark="'+mark+'"></div></div><div class="skillCardName"><span>'+x.name+'</span></div><div class="small muted" style="text-align:center;font-size:9px">'+x.sub+'</div></div>'}).join('')}</div><div class="btn" id="okDraw" style="margin-top:12px">确定</div></div>`;document.body.appendChild(m);q('#okDraw').onclick=()=>{m.remove();renderShop()}}
function updateLadder(won){state.total++;if(won){state.wins++;state.streak++;state.maxStreak=Math.max(state.maxStreak||0,state.streak||0)}else state.streak=0;if((state.rankIdx||0)===0){state.newbieGames=(state.newbieGames||0)+1;if(state.newbieGames>=3){state.rankIdx=1;state.stars=0}return won?'新手保护 +1场':'新手保护，不掉星'}const cfg=rankCfg();if((state.rankIdx||0)<=4){if(won){state.stars=(state.stars||0)+1;if(state.streak>=3&&state.rankIdx<4)state.stars++;if(state.stars>=cfg.stars&&state.rankIdx<5){state.rankIdx++;state.stars=0;return '升段！'}}else if(state.rankIdx>1){state.stars--;if(state.stars<0){state.rankIdx--;state.stars=RANK_CONFIG[state.rankIdx].stars-1;return '降段'}}return won?'天梯 +1星':'天梯 -1星'}state.points=Math.max(0,(state.points||1000)+(won?25:-15));if(state.rankIdx===5&&state.points>=1500)state.rankIdx=6;return won?'天梯 +25分':'天梯 -15分'}
function renderRank(){const cfg=rankCfg(),winrate=state.total?Math.round(state.wins/state.total*100):0;const pct=(state.rankIdx||0)===0?Math.min(100,(state.newbieGames||0)/3*100):(state.rankIdx||0)<5?Math.min(100,(state.stars||0)/cfg.stars*100):Math.min(100,(state.points||1000)/1500*100);q('#app').innerHTML=`${topbar('天梯','新手保护 + 星级段位 + 高段积分')}
<div class="ladderHero"><div class="ladderBadge">${cfg.icon}</div><div class="ladderTitle">${cfg.name}</div><div class="ladderTrackWrap"><div class="ladderTrack"><i style="width:${pct}%"></i></div><div class="ladderProgress">${rankProgressText()}</div></div><div class="ladderDesc">${cfg.desc}</div><div class="ladderStats"><span><b>${state.total}</b>总场次</span><span><b>${winrate}%</b>胜率</span><span><b>${state.streak||0}</b>连胜</span></div></div>
<div class="panel" id="leaderboardPanel"><b>🏆 排行榜</b><div class="hr"></div><div class="small muted" style="text-align:center;padding:10px">加载中...</div></div>`;fetchLeaderboard()}
var HANDS_EX=[
{name:'皇家同花顺',emoji:'👑',cards:[{rank:14,suit:'♠'},{rank:13,suit:'♠'},{rank:12,suit:'♠'},{rank:11,suit:'♠'},{rank:10,suit:'♠'}]},
{name:'同花顺',emoji:'🔥',cards:[{rank:9,suit:'♥'},{rank:8,suit:'♥'},{rank:7,suit:'♥'},{rank:6,suit:'♥'},{rank:5,suit:'♥'}]},
{name:'四条',emoji:'💪',cards:[{rank:4,suit:'♠'},{rank:4,suit:'♥'},{rank:4,suit:'♣'},{rank:4,suit:'♦'},{rank:9,suit:'♠'}]},
{name:'葫芦',emoji:'🏠',cards:[{rank:7,suit:'♥'},{rank:7,suit:'♠'},{rank:7,suit:'♦'},{rank:3,suit:'♣'},{rank:3,suit:'♥'}]},
{name:'同花',emoji:'🌸',cards:[{rank:13,suit:'♠'},{rank:10,suit:'♠'},{rank:7,suit:'♠'},{rank:5,suit:'♠'},{rank:2,suit:'♠'}]},
{name:'顺子',emoji:'📏',cards:[{rank:9,suit:'♥'},{rank:8,suit:'♠'},{rank:7,suit:'♦'},{rank:6,suit:'♣'},{rank:5,suit:'♥'}]},
{name:'三条',emoji:'🎯',cards:[{rank:11,suit:'♠'},{rank:11,suit:'♥'},{rank:11,suit:'♦'},{rank:4,suit:'♣'},{rank:2,suit:'♠'}]},
{name:'两对',emoji:'✌',cards:[{rank:14,suit:'♠'},{rank:14,suit:'♥'},{rank:9,suit:'♣'},{rank:9,suit:'♦'},{rank:3,suit:'♠'}]},
{name:'一对',emoji:'🥢',cards:[{rank:13,suit:'♠'},{rank:13,suit:'♥'},{rank:7,suit:'♣'},{rank:5,suit:'♦'},{rank:2,suit:'♠'}]},
{name:'高牌',emoji:'📄',cards:[{rank:14,suit:'♠'},{rank:13,suit:'♥'},{rank:7,suit:'♣'},{rank:5,suit:'♦'},{rank:2,suit:'♠'}]}
];
function showAchievements(){if(!state.handCounts||state.handCounts.length<10)state.handCounts=[0,0,0,0,0,0,0,0,0,0];var h=['皇家同花顺','同花顺','四条','葫芦','同花','顺子','三条','两对','一对','高牌'];var totalHands=state.handCounts.reduce(function(a,b){return a+b},0);var bestIdx=0;state.handCounts.forEach(function(n,i){if(n>state.handCounts[bestIdx])bestIdx=i});var skData=Object.entries(state.skills).filter(function(e){return e[1].uses>0}).sort(function(a,b){return b[1].uses-a[1].uses});var m=document.createElement('div');m.className='modal';m.innerHTML='<div class="modalBox"><div class="title" style="color:#321707">📊 成就</div><div style="max-height:65vh;overflow-y:auto"><div class="panel" style="margin:6px 0"><b>📈 总览</b><div style="margin-top:4px">🏆 总场次: '+state.total+'</div><div>🎯 胜率: '+state.wins+'/'+state.total+' ('+(state.total?Math.round(state.wins/state.total*100):0)+'%)</div><div>🔥 最大连胜: '+state.maxStreak+'</div><div>💰 金币: '+state.coins+'</div><div>💎 钻石: '+state.gems+'</div></div><div class="panel" style="margin:6px 0"><b>🃏 牌型记录（从大到小）</b>'+h.map(function(n,i){return '<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px;border-bottom:1px solid rgba(100,60,20,.08)"><span>'+h[i]+'</span><span>'+(state.handCounts[9-i]||0)+'次</span></div>'}).join('')+'<div style="margin-top:4px;font-size:12px;color:#8b7550">共计 '+totalHands+' 次牌型</div></div><div class="panel" style="margin:6px 0"><b>⚡ 功能牌使用</b>'+(skData.length?skData.map(function(e){return '<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px;border-bottom:1px solid rgba(100,60,20,.08)"><span>'+SM[e[0]].icon+' '+SM[e[0]].name+'</span><span>'+e[1].uses+'次</span></div>'}).join(''):'<div class="muted" style="padding:4px 0">暂无使用记录</div>')+'</div></div><div class="btn" style="margin-top:8px" id="closeAch">知道了</div></div>';document.body.appendChild(m);q('#closeAch').onclick=function(){m.remove()};m.onclick=function(e){if(e.target===m)m.remove()}}
function fetchLeaderboard(){fetch('/api/auth/leaderboard').then(r=>r.json()).then(d=>{const panel=q('#leaderboardPanel');if(!panel)return;const lb=d.leaderboard||[];panel.innerHTML='<b>🏆 排行榜</b><div class="hr"></div>'+(lb.length?lb.map(function(x,i){const isMe=x.displayName===state.displayName||x.username===currentUser?.username;const rl=RANK_CONFIG[x.rankIdx]||RANK_CONFIG[0];return '<div class="rankItem'+(isMe?' me':'')+'"><b>#'+(i+1)+'</b><div><b>'+esc(x.displayName)+'</b> <span class="small muted">🎯'+(x.win_rate||0)+'%</span></div><span class="pill">'+rl.icon+' '+rl.name+((x.rankIdx||0)>=5?(x.points>0?' '+(x.points||1000)+'分':''):(x.stars>0?' '+x.stars+'★':''))+'</span></div>'}).join(''):'<div class="small muted" style="text-align:center;padding:10px">暂无数据</div>')}).catch(function(){const panel=q('#leaderboardPanel');if(panel)panel.innerHTML='<b>🏆 排行榜</b><div class="hr"></div><div class="small muted" style="text-align:center;padding:10px">加载失败</div>'})}
function checkDailyReset(){const t=new Date().toDateString();if(state.taskDate!==t){state.tasks={play:0,useSkill:0,winRound:0,straight:0};state.taskDate=t;save()}}
// === Mail System ===
let mailItems=[];
function fetchMail(){fetch('/api/auth/mail',{headers:{'Authorization':'Bearer '+localStorage.getItem(TOKEN_KEY)}}).then(r=>r.json()).then(d=>{mailItems=d.mail||[];updateMailBadge()}).catch(function(){})}
function updateMailBadge(){const el=q('#mailBadge');if(!el)return;const unread=mailItems.filter(function(m){return!m.read}).length;const fab=q('#mailFab');if(unread>0){el.textContent=unread;el.classList.remove('hidden');if(fab)fab.classList.add('hasUnread')}else{el.classList.add('hidden');if(fab)fab.classList.remove('hasUnread')}}
function showMailModal(){fetchMail();const m=document.createElement('div');m.className='modal';m.id='mailModal';m.innerHTML='<div class="modalBox"><div class="title" style="color:#321707">✉️ 邮件</div><div id="mailList" style="max-height:60vh;overflow-y:auto;margin:8px 0"><div class="muted" style="text-align:center;padding:20px">加载中...</div></div><div class="btn dark" onclick="this.closest(\'.modal\').remove()">关闭</div></div>';document.body.appendChild(m);m.onclick=function(e){if(e.target===m)m.remove()};renderMailList()}
function renderMailList(){const el=q('#mailList');if(!el)return;if(!mailItems.length){el.innerHTML='<div class="muted" style="text-align:center;padding:20px">暂无邮件</div>';return}el.innerHTML=mailItems.map(function(m){const hasItems=m.items&&(m.items.gems||m.items.coins);return '<div style="padding:8px;margin:6px 0;border-radius:12px;background:'+(m.read?'rgba(0,0,0,.12)':'rgba(255,200,80,.08)')+';border:1px solid rgba(120,70,20,.3)"><div style="display:flex;justify-content:space-between;align-items:center"><b>'+(m.read?'':'📧 ')+esc(m.title)+'</b><span class="small muted">'+(m.created_at||'')+'</span></div>'+(m.body?'<div class="small muted" style="margin:4px 0">'+esc(m.body)+'</div>':'')+(hasItems?'<div class="small" style="margin:4px 0">'+(m.items.gems?' 💎'+m.items.gems:'')+(m.items.coins?' <span class="ci">🪙</span>'+m.items.coins:'')+'</div>':'')+(hasItems&&!m.claimed?'<div class="btn" style="min-height:32px;padding:6px;margin-top:6px;font-size:12px" onclick="claimMail(\''+m.id+'\')">领取奖励</div>':m.claimed?'<div class="small muted" style="margin-top:4px">✅ 已领取</div>':'')+'</div>'}).join('')}
function claimMail(id){fetch('/api/auth/mail/claim/'+id,{method:'POST',headers:{'Authorization':'Bearer '+localStorage.getItem(TOKEN_KEY),'Content-Type':'application/json'}}).then(r=>r.json()).then(d=>{if(d.ok){const m=mailItems.find(x=>x.id===id);if(m&&m.items){if(m.items.gems)state.gems=(state.gems||0)+m.items.gems;if(m.items.coins)state.coins=(state.coins||0)+m.items.coins;save();updateTopbar()}fetchMail();renderMailList();toast('✅ 领取成功')}}).catch(function(){})}
function renderTeach(){q('#app').innerHTML=`${topbar('牌型教学','新手先看这个，再去决斗')}
<div class="paper"><b>核心规则</b><br>开局3张公共牌整局固定。每回合只用"本回合打出的牌 + 3张公共牌"组成最多5张最大牌型。未打出的手牌不参与比牌。</div>
<div class="panel"><b>回合出牌</b><div class="hr"></div><div class="grid3"><div class="paper">1局<br><b>打3</b></div><div class="paper">2局<br><b>打3</b></div><div class="paper">3局<br><b>打3</b></div><div class="paper">4局<br><b>打4</b></div><div class="paper">5局<br><b>打5</b></div><div class="paper">胜负<br><b>5盘3胜</b></div></div></div>
<div class="paper"><b>牌型从高到低（卡牌举例）</b><div style="max-height:50vh;overflow-y:auto">${HANDS_EX.map(function(h,i){var s='';h.cards.forEach(function(c){s+='<div class="playCard smallCard'+(c.suit=="♥"||c.suit=="♦"?' redSuit':'')+'" style="width:38px;height:52px;font-size:11px;display:inline-flex;margin:0 -4px"><div class="rank" style="font-size:13px">'+({14:'A',13:'K',12:'Q',11:'J',10:'10'}[c.rank]||String(c.rank))+'</div><div class="suit" style="font-size:18px">'+c.suit+'</div></div>'});return '<div style="padding:6px 0;border-bottom:1px solid rgba(100,60,20,.12)"><div style="font-size:14px;font-weight:1000;margin-bottom:4px">'+(i+1)+'. '+h.emoji+' '+h.name+'</div><div style="display:flex;gap:0;justify-content:center">'+s+'</div></div>'}).join('')}</div></div><div class="btn" onclick="setScreen('home')" style="margin-top:12px">← 返回主页</div>`}function newDeck(){let d=[];for(const s of SUITS)for(let r=2;r<=14;r++)d.push({id:'c'+uid++,rank:r,suit:s});return shuffle(d)}function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}function draw(deck,n){let out=[];while(n-- >0){if(!deck.length)deck.push(...newDeck());out.push(deck.pop())}return out}function clone(c){return {...c,id:'c'+uid++}}
function getAIParams(){const rank=state.rankIdx||0,tier=state.aiTier||0;const level=Math.min(20,rank*3+tier);const rankBonus=Math.min(0.3,rank*0.045);const tierBase=[0.10,0.30,0.55];const useBase=[0.15,0.40,0.70];const skillRate=Math.min(0.88,tierBase[tier]+rankBonus);const useRate=Math.min(0.92,useBase[tier]+rankBonus);const pool=level<=4?'weak':level<=11?'normal':'strong';return{skillRate,useRate,pool,level}}
function startTutorial(){state.mode='tutorial';showTutorialIntro()}
// startRankedBattle removed - use unified battle entry
function showTutorialIntro(){const m=document.createElement('div');m.className='tutorialOverlay';m.innerHTML=`<div class="tutorialBox" style="text-align:center"><div class="tutorialDots">● ○ ○ ○ ○</div><h3>🎯 新手教学</h3><p style="font-size:15px;line-height:1.7">会用你手上的牌给你演示一遍怎么玩。<br>教学不消耗任何道具，放心点开始。</p><div class="tutorialActions"><button class="btn dark" id="skipTut">跳过</button><button class="btn" id="goTut">开始教学</button></div></div>`;document.body.appendChild(m);q('#skipTut').onclick=()=>{m.remove();state.mode='normal';setScreen('home')};q('#goTut').onclick=()=>{m.remove();startBattle(true)}}
function startBattle(tutorial=false){let eq=tutorial?['glove','recycle']:(state.equipped||[]).filter(id=>state.skills[id]?.copies>0).slice(0,2);if(eq.length<2)return toast('需要带入2张功能牌');if(!tutorial){for(const id of eq)state.skills[id].copies--;state.equipped=state.equipped.filter(id=>state.skills[id]?.copies>0).slice(0,2)}let deck=newDeck();const ai=getAIParams();var oppPool=ai.pool==='strong'?SKILLS.filter(function(s){return s.tier!=='T3'}):ai.pool==='weak'?SKILLS.filter(function(s){return s.tier==='T2'||s.tier==='T3'}):SKILLS;let oppSkills=shuffle(oppPool).slice(0,2).map(s=>s.id);battle={round:1,phase:'select',deck,community:draw(deck,3),selected:[],logs:[],last:null,roundWins:{player:0,opp:0},mode:state.mode,aiParams:ai,player:makeFighter('你',CM[state.activeChar],eq,draw(deck,7)),opp:makeFighter('对手',CM[shuffle(CHARS)[0].id],oppSkills,draw(deck,7))};if(tutorial)setupTutorialBattle();log(`${tutorial?'教学':'对战'}开始：发出3张公共牌，整局固定。`);save();renderBattle();if(tutorial)setTimeout(()=>showTutorialStep(1),250);else setTimeout(aiStartSkill,500)}
function quickBattle(){const eq=(state.equipped||[]).filter(id=>state.skills[id]?.copies>0);if(eq.length<2){toast('请先设置2张功能牌');setScreen('deck');return}state.mode='ranked';startBattle()}
function showDailyProgress(){const rc=rankCfg();const winrate=state.total?Math.round(state.wins/state.total*100):0;const m=document.createElement('div');m.className='modal';m.innerHTML='<div class="modalBox"><div class="title" style="color:#321707;font-size:22px">📋 今日进度</div><div class="hr"></div><div class="grid2"><div class="paper" style="padding:8px;margin:4px"><b>段位</b><br>'+rc.icon+' '+rc.name+' · '+rankProgressText()+'</div><div class="paper" style="padding:8px;margin:4px"><b>胜率</b><br>'+state.wins+'/'+state.total+' · '+winrate+'%</div></div><div class="paper" style="padding:8px;margin:6px 0;cursor:'+(state.chest>=10?'pointer':'default')+'" onclick="'+(state.chest>=10?'openChest();this.closest(\'.modal\').remove()':'')+'"><div style="display:flex;justify-content:space-between;align-items:center"><b>🎁 宝箱进度</b><span style="font-weight:1000">'+(state.chest>=10?'✨ 点击开启!':state.chest+'/10')+'</span></div><div class="levelBar"><i style="width:'+(state.chest*10)+'%"></i></div></div><div style="display:flex;flex-direction:column;gap:4px">'+taskLine('完成3局对战',state.tasks.play,3,0)+taskLine('使用5次功能牌',state.tasks.useSkill,5,1)+taskLine('赢下6个回合',state.tasks.winRound,6,2)+taskLine('打出顺子或以上',state.tasks.straight,1,3)+'</div><div class="btn" onclick="this.parentElement.parentElement.remove()" style="margin-top:8px">关闭</div></div>';document.body.appendChild(m);m.onclick=function(e){if(e.target===m)m.remove()}}
function makeFighter(name,char,skills,hand){return{name,char,hp:3,hand,played:[],discard:[],skillDeck:skills.map(id=>SM[id]),skills:Object.fromEntries(skills.map(id=>[id,{id,charge:1,used:false}])),skillUses:0,buff:{},playBonus:0,nextPlayBonus:0,nextDrawBonus:0,nextDrawPenalty:0,locked:false,revealed:false}}
function tutorialCard(rank,suit){return{id:'t'+uid++,rank,suit}}
function setupTutorialBattle(){battle.community=[tutorialCard(11,'♠'),tutorialCard(12,'♦'),tutorialCard(13,'♣')];battle.player.hand=[tutorialCard(14,'♥'),tutorialCard(14,'♦'),tutorialCard(5,'♠'),tutorialCard(8,'♣'),tutorialCard(3,'♦'),tutorialCard(6,'♥'),tutorialCard(9,'♠')];battle.opp.hand=[tutorialCard(2,'♠'),tutorialCard(4,'♠'),tutorialCard(5,'♣'),tutorialCard(7,'♦'),tutorialCard(8,'♥'),tutorialCard(10,'♠'),tutorialCard(3,'♣')];battle.logs=[];battle.tutorialStep=1}



function openChest(){if(state.chest<10)return;state.chest=0;state.gems+=50;save();toast('🎁 宝箱已开启！获得 50💎');renderHome()}
function showCardPopup(card,text){if(!card)return;var d=document.createElement('div');d.className='cardPopup';d.innerHTML='<div class="cardPopupInner">'+cardHtml(card,'large')+'<div class="cardPopupText">'+text+'</div></div>';document.body.appendChild(d);setTimeout(function(){d.remove()},1800)}

function showHandChart(){var m=document.createElement('div');m.className='modal';m.innerHTML='<div class="modalBox"><div class="title" style="color:#321707;margin-bottom:6px">📖 牌型表（从大到小）</div><div style="max-height:65vh;overflow-y:auto">'+HANDS_EX.map(function(h,i){var s='';h.cards.forEach(function(c){s+='<div class="playCard smallCard'+(c.suit=="♥"||c.suit=="♦"?' redSuit':'')+'" style="width:32px;height:45px;font-size:10px;display:inline-flex;margin:0 -3px"><div class="rank" style="font-size:11px">'+({14:'A',13:'K',12:'Q',11:'J',10:'10'}[c.rank]||String(c.rank))+'</div><div class="suit" style="font-size:15px">'+c.suit+'</div></div>'});return '<div style="padding:5px 0;border-bottom:1px solid rgba(100,60,20,.1)"><div style="font-size:13px;font-weight:1000;margin-bottom:3px">'+(i+1)+'. '+h.emoji+' '+h.name+'</div><div style="display:flex;gap:0;justify-content:center">'+s+'</div></div>'
}).join('')+'</div><div class="btn" style="margin-top:10px" id="closeChart">知道了</div></div>';document.body.appendChild(m);q('#closeChart').onclick=function(){m.remove()};m.onclick=function(e){if(e.target===m)m.remove()}}
function showSkillDetail(id){var s=SM[id];if(!s)return;var m=document.createElement('div');m.className='modal';m.innerHTML='<div class="modalBox"><div class="title" style="color:#321707;margin-bottom:8px">'+s.icon+' '+s.name+'</div><div class="small muted" style="margin-bottom:6px">'+s.tier+' · '+s.type+'</div><div style="font-size:14px;line-height:1.6;color:#2a1607">'+s.effect+'</div><div class="btn" style="margin-top:12px" id="closeDetail">知道了</div></div>';document.body.appendChild(m);q('#closeDetail').onclick=function(){m.remove()};m.onclick=function(e){if(e.target===m)m.remove()}}
function showTutorialStep(step){if(!battle||battle.mode!=='tutorial')return;var data=[['🎯 怎么出牌','从下面手牌里点牌选中（会弹起来），选满3张后点蓝色的"出牌"按钮。\n\n💡 点错了再点一下就能取消。','我试试'],['🃏 公共牌','桌面中间3张是公共牌，你和对手共用，打完5局都不会变。\n\n你出的牌+公共牌=你的牌型。出牌前想想怎么跟它们搭。','懂了'],['🏆 怎么赢','每人3颗❤️，赢一局对手掉1颗❤️，3颗全掉光就赢。\n\n5局里先赢3局也算赢。','记住了'],['⚡ 功能牌','下方2个功能牌每场只能用一次。试试点一下看看效果。\n\n💡 教学不消耗库存，放心点。\n\n点击牌上的"详情"可以看技能说明。','试试看'],['🏁 毕业了','该教的都教了！去准备页选2张功能牌，打一场正式对战吧。\n\n💡 功能牌仓库能抽更多牌，天梯赢了能升段。','去准备页']][step-1];if(!data)return;clearTutGlow();if(step<=4)addTutGlow(step);var m=document.createElement('div');m.className='tutBubble';m.innerHTML='<div class="tutBubbleInner '+(step===1?'step1':step===3?'mid':'top')+'"><div class="tutDots">'+[1,2,3,4,5].map(function(i){return i<=step?'●':'○'}).join(' ')+'</div><div class="tutTitle">'+data[0]+'</div><div class="tutDesc">'+data[1].replace(/\\n/g,'<br>')+'</div><div class="tutActions"><button class="btn dark" id="endTut">结束</button><button class="btn" id="nextTut">'+data[2]+'</button></div></div>';document.body.appendChild(m);q('#endTut').onclick=function(){clearTutGlow();m.remove();battle=null;state.mode='normal';setScreen('home')};q('#nextTut').onclick=function(){clearTutGlow();m.remove();if(step>=5){battle=null;state.mode='normal';setScreen('home')}};if(step===3){var hands=[{name:'同花顺',cards:[{rank:14,suit:'♠'},{rank:13,suit:'♠'},{rank:12,suit:'♠'},{rank:11,suit:'♠'},{rank:10,suit:'♠'}]},{name:'四条',cards:[{rank:4,suit:'♠'},{rank:4,suit:'♥'},{rank:4,suit:'♣'},{rank:4,suit:'♦'},{rank:9,suit:'♠'}]},{name:'葫芦',cards:[{rank:7,suit:'♥'},{rank:7,suit:'♠'},{rank:7,suit:'♦'},{rank:3,suit:'♣'},{rank:3,suit:'♥'}]},{name:'同花',cards:[{rank:13,suit:'♠'},{rank:10,suit:'♠'},{rank:7,suit:'♠'},{rank:5,suit:'♠'},{rank:2,suit:'♠'}]},{name:'顺子',cards:[{rank:9,suit:'♥'},{rank:8,suit:'♠'},{rank:7,suit:'♦'},{rank:6,suit:'♣'},{rank:5,suit:'♥'}]}];var exHtml='';hands.forEach(function(h){exHtml+='<div style="display:flex;gap:2px;justify-content:center;margin:3px 0">';h.cards.forEach(function(c){exHtml+=cardHtml(c,'smallCard')});exHtml+='</div><div style="text-align:center;font-size:10px;color:#6b5540;margin-bottom:2px">'+h.name+'</div>'});document.querySelector('.tutBubbleInner .tutDesc').insertAdjacentHTML('beforeend','<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(100,60,20,.15)"><div style="font-size:12px;font-weight:1000;color:#2b1a0a;margin-bottom:4px">📊 牌型举例（前5）</div>'+exHtml+'</div>')}}
function clearTutGlow(){qa('[class*=tutGlow]').forEach(function(e){e.className=e.className.replace(/tutGlow\w*/g,'').trim()})}
function addTutGlow(step){clearTutGlow();var sel=['.actionArea','.community','.hp','.skillBar'][step-1];qa(sel).forEach(function(e){e.classList.add('tutGlow');e.classList.add('tutGlow'+step)})}
function roundNeed(side){let f=battle[side];return Math.max(1,PLAY_COUNTS[battle.round-1]+(f.playBonus||0))}
function sortCards(arr){return [...arr].sort((a,b)=>(b.rank-a.rank)||SUITS.indexOf(a.suit)-SUITS.indexOf(b.suit))}
function renderBattle(){renderNav('');q('.screen').style.bottom='0';q('#nav').style.display='none';q('#app').style.minHeight='calc(100vh - 50px)';const p=battle.player,o=battle.opp;let pNeed=roundNeed('player'),ok=battle.phase==='select'&&battle.selected.length===pNeed;let reveal=battle.phase==='reveal';let last=battle.last;let hint=battle.phase==='select'?(p.locked?'被封锁，少打1张':'选 '+pNeed+' 张出牌'):battle.phase==='reveal'?'观察对局...':'';let oppText=last&&battle.phase==='result'?`${last.oEval.name}`:(reveal?'已出牌':'');let pText=last&&battle.phase==='result'?`${last.pEval.name}`:(reveal?'已出牌':'');let review=battle.phase==='result'&&last?`<div class="reviewControls"><div class="roundSummaryMini"><div class="roundSideBox">我方<br><b>${last.pEval.name}</b></div><div class="roundVS">VS</div><div class="roundSideBox">对手<br><b>${last.oEval.name}</b></div></div><button class="btn" id="continueBtn">${isOver()?'结算':'下一局'}</button></div>`:'';let action=battle.phase==='result'?review:`<div class="actionArea"><div class="hint" style="flex:1;margin:0">${hint}　已选 ${battle.selected.length}/${pNeed}　<span id="turnTimer" style="color:#ff6b35">30s</span></div><div class="handScroll">${sortCards(p.hand).map(c=>cardHtml(c,battle.selected.includes(c.id)?'selected':'' )).join('')}</div><div class="skillBar">${Object.values(p.skills).map(sk=>skillButton(sk,battle.phase!=='select')).join('')}<button class="btn ${ok?'':'disabled'}" id="playBtn" style="margin-left:auto">出牌</button></div></div>`;
q('#app').innerHTML=`<div class="battleHeader">${fighterHtml(o,false)}<div class="roundBar">第 ${battle.round}/5 局｜需出 ${pNeed} 张</div></div>
<div class="battleTable"><div class="cardRow">${o.played.length?o.played.map(c=>cardHtml(c,'smallCard thrust')).join(''):cardBacksHtml(Math.max(1,roundNeed('opp')))}</div><div class="handName">${oppText}</div><div class="community"><div class="communityRow"><div class="zoneTitle" style="margin:0;white-space:nowrap;font-size:13px;font-weight:1000">公共牌</div><div class="cardRow">${battle.community.map(c=>cardHtml(c,'large')).join('')}</div><div style="display:flex;flex-direction:column;gap:3px;flex-shrink:0"><button class="helpBtn" onclick="showLog()" style="font-size:13px">📜</button><button class="helpBtn" onclick="showHandChart()" style="font-size:13px">📖</button></div></div></div><div class="cardRow">${p.played.length?p.played.map(c=>cardHtml(c,'smallCard thrust')).join(''):'<span class="muted">请选择手牌</span>'}</div><div class="handName">${pText}</div></div>${action}<div class="duelPlayerPanel">${fighterHtml(p,true)}</div>`;
let cont=q('#continueBtn');if(cont)cont.onclick=()=>nextRound();qa('.handScroll .playCard[data-id]').forEach(el=>el.onclick=()=>toggleSelect(el.dataset.id));qa('.battleSkillCard:not(.used):not(.locked)').forEach(b=>b.onclick=()=>useSkill('player',b.dataset.id));let play=q('#playBtn');if(play)play.onclick=submitPlay;if(window._turnTimer){clearInterval(window._turnTimer);window._turnTimer=null}if(battle.phase==='select'){if(!window._turnDeadline)window._turnDeadline=Date.now()+30000;var t=Math.max(0,Math.round((window._turnDeadline-Date.now())/1000)),el=q('#turnTimer');if(el)el.textContent=t+'s';window._turnTimer=setInterval(function(){t=Math.max(0,Math.round((window._turnDeadline-Date.now())/1000));if(el)el.textContent=t+'s';if(t<=0){clearInterval(window._turnTimer);window._turnTimer=null;window._turnDeadline=null;if(battle&&battle.phase==='select'){var p=battle.player,need=roundNeed('player');battle.selected=[];var best=chooseBest(p.hand,need,p.buff);battle.selected=best.map(function(c){return c.id});renderBattle();setTimeout(submitPlay,300)}}},1000)}
function fighterHtml(f,isPlayer){let icons=Object.values(f.skills).map(sk=>`<span class="tag ${sk.used?'muted':''}" onclick="showSkillDetail('${sk.id}')" style="cursor:pointer">${SM[sk.id].icon}${sk.used?'×':''}</span>`).join('');let oppSkills=isPlayer?'':'<div class="oppSkillRow">'+Object.values(f.skills).map(sk=>skillButton(sk,true)).join('')+'</div>';return `<div class="fighter"><div class="fighterInfo"><div class="avatar" style="background-image:url('${isPlayer?f.char.avatar56:f.char.avatar||'assets/avatar_boy_56.png'}');background-size:cover;background-position:center;font-size:0;border-radius:50%;overflow:hidden;width:56px;height:56px">${f.char.icon}</div><div><div class="fighterName">${isPlayer?'我方 · ':''}${f.char.name||f.name}</div><div class="fighterMeta">${f.locked?'<span class="tag">封锁中</span>':''}</div>${oppSkills}</div></div><div class="fighterSide"><div class="badge">手牌 ${f.hand.length}</div><div class="hp">${[0,1,2].map(i=>`<span class="heart ${i<f.hp?'':'empty'}">♥</span>`).join('')}</div></div></div>`}
function cardHtml(c,cls=''){if(!c)return '';let red=c.suit==='♥'||c.suit==='♦';return `<div class="playCard ${red?'redSuit':''} ${c.joker?'joker':''} ${cls}" data-id="${c.id}"><div class="rank">${c.joker?'JOKER':rankText(c.rank)}</div><div class="suit">${c.suit}</div></div>`}function cardBackHtml(){return `<div class="cardBackArt"><img src="assets/ui_card_back_cutout.png" alt=""></div>`}function cardBacksHtml(n){return Array.from({length:n},()=>cardBackHtml()).join('')}function rankText(r){return r===14?'A':r===13?'K':r===12?'Q':r===11?'J':r===10?'10':String(r)}function needsCardSelected(id){return['fate','plusminus','shuffle','rogue','magician'].includes(id)}function skillButton(sk,locked){let s=SM[sk.id];let hasArt=!!SKILL_ART[sk.id];return `<div class="battleSkillCard ${sk.used?'used ':''}${locked?'locked ':''}${hasArt?'hasArt':'noArt'} tier-${s.tier}" data-id="${sk.id}">${hasArt?'<img class="battleFullArt" src="'+SKILL_ART[sk.id]+'" alt="">':'<div class="battleNoArt"></div>'}<div class="battleSkillName">${s.name}</div><button class="battleInfoBtn" onclick="event.stopPropagation();showSkillDetail('${sk.id}')">?</button>${sk.used?'<div class="battleUsedOverlay">已用</div>':''}</div>`}
function toggleSelect(id){if(battle.phase!=='select')return;let need=roundNeed('player');let i=battle.selected.indexOf(id);if(i>=0)battle.selected.splice(i,1);else{if(battle.selected.length>=need)return toast('本局只能出 '+need+' 张');battle.selected.push(id)}renderBattle()}
function useSkill(side,id){let a=battle[side],e=battle[side==='player'?'opp':'player'];if(battle.phase!=='select')return;let sk=a.skills[id];if(!sk||sk.used)return toast('该功能牌已用过');if(a.skillUses>=2)return toast('每回合最多使用2张功能牌');a.skillUses++;sk.used=true;sk.charge=0;if(side==='player'){state.tasks.useSkill++;state.skills[id].uses=(state.skills[id].uses||0)+1}if(side==='player'&&needsCardSelected(id)){var selCards=a.hand.filter(function(c){return battle.selected.includes(c.id)});if(!selCards.length){sk.used=false;a.skillUses--;return toast('请先选一张手牌再使用此技能')}}log(`${side==='player'?'我方':'对手'}发动【${SM[id].name}】`);flash(`${side==='player'?'我方':'对手'}发动 ${SM[id].icon}${SM[id].name}`);skillBurst();if(side==='opp'){var ntf=document.createElement('div');ntf.className='oppSkillNotice';ntf.innerHTML='<b>⚡ 对手发动 '+SM[id].icon+SM[id].name+'</b><br><span>'+SM[id].effect+'</span>';document.body.appendChild(ntf);setTimeout(function(){ntf.remove()},2200)}applySkill(side,id);save();renderBattle()}
function applySkill(side,id){let a=battle[side],e=battle[side==='player'?'opp':'player'];let own=side==='player'?'我方':'对手',opp=side==='player'?'对手':'我方';let selected=side==='player'?a.hand.filter(c=>battle.selected.includes(c.id)):[];let low=sortCards(a.hand).slice(-1)[0],high=sortCards(a.hand)[0];function add(c){a.hand.push(c)}function discard(target,cards){for(const c of cards){let i=target.hand.indexOf(c);if(i>=0){target.hand.splice(i,1);target.discard.push(c)}}}
switch(id){case'fivejoker':if(battle.round===5){var jk={id:'c'+uid++,rank:15,suit:'★',joker:true};add(jk);if(side==='player')showCardPopup(jk,'获得Joker百搭牌');log(`${own}获得Joker百搭牌`)}else{var dr=draw(battle.deck,1);add(...dr);if(side==='player'&&dr.length)showCardPopup(dr[0],'抽1张牌');log(`${own}抽1张牌`)}break;case'magician':if(side==='player'&&(!selected||!selected.length))return toast('请先选择要复制的牌');if(high){let t=selected[0]||high;var mc=clone(t);add(mc);if(side==='player')showCardPopup(mc,'复制 '+rankText(t.rank)+t.suit);log(`${own}复制 ${rankText(t.rank)}${t.suit}`)}break;case'thief':if(e.hand.length){let c=e.hand.splice(Math.floor(Math.random()*e.hand.length),1)[0];add(c);if(side==='player')showCardPopup(c,'偷走 '+rankText(c.rank)+c.suit);log(`${own}偷走${opp}1张手牌`)}break;case'fate':if(side==='player'&&(!selected||!selected.length))return toast('请先选择要献祭的手牌');{let c=selected[0]||low;if(c){discard(a,[c]);battle.selected=battle.selected.filter(function(id){return id!==c.id});var fa={id:'c'+uid++,rank:14,suit:c.suit};add(fa);if(side==='player')showCardPopup(fa,'转化A'+c.suit);log(`${own}将 ${rankText(c.rank)}${c.suit} 转化为A${c.suit}`)}}break;case'hacker':if(e.hand.length){let c=e.hand[Math.floor(Math.random()*e.hand.length)];var hc=clone(c);add(hc);if(side==='player')showCardPopup(hc,'复制 '+rankText(c.rank)+c.suit);log(`${own}复制${opp}1张手牌`)}break;case'lucky':a.buff.lucky=true;log(`${own}本回合顺子将视为同花顺`);break;case'destroyer':{let ds=shuffle(e.hand).slice(0,2);discard(e,ds);if(side==='player'&&ds.length)showCardPopup(ds[0],'弃掉对手 '+rankText(ds[0].rank)+ds[0].suit+(ds.length>1?' 等'+ds.length+'张':''));log(`${own}随机弃掉${opp}${ds.length}张手牌`)}break;case'glove':{let c=clone(battle.community[Math.floor(Math.random()*battle.community.length)]);add(c);if(side==='player')showCardPopup(c,'复制公牌 '+rankText(c.rank)+c.suit);log(`${own}复制公共牌 ${rankText(c.rank)}${c.suit}`)}break;case'burst':a.playBonus+=1;log(`${own}本回合可以多打1张牌`);break;case'god':{let r=[12,13,14][Math.floor(Math.random()*3)],s=SUITS[Math.floor(Math.random()*4)];var gc={id:'c'+uid++,rank:r,suit:s};add(gc);if(side==='player')showCardPopup(gc,'获得 '+rankText(r)+s);log(`${own}获得 ${rankText(r)}${s}`)}break;case'plusminus':if(side==='player'&&(!selected||!selected.length))return toast('请先选择要调整的手牌');{let c=selected[0]||low;if(c){let old=c.rank;c.rank=c.rank<14?c.rank+1:c.rank-1;if(side==='player')showCardPopup(c,rankText(old)+c.suit+' → '+rankText(c.rank)+c.suit);log(`${own}调整 ${rankText(old)}${c.suit} → ${rankText(c.rank)}${c.suit}`)}}break;case'intel':{let cards=draw(battle.deck,2),keep=sortCards(cards)[0];add(keep);if(side==='player')showCardPopup(keep,'抽2选1，保留 '+rankText(keep.rank)+keep.suit);log(`${own}抽2选1，保留 ${rankText(keep.rank)}${keep.suit}`)}break;case'inspect':e.revealed=true;log(`${own}查看了${opp}全部手牌`);if(side==='player')showInspect(e.hand);break;case'recycle':{let pile=a.discard.filter(c=>!a.played.includes(c));let c=sortCards(pile)[0];if(c){var rc=clone(c);add(rc);if(side==='player')showCardPopup(rc,'回收 '+rankText(c.rank)+c.suit);log(`${own}回收 ${rankText(c.rank)}${c.suit}`)}else{var rd=draw(battle.deck,1);add(...rd);if(side==='player'&&rd.length)showCardPopup(rd[0],'抽1张');log(`${own}无牌可回收，改为抽1张`)}}break;case'lock':e.locked=true;e.playBonus-=1;log(`${opp}本回合少打一张牌`);break;case'shuffle':if(side==='player'&&(!selected||!selected.length))return toast('请先选择要弃掉的手牌');{let c=selected[0]||low;if(c){discard(a,[c]);var sd=draw(battle.deck,2);add(...sd);if(side==='player'){showCardPopup(c,'弃掉');setTimeout(function(){if(sd.length)showCardPopup(sd[0],'抽到 '+rankText(sd[0].rank)+sd[0].suit)},600)}log(`${own}弃 ${rankText(c.rank)}${c.suit}，抽2张`)}}break;case'rogue':if(side==='player'&&(!selected||!selected.length))return toast('请先选择要交换的手牌');if(a.hand.length&&e.hand.length){let c1=selected[0]||a.hand[0],c2=e.hand[Math.floor(Math.random()*e.hand.length)];a.hand[a.hand.indexOf(c1)]=c2;e.hand[e.hand.indexOf(c2)]=c1;if(side==='player'){showCardPopup(c1,'交出 '+rankText(c1.rank)+c1.suit);setTimeout(function(){showCardPopup(c2,'获得 '+rankText(c2.rank)+c2.suit)},600)}log(`${own}与${opp}交换1张牌`)}break;case'gambler':if(Math.random()<.60){var gw=draw(battle.deck,3);add(...gw);if(side==='player'&&gw.length)showCardPopup(gw[0],'幸运！抽3张');log(`${own}幸运赌徒成功，抽3张`)}else if(a.hand.length){let c=a.hand[Math.floor(Math.random()*a.hand.length)];discard(a,[c]);if(side==='player')showCardPopup(c,'运气不佳，弃掉');log(`${own}幸运赌徒失败，弃1张`)}break;case'flushbeliever':a.buff.flushBeliever=true;log(`${own}激活同花信徒`);break;case'delay':e.nextDrawPenalty=(e.nextDrawPenalty||0)+1;log(`${opp}下回合少抽1张`);break;case'bomb':if(e.hand.length){let c=e.hand[Math.floor(Math.random()*e.hand.length)];discard(e,[c]);if(side==='player')showCardPopup(c,'扰乱对手 '+rankText(c.rank)+c.suit);log(`${own}扰乱${opp}1张手牌`)}break;case'charge':a.playBonus-=1;a.nextPlayBonus=(a.nextPlayBonus||0)+1;log(`${own}蓄力：本回合少打1张，下回合多打1张`);break;}}
function submitPlay(){if(window._turnTimer){clearInterval(window._turnTimer);window._turnTimer=null;window._turnDeadline=null}if(battle.phase!=='select')return;let p=battle.player,o=battle.opp,need=roundNeed('player');if(battle.selected.length!==need)return toast('需要选择 '+need+' 张');p.played=p.hand.filter(c=>battle.selected.includes(c.id));p.hand=p.hand.filter(c=>!battle.selected.includes(c.id));p.discard.push(...p.played);aiUseSkills();let on=roundNeed('opp');while(o.hand.length<on)o.hand.push(...draw(battle.deck,1));o.played=chooseBest(o.hand,on,o.buff,(state.rankIdx||0)<4?[1,2,3,4][state.rankIdx||0]:undefined);o.hand=o.hand.filter(c=>!o.played.includes(c));o.discard.push(...o.played);battle.phase='reveal';battle.selected=[];log('双方亮牌：展示4秒后结算。');renderBattle();flash('对手亮牌');setTimeout(()=>{if(battle&&battle.phase==='reveal')resolveRound()},4000)}
function chooseBest(hand,n,buff,maxCat){let best=null,score=null;for(const cb of combos(hand,n)){let ev=evaluate([...cb,...battle.community],{...buff,played:cb});if(maxCat!==undefined&&ev.cat>maxCat)continue;if(!score||compare(ev.score,score)>0){best=cb;score=ev.score}}return best||hand.slice(0,n)}
function aiStartSkill(){if(!battle||battle.phase!=='select')return;const p=battle.aiParams||{skillRate:0.3,pool:'normal'};var pri=p.pool==='strong'?['lock','delay','destroyer','thief','intel','god','glove','fivejoker','magician']:['lock','delay','intel','god','glove','fivejoker'];for(const id of pri){let sk=battle.opp.skills[id];if(sk&&!sk.used&&Math.random()<p.skillRate){useSkill('opp',id);break}}}
function aiUseSkills(){let o=battle.opp;let c=Object.values(o.skills).filter(s=>!s.used);if(!c.length)return;const p=battle.aiParams||{useRate:0.5,pool:'normal'};if(Math.random()<p.useRate){var pri=p.pool==='strong'?['destroyer','bomb','thief','hacker','lucky','magician','burst','gambler','god','fivejoker']:['destroyer','bomb','thief','hacker','lucky','magician','burst','gambler'];var id=(pri.find(x=>o.skills[x]&&!o.skills[x].used)||c[0].id);useSkill('opp',id)}}
function resolveRound(){if(window._turnTimer){clearInterval(window._turnTimer);window._turnTimer=null;window._turnDeadline=null}let p=battle.player,o=battle.opp;p.buff.played=p.played;o.buff.played=o.played;let pe=evaluate([...p.played,...battle.community],p.buff),oe=evaluate([...o.played,...battle.community],o.buff);let cmp=compare(pe.score,oe.score);let winner=cmp>0?'player':cmp<0?'opp':'tie',dmg=winner==='tie'?0:1;battle.last={winner,pEval:pe,oEval:oe,dmg};if(winner==='player'){o.hp=Math.max(0,o.hp-dmg);hpHitFx('opp',dmg);battle.roundWins.player++;state.tasks.winRound++;state.handCounts[pe.cat]=(state.handCounts[pe.cat]||0)+1;if(pe.cat>=4)state.tasks.straight=1;if(pe.cat>=7)bigHandCelebration(pe.name)}else if(winner==='opp'){p.hp=Math.max(0,p.hp-dmg);hpHitFx('player',dmg);battle.roundWins.opp++;state.handCounts[oe.cat]=(state.handCounts[oe.cat]||0)+1;if(oe.cat>=7)bigHandCelebration(oe.name)}for(const f of [p,o]){if(f.buff.flushBeliever&&f.played.length>0){var suits={};[...f.played,...battle.community].forEach(function(c){suits[c.suit]=(suits[c.suit]||0)+1});var hasFlush=Object.values(suits).some(function(n){return n>=3});if(hasFlush){f.nextDrawBonus=(f.nextDrawBonus||0)+2;log(`${f===p?'我方':'对手'}同花信徒触发，下回合额外抽2张`)}}}battle.phase='result';log(`本局结果：我方【${pe.name}】 vs 对手【${oe.name}】`);showRoundResult(winner,pe,oe,dmg);save()}
function showRoundResult(winner,pe,oe,dmg){let title=winner==='player'?'本局胜利':winner==='opp'?'本局失败':'本局平局';if(winner!=='tie')softHitFx(winner);let m=document.createElement('div');m.className='resultBanner';var pWin=winner==='player',oWin=winner==='opp';var pCards=cardsHtml(pe.cards||battle.player.played,'smallCard');var oCards=cardsHtml(oe.cards||battle.opp.played,'smallCard');m.innerHTML=`<div class="resultBox"><div class="resultTitle" style="font-size:22px;margin-bottom:6px">${pWin?'🎉 本局胜利':oWin?'💔 本局失败':'🤝 本局平局'}</div><div class="resultVLayout"><div class="resultSide ${oWin?'resultWin':''}"><div class="resultHandName">${oe.name}</div><div class="resultCardRow">${oCards}</div></div><div class="resultVS"><img class="resultVSImg" src="assets/ui_vs_badge_cutout.png" alt="VS"></div><div class="resultSide ${pWin?'resultWin':''}"><div class="resultHandName">${pe.name}</div><div class="resultCardRow">${pCards}</div></div></div><div class="resultDmg">${winner==='tie'?'双方牌型相同，本局不扣血':(pWin?'对手':'你')+' -'+dmg+'❤️'}</div><div style="font-size:12px;color:#6b5540;margin-top:2px">${pe.name} vs ${oe.name}${winner!=='tie'?' — '+(pWin?'高':'低')+Math.abs(pe.cat-oe.cat)+'级':''}</div><div class="grid2" style="margin-top:8px"><div class="btn dark" onclick="this.parentElement.parentElement.parentElement.remove();surrenderPvE()">投降</div><div class="btn" onclick="if(window._roundCd){clearInterval(window._roundCd);window._roundCd=null}this.parentElement.parentElement.parentElement.remove();nextRound()">${isOver()?'进入结算':'下一局'}</div></div></div>`;document.body.appendChild(m);if(!isOver()){var nBtn=m.querySelector('.grid2 .btn:last-child'),cd=5;if(nBtn)nBtn.textContent='下一局 ('+cd+'s)';window._roundCd=setInterval(function(){cd--;if(nBtn)nBtn.textContent='下一局 ('+cd+'s)';if(cd<=0){clearInterval(window._roundCd);window._roundCd=null;if(m.parentNode){m.remove();nextRound()}}},1000)}}
function isOver(){return battle.mode==='tutorial'?battle.round>=5:(battle.player.hp<=0||battle.opp.hp<=0||battle.round>=5||battle.roundWins.player>=3||battle.roundWins.opp>=3)}
function nextRound(){if(isOver())return finishBattle();battle.round++;window._turnDeadline=null;for(const key of ['player','opp']){let f=battle[key];let target=HAND_LIMIT+(f.nextDrawBonus||0)-(f.nextDrawPenalty||0);let n=Math.max(0,target-f.hand.length);f.hand.push(...draw(battle.deck,n));f.played=[];f.buff={};f.skillUses=0;f.playBonus=f.nextPlayBonus||0;f.nextPlayBonus=0;f.nextDrawBonus=0;f.nextDrawPenalty=0;f.locked=false}battle.selected=[];battle.phase='select';log(`进入第${battle.round}局：手牌补到${HAND_LIMIT}张，基础打${PLAY_COUNTS[battle.round-1]}张`);renderBattle();if(battle.mode==='tutorial'){battle.tutorialStep=Math.min(5,(battle.tutorialStep||1)+1);setTimeout(()=>showTutorialStep(battle.tutorialStep),250)}else{setTimeout(aiStartSkill,500)}}
function deckLines(deck){return deck.map(s=>`<div class="deckSkillLine"><span>${s.icon} ${s.name}</span><b>${s.tier}</b></div>`).join('')||'<div class="muted">无</div>'}
function finishBattle(){q('.screen').style.bottom='';q('#nav').style.display='';let win=battle.roundWins.player>battle.roundWins.opp||battle.opp.hp<=0;let lose=battle.roundWins.opp>battle.roundWins.player||battle.player.hp<=0;state.tasks.play++;if(battle.mode==='ranked'&&!battle.tutorialStep){if(win&&!lose){state.aiStreak=(state.aiStreak||0)>0?state.aiStreak+1:1}else if(lose&&!win){state.aiStreak=(state.aiStreak||0)<0?state.aiStreak-1:-1}if(state.aiStreak>=2){state.aiStreak=0;if(state.aiTier<2){state.aiTier++}else{state.aiTier=0}}else if(state.aiStreak<=-2){state.aiStreak=0;if(state.aiTier>0){state.aiTier--}else{state.aiTier=2}}}let ladderText='快速对战不计天梯';if(battle.mode==='ranked')ladderText=updateLadder(win);else{state.total++;if(win)state.wins++}let base=win?320:lose?90:150;let lv=charLv(state.activeChar);if(state.activeChar==='cowboy')base+=Math.floor(base*(0.05+(lv-1)*.02));state.coins+=base;var bonusGems=0;if(state.activeChar==='sheriff'){bonusGems=2+(lv-1)*1}state.gems+=(win?12:5)+bonusGems;state.rank=Math.max(0,(state.rank||820)+(win?30:lose?-10:0));var oldChest=state.chest;var chestAdd=win?2:1;if(state.activeChar==='lily')chestAdd+=1+(lv-1)*1;state.chest=Math.min(10,state.chest+chestAdd);state.history.unshift({win,score:`${battle.roundWins.player}:${battle.roundWins.opp}`,time:Date.now(),mode:battle.mode||'normal'});save();let m=document.createElement('div');m.className='resultBanner';m.innerHTML=`<div class="resultBox"><div class="resultTitle" style="font-size:26px">${win?'🎉 对战胜利':lose?'💔 对战失败':'🤝 对战平局'}</div><div class="finalScore">${battle.roundWins.player} : ${battle.roundWins.opp}</div><div style="margin:8px 0;font-size:15px;font-weight:1000">获得：<span class="ci">🪙</span>${base} 💎${win?12:5}</div><div class="grid2" style="margin-top:10px"><div class="btn dark" onclick="this.parentElement.parentElement.parentElement.remove();battle=null;state.mode='normal';setScreen('rank')">查看天梯</div><div class="btn" onclick="this.parentElement.parentElement.parentElement.remove();battle=null;state.mode='normal';setScreen('home')">回到主页</div></div></div>`;document.body.appendChild(m)}
function surrenderPvE(){if(!battle)return;battle.player.hp=0;battle.opp.hp=1;finishBattle()}
function surrenderPvP(){if(!pvp)return;socket.emit('pvp_surrender');pvp=null;setScreen('home')}
/* poker eval */
function combos(arr,k){let out=[];function rec(start,cur){if(cur.length===k){out.push(cur.slice());return}for(let i=start;i<arr.length;i++)rec(i+1,cur.concat(arr[i]))}rec(0,[]);return out}
function evaluate(cards,buff={}){let js=cards.filter(c=>c.joker);if(js.length){let best=null;for(const r of [14,13,12,11,10,9,8,7,6,5,4,3,2])for(const s of SUITS){let rep=cards.map(c=>c.joker?{...c,rank:r,suit:s,joker:false}:c);let ev=evaluate(rep,buff);if(!best||compare(ev.score,best.score)>0)best=ev}return best}let best=null;for(const cb of combos(cards,5)){let ev=evaluateNoJoker(cb,buff);if(!best||compare(ev.score,best.score)>0)best=ev}return best||evaluateNoJoker(cards,buff)}
function evaluateNoJoker(cs,buff={}){cs=[...cs].sort((a,b)=>b.rank-a.rank);let ranks=cs.map(c=>c.rank),counts={};for(const r of ranks)counts[r]=(counts[r]||0)+1;let groups=Object.entries(counts).map(([r,n])=>({r:+r,n})).sort((a,b)=>b.n-a.n||b.r-a.r);let flush=cs.length>=5&&cs.every(c=>c.suit===cs[0].suit);let uniq=[...new Set(ranks)].sort((a,b)=>b-a);if(uniq.includes(14))uniq.push(1);let straightHigh=0;for(let i=0;i<=uniq.length-5;i++){let seq=uniq.slice(i,i+5);if(seq[0]-seq[4]===4){straightHigh=seq[0];break}}let straight=!!straightHigh;if(buff.lucky&&straight){return{name:'同花顺（幸运日）',cat:8,score:[8,straightHigh],cards:cs}}if(flush&&straight&&straightHigh===14)return{name:'皇家同花顺',cat:9,score:[9,14],cards:cs};if(flush&&straight)return{name:'同花顺',cat:8,score:[8,straightHigh],cards:cs};if(groups[0]?.n===4)return{name:'四条',cat:7,score:[7,groups[0].r,...ranks.filter(r=>r!==groups[0].r)],cards:cs};if(groups[0]?.n===3&&groups[1]?.n>=2)return{name:'葫芦',cat:6,score:[6,groups[0].r,groups[1].r],cards:cs};if(flush)return{name:'同花',cat:5,score:[5,...ranks],cards:cs};if(straight)return{name:'顺子',cat:4,score:[4,straightHigh],cards:cs};if(groups[0]?.n===3)return{name:'三条',cat:3,score:[3,groups[0].r,...ranks.filter(r=>r!==groups[0].r)],cards:cs};if(groups[0]?.n===2&&groups[1]?.n===2){let ps=groups.filter(g=>g.n===2).map(g=>g.r).sort((a,b)=>b-a);return{name:'两对',cat:2,score:[2,...ps,...ranks.filter(r=>!ps.includes(r))],cards:cs}}if(groups[0]?.n===2)return{name:'一对',cat:1,score:[1,groups[0].r,...ranks.filter(r=>r!==groups[0].r)],cards:cs};return{name:'高牌',cat:0,score:[0,...ranks],cards:cs}}
function compare(a,b){for(let i=0;i<Math.max(a.length,b.length);i++){let d=(a[i]||0)-(b[i]||0);if(d)return d}return 0}
function cardsText(a){return (a||[]).map(c=>`${rankText(c.rank)}${c.suit}`).join('、')||'无'}
function cardsHtml(a,cls){return (a||[]).map(function(c){return cardHtml(c,cls||'smallCard')}).join('')}function log(t){if(!battle)return;battle.logs.unshift(`<div>${new Date().toLocaleTimeString().slice(0,8)} · ${t}</div>`)}function showLog(){let m=document.createElement('div');m.className='modal';m.innerHTML=`<div class="modalBox"><div class="title" style="color:#321707">📜 战斗日志</div><div class="log">${battle.logs.join('')||'<div>暂无日志。</div>'}</div><div class="btn" id="closeLog" style="margin-top:12px">关闭</div></div>`;document.body.appendChild(m);q('#closeLog').onclick=()=>m.remove();m.onclick=e=>{if(e.target===m)m.remove()}}
function showInspect(hand){let m=document.createElement('div');m.className='modal';m.innerHTML=`<div class="modalBox"><div class="title" style="color:#321707">🔍 对手手牌</div><div class="cardRow">${sortCards(hand).map(c=>cardHtml(c,'smallCard')).join('')}</div><div class="btn" id="closeInsp">知道了</div></div>`;document.body.appendChild(m);q('#closeInsp').onclick=()=>m.remove()}
function flash(t){let d=document.createElement('div');d.className='flashText';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),5000)}function skillBurst(){let d=document.createElement('div');d.className='skillBurstFx';document.body.appendChild(d);setTimeout(()=>d.remove(),700);navigator.vibrate&&navigator.vibrate(20)}
function bigHandCelebration(name){var d=document.createElement('div');d.className='bigHandCelebration';d.innerHTML='<div class="bigHandText">\u{1F525} '+name+' \u{1F525}</div>';document.body.appendChild(d);setTimeout(function(){d.remove()},1600);navigator.vibrate&&navigator.vibrate([30,50,30])}
function hpHitFx(side,dmg){var el=document.querySelector('.phone');if(el)el.classList.add('shakeScreen');setTimeout(function(){if(el)el.classList.remove('shakeScreen')},350);var ft=document.createElement('div');ft.className='hpFloat';ft.textContent='-'+dmg+'❤️';ft.style.left=side==='player'?'35%':'65%';document.body.appendChild(ft);setTimeout(function(){ft.remove()},900)}
function softHitFx(winner){let i=document.createElement('div');i.className='impact';i.textContent='✨';i.style.left=winner==='player'?'58%':'42%';i.style.top=winner==='player'?'22%':'78%';document.body.appendChild(i);setTimeout(()=>i.remove(),650)}
function toast(t){let old=q('.toast');if(old)old.remove();let d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),1800)}

// === 联机对战 PvP ===
let socket = null;
let pvp = null;
function getChatName() { return state.displayName || (currentUser && currentUser.username) || '匿名'; }
let chatCache = [];

function chatSetPlaceholder(show) {
  const el = q('#chatMsgs'); if (!el) return;
  const existing = el.querySelector('.chatMsg[style*="color:#d0b890"]');
  if (show && !existing) {
    el.insertAdjacentHTML('afterbegin', '<div class="chatMsg" style="color:#d0b890;font-size:13px;padding:6px 0;border:0">连接后可聊天...</div>');
  } else if (!show && existing) {
    existing.remove();
  }
}

function restoreChat() {
  const el = q('#chatMsgs'); if (!el) return;
  if (socket && socket.connected && chatCache.length > 0) {
    el.innerHTML = chatCache.map(m => chatMsgHtml(m)).join('');
  } else if (socket && socket.connected) {
    chatSetPlaceholder(false);
  } else {
    chatSetPlaceholder(true);
  }
}

function pvpConnect() {
  if (socket) { socket.disconnect(); socket = null; }
  try { socket = io({ transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 1000, reconnectionDelayMax: 5000 }); } catch(e) { setTimeout(pvpConnect, 2000); return; }
  socket.on('connect', () => { toast('已连接服务器'); chatSetPlaceholder(false); });
  socket.on('disconnect', () => { toast('与服务器断开'); chatSetPlaceholder(true); });
  socket.on('online_count', (n) => {
    const el = q('#onlineCount');
    if (el) el.textContent = '🟢 ' + n;
  });
  socket.on('room_list', (rooms) => {
    const list = q('#pvpRoomList');
    if (list) {
      list.innerHTML = rooms.length ? rooms.map(function(r){ return '<div class="roomListItem" onclick="joinRoom(\''+r.roomId+'\')"><span><b>'+r.roomName+'</b><br><span class="small muted">'+r.hostName+'</span></span><span class="muted" style="font-weight:1000">'+r.playerCount+'/'+r.maxPlayers+'</span></div>'; }).join('') : '<div class="muted" style="padding:12px;text-align:center">暂无可用房间</div>';
    }
  });
  socket.on('room_created', (d) => { pvp = { roomId: d.roomId, phase: 'lobby', side: 'player', selected: [], isHost: true, roomName: d.roomName, players: [{ name: d.hostName, socketId: socket.id }] }; showPvPLobby(); });
  socket.on('player_joined', (d) => { if (pvp && pvp.phase === 'lobby') { pvp.players = d.players; showPvPLobby(); } });
  socket.on('room_info', (d) => { pvp = { roomId: d.roomId, phase: 'lobby', side: 'opp', selected: [], isHost: false, hostId: d.hostId, roomName: d.roomName, players: d.players }; showPvPLobby(); });
  socket.on('room_confirm', (d) => { if (pvp) showPvPConfirm(d); });
  socket.on('confirm_progress', (d) => { toast('准备中 '+d.readyCount+'/'+d.total); });
  socket.on('kicked', () => { toast('你已被房主踢出'); pvp = null; setScreen('home'); });
  socket.on('left_room', () => { pvp = null; setScreen('home'); });
  socket.on('game_state', (d) => {
    if (!pvp) pvp = { selected: [] };
    pvp.side = d.side; pvp.phase = 'battle'; pvp.serverState = d; pvp.selected = [];
    pvp.mySubmitted = false; pvp.oppSubmitted = false;
    renderPvPBattle();
    if (d.opponent && d.opponent.hand) showPvPInspect(d.opponent.hand);
    const wm = q('#pvpWaitingModal'); if (wm) wm.remove();
    const hm = q('#pvpHomeModal'); if (hm) hm.remove();
    const lm = q('#pvpLobbyModal'); if (lm) lm.remove();
    const cm = q('#pvpConfirmModal'); if (cm) cm.remove();
  });
  socket.on('round_result', (d) => { pvp.phase = 'result'; showPvPResult(d); });
  socket.on('game_over', (d) => { if (!pvp) return; showPvPGameOver(d); });
  socket.on('room_rematch', (d) => { pvp = { roomId: d.roomId, phase: 'lobby', side: pvp?.side || 'player', selected: [], isHost: d.hostId === socket.id, hostId: d.hostId, roomName: d.roomName, players: d.players }; showPvPLobby(); });
  socket.on('error', (d) => { toast('错误: ' + (d.msg || '')); });
  socket.on('opponent_left', () => { toast('对手已离开'); pvp = null; setScreen('home'); });
  socket.on('chat_history', (msgs) => {
    chatCache = msgs;
    const el = q('#chatMsgs'); if (!el) return;
    el.innerHTML = msgs.map(m => chatMsgHtml(m)).join('');
    const placeholder = el.querySelector('.chatMsg[style*="color:#d0b890"]');
    if (placeholder) placeholder.remove();
    scrollChat();
  });
  socket.on('new_chat_message', (m) => {
    chatCache.push(m);
    const el = q('#chatMsgs'); if (!el) return;
    const placeholder = el.querySelector('.chatMsg[style*="color:#d0b890"]');
    if (placeholder) placeholder.remove();
    const badge = q('#chatBadge');
    const body = q('#chatBody');
    if (body && body.classList.contains('collapsed') && badge) {
      badge.classList.remove('hidden');
      badge.textContent = (parseInt(badge.textContent || '0') + 1).toString();
    }
    el.insertAdjacentHTML('beforeend', chatMsgHtml(m));
    scrollChat();
  });
  socket.on('opponent_submitted', () => {
    if (pvp) { pvp.oppSubmitted = true; renderPvPBattle(); }
    toast('对手已出牌');
  });
  socket.on('submitted', () => { if (pvp) { pvp.mySubmitted = true; renderPvPBattle(); } });
  socket.on('skill_used', (d) => { const who = d.side === (pvp?.side || 'player') ? '我方' : '对手'; let msg = who + ' 发动 ' + (d.name || '技能'); if (d.lostCard) msg += '，弃掉' + d.lostCard.rank + d.lostCard.suit; flash(msg); });
  // === Quick match events ===
  socket.on('in_queue', () => { /* in queue, waiting */ });
  socket.on('quick_match_found', (d) => {
    const wm = q('#matchmakingModal'); if (wm) wm.remove();
    if (window._matchCd) { clearInterval(window._matchCd); window._matchCd = null; }
    toast('匹配成功！');
  });
  socket.on('quick_match_timeout', () => {
    const wm = q('#matchmakingModal'); if (wm) wm.remove();
    if (window._matchCd) { clearInterval(window._matchCd); window._matchCd = null; }
    toast('未匹配到真人，转AI对战');
    const eq = (state.equipped||[]).filter(id => state.skills[id]?.copies > 0);
    if (eq.length >= 2) { state.mode='ranked'; startBattle(); }
    else { toast('请设置功能牌'); setScreen('deck'); }
  });
}

function showPvPHome() {
  pvpConnect();
  const m = document.createElement('div');
  m.className = 'modal'; m.id = 'pvpHomeModal';
  m.innerHTML = '<div class="modalBox" style="text-align:center"><div class="title" style="color:#321707">🌐 联机对战</div><div style="margin:6px 0 12px;font-size:13px;color:#6b5540">'+(socket&&socket.connected?'✅ 已连接':'🟡 连接中...')+'</div><div class="btn" style="margin-bottom:10px" onclick="var hm=q(\'#pvpHomeModal\');if(hm)hm.remove();showQuickMatchModal()">🔍 快速匹配</div><div style="text-align:left;margin-bottom:10px"><div style="font-weight:1000;margin-bottom:4px;font-size:14px">可用房间</div><div id="pvpRoomList" style="max-height:180px;overflow-y:auto;border:1px solid rgba(0,0,0,.1);border-radius:10px;padding:4px"></div></div><div style="display:flex;gap:4px;margin-bottom:8px"><input id="pvpRoomNameInput" placeholder="输入房间名称" style="flex:1;padding:10px;border:2px solid #8b7550;border-radius:12px;font-size:14px;outline:none;background:#f5e8d0;color:#2a1607;text-align:center"><button class="btn" id="pvpCreateBtn" style="flex-shrink:0">创建</button></div><div style="display:flex;gap:4px"><input id="pvpRoomInput" placeholder="输入房间号" style="flex:1;padding:10px;border:2px solid #8b7550;border-radius:12px;font-size:16px;outline:none;background:#f5e8d0;color:#2a1607;text-align:center;letter-spacing:2px;font-weight:1000"><button class="btn" id="pvpJoinBtn" style="flex-shrink:0">加入</button></div><div class="btn dark" onclick="this.parentElement.parentElement.remove();pvp=null" style="margin-top:10px">返回</div></div>';
  document.body.appendChild(m);
  q('#pvpCreateBtn').onclick = () => { const eq=(state.equipped||[]).filter(function(id){return state.skills[id]?.copies>0}); if(eq.length<2) return toast('请先在仓库准备2张功能牌'); const rn=q('#pvpRoomNameInput').value.trim()||undefined; socket.emit('pvp_create_room',{skills:eq,name:CM[state.activeChar]?.name||'玩家',roomName:rn}); m.remove(); };
  q('#pvpJoinBtn').onclick = () => { const rid=q('#pvpRoomInput').value.trim().toUpperCase(); if(!rid||rid.length<4) return toast('输入有效房间号'); const eq=(state.equipped||[]).filter(function(id){return state.skills[id]?.copies>0}); if(eq.length<2) return toast('请先在仓库准备2张功能牌'); socket.emit('pvp_join_room',{roomId:rid,skills:eq,name:CM[state.activeChar]?.name||'玩家'}); m.remove(); };
  socket.emit('pvp_list_rooms');
}

function showPvPLobby() {
  if (!pvp || !pvp.roomId) return;
  const isHost = pvp.isHost;
  const players = pvp.players || [];
  pvp.hostId = pvp.hostId || (players.length > 0 ? players[0].socketId : null);
  const p1 = players[0] || null;
  const p2 = players[1] || null;
  const charIcon1 = p1 ? (CHARS_BY_NAME[p1.name]?.icon || '🌟') : '?';
  const charIcon2 = p2 ? (CHARS_BY_NAME[p2.name]?.icon || '🌟') : '?';
  const p1Name = p1 ? p1.name : '等待加入...';
  const p2Name = p2 ? p2.name : '等待加入...';
  const hostId = pvp.hostId;
  const navHtml = '<div class="topbar" style="margin-bottom:4px"><div style="display:flex;align-items:center;gap:6px"><span class="btn dark" onclick="leavePvPLobby()" style="padding:6px 10px;min-height:30px;font-size:12px">← 退出</span></div><div style="font-size:18px;font-weight:1000;color:#321707">'+pvp.roomId+'</div><div></div></div>';
  var p1extra='', p2extra='';
  if (p1 && isHost && p1.socketId!==socket.id) p1extra='<div class="btn red" onclick="kickPlayer(\''+p1.socketId+'\')" style="padding:6px 0;min-height:32px;font-size:12px">踢出</div>';
  if (p2 && isHost && p2.socketId!==socket.id) p2extra='<div class="btn red" onclick="kickPlayer(\''+p2.socketId+'\')" style="padding:6px 0;min-height:32px;font-size:12px">踢出</div>';
  q('#app').innerHTML =
    '<div class="panel" style="text-align:center;margin:0">'+navHtml+'<div style="font-size:13px;color:#6b5540;margin-bottom:12px">'+ (pvp.roomName||'房间') +'</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">'+
      '<div class="paper" style="padding:14px;text-align:center;min-height:120px"><div style="font-size:34px;margin-bottom:4px">'+(p1&&p1.socketId===hostId?'👑':'')+charIcon1+'</div><div style="font-weight:1000;font-size:15px">'+p1Name+'</div><div style="font-size:11px;color:#6b5540;margin-top:3px">'+(p1&&p1.socketId===hostId?'房主':'')+'</div>'+p1extra+'</div>'+
      '<div class="paper" style="padding:14px;text-align:center;min-height:120px"><div style="font-size:34px;margin-bottom:4px">'+(p2&&p2.socketId===hostId?'👑':'')+charIcon2+'</div><div style="font-weight:1000;font-size:15px">'+p2Name+'</div><div style="font-size:11px;color:#6b5540;margin-top:3px">'+(p2&&p2.socketId===hostId?'房主':'')+'</div>'+p2extra+'</div>'+
    '</div>'+
    (isHost ? (players.length>=2?'<button class="btn" id="pvpStartBtn" style="margin-bottom:8px;padding:14px 0">开始对局</button>':'<div class="btn disabled" style="margin-bottom:8px;padding:14px 0">等待玩家加入...</div>') : '<div style="text-align:center;color:#6b5540;font-size:14px;margin:8px 0">⏳ 等待房主开始对局...</div>')+
    '</div>';
  if (isHost) { const sb = q('#pvpStartBtn'); if (sb) sb.onclick = function(){ hostStartGame(); }; }
}
function leavePvPLobby() {
  socket.emit('leave_room'); pvp = null; setScreen('home');
}
function hostStartGame() {
  socket.emit('pvp_host_start');
  q('#pvpStartBtn').innerHTML = '等待确认...';
  q('#pvpStartBtn').className = 'btn disabled';
}
function joinRoom(roomId) {
  const eq = (state.equipped||[]).filter(function(id){ return state.skills[id]?.copies > 0; });
  if (eq.length < 2) return toast('请先在仓库准备2张功能牌');
  socket.emit('pvp_join_room', { roomId: roomId, skills: eq, name: CM[state.activeChar]?.name||'玩家' });
  const hm = q('#pvpHomeModal'); if (hm) hm.remove();
}
function kickPlayer(socketId) {
  socket.emit('pvp_kick_player', { roomId: pvp.roomId, targetSocketId: socketId });
}
function showQuickMatchModal() {
  if (!socket || !socket.connected) { pvpConnect(); return toast('正在连接服务器...'); }
  const eq = (state.equipped||[]).filter(function(id){return state.skills[id]?.copies > 0});
  if (eq.length < 2) return toast('请先在仓库准备2张功能牌');
  const name = CM[state.activeChar]?.name || '玩家';
  const old = q('#matchmakingModal'); if (old) old.remove();
  const m = document.createElement('div'); m.className = 'modal'; m.id = 'matchmakingModal';
  m.innerHTML = '<div class="modalBox" style="text-align:center"><div class="searchIcon" style="font-size:64px;animation:magnifySearch .8s ease-in-out infinite;display:inline-block;filter:drop-shadow(0 0 20px rgba(255,210,74,.5))">🔍</div><div class="title" style="color:#321707;margin-top:8px">正在匹配对手...</div><div class="searchTimer" id="matchmakingTimer" style="font-size:42px;font-weight:1000;color:#ff6b35;margin:6px 0;animation:searchPulse 1s ease-in-out infinite">5s</div><div class="muted" style="font-size:13px;margin-bottom:12px">5秒内匹配真人，超时则对战 AI</div><div class="btn dark" id="cancelMatchmakingBtn">取消</div></div>';
  document.body.appendChild(m);
  let cd = 5;
  const timerEl = q('#matchmakingTimer');
  window._matchCd = setInterval(function() {
    cd--;
    if (timerEl) timerEl.textContent = cd+'s';
    if (cd <= 0) { clearInterval(window._matchCd); window._matchCd = null; }
  }, 1000);
  q('#cancelMatchmakingBtn').onclick = cancelMatchmaking;
  socket.emit('quick_match', { skills: eq, name: name });
}
function cancelMatchmaking() {
  if (window._matchCd) { clearInterval(window._matchCd); window._matchCd = null; }
  socket.emit('quick_match_cancel');
  const m = q('#matchmakingModal'); if (m) m.remove();
}

function renderPvPBattle() {
  q('.screen').style.bottom='0'; q('#nav').style.display='none';
  q('#app').style.minHeight='calc(100vh - 50px)';
  if (!pvp || !pvp.serverState) return;
  const s = pvp.serverState, me = s.player, opp = s.opponent;
  const need = Math.max(1, PLAY_COUNTS[s.round-1] + (me.playBonus||0));
  const mySubmitted = s.submitted || pvp.mySubmitted;
  const oppSubmitted = s.opponentSubmitted || pvp.oppSubmitted;
  const isSelect = s.phase === 'select' && !mySubmitted;
  const isWait = s.phase === 'select' && mySubmitted;
  const isResult = s.phase === 'result';
  pvp.need = need;
  const sel = pvp.selected || [];
  let actionHtml = "";
  if (isSelect) {
    actionHtml = '<div class="actionArea"><div class="hint" style="margin:0 0 2px">请选择 '+need+' 张手牌　已选 '+sel.length+'/'+need+'<span style="float:right;color:#ff6b35;font-weight:1000;margin-right:4px" id="pvpTurnTimer">30s</span></div><div class="handScroll">'+sortCards(me.hand).map(function(c){return cardHtml(c,sel.includes(c.id)?'selected':'')}).join('')+'</div><div class="skillBar">'+Object.values(me.skills).map(function(sk){return skillButton(sk,false)}).join('')+'<button class="btn '+(sel.length===need?'':'disabled')+'" id="pvpPlayBtn">出牌</button></div></div>';
  } else if (isWait) {
    actionHtml = '<div class="actionArea" style="text-align:center;padding:20px;color:#6b5540">⏳ 等待对手出牌...</div>';
  } else if (isResult) {
    actionHtml = '<div class="actionArea" style="text-align:center"><div class="btn" id="pvpNextBtn" style="margin:6px auto">'+(s.isOver?'查看结果':'下一局')+'</div></div>';
  }
  q('#app').innerHTML = '<div class="battleHeader">'+fighterHtml({...opp,hand:new Array(opp.handCount||0)},false)+'<div class="roundBar">第 '+s.round+'/5 局 🤠 联机对战</div></div><div class="battleTable">'+(isResult&&s.last?'<div class="revealNotice">'+(s.last.winner==='tie'?'🤝 平局':(s.last.winner===pvp.side?'🎉 胜利':'💔 失败'))+'</div>':'')+'<div class="zoneTitle">对手出牌区</div><div class="cardRow">'+(opp.played&&opp.played.length?opp.played.map(function(c){return cardHtml(c,'smallCard thrust')}).join(''):'<span class="muted">'+(oppSubmitted?'对手已出牌':'等待出牌')+'</span>')+'</div><div class="community"><div class="cardRow">'+s.community.map(function(c){return cardHtml(c,'large')}).join('')+'</div></div><div class="zoneTitle">我方出牌区</div><div class="cardRow">'+(me.played&&me.played.length?me.played.map(function(c){return cardHtml(c,'smallCard thrust')}).join(''):'<span class="muted">请选择手牌</span>')+'</div></div>'+actionHtml+'<div class="duelPlayerPanel">'+fighterHtml({...me,hand:me.hand},true)+'</div>';
  qa('.handScroll .playCard[data-id]').forEach(function(el){el.onclick=function(){pvpToggleSelect(el.dataset.id)}});
  qa('.battleSkillCard:not(.used):not(.locked)').forEach(function(b){b.onclick=function(){pvpUseSkill(b.dataset.id)}});
  const pb = q('#pvpPlayBtn'); if (pb) pb.onclick = pvpSubmitPlay;
  const nb = q('#pvpNextBtn'); if (nb) nb.onclick = function(){if(s.isOver){showPvPGameOver(s);return}socket.emit('next_round');toast('等待对手确认...')};
  // 30s turn countdown (PvP)
  if(isSelect&&!window._pvpTurnTimer){
    var t=30,el2=q('#pvpTurnTimer');
    window._pvpTurnTimer=setInterval(function(){
      t--;if(el2)el2.textContent=t+'s';
      if(t<=0){clearInterval(window._pvpTurnTimer);window._pvpTurnTimer=null;
        if(pvp&&pvp.phase==='battle'&&s.phase==='select'&&!pvp.mySubmitted){
          var need2=pvp.need||Math.max(1,PLAY_COUNTS[s.round-1]+(me.playBonus||0));
          var best=chooseBest(me.hand,need2,me.buff||0);
          pvp.selected=best.map(function(c){return c.id});
          renderPvPBattle();setTimeout(pvpSubmitPlay,300);
        }}
    },1000);
  }
  if(!isSelect&&window._pvpTurnTimer){clearInterval(window._pvpTurnTimer);window._pvpTurnTimer=null}
}

function pvpToggleSelect(id) {
  const s = pvp?.serverState;
  if (!s) return;
  if (s.phase !== 'select') return toast('当前不是出牌阶段');
  if (s.submitted || pvp.mySubmitted) return;
  const need = pvp.need || Math.max(1, PLAY_COUNTS[s.round-1] + (s.player.playBonus||0));
  const i = pvp.selected.indexOf(id);
  if (i >= 0) pvp.selected.splice(i, 1);
  else { if (pvp.selected.length >= need) return toast('只能出 '+need+' 张'); pvp.selected.push(id); }
  renderPvPBattle();
}

function pvpSubmitPlay() {
  if (window._pvpTurnTimer) { clearInterval(window._pvpTurnTimer); window._pvpTurnTimer = null; }
  const s = pvp?.serverState;
  if (!s) return toast('游戏状态未就绪');
  if (s.phase !== 'select') return toast('当前不是出牌阶段');
  if (pvp.mySubmitted) return toast('已出牌，等待对手...');
  const need = pvp.need;
  if (!pvp.selected || pvp.selected.length !== need) return toast('需要选择 '+need+' 张');
  socket.emit('submit_play', { selected: pvp.selected });
  pvp.mySubmitted = true; toast('已出牌，等待对手...');
}

function pvpUseSkill(id) {
  const s = pvp?.serverState;
  if (!s || s.phase !== 'select') return toast('当前不能使用');
  const me = s.player, sk = me.skills[id];
  if (!sk || sk.used) return toast('已使用');
  if (me.skillUses >= 2) return toast('每回合最多2张');
  if (needsCardSelected(id)) {
    if (!pvp.selected || pvp.selected.length < 1) return toast('请先选一张手牌再使用此技能');
    socket.emit('use_skill', { skillId: id, selected: pvp.selected });
  } else {
    socket.emit('use_skill', { skillId: id });
  }
}

function showPvPResult(d) {
  const m = document.createElement('div'); m.className = 'resultBanner';
  const pWin = d.winner === pvp?.side;
  const title = d.winner === 'tie' ? '🤝 平局' : (pWin ? '🎉 本局胜利' : '💔 本局失败');
  m.innerHTML = '<div class="resultBox"><div class="resultTitle" style="font-size:22px;margin-bottom:6px">'+title+'</div><div class="resultVLayout"><div class="resultSide'+(d.winner==='opp'?' resultWin':'')+'"><div class="resultHandName">'+(d.oe?.name||'未知')+'</div><div class="resultCardRow">'+cardsHtml(d.oe?.cards||[],'smallCard')+'</div></div><div class="resultVS"><img class="resultVSImg" src="assets/ui_vs_badge_cutout.png" alt="VS"></div><div class="resultSide'+(d.winner==='player'?' resultWin':'')+'"><div class="resultHandName">'+(d.pe?.name||'未知')+'</div><div class="resultCardRow">'+cardsHtml(d.pe?.cards||[],'smallCard')+'</div></div></div><div class="resultDmg">'+(d.winner==='tie'?'平局不扣血':(pWin?'对手 -1❤️':'你 -1❤️'))+'</div><div class="grid2" style="margin-top:8px"><div class="btn dark" onclick="if(window._pvpRoundCd){clearInterval(window._pvpRoundCd);window._pvpRoundCd=null}this.parentElement.parentElement.parentElement.remove();surrenderPvP()">投降</div><div class="btn" onclick="if(window._pvpRoundCd){clearInterval(window._pvpRoundCd);window._pvpRoundCd=null}this.parentElement.parentElement.parentElement.remove();socket.emit(\'next_round\');toast(\'等待对手确认...\')">'+(d.isOver?'结算':'下一局')+'</div></div></div>';
  document.body.appendChild(m);
  // 5s auto-advance countdown (PvP)
  if (!d.isOver) {
    var nBtn = m.querySelector('.grid2 .btn:last-child'), cd = 5;
    if (nBtn) nBtn.textContent = '下一局 ('+cd+'s)';
    window._pvpRoundCd = setInterval(function() {
      cd--;
      if (nBtn) nBtn.textContent = '下一局 ('+cd+'s)';
      if (cd <= 0) {
        clearInterval(window._pvpRoundCd);
        window._pvpRoundCd = null;
        if (m.parentNode) { m.remove(); socket.emit('next_round'); toast('等待对手确认...'); }
      }
    }, 1000);
  }
}

function showPvPInspect(hand) {
  let m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = '<div class="modalBox"><div class="title" style="color:#321707">🔍 对手手牌</div><div class="cardRow">'+sortCards(hand).map(function(c){return cardHtml(c,'smallCard')}).join('')+'</div><div class="btn" id="closePvpInsp" style="margin-top:10px">知道了</div></div>';
  document.body.appendChild(m);
  q('#closePvpInsp').onclick = function(){ m.remove(); };
  m.onclick = function(e){ if (e.target === m) m.remove(); };
}
function showPvPGameOver(d) {
  q('.screen').style.bottom=''; q('#nav').style.display='';
  pvp = null;
  const win = d.win;
  state.total = (state.total || 0) + 1;
  if (win) state.wins = (state.wins || 0) + 1;
  state.coins = (state.coins || 0) + (win ? 200 : 60);
  state.gems = (state.gems || 0) + (win ? 8 : 3);
  state.chest = Math.min(10, (state.chest || 0) + (win ? 2 : 1));
  state.history = state.history || [];
  state.history.unshift({ win: win, score: (d.roundWins?.player||0)+':'+(d.roundWins?.opp||0), time: Date.now(), mode: 'pvp' });
  save();
  const m = document.createElement('div'); m.className = 'resultBanner';
  m.innerHTML = '<div class="resultBox"><div class="resultTitle" style="font-size:26px">'+(win?'🏆 对战胜利':'💔 对战失败')+'</div><div class="finalScore">'+(d.roundWins?.player||0)+' : '+(d.roundWins?.opp||0)+'</div><div style="margin:8px 0;font-size:15px;font-weight:1000">获得：<span class="ci">🪙</span>'+(win?200:60)+' 💎'+(win?8:3)+'</div><div class="grid2" style="margin-top:12px"><div class="btn" onclick="this.closest(\'.resultBanner\').remove();socket.emit(\'pvp_rematch\');">再来一把</div><div class="btn dark" onclick="this.closest(\'.resultBanner\').remove();socket.emit(\'leave_room\');setScreen(\'home\')">回到主页</div></div></div>';
  document.body.appendChild(m);
}
function showPvPConfirm(d) {
  if (!pvp) return;
  const old = q('#pvpConfirmModal'); if (old) old.remove();
  const m = document.createElement('div'); m.className = 'modal'; m.id = 'pvpConfirmModal';
  m.innerHTML = '<div class="modalBox" style="text-align:center"><div class="title" style="color:#321707">⚔️ 准备开战</div><p style="color:#6b5540;margin:10px 0">房主已发起开战，是否确认？</p><div class="grid2"><button class="btn" id="pvpConfirmBtn">确认</button><button class="btn red" id="pvpDeclineBtn">退出</button></div></div>';
  document.body.appendChild(m);
  q('#pvpConfirmBtn').onclick = function(){ socket.emit('pvp_confirm_ready'); q('#pvpConfirmBtn').innerHTML = '已确认'; q('#pvpConfirmBtn').className = 'btn disabled'; };
  q('#pvpDeclineBtn').onclick = function(){ socket.emit('pvp_decline'); m.remove(); if (pvp) { pvp = null; setScreen('home'); } };
}

async function initApp() {
  preloadAssets();
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    try {
      const d = await api('/load');
      if (d && d.user) {
        currentUser = d.user;
        const gd = d.game_data || {};
        if (Object.keys(gd).length > 0) state = { ...initState(), ...gd };
        else {
          // Server data empty — try localStorage fallback for existing users
          const localData = loadLocalData();
          if (localData) { state = localData; try { await api('/save', { method: 'PUT', body: JSON.stringify({ game_data: state, total_games: state.total || 0, wins: state.wins || 0 }) }); } catch(e) {} }
          else { state = initState(); }
        }
        if (d.total_games !== undefined) state.total = d.total_games;
        if (d.wins !== undefined) state.wins = d.wins;
        checkDailyReset(); ensureDefaults(); save(); render('home'); pvpConnect();
        return;
      }
    } catch(e) { /* token invalid or server down */ }
    localStorage.removeItem(TOKEN_KEY);
  }
  // No token — must login
  state = initState(); save();
  showAuthModal();
}
initApp();
document.querySelector('.phone')?.addEventListener('touchmove',function(e){if(!e.target.closest('.screen,.modal,.modalBox,.chatBody'))e.preventDefault()},{passive:false});
document.addEventListener('click',function(){hideSkillDetail()});
function showSkillDetail(id,btn){
  var s=SM[id];if(!s)return;
  if(!btn){
    var m=document.createElement('div');m.className='modal';
    m.innerHTML='<div class="modalBox"><div class="title" style="color:#321707;margin-bottom:8px">'+s.icon+' '+s.name+'</div><div class="small muted" style="margin-bottom:6px">'+s.tier+' · '+s.type+'</div><div style="font-size:14px;line-height:1.6;color:#2a1607">'+s.effect+'</div><div class="btn" style="margin-top:12px" id="closeDetail">知道了</div></div>';
    document.body.appendChild(m);
    q('#closeDetail').onclick=function(){m.remove()};
    m.onclick=function(e){if(e.target===m)m.remove()};
    return;
  }
  var div=document.getElementById('skillDetail')||document.body.appendChild(Object.assign(document.createElement('div'),{id:'skillDetail',className:'skillDetailPopup'}));
  div.innerHTML='<b>'+s.name+'</b>'+s.tier+' · '+s.type+'<br><br>'+s.effect;
  div.style.display='block';
  var r=btn.closest('.skillCard').getBoundingClientRect();
  var pw=Math.min(220,window.innerWidth-8);
  var ph=div.offsetHeight||80;
  var left=Math.max(4,Math.min(window.innerWidth-pw-4,r.left+r.width/2-pw/2));
  var top=r.top-ph-8;
  if(top<4){top=r.bottom+8;if(top+ph>window.innerHeight-4)top=Math.max(4,window.innerHeight-ph-4)}
  div.style.left=left+'px';div.style.top=top+'px';div.style.maxWidth=pw+'px';
}
function hideSkillDetail(){var div=document.getElementById('skillDetail');if(div)div.style.display='none'}
// === Chat functions ===
function sendChat() {
  if (!socket || !socket.connected) { pvpConnect(); toast('连接中...'); return; }
  const input = q('#chatInput'); if (!input) return;
  const text = input.value.trim(); if (!text) return;
  socket.emit('chat_message', { name: getChatName(), text });
  input.value = '';
}
function toggleChat() {
  const body = q('#chatBody'); const badge = q('#chatBadge');
  if (!body) return;
  body.classList.toggle('collapsed');
  const toggle = q('#chatToggle');
  if (toggle) toggle.textContent = body.classList.contains('collapsed') ? '▸' : '▾';
  if (badge) badge.classList.add('hidden');
}
function scrollChat() {
  const el = q('#chatMsgs'); if (el) el.scrollTop = el.scrollHeight;
}
function chatMsgHtml(m) {
  const t = m.time ? new Date(m.time).toLocaleTimeString().slice(0,5) : '';
  return '<div class="chatMsg"><span class="chatName">' + esc(m.name) + '</span><span class="chatText">' + esc(m.text) + '</span><span class="chatTime">' + t + '</span></div>';
}
function esc(s) { return (s || '').replace(/[<>&]/g, function(c) { return {'<':'&lt;','>':'&gt;','&':'&amp;'}[c]; }); }

