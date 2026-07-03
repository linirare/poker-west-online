import fs from 'fs';
const h = fs.readFileSync('server/client/index.html', 'utf8');
const i = h.indexOf('<script>');
const j = h.indexOf('</script>', i + 1);
const cur = h.substring(i + 8, j);

const h2 = fs.readFileSync('prev_version.html', 'utf8');
const i2 = h2.indexOf('<script>');
const j2 = h2.indexOf('</script>', i2 + 1);
const prev = h2.substring(i2 + 8, j2);

// Context-aware brace counter for a chunk
function braceDiff(code) {
  let depth = 0, inStr = false, inTmpl = false, strChar = null;
  for (let k = 0; k < code.length; k++) {
    const c = code[k], p = k > 0 ? code[k - 1] : '';
    if (inTmpl) { if (c === '`' && p !== '\\') inTmpl = false; continue; }
    if (inStr) { if (c === strChar && p !== '\\') inStr = false; continue; }
    if (c === '`' && p !== '\\') { inTmpl = true; continue; }
    if (c === '"' || c === "'") { inStr = true; strChar = c; continue; }
    if (c === '{') depth++;
    if (c === '}') depth--;
  }
  return depth;
}

// Find the first function where prev and cur have different brace counts
const funcs = ['SKILLS', 'HANDS_EX', 'showAchievements', 'fetchLeaderboard', 'checkDailyReset', 'mailItems', 'renderBattle', 'fighterHtml', 'cardHtml', 'cardBackHtml', 'toggleSelect', 'useSkill', 'applySkill', 'submitPlay', 'chooseBest', 'resolveRound', 'showRoundResult', 'isOver', 'nextRound', 'finishBattle'];

for (const fn of funcs) {
  const idxPrev = prev.indexOf('function ' + fn + '(');
  const idxCur = cur.indexOf('function ' + fn + '(');
  if (idxPrev === -1 && idxCur === -1) continue;

  // Find end of function by looking for next function
  let endPrev = prev.length;
  let endCur = cur.length;

  for (const other of funcs) {
    if (other === fn) continue;
    const op = prev.indexOf('function ' + other + '(', idxPrev + 1);
    if (op > idxPrev && op < endPrev) endPrev = op;
    const oc = cur.indexOf('function ' + other + '(', idxCur + 1);
    if (oc > idxCur && oc < endCur) endCur = oc;
  }

  if (idxPrev >= 0) {
    const chunk = prev.substring(idxPrev, endPrev);
    const bd = braceDiff(chunk.substring(chunk.indexOf('{')));
    console.log('PREV ' + fn + ': brace depth ending=' + bd);
  }
  if (idxCur >= 0) {
    const chunk = cur.substring(idxCur, endCur);
    const bd = braceDiff(chunk.substring(chunk.indexOf('{')));
    if (bd !== 0) {
      console.log('*** CUR ' + fn + ': brace depth ending=' + bd + ' ***');
      // Show function body
      const body = chunk.substring(chunk.indexOf('{'), chunk.length);
      console.log('Body (' + body.length + ' chars): ' + body.substring(0, 500));
    } else {
      console.log('CUR ' + fn + ': brace depth ending=' + bd);
    }
  }
}
