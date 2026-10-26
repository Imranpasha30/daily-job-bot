// Build the tabbed Bangalore job page from every raw source collected.
const fs = require('fs');

const RAW = ['ats_raw.json', 'ats_raw2.json', 'ats_raw3.json'].filter(f => fs.existsSync(f)).flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const REMOTE = fs.existsSync('jobs.json') ? JSON.parse(fs.readFileSync('jobs.json', 'utf8')).jobs : [];
const GEN = new Date();

// ---------- geography ----------
const BLR = /\b(bangalore|bengaluru|blr|bangaluru)\b/i;
const IND_CITY = /\b(hyderabad|secunderabad|mumbai|navi mumbai|pune|delhi|new delhi|gurgaon|gurugram|noida|ncr|chennai|kolkata|ahmedabad|jaipur|indore|kochi|cochin|coimbatore|trivandrum|thiruvananthapuram|mysore|mysuru|chandigarh|nagpur|bhubaneswar|visakhapatnam|vizag|surat|vadodara|nashik|goa)\b/i;
const INDIA = /\bindia\b/i;
const REMOTE_GLOBAL = /\b(worldwide|anywhere|global|fully remote|remote - global|apac|asia)\b/i;
const ELSEWHERE = /\b(united states|usa|u\.s\.|canada|united kingdom|uk\b|ireland|germany|france|spain|portugal|poland|netherlands|amsterdam|berlin|london|dublin|paris|singapore|japan|tokyo|australia|sydney|brazil|sao paulo|mexico|argentina|colombia|israel|tel aviv|dubai|uae|new york|san francisco|seattle|austin|boston|chicago|denver|atlanta|toronto|vancouver)\b/i;

// ---------- role shape ----------
const T_BACKEND = /\b(back ?end|backend|back-end|server ?side|server-side|api (engineer|developer)|platform engineer|infrastructure engineer|distributed systems|python (engineer|developer)|node ?js (engineer|developer)|java (engineer|developer)|golang (engineer|developer)|go (engineer|developer)|microservices)\b/i;
const T_SWE = /\b(software (engineer|developer|dev engineer|development engineer)|software dev engineer|sde ?[0-9ivx]*|member of technical staff|applications? engineer|systems engineer|full ?stack|full-stack|backend developer|engineer ?(i{1,3}|iv|[12345])\b)\b/i;
const T_ADJ = /\b(devops|site reliability|sre|cloud engineer|data engineer|data platform|integration engineer|security engineer|performance engineer|build engineer|release engineer)\b/i;
const T_BAD = /\b(intern|internship|apprentice|trainee|principal|staff|distinguished|fellow|director|head of|vp|vice president|chief|engineering manager|manager|architect|recruiter|recruiting|sales|marketing|account executive|customer success|business development|designer|ux|ui designer|writer|content|legal|counsel|finance|accountant|hr|people partner|talent|office|executive assistant|front[ -]?end|react developer|angular|ios|android|mobile developer|flutter|unity|game developer|qa|quality assurance|test engineer|sdet|manual test|data scientist|research scientist|applied scientist|product manager|program manager|project manager|business analyst|analyst|technical writer|support engineer|field engineer|hardware|firmware|asic|vlsi|rtl design|silicon|mechanical|electrical engineer|in test|test automation|automation engineer|kernel|device driver|driver|embedded|verification engineer|validation engineer|compiler|fpga|soc|analog|rf engineer|salesforce|sap|abap|mainframe|cobol|dotnet|sharepoint|power bi|tableau developer)\b/i;
const SENIORISH = /\b(senior|sr\.?|lead\b|iii\b|iv\b|\bl[45]\b|sde ?(3|4|iii|iv))\b/i;

