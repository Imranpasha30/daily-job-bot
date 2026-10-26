// Probe public ATS job boards (Greenhouse / Lever / Ashby) for cybersecurity roles.
const fs = require('fs');
const path = require('path');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36';

const TOKENS = JSON.parse(fs.readFileSync('tokens.json', 'utf8'));

// Security-focused companies to add on top of the general tokens list
const SECURITY_EXTRA = [
  'paloaltonetworks', 'crowdstrike', 'rubrik', 'zscaler', 'sentinelone', 'fortinet', 'tenable', 'snyk',
  'okta', 'auth0', 'cyberark', 'trellix', 'netskope', 'lacework', 'wiz', 'orca', 'aquasecurity',
  'sysdig', 'falconforce', 'bugcrowd', 'hackerone', 'synack', 'rapid7', 'secureworks', 'mandiant',
  'fireeye', 'recordedfuture', 'anomali', 'threatconnect', 'splunk', 'sumo', 'sumologic', 'elastic',
  'datadog', 'grafanalabs', 'safesecurity', 'lucideus', 'cloudsek', 'traceableai', 'akto', 'indusface',
  'sequretek', 'instasafe', 'armorcode', 'endor', 'apiiro', 'orca-security', 'drata', 'vanta',
  'sprinto', 'scrut', 'securin', 'sophos', 'trendmicro', 'kaspersky', 'mcafee', 'norton',
  'qualys', 'checkmarx', 'veracode', 'sonarqube', 'immunefi', 'bitninja', 'bishopfox',
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function tryJson(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    const t = await r.text();
    if (!t || t[0] !== '{' && t[0] !== '[') return null;
    return JSON.parse(t);
  } catch { return null; }
}

const strip = h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

// Cybersecurity keyword filter
const CYBER_KW = /\b(cyber\s*security|information security|infosec|soc analyst|security analyst|penetration test|pen\s*test|vulnerability|security engineer|appsec|application security|grc|incident response|threat (intelligence|analyst|hunter)|blue team|red team|security operations|network security|endpoint security|malware|forensic|devsecops|cloud security|security consultant|security monitoring|siem|secops|offensive security|defensive security|security researcher|vapt|osint|iam|identity.*access|data protection|compliance.*security|risk.*security|edr|xdr|soar|security intern|security associate|security manager|it security)\b/i;

function isCyberJob(j) {
  const hay = `${j.title} ${(j.tags || []).join(' ')} ${j.snippet || ''} ${j.full || ''}`;
  return CYBER_KW.test(j.title) || CYBER_KW.test(hay);
}

async function greenhouse(tok) {
  const d = await tryJson(`https://boards-api.greenhouse.io/v1/boards/${tok}/jobs?content=true`);
  if (!d || !Array.isArray(d.jobs)) return [];
  return d.jobs.map(j => ({
    source: 'Greenhouse', board: tok, title: j.title, company: (j.company_name || tok),
    url: j.absolute_url, region: j.location?.name || '', posted: (j.updated_at || j.first_published || '').slice(0, 10),
    tags: (j.metadata || []).map(m => m.value).filter(v => typeof v === 'string'),
    snippet: strip(j.content).slice(0,400), full: strip(j.content).slice(0,3000), salaryText: '', type: '',
  }));
}
async function lever(tok) {
  const d = await tryJson(`https://api.lever.co/v0/postings/${tok}?mode=json`);
  if (!Array.isArray(d)) return [];
  return d.map(j => ({
    source: 'Lever', board: tok, title: j.text, company: tok,
    url: j.hostedUrl || j.applyUrl, region: j.categories?.location || '',
    posted: j.createdAt ? new Date(j.createdAt).toISOString().slice(0, 10) : '',
    tags: [j.categories?.team, j.categories?.commitment].filter(Boolean),
    snippet: strip(j.descriptionPlain || j.description).slice(0,400), full: strip(j.descriptionPlain || j.description).slice(0,3000), salaryText: j.salaryRange ? `${j.salaryRange.currency} ${j.salaryRange.min}-${j.salaryRange.max}` : '', type: j.categories?.commitment || '',
  }));
}
async function ashby(tok) {
  const d = await tryJson(`https://api.ashbyhq.com/posting-api/job-board/${tok}?includeCompensation=true`);
  if (!d || !Array.isArray(d.jobs)) return [];
  return d.jobs.map(j => ({
    source: 'Ashby', board: tok, title: j.title, company: tok,
    url: j.jobUrl || j.applyUrl, region: j.location || (j.address?.postalAddress?.addressLocality || ''),
    posted: (j.publishedAt || '').slice(0, 10), tags: [j.department, j.team, j.employmentType].filter(Boolean),
    snippet: strip(j.descriptionPlain || j.descriptionHtml).slice(0,400), full: strip(j.descriptionPlain || j.descriptionHtml).slice(0,3000),
    salaryText: j.compensation?.compensationTierSummary || '', type: j.employmentType || '',
  }));
}

(async () => {
  const all = [];
  const hits = [];
  const list = [...new Set([...TOKENS, ...SECURITY_EXTRA])];
  const CONC = 8;
  let i = 0;
  async function worker() {
    while (i < list.length) {
      const tok = list[i++];
      for (const [name, fn] of [['gh', greenhouse], ['lv', lever], ['as', ashby]]) {
        const rows = await fn(tok);
        if (rows.length) {
          const cyberRows = rows.filter(isCyberJob);
          if (cyberRows.length) {
            hits.push(`${tok}:${name}=${cyberRows.length}`);
            all.push(...cyberRows);
          }
          break;
        }
      }
      await sleep(60);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  console.log('boards with cyber jobs:', hits.length);
  console.log(hits.join('  '));
  console.log('total cyber postings:', all.length);
  fs.writeFileSync(path.join('..', 'ats_cyber_raw.json'), JSON.stringify(all));
})();
