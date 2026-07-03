// Shared game logic — extracted from poker-west-h5.html
const SUITS = ['♠', '♥', '♦', '♣'];
const PLAY_COUNTS = [3, 3, 3, 4, 5];
const HAND_LIMIT = 7;
let uid = 1;

const SKILLS = [
  { id: 'fivejoker', tier: 'T0', icon: '🃏', name: '5-Joker', type: '策略', effect: '前4回合抽1张；第5回合抽Joker百搭' },
  { id: 'magician', tier: 'T0', icon: '🎩', name: '魔术师', type: '复制', effect: '复制一张自己手牌' },
  { id: 'thief', tier: 'T0', icon: '🕵️', name: '神偷', type: '偷取', effect: '偷一张对方手牌' },
  { id: 'fate', tier: 'T0', icon: '✨', name: '命运一击', type: '转化', effect: '弃一张牌，获得同花色A' },
  { id: 'hacker', tier: 'T0', icon: '💻', name: '黑客', type: '复制', effect: '复制对手一张手牌' },
  { id: 'lucky', tier: 'T1', icon: '🍀', name: '幸运日', type: '增幅', effect: '本回合若打出顺子，视为同花顺' },
  { id: 'destroyer', tier: 'T1', icon: '🧩', name: '破坏专家', type: '干扰', effect: '随机弃掉对手2张手牌' },
  { id: 'glove', tier: 'T1', icon: '🧤', name: '白手套', type: '复制', effect: '复制一张公共牌到手牌' },
  { id: 'burst', tier: 'T1', icon: '⏫', name: '提前爆发', type: '额外', effect: '本回合可以多打1张牌' },
  { id: 'god', tier: 'T1', icon: '🎲', name: '赌神', type: '抽牌', effect: '随机获得A/K/Q一张' },
  { id: 'plusminus', tier: 'T2', icon: '➕', name: '加一减一', type: '调整', effect: '选择一张手牌点数+1或-1' },
  { id: 'intel', tier: 'T2', icon: '📋', name: '情报员', type: '选抽', effect: '额外抽2张，选1张加入手牌' },
  { id: 'inspect', tier: 'T2', icon: '🔍', name: '我要验牌', type: '信息', effect: '查看对方当前全部手牌' },
  { id: 'recycle', tier: 'T2', icon: '♻️', name: '回收', type: '回收', effect: '从弃牌记录取回1张曾打出的牌' },
  { id: 'lock', tier: 'T2', icon: '🔒', name: '封锁', type: '干扰', effect: '对手本回合少打一张牌' },
  { id: 'shuffle', tier: 'T3', icon: '🔀', name: '洗牌师', type: '置换', effect: '弃1张手牌，抽2张新牌' },
  { id: 'rogue', tier: 'T3', icon: '🔁', name: '交换师', type: '交换', effect: '选1张手牌与对方随机1张交换' },
  { id: 'gambler', tier: 'T2', icon: '🎲', name: '幸运赌徒', type: '随机', effect: '60%额外抽3张，否则弃1张手牌' },
  { id: 'flushbeliever', tier: 'T2', icon: '♠️', name: '同花信徒', type: '预支', effect: '本回合若打出同花组合，下回合额外抽2张' },
  { id: 'delay', tier: 'T2', icon: '⏳', name: '拖延', type: '干扰', effect: '令对手下回合少抽1张牌' },
  { id: 'bomb', tier: 'T2', icon: '🌀', name: '扰乱', type: '干扰', effect: '随机弃掉对方1张手牌' },
  { id: 'charge', tier: 'T3', icon: '⚡', name: '蓄力', type: '策略', effect: '本回合少打一张，下回合多打一张' }
];
const SM = Object.fromEntries(SKILLS.map(s => [s.id, s]));

