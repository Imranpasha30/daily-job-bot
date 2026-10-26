// Imran Pasha Candidate Profile & Rules
const path = require('path');
const fs = require('fs');

const RESUMES = {
  python: path.resolve(__dirname, '..', 'resumes', 'Imran-Pasha-Backend-Python.pdf'),
  node: path.resolve(__dirname, '..', 'resumes', 'Imran-Pasha-Backend-NodeJS.pdf'),
  pentest: path.resolve(__dirname, '..', 'resumes', 'Imran-Pasha-Penetration-Tester.pdf'),
  cyberDubai: path.resolve(__dirname, '..', 'resumes', 'Imran-Pasha-Cyber-Security-Dubai.pdf'),
  pythonDubai: path.resolve(__dirname, '..', 'resumes', 'Imran-Pasha-Backend-Python-Dubai.pdf'),
  nodeDubai: path.resolve(__dirname, '..', 'resumes', 'Imran-Pasha-Backend-NodeJS-Dubai.pdf'),
};

const SETTINGS_FILE = path.resolve(__dirname, 'settings.json');

function loadSettings() {
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    } catch (e) {}
  }
  return { noticePeriod: '30 days', noticeDays: 30 };
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {}
}

const currentSettings = loadSettings();

const PROFILE = {
  first: 'Imran',
  last: 'Pasha',
  full: 'Imran Pasha',
  email: 'imranpasha.ahmed@gmail.com',
  phone: '9844548537',
  phoneWithCode: '+91 98445 48537',
  phoneDigits: '9844548537',
  countryCode: '+91',
  countryName: 'India',
  linkedin: 'https://linkedin.com/in/imran-pasha-019b2b213',
  github: 'https://github.com/Imranpasha30',
  portfolio: 'https://imranportfolio.duckdns.org',
  addr1: 'Hassan, Karnataka',
  city: 'Hassan',
  state: 'Karnataka',
  zip: '573201',
  country: 'India',
  currentLocation: 'Hassan, Karnataka, India',
  currentCompany: 'Sharkify Private Limited',
  currentTitle: 'Backend Engineer',
  years: '2',
  notice: currentSettings.noticePeriod || '30 days',
  noticeDays: String(currentSettings.noticeDays || 30),
  noticePeriod: currentSettings.noticePeriod || '30 days',
  ctcCurrent: '5.54 LPA',
  ctcCurrentNum: '5.54',
  ctcExpected: '15 LPA',
  ctcExpectedNum: '15',
  school: 'Sahyadri College of Engineering (VTU)',
  degree: "Bachelor's Degree",
  discipline: 'Computer Science',
  gradYear: '2024',
  startYear: '2020',
  heard: 'LinkedIn',
  gender: 'Male',
  pronouns: 'He/Him',
  authorizedInIndia: 'Yes',
  requireSponsorship: 'No',
  willingToRelocate: 'Yes',
  certifications: 'Executive Post Graduate Certification in Cyber Security & Ethical Hacking - IIT Roorkee'
};

function getNoticePeriod() {
  return PROFILE.noticePeriod || PROFILE.notice || '30 days';
}

function setNoticePeriod(newNotice) {
  let days = 30;
  const num = parseInt(newNotice, 10);
  if (!isNaN(num)) {
    days = num;
  } else if (/immediate|0\s*day/i.test(newNotice)) {
    days = 0;
  }

  const cleanStr = String(newNotice).trim();
  PROFILE.notice = cleanStr;
  PROFILE.noticePeriod = cleanStr;
  PROFILE.noticeDays = String(days);

  const s = loadSettings();
  s.noticePeriod = cleanStr;
  s.noticeDays = days;
  saveSettings(s);

  return { noticePeriod: cleanStr, noticeDays: days };
}

/**
 * Strictly selects the exact matching resume based on role and location.
 * - Cyber Security roles MUST get a Cyber Security / Pentest resume (NEVER Backend).
 * - Python Backend roles MUST get a Python resume (NEVER Node or Cyber).
 * - Node.js Backend roles MUST get a Node resume (NEVER Python or Cyber).
 */
