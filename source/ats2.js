// Second probe round: alternate tokens + SmartRecruiters + Recruitee for India-heavy employers.
const fs = require('fs');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const strip = h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

async function tryJson(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    const t = await r.text();
    if (!t || (t[0] !== '{' && t[0] !== '[')) return null;
    return JSON.parse(t);
  } catch { return null; }
}

const ALT = `razorpaysoftware razorpaysoftwareprivatelimited swiggy zomato flipkart phonepe dreamsports dream11fantasy
sprinklrindia browserstacksoftware postmanlabs getpostman hasurahq chargebeeinc freshworksinc zeptonow urbancompanyinc
lenskartsolutions cars24services spinnyauto ackotechnology juspaytechnologies cashfreepayments moengageinc clevertapindia
whatfixinc innovaccerinc leadsquaredmarketing darwinboxdigital eightfoldai exotel plivoinc netcoresolutions gupshupio
zluriinc uniphore yellowai haptikai rapidobike delhiverylimited shiprocketinc unacademyindia scalerofficial
newtonschoolofficial smallcasehq tickertape zerodhatech dhanhq angelonebroking kuveraindia epifi jarapp
rupeekfintech onecardapp niyosolutions fibeindia kreditbee moneyviewindia lendingkart indifi flexiloans ugrocapital
chaloapp yuluhq zyppelectric atherenergy ultraviolette pristyncare purplle nykaafashion sharechat mohallatech
inmobi glance mpl mobilepremierleague gameskraft winzo zupee jupitermoney slicepay bharatpeindia khatabookapp
okcredit instamojo setu decentro signzy perfios m2pfintech pinelabs mswipe ezetap razorpayx
turingcom andelaindia crioofficial pestotech masaischool emeritus eruditus upgradcampus byjusindia vedantuinnovations
simplilearnsolutions interviewbit hackerearthindia geektrust instahyreofficial cutshortio wellfoundhq`.trim().split(/\s+/);

const SR = ['swiggy', 'zomato', 'flipkart', 'razorpay', 'phonepe', 'sprinklr', 'browserstack', 'postman', 'freshworks',
  'nykaa', 'lenskart', 'cars24', 'urbancompany', 'delhivery', 'unacademy', 'sharechat', 'inmobi', 'dream11',
  'mpl', 'zepto', 'purplle', 'acko', 'juspay', 'cashfree', 'moengage', 'clevertap', 'whatfix', 'innovaccer',
  'publicissapient', 'thoughtworks', 'ltimindtree', 'mphasis', 'zensar', 'birlasoft'];

async function greenhouse(tok) {
  const d = await tryJson(`https://boards-api.greenhouse.io/v1/boards/${tok}/jobs?content=true`);
  if (!d || !Array.isArray(d.jobs)) return [];
  return d.jobs.map(j => ({ source: 'Greenhouse', board: tok, title: j.title, company: j.company_name || tok, url: j.absolute_url, region: j.location?.name || '', posted: (j.updated_at || '').slice(0, 10), tags: [], snippet: strip(j.content).slice(0,400), full: strip(j.content).slice(0,3000), salaryText: '' }));
}
async function lever(tok) {
  const d = await tryJson(`https://api.lever.co/v0/postings/${tok}?mode=json`);
  if (!Array.isArray(d)) return [];
  return d.map(j => ({ source: 'Lever', board: tok, title: j.text, company: tok, url: j.hostedUrl || j.applyUrl, region: j.categories?.location || '', posted: j.createdAt ? new Date(j.createdAt).toISOString().slice(0, 10) : '', tags: [j.categories?.team].filter(Boolean), snippet: strip(j.descriptionPlain || j.description).slice(0,400), full: strip(j.descriptionPlain || j.description).slice(0,3000), salaryText: j.salaryRange ? `${j.salaryRange.currency} ${j.salaryRange.min}-${j.salaryRange.max}` : '' }));
}
async function ashby(tok) {
  const d = await tryJson(`https://api.ashbyhq.com/posting-api/job-board/${tok}?includeCompensation=true`);
  if (!d || !Array.isArray(d.jobs)) return [];
  return d.jobs.map(j => ({ source: 'Ashby', board: tok, title: j.title, company: tok, url: j.jobUrl || j.applyUrl, region: j.location || '', posted: (j.publishedAt || '').slice(0, 10), tags: [j.department].filter(Boolean), snippet: strip(j.descriptionPlain || j.descriptionHtml).slice(0,400), full: strip(j.descriptionPlain || j.descriptionHtml).slice(0,3000), salaryText: j.compensation?.compensationTierSummary || '' }));
}
async function smartrecruiters(tok) {
  const d = await tryJson(`https://api.smartrecruiters.com/v1/companies/${tok}/postings?limit=100&country=in`);
  if (!d || !Array.isArray(d.content)) return [];
  return d.content.map(j => ({
    source: 'SmartRecruiters', board: tok, title: j.name, company: j.company?.name || tok,
    url: `https://jobs.smartrecruiters.com/${tok}/${j.id}`,
    region: [j.location?.city, j.location?.region, j.location?.country].filter(Boolean).join(', '),
    posted: (j.releasedDate || '').slice(0, 10), tags: [j.department?.label, j.function?.label].filter(Boolean),
    snippet: strip(j.jobAd?.sections?.jobDescription?.text||'').slice(0,400), full: strip(j.jobAd?.sections?.jobDescription?.text||'').slice(0,3000), salaryText: '',
  }));
}

(async () => {
  const all = []; const hits = [];
  const jobsOf = async (tok) => {
    for (const [n, fn] of [['gh', greenhouse], ['lv', lever], ['as', ashby]]) {
      const r = await fn(tok); if (r.length) { hits.push(`${tok}:${n}=${r.length}`); return r; }
    }
    return [];
  };
  let i = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (i < ALT.length) { const t = ALT[i++]; all.push(...await jobsOf(t)); await sleep(50); }
  }));
  let k = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (k < SR.length) {
      const t = SR[k++];
      const r = await smartrecruiters(t);
      if (r.length) { hits.push(`${t}:sr=${r.length}`); all.push(...r); }
      await sleep(80);
    }
  }));
  console.log('new boards:', hits.length);
  console.log(hits.join('  '));
  console.log('new postings:', all.length);
  fs.writeFileSync('ats_raw2.json', JSON.stringify(all));
})();
