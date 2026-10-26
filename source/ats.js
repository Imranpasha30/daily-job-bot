// Probe public ATS job boards (Greenhouse / Lever / Ashby) for India-hiring tech companies.
const fs = require('fs');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36';

const TOKENS = `postman hasura atlan chargebee freshworks browserstack zeta cred meesho razorpay groww swiggy dream11
sprinklr innovaccer whatfix mindtickle clevertap druva icertis leadsquared darwinbox eightfold gupshup exotel netcore
moengage wingify zluri plivo hevodata airmeet fampay jupiter slice navi zepto udaan purplle nykaa lenskart urbancompany
cars24 spinny policybazaar acko phonepe paytm mobikwik khatabook bharatpe instamojo cashfree juspay pinelabs signzy
perfios setu zoho flipkart myntra ola olacabs rapido porter delhivery shiprocket unacademy byjus vedantu upgrad
simplilearn scaler interviewbit coursera udemy hackerrank hackerearth turing andela toptal gitlab elastic mongodb
confluent databricks snowflake hashicorp datadog grafana temporal airbyte dbtlabs fivetran segment amplitude mixpanel
twilio sendbird agora daily deepgram assemblyai cohere anthropic openai scaleai weights huggingface replicate modal
vercel netlify supabase planetscale neon railway render flyio cloudflare fastly stripe adyen checkout gocardless
wise revolut monzo starling zerodha smallcase tickertape indmoney dhan angelone kuvera fi epifi jar stable rupeek
khatabook refyne jupiter uni onecard niyo fibe kreditbee moneyview lendingkart indifi flexiloans u-gro capitalfloat
razorpaysoftware emeritus eruditus newtonschool masaischool pesto crio geektrust instahyre cutshort wellfound
sarvam krutrim sarvamai ather ultraviolette bluesmart zypp yulu chalo blusmart`.trim().split(/\s+/);

const EXTRA_GH = ['stripe', 'airtable', 'figma', 'notion', 'linear', 'retool', 'sentry', 'checkr', 'samsara', 'affirm', 'robinhood', 'coinbase', 'reddit', 'discord', 'canva', 'atlassian', 'grammarly', 'duolingo'];

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
  const list = [...new Set([...TOKENS, ...EXTRA_GH])];
  const CONC = 8;
  let i = 0;
  async function worker() {
    while (i < list.length) {
      const tok = list[i++];
      for (const [name, fn] of [['gh', greenhouse], ['lv', lever], ['as', ashby]]) {
        const rows = await fn(tok);
        if (rows.length) { hits.push(`${tok}:${name}=${rows.length}`); all.push(...rows); break; }
      }
      await sleep(60);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  console.log('boards with jobs:', hits.length);
  console.log(hits.join('  '));
  console.log('total postings:', all.length);
  fs.writeFileSync('ats_raw.json', JSON.stringify(all));
})();