// ---------- resume skill map ----------
const SKILLS = [
  ['Python', /\bpython\b/i, 10], ['FastAPI', /\bfastapi\b/i, 9], ['Django', /\bdjango\b/i, 7], ['Flask', /\bflask\b/i, 5],
  ['SQLAlchemy', /\bsqlalchemy\b/i, 5], ['asyncio', /\b(asyncio|async\s*\/?\s*await|asynchronous)\b/i, 4],
  ['Node.js', /\bnode\.?js\b/i, 9], ['Express', /\bexpress(\.js)?\b/i, 7], ['TypeScript', /\btypescript\b/i, 6],
  ['PostgreSQL', /\b(postgres(ql)?|psql)\b/i, 9], ['Redis', /\bredis\b/i, 8], ['SQL', /\bsql\b/i, 5],
  ['MongoDB', /\bmongodb\b/i, 3], ['MySQL', /\bmysql\b/i, 3],
  ['REST APIs', /\b(rest(ful)? api|rest api|api design)\b/i, 7], ['Microservices', /\bmicroservices?\b/i, 7],
  ['Message queues', /\b(message queue|kafka|rabbitmq|sqs|pub\/?sub|event[- ]driven|streaming)\b/i, 6],
  ['WebSockets', /\b(websocket|server[- ]sent events|sse)\b/i, 4],
  ['Docker', /\bdocker|container(is|iz)ed\b/i, 7], ['Kubernetes', /\b(kubernetes|k8s|eks)\b/i, 3],
  ['AWS', /\b(aws|amazon web services|ec2|s3 |lambda)\b/i, 7], ['NGINX', /\bnginx\b/i, 3],
  ['CI/CD', /\b(ci\/cd|continuous (integration|delivery|deployment)|github actions|jenkins)\b/i, 6],
  ['JWT/OAuth', /\b(jwt|oauth|authentication|authorization|rbac)\b/i, 6],
  ['Rate limiting', /\brate.?limit/i, 4], ['Idempotency', /\bidempoten/i, 4],
  ['Observability', /\b(observability|prometheus|opentelemetry|grafana|monitoring|tracing)\b/i, 5],
  ['Testing', /\b(pytest|unit test|integration test|test coverage|jest)\b/i, 5],
  ['Payments', /\b(payment|billing|razorpay|stripe|upi|settlement|transaction)\b/i, 6],
  ['Security', /\b(owasp|security|vulnerab|penetration|appsec|secure coding)\b/i, 5],
  ['Scale/perf', /\b(scalab|high.throughput|low.latency|performance tuning|query optimi|indexing|sharding)\b/i, 6],
  ['AI/LLM', /\b(llm|openai|gpt|gemini|claude|machine learning|ai\b|genai)\b/i, 4],
  ['Linux', /\blinux\b/i, 3], ['Git', /\bgit\b/i, 2], ['GraphQL', /\bgraphql\b/i, 3],
];
const MAX_SKILL = SKILLS.reduce((n, s) => n + s[2], 0);

const strip = h => String(h || '').replace(/\s+/g, ' ').trim();
function hid(u) { let h = 2166136261; for (let i = 0; i < u.length; i++) { h ^= u.charCodeAt(i); h = Math.imul(h, 16777619); } return 'k' + (h >>> 0).toString(36); }
function ageDays(p) { if (!p) return null; const t = new Date(p); if (isNaN(t)) return null; const a = Math.round((GEN - t) / 86400000); return (a < 0 || a > 730) ? null : a; }
function ageLabel(a) { if (a === null) return 'date unknown'; if (a <= 0) return 'today'; if (a === 1) return '1 day ago'; if (a < 30) return a + ' days ago'; if (a < 60) return 'about a month ago'; return Math.round(a / 30) + ' months ago'; }

