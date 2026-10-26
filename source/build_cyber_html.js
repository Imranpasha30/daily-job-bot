// Build a standalone cybersecurity job-tracker HTML page from cyber_final.json
// IDs are hashed from the job URL so "applied" ticks survive a rebuild.
const fs = require('fs');
const path = require('path');
const d = JSON.parse(fs.readFileSync(path.join('..', 'cyber_final.json'), 'utf8'));

const CYBER_TOOLS = /\b(splunk|siem|qradar|sentinel|crowdstrike|palo alto|fortinet|wireshark|nessus|qualys|burp suite|metasploit|nmap|kali|snort|suricata|ossec|wazuh|elastic|carbon black|cyberark|okta|owasp|mitre|iso 27001|nist|soc 2|gdpr|pci.dss|edr|xdr|soar|python|bash|powershell)\b/i;
const PEN_TEST = /\b(penetration|vapt|pen\s*test|red team|offensive|burp|metasploit|nmap|kali|cobalt strike|exploit)\b/i;
const SOC_DEF = /\b(soc|blue team|incident response|threat|siem|monitoring|forensic|malware|defensive|endpoint|edr|xdr|soar)\b/i;

function hid(url) {
  let h = 2166136261;
  for (let i = 0; i < url.length; i++) { h ^= url.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 'c' + (h >>> 0).toString(36);
}

const TODAY = new Date(d.generated);
function ageDays(p) {
  if (!p) return null;
  const t = new Date(p);
  if (isNaN(t)) return null;
  const a = Math.round((TODAY - t) / 86400000);
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
  const pentest = (hay.match(new RegExp(PEN_TEST.source, 'gi')) || []).length;
  const soc = (hay.match(new RegExp(SOC_DEF.source, 'gi')) || []).length;
  const focus = [];
  if (pentest) focus.push('offensive');
  if (soc) focus.push('defensive');
  const a = ageDays(j.posted);
  return {
    id: hid(j.url), idx: i,
    t: j.title, c: j.company, u: j.url, r: j.region || (j.globalRemote ? 'Remote' : '—'),
    p: j.posted || '', a, al: ageLabel(a), s: j.source, sal: j.salaryText || '', lpa: j.lpa,
    india: j.inIndia, dubai: j.inDubai, remote: j.globalRemote, focus,
    variant: pentest > soc ? 'Penetration Tester' : 'Cyber Security Analyst',
    tags: j.tags.filter(x => x && x.length < 28).slice(0, 5),
    snip: j.snippet.replace(/\s+/g, ' ').slice(0, 200),
  };
});
const fresh7 = jobs.filter(j => j.a !== null && j.a <= 7).length;
const fresh30 = jobs.filter(j => j.a !== null && j.a <= 30).length;
const staleN = jobs.filter(j => j.a === null || j.a > 90).length;

const companies = [...new Set(jobs.map(j => j.c))].sort((a, b) => a.localeCompare(b));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const BOARDS = [
  ['LinkedIn — Cybersecurity, India, last 2 days', 'https://www.linkedin.com/jobs/search/?keywords=cybersecurity%20analyst&geoId=102713980&location=India&f_TPR=r172800&sortBy=DD'],
  ['LinkedIn — SOC Analyst, India, last 2 days', 'https://www.linkedin.com/jobs/search/?keywords=SOC%20analyst&geoId=102713980&location=India&f_TPR=r172800&sortBy=DD'],
  ['LinkedIn — Penetration Tester, India', 'https://www.linkedin.com/jobs/search/?keywords=penetration%20tester&geoId=102713980&location=India&f_TPR=r172800&sortBy=DD'],
  ['LinkedIn — Security Analyst, Dubai/UAE', 'https://www.linkedin.com/jobs/search/?keywords=security%20analyst&geoId=104305776&location=United%20Arab%20Emirates&f_TPR=r172800&sortBy=DD'],
  ['LinkedIn — Cybersecurity, Remote', 'https://www.linkedin.com/jobs/search/?keywords=cybersecurity&f_WT=2&f_TPR=r172800&sortBy=DD'],
  ['Naukri — Cybersecurity, India', 'https://www.naukri.com/cybersecurity-jobs'],
  ['Naukri — SOC Analyst, Hyderabad', 'https://www.naukri.com/soc-analyst-jobs-in-hyderabad'],
  ['Naukri — Penetration Tester', 'https://www.naukri.com/penetration-tester-jobs'],
  ['Naukri — Information Security', 'https://www.naukri.com/information-security-analyst-jobs'],
  ['Instahyre — Cybersecurity', 'https://www.instahyre.com/search-jobs/?designation=Cyber+Security+Analyst'],
  ['Indeed India — Cybersecurity', 'https://in.indeed.com/jobs?q=cybersecurity+analyst&l=India&fromage=7'],
  ['Foundit — Security Analyst', 'https://www.foundit.in/search/security-analyst-jobs'],
  ['Bayt — Cybersecurity, Dubai', 'https://www.bayt.com/en/uae/jobs/cyber-security-jobs/'],
  ['GulfTalent — Information Security, UAE', 'https://www.gulftalent.com/uae/jobs/information-security'],
];

