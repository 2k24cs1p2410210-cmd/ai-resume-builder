import fs from 'fs';

const content = fs.readFileSync('c:/Users/ASUS/OneDrive/Desktop/ai-resume-builder/ai-resume-builder/src/dashboard/resumes/edit/index.jsx', 'utf8');
const lines = content.split('\n');

let insideEffect = false;
let parenthesesCount = 0;
let bracesCount = 0;
let effectLines = [];

lines.forEach((line, idx) => {
  if (line.includes('useEffect(')) {
    insideEffect = true;
    parenthesesCount = 0;
    bracesCount = 0;
    effectLines = [];
  }

  if (insideEffect) {
    effectLines.push(`${idx + 1}: ${line}`);
    
    // Count parentheses and braces to find the end of useEffect
    for (const char of line) {
      if (char === '(') parenthesesCount++;
      if (char === ')') parenthesesCount--;
      if (char === '{') bracesCount++;
      if (char === '}') bracesCount--;
    }

    if (parenthesesCount === 0 && bracesCount === 0 && effectLines.length > 1) {
      insideEffect = false;
      console.log(`\n--- useEffect Block ---`);
      console.log(effectLines.join('\n'));
    }
  }
});
