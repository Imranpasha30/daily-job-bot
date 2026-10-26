// Pull the real application-form questions for every listed job, straight from the ATS APIs.
const fs = require('fs');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const tabs = JSON.parse(fs.readFileSync('tabs.json', 'utf8'));
const listed = [...tabs.tabA, ...tabs.tabB];
const RAW = ['ats_raw.json', 'ats_raw2.json', 'ats_raw3.json']
  .filter(f => fs.existsSync(f)).flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const byUrl = new Map(RAW.map(r => [r.url, r]));

async function getJson(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

function ghJobId(url) {
  let m = url.match(/[?&]gh_jid=(\d+)/); if (m) return m[1];
  m = url.match(/\/jobs\/(\d+)/); if (m) return m[1];
  return null;
}

const STD = /^(first name|last name|preferred first name|full name|email|phone|resume\/?cv|resume|cv|cover letter|linkedin( profile)?( url)?|github( profile)?( url)?|website|portfolio|location|city|country|how did you hear|are you legally|do you (now or )?require|gender|race|ethnicity|veteran|disability|hispanic|pronouns|are you comfortable|i certify|i consent|privacy|gdpr|consent)/i;

(async () => {
  const perJob = [];
  const agg = new Map();
  let gh = 0, got = 0, i = 0;
  const targets = listed.filter(j => {
    const raw = byUrl.get(j.u);
    return raw && raw.source === 'Greenhouse' && raw.board && ghJobId(j.u);
  });
  console.error(`Greenhouse jobs to query: ${targets.length} of ${listed.length} listed`);

  const CONC = 8;
  let idx = 0;
  async function worker() {
    while (idx < targets.length) {
      const j = targets[idx++];
      const raw = byUrl.get(j.u);
      const id = ghJobId(j.u);
      gh++;
      const d = await getJson(`https://boards-api.greenhouse.io/v1/boards/${raw.board}/jobs/${id}?questions=true`);
      if (d && Array.isArray(d.questions)) {
        got++;
        const qs = d.questions.map(q => ({
          label: String(q.label || '').replace(/\s+/g, ' ').trim(),
          required: !!q.required,
          type: (q.fields || []).map(f => f.type).join(','),
          options: (q.fields || []).flatMap(f => (f.values || []).map(v => String(v.label))).slice(0, 12),
        })).filter(q => q.label);
        perJob.push({ company: j.c, title: j.t, url: j.u, questions: qs });
        for (const q of qs) {
          if (STD.test(q.label)) continue;
          const key = q.label.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
          if (!agg.has(key)) agg.set(key, { label: q.label, n: 0, required: 0, type: q.type, options: q.options, companies: new Set() });
          const a = agg.get(key);
          a.n++; if (q.required) a.required++;
          a.companies.add(j.c);
          if (q.options.length && !a.options.length) a.options = q.options;
        }
      }
      if (++i % 25 === 0) console.error(`  ...${i}/${targets.length}`);
      await sleep(40);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));

  const ranked = [...agg.values()]
    .map(a => ({ label: a.label, asked_by: a.companies.size, times: a.n, required: a.required, type: a.type, options: a.options }))
    .sort((x, y) => y.asked_by - x.asked_by || y.times - x.times);

  fs.writeFileSync('questions_by_job.json', JSON.stringify(perJob, null, 1));
  fs.writeFileSync('questions_ranked.json', JSON.stringify(ranked, null, 1));
  console.log(`queried ${gh} Greenhouse jobs, got questions for ${got}`);
  console.log(`distinct non-standard questions: ${ranked.length}`);
  console.log('');
  console.log('TOP 40 QUESTIONS YOU WILL ACTUALLY BE ASKED:');
  ranked.slice(0, 40).forEach((q, n) => {
    console.log(`${String(n + 1).padStart(3)}. [${q.asked_by} companies] ${q.label}`);
    if (q.options.length) console.log(`       options: ${q.options.join(' | ')}`);
  });
})();