const AI_W = {
  fivejoker: { o: 2, d: 0, u: 8 }, magician: { o: 5, d: 0, u: 4 }, thief: { o: 6, d: 3, u: 3 },
  fate: { o: 6, d: 1, u: 3 }, hacker: { o: 6, d: 0, u: 5 }, lucky: { o: 5, d: 1, u: 5 },
  destroyer: { o: 0, d: 9, u: 2 }, glove: { o: 4, d: 0, u: 6 }, burst: { o: 9, d: 0, u: 0 },
  god: { o: 7, d: 0, u: 3 }, plusminus: { o: 3, d: 0, u: 7 }, intel: { o: 3, d: 0, u: 7 },
  inspect: { o: 1, d: 1, u: 8 }, recycle: { o: 3, d: 1, u: 5 }, lock: { o: 0, d: 9, u: 2 },
  shuffle: { o: 4, d: 2, u: 5 }, rogue: { o: 5, d: 4, u: 3 }, gambler: { o: 6, d: 0, u: 0 },
  flushbeliever: { o: 4, d: 1, u: 4 }, delay: { o: 2, d: 7, u: 3 }, bomb: { o: 2, d: 6, u: 3 },
  charge: { o: 3, d: 0, u: 5 }
};

const CHARS = [
  { id: 'cowboy', icon: '🌟', name: '牛仔', rarity: '普通', effect: '金币收益 +5%起，每级额外+2%' },
  { id: 'sheriff', icon: '🛡️', name: '守护队长', rarity: '稀有', effect: '胜利额外钻石 +2💎起，每级+1💎' },
  { id: 'lily', icon: '🎀', name: '幸运莉莉', rarity: '史诗', effect: '宝箱进度加速，每级+1进度' },
  { id: 'miner', icon: '💎', name: '宝石收藏家', rarity: '传说', effect: '抽卡折扣 5%起，每级折扣+3%' }
];

// === Card utilities ===
function newDeck() {
  let d = [];
  for (const s of SUITS)
    for (let r = 2; r <= 14; r++)
      d.push({ id: 'c' + uid++, rank: r, suit: s });
  return shuffle(d);
}
function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function draw(deck, n) {
  let out = [];
  while (n-- > 0) {
    if (!deck.length) deck.push(...newDeck());
    out.push(deck.pop());
  }
  return out;
}
function clone(c) { return { ...c, id: 'c' + uid++ }; }
function rankText(r) { return r === 14 ? 'A' : r === 13 ? 'K' : r === 12 ? 'Q' : r === 11 ? 'J' : r === 10 ? '10' : String(r); }
function sortCards(arr) { return [...arr].sort((a, b) => (b.rank - a.rank) || SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit)); }
function cloneArr(arr) { return arr.map(c => ({ ...c })); }

// === Fighter factory ===
function makeFighter(name, char, skillIds, hand) {
  return {
    name, char: char || CHARS[0], hp: 3, hand, played: [], discard: [],
    skillDeck: skillIds.map(id => SM[id]),
    skills: Object.fromEntries(skillIds.map(id => [id, { id, charge: 1, used: false }])),
    skillUses: 0, buff: {}, playBonus: 0, nextPlayBonus: 0, nextDrawBonus: 0,
    nextDrawPenalty: 0, locked: false, revealed: false
  };
}

// === Hand evaluation ===
function combos(arr, k) {
  let out = [];
  function rec(start, cur) {
    if (cur.length === k) { out.push(cur.slice()); return; }
    for (let i = start; i < arr.length; i++) rec(i + 1, cur.concat(arr[i]));
  }
  rec(0, []);
  return out;
}

