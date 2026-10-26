// Build massive 1,000+ job portal for Backend Engineering & Cybersecurity
const fs = require('fs');
const path = require('path');

const atsBackend = [...JSON.parse(fs.readFileSync(path.join(__dirname, 'ats_raw.json'), 'utf8')), ...JSON.parse(fs.readFileSync(path.join(__dirname, 'ats_raw2.json'), 'utf8'))];
const remoteBackend = JSON.parse(fs.readFileSync(path.join(__dirname, 'jobs.json'), 'utf8')).jobs;
const allRawBackend = [...atsBackend, ...remoteBackend];

const atsCyber = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ats_cyber_raw.json'), 'utf8'));
const remoteCyber = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'cyber_jobs.json'), 'utf8')).jobs;
const allRawCyber = [...atsCyber, ...remoteCyber];

const dubaiMdPath = path.join(__dirname, '..', '..', 'Dubai', 'Dubai-Jobs-Cybersecurity-Fresher.md');

const USD_INR = 88;
const INDIA = /\b(india|bangalore|bengaluru|hyderabad|mumbai|pune|delhi|gurgaon|gurugram|noida|chennai|kolkata|ahmedabad|jaipur|indore|kochi|coimbatore|trivandrum|thiruvananthapuram|mysore|mysuru|chandigarh|nagpur|bhubaneswar|vizag|visakhapatnam)\b/i;
const DUBAI = /\b(dubai|abu dhabi|uae|united arab emirates|sharjah|ajman|gcc|middle east|gulf)\b/i;
const GLOBAL_REMOTE = /\b(worldwide|anywhere|global|remote\s*-\s*global|apac|asia)\b/i;

