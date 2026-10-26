// Fetch real backend jobs from public APIs, normalise, filter, rank.
const fs = require('fs');
const path = require('path');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36';
const USD_INR = 88; // disclosed on the page

async function get(url, label) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!r.ok) { console.error(label, 'HTTP', r.status); return null; }
    const t = await r.text();
    fs.writeFileSync(path.join('raw', label + '.json'), t);
    return JSON.parse(t);
  } catch (e) { console.error(label, 'ERR', e.message); return null; }
}

const strip = h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();

// ---------- relevance ----------
const STRONG = /\b(back[\s-]?end|backend engineer|backend developer|python|fastapi|django|flask|node\.?js|nodejs|express\.?js|golang|\bgo\b developer|api engineer|platform engineer|distributed systems|microservice)/i;
const MEDIUM = /\b(software engineer|software developer|full[\s-]?stack|sde|api|server[\s-]?side|data engineer|devops|site reliability|sre|cloud engineer)\b/i;
const STACK = /\b(python|fastapi|django|flask|node\.?js|nodejs|express|typescript|postgres(ql)?|redis|docker|kubernetes|aws|graphql|rest api|microservices|celery|rabbitmq|kafka|sqlalchemy|prisma|mongodb|mysql)\b/i;
const BAD = /\b(front[\s-]?end only|ui\/ux|graphic design|designer|marketing|sales|recruiter|copywriter|content writer|customer support|account manager|teacher|tutor|nurse|driver|accountant|social media|seo specialist|virtual assistant|data entry|wordpress|php developer|\.net developer|salesforce|android developer|ios developer|flutter developer|qa automation|manual tester)\b/i;
const SENIOR_ONLY = /\b(principal|staff engineer|head of|vp of|director of|chief|architect|engineering manager|10\+ years|8\+ years|12\+ years)\b/i;

function score(j) {
  const hay = `${j.title} ${j.tags.join(' ')} ${j.snippet}`;
  const t = j.title;
  if (BAD.test(t)) return 0;
  let s = 0;
  if (STRONG.test(t)) s += 60;
  else if (MEDIUM.test(t)) s += 30;
  if (STRONG.test(hay)) s += 10;
  if (STACK.test(hay)) s += 12;
  if (/\b(python|fastapi|django)\b/i.test(hay)) s += 8;
  if (/\b(node\.?js|express|typescript)\b/i.test(hay)) s += 8;
  if (SENIOR_ONLY.test(t)) s -= 25;
  if (/\b(intern|internship)\b/i.test(t)) s -= 40;
  if (/\b(junior|entry|graduate|associate|mid[\s-]level|i{1,2}\b)\b/i.test(t)) s += 6;
  return s;
}

// India eligibility from a free-text region string
function indiaFlag(region) {
  const r = String(region || '').toLowerCase();
  if (!r || /anywhere|worldwide|global|remote$/.test(r) && r.length < 12) return 'maybe';
  if (/\bindia\b|asia|apac|worldwide|anywhere|global/.test(r)) return 'yes';
  if (/usa|u\.s\.|united states|us only|canada|uk only|united kingdom|emea|europe|eu only|germany|latam|australia|brazil|africa only/.test(r)) return 'no';
  return 'maybe';
}

// salary -> {text, lpa}
function salary(raw, min, max, currency) {
  let lo = Number(min) || 0, hi = Number(max) || 0, cur = (currency || 'USD').toUpperCase();
  const text = String(raw || '').trim();
  if (!lo && !hi && text) {
    const nums = text.replace(/,/g, '').match(/\d+(?:\.\d+)?\s*[kK]?/g);
    if (nums) {
      const vals = nums.map(n => /k/i.test(n) ? parseFloat(n) * 1000 : parseFloat(n)).filter(v => v > 1000);
      if (vals.length) { lo = Math.min(...vals); hi = Math.max(...vals); }
    }
    if (/₹|inr|lpa|lakh/i.test(text)) cur = 'INR';
  }
  if (!lo && !hi) return { text: text || '', lpa: null, cur };
  const annual = hi || lo;
  let lpa = null;
  if (cur === 'INR') lpa = annual > 100000 ? annual / 100000 : annual;
  else if (cur === 'USD') lpa = (annual * USD_INR) / 100000;
  else if (cur === 'EUR') lpa = (annual * USD_INR * 1.08) / 100000;
  else if (cur === 'GBP') lpa = (annual * USD_INR * 1.27) / 100000;
  else lpa = (annual * USD_INR) / 100000;
  const fmt = n => n >= 1000 ? Math.round(n / 1000) + 'k' : String(Math.round(n));
  const disp = text || (lo && hi && lo !== hi ? `${cur} ${fmt(lo)}–${fmt(hi)}` : `${cur} ${fmt(annual)}`);
  return { text: disp, lpa: Math.round(lpa * 10) / 10, cur };
}

