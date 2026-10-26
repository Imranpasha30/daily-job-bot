// Imran Pasha Candidate Profile & Rules
const path = require('path');

const RESUMES = {
  python: path.resolve(__dirname, '..', 'resumes', 'Imran-Pasha-Backend-Python.pdf'),
  node: path.resolve(__dirname, '..', 'resumes', 'Imran-Pasha-Backend-NodeJS.pdf'),
  cyberDubai: path.resolve(__dirname, '..', 'resumes', 'Imran-Pasha-Cyber-Security-Dubai.pdf'),
  pentest: path.resolve(__dirname, '..', 'resumes', 'Imran-Pasha-Penetration-Tester.pdf'),
};

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
  notice: '30 days',
  noticeDays: '30',
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

function selectResume(job) {
  const t = (job.title || '').toLowerCase();
  const desc = (job.snippet || job.full || '').toLowerCase();
  const hay = `${t} ${desc}`;

  if (job.category === 'cyber' || /\b(security|soc|penetration|vapt|infosec|cyber)\b/i.test(t)) {
    if (job.inDubai || /\b(dubai|uae|abu dhabi)\b/i.test(hay)) {
      return RESUMES.cyberDubai;
    }
    if (/\b(penetration|vapt|appsec|red team|offensive)\b/i.test(hay)) {
      return RESUMES.pentest;
    }
    return RESUMES.cyberDubai;
  }

  // Backend
  const isPython = /\b(python|fastapi|django|flask)\b/i.test(hay);
  const isNode = /\b(node|express|typescript)\b/i.test(hay);

  if (isPython && !isNode) return RESUMES.python;
  if (isNode && !isPython) return RESUMES.node;
  return RESUMES.python; // Default
}

function generateCoverLetter(job) {
  const co = job.company || 'your team';
  const role = job.title || 'Backend Engineer';
  const isCyber = job.category === 'cyber' || /\b(security|soc|penetration|vapt|infosec)\b/i.test(role);

  if (isCyber) {
    return `Dear Hiring Team at ${co},

I am writing to express my strong interest in the ${role} position. With an Executive Post Graduate Certification in Cyber Security & Ethical Hacking from IIT Roorkee and hands-on experience securing production backend architectures, I bring a proactive, defense-in-depth mindset to your engineering team.

My technical background bridges application development and offensive/defensive security. I have conducted adversarial security reviews across REST and WebSocket APIs, identifying and mitigating OWASP Top 10 vulnerabilities including Broken Object Level Authorization (BOLA/IDOR), Server-Side Request Forgery (SSRF), and authentication flaws. In addition, I have hands-on experience with SIEM monitoring (Splunk), network traffic analysis (Wireshark), vulnerability assessment (Nessus, Burp Suite), and Linux system auditing.

I hold a 30-day notice period, am open to immediate relocation or remote work, and would welcome the opportunity to discuss how my technical foundation can contribute to ${co}'s security posture.

Sincerely,
Imran Pasha
+91 98445 48537 | imranpasha.ahmed@gmail.com
https://linkedin.com/in/imran-pasha-019b2b213 | https://github.com/Imranpasha30`;
  }

  return `Dear Hiring Team at ${co},

I am writing to apply for the ${role} opportunity at ${co}. As a Backend Engineer with nearly two years of production experience architecting high-throughput REST and WebSocket services in Python (FastAPI) and Node.js (Express), I am excited by the prospect of contributing to your scalable systems.

At Sharkify, I was the founding backend engineer for Kaizer X, an AI video production platform. I architected and maintained 765 API routes across 150 PostgreSQL tables, implementing PostgreSQL FOR UPDATE SKIP LOCKED job queues with Redis Streams consumer groups for resilient task processing. By redesigning queries with composite indexing and pgBouncer connection pooling, I reduced p95 latency from 12 seconds to 141ms under peak load across a 9.9M-row dataset. Additionally, I hold an Executive PG in Cyber Security from IIT Roorkee, ensuring every API endpoint is built with strict OWASP validation, idempotent processing, and zero-trust security.

I am available on a 30-day notice period (with flexibility for early release), based in India, and fully open to remote, hybrid, or on-site roles. Thank you for your consideration, and I look forward to speaking with your team.

Sincerely,
Imran Pasha
+91 98445 48537 | imranpasha.ahmed@gmail.com
https://linkedin.com/in/imran-pasha-019b2b213 | https://github.com/Imranpasha30`;
}

module.exports = {
  PROFILE,
  RESUMES,
  selectResume,
  generateCoverLetter
};
