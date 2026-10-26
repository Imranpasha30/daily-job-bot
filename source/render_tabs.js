// Render the company-first Bangalore job page from tabs.json
const fs = require('fs');
const D = JSON.parse(fs.readFileSync('tabs.json', 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const BOARDS = [
  ['LinkedIn - backend, Bangalore, 2 days, entry+associate', 'https://www.linkedin.com/jobs/search/?keywords=backend%20engineer&location=Bengaluru%2C%20Karnataka%2C%20India&f_TPR=r172800&f_E=2%2C3&sortBy=DD'],
  ['LinkedIn - Python/FastAPI, Bangalore, entry+associate', 'https://www.linkedin.com/jobs/search/?keywords=%28%22backend%20engineer%22%20OR%20%22python%20developer%22%29%20AND%20%28FastAPI%20OR%20Django%29&location=Bengaluru%2C%20Karnataka%2C%20India&f_TPR=r172800&f_E=2%2C3&sortBy=DD'],
  ['LinkedIn - Node.js/Express, Bangalore, entry+associate', 'https://www.linkedin.com/jobs/search/?keywords=%28%22backend%20engineer%22%20OR%20%22node%20js%20developer%22%29%20AND%20%28Express%20OR%20TypeScript%29&location=Bengaluru%2C%20Karnataka%2C%20India&f_TPR=r172800&f_E=2%2C3&sortBy=DD'],
  ['LinkedIn - SDE 1 / SDE 2 titles, Bangalore', 'https://www.linkedin.com/jobs/search/?keywords=%28%22SDE%201%22%20OR%20%22SDE%202%22%20OR%20%22SDE-1%22%20OR%20%22SDE-2%22%20OR%20%22Software%20Engineer%20II%22%29&location=Bengaluru%2C%20Karnataka%2C%20India&f_TPR=r604800&f_E=2%2C3&sortBy=DD'],
  ['LinkedIn - India-wide, entry+associate, 2 days', 'https://www.linkedin.com/jobs/search/?keywords=backend%20engineer&geoId=102713980&location=India&f_TPR=r172800&f_E=2%2C3&sortBy=DD'],
  ['LinkedIn - wider: includes mid-senior, Bangalore', 'https://www.linkedin.com/jobs/search/?keywords=backend%20engineer&location=Bengaluru%2C%20Karnataka%2C%20India&f_TPR=r172800&f_E=2%2C3%2C4&sortBy=DD'],
  ['Naukri - backend developer, Bangalore, 0-3 yrs', 'https://www.naukri.com/backend-developer-jobs-in-bangalore?experience=2'],
  ['Naukri - Python developer, Bangalore, 0-3 yrs', 'https://www.naukri.com/python-developer-jobs-in-bangalore?experience=2'],
  ['Naukri - Node.js developer, Bangalore, 0-3 yrs', 'https://www.naukri.com/node-js-developer-jobs-in-bangalore?experience=2'],
  ['Instahyre - has a real CTC filter', 'https://www.instahyre.com/search-jobs/'],
  ['Cutshort - backend development', 'https://cutshort.io/jobs/backend-development'],
  ['Hirist - tech only', 'https://www.hirist.tech/'],
  ['Wellfound - backend engineer', 'https://wellfound.com/role/r/backend-engineer'],
  ['Indeed India - backend, Bangalore, last 3 days', 'https://in.indeed.com/jobs?q=backend+engineer&l=Bengaluru%2C+Karnataka&fromage=3&explvl=entry_level'],
];

const ANSWERS = [
  ['Current fixed CTC', 'Rs 5,54,000 fixed per annum (excludes variable component).'],
  ['Expected fixed CTC — default ask', 'Rs 14-18 LPA fixed, negotiable based on role scope and the overall package.'],
  ['Expected fixed CTC — top product companies', 'Rs 20-26 LPA fixed, negotiable based on role scope and the overall package.'],
  ['Notice period', '30 days, and I can look at an earlier release for the right role.'],
  ['Why are you looking for a change?', 'I have taken my current backend work about as far as the scope allows. In under two years I have gone from building features to founding and owning a production backend end to end, and I am looking for a team where I can keep working on systems at that level of complexity alongside more senior engineers I can learn from.'],
  ['Tell me about yourself / summary', 'I am a backend engineer with nearly two years building production APIs and distributed systems in Python with FastAPI and in Node.js with Express. I am the founding backend engineer on Kaizer X, an AI video production SaaS, where I rewrote a Django prototype as FastAPI and owned it solo for five months; it now serves 765 REST and WebSocket routes over 150 PostgreSQL tables. I also built a field-service payments platform end to end as the sole backend engineer: three payment gateways behind one facade with HMAC-verified webhooks and idempotent settlement. I hold a postgraduate certification in cyber security from IIT Roorkee and apply it directly to API design.'],
  ['Databases experience', 'Databases are my strongest area. I design and tune PostgreSQL rather than just query it: 68 tables across 37 transactional migrations on a payments platform I owned solo, 150 tables on the AI video SaaS I founded the backend for, and a 9.9 million row dataset I held under a second per read using composite indexes designed off EXPLAIN ANALYZE, rewritten aggregates and Redis caching. Day to day that means FOR UPDATE SKIP LOCKED job queues with lease fencing, advisory locks for reserve-and-confirm flows, ON CONFLICT upserts, row locks on wallet and payout tables, and pool tuning for pgBouncer. On Redis I use Streams with consumer groups, XCLAIM recovery and dead-letter streams, plus Lua token-bucket rate limiting.'],
  ['Python / SQL data pipeline and scale', 'At Sharkify I built the backend for Voter Connect, a campaign platform running on a 9.9 million row PostgreSQL dataset. The pipeline ingested and normalised voter rolls, and reads had to stay under a second for field volunteers on mobile. I got there with composite indexes designed off EXPLAIN ANALYZE query plans, rewritten aggregate queries, and Redis caching on the hot lookup paths.\n\nOn Kaizer X I own a multi-stage Python pipeline that moves video through transcription, LLM-driven edit decisions and FFmpeg rendering. Stages are coordinated by a durable PostgreSQL job queue using FOR UPDATE SKIP LOCKED with lease fencing and exponential backoff, plus a Redis Streams consumer-group queue with XCLAIM crash recovery and a dead-letter stream.'],
  ['AWS experience', 'S3: hands-on and heavy. At Bose American Academy I migrated object storage from AWS SDK v2 to v3, with dynamic per-user and per-course key paths, delete-on-replace for profile images and guaranteed temp-file cleanup when an upload failed. On Kaizer X and Ozone Wash I built the storage layer against the same S3 API using boto3 and the AWS SDK, with presigned URLs, environment-prefixed key namespaces and a local fallback.\n\nEC2: KaizerFit and the Bose API both deploy to EC2 as Docker containers through GitHub Actions, writing env from secrets, rebuilding the image and replacing the running container behind NGINX.\n\nLambda: I prototyped Lambda handlers for availability checks and OTP dispatch, then folded them back into the FastAPI service to reduce operational surface.'],
  ['Infrastructure as code — the honest answer', 'I have not used Terraform, Pulumi or Ansible. What I have done is define infrastructure declaratively in multi-stage Dockerfiles running as non-root, Docker Compose, render.yaml, railway.toml and nixpacks for build-time system dependencies, Procfiles and systemd units for multi-process deployments, and GitHub Actions pipelines that build an image and replace the running container on EC2. The concepts transfer; the specific tool would be a ramp-up.'],
  ['Go — the honest answer', 'I have not shipped Go in production. My closest exposure was debugging a Go RTMP relay that panicked in production and took every channel on a live broadcast off air. I traced it to an index-out-of-range on a video-only FLV header after an ffmpeg restart, found that every test fixture emitted two streams from frame zero so the single-stream path was never covered, and wrote the regression test. I can read Go and I want to write it.'],
  ['Biggest production incident you solved', 'A Redis upload stream on Kaizer X grew from 8 entries to over 619,000 at roughly 80 enqueues per second. I traced it to a time-of-check-to-time-of-use race between two worker paths reading job status and a re-enqueue loop with no backoff. I replaced the status check with an atomic conditional UPDATE claim and removed the loop; the stream then held steady at one message. I wrote a regression test that reproduces the race before shipping the fix.'],
  ['Security experience relevant to backend', "I hold an Executive Post Graduate Certification in Cyber Security and Ethical Hacking from IIT Roorkee's iHUB DivyaSampark, and I apply it to API design rather than keeping it separate. I closed a two-round adversarial security review on Kaizer X with a regression test behind every fix, covering cross-tenant authorization (BOLA and IDOR) on live-broadcast controls and WebSockets, an OAuth callback XSS, and password-reset links that trusted an attacker-controlled Origin header. I also wrote an SSRF guard that resolves DNS before refusing loopback, private, link-local and cloud-metadata addresses."],
  ['Open source contributions', 'Nothing upstream in other projects yet, so I will not pretend otherwise. What I do have is public work of my own: an LLM Red-Team Platform with a deliberately vulnerable RAG target, a four-control guardrail layer in dependency-free Python, and an OWASP LLM Top 10 attack harness around both, including 35 hand-written detection signatures and Unicode normalisation so zero-width evasion still matches.\n\ngithub.com/Imranpasha30/llm-redteam-platform'],
];

const coA = new Set(D.tabA.map(j => j.c));
const coB = new Set(D.tabB.map(j => j.c));
const union = new Set([...coA, ...coB]);
const freshA = D.tabA.filter(j => j.a !== null && j.a <= 7).length;

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bangalore Backend Jobs — by company</title>
<style>
:root{--bg:#f6f7f9;--card:#fff;--ink:#16181d;--mut:#5f6673;--line:#e3e6ea;--navy:#1f3a5f;--accent:#1769aa;--ok:#0f7b4f;--warn:#9a6700}
*{box-sizing:border-box}
body{margin:0;font:15px/1.5 -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--ink)}
.wrap{max-width:1140px;margin:0 auto;padding:20px 18px 60px}
h1{font-size:23px;margin:0 0 4px;color:var(--navy)}
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
.copy:hover{background:#eef4fa}.copy.done{background:#e8f5ee;color:var(--ok);border-color:#bfe3d0}
.tabs{display:flex;gap:6px;border-bottom:2px solid var(--line);margin-bottom:12px;flex-wrap:wrap}
.tab{padding:10px 18px;cursor:pointer;font-weight:600;font-size:14.5px;color:var(--mut);border-bottom:3px solid transparent;margin-bottom:-2px;user-select:none}
.tab.on{color:var(--navy);border-bottom-color:var(--navy)}
.tab small{display:block;font-weight:400;font-size:11.5px;color:var(--mut)}
.controls{position:sticky;top:0;z-index:5;background:var(--bg);padding:10px 0 12px;border-bottom:1px solid var(--line);margin-bottom:14px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.controls input[type=search],.controls select{padding:8px 11px;border:1px solid var(--line);border-radius:7px;font-size:14px;background:#fff;color:var(--ink)}
.controls input[type=search]{flex:1;min-width:200px}
.chip{padding:7px 12px;border:1px solid var(--line);border-radius:999px;background:#fff;cursor:pointer;font-size:13.5px;user-select:none}
.chip.on{background:var(--navy);color:#fff;border-color:var(--navy)}
.count{margin-left:auto;font-size:13.5px;color:var(--mut)}.count b{color:var(--navy)}
.firm{background:var(--card);border:1px solid var(--line);border-radius:10px;margin-bottom:10px;overflow:hidden}
.firm.done{opacity:.45}
.fhead{display:flex;align-items:baseline;gap:10px;padding:11px 15px 0;flex-wrap:wrap}
.fname{font-size:16px;font-weight:700;color:var(--navy)}
.floc{font-size:12.5px;color:var(--mut)}
.fcount{font-size:12px;color:var(--mut);margin-left:auto}
.row{display:flex;gap:13px;align-items:flex-start;padding:6px 15px 13px}
.row .main{flex:1;min-width:0}
.row h2{font-size:15px;margin:0 0 3px;font-weight:600}
.row h2 a{color:var(--ink);text-decoration:none}
.row h2 a:hover{color:var(--accent);text-decoration:underline}
.badges{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:5px}
.b{font-size:11.5px;padding:2px 8px;border-radius:999px;border:1px solid var(--line);background:#f4f6f8;color:var(--mut)}
.b.new{background:#e8f5ee;color:var(--ok);border-color:#bfe3d0;font-weight:600}
.b.old{background:#fdecec;color:#a33;border-color:#f2cccc}
.b.sk{background:#eef3fb;color:var(--accent);border-color:#cfdef2}
.snip{font-size:12.5px;color:var(--mut);margin:0}
.side{display:flex;flex-direction:column;gap:6px;min-width:124px}
.score{text-align:center;font-size:11.5px;color:var(--mut)}
.score b{display:block;font-size:18px;color:var(--navy);line-height:1.1}
.bar{height:5px;background:var(--line);border-radius:3px;overflow:hidden;margin-top:3px}
.bar i{display:block;height:100%;background:var(--ok)}
.apply{display:block;text-align:center;background:var(--navy);color:#fff;text-decoration:none;padding:8px 12px;border-radius:7px;font-size:13.5px;font-weight:600}
.apply:hover{background:#2a4d7a}
.done-lbl{font-size:12.5px;color:var(--mut);display:flex;align-items:center;gap:6px;justify-content:center;cursor:pointer}
.more{border-top:1px dashed var(--line);background:#fafbfc}
.more summary{cursor:pointer;padding:8px 15px;font-size:12.5px;color:var(--accent)}
.more .row{padding:4px 15px 10px}
footer{margin-top:26px;font-size:12.5px;color:var(--mut);text-align:center;line-height:1.7}
@media(max-width:620px){.row{flex-direction:column}.side{flex-direction:row}.apply{flex:1}}
</style></head><body><div class="wrap">
<h1>Bangalore Backend Jobs — by company</h1>
<div class="sub">One card per company, showing its best-matching role for you. ${union.size} different companies in total: ${coA.size} hiring in Bangalore, ${coB.size} elsewhere in India or remote. ${freshA} Bangalore roles were posted this week.</div>

<div class="note"><b>One application per company.</b> Each card is a company, not a job, so working down the list means ${union.size} genuinely different applications rather than six forms at the same employer. Where a company has several roles that fit you, the best one is shown and the rest sit behind "more roles" — apply to one, not all of them. The match score is how much of your resume that job description actually asks for, and the blue chips show which of your skills matched.</div>

<div class="note" style="background:#eef3fb;border-color:#cfdef2;border-left-color:#1769aa;color:#174a73"><b>Not sure which resume to send?</b> Paste the job description into the <a href="resume-picker.html" style="color:#1769aa;font-weight:700">resume picker</a>. It names the variant, checks the years and salary against yours, and lists the technologies you must not claim on that application.</div>
<div class="note" style="background:#eef5ee;border-color:#bfe3d0;border-left-color:#0f7b4f;color:#14543a"><b>Apply Bot is ready.</b> It fills a job application form, lists every value it entered, flags questions you must not answer falsely, and submits only after you read the list and click. <a href="apply-bot.html" style="color:#0f7b4f;font-weight:700">Open the setup page</a> and drag the bookmarklet to your bookmarks bar once.</div>
<details class="panel"><summary>Application answers — click Copy, paste into the form</summary>
<div class="sub" style="padding-bottom:6px">Current fixed CTC Rs 5,54,000. Ask on the market band, not a multiple of it: default <b>Rs 14–18 LPA</b>, top product companies <b>Rs 20–26 LPA</b>, walk-away floor <b>Rs 12 LPA</b>.</div>
${ANSWERS.map((a, i) => `<div class="ans"><div class="q"><span>${esc(a[0])}</span><button class="copy" data-i="${i}">Copy</button></div><div class="a">${esc(a[1])}</div></div>`).join('')}
</details>

<details class="panel"><summary>Live search links for boards I cannot scrape (LinkedIn, Naukri, Instahyre)</summary>
<div class="blist">${BOARDS.map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('')}</div>
</details>

<div class="tabs">
  <div class="tab on" data-tab="A">Bangalore<small>${coA.size} companies · ${D.tabA.length} roles</small></div>
  <div class="tab" data-tab="B">Also worth applying<small>${coB.size} companies · other cities, remote, stretch</small></div>
</div>

<div class="controls">
  <input type="search" id="q" placeholder="Search company, title, skill...">
  <span class="chip" data-f="d7">≤ 7 days</span>
  <span class="chip" data-f="d30">≤ 30 days</span>
  <span class="chip" data-f="core">Names my stack</span>
  <span class="chip" data-f="nosenior">Hide senior</span>
  <span class="chip" data-f="hide">Hide applied</span>
  <select id="sort"><option value="fit">Sort: best fit</option><option value="match">Sort: highest match %</option><option value="new">Sort: newest first</option><option value="az">Sort: company A–Z</option></select>
  <span class="count" id="count"></span>
</div>

<div id="list"></div>
<footer>
Pulled from public Greenhouse, Lever, Ashby and SmartRecruiters boards across 229 company career sites, plus Remotive, RemoteOK, Jobicy, Himalayas and Arbeitnow.<br>
Applied ticks are keyed to each posting's URL and stored in this browser, so rebuilding the page keeps them.
</footer>
</div>
<script>
const DATA = { A: ${JSON.stringify(D.tabA)}, B: ${JSON.stringify(D.tabB)} };
const ANSWERS = ${JSON.stringify(ANSWERS.map(a => a[1]))};
const K = 'imran_jobs_applied_v1';
let done = {}; try { done = JSON.parse(localStorage.getItem(K) || '{}'); } catch (e) { done = {}; }
let TAB = 'A';
const F = { d7:false, d30:false, core:false, nosenior:false, hide:false };
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function jobRow(j, primary) {
  const badges = [];
  if (j.a !== null && j.a <= 7) badges.push('<span class="b new">' + esc(j.al) + '</span>');
  else if (j.a === null || j.a > 90) badges.push('<span class="b old">' + esc(j.al) + ' · verify it is open</span>');
  else badges.push('<span class="b">' + esc(j.al) + '</span>');
  if (j.core) badges.push('<span class="b new">names your stack</span>');
  badges.push('<span class="b">Send: ' + j.variant + ' resume</span>');
  if (primary) j.matched.slice(0,6).forEach(m => badges.push('<span class="b sk">' + esc(m) + '</span>'));
  return '<div class="row">' +
    '<div class="main">' +
      '<h2><a href="' + esc(j.u) + '" target="_blank" rel="noopener">' + esc(j.t) + '</a></h2>' +
      '<div class="badges">' + badges.join('') + '</div>' +
      (primary && j.snip ? '<p class="snip">' + esc(j.snip) + '…</p>' : '') +
    '</div>' +
    '<div class="side">' +
      '<div class="score"><b>' + j.match + '%</b>match<div class="bar"><i style="width:' + j.match + '%"></i></div></div>' +
      '<a class="apply" href="' + esc(j.u) + '" target="_blank" rel="noopener">Open &amp; apply</a>' +
      '<label class="done-lbl"><input type="checkbox" data-id="' + j.id + '"' + (done[j.id] ? ' checked' : '') + '> applied</label>' +
    '</div></div>';
}

function firmCard(g) {
  const best = g.jobs[0], rest = g.jobs.slice(1);
  const anyDone = g.jobs.some(j => done[j.id]);
  return '<div class="firm' + (anyDone ? ' done' : '') + '">' +
    '<div class="fhead"><span class="fname">' + esc(g.company) + '</span>' +
      '<span class="floc">' + esc(best.r) + '</span>' +
      '<span class="fcount">' + g.jobs.length + (g.jobs.length === 1 ? ' open role' : ' open roles') + '</span></div>' +
    jobRow(best, true) +
    (rest.length ? '<details class="more"><summary>' + rest.length + ' more role' + (rest.length > 1 ? 's' : '') + ' at ' + esc(g.company) + ' — apply to one, not all</summary>' + rest.map(j => jobRow(j, false)).join('') + '</details>' : '') +
  '</div>';
}

function render() {
  const q = document.getElementById('q').value.trim().toLowerCase();
  const sv = document.getElementById('sort').value;
  const jobs = DATA[TAB].filter(j => {
    if (F.hide && done[j.id]) return false;
    if (F.d7 && !(j.a !== null && j.a <= 7)) return false;
    if (F.d30 && !(j.a !== null && j.a <= 30)) return false;
    if (F.core && !j.core) return false;
    if (F.nosenior && j.senior) return false;
    if (q && !(j.t + ' ' + j.c + ' ' + j.r + ' ' + j.matched.join(' ') + ' ' + j.snip).toLowerCase().includes(q)) return false;
    return true;
  });
  const byCo = new Map();
  for (const j of jobs) {
    if (!byCo.has(j.c)) byCo.set(j.c, { company: j.c, jobs: [] });
    byCo.get(j.c).jobs.push(j);
  }
  const groups = [...byCo.values()];
  for (const g of groups) {
    if (sv === 'new') g.jobs.sort((x,y) => (x.a ?? 999) - (y.a ?? 999));
    else if (sv === 'match') g.jobs.sort((x,y) => y.match - x.match);
  }
  if (sv === 'az') groups.sort((a,b) => a.company.toLowerCase().localeCompare(b.company.toLowerCase()));
  else if (sv === 'new') groups.sort((a,b) => (a.jobs[0].a ?? 999) - (b.jobs[0].a ?? 999));
  else if (sv === 'match') groups.sort((a,b) => b.jobs[0].match - a.jobs[0].match);
  // 'fit' keeps the incoming rank order, which is how the data arrives

  document.getElementById('list').innerHTML = groups.map(firmCard).join('') || '<p style="color:#5f6673">Nothing matches those filters.</p>';
  const appliedCos = new Set();
  for (const t of ['A','B']) for (const j of DATA[t]) if (done[j.id]) appliedCos.add(j.c);
  document.getElementById('count').innerHTML = '<b>' + groups.length + '</b> companies · <b>' + jobs.length + '</b> roles · applied at <b>' + appliedCos.size + '</b>';
}

document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('on'));
  t.classList.add('on'); TAB = t.dataset.tab; render(); window.scrollTo({ top: 0, behavior: 'smooth' });
}));
document.getElementById('q').addEventListener('input', render);
document.getElementById('sort').addEventListener('change', render);
document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
  const f = c.dataset.f; F[f] = !F[f]; c.classList.toggle('on', F[f]); render();
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
  catch (e) { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e2) {} ta.remove(); }
  b.textContent = 'Copied'; b.classList.add('done');
  setTimeout(() => { b.textContent = 'Copy'; b.classList.remove('done'); }, 1600);
}));
render();
</script></body></html>`;

fs.writeFileSync('bangalore-jobs.html', html);

// company-first plain text
const txt = ['BANGALORE BACKEND JOBS — ONE ENTRY PER COMPANY', 'Generated ' + D.generated, ''];
for (const [name, list] of [['BANGALORE (' + coA.size + ' companies)', D.tabA], ['ALSO WORTH APPLYING (' + coB.size + ' companies)', D.tabB]]) {
  txt.push('', '='.repeat(72), name, '='.repeat(72));
  const by = new Map();
  for (const j of list) { if (!by.has(j.c)) by.set(j.c, []); by.get(j.c).push(j); }
  let i = 0;
  for (const [co, js] of by) {
    i++;
    const b = js[0];
    txt.push(`${String(i).padStart(3)}. ${co} — ${b.r}${js.length > 1 ? '  (' + js.length + ' open roles)' : ''}`);
    txt.push(`     [${b.match}% match] ${b.t} · ${b.al}`);
    txt.push(`     ${b.u}`);
  }
}
fs.writeFileSync('bangalore-jobs.txt', txt.join('\n'));
console.log('bangalore-jobs.html ' + (fs.statSync('bangalore-jobs.html').size / 1024).toFixed(0) + 'KB');
console.log('Bangalore: ' + coA.size + ' companies, ' + D.tabA.length + ' roles');
console.log('Other: ' + coB.size + ' companies, ' + D.tabB.length + ' roles');
console.log('UNIQUE COMPANIES TOTAL: ' + union.size);
