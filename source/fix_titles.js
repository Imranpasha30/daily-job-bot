// Broaden the role-shape regexes so abbreviated titles (e.g. "Software Dev Engineer I")
// are not silently dropped. Written as a file because shell escaping mangles backslashes.
const fs = require('fs');

const T_BACKEND = /\b(back ?end|backend|back-end|server ?side|server-side|api (engineer|developer)|platform engineer|infrastructure engineer|distributed systems|python (engineer|developer)|node ?js (engineer|developer)|java (engineer|developer)|golang (engineer|developer)|go (engineer|developer)|microservices)\b/i;
const T_SWE = /\b(software (engineer|developer|dev engineer|development engineer)|software dev engineer|sde ?[0-9ivx]*|member of technical staff|applications? engineer|systems engineer|full ?stack|full-stack|backend developer|engineer ?(i{1,3}|iv|[12345])\b)\b/i;
const T_ADJ = /\b(devops|site reliability|sre|cloud engineer|data engineer|data platform|integration engineer|security engineer|performance engineer|build engineer|release engineer)\b/i;

const CASES = [
  ['Software Dev Engineer I', true],
  ['Software Development Engineer II', true],
  ['SDE 2 Infra', true],
  ['Backend Developer', true],
  ['Backend Engineer', true],
  ['Senior Software Engineer, Backend', true],
  ['Member of Technical Staff', true],
  ['Platform Engineer - Compute', true],
  ['Data Engineer II', true],
  ['Site Reliability Engineer', true],
  ['Product Manager I', false],
  ['Senior Manager - Applied Science', false],
  ['Account Manager - Microsoft Advertising', false],
  ['Lead - Taxation', false],
  ['Designated Support Engineer III', true],
];
let ok = true;
for (const [t, want] of CASES) {
  const got = T_BACKEND.test(t) || T_SWE.test(t) || T_ADJ.test(t);
  const pass = got === want;
  if (!pass) ok = false;
  console.log((pass ? 'OK   ' : 'FAIL ') + (got ? 'matched ' : 'skipped ') + '| ' + t);
}
console.log('(Designated Support Engineer III is caught later by the blocklist, so a match here is fine)');

const lines = fs.readFileSync('build_tabs.js', 'utf8').split('\n');
function swap(prefix, re) {
  const i = lines.findIndex(l => l.startsWith(prefix));
  if (i < 0) { console.error('not found: ' + prefix); process.exit(1); }
  lines[i] = prefix + ' = ' + re.toString() + ';';
}
swap('const T_BACKEND', T_BACKEND);
swap('const T_SWE', T_SWE);
swap('const T_ADJ', T_ADJ);
fs.writeFileSync('build_tabs.js', lines.join('\n'));
console.log('patched build_tabs.js');
