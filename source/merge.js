// Merge ATS + remote-board jobs, rigorously filtered for Imran's exact experience:
// Backend Engineer with ~1.8 to 2 years production experience (Node.js/Express, Python/FastAPI).
// STRICTLY EXCLUDES: Senior, Lead, Principal, Staff, Architect, Manager, and 4+ years asks.
const fs = require('fs');

const ats = [...JSON.parse(fs.readFileSync('ats_raw.json','utf8')), ...JSON.parse(fs.readFileSync('ats_raw2.json','utf8'))];
const remote = JSON.parse(fs.readFileSync('jobs.json', 'utf8')).jobs;

const USD_INR = 88;
const INDIA = /\b(india|bangalore|bengaluru|hyderabad|mumbai|pune|delhi|gurgaon|gurugram|noida|chennai|kolkata|ahmedabad|jaipur|indore|kochi|coimbatore|trivandrum|thiruvananthapuram|mysore|mysuru|chandigarh|nagpur|bhubaneswar|vizag|visakhapatnam)\b/i;
const GLOBAL_REMOTE = /\b(worldwide|anywhere|global|remote\s*-\s*global|apac|asia)\b/i;

const TITLE_STRONG = /\b(back[\s-]?end|server[\s-]?side|api engineer|platform engineer|distributed systems|python (engineer|developer)|node\.?js (engineer|developer)|golang (engineer|developer)|infrastructure engineer)\b/i;
const TITLE_GOOD = /\b(software (engineer|developer)|sde|full[\s-]?stack|member of technical staff|applications? engineer|systems engineer|cloud engineer|devops engineer|site reliability|sre|data engineer)\b/i;
const STACK = /\b(python|fastapi|django|flask|node\.?js|nodejs|express|typescript|postgres(ql)?|redis|docker|kubernetes|aws|gcp|graphql|rest api|restful|microservice|celery|rabbitmq|kafka|sqlalchemy|prisma|mongodb|mysql|grpc|terraform)\b/i;

// HARD EXCLUSIONS: senior, staff, lead, principal, architect, manager, or wrong domain
const TITLE_BAD = /\b(sr\.?|senior|lead\b|tech lead|principal|staff|architect|director|head of|vp\b|vice president|chief|manager|tl\b|stl\b|iii\b|iv\b|v\b|level [3-9]|l[3-9]\b|expert|intern|internship|apprentice|distinguished|fellow|em\b|president|recruit|sales|marketing|account executive|customer success|support engineer|solutions? (consultant|architect)|designer|ux|ui designer|writer|content|legal|counsel|finance|accountant|hr\b|people partner|talent|office|executive assistant|security researcher|threat|soc analyst|frontend|front[\s-]end|ios\b|android\b|mobile|unity|game|qa\b|quality assurance|test engineer|sdet|data scientist|research scientist|machine learning scientist|applied scientist|product manager|program manager|project manager|technical program|business|strategy|operations|analyst)\b/i;

// Experience filter: strictly disqualify 4+ years of experience
const YEARS_EXCLUDE = /\b(?:[4-9]|1\d)\s*\+?\s*years?(?:\s+of)?\s+(?:experience|exp)\b|\b(?:minimum|at least|req(?:uiring)?)\s+(?:[4-9]|1\d)\s*\+?\s*years?\b|\b(?:[4-9]|1\d)\s*[-–to]+\s*\d+\s*years\b/i;

// Experience sweet spot for Imran (~1.8 - 2 yrs): 1-3 years, 0-2 years, 2+ years, entry/associate/sde1/sde2
const YEARS_SWEET_SPOT = /\b(?:0|1|2)\s*[-–to]+\s*(?:2|3|4)\s*years?\b|\b(?:1|2)\s*\+?\s*years?(?:\s+of)?\s+(?:experience|exp)\b|\b(?:entry|junior|associate|sde ?[12]|sde ?i{1,2}|mts ?[12]|level ?[12]|l[12]\b)\b/i;

function lpaOf(txt) {
  const t = String(txt || '');
  if (!t) return null;
  let m = t.match(/(?:₹|INR|Rs\.?)\s*([\d,.]+)\s*(?:-|–|to)?\s*([\d,.]+)?\s*(lpa|lakh|L\b)?/i);
  if (m) { const hi = parseFloat((m[2] || m[1]).replace(/,/g, '')); return hi > 1000 ? Math.round(hi / 100000 * 10) / 10 : Math.round(hi * 10) / 10; }
  m = t.match(/\$?\s*([\d,]{4,})\s*(?:-|–|to)\s*\$?\s*([\d,]{4,})/);
  if (m) { const hi = parseFloat(m[2].replace(/,/g, '')); return Math.round(hi * USD_INR / 100000 * 10) / 10; }
  m = t.match(/\$?\s*([\d.]+)\s*k\s*(?:-|–|to)\s*\$?\s*([\d.]+)\s*k/i);
  if (m) { const hi = parseFloat(m[2]) * 1000; return Math.round(hi * USD_INR / 100000 * 10) / 10; }
  return null;
}

