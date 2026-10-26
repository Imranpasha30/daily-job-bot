// Repair the T_BAD line in build_tabs.js (shell escaping had turned the word-boundary
// escapes into literal 0x08 backspace characters, so "staff" never matched).
const fs = require('fs');

const T_BAD = /\b(intern|internship|apprentice|trainee|principal|staff|distinguished|fellow|director|head of|vp|vice president|chief|engineering manager|manager|architect|recruiter|recruiting|sales|marketing|account executive|customer success|business development|designer|ux|ui designer|writer|content|legal|counsel|finance|accountant|hr|people partner|talent|office|executive assistant|front[ -]?end|react developer|angular|ios|android|mobile developer|flutter|unity|game developer|qa|quality assurance|test engineer|sdet|manual test|data scientist|research scientist|applied scientist|product manager|program manager|project manager|business analyst|analyst|technical writer|support engineer|field engineer|hardware|firmware|asic|vlsi|rtl design|silicon|mechanical|electrical engineer|in test|test automation|automation engineer|kernel|device driver|driver|embedded|verification engineer|validation engineer|compiler|fpga|soc|analog|rf engineer|salesforce|sap|abap|mainframe|cobol|dotnet|sharepoint|power bi|tableau developer)\b/i;

const CASES = [
  ['Staff Software Development Engineer (Backend - Python)', true],
  ['Senior Staff Engineer - Backend & Data Engineering', true],
  ['Software Development Engineer in Test', true],
  ['Engineering Manager, Platform', true],
  ['Member of Technical Staff, DFS', true],
  ['Backend Engineer', false],
  ['Senior Backend Engineer (Java)', false],
  ['Software Engineer, Infrastructure', false],
  ['Software Engineer II', false],
  ['DevOps Engineer II', false],
  ['SDE 2 Infra', false],
  ['Site Reliability Engineer, Cells Infrastructure', false],
];

let ok = true;
for (const [t, want] of CASES) {
  const got = T_BAD.test(t);
  if (got !== want) { ok = false; console.log('FAIL ' + (got ? 'BLOCKED' : 'allowed') + ' | ' + t); }
  else console.log('OK   ' + (got ? 'BLOCKED' : 'allowed') + ' | ' + t);
}
if (!ok) { console.error('regex cases failed, not patching'); process.exit(1); }

const lines = fs.readFileSync('build_tabs.js', 'utf8').split('\n');
const i = lines.findIndex(l => l.startsWith('const T_BAD'));
if (i < 0) { console.error('T_BAD line not found'); process.exit(1); }
lines[i] = 'const T_BAD = ' + T_BAD.toString() + ';';
fs.writeFileSync('build_tabs.js', lines.join('\n'));

const check = fs.readFileSync('build_tabs.js', 'utf8').split('\n')[i];
console.log('patched. contains backspace char: ' + check.includes(String.fromCharCode(8)));
console.log('line length: ' + check.length);
