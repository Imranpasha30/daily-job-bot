/**
 * Imran Pasha — Job Pool Categorization & Multi-Source Apply Manager
 * Organizes jobs into dedicated pools:
 * - data/jobs_backend.json (All Backend Python & Node.js jobs)
 * - data/jobs_cyber.json   (All Cyber Security, SOC, Pentest, IITR jobs)
 * - data/jobs_dubai.json   (All Dubai Internet City directory jobs)
 * - data/jobs_all.json     (Unified deduplicated pool)
 *
 * Provides selective apply filtering (Apply only LinkedIn, only Naukri, only Cyber, or all at once).
 */

const fs = require('fs');
const path = require('path');
const { filterUnappliedJobs, isJobApplied } = require('./applied_tracker');

const BASE_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(BASE_DIR, 'data');
const SCRAPED_FILE = path.join(BASE_DIR, 'scraped_jobs.json');
const DIC_FILE = path.join(BASE_DIR, 'dic_jobs.json');

const POOL_FILES = {
  backend: path.join(DATA_DIR, 'jobs_backend.json'),
  cyber: path.join(DATA_DIR, 'jobs_cyber.json'),
  dubai: path.join(DATA_DIR, 'jobs_dubai.json'),
  all: path.join(DATA_DIR, 'jobs_all.json')
};

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonFile(filePath, fallback = []) {
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.error(`Error reading ${filePath}:`, e.message);
    }
  }
  return fallback;
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`Error writing ${filePath}:`, e.message);
  }
}

/**
 * Strict Resume Matcher for Candidate Imran Pasha:
 * - Backend Python -> Imran-Pasha-Backend-Python.pdf (or Imran-Pasha-Backend-Python-Dubai.pdf)
 * - Backend Node   -> Imran-Pasha-Backend-NodeJS.pdf (or Imran-Pasha-Backend-NodeJS-Dubai.pdf)
 * - Cybersecurity  -> Imran-Pasha-Penetration-Tester.pdf (or Imran-Pasha-Cyber-Security-Dubai.pdf)
 * Never allow cross-assignment between roles.
 */
function assignStrictResume(job) {
  const isDubai = job.region === 'dubai' || (job.location || '').toLowerCase().includes('dubai');
  const cat = (job.category || '').toLowerCase();
  const title = (job.title || '').toLowerCase();

  const isCyber = cat.includes('cyber') || /\b(security|soc|penetration|pentest|vapt|infosec|cyber|appsec|incident|threat|malware|defense|ot\s*security)\b/i.test(title);
  const isNode = cat.includes('node') || /\b(node|nodejs|express|typescript|nest|nestjs)\b/i.test(title);

  if (isCyber) {
    job.category = 'cyber';
    job.resume = isDubai ? 'Imran-Pasha-Cyber-Security-Dubai.pdf' : 'Imran-Pasha-Penetration-Tester.pdf';
  } else if (isNode) {
    job.category = 'backend-node';
    job.resume = isDubai ? 'Imran-Pasha-Backend-NodeJS-Dubai.pdf' : 'Imran-Pasha-Backend-NodeJS.pdf';
  } else {
    job.category = 'backend-python';
    job.resume = isDubai ? 'Imran-Pasha-Backend-Python-Dubai.pdf' : 'Imran-Pasha-Backend-Python.pdf';
  }
  return job;
}

/**
 * Synchronize and separate all scraped and directory jobs into dedicated pools
 */