function normalise(j) {
  const region = String(j.region || '').replace(/\s+/g, ' ').trim();
  const hay = `${j.title} ${(j.tags || []).join(' ')} ${j.full || j.snippet || ''}`;
  const inIndia = INDIA.test(region) || (!region && INDIA.test(hay));
  const globalRemote = GLOBAL_REMOTE.test(region) || /remote/i.test(region) && !/(united states|usa|us only|canada|uk|europe|emea|germany|brazil|latam|australia|japan|singapore only)/i.test(region);
  let salaryText = j.salaryText || '';
  if (!salaryText) {
    const m = (j.snippet || '').match(/(?:₹|INR|Rs\.?)\s*[\d,.]+\s*(?:-|–|to)\s*[\d,.]+\s*(?:LPA|lakh)?/i) || (j.snippet || '').match(/\$[\d,]{5,}\s*(?:-|–|to)\s*\$[\d,]{5,}/);
    if (m) salaryText = m[0];
  }
  return {
    title: j.title, company: j.company, url: j.url, source: j.source, board: j.board || '',
    region: region || (globalRemote ? 'Remote' : ''), posted: j.posted || '',
    tags: (j.tags || []).slice(0, 6), snippet: (j.snippet || '').slice(0, 260), full: (j.full || j.snippet || ''),
    salaryText, lpa: j.lpa != null ? j.lpa : lpaOf(salaryText), inIndia, globalRemote,
  };
}

function score(j) {
  const t = j.title;
  const hay = `${t} ${j.tags.join(' ')} ${j.full || j.snippet}`;
  
  // Hard filters
  if (TITLE_BAD.test(t)) return 0;
  if (YEARS_EXCLUDE.test(hay)) return 0;

  let s = 0;
  if (TITLE_STRONG.test(t)) s += 70;
  else if (TITLE_GOOD.test(t)) s += 42;
  else return 0;

  // Stack match
  if (/\b(python|fastapi|django|flask)\b/i.test(hay)) s += 16;
  if (/\b(node\.?js|express|typescript)\b/i.test(hay)) s += 14;
  if (/\b(postgres(ql)?|redis|kafka|rabbitmq|microservice|distributed)\b/i.test(hay)) s += 12;
  if (STACK.test(hay)) s += 6;

  // Experience level match
  if (YEARS_SWEET_SPOT.test(hay) || YEARS_SWEET_SPOT.test(t)) s += 20;

  // Region scoring
  if (j.inIndia) s += 45;
  else if (j.globalRemote) s += 15;
  else s -= 20;

  if (j.lpa && j.lpa >= 8) s += 12;
  return s;
}

const pool = [...ats, ...remote].map(normalise);
const seen = new Set();
const scored = [];
for (const j of pool) {
  if (!j.title || !j.url || !j.company) continue;
  j.score = score(j);
  if (j.score < 45) continue;
  if (j.lpa != null && j.lpa < 8) continue;
  const key = (j.title + '|' + j.company).toLowerCase().replace(/[^a-z0-9|]/g, '');
  if (seen.has(key)) continue;
  seen.add(key);
  scored.push(j);
}
scored.sort((a, b) => (b.score - a.score) || (b.posted || '').localeCompare(a.posted || ''));

const CAP = 6;
function capped(list){const n={};const out=[];for(const j of list){const c=j.company.toLowerCase();n[c]=(n[c]||0)+1;if(n[c]<=CAP)out.push(j);}return out;}
const india = capped(scored.filter(j => j.inIndia));
const rest = capped(scored.filter(j => !j.inIndia));
const final = [...india, ...rest].slice(0, 100);

console.log('pool:', pool.length, '| passed filter:', scored.length);
console.log('india-based:', india.length, '| remote/global:', rest.length);
console.log('final:', final.length, '| india in final:', final.filter(j => j.inIndia).length, '| salary shown:', final.filter(j => j.lpa).length);
const byCo = {};
final.forEach(j => byCo[j.company] = (byCo[j.company] || 0) + 1);
console.log('companies:', Object.keys(byCo).length);
console.log('\n--- first 20 roles (strictly ~1-2 yrs exp):');
final.slice(0, 20).forEach(j => console.log(` ${j.score} | ${j.title} @ ${j.company} | ${j.region} | ${j.salaryText || '-'}`));

const finalData = JSON.stringify({ generated: new Date().toISOString(), usdInr: USD_INR, counts: { pool: pool.length, passed: scored.length, india: india.length }, jobs: final }, null, 1);
const path = require('path');
fs.writeFileSync(path.join('..', 'final.json'), finalData);
fs.writeFileSync('final.json', finalData);
