import fs from 'fs';
const h = fs.readFileSync('server/client/index.html', 'utf8');
const i = h.indexOf('<script>');
const j = h.indexOf('</script>', i + 1);
const cur = h.substring(i + 8, j);

const h2 = fs.readFileSync('prev_version.html', 'utf8');
const i2 = h2.indexOf('<script>');
const j2 = h2.indexOf('</script>', i2 + 1);
const prev = h2.substring(i2 + 8, j2);

// Find renderBattle in both
const idxPrev = prev.indexOf('function renderBattle(');
const idxCur = cur.indexOf('function renderBattle(');

// Find the next function after renderBattle in both
function findNextFn(code, start) {
  const funcs = ['function fighterHtml(', 'function cardHtml(', 'function submitPlay(', 'function resolveRound(', 'function nextRound('];
  let earliest = code.length;
  for (const fn of funcs) {
    const pos = code.indexOf(fn, start + 1);
    if (pos > start && pos < earliest) earliest = pos;
  }
  return earliest;
}

const endPrev = findNextFn(prev, idxPrev);
const endCur = findNextFn(cur, idxCur);

const bodyPrev = prev.substring(idxPrev, endPrev);
const bodyCur = cur.substring(idxCur, endCur);

// Context-aware brace counter
function describeBraces(code, label) {
  let depth = 0, inStr = false, inTmpl = false, strChar = null;
  const opens = [];
  const events = [];
  for (let k = 0; k < code.length; k++) {
    const c = code[k], p = k > 0 ? code[k - 1] : '';
    if (inTmpl) { if (c === '`' && p !== '\\') inTmpl = false; continue; }
    if (inStr) { if (c === strChar && p !== '\\') inStr = false; continue; }
    if (c === '`' && p !== '\\') { inTmpl = true; continue; }
    if (c === '"' || c === "'") { inStr = true; strChar = c; continue; }
    if (c === '{') { depth++; opens.push({pos: k, depth}); }
    if (c === '}') {
      depth--;
      if (opens.length) {
        const op = opens.pop();
        if (depth === 0 || depth === 1) {
          events.push({type: 'pair', openPos: op.pos, closePos: k, innerDepth: op.depth});
        }
      }
    }
  }
  console.log(`${label}: final depth=${depth}, total {=${opens.length + events.length}, }=${events.length}`);
  // Show if depth != 0, find where depth last changed to 1
  if (depth !== 0) {
    // Print all pair events to help debug
    for (const ev of events) {
      const ctx = code.substring(ev.openPos, Math.min(code.length, ev.openPos + 80));
      console.log(`  open at ${ev.openPos}: ${JSON.stringify(ctx)}`);
    }
    // Find the last unmatched open
    for (const op of opens) {
      const ctx = code.substring(op.pos, Math.min(code.length, op.pos + 80));
      console.log(`  UNMATCHED { at ${op.pos}: ${JSON.stringify(ctx)}`);
    }
  }
}

describeBraces(bodyPrev, 'PREV renderBattle');
console.log('---');
describeBraces(bodyCur, 'CUR renderBattle');
