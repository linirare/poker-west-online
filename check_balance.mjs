import fs from 'fs';
const code = fs.readFileSync('check_temp.js', 'utf8');
let braces = 0, brackets = 0, parens = 0;
let backtickCount = 0;
let inString = false, inTemplate = false, stringChar = null;
for (let i = 0; i < code.length; i++) {
  const c = code[i];
  const p = i > 0 ? code[i-1] : '';
  if (inTemplate) {
    if (c === '`' && p !== '\\') { inTemplate = false; backtickCount++; }
    continue;
  }
  if (inString) {
    if (c === stringChar && p !== '\\') inString = false;
    continue;
  }
  if (c === '`' && p !== '\\') { inTemplate = true; backtickCount++; continue; }
  if (c === '"' || c === "'") { inString = true; stringChar = c; continue; }
  if (c === '{') braces++;
  if (c === '}') braces--;
  if (c === '[') brackets++;
  if (c === ']') brackets--;
  if (c === '(') parens++;
  if (c === ')') parens--;
}
console.log('Braces diff:', braces);
console.log('Brackets diff:', brackets);
console.log('Parens diff:', parens);
console.log('Backtick count:', backtickCount, '(even:', backtickCount % 2 === 0, ')');
console.log('Still in template:', inTemplate, '| Still in string:', inString);
