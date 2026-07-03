import fs from 'fs';
const code = fs.readFileSync('check_temp.js', 'utf8');

let depth = 0;
let inStr = false, inTmpl = false, strChar = null;
let lineNum = 1;

for (let i = 0; i < code.length; i++) {
  const c = code[i], p = i > 0 ? code[i-1] : '', n = i < code.length-1 ? code[i+1] : '';
  if (c === '\n') lineNum++;

  if (inTmpl) {
    // Check for template literal end or expression start/end
    if (c === '`' && p !== '\\') inTmpl = false;
    continue;
  }
  if (inStr) {
    if (c === strChar && p !== '\\') inStr = false;
    continue;
  }
  // Not in string or template
  if (c === '`' && p !== '\\') { inTmpl = true; continue; }
  if (c === '"' || c === "'") { inStr = true; strChar = c; continue; }
  if (c === '{') depth++;
  if (c === '}') depth--;
  if (depth < 0) {
    console.log(`EXTRA } at line ${lineNum}`);
    process.exit(0);
  }
}

console.log(`Final depth: ${depth}`);
if (depth > 0) {
  console.log('MISSING', depth, 'closing brace(s)');
  // Do a second pass with character-level position tracking
  depth = 0; inStr = false; inTmpl = false;
  let lastPositivePos = -1;
  for (let i = 0; i < code.length; i++) {
    const c = code[i], p = i > 0 ? code[i-1] : '';
    if (inTmpl) { if (c === '`' && p !== '\\') inTmpl = false; continue; }
    if (inStr) { if (c === strChar && p !== '\\') inStr = false; continue; }
    if (c === '`' && p !== '\\') { inTmpl = true; continue; }
    if (c === '"' || c === "'") { inStr = true; strChar = c; continue; }
    if (c === '{') { depth++; if (depth > 0) lastPositivePos = i; }
    if (c === '}') depth--;
  }
  // Show context around where depth went positive and stayed
  const ctx = code.substring(Math.max(0, lastPositivePos - 200), Math.min(code.length, lastPositivePos + 50));
  console.log('Last position where depth increased:', ctx);
}
