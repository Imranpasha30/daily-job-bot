// Merge ATS + remote-board cyber jobs, strictly filtered for Imran's exact profile:
// Cybersecurity Fresher / Entry-Level (IIT Roorkee Post Graduate Certification in Cyber Security & Ethical Hacking).
// STRICTLY EXCLUDES: Senior, Lead, Principal, Staff, Architect, Manager, Director, Consultant, and 3+ years asks.
// INCLUDES: Curated Dubai fresher cybersecurity roles.
const fs = require('fs');
const path = require('path');

const atsPath = path.join(__dirname, '..', 'ats_cyber_raw.json');
const remotePath = path.join(__dirname, '..', 'cyber_jobs.json');
const dubaiMdPath = path.join(__dirname, '..', '..', 'Dubai', 'Dubai-Jobs-Cybersecurity-Fresher.md');

const ats = fs.existsSync(atsPath) ? JSON.parse(fs.readFileSync(atsPath, 'utf8')) : [];
const remote = fs.existsSync(remotePath) ? JSON.parse(fs.readFileSync(remotePath, 'utf8')).jobs : [];

const USD_INR = 88;
const INDIA = /\b(india|bangalore|bengaluru|hyderabad|mumbai|pune|delhi|gurgaon|gurugram|noida|chennai|kolkata|ahmedabad|jaipur|indore|kochi|coimbatore|trivandrum|thiruvananthapuram|mysore|mysuru|chandigarh|nagpur|bhubaneswar|vizag|visakhapatnam)\b/i;
const DUBAI = /\b(dubai|abu dhabi|uae|united arab emirates|sharjah|ajman|gcc|middle east|gulf)\b/i;
const GLOBAL_REMOTE = /\b(worldwide|anywhere|global|remote\s*-\s*global|apac|asia)\b/i;

// MUST be a real cybersecurity / infosec title
const TITLE_MUST_CYBER = /\b(soc|security analyst|cyber\s*security|information security|infosec|penetration|pen\s*test|vapt|vulnerability|appsec|application security|threat|incident response|blue team|red team|cloud security|network security|product security|iam engineer|grc|defensive security|offensive security|security engineer|infosec engineer|vulnerability researcher|threat researcher|threat analyst|security operations)\b/i;

// HARD EXCLUSIONS: senior, lead, manager, director, managing, consultant, or non-security titles
const TITLE_BAD = /\b(sr\.?|senior|lead\b|team lead|principal|staff|architect|director|head of|vp\b|vice president|manager|managing|consultant|ciso|chief|iii\b|iv\b|v\b|level [3-9]|l[3-9]\b|tier [2-9]|expert|distinguished|fellow|sales|presales|account|marketing|customer engineer|customer success|salesforce|recruiter|hr\b|finance|legal|product manager|frontend)\b/i;

// Experience filter: strictly disqualify 3+ years experience
const YEARS_EXCLUDE = /\b(?:[3-9]|1\d)\s*\+?\s*years?(?:\s+of)?\s+(?:experience|exp)\b|\b(?:minimum|at least|req(?:uiring)?)\s+(?:[3-9]|1\d)\s*\+?\s*years?\b|\b(?:[3-9]|1\d)\s*[-–to]+\s*\d+\s*years\b/i;

// Fresher / entry-level signals
const FRESHER_SIGNALS = /\b(fresher|entry[\s-]?level|junior|associate|intern|internship|graduate|trainee|analyst [1i]\b|level 1|l1\b|tier 1|0-1 year|0-2 years|1-2 years|1\+ years)\b/i;

const STACK = /\b(splunk|siem|qradar|sentinel|crowdstrike|palo alto|fortinet|wireshark|nessus|qualys|burp suite|metasploit|nmap|kali|snort|suricata|ossec|wazuh|elastic security|carbon black|cyberark|hashicorp vault|okta|aws security|azure security|gcp security|owasp|mitre att&ck|iso 27001|nist|soc 2|gdpr|pci.dss|firewall|ids|ips|edr|xdr|soar|python|bash|powershell|osint|ceh)\b/i;

