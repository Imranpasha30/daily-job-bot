/**
 * Parallel Worker Pool for Autonomous Job Application
 * Optimized for High-Performance Multi-Core & RTX 5060 GPUs
 * Runs up to 5-10 parallel Playwright browser contexts
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { processJobPage } = require('./form_router');
const { selectResume } = require('./profile');
const { verifySubmission } = require('./submission_verifier');

class ParallelApplyPool {
  constructor(options = {}) {
    this.concurrency = options.concurrency || 5;
    this.headless = options.headless !== undefined ? options.headless : true;
    this.jobs = options.jobs || [];
    this.history = options.history || { applied: {} };
    this.screenshotsDir = options.screenshotsDir || path.resolve(__dirname, '..', 'screenshots');
    this.onWorkerUpdate = options.onWorkerUpdate || (() => {});
    this.onJobComplete = options.onJobComplete || (() => {});
    this.onLog = options.onLog || (() => {});
    this.onStatsUpdate = options.onStatsUpdate || (() => {});
    
    this.browser = null;
    this.contexts = [];
    this.isRunning = false;
    this.isPaused = false;
    this.stopRequested = false;
    
    this.queue = [];
    this.activeWorkers = 0;
    this.stats = {
      target: options.limit || 1000,
      totalAttempted: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      claudeAnswers: 0,
      startTime: null,
      speed: 0,
      eta: '--'
    };
    
    this.workers = Array.from({ length: this.concurrency }, (_, i) => ({
      id: i + 1,
      state: 'IDLE',
      currentJob: null,
      step: 'Standby',
      appliedCount: 0
    }));
  }

  async start() {
    this.isRunning = true;
    this.stopRequested = false;
    this.isPaused = false;
    this.stats.startTime = Date.now();
    
    // Filter out already applied jobs
    this.queue = this.jobs.filter(j => {
      const id = j.id || j.url;
      return !(this.history.applied[id] && this.history.applied[id].status === 'APPLIED');
    });

    this.onLog(`⚡ RTX Parallel Engine initialized with ${this.concurrency} concurrent worker threads`);
    this.onLog(`📋 Processing queue: ${this.queue.length} eligible openings loaded`);

    // Launch single hardware-accelerated Chromium instance
    this.browser = await chromium.launch({
      headless: this.headless,
      args: [
        '--enable-gpu',
        '--enable-accelerated-2d-canvas',
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox'
      ]
    });

    // Launch worker promises
    const workerPromises = [];
    for (let i = 0; i < this.concurrency; i++) {
      workerPromises.push(this.runWorker(i));
      // Stagger start by 800ms so workers don't all hit initial connections simultaneously
      await new Promise(r => setTimeout(r, 800));
    }

    await Promise.all(workerPromises);
    await this.cleanup();
    this.isRunning = false;
    this.onLog('🏁 All parallel worker threads finished execution');
  }

  async runWorker(workerIndex) {
    const workerId = workerIndex + 1;
    const worker = this.workers[workerIndex];

    // Create isolated browser context per worker
    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    this.contexts.push(context);
    const page = await context.newPage();

    while (this.queue.length > 0 && !this.stopRequested) {
      // Pause check
      while (this.isPaused && !this.stopRequested) {
        worker.state = 'PAUSED';
        worker.step = 'Worker paused';
        this.onWorkerUpdate(worker);
        await new Promise(r => setTimeout(r, 1000));
      }
      if (this.stopRequested) break;

      if (this.stats.successful >= this.stats.target) break;

      const job = this.queue.shift();
      if (!job) break;

      const jobId = job.id || job.url;
      const resumeFile = selectResume(job);
      const resumeName = path.basename(resumeFile);

      worker.state = 'RUNNING';
      worker.currentJob = {
        title: job.title,
        company: job.company,
        url: job.url,
        region: job.region,
        resume: resumeName,
        ats: job.url.includes('greenhouse') ? 'Greenhouse' : (job.url.includes('ashby') ? 'Ashby' : (job.url.includes('lever') ? 'Lever' : 'Direct Portal'))
      };
      worker.step = `Navigating to ${job.company}...`;
      this.onWorkerUpdate(worker);
      this.onLog(`[Worker #${workerId}] 🚀 Starting: ${job.company} — "${job.title}"`);

      try {
        // Step 1: Navigate
        await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
        await new Promise(r => setTimeout(r, 1000));

        // Step 2: Form detection & auto-fill
        worker.step = 'Attaching resume & filling fields...';
        this.onWorkerUpdate(worker);

        const formReport = await processJobPage(page, job);

        if (formReport.questionsAnswered > 0) {
          this.stats.claudeAnswers += formReport.questionsAnswered;
          worker.step = `Gemini 2.5 answered ${formReport.questionsAnswered} questions`;
          this.onWorkerUpdate(worker);
          this.onLog(`[Worker #${workerId}] 🧠 Gemini 2.5 Flash synthesized answers for ${job.company}`);
        }

        // Step 3: Submission Click
        worker.step = 'Submitting application...';
        this.onWorkerUpdate(worker);

        if (formReport.submitElement) {
          await formReport.submitElement.click().catch(() => {});
        } else {
          const btn = await page.$('button[type="submit"], input[type="submit"], button:has-text("Submit")');
          if (btn) await btn.click().catch(() => {});
        }

        // Step 4: Strict Server-Side Submission Verification
        worker.step = 'Verifying server confirmation...';
        this.onWorkerUpdate(worker);

        const verification = await verifySubmission(page, 7500);

        const safeCo = job.company.replace(/[^a-zA-Z0-9]/g, '_');
        const prefix = verification.isConfirmed ? 'confirmed' : 'unconfirmed';
        const ssFilename = `${prefix}_w${workerId}_${Date.now()}_${safeCo}.png`;
        const ssPath = path.join(this.screenshotsDir, ssFilename);
        await page.screenshot({ path: ssPath, fullPage: false }).catch(() => {});

        const record = {
          title: job.title,
          company: job.company,
          url: job.url,
          ats: formReport.ats,
          resume: resumeName,
          screenshot: ssFilename,
          workerId: workerId,
          status: verification.isConfirmed ? 'CONFIRMED_APPLIED' : 'NOT_SUBMITTED',
          confirmed: verification.isConfirmed,
          verificationReason: verification.reason || verification.confirmationText,
          date: new Date().toISOString()
        };

        if (verification.isConfirmed) {
          this.stats.successful++;
          worker.appliedCount++;
          worker.step = 'Confirmed Submitted ✓';
          this.updateSpeedAndEta();
          this.history.applied[jobId] = record;
          this.onJobComplete(record);
          this.onLog(`[Worker #${workerId}] ✅ 100% CONFIRMED: Application submitted to ${job.company}! (${verification.confirmationText})`);
        } else {
          this.stats.failed++;
          worker.step = `Submission blocked: ${verification.reason.slice(0, 30)}...`;
          this.onLog(`[Worker #${workerId}] ❌ NOT SUBMITTED: ${job.company} — ${verification.reason}`);
          this.history.applied[jobId] = record;
        }

        this.onWorkerUpdate(worker);

        // Anti-bot pacing jitter
        const jitter = 1500 + Math.floor(Math.random() * 2000);
        await new Promise(r => setTimeout(r, jitter));

      } catch (err) {
        this.stats.failed++;
        this.onLog(`[Worker #${workerId}] ⚠️ Failed ${job.company}: ${err.message}`);
        this.history.applied[jobId] = {
          title: job.title,
          company: job.company,
          url: job.url,
          status: 'FAILED',
          error: err.message,
          date: new Date().toISOString()
        };
      }
    }

    worker.state = 'IDLE';
    worker.step = 'Finished';
    this.onWorkerUpdate(worker);
  }

  updateSpeedAndEta() {
    const elapsedMins = (Date.now() - this.stats.startTime) / 60000;
    if (elapsedMins > 0.05) {
      const speed = (this.stats.successful / elapsedMins).toFixed(1);
      this.stats.speed = speed;
      const remaining = Math.max(0, this.stats.target - this.stats.successful);
      const minsLeft = Math.ceil(remaining / Math.max(0.1, parseFloat(speed)));
      const hrs = Math.floor(minsLeft / 60);
      const mins = minsLeft % 60;
      this.stats.eta = `${hrs}h ${mins}m`;
    }
    this.onStatsUpdate(this.stats);
  }

  pause() {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  async stop() {
    this.stopRequested = true;
    await this.cleanup();
  }

  async cleanup() {
    if (this.browser) {
      try { await this.browser.close(); } catch (e) {}
      this.browser = null;
    }
  }
}

module.exports = {
  ParallelApplyPool
};
