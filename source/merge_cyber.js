// Merge ATS + remote-board cyber jobs, filter to cybersecurity roles Imran can apply to, rank, take 100+.
const fs = require('fs');
const path = require('path');

const atsPath = path.join('..', 'ats_cyber_raw.json');
const remotePath = path.join('..', 'cyber_jobs.json');

const ats = fs.existsSync(atsPath) ? JSON.parse(fs.readFileSync(atsPath, 'utf8')) : [];
const remote = fs.existsSync(remotePath) ? JSON.parse(fs.readFileSync(remotePath, 'utf8')).jobs : [];

const USD_INR = 88;
const INDIA = /\b(india|bangalore|bengaluru|hyderabad|mumbai|pune|delhi|gurgaon|gurugram|noida|chennai|kolkata|ahmedabad|jaipur|indore|kochi|coimbatore|trivandrum|thiruvananthapuram|mysore|mysuru|chandigarh|nagpur|bhubaneswar|vizag|visakhapatnam)\b/i;
const DUBAI = /\b(dubai|abu dhabi|uae|united arab emirates|sharjah|ajman|gcc|middle east|gulf)\b/i;
const GLOBAL_REMOTE = /\b(worldwide|anywhere|global|remote\s*-\s*global|apac|asia)\b/i;

const TITLE_STRONG = /\b(soc analyst|security analyst|cyber\s*security analyst|penetration tester|pen\s*test|vulnerability analyst|security engineer|appsec|application security|grc analyst|information security analyst|infosec|cyber\s*security|incident response|threat (intelligence|analyst|hunter)|blue team|red team|security operations|devsecops|cloud security engineer|network security engineer|endpoint security)\b/i;
const TITLE_GOOD = /\b(security|secops|siem|risk analyst|compliance analyst|it security|data protection|privacy analyst|iam analyst|security awareness|offensive security|defensive security|security consultant|security monitoring|malware analyst|forensic analyst|security researcher|vapt)\b/i;
const STACK = /\b(splunk|siem|qradar|sentinel|crowdstrike|palo alto|fortinet|wireshark|nessus|qualys|burp suite|metasploit|nmap|kali|snort|suricata|ossec|wazuh|elastic security|carbon black|cyberark|hashicorp vault|okta|aws security|azure security|gcp security|owasp|mitre att&ck|iso 27001|nist|soc 2|gdpr|pci.dss|firewall|ids|ips|edr|xdr|soar|python|bash|powershell|osint|ceh|cissp|comptia)\b/i;

const TITLE_BAD = /\b(intern|internship|apprentice|principal|staff|distinguished|fellow|director|head of|vp\b|vice president|chief|ciso|architect|engineering manager|10\+ years|8\+ years|12\+ years|president|sales|marketing|account executive|customer success|designer|ux|ui designer|writer|content|legal|counsel|finance|accountant|hr\b|people partner|talent|office|executive assistant|product manager|program manager|project manager|business|strategy|operations|front[\s-]?end|ios\b|android\b|mobile|unity|game)\b/i;
const YEARS_BAD = /\b(?:8|9|10|11|12|15)\s*\+?\s*years\b/i;
const YEARS_OK = /\b(?:0|1|2|3|4|5|6)\s*[-–to]+\s*(?:3|4|5|6|7)\s*years\b|\b(?:1|2|3)\s*\+?\s*years\b/i;

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
    region: region || (globalRemote ? 'Remote' : ''), posted: j.posted || '',
    tags: (j.tags || []).slice(0, 6), snippet: (j.snippet || '').slice(0, 260), full: (j.full || j.snippet || ''),
    salaryText, lpa: j.lpa != null ? j.lpa : lpaOf(salaryText), inIndia, inDubai, globalRemote,
  };
}

function score(j) {
  const t = j.title;
  const hay = `${t} ${j.tags.join(' ')} ${j.full || j.snippet}`;
  if (TITLE_BAD.test(t)) return 0;
  let s = 0;
  if (TITLE_STRONG.test(t)) s += 70;
  else if (TITLE_GOOD.test(t)) s += 42;
  else return 0;
  // Cybersecurity stack keywords
  if (/\b(siem|splunk|qradar|sentinel)\b/i.test(hay)) s += 14;
  if (/\b(penetration|vapt|burp|metasploit|nmap|kali)\b/i.test(hay)) s += 12;
  if (/\b(python|bash|powershell|scripting)\b/i.test(hay)) s += 10;
  if (STACK.test(hay)) s += 6;
  if (/\b(ii|2|l2|analyst (1|2|i|ii))\b/i.test(t)) s += 10;
  if (/\bsenior\b/i.test(t)) s -= 6;
  if (YEARS_BAD.test(hay)) s -= 30;
  if (YEARS_OK.test(hay)) s += 8;
  // Location preferences: India and Dubai/UAE get priority
  if (j.inIndia) s += 45;
  else if (j.inDubai) s += 40;
  else if (j.globalRemote) s += 14;
  else s -= 22;
  if (j.lpa && j.lpa >= 6) s += 12;
  return s;
}

const pool = [...ats, ...remote].map(normalise);
const seen = new Set();
const scored = [];
for (const j of pool) {
  if (!j.title || !j.url || !j.company) continue;
  j.score = score(j);
  if (j.score < 35) continue;
  const key = (j.title + '|' + j.company).toLowerCase().replace(/[^a-z0-9|]/g, '');
  if (seen.has(key)) continue;
  seen.add(key);
  scored.push(j);
}
scored.sort((a, b) => (b.score - a.score) || (b.posted || '').localeCompare(a.posted || ''));

const CAP = 8;
function capped(list){const n={};const out=[];for(const j of list){const c=j.company.toLowerCase();n[c]=(n[c]||0)+1;if(n[c]<=CAP)out.push(j);}return out;}
const india = capped(scored.filter(j => j.inIndia));
const dubai = capped(scored.filter(j => j.inDubai && !j.inIndia));
const rest = capped(scored.filter(j => !j.inIndia && !j.inDubai));
const final = [...india, ...dubai, ...rest];

console.log('pool:', pool.length, '| passed filter:', scored.length);
console.log('india-based:', india.length, '| dubai/uae:', dubai.length, '| remote/global:', rest.length);
console.log('final:', final.length, '| india in final:', final.filter(j => j.inIndia).length, '| dubai in final:', final.filter(j => j.inDubai).length, '| salary shown:', final.filter(j => j.lpa).length);
const byCo = {};
final.forEach(j => byCo[j.company] = (byCo[j.company] || 0) + 1);
console.log('companies:', Object.keys(byCo).length);
console.log('\n--- first 20 roles:');
final.slice(0, 20).forEach(j => console.log(` ${j.score} | ${j.title} @ ${j.company} | ${j.region} | ${j.salaryText || '-'}`));
fs.writeFileSync(path.join('..', 'cyber_final.json'), JSON.stringify({ generated: new Date().toISOString(), usdInr: USD_INR, counts: { pool: pool.length, passed: scored.length, india: india.length, dubai: dubai.length }, jobs: final }, null, 1));
