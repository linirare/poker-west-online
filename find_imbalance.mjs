import fs from 'fs';
const code = fs.readFileSync('check_temp.js', 'utf8');
// Use node's built-in parser to find the error
// But first, find the extra brace by line-level tracking
const lines = code.split('\n');
let depth = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Simple count (won't handle braces in strings/templates, but gives a rough idea)
  for (const ch of line) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
  }
  if (depth < 0) {
    console.log(`Extra } at line ${i+1}: ${line.substring(0, 100)}`);
    process.exit(0);
  }
}
console.log(`Final depth: ${depth} (positive = missing closing braces)`);
// If positive, binary search to find approximate location
if (depth > 0) {
  let lo = 0, hi = lines.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    let d = 0;
    for (let i = 0; i <= mid; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') d++;
        if (ch === '}') d--;
      }
    }
    if (d > 0 && mid === 0) { lo = mid; break; }
    if (d <= 0) lo = mid + 1;
    else hi = mid;
  }
  console.log(`Depth becomes positive around line ${lo+1}: ${lines[Math.max(0,lo-2)].substring(0,120)}`);
  console.log(`Line ${lo+1}: ${lines[lo].substring(0,120)}`);
  console.log(`Line ${Math.min(lines.length-1, lo+1)}: ${lines[Math.min(lines.length-1, lo+1)].substring(0,120)}`);
}
