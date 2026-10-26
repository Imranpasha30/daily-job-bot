// Build a standalone job-tracker HTML page from final.json
// IDs are hashed from the job URL so "applied" ticks survive a rebuild.
const fs = require('fs');
const d = JSON.parse(fs.readFileSync('final.json', 'utf8'));

const PY = /\b(python|fastapi|django|flask|celery|sqlalchemy|pandas|airflow)\b/i;
const ND = /\b(node\.?js|nodejs|express|typescript|javascript|nest\.?js|react)\b/i;

function hid(url) { // stable short id from the posting URL
  let h = 2166136261;
  for (let i = 0; i < url.length; i++) { h ^= url.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 'k' + (h >>> 0).toString(36);
}

const TODAY = new Date(d.generated);
function ageDays(p) {
  if (!p) return null;
  const t = new Date(p);
  if (isNaN(t)) return null;
  const a = Math.round((TODAY - t) / 86400000);
  // dates older than ~2 years are almost always a bad feed value, not a real posting date
  if (a < 0 || a > 730) return null;
  return a;
}
function ageLabel(a) {
  if (a === null) return 'date unknown';
  if (a <= 0) return 'today';
  if (a === 1) return '1 day ago';
  if (a < 30) return a + ' days ago';
  if (a < 60) return 'about a month ago';
  return Math.round(a / 30) + ' months ago';
}

const jobs = d.jobs.map((j, i) => {
  const hay = `${j.title} ${j.tags.join(' ')} ${j.full || j.snippet}`;
  const py = (hay.match(new RegExp(PY.source, 'gi')) || []).length;
  const nd = (hay.match(new RegExp(ND.source, 'gi')) || []).length;
  const stack = [];
  if (py) stack.push('python');
  if (nd) stack.push('node');
  const a = ageDays(j.posted);
  return {
    id: hid(j.url), idx: i,
    t: j.title, c: j.company, u: j.url, r: j.region || (j.globalRemote ? 'Remote' : '—'),
    p: j.posted || '', a, al: ageLabel(a), s: j.source, sal: j.salaryText || '', lpa: j.lpa,
    india: j.inIndia, remote: j.globalRemote, variant: nd > py ? 'Node.js' : 'Python', stack,
    tags: j.tags.filter(x => x && x.length < 28).slice(0, 5),
    snip: j.snippet.replace(/\s+/g, ' ').slice(0, 200),
  };
});
const fresh7 = jobs.filter(j => j.a !== null && j.a <= 7).length;
const fresh30 = jobs.filter(j => j.a !== null && j.a <= 30).length;
const staleN = jobs.filter(j => j.a === null || j.a > 90).length;
const LEGACY = jobs.map(j => j.id); // old key j<index> -> new id, same order as before

const companies = [...new Set(jobs.map(j => j.c))].sort((a, b) => a.localeCompare(b));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const BOARDS = [
  ['LinkedIn — backend, India, last 2 days', 'https://www.linkedin.com/jobs/search/?keywords=backend%20engineer&geoId=102713980&location=India&f_TPR=r172800&sortBy=DD'],
  ['LinkedIn — Python/FastAPI, last 2 days', 'https://www.linkedin.com/jobs/search/?keywords=%28%22backend%20engineer%22%20OR%20%22python%20developer%22%29%20AND%20%28FastAPI%20OR%20Django%29&geoId=102713980&location=India&f_TPR=r172800&sortBy=DD'],
  ['LinkedIn — Node.js/Express, last 2 days', 'https://www.linkedin.com/jobs/search/?keywords=%28%22backend%20engineer%22%20OR%20%22node%20js%20developer%22%29%20AND%20%28Express%20OR%20TypeScript%29&geoId=102713980&location=India&f_TPR=r172800&sortBy=DD'],
  ['Naukri — backend developer', 'https://www.naukri.com/backend-developer-jobs'],
  ['Naukri — Python, Hyderabad', 'https://www.naukri.com/python-developer-jobs-in-hyderabad'],
  ['Naukri — Node.js, Bangalore', 'https://www.naukri.com/node-js-developer-jobs-in-bangalore'],
  ['Instahyre (salary filter built in)', 'https://www.instahyre.com/search-jobs/'],
  ['Cutshort — backend development', 'https://cutshort.io/jobs/backend-development'],
  ['Hirist — tech only', 'https://www.hirist.tech/'],
  ['Wellfound — backend engineer', 'https://wellfound.com/role/r/backend-engineer'],
  ['Indeed India — backend engineer', 'https://in.indeed.com/jobs?q=backend+engineer&l=India&fromage=3'],
  ['Foundit — backend developer', 'https://www.foundit.in/search/backend-developer-jobs'],
];

// ---- paste-ready answers for application screening forms ----
const ANSWERS = [
  ['Current fixed CTC', `Rs 5,54,000 fixed per annum (excludes variable component).`],
  ['Expected fixed CTC — default ask', `Rs 14-18 LPA fixed, negotiable based on role scope and the overall package.`],
  ['Expected fixed CTC — top product companies', `Rs 20-26 LPA fixed, negotiable based on role scope and the overall package.`],
  ['Expected fixed CTC — services / consulting firms', `Rs 12-15 LPA fixed, negotiable based on role scope and the overall package.`],
  ['Notice period', `30 days, and I can look at an earlier release for the right role.`],
  ['Why are you looking for a change?', `I have taken my current backend work about as far as the scope allows. In under two years I have gone from building features to founding and owning a production backend end to end, and I am looking for a team where I can keep working on systems at that level of complexity alongside more senior engineers I can learn from.`],
  ['Python / SQL data pipeline and scale', `At Sharkify I built the backend for Voter Connect, a campaign platform running on a 9.9 million row PostgreSQL dataset. The pipeline ingested and normalised voter rolls, and reads had to stay under a second for field volunteers on mobile. I got there with composite indexes designed off EXPLAIN ANALYZE query plans, rewritten aggregate queries, and Redis caching on the hot lookup paths.

On Kaizer X I own a multi-stage Python pipeline that moves video through transcription, LLM-driven edit decisions and FFmpeg rendering. Stages are coordinated by a durable PostgreSQL job queue using FOR UPDATE SKIP LOCKED with lease fencing and exponential backoff, plus a Redis Streams consumer-group queue with XCLAIM crash recovery and a dead-letter stream for fan-out across workers.

I work in Python and SQL directly rather than PySpark. My scale is tens of millions of rows and multi-gigabyte media objects, not petabyte Spark workloads.`],
  ['AWS experience (S3, EC2, Lambda, EKS, MSK)', `S3: hands-on and heavy. At Bose American Academy I migrated object storage from AWS SDK v2 to v3, with dynamic per-user and per-course key paths, delete-on-replace for profile images and guaranteed temp-file cleanup when an upload failed. On Kaizer X and Ozone Wash I built the storage layer against the same S3 API using boto3 and the AWS SDK, with presigned URLs, environment-prefixed key namespaces and a local fallback. That layer also resolved a production disk-fill outage by deleting local copies once the object store confirmed the upload.

EC2: KaizerFit and the Bose API both deploy to EC2 as Docker containers through GitHub Actions, writing env from secrets, rebuilding the image and replacing the running container behind NGINX.

Lambda: I prototyped Lambda handlers for username and email availability checks and OTP dispatch on KaizerFit, then folded them back into the FastAPI service to reduce operational surface.

EKS and MSK: I have not run either in production. My container work is Docker and Compose rather than managed Kubernetes. For streaming I used Redis Streams with consumer groups, pending-entry recovery and a dead-letter stream, which is the same consumer-group model as Kafka and MSK, but not the managed AWS service.`],
  ['Biggest production incident you solved', `A Redis upload stream on Kaizer X grew from 8 entries to over 619,000 at roughly 80 enqueues per second. I traced it to a time-of-check-to-time-of-use race between two worker paths reading job status and a re-enqueue loop with no backoff. I replaced the status check with an atomic conditional UPDATE claim and removed the loop; the stream then held steady at one message. I wrote a regression test that reproduces the race before shipping the fix.`],
  ['Security experience relevant to backend', `I hold an Executive Post Graduate Certification in Cyber Security and Ethical Hacking from IIT Roorkee's iHUB DivyaSampark. I apply it to API design rather than keeping it separate: I closed a two-round adversarial security review on Kaizer X with a regression test behind every fix, covering cross-tenant authorization (BOLA and IDOR) on live-broadcast controls and WebSockets, an OAuth callback XSS, and password-reset links that trusted an attacker-controlled Origin header. I also wrote an SSRF guard that resolves DNS before refusing loopback, private, link-local and cloud-metadata addresses, and replaced client-declared MIME types with byte-level magic-number verification.`],
];

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Backend Job Tracker — Imran Pasha</title>
<style>
:root{--bg:#f6f7f9;--card:#fff;--ink:#16181d;--mut:#5f6673;--line:#e3e6ea;--navy:#1f3a5f;--accent:#1769aa;--ok:#0f7b4f;--warn:#9a6700}
*{box-sizing:border-box}
body{margin:0;font:15px/1.5 -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--ink)}
.wrap{max-width:1120px;margin:0 auto;padding:22px 18px 60px}
header h1{font-size:23px;margin:0 0 4px;color:var(--navy)}
.sub{color:var(--mut);font-size:13.5px;margin-bottom:14px}
.note{background:#fff8e6;border:1px solid #f0dfae;border-left:4px solid #d9a441;padding:10px 13px;border-radius:7px;font-size:13.5px;color:#5c4813;margin-bottom:12px}
.note b{color:#3f3109}
details.panel{background:var(--card);border:1px solid var(--line);border-radius:9px;padding:0 14px;margin-bottom:12px}
details.panel summary{cursor:pointer;padding:12px 0;font-weight:600;font-size:14.5px;color:var(--navy)}
details.panel[open] summary{border-bottom:1px solid var(--line);margin-bottom:10px}
.blist{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:7px;padding:4px 0 14px}
.blist a{display:block;padding:8px 11px;background:#f2f6fa;border:1px solid #dce6f0;border-radius:6px;color:var(--accent);text-decoration:none;font-size:13.5px}
.blist a:hover{background:#e6eff8}
.ans{margin-bottom:12px}
.ans .q{display:flex;justify-content:space-between;align-items:center;gap:10px;font-weight:600;font-size:13.5px;color:var(--navy);margin-bottom:4px}
.ans .a{white-space:pre-wrap;background:#f7f9fb;border:1px solid var(--line);border-radius:7px;padding:9px 11px;font-size:13px;color:#2b2f36;line-height:1.55}
.copy{border:1px solid var(--line);background:#fff;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;color:var(--accent);white-space:nowrap}
.copy:hover{background:#eef4fa}
.copy.done{background:#e8f5ee;color:var(--ok);border-color:#bfe3d0}
.tiers{font-size:13px;color:var(--mut);padding:0 0 12px;line-height:1.7}
.tiers b{color:var(--ink)}
.controls{position:sticky;top:0;z-index:5;background:var(--bg);padding:10px 0 12px;border-bottom:1px solid var(--line);margin-bottom:14px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.controls input[type=search],.controls select{padding:8px 11px;border:1px solid var(--line);border-radius:7px;font-size:14px;background:#fff;color:var(--ink)}
.controls input[type=search]{flex:1;min-width:210px}
.chip{padding:7px 12px;border:1px solid var(--line);border-radius:999px;background:#fff;cursor:pointer;font-size:13.5px;user-select:none}
.chip.on{background:var(--navy);color:#fff;border-color:var(--navy)}
.count{margin-left:auto;font-size:13.5px;color:var(--mut)}
.count b{color:var(--navy)}
.job{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:13px 15px;margin-bottom:9px;display:flex;gap:13px;align-items:flex-start}
.job.done{opacity:.5}
.job .main{flex:1;min-width:0}
.job h2{font-size:15.5px;margin:0 0 3px;font-weight:650}
.job h2 a{color:var(--ink);text-decoration:none}
.job h2 a:hover{color:var(--accent);text-decoration:underline}
.meta{font-size:13px;color:var(--mut);margin-bottom:6px}
.meta .co{color:var(--navy);font-weight:600}
.badges{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px}
.b{font-size:11.5px;padding:2px 8px;border-radius:999px;border:1px solid var(--line);background:#f4f6f8;color:var(--mut)}
.b.in{background:#e8f5ee;color:var(--ok);border-color:#bfe3d0}
.b.rm{background:#eef3fb;color:var(--accent);border-color:#cfdef2}
.b.py{background:#eef5e8;color:#3d6b18;border-color:#d3e6c3}
.b.nd{background:#fdf0e6;color:#9a4f00;border-color:#f3dcc5}
.b.sal{background:#fff6da;color:var(--warn);border-color:#f0e0ae}
.b.new{background:#e8f5ee;color:var(--ok);border-color:#bfe3d0;font-weight:600}
.b.old{background:#fdecec;color:#a33;border-color:#f2cccc}
.snip{font-size:13px;color:var(--mut);margin:0}
.side{display:flex;flex-direction:column;gap:7px;align-items:stretch;min-width:116px}
.apply{display:block;text-align:center;background:var(--navy);color:#fff;text-decoration:none;padding:8px 12px;border-radius:7px;font-size:13.5px;font-weight:600}
.apply:hover{background:#2a4d7a}
.done-lbl{font-size:12.5px;color:var(--mut);display:flex;align-items:center;gap:6px;justify-content:center;cursor:pointer}
footer{margin-top:26px;font-size:12.5px;color:var(--mut);text-align:center;line-height:1.7}
@media(max-width:620px){.job{flex-direction:column}.side{flex-direction:row;min-width:0}.apply{flex:1}}
</style></head><body><div class="wrap">
<header>
<h1>Backend Job Tracker</h1>
<div class="sub">${jobs.length} openings from company career boards and remote job APIs, all still listed as of ${TODAY.toLocaleString('en-IN', { dateStyle: 'medium' })}. ${jobs.filter(j => j.india).length} are India-based. Applied ticks are kept in this browser and survive a rebuild.</div>
</header>

<div class="note"><b>How fresh is this list?</b> ${fresh7} were posted in the last 7 days and ${fresh30} within 30 days. ${staleN} are older than 90 days or carry no reliable date, and those are flagged in red — the company still lists them, but an old requisition is often an evergreen pipeline rather than active hiring, so check before you spend time on it. Use the <b>≤ 7 days</b> filter to see only genuinely fresh postings. Dates come from each board's own field, which is the posting date on Lever and Ashby but the last-updated date on Greenhouse, so treat them as approximate.</div>

<details class="panel" open><summary>Application answers — click Copy, paste into the form</summary>
<div class="tiers"><b>What to ask for.</b> Your current fixed CTC is Rs 5,54,000. Do not let that anchor the conversation: quote it honestly, then ask on the market band for the role, not on a multiple of what you earn now. Default ask <b>Rs 14–18 LPA</b>. Top product companies (Databricks, Stripe, MongoDB, Razorpay tier) <b>Rs 20–26 LPA</b>. Services and consulting firms <b>Rs 12–15 LPA</b>. Walk-away floor <b>Rs 12 LPA</b> — below that the jump is not worth the move.</div>
${ANSWERS.map((a, i) => `<div class="ans"><div class="q"><span>${esc(a[0])}</span><button class="copy" data-i="${i}">Copy</button></div><div class="a" id="ans${i}">${esc(a[1])}</div></div>`).join('')}
</details>

<div class="note"><b>About the Rs 8 LPA minimum.</b> None of these boards publish salary, so I could not filter on it. Nothing here is listed below Rs 8 LPA, and the companies in this list pay backend engineers well above it in India, but treat the band as unconfirmed until a recruiter tells you. Instahyre, Naukri and Hirist below do carry a real CTC filter you can set yourself.</div>

<details class="panel"><summary>Live search links for boards I cannot scrape (LinkedIn, Naukri, Instahyre and more)</summary>
<div class="blist">${BOARDS.map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('')}</div>
</details>

<div class="controls">
  <input type="search" id="q" placeholder="Search title, company, tech...">
  <span class="chip" data-f="india">India only</span>
  <span class="chip" data-f="remote">Remote</span>
  <span class="chip" data-f="d7">≤ 7 days</span>
  <span class="chip" data-f="d30">≤ 30 days</span>
  <span class="chip" data-f="python">Python</span>
  <span class="chip" data-f="node">Node.js</span>
  <span class="chip" data-f="hide">Hide applied</span>
  <select id="co"><option value="">All companies</option>${companies.map(c => `<option>${esc(c)}</option>`).join('')}</select>
  <select id="sort"><option value="fit">Sort: best fit</option><option value="new">Sort: newest first</option></select>
  <span class="count" id="count"></span>
</div>

<div id="list"></div>
<footer>
Sources: company Greenhouse, Lever, Ashby and SmartRecruiters boards, plus Remotive, RemoteOK, Jobicy, Himalayas and Arbeitnow.<br>
Applied ticks live in this browser only, keyed to each posting's URL, so rebuilding the page keeps them.
</footer>
</div>
<script>
const JOBS = ${JSON.stringify(jobs)};
const LEGACY = ${JSON.stringify(LEGACY)};
const ANSWERS = ${JSON.stringify(ANSWERS.map(a => a[1]))};
const K = 'imran_jobs_applied_v1';
let done = {};
try { done = JSON.parse(localStorage.getItem(K) || '{}'); } catch (e) { done = {}; }

// migrate old index-based keys (j0, j1, ...) to URL-hashed ids, once
(function migrate() {
  let changed = false;
  Object.keys(done).forEach(k => {
    const m = /^j(\\d+)$/.exec(k);
    if (!m) return;
    const nid = LEGACY[Number(m[1])];
    if (nid && done[k]) done[nid] = true;
    delete done[k]; changed = true;
  });
  if (changed) { try { localStorage.setItem(K, JSON.stringify(done)); } catch (e) {} }
})();

const F = { india: false, remote: false, python: false, node: false, hide: false, d7: false, d30: false };
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function card(j) {
  const isDone = !!done[j.id];
  const badges = [];
  if (j.india) badges.push('<span class="b in">India</span>');
  else if (j.remote) badges.push('<span class="b rm">Remote</span>');
  if (j.stack.includes('python')) badges.push('<span class="b py">Python</span>');
  if (j.stack.includes('node')) badges.push('<span class="b nd">Node.js</span>');
  if (j.a !== null && j.a <= 7) badges.push('<span class="b new">' + esc(j.al) + '</span>');
  else if (j.a === null || j.a > 90) badges.push('<span class="b old">' + esc(j.al) + ' &middot; check it is still open</span>');
  else badges.push('<span class="b">' + esc(j.al) + '</span>');
  if (j.sal) badges.push('<span class="b sal">' + esc(j.sal) + (j.lpa ? ' &middot; ~' + j.lpa + ' LPA' : '') + '</span>');
  badges.push('<span class="b">Send: ' + j.variant + ' resume</span>');
  j.tags.forEach(t => badges.push('<span class="b">' + esc(t) + '</span>'));
  return '<div class="job' + (isDone ? ' done' : '') + '">' +
    '<div class="main">' +
      '<h2><a href="' + esc(j.u) + '" target="_blank" rel="noopener">' + esc(j.t) + '</a></h2>' +
      '<div class="meta"><span class="co">' + esc(j.c) + '</span> &middot; ' + esc(j.r) + (j.p ? ' &middot; posted ' + esc(j.p) : '') + ' &middot; ' + esc(j.s) + '</div>' +
      '<div class="badges">' + badges.join('') + '</div>' +
      (j.snip ? '<p class="snip">' + esc(j.snip) + '…</p>' : '') +
    '</div>' +
    '<div class="side">' +
      '<a class="apply" href="' + esc(j.u) + '" target="_blank" rel="noopener">Open &amp; apply</a>' +
      '<label class="done-lbl"><input type="checkbox" data-id="' + j.id + '"' + (isDone ? ' checked' : '') + '> applied</label>' +
    '</div></div>';
}

function render() {
  const q = document.getElementById('q').value.trim().toLowerCase();
  const co = document.getElementById('co').value;
  const rows = JOBS.filter(j => {
    if (F.hide && done[j.id]) return false;
    if (F.india && !j.india) return false;
    if (F.remote && !j.remote) return false;
    if (F.d7 && !(j.a !== null && j.a <= 7)) return false;
    if (F.d30 && !(j.a !== null && j.a <= 30)) return false;
    if (F.python && !j.stack.includes('python')) return false;
    if (F.node && !j.stack.includes('node')) return false;
    if (co && j.c !== co) return false;
    if (q && !(j.t + ' ' + j.c + ' ' + j.r + ' ' + j.tags.join(' ') + ' ' + j.snip).toLowerCase().includes(q)) return false;
    return true;
  });
  if (document.getElementById('sort').value === 'new') {
    rows.sort((x, y) => (x.a === null ? 9999 : x.a) - (y.a === null ? 9999 : y.a));
  }
  document.getElementById('list').innerHTML = rows.map(card).join('') || '<p style="color:#5f6673">Nothing matches those filters.</p>';
  const n = Object.keys(done).filter(k => done[k]).length;
  document.getElementById('count').innerHTML = '<b>' + rows.length + '</b> shown &middot; <b>' + n + '</b> of ' + JOBS.length + ' applied';
}

document.getElementById('q').addEventListener('input', render);
document.getElementById('co').addEventListener('change', render);
document.getElementById('sort').addEventListener('change', render);
document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
  const f = c.dataset.f; F[f] = !F[f]; c.classList.toggle('on', F[f]);
  if (f === 'india' && F.india) { F.remote = false; document.querySelector('[data-f=remote]').classList.remove('on'); }
  if (f === 'remote' && F.remote) { F.india = false; document.querySelector('[data-f=india]').classList.remove('on'); }
  render();
}));
document.getElementById('list').addEventListener('change', e => {
  const cb = e.target.closest('input[type=checkbox]'); if (!cb) return;
  done[cb.dataset.id] = cb.checked;
  try { localStorage.setItem(K, JSON.stringify(done)); } catch (err) {}
  render();
});
document.querySelectorAll('.copy').forEach(b => b.addEventListener('click', async () => {
  const txt = ANSWERS[Number(b.dataset.i)];
  try { await navigator.clipboard.writeText(txt); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta);
    ta.select(); try { document.execCommand('copy'); } catch (e2) {} ta.remove();
  }
  b.textContent = 'Copied'; b.classList.add('done');
  setTimeout(() => { b.textContent = 'Copy'; b.classList.remove('done'); }, 1600);
}));
render();
</script></body></html>`;

fs.writeFileSync('jobs.html', html);

const lines = ['Backend jobs — generated ' + d.generated, ''];
jobs.forEach((j, i) => lines.push(`${String(i + 1).padStart(3)}. ${j.t} — ${j.c} (${j.r})${j.sal ? ' [' + j.sal + ']' : ''}\n     ${j.u}`));
lines.push('', 'Board searches:');
BOARDS.forEach(([t, u]) => lines.push(`  ${t}\n     ${u}`));
lines.push('', 'Application answers:');
ANSWERS.forEach(([q, a]) => lines.push(`\n--- ${q} ---\n${a}`));
fs.writeFileSync('job-links.txt', lines.join('\n'));

console.log('jobs.html', (fs.statSync('jobs.html').size / 1024).toFixed(0) + 'KB |', jobs.length, 'jobs |', companies.length, 'companies |', ANSWERS.length, 'answers');
console.log('id scheme: url-hash (ticks survive rebuilds); legacy j<index> keys auto-migrate');