function syncJobPools() {
  const scrapedJobs = readJsonFile(SCRAPED_FILE, []);
  const rawDubaiJobs = readJsonFile(DIC_FILE, []);

  const backendPool = [];
  const cyberPool = [];
  const dubaiPool = [];
  const seenIds = new Set();

  // Normalize dubai jobs
  rawDubaiJobs.forEach(raw => {
    const job = { ...raw };
    if (!job.resume) assignStrictResume(job);
    dubaiPool.push(job);
  });

  const allJobs = [...scrapedJobs, ...dubaiPool];

  allJobs.forEach(rawJob => {
    const id = rawJob.id || rawJob.url;
    if (!id || seenIds.has(id)) return;
    seenIds.add(id);

    const job = { ...rawJob };
    if (!job.resume) {
      assignStrictResume(job);
    }

    const isCyber = job.category === 'cyber' || /\b(security|soc|penetration|pentest|vapt|infosec|cyber|appsec)\b/i.test(job.title || '');

    if (isCyber) {
      cyberPool.push(job);
    } else {
      backendPool.push(job);
    }
  });

  writeJsonFile(POOL_FILES.backend, backendPool);
  writeJsonFile(POOL_FILES.cyber, cyberPool);
  writeJsonFile(POOL_FILES.dubai, dubaiPool);
  writeJsonFile(POOL_FILES.all, allJobs);

  return {
    total: allJobs.length,
    backendCount: backendPool.length,
    cyberCount: cyberPool.length,
    dubaiCount: dubaiPool.length,
    files: {
      backend: 'data/jobs_backend.json',
      cyber: 'data/jobs_cyber.json',
      dubai: 'data/jobs_dubai.json'
    }
  };
}

/**
 * Retrieve jobs from a specific pool
 */
function getPoolJobs(poolName = 'all') {
  const target = POOL_FILES[poolName] || POOL_FILES.all;
  return readJsonFile(target, []);
}

/**
 * Select jobs by specific source, category, and ATS platform
 * Options:
 * - source: 'all' | 'linkedin' | 'naukri' | 'scraped' | 'boards' | 'dubai'
 * - category: 'all' | 'backend' | 'cyber'
 * - ats: 'all' | 'greenhouse' | 'ashby' | 'lever'
 * - limit: max number of jobs to return
 */
function selectJobsByScope({
  source = 'all',
  category = 'all',
  ats = 'all',
  limit = 1000,
  historyObj = null
} = {}) {
  syncJobPools();

  let jobs = [];
  const allJobs = getPoolJobs('all');

  // 1. Source Filter
  if (source === 'dubai') {
    jobs = getPoolJobs('dubai');
  } else if (source === 'scraped') {
    jobs = allJobs.filter(j => j.region !== 'dubai' && !j.id?.startsWith('dic_'));
  } else if (source === 'linkedin') {
    jobs = allJobs.filter(j => (j.platform || j.ats || '').toLowerCase() === 'linkedin');
  } else if (source === 'naukri') {
    jobs = allJobs.filter(j => (j.platform || j.ats || '').toLowerCase() === 'naukri');
  } else if (source === 'boards') {
    jobs = allJobs.filter(j => (j.platform || j.ats || '').toLowerCase() === 'boards' || /greenhouse|ashby|lever/i.test(j.url || ''));
  } else {
    jobs = allJobs;
  }

  // 2. Category Filter
  if (category === 'backend') {
    jobs = jobs.filter(j => j.category !== 'cyber' && !/\b(security|soc|penetration|vapt|infosec|cyber)\b/i.test(j.title || ''));
  } else if (category === 'cyber') {
    jobs = jobs.filter(j => j.category === 'cyber' || /\b(security|soc|penetration|vapt|infosec|cyber)\b/i.test(j.title || ''));
  }

  // 3. Ensure Strict Resume is set for all
  jobs = jobs.map(j => {
    if (!j.resume) return assignStrictResume({ ...j });
    return j;
  });

  // 4. ATS Filter
  if (ats !== 'all') {
    jobs = jobs.filter(j => {
      const u = (j.url || '').toLowerCase();
      if (ats === 'greenhouse') return u.includes('greenhouse.io');
      if (ats === 'ashby') return u.includes('ashbyhq.com');
      if (ats === 'lever') return u.includes('lever.co');
      return true;
    });
  }

  // 5. Strict Anti-Revolving Deduplication
  const unapplied = filterUnappliedJobs(jobs, historyObj);

  return unapplied.slice(0, parseInt(limit, 10) || 1000);
}

module.exports = {
  syncJobPools,
  getPoolJobs,
  selectJobsByScope,
  POOL_FILES
};
