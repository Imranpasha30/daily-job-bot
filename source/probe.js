// Probe a large list of candidate ATS slugs across Greenhouse / Lever / Ashby / SmartRecruiters.
// usage: node probe.js tokens.json out.json [concurrency]
const fs = require('fs');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const strip = h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

const [, , tokFile, outFile, concArg] = process.argv;
const CONC = Number(concArg) || 12;
const tokens = JSON.parse(fs.readFileSync(tokFile, 'utf8'));
const SEEN = new Set(JSON.parse(fs.existsSync('probed.json') ? fs.readFileSync('probed.json', 'utf8') : '[]'));

async function tryJson(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
    if (!r.ok) return null;
    const t = await r.text();
    if (!t || (t[0] !== '{' && t[0] !== '[')) return null;
    return JSON.parse(t);
  } catch { return null; }
}

async function greenhouse(tok) {
  const d = await tryJson(`https://boards-api.greenhouse.io/v1/boards/${tok}/jobs?content=true`);
  if (!d || !Array.isArray(d.jobs)) return [];
  return d.jobs.map(j => ({
    source: 'Greenhouse', board: tok, title: j.title, company: j.company_name || tok, url: j.absolute_url,
    region: j.location?.name || '', posted: (j.first_published || j.updated_at || '').slice(0, 10),
    tags: (j.metadata || []).map(m => m.value).filter(v => typeof v === 'string').slice(0, 6),
    snippet: strip(j.content).slice(0, 400), full: strip(j.content).slice(0, 3000), salaryText: '',
  }));
}
async function lever(tok) {
  const d = await tryJson(`https://api.lever.co/v0/postings/${tok}?mode=json`);
  if (!Array.isArray(d)) return [];
  return d.map(j => ({
    source: 'Lever', board: tok, title: j.text, company: tok, url: j.hostedUrl || j.applyUrl,
    region: j.categories?.location || '', posted: j.createdAt ? new Date(j.createdAt).toISOString().slice(0, 10) : '',
    tags: [j.categories?.team, j.categories?.commitment].filter(Boolean),
    snippet: strip(j.descriptionPlain || j.description).slice(0, 400), full: strip(j.descriptionPlain || j.description).slice(0, 3000),
    salaryText: j.salaryRange ? `${j.salaryRange.currency} ${j.salaryRange.min}-${j.salaryRange.max}` : '',
  }));
}
async function ashby(tok) {
  const d = await tryJson(`https://api.ashbyhq.com/posting-api/job-board/${tok}?includeCompensation=true`);
  if (!d || !Array.isArray(d.jobs)) return [];
  return d.jobs.map(j => ({
    source: 'Ashby', board: tok, title: j.title, company: j.organizationName || tok, url: j.jobUrl || j.applyUrl,
    region: j.location || '', posted: (j.publishedAt || '').slice(0, 10), tags: [j.department, j.team].filter(Boolean),
    snippet: strip(j.descriptionPlain || j.descriptionHtml).slice(0, 400), full: strip(j.descriptionPlain || j.descriptionHtml).slice(0, 3000),
    salaryText: j.compensation?.compensationTierSummary || '',
  }));
}
async function smartrecruiters(tok) {
  const d = await tryJson(`https://api.smartrecruiters.com/v1/companies/${tok}/postings?limit=100&country=in`);
  if (!d || !Array.isArray(d.content)) return [];
  return d.content.map(j => ({
    source: 'SmartRecruiters', board: tok, title: j.name, company: j.company?.name || tok,
    url: `https://jobs.smartrecruiters.com/${tok}/${j.id}`,
    region: [j.location?.city, j.location?.region, j.location?.country].filter(Boolean).join(', '),
    posted: (j.releasedDate || '').slice(0, 10), tags: [j.department?.label, j.function?.label].filter(Boolean),
    snippet: strip(j.jobAd?.sections?.jobDescription?.text || '').slice(0, 400),
    full: strip(j.jobAd?.sections?.jobDescription?.text || '').slice(0, 3000), salaryText: '',
  }));
}

(async () => {
  const all = []; const hits = [];
  let i = 0, checked = 0;
  const probed = new Set();
  async function worker() {
    while (i < tokens.length) {
      const tok = tokens[i++];
      checked++;
      if (SEEN.has(tok)) continue;
      probed.add(tok);
      for (const [n, fn] of [['gh', greenhouse], ['lv', lever], ['as', ashby], ['sr', smartrecruiters]]) {
        let rows = [];
        try { rows = await fn(tok); } catch { rows = []; }
        if (rows.length) { hits.push(`${tok}:${n}=${rows.length}`); all.push(...rows); break; }
      }
      if (checked % 100 === 0) console.error(`  ...${checked}/${tokens.length} probed, ${hits.length} boards found, ${all.length} postings`);
      await sleep(25);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  console.log('boards found:', hits.length);
  console.log(hits.join('  '));
  console.log('postings:', all.length);
  fs.writeFileSync(outFile, JSON.stringify(all));
  fs.writeFileSync('probed.json', JSON.stringify([...SEEN, ...probed]));
})();