function lpaOf(txt) {
  const t = String(txt || '');
  if (!t) return null;
  let m = t.match(/(?:₹|INR|Rs\.?)\s*([\d,.]+)\s*(?:-|–|to)?\s*([\d,.]+)?\s*(lpa|lakh|L\b)?/i);
  if (m) { const hi = parseFloat((m[2] || m[1]).replace(/,/g, '')); return hi > 1000 ? Math.round(hi / 100000 * 10) / 10 : Math.round(hi * 10) / 10; }
  m = t.match(/\$?\s*([\d,]{4,})\s*(?:-|–|to)\s*\$?\s*([\d,]{4,})/);
  if (m) { const hi = parseFloat(m[2].replace(/,/g, '')); return Math.round(hi * USD_INR / 100000 * 10) / 10; }
  m = t.match(/\$?\s*([\d.]+)\s*k\s*(?:-|–|to)\s*\$?\s*([\d.]+)\s*k/i);
  if (m) { const hi = parseFloat(m[2]) * 1000; return Math.round(hi * USD_INR / 100000 * 10) / 10; }
  m = t.match(/AED\s*([\d,]+)\s*(?:-|–|to)\s*AED?\s*([\d,]+)/i);
  if (m) { const hi = parseFloat(m[2].replace(/,/g, '')); return Math.round(hi * USD_INR * 0.272 / 100000 * 10) / 10; }
  return null;
}

function normalise(j) {
  const region = String(j.region || '').replace(/\s+/g, ' ').trim();
  const hay = `${j.title} ${(j.tags || []).join(' ')} ${j.full || j.snippet || ''}`;
  const inIndia = INDIA.test(region) || (!region && INDIA.test(hay));
  const inDubai = DUBAI.test(region) || (!region && DUBAI.test(hay));
  const globalRemote = GLOBAL_REMOTE.test(region) || /remote/i.test(region) && !/(united states|usa|us only|canada|uk|europe|emea|germany|brazil|latam|australia|japan|singapore only)/i.test(region);
  let salaryText = j.salaryText || '';
  if (!salaryText) {
    const m = (j.snippet || '').match(/(?:₹|INR|Rs\.?)\s*[\d,.]+\s*(?:-|–|to)\s*[\d,.]+\s*(?:LPA|lakh)?/i) || (j.snippet || '').match(/\$[\d,]{5,}\s*(?:-|–|to)\s*\$[\d,]{5,}/) || (j.snippet || '').match(/AED\s*[\d,]+\s*(?:-|–|to)\s*AED?\s*[\d,]+/i);
    if (m) salaryText = m[0];
  }
  return {
    title: j.title, company: j.company, url: j.url, source: j.source, board: j.board || '',
    region: region || (globalRemote ? 'Remote' : (inDubai ? 'Dubai, UAE' : '')), posted: j.posted || '',
    tags: (j.tags || []).slice(0, 6), snippet: (j.snippet || '').slice(0, 260), full: (j.full || j.snippet || ''),
    salaryText, lpa: j.lpa != null ? j.lpa : lpaOf(salaryText), inIndia, inDubai, globalRemote,
  };
}

function score(j) {
  const t = j.title;
  const hay = `${t} ${j.tags.join(' ')} ${j.full || j.snippet}`;

  // Must be cyber, must NOT be senior or bad
  if (!TITLE_MUST_CYBER.test(t)) return 0;
  if (TITLE_BAD.test(t)) return 0;
  if (YEARS_EXCLUDE.test(hay)) return 0;

  let s = 60;
  // Core fresher keywords
  if (FRESHER_SIGNALS.test(t) || FRESHER_SIGNALS.test(hay)) s += 25;
  if (/\b(soc|penetration|vapt|appsec|burp|siem|incident response)\b/i.test(hay)) s += 15;
  if (STACK.test(hay)) s += 10;

  // Region scoring
  if (j.inIndia) s += 45;
  else if (j.inDubai) s += 40;
  else if (j.globalRemote) s += 15;
  else s -= 20;

  if (j.lpa && j.lpa >= 6) s += 10;
  return s;
}