const rows = [];
const seen = new Set();
for (const j of [...RAW, ...REMOTE]) {
  const title = strip(j.title); const company = strip(j.company); const url = j.url;
  if (!title || !company || !url) continue;
  const region = strip(j.region || (j.globalRemote ? 'Remote' : ''));
  const text = `${title} ${(j.tags || []).join(' ')} ${j.full || j.snippet || ''}`;
  if (T_BAD.test(title)) continue;
  const shape = T_BACKEND.test(title) ? 'backend' : T_SWE.test(title) ? 'swe' : T_ADJ.test(title) ? 'adjacent' : null;
  if (!shape) continue;

  const matched = [];
  let skillPts = 0;
  for (const [name, re, w] of SKILLS) if (re.test(text)) { matched.push(name); skillPts += w; }
  const match = Math.min(99, Math.round((skillPts / MAX_SKILL) * 185)); // calibrated so a strong backend JD lands 60-95

  // does the posting actually name the stack on his resume?
  const CORE = /\b(python|fastapi|django|flask|node\.?js|express(\.js)?|postgres(ql)?|redis|sqlalchemy)\b/i;
  const core = CORE.test(text);
  const hasText = (j.full || j.snippet || '').length > 300;

  const inBlr = BLR.test(region) || (!region && BLR.test(text));
  const inIndiaOther = !inBlr && (IND_CITY.test(region) || (INDIA.test(region) && !ELSEWHERE.test(region)));
  const remoteGlobal = !inBlr && !inIndiaOther && (REMOTE_GLOBAL.test(region) || (/remote/i.test(region) && !ELSEWHERE.test(region)));
  const senior = SENIORISH.test(title);
  const a = ageDays(j.posted);

  const key = (title + '|' + company).toLowerCase().replace(/[^a-z0-9|]/g, '');
  if (seen.has(key)) continue;
  seen.add(key);

  let rank = match;
  if (shape === 'backend') rank += 25; else if (shape === 'swe') rank += 14;
  if (core) rank += 35;
  if (!hasText) rank -= 20;
  if (inBlr) rank += 30; else if (inIndiaOther) rank += 14; else if (remoteGlobal) rank += 6; else rank -= 25;
  if (senior) rank -= 10;
  if (a !== null && a <= 7) rank += 18; else if (a !== null && a <= 30) rank += 8; else if (a === null || a > 90) rank -= 12;

  rows.push({
    id: hid(url), t: title, c: company, u: url, r: region || 'Not stated', s: j.source,
    a, al: ageLabel(a), sal: j.salaryText || '', match, matched: matched.slice(0, 10),
    shape, senior, inBlr, inIndiaOther, remoteGlobal, rank, core, hasText,
    variant: (text.match(/\bnode\.?js|express|typescript\b/gi) || []).length > (text.match(/\bpython|fastapi|django\b/gi) || []).length ? 'Node.js' : 'Python',
    tags: (j.tags || []).filter(x => x && x.length < 28).slice(0, 4),
    snip: strip(j.snippet || '').slice(0, 190),
  });
}

rows.sort((x, y) => y.rank - x.rank || (x.a ?? 999) - (y.a ?? 999));

// ---------- split into tabs ----------
function capCompanies(list, cap) { const n = {}; return list.filter(j => { const k = j.c.toLowerCase(); n[k] = (n[k] || 0) + 1; return n[k] <= cap; }); }

// Tab A: every Bangalore role, best fit first. Cap at 12 per company so no single
// employer dominates, then top up to at least 100 from whatever Bangalore rows remain.
const blrAll = rows.filter(j => j.inBlr);
let tabA = capCompanies(blrAll, 12);
const usedA = new Set(tabA.map(j => j.id));
if (tabA.length < 100) {
  for (const j of blrAll) { if (usedA.has(j.id)) continue; tabA.push(j); usedA.add(j.id); if (tabA.length >= 100) break; }
}
tabA.sort((x, y) => y.rank - x.rank);

const tabB = capCompanies(rows.filter(j => !usedA.has(j.id) && (j.inIndiaOther || j.remoteGlobal)), 6).slice(0, 150);

const coreA = tabA.filter(j => j.core).length;
console.log('pool rows:', rows.length, '| Bangalore rows available:', blrAll.length);
console.log('TAB A (Bangalore):', tabA.length, '| companies:', new Set(tabA.map(j => j.c)).size,
  '| names your stack:', coreA, '| <=7d:', tabA.filter(j => j.a !== null && j.a <= 7).length,
  '| avg match:', Math.round(tabA.reduce((n, j) => n + j.match, 0) / (tabA.length || 1)) + '%');
console.log('TAB B (other):', tabB.length, '| companies:', new Set(tabB.map(j => j.c)).size,
  '| names your stack:', tabB.filter(j => j.core).length);
fs.writeFileSync('tabs.json', JSON.stringify({ generated: GEN.toISOString(), coreA, tabA, tabB }, null, 1));
