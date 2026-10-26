/**
 * Imran Pasha — Autonomous AI Job Apply Agent
 * High-Performance RTX 5060 Accelerated Parallel Server & Command Center
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { ParallelApplyPool } = require('./agent/parallel_worker');
const { launchAuthSession, closeAuthSession, isAuthSessionActive, checkAuthStatus, syncFromActiveChrome } = require('./agent/auth_session');
const { runJobScraper, getScrapedJobs, mergeScrapedJobsIntoIndexHtml } = require('./agent/scrapers/job_scraper');
const { scrapeDicCommunity, getDicCompanies, getDicJobs } = require('./agent/scrapers/dic_scraper');
const { loadHistory, saveHistory, isJobApplied, filterUnappliedJobs } = require('./agent/applied_tracker');
const { getNoticePeriod, setNoticePeriod, PROFILE } = require('./agent/profile');
const { syncJobPools, getPoolJobs, selectJobsByScope } = require('./agent/job_pool_manager');
const { execSync } = require('child_process');

const getHistory = loadHistory;

const app = express();
const PORT = process.env.PORT || 4000;

// Directories
const BASE_DIR = __dirname;
const PUBLIC_DIR = path.join(BASE_DIR, 'public');
const RESUMES_DIR = path.join(BASE_DIR, 'resumes');
const SCREENSHOTS_DIR = path.join(BASE_DIR, 'screenshots');
const HISTORY_FILE = path.join(BASE_DIR, 'applied_history.json');
const INDEX_HTML = path.join(BASE_DIR, 'index.html');

if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

app.use(express.json());
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'dashboard.html'));
});
app.use(express.static(PUBLIC_DIR));
app.use('/screenshots', express.static(SCREENSHOTS_DIR));
app.use('/resumes', express.static(RESUMES_DIR));

// Runner Global State
let agentState = 'IDLE'; // IDLE, RUNNING, PAUSED, COMPLETED
let activePool = null;

let stats = {
  target: 1000,
  successful: 0,
  failed: 0,
  skipped: 0,
  claudeAnswers: 0,
  speed: 0,
  eta: '--',
  concurrency: 5
};

let workers = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  state: 'IDLE',
  currentJob: null,
  step: 'Standby',
  appliedCount: 0
}));

let sseClients = [];
const logBuffer = [];

// Helper: Broadcast SSE Event
function broadcast(type, payload) {
  const msg = `data: ${JSON.stringify({ type, payload })}\n\n`;
  sseClients.forEach(res => {
    try { res.write(msg); } catch (e) {}
  });
}

function addLog(text) {
  const log = { time: new Date().toLocaleTimeString(), text };
  logBuffer.push(log);
  if (logBuffer.length > 350) logBuffer.shift();
  broadcast('LOG', log);
}

// ---------------------------------------------------------
// Candidate Settings & Dynamic Notice Period Endpoints
// ---------------------------------------------------------
app.get('/api/settings', (req, res) => {
  res.json({
    noticePeriod: getNoticePeriod(),
    noticeDays: PROFILE.noticeDays || 30,
    currentLocation: PROFILE.currentLocation || 'Hassan, Karnataka, India',
    candidate: PROFILE.full
  });
});

app.post('/api/settings/notice-period', (req, res) => {
  const { noticePeriod } = req.body;
  if (!noticePeriod) {
    return res.status(400).json({ error: 'Missing noticePeriod parameter' });
  }
  const result = setNoticePeriod(noticePeriod);
  addLog(`⏱️ [Candidate Config] Notice period updated to: "${result.noticePeriod}" (${result.noticeDays} days)`);
  broadcast('SETTINGS_UPDATE', result);
  res.json(result);
});

// Load jobs from index.html and scraped_jobs.json
function loadAllJobs() {
  let backend = [];
  let cyber = [];

  if (fs.existsSync(INDEX_HTML)) {
    try {
      const html = fs.readFileSync(INDEX_HTML, 'utf8');
      const bMatch = html.match(/const ALL_BACKEND = (\[.*?\]);/s);
      const cMatch = html.match(/const ALL_CYBER = (\[.*?\]);/s);
      if (bMatch) backend = JSON.parse(bMatch[1]);
      if (cMatch) cyber = JSON.parse(cMatch[1]);
    } catch (e) {}
  }

  backend.forEach(j => { j.category = 'backend'; });
  cyber.forEach(j => { j.category = 'cyber'; });

  // Merge in fresh verified scraped jobs from scraped_jobs.json
  const scrapedFile = path.join(BASE_DIR, 'scraped_jobs.json');
  if (fs.existsSync(scrapedFile)) {
    try {
      const scraped = JSON.parse(fs.readFileSync(scrapedFile, 'utf8'));
      const existingUrls = new Set([...backend, ...cyber].map(j => (j.url || '').toLowerCase().trim()));
      scraped.forEach(s => {
        const u = (s.url || '').toLowerCase().trim();
        if (u && !existingUrls.has(u)) {
          existingUrls.add(u);
          if (s.category === 'cyber') cyber.push(s);
          else backend.push(s);
        }
      });
    } catch (e) {}
  }

  return [...backend, ...cyber];
}

// SSE Stream Endpoint
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);

  const history = getHistory();
  res.write(`data: ${JSON.stringify({
    type: 'STATUS',
    payload: { state: agentState, stats, workers, history: history.applied }
  })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c !== res);
  });
});

// REST Status Endpoint
app.get('/api/status', (req, res) => {
  const history = getHistory();
  res.json({
    state: agentState,
    stats,
    workers,
    history: history.applied
  });
});

// Start Parallel Campaign
app.post('/api/start', async (req, res) => {
  if (agentState === 'RUNNING') {
    return res.status(400).json({ error: 'Agent is already running' });
  }

  const {
    limit = 1000,
    category = 'all',
    source = 'all',
    ats = 'all',
    concurrency = 5,
    headless = true
  } = req.body;

  const history = getHistory();
  let targetJobs = [];

  if (source === 'all') {
    const poolJobs = selectJobsByScope({ source: 'all', category, ats, limit: 500, historyObj: history });
    let dbJobs = loadAllJobs();
    if (category === 'backend') dbJobs = dbJobs.filter(j => j.category === 'backend');
    if (category === 'cyber') dbJobs = dbJobs.filter(j => j.category === 'cyber');
    if (ats !== 'all') {
      dbJobs = dbJobs.filter(j => {
        const u = (j.url || '').toLowerCase();
        if (ats === 'greenhouse') return u.includes('greenhouse.io');
        if (ats === 'ashby') return u.includes('ashbyhq.com');
        if (ats === 'lever') return u.includes('lever.co');
        return true;
      });
    }
    const unappliedDb = filterUnappliedJobs(dbJobs, history);
    const seen = new Set();
    [...poolJobs, ...unappliedDb].forEach(j => {
      const id = j.id || j.url;
      if (!seen.has(id)) {
        seen.add(id);
        targetJobs.push(j);
      }
    });
  } else {
    targetJobs = selectJobsByScope({ source, category, ats, limit, historyObj: history });
  }

  if (targetJobs.length === 0) {
    return res.status(400).json({ error: `No unapplied jobs found for Scope: ${source.toUpperCase()}, Role: ${category.toUpperCase()}. Run Scraper first or choose another scope.` });
  }

  const currentSuccessful = Object.values(history.applied).filter(a => a.status === 'APPLIED').length;

  agentState = 'RUNNING';
  stats.target = Math.min(limit, targetJobs.length);
  stats.successful = currentSuccessful;
  stats.concurrency = concurrency;

  // Re-initialize worker slots
  workers = Array.from({ length: concurrency }, (_, i) => ({
    id: i + 1,
    state: 'IDLE',
    currentJob: null,
    step: 'Starting...',
    appliedCount: 0
  }));

  addLog(`🚀 [Campaign Initiated] Scope: ${source.toUpperCase()} | Role: ${category.toUpperCase()} | Queue: ${targetJobs.length} eligible jobs | Concurrency: ${concurrency}x`);
  res.json({ status: 'started', settings: { limit: stats.target, category, source, ats, concurrency, headless, queueLength: targetJobs.length } });

  activePool = new ParallelApplyPool({
    concurrency: parseInt(concurrency, 10) || 5,
    headless: headless !== undefined ? headless : true,
    limit: stats.target,
    jobs: targetJobs,
    history: history,
    screenshotsDir: SCREENSHOTS_DIR,
    onWorkerUpdate: (worker) => {
      const idx = worker.id - 1;
      if (workers[idx]) {
        workers[idx] = { ...worker };
      }
      broadcast('WORKER_UPDATE', worker);
    },
    onJobComplete: (record) => {
      saveHistory(history);
      broadcast('JOB_DONE', record);
      broadcast('STATUS', { state: agentState, stats, workers });
    },
    onLog: (text) => {
      addLog(text);
    },
    onStatsUpdate: (updatedStats) => {
      Object.assign(stats, updatedStats);
      broadcast('STATS_UPDATE', stats);
    }
  });

  // Run asynchronously
  activePool.start().then(() => {
    agentState = 'COMPLETED';
    addLog('🎉 Campaign completed! Target reached.');
    broadcast('STATUS', { state: agentState, stats, workers });
  }).catch((err) => {
    agentState = 'ERROR';
    addLog(`❌ Pool error: ${err.message}`);
    broadcast('STATUS', { state: agentState, stats, workers });
  });
});

app.post('/api/pause', (req, res) => {
  if (activePool) {
    const isPaused = activePool.pause();
    agentState = isPaused ? 'PAUSED' : 'RUNNING';
    addLog(isPaused ? '⏸ Campaign PAUSED across all workers' : '▶ Campaign RESUMED');
    broadcast('STATUS', { state: agentState, stats, workers });
    res.json({ state: agentState });
  } else {
    res.status(400).json({ error: 'No active pool to pause' });
  }
});

app.post('/api/stop', async (req, res) => {
  isAutopilotRunning = false;
  if (autopilotTimer) {
    clearInterval(autopilotTimer);
    autopilotTimer = null;
  }
  if (activePool) {
    await activePool.stop();
    activePool = null;
  }
  agentState = 'STOPPED';
  workers.forEach(w => { w.state = 'IDLE'; w.step = 'Stopped'; });
  addLog('⏹ Campaign STOPPED by user');
  broadcast('STATUS', { state: agentState, stats, workers });
  res.json({ state: agentState });
});

// CSV Export Endpoint
app.get('/api/export-csv', (req, res) => {
  const history = getHistory();
  const rows = [
    ['Company', 'Title', 'ATS', 'Resume Used', 'Status', 'Date Applied', 'URL']
  ];

  Object.values(history.applied).forEach(app => {
    rows.push([
      `"${(app.company || '').replace(/"/g, '""')}"`,
      `"${(app.title || '').replace(/"/g, '""')}"`,
      `"${app.ats || ''}"`,
      `"${app.resume || ''}"`,
      `"${app.status || ''}"`,
      `"${app.date || ''}"`,
      `"${app.url || ''}"`
    ]);
  });

  const csv = rows.map(r => r.join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="imran_pasha_applications.csv"');
  res.send(csv);
});

// ======================================================================
// 🕷️ AUTONOMOUS JOB SCRAPER & SAFE PLATFORM AUTHENTICATION ENDPOINTS
// ======================================================================

let isScraperRunning = false;

// 1. Check Platform Authentication Status (LinkedIn & Naukri)
app.get('/api/auth-status', (req, res) => {
  const status = checkAuthStatus();
  res.json(status);
});

// 1b. Sync Session Directly From Active Chrome Profile
app.post('/api/auth-session/sync', (req, res) => {
  const result = syncFromActiveChrome();
  if (result.success) {
    addLog('🔄 [Session Synced] Active Google Chrome profile session (LinkedIn & Naukri cookies) imported into bot storage!');
    broadcast('AUTH_UPDATE', { browserActive: false, status: 'synced', sessionReady: true });
  } else {
    addLog(`⚠️ Session sync note: ${result.message}`);
  }
  res.json(result);
});

// 1c. Get Detailed Synced Session Proof
app.get('/api/auth-details', (req, res) => {
  try {
    const scriptPath = path.join(BASE_DIR, 'get_session_details.py');
    const out = execSync(`py "${scriptPath}"`, { encoding: 'utf8', timeout: 5000 });
    res.json(JSON.parse(out));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1d. Get Job Pools (Backend, Cyber, Dubai, All)
app.get('/api/job-pools', (req, res) => {
  const summary = syncJobPools();
  res.json(summary);
});

app.get('/api/job-pools/:pool', (req, res) => {
  const poolName = req.params.pool || 'all';
  const jobs = getPoolJobs(poolName);
  res.json({ pool: poolName, count: jobs.length, jobs });
});

// 2. Launch Visible Real Browser for Safe One-Time Login
app.post('/api/auth-session', async (req, res) => {
  try {
    addLog('🔐 Launching visible browser for LinkedIn & Naukri authentication...');
    const result = await launchAuthSession();
    addLog('👉 Browser opened! Please log into LinkedIn & Naukri. Your session is saved locally.');
    broadcast('AUTH_UPDATE', { browserActive: true, status: 'opened' });
    res.json({ success: true, message: 'Browser launched successfully', result });
  } catch (err) {
    addLog(`❌ Auth session error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// 3. Close Auth Browser Window
app.post('/api/auth-session/close', async (req, res) => {
  try {
    await closeAuthSession();
    addLog('🔒 Authenticated browser window closed. Safe profile session saved.');
    broadcast('AUTH_UPDATE', { browserActive: false, status: 'closed' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Trigger Autonomous Scraper
app.post('/api/scrape', async (req, res) => {
  if (isScraperRunning) {
    return res.status(400).json({ error: 'Job scraper is currently already running.' });
  }

  const {
    platform = 'all',
    timing = '24h',
    category = 'all',
    keywords = '',
    limit = 40
  } = req.body;

  isScraperRunning = true;
  addLog(`🕷️ [Scraper Initiated] Platform: ${platform.toUpperCase()} | Timing: ${timing.toUpperCase()} | Category: ${category.toUpperCase()}`);
  broadcast('SCRAPER_STATUS', { running: true, platform, timing });

  res.json({ status: 'started', settings: { platform, timing, category, keywords, limit } });

  // Execute asynchronously with live SSE telemetry
  runJobScraper({
    platform,
    timing,
    category,
    keywords,
    limit: parseInt(limit, 10) || 40,
    onLog: (msg) => {
      addLog(msg);
    }
  }).then((result) => {
    isScraperRunning = false;
    addLog(`🎉 [Scraper Done] Successfully added ${result.added} new jobs (Total database: ${result.total})`);
    broadcast('SCRAPER_STATUS', { running: false, result });
    broadcast('SCRAPER_DONE', result);
  }).catch((err) => {
    isScraperRunning = false;
    addLog(`❌ Scraper failed: ${err.message}`);
    broadcast('SCRAPER_STATUS', { running: false, error: err.message });
  });
});

// 5. Get All Scraped Jobs
app.get('/api/scraped-jobs', (req, res) => {
  const jobs = getScrapedJobs();
  res.json({ count: jobs.length, jobs });
});

// 6. Merge Scraped Jobs into index.html
app.post('/api/merge-scraped', (req, res) => {
  const mergeResult = mergeScrapedJobsIntoIndexHtml();
  if (mergeResult.added > 0) {
    addLog(`✨ Merged ${mergeResult.added} new scraped jobs into active database (Backend: +${mergeResult.backendAdded}, Cyber: +${mergeResult.cyberAdded})`);
    const allJobs = loadAllJobs();
    broadcast('DATABASE_UPDATED', { totalJobs: allJobs.length, added: mergeResult.added });
  } else {
    addLog('ℹ️ All scraped jobs are already merged or duplicate.');
  }
  res.json(mergeResult);
});

// ======================================================================
// 🎯 3 WORKFLOW MODES: ONLY SCRAPE, APPLY SCRAPED, AUTO-PILOT (BOTH)
// ======================================================================

let autopilotTimer = null;
let isAutopilotRunning = false;

// MODE 1: ONLY SCRAPE
app.post('/api/mode/scrape-only', async (req, res) => {
  if (isScraperRunning) {
    return res.status(400).json({ error: 'Job scraper is currently already running.' });
  }

  const {
    platform = 'all',
    timing = '24h',
    category = 'all',
    keywords = '',
    limit = 40
  } = req.body;

  isScraperRunning = true;
  addLog(`🕷️ [Mode 1: ONLY SCRAPE] Starting scan: ${platform.toUpperCase()} (${timing})...`);
  broadcast('SCRAPER_STATUS', { running: true, mode: 'scrape-only' });

  res.json({ mode: 'scrape-only', status: 'started' });

  runJobScraper({
    platform,
    timing,
    category,
    keywords,
    limit: parseInt(limit, 10) || 40,
    onLog: (msg) => addLog(msg)
  }).then((result) => {
    isScraperRunning = false;
    addLog(`🎉 [Mode 1: Only Scrape Completed] Saved ${result.added} new jobs. Ready for review or apply.`);
    broadcast('SCRAPER_STATUS', { running: false, result, mode: 'scrape-only' });
    broadcast('SCRAPER_DONE', result);
  }).catch((err) => {
    isScraperRunning = false;
    addLog(`❌ Scraper failed: ${err.message}`);
    broadcast('SCRAPER_STATUS', { running: false, error: err.message });
  });
});

// MODE 2: APPLY FROM SCRAPED DATA ONLY
app.post('/api/mode/apply-scraped', async (req, res) => {
  if (agentState === 'RUNNING') {
    return res.status(400).json({ error: 'Agent is already running. Please pause or stop first.' });
  }

  const {
    concurrency = 5,
    headless = true,
    source = 'scraped',
    category = 'all'
  } = req.body;

  const history = getHistory();

  // Strict Anti-Revolving: Filter for unapplied scoped jobs
  const unappliedScraped = selectJobsByScope({ source, category, limit: 1000, historyObj: history });

  if (unappliedScraped.length === 0) {
    addLog(`ℹ️ [Mode 2] No unapplied jobs found matching Scope: ${source.toUpperCase()}, Category: ${category.toUpperCase()}.`);
    return res.status(400).json({ error: `No unapplied jobs found matching Scope: ${source.toUpperCase()}, Category: ${category.toUpperCase()}. Run Scraper first.` });
  }

  agentState = 'RUNNING';
  stats.target = unappliedScraped.length;
  stats.concurrency = concurrency;

  workers = Array.from({ length: concurrency }, (_, i) => ({
    id: i + 1,
    state: 'IDLE',
    currentJob: null,
    step: 'Starting Scraped Apply...',
    appliedCount: 0
  }));

  addLog(`⚡ [Mode 2: Apply Scraped Jobs] Launching ${concurrency} parallel workers for ${unappliedScraped.length} scraped jobs!`);
  res.json({ mode: 'apply-scraped', status: 'started', jobCount: unappliedScraped.length });

  activePool = new ParallelApplyPool({
    concurrency: parseInt(concurrency, 10) || 5,
    headless: headless !== undefined ? headless : true,
    limit: unappliedScraped.length,
    jobs: unappliedScraped,
    history: history,
    screenshotsDir: SCREENSHOTS_DIR,
    onWorkerUpdate: (w) => {
      const idx = w.id - 1;
      if (workers[idx]) workers[idx] = { ...w };
      broadcast('WORKER_UPDATE', w);
    },
    onJobComplete: (record) => {
      saveHistory(history);
      broadcast('JOB_DONE', record);
      broadcast('STATUS', { state: agentState, stats, workers });
    },
    onLog: (text) => addLog(text),
    onStatsUpdate: (s) => {
      Object.assign(stats, s);
      broadcast('STATS_UPDATE', stats);
    }
  });

  activePool.start().then(() => {
    agentState = 'COMPLETED';
    addLog('🎉 [Mode 2 Complete] All scraped jobs processed!');
    broadcast('STATUS', { state: agentState, stats, workers });
  }).catch((err) => {
    agentState = 'ERROR';
    addLog(`❌ Pool error: ${err.message}`);
    broadcast('STATUS', { state: agentState, stats, workers });
  });
});

// MODE 3: AUTO-PILOT (SCRAPE & APPLY SIMULTANEOUSLY)
app.post('/api/mode/autopilot-start', async (req, res) => {
  if (agentState === 'RUNNING' || isAutopilotRunning) {
    return res.status(400).json({ error: 'Campaign or Auto-Pilot is already running.' });
  }

  const {
    platform = 'all',
    timing = '24h',
    category = 'all',
    keywords = '',
    concurrency = 5,
    headless = true,
    limit = 1000
  } = req.body;

  isAutopilotRunning = true;
  agentState = 'RUNNING';
  stats.target = limit;
  stats.concurrency = concurrency;

  addLog(`🚀 [Mode 3: AUTO-PILOT INITIATED] Running Scrape & Apply Simultaneously!`);
  addLog(`   Workers: ${concurrency}x Parallel | Scraper: Continuous 24h Feed`);

  let allJobs = loadAllJobs();
  const history = getHistory();

  workers = Array.from({ length: concurrency }, (_, i) => ({
    id: i + 1,
    state: 'IDLE',
    currentJob: null,
    step: 'Auto-Pilot Initializing...',
    appliedCount: 0
  }));

  res.json({ mode: 'autopilot', status: 'started' });

  // Initialize pool with isAutoPilot: true so workers wait for new jobs instead of exiting
  activePool = new ParallelApplyPool({
    concurrency: parseInt(concurrency, 10) || 5,
    headless: headless !== undefined ? headless : true,
    limit: limit,
    jobs: allJobs,
    history: history,
    isAutoPilot: true,
    screenshotsDir: SCREENSHOTS_DIR,
    onWorkerUpdate: (w) => {
      const idx = w.id - 1;
      if (workers[idx]) workers[idx] = { ...w };
      broadcast('WORKER_UPDATE', w);
    },
    onJobComplete: (record) => {
      saveHistory(history);
      broadcast('JOB_DONE', record);
      broadcast('STATUS', { state: agentState, stats, workers });
    },
    onLog: (text) => addLog(text),
    onStatsUpdate: (s) => {
      Object.assign(stats, s);
      broadcast('STATS_UPDATE', stats);
    }
  });

  // Start concurrent apply workers
  activePool.start().then(() => {
    if (!isAutopilotRunning) return;
    agentState = 'COMPLETED';
    isAutopilotRunning = false;
    if (autopilotTimer) clearInterval(autopilotTimer);
    addLog('🎉 Auto-Pilot Campaign reached target!');
    broadcast('STATUS', { state: agentState, stats, workers });
  }).catch((err) => {
    isAutopilotRunning = false;
    if (autopilotTimer) clearInterval(autopilotTimer);
    agentState = 'ERROR';
    addLog(`❌ Auto-Pilot error: ${err.message}`);
    broadcast('STATUS', { state: agentState, stats, workers });
  });

  // Start concurrent recurring scraper
  const runScrapeCycle = async () => {
    if (!isAutopilotRunning) return;
    try {
      addLog(`🕷️ [Auto-Pilot Scraper] Scanning for fresh jobs (${platform}, ${timing})...`);
      const scrapeResult = await runJobScraper({
        platform,
        timing,
        category,
        keywords,
        limit: 20,
        onLog: (msg) => addLog(msg)
      });
      if (scrapeResult && scrapeResult.newJobs && scrapeResult.newJobs.length > 0 && activePool) {
        activePool.addJobs(scrapeResult.newJobs);
      }
    } catch (e) {
      addLog(`⚠️ Auto-Pilot scrape cycle note: ${e.message}`);
    }
  };

  // Run initial scrape immediately
  setTimeout(runScrapeCycle, 1500);

  // Repeat scrape cycle every 75 seconds
  autopilotTimer = setInterval(runScrapeCycle, 75000);
});

// Stop Auto-Pilot
app.post('/api/mode/autopilot-stop', async (req, res) => {
  isAutopilotRunning = false;
  if (autopilotTimer) {
    clearInterval(autopilotTimer);
    autopilotTimer = null;
  }
  if (activePool) {
    await activePool.stop();
    activePool = null;
  }
  agentState = 'STOPPED';
  workers.forEach(w => { w.state = 'IDLE'; w.step = 'Stopped'; });
  addLog('⏹ [Auto-Pilot STOPPED] Both Scraper & Apply workers stopped.');
  broadcast('STATUS', { state: agentState, stats, workers });
  res.json({ status: 'stopped' });
});

// ======================================================================
// 🇦🇪 DUBAI INTERNET CITY (DIC) DIRECTORY & CAREER ENGINE ENDPOINTS
// ======================================================================

let isDicScraperRunning = false;

// 1. Get DIC Companies List
app.get('/api/dic/companies', (req, res) => {
  const companies = getDicCompanies();
  res.json({ count: companies.length, companies });
});

// 2. Get DIC Jobs List
app.get('/api/dic/jobs', (req, res) => {
  const jobs = getDicJobs();
  res.json({ count: jobs.length, jobs });
});

// 3. Trigger Scrape of Dubai Internet City Directory
app.post('/api/dic/scrape', async (req, res) => {
  if (isDicScraperRunning) {
    return res.status(400).json({ error: 'DIC Scraper is already running' });
  }

  const { maxCompanies = 100, fetchAll = false } = req.body;
  isDicScraperRunning = true;
  addLog(`🇦🇪 [DIC Scraper Initiated] Connecting to Dubai Internet City directory (dic.ae) for ${fetchAll ? 'ALL 3,675 companies' : maxCompanies + ' companies'}...`);
  broadcast('DIC_SCRAPER_STATUS', { running: true, fetchAll });

  res.json({ status: 'started', maxCompanies, fetchAll });

  scrapeDicCommunity({
    maxCompanies: parseInt(maxCompanies, 10) || 100,
    fetchAll: Boolean(fetchAll),
    onLog: (msg) => addLog(msg)
  }).then((result) => {
    isDicScraperRunning = false;
    addLog(`🎉 [DIC Scraper Done] Extracted ${result.companiesCount} Dubai tech companies & generated ${result.jobsCount} career applications across Python, Node.js, and Cyber!`);
    broadcast('DIC_SCRAPER_STATUS', { running: false, result });
    broadcast('DIC_SCRAPER_DONE', result);
  }).catch((err) => {
    isDicScraperRunning = false;
    addLog(`❌ DIC Scraper error: ${err.message}`);
    broadcast('DIC_SCRAPER_STATUS', { running: false, error: err.message });
  });
});

// 4. Auto-Apply to Dubai Tech Jobs
app.post('/api/dic/apply', async (req, res) => {
  if (agentState === 'RUNNING') {
    return res.status(400).json({ error: 'Another campaign is currently running. Please stop it first.' });
  }

  const { concurrency = 5, headless = true } = req.body;
  const dubaiJobs = getDicJobs();
  const history = getHistory();

  // Strict Anti-Revolving: Filter unapplied
  const unappliedDubai = filterUnappliedJobs(dubaiJobs, history);

  if (unappliedDubai.length === 0) {
    addLog('ℹ️ No unapplied Dubai jobs found. Scrape new companies from DIC directory first.');
    return res.status(400).json({ error: 'No unapplied Dubai jobs found. Scrape DIC directory first.' });
  }

  agentState = 'RUNNING';
  stats.target = unappliedDubai.length;
  stats.concurrency = concurrency;

  workers = Array.from({ length: concurrency }, (_, i) => ({
    id: i + 1,
    state: 'IDLE',
    currentJob: null,
    step: 'Starting Dubai Tech Apply...',
    appliedCount: 0
  }));

  addLog(`🇦🇪 [Dubai Campaign Launched] Auto-applying to ${unappliedDubai.length} Dubai Internet City tech jobs with role-matched resumes (Python, Node.js, and Cyber Security)!`);
  res.json({ status: 'started', jobCount: unappliedDubai.length });

  activePool = new ParallelApplyPool({
    concurrency: parseInt(concurrency, 10) || 5,
    headless: headless !== undefined ? headless : true,
    limit: unappliedDubai.length,
    jobs: unappliedDubai,
    history: history,
    screenshotsDir: SCREENSHOTS_DIR,
    onWorkerUpdate: (w) => {
      const idx = w.id - 1;
      if (workers[idx]) workers[idx] = { ...w };
      broadcast('WORKER_UPDATE', w);
    },
    onJobComplete: (record) => {
      saveHistory(history);
      broadcast('JOB_DONE', record);
      broadcast('STATUS', { state: agentState, stats, workers });
    },
    onLog: (text) => addLog(text),
    onStatsUpdate: (s) => {
      Object.assign(stats, s);
      broadcast('STATS_UPDATE', stats);
    }
  });

  activePool.start().then(() => {
    agentState = 'COMPLETED';
    addLog('🎉 [Dubai Campaign Completed] All Dubai Internet City jobs processed!');
    broadcast('STATUS', { state: agentState, stats, workers });
  }).catch((err) => {
    agentState = 'ERROR';
    addLog(`❌ Dubai pool error: ${err.message}`);
    broadcast('STATUS', { state: agentState, stats, workers });
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n======================================================================`);
  console.log(`🚀 RTX 5060 Accelerated Parallel Apply Dashboard: http://localhost:${PORT}`);
  console.log(`======================================================================\n`);
});