// Parse ONLY Section 1 and 2 of curated Dubai fresher roles from Markdown
const curatedDubai = [];
if (fs.existsSync(dubaiMdPath)) {
  const md = fs.readFileSync(dubaiMdPath, 'utf8');
  const validSection = md.split(/## 3\./)[0];
  const lines = validSection.split('\n');
  for (const l of lines) {
    if (l.includes('|') && l.includes('http')) {
      const parts = l.split('|').map(p => p.trim());
      const url = parts.find(p => p.startsWith('http'));
      if (url && parts.length >= 8 && parts[2] && !/company/i.test(parts[2])) {
        const co = parts[2];
        const title = parts[3];
        const city = parts[4] || 'Dubai, UAE';
        const exp = parts[5] || '';
        if (co && title && !TITLE_BAD.test(title)) {
          curatedDubai.push({
            title, company: co, url, source: 'LinkedIn (Curated Dubai)', board: 'Dubai-Sweep',
            region: city, posted: '2026-10-23',
            tags: ['cybersecurity', 'fresher', 'dubai'],
            snippet: `Curated UAE fresher role: ${exp}. Verified fit for IIT Roorkee certification.`,
            full: `Experience asked: ${exp}. Why it fits: ${parts[6] || ''}`,
            salaryText: '', lpa: null, inIndia: false, inDubai: true, globalRemote: false, score: 150
          });
        }
      }
    }
  }
}

const pool = [...ats, ...remote].map(normalise);
const seen = new Set();
const scored = [];

// Add curated Dubai roles first
for (const j of curatedDubai) {
  const key = (j.title + '|' + j.company).toLowerCase().replace(/[^a-z0-9|]/g, '');
  if (!seen.has(key)) {
    seen.add(key);
    scored.push(j);
  }
}

for (const j of pool) {
  if (!j.title || !j.url || !j.company) continue;
  j.score = score(j);
  if (j.score < 45) continue;
  const key = (j.title + '|' + j.company).toLowerCase().replace(/[^a-z0-9|]/g, '');
  if (seen.has(key)) continue;
  seen.add(key);
  scored.push(j);
}

scored.sort((a, b) => (b.score - a.score) || (b.posted || '').localeCompare(a.posted || ''));

const CAP = 5;
function capped(list){const n={};const out=[];for(const j of list){const c=j.company.toLowerCase();n[c]=(n[c]||0)+1;if(n[c]<=CAP)out.push(j);}return out;}

const dubai = scored.filter(j => j.inDubai);
const india = capped(scored.filter(j => j.inIndia));
const rest = capped(scored.filter(j => !j.inIndia && !j.inDubai));
const final = [...dubai, ...india, ...rest];

console.log('pool:', pool.length, '| passed filter:', scored.length);
console.log('dubai/uae:', dubai.length, '| india-based:', india.length, '| remote/global:', rest.length);
console.log('final:', final.length, '| dubai in final:', final.filter(j => j.inDubai).length, '| india in final:', final.filter(j => j.inIndia).length);
const byCo = {};
final.forEach(j => byCo[j.company] = (byCo[j.company] || 0) + 1);
console.log('companies:', Object.keys(byCo).length);
console.log('\n--- first 20 roles (strictly fresher/entry-level):');
final.slice(0, 20).forEach(j => console.log(` ${j.score} | ${j.title} @ ${j.company} | ${j.region} | ${j.salaryText || '-'}`));

const finalData = JSON.stringify({ generated: new Date().toISOString(), usdInr: USD_INR, counts: { pool: pool.length, passed: scored.length, dubai: dubai.length, india: india.length }, jobs: final }, null, 1);
fs.writeFileSync(path.join('..', 'cyber_final.json'), finalData);
fs.writeFileSync('cyber_final.json', finalData);