function evaluate(cards, buff = {}) {
  let js = cards.filter(c => c.joker);
  if (js.length) {
    let best = null;
    for (const r of [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
      for (const s of SUITS) {
        let rep = cards.map(c => c.joker ? { ...c, rank: r, suit: s, joker: false } : c);
        let ev = evaluate(rep, buff);
        if (!best || compare(ev.score, best.score) > 0) best = ev;
      }
    return best;
  }
  let best = null;
  for (const cb of combos(cards, 5)) {
    let ev = evaluateNoJoker(cb, buff);
    if (!best || compare(ev.score, best.score) > 0) best = ev;
  }
  return best || evaluateNoJoker(cards, buff);
}

function evaluateNoJoker(cs, buff = {}) {
  cs = [...cs].sort((a, b) => b.rank - a.rank);
  let ranks = cs.map(c => c.rank), counts = {};
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
  let groups = Object.entries(counts).map(([r, n]) => ({ r: +r, n })).sort((a, b) => b.n - a.n || b.r - a.r);
  let flush = cs.length >= 5 && cs.every(c => c.suit === cs[0].suit);
  let uniq = [...new Set(ranks)].sort((a, b) => b - a);
  if (uniq.includes(14)) uniq.push(1);
  let straightHigh = 0;
  for (let i = 0; i <= uniq.length - 5; i++) {
    let seq = uniq.slice(i, i + 5);
    if (seq[0] - seq[4] === 4) { straightHigh = seq[0]; break; }
  }
  let straight = !!straightHigh;
  if (buff.lucky && straight) return { name: '同花顺（幸运日）', cat: 8, score: [8, straightHigh], cards: cs };
  if (flush && straight && straightHigh === 14) return { name: '皇家同花顺', cat: 9, score: [9, 14], cards: cs };
  if (flush && straight) return { name: '同花顺', cat: 8, score: [8, straightHigh], cards: cs };
  if (groups[0]?.n === 4) return { name: '四条', cat: 7, score: [7, groups[0].r, ...ranks.filter(r => r !== groups[0].r)], cards: cs };
  if (groups[0]?.n === 3 && groups[1]?.n >= 2) return { name: '葫芦', cat: 6, score: [6, groups[0].r, groups[1].r], cards: cs };
  if (flush) return { name: '同花', cat: 5, score: [5, ...ranks], cards: cs };
  if (straight) return { name: '顺子', cat: 4, score: [4, straightHigh], cards: cs };
  if (groups[0]?.n === 3) return { name: '三条', cat: 3, score: [3, groups[0].r, ...ranks.filter(r => r !== groups[0].r)], cards: cs };
  if (groups[0]?.n === 2 && groups[1]?.n === 2) {
    let ps = groups.filter(g => g.n === 2).map(g => g.r).sort((a, b) => b - a);
    return { name: '两对', cat: 2, score: [2, ...ps, ...ranks.filter(r => !ps.includes(r))], cards: cs };
  }
  if (groups[0]?.n === 2) return { name: '一对', cat: 1, score: [1, groups[0].r, ...ranks.filter(r => r !== groups[0].r)], cards: cs };
  return { name: '高牌', cat: 0, score: [0, ...ranks], cards: cs };
}

function compare(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    let d = (a[i] || 0) - (b[i] || 0);
    if (d) return d;
  }
  return 0;
}

// === AI ===
function handCat(hand, community) {
  return evaluate([...hand, ...community], {}).cat;
}

function aiPickSkill(sit, avail, phase, diff = 1, oppHp, playerHp, round) {
  var isDesp = oppHp <= 1;
  var isLead = playerHp <= 1;
  var isLate = round >= 4;
  var cand = [];
  for (var i = 0; i < avail.length; i++) {
    var id = avail[i].id, w = AI_W[id];
    if (!w) continue;
    var sc = 0;
    if (phase === 'start') {
      sc = w.u * 4 + (isDesp ? w.d * 3 : w.d) + (isLead ? w.o * 4 : w.o) + (isLate ? w.o * 3 : w.u * 2);
    } else {
      sc = w.o * 3 + (isDesp ? w.u * 2 : 0) + (isLead ? w.d * 8 : w.d * 3) + (isLate ? w.o * 3 : w.u);
    }
    sc *= 0.7 + Math.random() * 0.6;
    cand.push({ id, sc });
  }
  if (!cand.length) return null;
  cand.sort(function (a, b) { return b.sc - a.sc; });
  var rate = [0.55, 0.78, 0.95][diff];
  return Math.random() < rate ? cand[0].id : null;
}

function chooseBest(hand, n, community, buff) {
  let best = null, bestScore = null;
  for (const cb of combos(hand, n)) {
    let ev = evaluate([...cb, ...community], { ...buff, played: cb });
    if (!bestScore || compare(ev.score, bestScore) > 0) { best = cb; bestScore = ev.score; }
  }
  return best || hand.slice(0, n);
}

// === Skill application ===
function applySkill(side, id, battle, selectedCards) {
  let a = battle[side], e = battle[side === 'player' ? 'opp' : 'player'];
  let own = side === 'player' ? '我方' : '对手', opp = side === 'player' ? '对手' : '我方';
  let logs = [];
  const add = (...cs) => { a.hand.push(...cs); };
  const discard = (target, cards) => {
    for (const c of cards) {
      let i = target.hand.indexOf(c);
      if (i >= 0) { target.hand.splice(i, 1); target.discard.push(c); }
    }
  };

  switch (id) {
    case 'fivejoker':
      if (battle.round === 5) {
        add({ id: 'c' + uid++, rank: 15, suit: '★', joker: true });
        add(...draw(battle.deck, 1));
        logs.push(`${own}获得Joker百搭牌并额外抽1张`);
      } else { add(...draw(battle.deck, 1)); logs.push(`${own}抽1张牌`); }
      break;
    case 'magician': {
      // Use selected card if provided, otherwise copy highest
      let target = (selectedCards && selectedCards.length) ? a.hand.find(c => selectedCards.includes(c.id)) : sortCards(a.hand)[0];
      if (target) { add(clone(target)); logs.push(`${own}复制 ${rankText(target.rank)}${target.suit}`); }
      break;
    }
    case 'thief':
      if (e.hand.length) {
        let c = e.hand.splice(Math.floor(Math.random() * e.hand.length), 1)[0];
        add(c); logs.push(`${own}偷走${opp}1张手牌`);
      }
      break;
    case 'fate': {
      let c = (selectedCards && selectedCards.length) ? a.hand.find(x => selectedCards.includes(x.id)) : sortCards(a.hand).slice(-1)[0];
      if (c) {
        discard(a, [c]);
        add({ id: 'c' + uid++, rank: 14, suit: c.suit });
        logs.push(`${own}将 ${rankText(c.rank)}${c.suit} 转化为A${c.suit}`);
      }
      break;
    }
    case 'hacker':
      if (e.hand.length) {
        let c = e.hand[Math.floor(Math.random() * e.hand.length)];
        add(clone(c)); logs.push(`${own}复制${opp}1张手牌`);
      }
      break;
    case 'lucky':
      a.buff.lucky = true; logs.push(`${own}本回合顺子将视为同花顺`);
      break;
    case 'destroyer': {
      let ds = shuffle(e.hand).slice(0, 2);
      discard(e, ds); logs.push(`${own}随机弃掉${opp}${ds.length}张手牌`);
      break;
    }
    case 'glove': {
      let c = clone(battle.community[Math.floor(Math.random() * battle.community.length)]);
      add(c); logs.push(`${own}复制公共牌 ${rankText(c.rank)}${c.suit}`);
      break;
    }
    case 'burst': a.playBonus += 1; logs.push(`${own}本回合可以多打1张牌`); break;
    case 'god': {
      let r = [12, 13, 14][Math.floor(Math.random() * 3)], s = SUITS[Math.floor(Math.random() * 4)];
      add({ id: 'c' + uid++, rank: r, suit: s });
      logs.push(`${own}获得 ${rankText(r)}${s}`);
      break;
    }
    case 'plusminus': {
      let c = (selectedCards && selectedCards.length) ? a.hand.find(x => selectedCards.includes(x.id)) : sortCards(a.hand).slice(-1)[0];
      if (c) { let old = c.rank; c.rank = c.rank < 14 ? c.rank + 1 : c.rank - 1; logs.push(`${own}调整 ${rankText(old)}${c.suit} → ${rankText(c.rank)}${c.suit}`); }
      break;
    }
    case 'intel': {
      let cards = draw(battle.deck, 2), keep = sortCards(cards)[0];
      add(keep);
      if (cards[1] !== keep) battle.deck.push(cards[1]);
      logs.push(`${own}抽2选1，保留 ${rankText(keep.rank)}${keep.suit}`);
      break;
    }
    case 'inspect': e.revealed = true; logs.push(`${own}查看了${opp}全部手牌`); break;
    case 'recycle': {
      let recent = a.discard.slice(-1);
      if (recent.length) { add(clone(recent[0])); logs.push(`${own}回收 ${rankText(recent[0].rank)}${recent[0].suit}`); }
      else { add(...draw(battle.deck, 1)); logs.push(`${own}无牌可回收，改为抽1张`); }
      break;
    }
    case 'lock': e.locked = true; e.playBonus -= 1; logs.push(`${opp}本回合少打一张牌`); break;
    case 'shuffle': {
      let c = (selectedCards && selectedCards.length) ? a.hand.find(x => selectedCards.includes(x.id)) : sortCards(a.hand).slice(-1)[0];
      if (c) { discard(a, [c]); add(...draw(battle.deck, 2)); logs.push(`${own}弃 ${rankText(c.rank)}${c.suit}，抽2张`); }
      break;
    }
    case 'rogue':
      if (a.hand.length && e.hand.length) {
        let c1 = (selectedCards && selectedCards.length) ? a.hand.find(x => selectedCards.includes(x.id)) : a.hand[0];
        if (!c1) c1 = a.hand[0];
        let c2 = e.hand[Math.floor(Math.random() * e.hand.length)];
        a.hand[a.hand.indexOf(c1)] = c2;
        e.hand[e.hand.indexOf(c2)] = c1;
        logs.push(`${own}与${opp}交换1张牌`);
      }
      break;
    case 'gambler':
      if (Math.random() < .60) { add(...draw(battle.deck, 3)); logs.push(`${own}幸运赌徒成功，抽3张`); }
      else if (a.hand.length) { let c = a.hand[Math.floor(Math.random() * a.hand.length)]; discard(a, [c]); logs.push(`${own}幸运赌徒失败，弃1张`); }
      break;
    case 'flushbeliever': a.buff.flushBeliever = true; logs.push(`${own}激活同花信徒`); break;
    case 'delay': e.nextDrawPenalty = (e.nextDrawPenalty || 0) + 1; logs.push(`${opp}下回合少抽1张`); break;
    case 'bomb':
      if (e.hand.length) { let c = e.hand[Math.floor(Math.random() * e.hand.length)]; discard(e, [c]); logs.push(`${own}扰乱${opp}1张手牌`); }
      break;
    case 'charge': a.playBonus -= 1; a.nextPlayBonus = (a.nextPlayBonus || 0) + 1; logs.push(`${own}蓄力：本回合少打1张，下回合多打1张`); break;
  }
  return logs;
}

// === Battle creation ===
function createBattle(playerSkills, oppSkills, difficulty = 1) {
  uid = 1;
  let deck = newDeck();
  let community = draw(deck, 3);
  let diff = Math.min(2, Math.max(0, difficulty));

  let oppPool = diff >= 2
    ? SKILLS.filter(s => s.tier !== 'T3')
    : diff <= 0
      ? SKILLS.filter(s => s.tier !== 'T0')
      : SKILLS;
  let oSkills = shuffle(oppPool).slice(0, 2).map(s => s.id);

  return {
    round: 1, phase: 'select', deck, community,
    selected: { player: [], opp: [] },
    logs: [], last: null,
    roundWins: { player: 0, opp: 0 },
    mode: 'pve', difficulty: diff,
    player: makeFighter('你', CHARS[0], playerSkills, draw(deck, 7)),
    opp: makeFighter('对手', CHARS[Math.floor(Math.random() * CHARS.length)], oSkills, draw(deck, 7)),
    submitted: { player: false, opp: false },
    ready: { player: false, opp: false }
  };
}

// === PvP Battle creation ===
function createPvPBattle(deck, playerSkills, oppSkills, playerName, oppName) {
  let community = draw(deck, 3);
  return {
    round: 1, phase: 'lobby', deck, community,
    selected: { player: [], opp: [] },
    logs: [], last: null,
    roundWins: { player: 0, opp: 0 },
    mode: 'pvp', difficulty: 1,
    player: makeFighter(playerName, CHARS[0], playerSkills, draw(deck, 7)),
    opp: makeFighter(oppName, CHARS[1], oppSkills, draw(deck, 7)),
    submitted: { player: false, opp: false },
    ready: { player: false, opp: false }
  };
}

// === Round execution ===
function executeRound(battle) {
  let p = battle.player, o = battle.opp;

  // Only run AI if not already executed by processAITurn
  if (!battle.submitted.opp) {
    // Opponent AI actions
    let oppAvail = Object.values(o.skills).filter(s => !s.used);
    if (oppAvail.length) {
      let cat = handCat(o.hand, battle.community);
      if (cat < 4 || Math.random() < 0.35) {
        let id = aiPickSkill('start', oppAvail, 'start', battle.difficulty, o.hp, p.hp, battle.round);
        if (id) {
          let sk = o.skills[id];
          if (sk && !sk.used) {
            sk.used = true; sk.charge = 0;
            let logs = applySkill('opp', id, battle);
            battle.logs.push(...logs);
          }
        }
      }
    }

    // Opponent auto-select best cards
    let oppNeed = roundNeed('opp', battle);
    while (o.hand.length < oppNeed) o.hand.push(...draw(battle.deck, 1));
    let bestPlay = chooseBest(o.hand, oppNeed, battle.community, o.buff);
    o.played = bestPlay.map(c => ({ ...c }));
    o.hand = o.hand.filter(c => !bestPlay.includes(c));
    o.discard.push(...bestPlay);

    // Opponent play-phase skills
    let oppPlayAvail = Object.values(o.skills).filter(s => !s.used);
    if (oppPlayAvail.length) {
      let id = aiPickSkill('play', oppPlayAvail, 'play', battle.difficulty, o.hp, p.hp, battle.round);
      if (id && !o.skills[id]?.used) {
        o.skills[id].used = true; o.skills[id].charge = 0;
        let logs = applySkill('opp', id, battle);
        battle.logs.push(...logs);
      }
    }

    battle.submitted.opp = true;
  }

  // Evaluate
  let pe = evaluate([...p.played, ...battle.community], { ...p.buff, played: p.played });
  let oe = evaluate([...o.played, ...battle.community], { ...o.buff, played: o.played });
  let cmp = compare(pe.score, oe.score);
  let winner = cmp > 0 ? 'player' : cmp < 0 ? 'opp' : 'tie';
  let dmg = winner === 'tie' ? 0 : 1;

  battle.last = { winner, pEval: pe, oEval: oe, dmg };
  if (winner === 'player') { o.hp = Math.max(0, o.hp - dmg); battle.roundWins.player++; }
  else if (winner === 'opp') { p.hp = Math.max(0, p.hp - dmg); battle.roundWins.opp++; }

  // Flushbeliever check
  for (const f of [p, o]) {
    if (f.buff.flushBeliever && f.played.length > 0) {
      let sc = {};
      for (let ci = 0; ci < f.played.concat(battle.community).length; ci++) {
        let s = f.played.concat(battle.community)[ci].suit;
        sc[s] = (sc[s] || 0) + 1;
        if (sc[s] >= 3) {
          f.nextDrawBonus = (f.nextDrawBonus || 0) + 2;
          battle.logs.push(`${f === p ? '我方' : '对手'}同花信徒触发，下回合额外抽2张`);
          break;
        }
      }
    }
  }

  battle.phase = 'result';
  battle.logs.push(`本局结果：我方【${pe.name}】 vs 对手【${oe.name}】`);
  battle.submitted = { player: false, opp: false };
  return { winner, pe, oe, dmg };
}

function roundNeed(side, battle) {
  let f = battle[side];
  return Math.max(1, PLAY_COUNTS[battle.round - 1] + (f.playBonus || 0));
}

function isOver(battle) {
  return battle.player.hp <= 0 || battle.opp.hp <= 0 ||
    battle.round >= 5 || battle.roundWins.player >= 3 || battle.roundWins.opp >= 3;
}

function nextRound(battle) {
  battle.round++;
  for (const key of ['player', 'opp']) {
    let f = battle[key];
    let target = HAND_LIMIT + (f.nextDrawBonus || 0) - (f.nextDrawPenalty || 0);
    let n = Math.max(0, target - f.hand.length);
    f.hand.push(...draw(battle.deck, n));
    f.played = []; f.buff = {}; f.skillUses = 0;
    f.playBonus = f.nextPlayBonus || 0; f.nextPlayBonus = 0;
    f.nextDrawBonus = 0; f.nextDrawPenalty = 0; f.locked = false;
  }
  battle.phase = 'select';
  battle.submitted = { player: false, opp: false };
  battle.logs.push(`进入第${battle.round}局：基础打${PLAY_COUNTS[battle.round - 1]}张`);
}

// === Build safe state for client ===
function buildPlayerView(battle, forSide) {
  const oppSide = forSide === 'player' ? 'opp' : 'player';
  const p = battle[forSide];
  const o = battle[oppSide];
  const isOwner = forSide === 'player';

  return {
    side: forSide,
    roomId: battle.roomId,
    mode: battle.mode,
    round: battle.round,
    phase: battle.phase,
    roundWins: { player: battle.roundWins.player, opp: battle.roundWins.opp },
    last: battle.last ? {
      winner: battle.last.winner,
      pEval: battle.last[isOwner ? 'pEval' : 'oEval'],
      oEval: battle.last[isOwner ? 'oEval' : 'pEval'],
      dmg: battle.last.dmg
    } : null,
    community: battle.community,
    submitted: battle.submitted[forSide],
    opponentSubmitted: battle.submitted[oppSide],
    player: {
      name: p.name, char: p.char,
      hp: p.hp, hand: p.hand,
      played: p.played,
      skills: p.skills, buff: p.buff,
      locked: p.locked, playBonus: p.playBonus,
      nextPlayBonus: p.nextPlayBonus, nextDrawBonus: p.nextDrawBonus,
      nextDrawPenalty: p.nextDrawPenalty, skillUses: p.skillUses,
      skillDeck: p.skillDeck
    },
    opponent: {
      name: o.name, char: o.char,
      hp: o.hp, handCount: o.hand.length,
      hand: o.revealed ? o.hand : undefined,
      played: (battle.phase === 'result' || (battle.submitted.player && battle.submitted.opp)) ? o.played : [],
      skills: o.skills, buff: {},
      locked: o.locked, playBonus: o.playBonus,
      nextPlayBonus: o.nextPlayBonus,
      skillDeck: o.skillDeck
    },
    logs: [...battle.logs].slice(0, 50),
    isOver: isOver(battle)
  };
}

function resetUid() { uid = 1; }

module.exports = {
  SUITS, PLAY_COUNTS, HAND_LIMIT, SKILLS, SM, CHARS, AI_W,
  newDeck, shuffle, draw, clone, rankText, sortCards, cloneArr,
  makeFighter, combos, evaluate, evaluateNoJoker, compare,
  handCat, aiPickSkill, chooseBest, applySkill,
  createBattle, createPvPBattle, executeRound, roundNeed, isOver, nextRound,
  buildPlayerView, resetUid
};