(async () => {
  fs.mkdirSync('raw', { recursive: true });
  const out = [];

  // 1. Remotive
  const rv = await get('https://remotive.com/api/remote-jobs?category=software-dev&limit=400', 'remotive');
  for (const j of (rv?.jobs || [])) {
    const s = salary(j.salary);
    out.push({
      source: 'Remotive', title: j.title, company: j.company_name, url: j.url,
      region: j.candidate_required_location || 'Remote', posted: (j.publication_date || '').slice(0, 10),
      tags: j.tags || [], snippet: strip(j.description).slice(0, 320), salaryText: s.text, lpa: s.lpa,
      type: j.job_type || '', remote: true,
    });
  }

  // 2. RemoteOK
  const ro = await get('https://remoteok.com/api', 'remoteok');
  for (const j of (Array.isArray(ro) ? ro.slice(1) : [])) {
    const s = salary('', j.salary_min, j.salary_max, 'USD');
    out.push({
      source: 'RemoteOK', title: j.position || j.title, company: j.company, url: j.url || j.apply_url,
      region: j.location || 'Remote', posted: (j.date || '').slice(0, 10), tags: j.tags || [],
      snippet: strip(j.description).slice(0, 320), salaryText: s.text, lpa: s.lpa, type: '', remote: true,
    });
  }

  // 3. Jobicy
  const jy = await get('https://jobicy.com/api/v2/remote-jobs?count=200&industry=engineering', 'jobicy');
  for (const j of (jy?.jobs || [])) {
    const s = salary('', j.annualSalaryMin, j.annualSalaryMax, j.salaryCurrency || 'USD');
    out.push({
      source: 'Jobicy', title: j.jobTitle, company: j.companyName, url: j.url,
      region: (Array.isArray(j.jobGeo) ? j.jobGeo.join(', ') : j.jobGeo) || 'Remote',
      posted: (j.pubDate || '').slice(0, 10), tags: j.jobIndustry || [],
      snippet: strip(j.jobExcerpt || j.jobDescription).slice(0, 320), salaryText: s.text, lpa: s.lpa,
      type: (Array.isArray(j.jobType) ? j.jobType[0] : j.jobType) || '', remote: true,
    });
  }

  // 4. Himalayas (cursor paginated)
  let cursor = null;
  for (let page = 0; page < 4; page++) {
    const u = 'https://himalayas.app/jobs/api?limit=100' + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '');
    const hm = await get(u, 'himalayas_' + page);
    if (!hm) break;
    for (const j of (hm.jobs || [])) {
      const s = salary('', j.minSalary, j.maxSalary, j.salaryCurrency || 'USD');
      out.push({
        source: 'Himalayas', title: j.title, company: j.companyName, url: j.applicationLink || j.url,
        region: (j.locationRestrictions || []).join(', ') || 'Worldwide',
        posted: j.pubDate ? new Date(j.pubDate * 1000).toISOString().slice(0, 10) : '',
        tags: j.categories || [], snippet: strip(j.excerpt || j.description).slice(0, 320),
        salaryText: s.text, lpa: s.lpa, type: (j.employmentType || ''), remote: true,
      });
    }
    cursor = hm.nextCursor;
    if (!cursor) break;
  }

  // 5. Arbeitnow
  const ab = await get('https://www.arbeitnow.com/api/job-board-api', 'arbeitnow');
  for (const j of (ab?.data || [])) {
    out.push({
      source: 'Arbeitnow', title: j.title, company: j.company_name, url: j.url,
      region: j.location || (j.remote ? 'Remote' : ''), posted: j.created_at ? new Date(j.created_at * 1000).toISOString().slice(0, 10) : '',
      tags: [...(j.tags || []), ...(j.job_types || [])], snippet: strip(j.description).slice(0, 320),
      salaryText: '', lpa: null, type: (j.job_types || []).join(', '), remote: !!j.remote,
    });
  }

  console.log('raw collected:', out.length);

  // normalise + score + dedupe
  const seen = new Set();
  const jobs = [];
  for (const j of out) {
    if (!j.title || !j.url || !j.company) continue;
    j.title = strip(j.title); j.company = strip(j.company);
    j.tags = (j.tags || []).map(t => String(t)).filter(Boolean).slice(0, 8);
    j.score = score(j);
    if (j.score < 40) continue;
    j.india = indiaFlag(j.region);
    if (j.india === 'no') j.score -= 18;
    if (j.india === 'yes') j.score += 14;
    if (j.lpa && j.lpa >= 8) j.score += 10;
    const key = (j.title + '|' + j.company).toLowerCase().replace(/[^a-z0-9|]/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    jobs.push(j);
  }
  jobs.sort((a, b) => (b.score - a.score) || (b.posted || '').localeCompare(a.posted || ''));
  console.log('relevant after filter:', jobs.length);
  console.log('india yes/maybe:', jobs.filter(j => j.india !== 'no').length, '| salary >= 8 LPA known:', jobs.filter(j => j.lpa && j.lpa >= 8).length);
  fs.writeFileSync('jobs.json', JSON.stringify({ generated: new Date().toISOString(), usdInr: USD_INR, jobs }, null, 1));
  console.log('top 15:');
  jobs.slice(0, 15).forEach(j => console.log(` ${j.score} | ${j.title} @ ${j.company} | ${j.region} | ${j.salaryText || 'n/a'} | ${j.source}`));
})();
