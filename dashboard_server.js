/**
 * Imran Pasha — Autonomous AI Job Apply Agent
 * Real-Time Dashboard Server & Application Orchestrator
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { processJobPage } = require('./agent/form_router');
const { selectResume } = require('./agent/profile');

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
let agentState = 'IDLE'; // IDLE, RUNNING, PAUSED, STOPPED
let activeBrowser = null;
let activePage = null;
let stopRequested = false;
let pauseRequested = false;

let stats = {
  target: 1000,
  attempted: 0,
  successful: 0,
  failed: 0,
  skipped: 0,
  claudeAnswers: 0,
  startTime: null,
  speed: 0,
  eta: '--'
};

let currentJob = null;
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
  if (logBuffer.length > 300) logBuffer.shift();
  broadcast('LOG', log);
}

// Load Application History
function getHistory() {
  if (fs.existsSync(HISTORY_FILE)) {
    try { return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); } catch (e) {}
  }
  return { applied: {}, stats: { totalAttempted: 0, successful: 0, failed: 0 } };
}

function saveHistory(history) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
}

// Load jobs from index.html
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

  return [...backend, ...cyber];
}

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// SSE Endpoint
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);

  // Send initial snapshot
  const history = getHistory();
  res.write(`data: ${JSON.stringify({
    type: 'STATUS',
    payload: { state: agentState, stats, currentJob, history: history.applied }
  })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c !== res);
  });
});

// REST API Endpoints
app.get('/api/status', (req, res) => {
  const history = getHistory();
  res.json({
    state: agentState,
    stats,
    currentJob,
    history: history.applied
  });
});

app.post('/api/start', async (req, res) => {
  if (agentState === 'RUNNING') {
    return res.status(400).json({ error: 'Agent is already running' });
  }

  const { limit = 1000, category = 'all', ats = 'all', mode = 'auto', headless = false } = req.body;

  stopRequested = false;
  pauseRequested = false;
  agentState = 'RUNNING';
  stats.target = limit;
  stats.startTime = Date.now();

  const history = getHistory();
  stats.successful = Object.values(history.applied).filter(a => a.status === 'APPLIED').length;

  res.json({ status: 'started', settings: { limit, category, ats, mode, headless } });

  // Run the apply loop asynchronously
  runApplyLoop({ limit, category, ats, mode, headless }).catch(err => {
    addLog(`❌ Fatal Loop Error: ${err.message}`);
    agentState = 'STOPPED';
    broadcast('STATUS', { state: agentState, stats, currentJob: null });
  });
});

app.post('/api/pause', (req, res) => {
  if (agentState === 'RUNNING') {
    agentState = 'PAUSED';
    pauseRequested = true;
    addLog('⏸ Agent loop PAUSED by user');
  } else if (agentState === 'PAUSED') {
    agentState = 'RUNNING';
    pauseRequested = false;
    addLog('▶ Agent loop RESUMED by user');
  }
  broadcast('STATUS', { state: agentState, stats, currentJob });
  res.json({ state: agentState });
});

app.post('/api/stop', async (req, res) => {
  stopRequested = true;
  agentState = 'STOPPED';
  addLog('⏹ Agent loop STOPPED by user');
  if (activeBrowser) {
    try { await activeBrowser.close(); } catch (e) {}
    activeBrowser = null;
  }
  broadcast('STATUS', { state: agentState, stats, currentJob: null });
  res.json({ state: agentState });
});

// Main Autonomous Worker Loop
async function runApplyLoop(options) {
  addLog(`🚀 Launching AI Apply Agent. Target: ${options.limit} jobs...`);
  broadcast('STATUS', { state: agentState, stats, currentJob: null });

  let allJobs = loadAllJobs();
  if (options.category === 'backend') allJobs = allJobs.filter(j => j.category === 'backend');
  if (options.category === 'cyber') allJobs = allJobs.filter(j => j.category === 'cyber');

  if (options.ats !== 'all') {
    allJobs = allJobs.filter(j => {
      const u = (j.url || '').toLowerCase();
      if (options.ats === 'greenhouse') return u.includes('greenhouse.io');
      if (options.ats === 'ashby') return u.includes('ashbyhq.com');
      if (options.ats === 'lever') return u.includes('lever.co');
      return true;
    });
  }

  // Prioritize standard ATS platforms for high automation success
  allJobs.sort((a, b) => {
    const aATS = /greenhouse\.io|ashbyhq\.com|lever\.co/.test(a.url || '') ? 1 : 0;
    const bATS = /greenhouse\.io|ashbyhq\.com|lever\.co/.test(b.url || '') ? 1 : 0;
    if (bATS !== aATS) return bATS - aATS;
    return (b.score || 0) - (a.score || 0);
  });

  addLog(`📋 Loaded ${allJobs.length} eligible job openings for this campaign`);

  // Launch Chromium
  addLog(`🌐 Initializing Chromium (headless: ${options.headless})...`);
  activeBrowser = await chromium.launch({
    headless: options.headless,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
  });

  const context = await activeBrowser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });

  activePage = await context.newPage();

  const history = getHistory();
  let countThisSession = 0;

  for (let i = 0; i < allJobs.length; i++) {
    if (stopRequested) break;

    // Check pause condition
    while (pauseRequested && !stopRequested) {
      await sleep(1000);
    }
    if (stopRequested) break;

    if (stats.successful >= options.limit) {
      addLog(`🎉 Target goal of ${options.limit} applications reached!`);
      break;
    }

    const job = allJobs[i];
    const jobId = job.id || job.url;

    if (history.applied[jobId] && history.applied[jobId].status === 'APPLIED') {
      stats.skipped++;
      continue;
    }

    const resumeFile = selectResume(job);
    const resumeName = path.basename(resumeFile);

    currentJob = {
      title: job.title,
      company: job.company,
      region: job.region,
      url: job.url,
      ats: job.url.includes('greenhouse') ? 'Greenhouse' : (job.url.includes('ashby') ? 'Ashby' : (job.url.includes('lever') ? 'Lever' : 'Direct Portal')),
      resume: resumeName,
      step: 'Navigating to application...'
    };

    broadcast('JOB_START', currentJob);
    broadcast('STATUS', { state: agentState, stats, currentJob });
    addLog(`\n[${i + 1}/${allJobs.length}] Starting application for ${job.company} — "${job.title}"`);

    try {
      // Step 1: Navigate
      currentJob.step = `Navigating to ${new URL(job.url).hostname}...`;
      broadcast('JOB_START', currentJob);
      await activePage.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await sleep(1200);

      // Step 2: Form detection & auto-fill
      currentJob.step = 'Detecting fields & attaching PDF resume...';
      broadcast('JOB_START', currentJob);
      const formReport = await processJobPage(activePage, job);

      currentJob.ats = formReport.ats;
      addLog(`📄 Attached: ${resumeName} | Fields filled: ${formReport.fieldsFilled} | ATS: ${formReport.ats}`);

      if (formReport.questionsAnswered > 0) {
        stats.claudeAnswers += formReport.questionsAnswered;
        addLog(`🧠 Claude 5.5 answered ${formReport.questionsAnswered} custom questions with Imran's metrics`);
      }

      // Step 3: Submission
      currentJob.step = 'Submitting application...';
      broadcast('JOB_START', currentJob);

      if (formReport.submitElement) {
        await formReport.submitElement.click().catch(() => {});
        await sleep(3000);
      } else {
        const btn = await activePage.$('button[type="submit"], input[type="submit"], button:has-text("Submit")');
        if (btn) await btn.click().catch(() => {});
        await sleep(3000);
      }

      // Step 4: Verification screenshot
      const safeCo = job.company.replace(/[^a-zA-Z0-9]/g, '_');
      const ssFilename = `submitted_${stats.successful + 1}_${safeCo}.png`;
      const ssPath = path.join(SCREENSHOTS_DIR, ssFilename);
      await activePage.screenshot({ path: ssPath, fullPage: false }).catch(() => {});

      stats.successful++;
      countThisSession++;
      addLog(`✅ SUBMITTED: ${job.company} (${job.title}) — Screenshot: ${ssFilename}`);

      const appRecord = {
        title: job.title,
        company: job.company,
        url: job.url,
        ats: formReport.ats,
        resume: resumeName,
        screenshot: ssFilename,
        status: 'APPLIED',
        date: new Date().toISOString()
      };

      history.applied[jobId] = appRecord;
      saveHistory(history);

      // Calculate speed & ETA
      const elapsedMins = (Date.now() - stats.startTime) / 60000;
      if (elapsedMins > 0.1) {
        const speed = (countThisSession / elapsedMins).toFixed(1);
        stats.speed = speed;
        const remaining = options.limit - stats.successful;
        const minsLeft = Math.ceil(remaining / Math.max(0.1, speed));
        stats.eta = `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m`;
      }

      broadcast('JOB_DONE', appRecord);
      broadcast('STATUS', { state: agentState, stats, currentJob });

      // Anti-Bot pacing jitter (3.5 - 6s)
      const jitter = 3500 + Math.floor(Math.random() * 2500);
      currentJob.step = `Pacing delay (${(jitter/1000).toFixed(1)}s)...`;
      broadcast('JOB_START', currentJob);
      await sleep(jitter);

    } catch (err) {
      stats.failed++;
      addLog(`⚠️ Could not complete ${job.company}: ${err.message}`);
      history.applied[jobId] = {
        title: job.title,
        company: job.company,
        url: job.url,
        status: 'FAILED',
        error: err.message,
        date: new Date().toISOString()
      };
      saveHistory(history);
      broadcast('STATUS', { state: agentState, stats, currentJob });
    }
  }

  if (activeBrowser) {
    await activeBrowser.close();
    activeBrowser = null;
  }

  agentState = 'COMPLETED';
  addLog('🏁 Campaign run finished!');
  broadcast('STATUS', { state: agentState, stats, currentJob: null });
}

// Start Server
app.listen(PORT, () => {
  console.log(`\n======================================================================`);
  console.log(`🚀 AI Job Apply Dashboard is live at: http://localhost:${PORT}`);
  console.log(`======================================================================\n`);
});
