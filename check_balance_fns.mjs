import fs from 'fs';
const code = fs.readFileSync('check_temp.js', 'utf8');
const funcs = ['renderBattle', 'fighterHtml', 'submitPlay', 'resolveRound', 'nextRound', 'fetchLeaderboard'];
for (const fn of funcs) {
  const re = new RegExp('function ' + fn + '\\([^)]*\\)\\{');
  const m = code.match(re);
  if (!m) { console.log(fn + ': NOT FOUND'); continue; }
  const start = m.index;
  let depth = 0, inStr = false, inTmpl = false, strChar = null, end = -1;
  for (let i = start; i < code.length; i++) {
    const c = code[i], p = i > 0 ? code[i-1] : '';
    if (inTmpl) { if (c === '`' && p !== '\\') inTmpl = false; continue; }
    if (inStr) { if (c === strChar && p !== '\\') inStr = false; continue; }
    if (c === '`' && p !== '\\') { inTmpl = true; continue; }
    if (c === '"' || c === "'") { inStr = true; strChar = c; continue; }
    if (c === '{') depth++;
    if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  const body = code.substring(start, end+1);
  let b = 0;
  for (const ch of body) { if (ch === '{') b++; if (ch === '}') b--; }
  console.log(fn + ': brace diff=' + b + ' length=' + body.length);
  if (b !== 0) {
    // Find approximate position of imbalance
    let d = 0;
    for (let i = 0; i < body.length; i++) {
      if (body[i] === '{') d++;
      if (body[i] === '}') d--;
    }
    console.log('  Imbalance detected');
  }
}
