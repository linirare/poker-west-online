import fs from 'fs';
const h = fs.readFileSync('server/client/index.html', 'utf8');
const i = h.indexOf('<script>');
const j = h.indexOf('</script>', i + 1);
const cur = h.substring(i + 8, j);

// Context-aware brace tracking
let depth = 0, inStr = false, inTmpl = false, strChar = null;
let suspectPos = -1;
for (let k = 0; k < cur.length; k++) {
  const c = cur[k], p = k > 0 ? cur[k - 1] : '';
  if (inTmpl) { if (c === '`' && p !== '\\') inTmpl = false; continue; }
  if (inStr) { if (c === strChar && p !== '\\') inStr = false; continue; }
  if (c === '`' && p !== '\\') { inTmpl = true; continue; }
  if (c === '"' || c === "'") { inStr = true; strChar = c; continue; }
  if (c === '{') { depth++; if (depth > 500) { suspectPos = k; break; } }
  if (c === '}') { depth--; if (depth < -100) { suspectPos = k; break; } }
}
if (suspectPos >= 0) {
  console.log('SUSPICIOUS depth', depth, 'at pos', suspectPos);
  const ctx = cur.substring(Math.max(0, suspectPos - 100), Math.min(cur.length, suspectPos + 100));
  console.log('Context:', JSON.stringify(ctx));
} else {
  console.log('No depth spike. Final depth:', depth);
}