// ---- paste-ready answers for cybersecurity application forms ----
const ANSWERS = [
  ['Current fixed CTC', `Rs 5,54,000 fixed per annum (excludes variable component).`],
  ['Expected CTC — cybersecurity roles', `Rs 6-10 LPA, negotiable based on role scope and the overall package.`],
  ['Expected CTC — top security product companies', `Rs 10-16 LPA, negotiable based on role scope and the overall package.`],
  ['Expected salary — Dubai/UAE', `AED 8,000-15,000 per month, negotiable based on role scope and benefits package.`],
  ['Notice period', `30 days, and I can look at an earlier release for the right role.`],
  ['Why cybersecurity?', `I built and secured production backends for two years, closing adversarial security reviews that covered BOLA, IDOR, SSRF, XSS, and auth-bypass classes. The IIT Roorkee iHUB DivyaSampark certification in Cyber Security & Ethical Hacking formalised the offensive-security methodology I was already applying hands-on. I want to make security my primary function rather than a side responsibility of backend development.`],
  ['Security tools and methodology', `Hands-on: Burp Suite, Nmap, Wireshark, Metasploit, Kali Linux, OWASP ZAP. Applied OWASP Top 10 and MITRE ATT&CK frameworks in real vulnerability assessments. Built an SSRF guard that resolves DNS before refusing loopback, private, link-local and cloud-metadata addresses. Replaced client-declared MIME types with byte-level magic-number verification. Familiar with SIEM concepts (Splunk, ELK), EDR tools, and vulnerability scanners (Nessus, Qualys).`],
  ['Relevant security experience', `I closed a two-round adversarial security review on Kaizer X with a regression test behind every fix, covering cross-tenant authorization (BOLA and IDOR) on live-broadcast controls and WebSockets, an OAuth callback XSS, and password-reset links that trusted an attacker-controlled Origin header. I also wrote an SSRF guard that resolves DNS before refusing loopback, private, link-local and cloud-metadata addresses, and replaced client-declared MIME types with byte-level magic-number verification. I hold an Executive Post Graduate Certification in Cyber Security and Ethical Hacking from IIT Roorkee's iHUB DivyaSampark.`],
  ['Certifications', `Executive Post Graduate Certification in Cyber Security & Ethical Hacking — IIT Roorkee, iHUB DivyaSampark. Planning to pursue CompTIA Security+ and CEH next.`],
];

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cybersecurity Job Tracker — Imran Pasha</title>
<style>
:root{--bg:#0f1117;--card:#1a1d27;--ink:#e4e6eb;--mut:#8b8f9a;--line:#2d313c;--cyber:#00d4aa;--accent:#00b894;--ok:#00d4aa;--warn:#ffc107;--navy:#0d2847;--red:#e74c3c}
*{box-sizing:border-box}
body{margin:0;font:15px/1.5 -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--ink)}
.wrap{max-width:1120px;margin:0 auto;padding:22px 18px 60px}
header h1{font-size:23px;margin:0 0 4px;color:var(--cyber)}
header h1::before{content:'🛡️ ';font-size:20px}
.sub{color:var(--mut);font-size:13.5px;margin-bottom:14px}
.note{background:#1e2230;border:1px solid #2d3345;border-left:4px solid var(--cyber);padding:10px 13px;border-radius:7px;font-size:13.5px;color:#b0b8c9;margin-bottom:12px}
.note b{color:var(--cyber)}
details.panel{background:var(--card);border:1px solid var(--line);border-radius:9px;padding:0 14px;margin-bottom:12px}
details.panel summary{cursor:pointer;padding:12px 0;font-weight:600;font-size:14.5px;color:var(--cyber)}
details.panel[open] summary{border-bottom:1px solid var(--line);margin-bottom:10px}
.blist{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:7px;padding:4px 0 14px}
.blist a{display:block;padding:8px 11px;background:#1e2230;border:1px solid var(--line);border-radius:6px;color:var(--accent);text-decoration:none;font-size:13.5px}
.blist a:hover{background:#252a38}
.ans{margin-bottom:12px}
.ans .q{display:flex;justify-content:space-between;align-items:center;gap:10px;font-weight:600;font-size:13.5px;color:var(--cyber);margin-bottom:4px}
.ans .a{white-space:pre-wrap;background:#151822;border:1px solid var(--line);border-radius:7px;padding:9px 11px;font-size:13px;color:#c5c9d4;line-height:1.55}
.copy{border:1px solid var(--line);background:var(--card);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;color:var(--accent);white-space:nowrap}
.copy:hover{background:#252a38}
.copy.done{background:#0a2e22;color:var(--ok);border-color:#1a5c44}
.resume-rec{display:flex;gap:12px;flex-wrap:wrap;padding:8px 0 14px}
.resume-rec a{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#1e2230;border:1px solid var(--line);border-radius:7px;color:var(--accent);text-decoration:none;font-size:13.5px;font-weight:600}
.resume-rec a:hover{background:#252a38;border-color:var(--cyber)}
.resume-rec a::before{content:'📄'}
.controls{position:sticky;top:0;z-index:5;background:var(--bg);padding:10px 0 12px;border-bottom:1px solid var(--line);margin-bottom:14px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.controls input[type=search],.controls select{padding:8px 11px;border:1px solid var(--line);border-radius:7px;font-size:14px;background:var(--card);color:var(--ink)}
.controls input[type=search]{flex:1;min-width:210px}
.controls input[type=search]::placeholder{color:var(--mut)}
.chip{padding:7px 12px;border:1px solid var(--line);border-radius:999px;background:var(--card);cursor:pointer;font-size:13.5px;user-select:none;color:var(--ink)}
.chip.on{background:var(--cyber);color:#0f1117;border-color:var(--cyber);font-weight:600}
.count{margin-left:auto;font-size:13.5px;color:var(--mut)}
.count b{color:var(--cyber)}
.job{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:13px 15px;margin-bottom:9px;display:flex;gap:13px;align-items:flex-start}
.job.done{opacity:.5}
.job .main{flex:1;min-width:0}
.job h2{font-size:15.5px;margin:0 0 3px;font-weight:650}
.job h2 a{color:var(--ink);text-decoration:none}
.job h2 a:hover{color:var(--cyber);text-decoration:underline}
.meta{font-size:13px;color:var(--mut);margin-bottom:6px}
.meta .co{color:var(--cyber);font-weight:600}
.badges{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px}
.b{font-size:11.5px;padding:2px 8px;border-radius:999px;border:1px solid var(--line);background:#1e2230;color:var(--mut)}
.b.in{background:#0a2e22;color:var(--ok);border-color:#1a5c44}
.b.db{background:#1a2840;color:#f0c040;border-color:#2a3850}
.b.rm{background:#1a2040;color:#5dadec;border-color:#2a3055}
.b.off{background:#2a1525;color:#e74c3c;border-color:#3a2535}
.b.def{background:#152530;color:#3498db;border-color:#254060}
.b.sal{background:#2a2510;color:var(--warn);border-color:#3a3520}
.b.new{background:#0a2e22;color:var(--ok);border-color:#1a5c44;font-weight:600}
.b.old{background:#2a1515;color:#e74c3c;border-color:#3a2525}
.snip{font-size:13px;color:var(--mut);margin:0}
.side{display:flex;flex-direction:column;gap:7px;align-items:stretch;min-width:116px}
.apply{display:block;text-align:center;background:var(--cyber);color:#0f1117;text-decoration:none;padding:8px 12px;border-radius:7px;font-size:13.5px;font-weight:600}
.apply:hover{background:#00eabc}
.done-lbl{font-size:12.5px;color:var(--mut);display:flex;align-items:center;gap:6px;justify-content:center;cursor:pointer}
footer{margin-top:26px;font-size:12.5px;color:var(--mut);text-align:center;line-height:1.7}
@media(max-width:620px){.job{flex-direction:column}.side{flex-direction:row;min-width:0}.apply{flex:1}}
</style></head><body><div class="wrap">
<header>
<h1>Cybersecurity Job Tracker</h1>
<div class="sub">${jobs.length} cybersecurity openings from company career boards and remote job APIs, all still listed as of ${TODAY.toLocaleString('en-IN', { dateStyle: 'medium' })}. ${jobs.filter(j => j.india).length} are India-based, ${jobs.filter(j => j.dubai).length} are Dubai/UAE. Applied ticks are kept in this browser and survive a rebuild.</div>
</header>

<div class="note"><b>Resume recommendation.</b> Use the Penetration Tester resume for offensive/red-team roles and the Cyber Security Analyst (Dubai) CV for defensive/SOC/GRC roles and UAE positions. Each card below has a badge suggesting which to send.</div>

<details class="panel" open><summary>Recommended resumes</summary>
<div class="resume-rec">
<a href="Imran-Pasha-Penetration-Tester-Resume.pdf" target="_blank">Penetration Tester Resume (India / Remote)</a>
<a href="Dubai/Imran-Pasha-CV-Cyber-Security-Analyst-Dubai.pdf" target="_blank">Cyber Security Analyst CV (Dubai / UAE)</a>
</div>
</details>

<div class="note"><b>How fresh is this list?</b> ${fresh7} were posted in the last 7 days and ${fresh30} within 30 days. ${staleN} are older than 90 days or carry no reliable date, and those are flagged in red — the company still lists them, but an old requisition is often an evergreen pipeline rather than active hiring. Use the <b>≤ 7 days</b> filter to see only genuinely fresh postings.</div>

<details class="panel" open><summary>Application answers — click Copy, paste into the form</summary>
${ANSWERS.map((a, i) => `<div class="ans"><div class="q"><span>${esc(a[0])}</span><button class="copy" data-i="${i}">Copy</button></div><div class="a" id="ans${i}">${esc(a[1])}</div></div>`).join('')}
</details>

<details class="panel"><summary>Live search links for boards I cannot scrape (LinkedIn, Naukri, Bayt and more)</summary>
<div class="blist">${BOARDS.map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('')}</div>
</details>

<div class="controls">
  <input type="search" id="q" placeholder="Search title, company, tools...">
  <span class="chip" data-f="india">India only</span>
  <span class="chip" data-f="remote">Remote</span>
  <span class="chip" data-f="dubai">Dubai / UAE</span>
  <span class="chip" data-f="d7">≤ 7 days</span>
  <span class="chip" data-f="d30">≤ 30 days</span>
  <span class="chip" data-f="offensive">Offensive / Red Team</span>
  <span class="chip" data-f="defensive">Defensive / Blue Team</span>
  <span class="chip" data-f="hide">Hide applied</span>
  <select id="co"><option value="">All companies</option>${companies.map(c => `<option>${esc(c)}</option>`).join('')}</select>
  <select id="sort"><option value="fit">Sort: best fit</option><option value="new">Sort: newest first</option></select>
  <span class="count" id="count"></span>
</div>

<div id="list"></div>
<footer>
Sources: company Greenhouse, Lever and Ashby boards, plus Remotive, RemoteOK, Jobicy, Himalayas and Arbeitnow.<br>
Applied ticks live in this browser only, keyed to each posting's URL, so rebuilding the page keeps them.
</footer>
</div>
<script>
const JOBS = ${JSON.stringify(jobs)};
const ANSWERS = ${JSON.stringify(ANSWERS.map(a => a[1]))};
const K = 'imran_cyber_applied_v1';
let done = {};
try { done = JSON.parse(localStorage.getItem(K) || '{}'); } catch (e) { done = {}; }

const F = { india: false, remote: false, dubai: false, offensive: false, defensive: false, hide: false, d7: false, d30: false };
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function card(j) {
  const isDone = !!done[j.id];
  const badges = [];
  if (j.india) badges.push('<span class="b in">India</span>');
  else if (j.dubai) badges.push('<span class="b db">Dubai / UAE</span>');
  else if (j.remote) badges.push('<span class="b rm">Remote</span>');
  if (j.focus.includes('offensive')) badges.push('<span class="b off">Offensive / Red Team</span>');
  if (j.focus.includes('defensive')) badges.push('<span class="b def">Defensive / Blue Team</span>');
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
    if (F.dubai && !j.dubai) return false;
    if (F.d7 && !(j.a !== null && j.a <= 7)) return false;
    if (F.d30 && !(j.a !== null && j.a <= 30)) return false;
    if (F.offensive && !j.focus.includes('offensive')) return false;
    if (F.defensive && !j.focus.includes('defensive')) return false;
    if (co && j.c !== co) return false;
    if (q && !(j.t + ' ' + j.c + ' ' + j.r + ' ' + j.tags.join(' ') + ' ' + j.snip).toLowerCase().includes(q)) return false;
    return true;
  });
  if (document.getElementById('sort').value === 'new') {
    rows.sort((x, y) => (x.a === null ? 9999 : x.a) - (y.a === null ? 9999 : y.a));
  }
  document.getElementById('list').innerHTML = rows.map(card).join('') || '<p style="color:#8b8f9a">Nothing matches those filters.</p>';
  const n = Object.keys(done).filter(k => done[k]).length;
  document.getElementById('count').innerHTML = '<b>' + rows.length + '</b> shown &middot; <b>' + n + '</b> of ' + JOBS.length + ' applied';
}

document.getElementById('q').addEventListener('input', render);
document.getElementById('co').addEventListener('change', render);
document.getElementById('sort').addEventListener('change', render);
document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
  const f = c.dataset.f; F[f] = !F[f]; c.classList.toggle('on', F[f]);
  // mutually exclusive location filters
  if (f === 'india' && F.india) { F.remote = false; F.dubai = false; document.querySelector('[data-f=remote]').classList.remove('on'); document.querySelector('[data-f=dubai]').classList.remove('on'); }
  if (f === 'remote' && F.remote) { F.india = false; F.dubai = false; document.querySelector('[data-f=india]').classList.remove('on'); document.querySelector('[data-f=dubai]').classList.remove('on'); }
  if (f === 'dubai' && F.dubai) { F.india = false; F.remote = false; document.querySelector('[data-f=india]').classList.remove('on'); document.querySelector('[data-f=remote]').classList.remove('on'); }
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

fs.writeFileSync(path.join('..', 'cyber_jobs.html'), html);

const lines = ['Cybersecurity jobs — generated ' + d.generated, ''];
jobs.forEach((j, i) => lines.push(`${String(i + 1).padStart(3)}. ${j.t} — ${j.c} (${j.r})${j.sal ? ' [' + j.sal + ']' : ''}\n     ${j.u}`));
lines.push('', 'Board searches:');
BOARDS.forEach(([t, u]) => lines.push(`  ${t}\n     ${u}`));
lines.push('', 'Application answers:');
ANSWERS.forEach(([q, a]) => lines.push(`\n--- ${q} ---\n${a}`));
fs.writeFileSync(path.join('..', 'cyber-job-links.txt'), lines.join('\n'));

console.log('cyber_jobs.html', (fs.statSync(path.join('..', 'cyber_jobs.html')).size / 1024).toFixed(0) + 'KB |', jobs.length, 'jobs |', companies.length, 'companies |', ANSWERS.length, 'answers');