function selectResume(job) {
  const t = (job.title || '').toLowerCase();
  const desc = (job.snippet || job.full || '').toLowerCase();
  const cat = (job.category || '').toLowerCase();
  const region = (job.region || '').toLowerCase();
  const loc = (job.location || '').toLowerCase();
  const hay = `${t} ${desc} ${loc}`;

  const isDubai = region === 'dubai' || job.inDubai || /\b(dubai|uae|abu dhabi|sharjah)\b/i.test(hay);

  // 1. CYBERSECURITY ROLES (SOC, Pentest, InfoSec, Ethical Hacking, AppSec)
  const isCyberRole = cat === 'cyber' || /\b(security|soc|penetration|pentest|vapt|infosec|cyber|appsec|red team|blue team|ethical hack|threat|incident)\b/i.test(t);

  if (isCyberRole) {
    if (isDubai) {
      return RESUMES.cyberDubai;
    }
    return RESUMES.pentest;
  }

  // 2. BACKEND ROLES (Strict Python vs Node.js Separation)
  const pythonMatches = (hay.match(/\b(python|fastapi|django|flask|celery|pytorch|pandas)\b/gi) || []).length;
  const nodeMatches = (hay.match(/\b(node|nodejs|express|typescript|nest|nestjs|javascript|mern)\b/gi) || []).length;

  const isExplicitPython = cat === 'backend-python' || /\b(python|fastapi|django)\b/i.test(t);
  const isExplicitNode = cat === 'backend-node' || /\b(node|express|typescript|nestjs)\b/i.test(t);

  if (isExplicitPython || (pythonMatches > nodeMatches && !isExplicitNode)) {
    return isDubai ? RESUMES.pythonDubai : RESUMES.python;
  }

  if (isExplicitNode || (nodeMatches > pythonMatches && !isExplicitPython)) {
    return isDubai ? RESUMES.nodeDubai : RESUMES.node;
  }

  // Default Backend fallback based on candidate flagship stack (FastAPI / Python)
  return isDubai ? RESUMES.pythonDubai : RESUMES.python;
}

function generateCoverLetter(job) {
  const co = job.company || 'your team';
  const role = job.title || 'Backend Engineer';
  const isCyber = job.category === 'cyber' || /\b(security|soc|penetration|vapt|infosec|cyber)\b/i.test(role);
  const currentNotice = getNoticePeriod();
  const noticePhrase = /immediate|0\s*day/i.test(currentNotice)
    ? 'I am available to join immediately'
    : `I hold a ${currentNotice} notice period (with option to negotiate early release)`;

  if (isCyber) {
    return `Dear Hiring Team at ${co},

I am writing to express my strong interest in the ${role} position. With an Executive Post Graduate Certification in Cyber Security & Ethical Hacking from IIT Roorkee and hands-on experience securing production backend architectures, I bring a proactive, defense-in-depth mindset to your engineering team.

My technical background bridges application development and offensive/defensive security. I have conducted adversarial security reviews across REST and WebSocket APIs, identifying and mitigating OWASP Top 10 vulnerabilities including Broken Object Level Authorization (BOLA/IDOR), Server-Side Request Forgery (SSRF), and authentication flaws. In addition, I have hands-on experience with SIEM monitoring (Splunk), network traffic analysis (Wireshark), vulnerability assessment (Nessus, Burp Suite), and Linux system auditing.

${noticePhrase}, am open to relocation across Bangalore, Hyderabad, Dubai/UAE, and Remote positions, and would welcome the opportunity to discuss how my technical foundation can contribute to ${co}'s security posture.

Sincerely,
Imran Pasha
+91 98445 48537 | imranpasha.ahmed@gmail.com
https://linkedin.com/in/imran-pasha-019b2b213 | https://github.com/Imranpasha30`;
  }

  return `Dear Hiring Team at ${co},

I am writing to apply for the ${role} opportunity at ${co}. As a Backend Engineer with nearly two years of production experience architecting high-throughput REST and WebSocket services in Python (FastAPI) and Node.js (Express), I am excited by the prospect of contributing to your scalable systems.

At Sharkify, I was the founding backend engineer for Kaizer X, an AI video production platform. I architected and maintained 765 API routes across 150 PostgreSQL tables, implementing PostgreSQL FOR UPDATE SKIP LOCKED job queues with Redis Streams consumer groups for resilient task processing. By redesigning queries with composite indexing and pgBouncer connection pooling, I reduced p95 latency from 12 seconds to 141ms under peak load across a 9.9M-row dataset. Additionally, I hold an Executive PG in Cyber Security from IIT Roorkee, ensuring every API endpoint is built with strict OWASP validation, idempotent processing, and zero-trust security.

${noticePhrase}, based in Hassan, Karnataka, India, and fully open to remote, hybrid, or on-site roles (including Dubai/UAE). Thank you for your consideration, and I look forward to speaking with your team.

Sincerely,
Imran Pasha
+91 98445 48537 | imranpasha.ahmed@gmail.com
https://linkedin.com/in/imran-pasha-019b2b213 | https://github.com/Imranpasha30`;
}

module.exports = {
  PROFILE,
  RESUMES,
  selectResume,
  generateCoverLetter,
  getNoticePeriod,
  setNoticePeriod
};