function hid(url) {
  let h = 2166136261;
  for (let i = 0; i < url.length; i++) { h ^= url.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 'j' + (h >>> 0).toString(36);
}

// ---------------- BACKEND FILTER & SCORE ----------------
const TITLE_STRONG_BACKEND = /\b(back[\s-]?end|server[\s-]?side|api engineer|platform engineer|distributed systems|python|node\.?js|golang|infrastructure engineer|software engineer|software developer|sde|full[\s-]?stack|applications? engineer|systems engineer|cloud engineer|devops|data engineer)\b/i;
const NOT_BACKEND = /\b(frontend only|ui\/ux|graphic|designer|marketing|sales|recruiter|copywriter|content|customer support|account manager|teacher|tutor|nurse|driver|accountant|social media|seo|salesforce|flutter|manual tester)\b/i;
const SENIOR_ONLY = /\b(principal|staff engineer|head of|vp of|director of|chief|architect|engineering manager|10\+ years|8\+ years|12\+ years|15\+ years)\b/i;

function getBackendResume(j) {
  const hay = `${j.title} ${(j.tags || []).join(' ')} ${j.full || j.snippet || ''}`.toLowerCase();
  const isPython = /\b(python|fastapi|django|flask|celery|sqlalchemy)\b/i.test(hay);
  const isNode = /\b(node|express|typescript|javascript|nest)\b/i.test(hay);
  
  if (isPython && !isNode) {
    return { file: 'resumes/Imran-Pasha-Backend-Python.pdf', name: 'Python / FastAPI Backend Resume', badge: 'Python Focus', color: '#0284c7' };
  } else if (isNode && !isPython) {
    return { file: 'resumes/Imran-Pasha-Backend-NodeJS.pdf', name: 'Node.js / Express Backend Resume', badge: 'Node.js Focus', color: '#16a34a' };
  } else {
    return { file: 'resumes/Imran-Pasha-Backend-Python.pdf', name: 'Python & Node.js Backend Resume', badge: 'Full Stack Backend', color: '#2563eb' };
  }
}

const seenBackend = new Set();
const backendJobs = [];

for (const j of allRawBackend) {
  if (!j.title || !j.url || !j.company) continue;
  if (NOT_BACKEND.test(j.title)) continue;
  if (SENIOR_ONLY.test(j.title)) continue;
  if (!TITLE_STRONG_BACKEND.test(j.title)) continue;
  const key = (j.title + '|' + j.company).toLowerCase().replace(/[^a-z0-9|]/g, '');
  if (seenBackend.has(key)) continue;
  seenBackend.add(key);

  const region = String(j.region || '').replace(/\s+/g, ' ').trim();
  const inIndia = INDIA.test(region) || (!region && INDIA.test(j.snippet || ''));
  const globalRemote = GLOBAL_REMOTE.test(region) || /remote/i.test(region);

  // Score
  let s = 50;
  if (inIndia) s += 40;
  if (globalRemote) s += 20;
  if (/\b(python|fastapi|django)\b/i.test(j.title + ' ' + (j.snippet || ''))) s += 15;
  if (/\b(node|express|typescript)\b/i.test(j.title + ' ' + (j.snippet || ''))) s += 15;
  if (/\b(sde ?[12]|sde ?i{1,2}|junior|associate|intermediate)\b/i.test(j.title)) s += 25;
  if (/\bsenior\b/i.test(j.title)) s -= 20;

  backendJobs.push({
    id: hid(j.url),
    title: j.title,
    company: j.company,
    url: j.url,
    region: region || (globalRemote ? 'Remote' : (inIndia ? 'India' : 'Worldwide')),
    posted: j.posted || '',
    salaryText: j.salaryText || '',
    inIndia,
    inDubai: DUBAI.test(region),
    globalRemote,
    tags: (j.tags || []).slice(0, 5),
    snippet: (j.snippet || '').slice(0, 220),
    resume: getBackendResume(j),
    score: s
  });
}
backendJobs.sort((a, b) => b.score - a.score);

// ---------------- CYBERSECURITY FILTER & SCORE ----------------
const TITLE_MUST_CYBER = /\b(soc|security|infosec|cyber|penetration|pen\s*test|vapt|vulnerability|appsec|threat|incident response|blue team|red team|cloud security|network security|iam|grc|defensive security|offensive security)\b/i;
const SENIOR_CYBER = /\b(principal|staff|architect|director|head of|vp\b|vice president|ciso|chief|10\+ years|12\+ years|15\+ years)\b/i;
const NOT_SEC = /\b(sales|marketing|account executive|recruiter|hr\b|finance|legal)\b/i;

function getCyberResume(j) {
  const hay = `${j.title} ${(j.tags || []).join(' ')} ${j.full || j.snippet || ''}`.toLowerCase();
  const isDubai = j.inDubai || /\b(dubai|abu dhabi|uae|united arab emirates)\b/i.test(hay);
  const isPentest = /\b(penetration|pen\s*test|vapt|burp|metasploit|red team|offensive|appsec|application security)\b/i.test(hay);

  if (isDubai) {
    return { file: 'resumes/Imran-Pasha-Cyber-Security-Dubai.pdf', name: 'Cyber Security Analyst CV (Dubai Edition)', badge: 'Dubai CV', color: '#b45309' };
  } else if (isPentest) {
    return { file: 'resumes/Imran-Pasha-Penetration-Tester.pdf', name: 'Penetration Tester / AppSec Resume', badge: 'Offensive / VAPT', color: '#dc2626' };
  } else {
    return { file: 'resumes/Imran-Pasha-Cyber-Security-Dubai.pdf', name: 'Cyber Security Analyst Resume', badge: 'SOC / Defensive', color: '#059669' };
  }
}

const seenCyber = new Set();
const cyberJobs = [];

// Ingest Curated Dubai roles first
if (fs.existsSync(dubaiMdPath)) {
  const md = fs.readFileSync(dubaiMdPath, 'utf8');
  const validSection = md.split(/## 3\./)[0];
  const lines = validSection.split('\n');
  for (const l of lines) {
    if (l.includes('|') && l.includes('http')) {
      const parts = l.split('|').map(p => p.trim());
      const url = parts.find(p => p.startsWith('http'));
      if (url && parts.length >= 8 && parts[2] && !/company/i.test(parts[2])) {
        const co = parts[2];
        const title = parts[3];
        const city = parts[4] || 'Dubai, UAE';
        const exp = parts[5] || '';
        const key = (title + '|' + co).toLowerCase().replace(/[^a-z0-9|]/g, '');
        seenCyber.add(key);
        cyberJobs.push({
          id: hid(url), title, company: co, url,
          region: city, posted: '2026-10-23',
          salaryText: '', inIndia: false, inDubai: true, globalRemote: false,
          tags: ['cybersecurity', 'fresher', 'dubai'],
          snippet: `Curated UAE fresher role: ${exp}. Verified fit for IIT Roorkee certification.`,
          resume: { file: 'resumes/Imran-Pasha-Cyber-Security-Dubai.pdf', name: 'Cyber Security Analyst CV (Dubai Edition)', badge: 'Dubai CV', color: '#b45309' },
          score: 160
        });
      }
    }
  }
}

for (const j of allRawCyber) {
  if (!j.title || !j.url || !j.company) continue;
  if (!TITLE_MUST_CYBER.test(j.title)) continue;
  if (SENIOR_CYBER.test(j.title)) continue;
  if (NOT_SEC.test(j.title)) continue;
  const key = (j.title + '|' + j.company).toLowerCase().replace(/[^a-z0-9|]/g, '');
  if (seenCyber.has(key)) continue;
  seenCyber.add(key);

  const region = String(j.region || '').replace(/\s+/g, ' ').trim();
  const inIndia = INDIA.test(region) || (!region && INDIA.test(j.snippet || ''));
  const inDubai = DUBAI.test(region);
  const globalRemote = GLOBAL_REMOTE.test(region) || /remote/i.test(region);

  let s = 50;
  if (inDubai) s += 45;
  if (inIndia) s += 40;
  if (globalRemote) s += 15;
  if (/\b(fresher|entry|junior|associate|intern|trainee|analyst 1|l1)\b/i.test(j.title + ' ' + (j.snippet || ''))) s += 30;
  if (/\bsenior\b/i.test(j.title)) s -= 20;

  cyberJobs.push({
    id: hid(j.url),
    title: j.title,
    company: j.company,
    url: j.url,
    region: region || (globalRemote ? 'Remote' : (inDubai ? 'Dubai, UAE' : (inIndia ? 'India' : 'Worldwide'))),
    posted: j.posted || '',
    salaryText: j.salaryText || '',
    inIndia,
    inDubai,
    globalRemote,
    tags: (j.tags || []).slice(0, 5),
    snippet: (j.snippet || '').slice(0, 220),
    resume: getCyberResume(j),
    score: s
  });
}
cyberJobs.sort((a, b) => b.score - a.score);

console.log('Total Backend Jobs compiled:', backendJobs.length);
console.log('Total Cyber Jobs compiled:', cyberJobs.length);

const MNC_PORTALS = [
  { name: 'Capgemini India', desc: 'Direct portal for Python, Backend & Cyber Security Engineers (Hybrid India)', link: 'https://www.capgemini.com/in-en/careers/job-search/?country=in-en&technology=software-engineering' },
  { name: 'Cognizant Careers', desc: 'GenC Off-Campus & Lateral Openings for Backend and CyberSecurity Analysts', link: 'https://careers.cognizant.com/in/en/search-results?keywords=Software%20Engineer' },
  { name: 'Wipro Cyber Security & SOC', desc: 'L1 SOC Analyst & Cybersecurity Trainee Drives', link: 'https://careers.wipro.com/global-india' },
  { name: 'Tata Communications', desc: 'Cyber Security Analyst, Threat Monitoring & SOC Operations', link: 'https://jobs.tatacommunications.com/' },
  { name: 'Kyndryl India', desc: 'Cloud Security, Infrastructure Defense & Security Operations', link: 'https://kyndryl.com/careers' },
  { name: 'Infosys Careers', desc: 'Specialist Programmer & Software Engineer Lateral Drives', link: 'https://www.infosys.com/careers.html' }
];

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
   'Currently based in Hyderabad / Mangalore. Open to Bangalore, Mangalore, Pune, Hyderabad, Dubai/UAE, and Remote roles.']
];

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Imran Pasha — 1,700+ Live Jobs Portal (Backend & Cybersecurity)</title>
  <style>
    :root {
      --bg: #0b0f19;
      --surface: #151d30;
      --card: #151d30;
      --border: #243049;
      --text: #f8fafc;
      --muted: #94a3b8;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --cyber: #06b6d4;
      --accent: #10b981;
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
      max-width: 1200px;
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
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .sub {
      color: var(--muted);
      font-size: 14px;
      margin-top: 6px;
    }
    .sub strong { color: #38bdf8; }
    
    .resume-bar {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 14px;
      background: rgba(21, 29, 48, 0.8);
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
    }
    .resume-bar span {
      font-size: 13px;
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
      padding: 6px 12px;
      background: #0b0f19;
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

    /* MNC Direct Section */
    .mnc-section {
      background: rgba(21, 29, 48, 0.6);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }
    .mnc-title {
      font-size: 14px;
      font-weight: 700;
      color: #fbbf24;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .mnc-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 10px;
    }
    .mnc-card {
      background: #0b0f19;
      border: 1px solid var(--border);
      border-radius: 7px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 6px;
    }
    .mnc-card strong { color: #ffffff; font-size: 13.5px; }
    .mnc-card p { margin: 0; font-size: 12px; color: var(--muted); }
    .mnc-card a {
      color: #38bdf8;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      align-self: flex-start;
      margin-top: 4px;
    }
    .mnc-card a:hover { text-decoration: underline; }

    /* Tabs */
    .tabs-nav {
      display: flex;
      gap: 12px;
      margin: 20px 0 16px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1px;
    }
    .tab-btn {
      background: transparent;
      border: 0;
      border-bottom: 3px solid transparent;
      padding: 12px 20px;
      font-size: 16px;
      font-weight: 700;
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
      background: #243049;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 13px;
      color: #ffffff;
    }

    /* Controls */
    .controls {
      position: sticky;
      top: 0;
      z-index: 10;
      background: rgba(11, 15, 25, 0.95);
      backdrop-filter: blur(10px);
      padding: 14px 0;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    .search-input {
      flex: 1;
      min-width: 250px;
      padding: 10px 16px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: #ffffff;
      font-size: 14px;
    }
    .search-input:focus {
      outline: 2px solid var(--primary);
      border-color: transparent;
    }
    .pill {
      padding: 8px 16px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--surface);
      color: var(--muted);
      font-size: 13.5px;
      cursor: pointer;
      user-select: none;
      transition: all 0.15s;
    }
    .pill:hover {
      background: #243049;
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
      gap: 14px;
    }
    .job-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 18px 20px;
      display: flex;
      gap: 18px;
      align-items: flex-start;
      transition: border-color 0.15s;
    }
    .job-card:hover {
      border-color: #3b82f6;
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
      font-size: 17.5px;
      font-weight: 700;
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
    
    .resume-rec-box {
      background: #0b0f19;
      border: 1px solid #243049;
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
      background: #151d30;
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
      background: #243049;
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
      min-width: 140px;
      align-items: stretch;
    }
    .apply-btn {
      display: inline-block;
      text-align: center;
      background: var(--primary);
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      padding: 10px 16px;
      border-radius: 7px;
      text-decoration: none;
      transition: background 0.15s;
    }
    .apply-btn:hover {
      background: var(--primary-hover);
    }
    .apply-btn.cyber {
      background: var(--cyber);
      color: #0b0f19;
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

    /* Pagination */
    .pagination-bar {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
    }
    .page-btn {
      background: var(--surface);
      border: 1px solid var(--border);
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
    }
    .page-btn:hover { background: #243049; }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-info { font-size: 13.5px; color: var(--muted); }

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
      background: #0b0f19;
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
      background: #151d30;
      border: 1px solid var(--border);
      color: #38bdf8;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      cursor: pointer;
    }
    .copy-btn:hover { background: #243049; color: #ffffff; }
  </style>
</head>
<body>
  <div class="container">
    
    <header>
      <div class="header-top">
        <div>
          <h1>🚀 Imran Pasha &mdash; Live Job Command Center</h1>
          <div class="sub">
            Scraped across 77+ ATS boards, SmartRecruiters, Lever, Greenhouse, Remote APIs & Curated Sweeps &bull; 
            <strong>${backendJobs.length} Backend Jobs</strong> (~1.8–2 Yrs Exp) &bull; 
            <strong>${cyberJobs.length} Cybersecurity Jobs</strong> (Fresher / Entry-Level)
          </div>
        </div>
      </div>

      <!-- Fast Resume Access -->
      <div class="resume-bar">
        <span>📄 Download Matching Resumes:</span>
        <a href="resumes/Imran-Pasha-Backend-Python.pdf" target="_blank" class="resume-btn">🐍 Backend Python/AI</a>
        <a href="resumes/Imran-Pasha-Backend-NodeJS.pdf" target="_blank" class="resume-btn">🟩 Backend Node.js</a>
        <a href="resumes/Imran-Pasha-Penetration-Tester.pdf" target="_blank" class="resume-btn">🎯 Pentest / AppSec</a>
        <a href="resumes/Imran-Pasha-Cyber-Security-Dubai.pdf" target="_blank" class="resume-btn">🛡️ Cyber Security (Dubai/SOC)</a>
      </div>
    </header>

    <!-- MNC Direct Section (Capgemini, Cognizant, Wipro, etc.) -->
    <div class="mnc-section">
      <div class="mnc-title">🏢 Major Tech MNC Direct Career Portals (Capgemini, Cognizant, etc.)</div>
      <div class="mnc-grid">
        ${MNC_PORTALS.map(m => `
          <div class="mnc-card">
            <strong>${m.name}</strong>
            <p>${m.desc}</p>
            <a href="${m.link}" target="_blank">Open Official Career Page &rarr;</a>
          </div>
        `).join('')}
      </div>
    </div>

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
        💻 Backend & Software Engineer <span class="tab-count">${backendJobs.length}</span>
      </button>
      <button class="tab-btn" id="tab-cyber" onclick="switchCategory('cyber')">
        🛡️ Cybersecurity Fresher & Entry-Level <span class="tab-count">${cyberJobs.length}</span>
      </button>
    </div>

    <!-- Filter Bar -->
    <div class="controls">
      <input type="search" id="searchBox" class="search-input" placeholder="Search by title, company, stack (e.g. Databricks, Python, FastAPI, SOC, Bugcrowd)..." oninput="resetPageAndFilter()">
      <button class="pill active" data-filter="all" onclick="setRegionFilter('all')">All Regions</button>
      <button class="pill" data-filter="india" onclick="setRegionFilter('india')">🇮🇳 India</button>
      <button class="pill" data-filter="dubai" onclick="setRegionFilter('dubai')">🇦🇪 Dubai/UAE</button>
      <button class="pill" data-filter="remote" onclick="setRegionFilter('remote')">🌐 Remote</button>
      
      <label class="hide-applied">
        <input type="checkbox" id="hideAppliedCheck" onchange="resetPageAndFilter()"> Hide Applied
      </label>
    </div>

    <!-- Job Cards List -->
    <div class="job-list" id="jobContainer">
      <!-- Injected via JavaScript -->
    </div>

    <!-- Pagination Controls -->
    <div class="pagination-bar">
      <button class="page-btn" id="prevPageBtn" onclick="changePage(-1)">&larr; Previous</button>
      <span class="page-info" id="pageInfo">Page 1</span>
      <button class="page-btn" id="nextPageBtn" onclick="changePage(1)">Next &rarr;</button>
    </div>

  </div>

  <script>
    const ALL_BACKEND = ${JSON.stringify(backendJobs)};
    const ALL_CYBER = ${JSON.stringify(cyberJobs)};

    let currentCategory = 'backend';
    let currentRegion = 'all';
    let currentPage = 1;
    const PAGE_SIZE = 50;

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
      currentPage = 1;
      document.getElementById('tab-backend').className = 'tab-btn' + (cat === 'backend' ? ' active' : '');
      document.getElementById('tab-cyber').className = 'tab-btn' + (cat === 'cyber' ? ' active cyber-active' : '');
      applyFilters();
    }

    function setRegionFilter(reg) {
      currentRegion = reg;
      currentPage = 1;
      document.querySelectorAll('.pill').forEach(p => {
        p.classList.toggle('active', p.dataset.filter === reg);
      });
      applyFilters();
    }

    function resetPageAndFilter() {
      currentPage = 1;
      applyFilters();
    }

    function changePage(delta) {
      currentPage += delta;
      applyFilters();
      window.scrollTo({ top: 400, behavior: 'smooth' });
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

      const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
      if (currentPage > totalPages) currentPage = totalPages;
      if (currentPage < 1) currentPage = 1;

      document.getElementById('pageInfo').textContent = 'Page ' + currentPage + ' of ' + totalPages + ' (' + filtered.length + ' jobs)';
      document.getElementById('prevPageBtn').disabled = (currentPage === 1);
      document.getElementById('nextPageBtn').disabled = (currentPage >= totalPages);

      const start = (currentPage - 1) * PAGE_SIZE;
      const paged = filtered.slice(start, start + PAGE_SIZE);

      render(paged, appliedSet);
    }

    function render(jobs, appliedSet) {
      const container = document.getElementById('jobContainer');
      if (!jobs.length) {
        container.innerHTML = '<div style="text-align:center;padding:50px;color:#94a3b8;font-size:16px;">No jobs found matching your filters.</div>';
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
console.log('Successfully generated massive Jobs/index.html with', backendJobs.length, 'Backend jobs and', cyberJobs.length, 'Cybersecurity jobs!');
