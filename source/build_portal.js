// Build unified index.html portal for both Backend and Cybersecurity roles
const fs = require('fs');
const path = require('path');

const backendFinal = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'final.json'), 'utf8'));
const cyberFinal = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'cyber_final.json'), 'utf8'));

function hid(url) {
  let h = 2166136261;
  for (let i = 0; i < url.length; i++) { h ^= url.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 'j' + (h >>> 0).toString(36);
}

// Resume recommendation logic
function getBackendResume(j) {
  const hay = `${j.title} ${(j.tags || []).join(' ')} ${j.full || j.snippet || ''}`.toLowerCase();
  const isPython = /\b(python|fastapi|django|flask|celery|sqlalchemy)\b/i.test(hay);
  const isNode = /\b(node|express|typescript|javascript|nest)\b/i.test(hay);
  
  if (isPython && !isNode) {
    return {
      file: 'resumes/Imran-Pasha-Backend-Python.pdf',
      name: 'Python / FastAPI Backend Resume',
      badge: 'Python Focus',
      color: '#0284c7'
    };
  } else if (isNode && !isPython) {
    return {
      file: 'resumes/Imran-Pasha-Backend-NodeJS.pdf',
      name: 'Node.js / Express Backend Resume',
      badge: 'Node.js Focus',
      color: '#16a34a'
    };
  } else {
    // Both or general
    return {
      file: 'resumes/Imran-Pasha-Backend-Python.pdf',
      name: 'Python & Node.js Backend Resume',
      badge: 'Full Stack Backend',
      color: '#2563eb'
    };
  }
}

function getCyberResume(j) {
  const hay = `${j.title} ${(j.tags || []).join(' ')} ${j.full || j.snippet || ''}`.toLowerCase();
  const isDubai = j.inDubai || /\b(dubai|abu dhabi|uae|united arab emirates)\b/i.test(hay);
  const isPentest = /\b(penetration|pen\s*test|vapt|burp|metasploit|red team|offensive|appsec|application security)\b/i.test(hay);

  if (isDubai) {
    return {
      file: 'resumes/Imran-Pasha-Cyber-Security-Dubai.pdf',
      name: 'Cyber Security Analyst CV (Dubai Edition)',
      badge: 'Dubai CV',
      color: '#b45309'
    };
  } else if (isPentest) {
    return {
      file: 'resumes/Imran-Pasha-Penetration-Tester.pdf',
      name: 'Penetration Tester / AppSec Resume',
      badge: 'Offensive / VAPT',
      color: '#dc2626'
    };
  } else {
    return {
      file: 'resumes/Imran-Pasha-Cyber-Security-Dubai.pdf',
      name: 'Cyber Security Analyst Resume',
      badge: 'SOC / Defensive',
      color: '#059669'
    };
  }
}

const backendJobs = (backendFinal.jobs || []).map((j, i) => ({
  id: hid(j.url),
  idx: i,
  category: 'backend',
  title: j.title,
  company: j.company,
  url: j.url,
  region: j.region || (j.globalRemote ? 'Remote' : (j.inIndia ? 'India' : 'Worldwide')),
  posted: j.posted || '',
  salaryText: j.salaryText || '',
  inIndia: j.inIndia,
  inDubai: j.inDubai,
  globalRemote: j.globalRemote,
  tags: (j.tags || []).slice(0, 5),
  snippet: (j.snippet || '').slice(0, 220),
  resume: getBackendResume(j)
}));

const cyberJobs = (cyberFinal.jobs || []).map((j, i) => ({
  id: hid(j.url),
  idx: i,
  category: 'cyber',
  title: j.title,
  company: j.company,
  url: j.url,
  region: j.region || (j.globalRemote ? 'Remote' : (j.inDubai ? 'Dubai, UAE' : (j.inIndia ? 'India' : 'Worldwide'))),
  posted: j.posted || '',
  salaryText: j.salaryText || '',
  inIndia: j.inIndia,
  inDubai: j.inDubai,
  globalRemote: j.globalRemote,
  tags: (j.tags || []).slice(0, 5),
  snippet: (j.snippet || '').slice(0, 220),
  resume: getCyberResume(j)
}));

const ANSWERS = [
  ['Tell us about yourself / summary',
   'I am a backend engineer with nearly two years building production APIs and distributed systems in Python (FastAPI) and Node.js (Express). I was the founding backend engineer on Kaizer X, an AI video production SaaS, owning 765 REST and WebSocket routes over 150 PostgreSQL tables. I also built a field-service payments platform end to end as sole backend engineer: three payment gateways behind one facade with HMAC-verified webhooks and idempotent settlement. Certified in cyber security through IIT Roorkee and apply it directly to API design.'],
  ['Databases & SQL',
   'I design and tune PostgreSQL rather than just query it: 68 tables across 37 transactional migrations on a payments platform I owned solo, 150 tables on Kaizer X, and a 9.9 million row dataset held sub-second per read using composite indexes from EXPLAIN ANALYZE and Redis caching. Day to day: FOR UPDATE SKIP LOCKED job queues with lease fencing, advisory locks, ON CONFLICT upserts, row locks, and pgBouncer pool tuning.'],
  ['Python / scale',
   'Built and tuned backend over 9.9M-row PostgreSQL dataset holding sub-second API latency. Own multi-stage Python pipeline moving video through transcription, LLM edit decisions, and FFmpeg rendering coordinated by durable PostgreSQL FOR UPDATE SKIP LOCKED job queues with Redis Streams consumer groups and XCLAIM crash recovery.'],
  ['Node.js / Express',
   'Built user-identity domain of TypeScript/Express API with InversifyJS DI: registration, OTP, RBAC, OAuth 2.0 exchange, PayU post-payment fulfilment. Also built field-service platform on Node.js/Express: 23 modules, 200 endpoints, 400 node-postgres queries with ON CONFLICT upserts and row locks.'],
  ['Cyber Security & AppSec',
   'Hold Executive Post Graduate Certification in Cyber Security & Ethical Hacking from IIT Roorkee (iHUB DivyaSampark). Closed two-round adversarial review on Kaizer X covering BOLA/IDOR on live broadcasts and WebSockets, OAuth XSS, SSRF protection, and constant-time HMAC webhook verification.'],
  ['Notice period / Availability',
   '30 days notice period, can negotiate for early release.'],
  ['Location & Relocation',
   'Currently based in Hyderabad, India. Open to relocation (Bangalore, Pune, Delhi NCR, Dubai/UAE) and Remote roles.']
];

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Imran Pasha — Job Application Portal</title>
  <style>
    :root {
      --bg: #0f172a;
      --surface: #1e293b;
      --card: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --muted: #94a3b8;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --accent: #10b981;
      --accent-hover: #059669;
      --cyber: #06b6d4;
      --warn: #f59e0b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    .container {
      max-width: 1180px;
      margin: 0 auto;
      padding: 20px 16px 80px;
    }
    header {
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sub {
      color: var(--muted);
      font-size: 13.5px;
      margin-top: 4px;
    }
    .resume-bar {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 14px;
      background: rgba(30, 41, 59, 0.7);
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
    }
    .resume-bar span {
      font-size: 12.5px;
      color: var(--muted);
      display: flex;
      align-items: center;
      margin-right: 6px;
      font-weight: 600;
    }
    .resume-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      background: #0f172a;
      border: 1px solid var(--border);
      border-radius: 6px;
      color: #38bdf8;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s;
    }
    .resume-btn:hover {
      background: #1e293b;
      border-color: #38bdf8;
      color: #ffffff;
    }
    /* Tabs */
    .tabs-nav {
      display: flex;
      gap: 10px;
      margin: 20px 0 16px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1px;
    }
    .tab-btn {
      background: transparent;
      border: 0;
      border-bottom: 3px solid transparent;
      padding: 10px 18px;
      font-size: 15px;
      font-weight: 600;
      color: var(--muted);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s;
    }
    .tab-btn.active {
      color: #ffffff;
      border-bottom-color: var(--primary);
    }
    .tab-btn.cyber-active {
      border-bottom-color: var(--cyber);
    }
    .tab-count {
      background: #334155;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 12px;
      color: #ffffff;
    }
    /* Filter controls */
    .controls {
      position: sticky;
      top: 0;
      z-index: 10;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(8px);
      padding: 12px 0;
      margin-bottom: 18px;
      border-bottom: 1px solid var(--border);
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    .search-input {
      flex: 1;
      min-width: 240px;
      padding: 9px 14px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 7px;
      color: #ffffff;
      font-size: 14px;
    }
    .search-input:focus {
      outline: 2px solid var(--primary);
      border-color: transparent;
    }
    .pill {
      padding: 7px 14px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--surface);
      color: var(--muted);
      font-size: 13px;
      cursor: pointer;
      user-select: none;
      transition: all 0.15s;
    }
    .pill:hover {
      background: #334155;
      color: #ffffff;
    }
    .pill.active {
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary);
      font-weight: 600;
    }
    .hide-applied {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--muted);
      cursor: pointer;
      user-select: none;
      margin-left: auto;
    }
    /* Job Card */
    .job-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .job-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px 18px;
      display: flex;
      gap: 16px;
      align-items: flex-start;
      transition: border-color 0.15s;
    }
    .job-card:hover {
      border-color: #475569;
    }
    .job-card.applied {
      opacity: 0.45;
    }
    .job-main {
      flex: 1;
      min-width: 0;
    }
    .job-title {
      margin: 0 0 4px;
      font-size: 17px;
      font-weight: 650;
    }
    .job-title a {
      color: #ffffff;
      text-decoration: none;
    }
    .job-title a:hover {
      color: #38bdf8;
      text-decoration: underline;
    }
    .job-meta {
      font-size: 13.5px;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .job-meta strong {
      color: #e2e8f0;
    }
    .badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }
    .badge {
      font-size: 11.5px;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 600;
    }
    .badge-in { background: #064e3b; color: #6ee7b7; }
    .badge-dubai { background: #451a03; color: #fcd34d; }
    .badge-remote { background: #1e3a8a; color: #93c5fd; }
    .badge-salary { background: #3b2d07; color: #fde047; }
    
    /* Resume recommendation banner */
    .resume-rec-box {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .resume-rec-label {
      font-size: 12.5px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .resume-rec-label b {
      color: #ffffff;
    }
    .resume-rec-link {
      background: #1e293b;
      border: 1px solid var(--border);
      color: #38bdf8;
      text-decoration: none;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11.5px;
      font-weight: 600;
      white-space: nowrap;
    }
    .resume-rec-link:hover {
      background: #334155;
      color: #ffffff;
    }
    .job-snippet {
      font-size: 13px;
      color: var(--muted);
      margin: 0;
      line-height: 1.5;
    }
    .job-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 130px;
      align-items: stretch;
    }
    .apply-btn {
      display: inline-block;
      text-align: center;
      background: var(--primary);
      color: #ffffff;
      font-size: 13.5px;
      font-weight: 600;
      padding: 9px 16px;
      border-radius: 7px;
      text-decoration: none;
      transition: background 0.15s;
    }
    .apply-btn:hover {
      background: var(--primary-hover);
    }
    .apply-btn.cyber {
      background: var(--cyber);
      color: #0f172a;
    }
    .apply-btn.cyber:hover {
      background: #22d3ee;
    }
    .applied-checkbox {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 12.5px;
      color: var(--muted);
      cursor: pointer;
      user-select: none;
    }
    /* Drawer */
    details.drawer {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    details.drawer summary {
      padding: 14px 18px;
      font-size: 14.5px;
      font-weight: 600;
      cursor: pointer;
      color: #38bdf8;
      display: flex;
      justify-content: space-between;
      user-select: none;
    }
    .drawer-content {
      padding: 12px 18px 18px;
      border-top: 1px solid var(--border);
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 12px;
    }
    .ans-box {
      background: #0f172a;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
    }
    .ans-title {
      font-size: 13px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .ans-text {
      font-size: 12.5px;
      color: var(--muted);
      line-height: 1.45;
      white-space: pre-wrap;
    }
    .copy-btn {
      background: #1e293b;
      border: 1px solid var(--border);
      color: #38bdf8;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      cursor: pointer;
    }
    .copy-btn:hover { background: #334155; color: #ffffff; }
  </style>
</head>
<body>
  <div class="container">
    
    <header>
      <div class="header-top">
        <div>
          <h1>🚀 Imran Pasha &mdash; Live Job Portal</h1>
          <div class="sub">
            Updated automatically by Cloud Bot &bull; 
            <strong>${backendJobs.length} Backend Jobs</strong> (~1.8–2 Yrs Exp) &bull; 
            <strong>${cyberJobs.length} Cybersecurity Jobs</strong> (Fresher / Entry-Level)
          </div>
        </div>
      </div>

      <!-- Fast Resume Access -->
      <div class="resume-bar">
        <span>📄 Direct Resumes:</span>
        <a href="resumes/Imran-Pasha-Backend-Python.pdf" target="_blank" class="resume-btn">🐍 Backend Python/AI</a>
        <a href="resumes/Imran-Pasha-Backend-NodeJS.pdf" target="_blank" class="resume-btn">🟩 Backend Node.js</a>
        <a href="resumes/Imran-Pasha-Penetration-Tester.pdf" target="_blank" class="resume-btn">🎯 Pentest / AppSec</a>
        <a href="resumes/Imran-Pasha-Cyber-Security-Dubai.pdf" target="_blank" class="resume-btn">🛡️ Cyber Security (Dubai/SOC)</a>
      </div>
    </header>

    <!-- Screening Answers Helper Drawer -->
    <details class="drawer">
      <summary>📋 Quick Application Answers (Click to expand & copy pre-written answers)</summary>
      <div class="drawer-content">
        ${ANSWERS.map(([title, text]) => `
          <div class="ans-box">
            <div class="ans-title">
              <span>${title}</span>
              <button class="copy-btn" onclick="copyAns(this, \`${text.replace(/`/g, '\\`').replace(/"/g, '&quot;')}\`)">Copy</button>
            </div>
            <div class="ans-text">${text}</div>
          </div>
        `).join('')}
      </div>
    </details>

    <!-- Category Tabs -->
    <div class="tabs-nav">
      <button class="tab-btn active" id="tab-backend" onclick="switchCategory('backend')">
        💻 Backend Engineer Roles <span class="tab-count">${backendJobs.length}</span>
      </button>
      <button class="tab-btn" id="tab-cyber" onclick="switchCategory('cyber')">
        🛡️ Cybersecurity Fresher Roles <span class="tab-count">${cyberJobs.length}</span>
      </button>
    </div>

    <!-- Filter Bar -->
    <div class="controls">
      <input type="search" id="searchBox" class="search-input" placeholder="Search by title, company, stack (e.g. Databricks, Fastly, Python, SOC)..." oninput="applyFilters()">
      <button class="pill active" data-filter="all" onclick="setRegionFilter('all')">All Regions</button>
      <button class="pill" data-filter="india" onclick="setRegionFilter('india')">🇮🇳 India</button>
      <button class="pill" data-filter="dubai" onclick="setRegionFilter('dubai')">🇦🇪 Dubai/UAE</button>
      <button class="pill" data-filter="remote" onclick="setRegionFilter('remote')">🌐 Remote</button>
      
      <label class="hide-applied">
        <input type="checkbox" id="hideAppliedCheck" onchange="applyFilters()"> Hide Applied
      </label>
    </div>

    <!-- Job Cards List -->
    <div class="job-list" id="jobContainer">
      <!-- Injected via JavaScript -->
    </div>

  </div>

  <script>
    const ALL_BACKEND = ${JSON.stringify(backendJobs)};
    const ALL_CYBER = ${JSON.stringify(cyberJobs)};

    let currentCategory = 'backend';
    let currentRegion = 'all';

    function getAppliedSet() {
      try {
        const raw = localStorage.getItem('applied_jobs_v2');
        return new Set(raw ? JSON.parse(raw) : []);
      } catch (e) {
        return new Set();
      }
    }

    function toggleApplied(id) {
      const set = getAppliedSet();
      if (set.has(id)) set.delete(id);
      else set.add(id);
      localStorage.setItem('applied_jobs_v2', JSON.stringify([...set]));
      applyFilters();
    }

    function switchCategory(cat) {
      currentCategory = cat;
      document.getElementById('tab-backend').className = 'tab-btn' + (cat === 'backend' ? ' active' : '');
      document.getElementById('tab-cyber').className = 'tab-btn' + (cat === 'cyber' ? ' active cyber-active' : '');
      applyFilters();
    }

    function setRegionFilter(reg) {
      currentRegion = reg;
      document.querySelectorAll('.pill').forEach(p => {
        p.classList.toggle('active', p.dataset.filter === reg);
      });
      applyFilters();
    }

    function copyAns(btn, text) {
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = orig, 1200);
      });
    }

    function applyFilters() {
      const query = (document.getElementById('searchBox').value || '').toLowerCase().trim();
      const hideApplied = document.getElementById('hideAppliedCheck').checked;
      const appliedSet = getAppliedSet();

      const jobs = currentCategory === 'backend' ? ALL_BACKEND : ALL_CYBER;

      const filtered = jobs.filter(j => {
        const isApplied = appliedSet.has(j.id);
        if (hideApplied && isApplied) return false;

        if (currentRegion === 'india' && !j.inIndia) return false;
        if (currentRegion === 'dubai' && !j.inDubai) return false;
        if (currentRegion === 'remote' && !j.globalRemote) return false;

        if (query) {
          const hay = (j.title + ' ' + j.company + ' ' + j.region + ' ' + (j.tags||[]).join(' ') + ' ' + j.snippet).toLowerCase();
          if (!hay.includes(query)) return false;
        }
        return true;
      });

      render(filtered, appliedSet);
    }

    function render(jobs, appliedSet) {
      const container = document.getElementById('jobContainer');
      if (!jobs.length) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">No jobs found matching your filters.</div>';
        return;
      }

      container.innerHTML = jobs.map(j => {
        const isApplied = appliedSet.has(j.id);
        const badges = [];
        if (j.inIndia) badges.push('<span class="badge badge-in">India</span>');
        if (j.inDubai) badges.push('<span class="badge badge-dubai">Dubai/UAE</span>');
        if (j.globalRemote) badges.push('<span class="badge badge-remote">Remote</span>');
        if (j.salaryText) badges.push('<span class="badge badge-salary">💰 ' + j.salaryText + '</span>');

        const btnClass = currentCategory === 'cyber' ? 'apply-btn cyber' : 'apply-btn';

        return \`
          <div class="job-card \${isApplied ? 'applied' : ''}">
            <div class="job-main">
              <h2 class="job-title"><a href="\${j.url}" target="_blank">\${j.title}</a></h2>
              <div class="job-meta">
                <strong>\${j.company}</strong> &bull; 📍 \${j.region} \${j.posted ? '&bull; 📅 ' + j.posted : ''}
              </div>
              <div class="badges">\${badges.join('')}</div>
              
              <!-- EXACT RESUME TO USE -->
              <div class="resume-rec-box">
                <div class="resume-rec-label">
                  <span>📄 <strong>Use Resume:</strong></span>
                  <span style="color:\${j.resume.color};font-weight:600;">\${j.resume.name}</span>
                </div>
                <a href="\${j.resume.file}" target="_blank" class="resume-rec-link">Download / View PDF &rarr;</a>
              </div>

              <p class="job-snippet">\${j.snippet}</p>
            </div>

            <div class="job-actions">
              <a href="\${j.url}" target="_blank" class="\${btnClass}">Open & Apply &rarr;</a>
              <label class="applied-checkbox">
                <input type="checkbox" \${isApplied ? 'checked' : ''} onchange="toggleApplied('\${j.id}')">
                <span>\${isApplied ? 'Applied ✓' : 'Mark applied'}</span>
              </label>
            </div>
          </div>
        \`;
      }).join('');
    }

    // Initial render
    applyFilters();
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, '..', 'index.html'), html);
console.log('Successfully built Jobs/index.html!');
