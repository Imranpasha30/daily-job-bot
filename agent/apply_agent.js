#!/usr/bin/env node
/**
 * Autonomous AI Job Application Agent
 * Target: Apply to up to 1,000 Backend & Cybersecurity Jobs
 * Candidate: Imran Pasha (Sharkify Backend Engineer ~2 yrs exp, IIT Roorkee Cyber Certified)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { processJobPage } = require('./form_router');
const { selectResume } = require('./profile');
const { verifySubmission } = require('./submission_verifier');

// Paths
const BASE_DIR = path.resolve(__dirname, '..');
const HISTORY_FILE = path.join(BASE_DIR, 'applied_history.json');
const SCREENSHOTS_DIR = path.join(BASE_DIR, 'screenshots');
const INDEX_HTML = path.join(BASE_DIR, 'index.html');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Parse Command Line Arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    category: 'all',          // 'backend', 'cyber', or 'all'
    mode: 'safe',             // 'safe' (prompts/countdown) or 'auto' (fully autonomous)
    limit: 1000,              // target applications
    headless: false,          // visible headful browser by default
    ats: 'all',               // 'greenhouse', 'ashby', 'lever', or 'all'
    query: '',                // keyword search
    dryRun: false,            // fill form without submitting
    statsOnly: false,
    delayMs: 3500             // delay between jobs to respect server pacing
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--category' && args[i + 1]) opts.category = args[++i].toLowerCase();
    else if (a === '--mode' && args[i + 1]) opts.mode = args[++i].toLowerCase();
    else if (a === '--limit' && args[i + 1]) opts.limit = parseInt(args[++i], 10);
    else if (a === '--headless') {
      const val = args[i + 1];
      if (val === 'true' || val === 'false') {
        opts.headless = (val === 'true');
        i++;
      } else {
        opts.headless = true;
      }
    }
    else if (a === '--ats' && args[i + 1]) opts.ats = args[++i].toLowerCase();
    else if (a === '--query' && args[i + 1]) opts.query = args[++i].toLowerCase();
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--stats') opts.statsOnly = true;
    else if (a === '--delay' && args[i + 1]) opts.delayMs = parseInt(args[++i], 10);
  }

  return opts;
}

// Load Application History
function loadHistory() {
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch (e) {
      console.warn('Could not parse history, starting fresh:', e.message);
    }
  }
  return { applied: {}, stats: { totalAttempted: 0, successful: 0, failed: 0, manualReview: 0 } };
}

// Save Application History
function saveHistory(history) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
}

// Load Jobs from index.html (Primary) or JSON files (Fallback)
function loadJobs() {
  let backend = [];
  let cyber = [];

  if (fs.existsSync(INDEX_HTML)) {
    try {
      const html = fs.readFileSync(INDEX_HTML, 'utf8');
      const bMatch = html.match(/const ALL_BACKEND = (\[.*?\]);/s);
      const cMatch = html.match(/const ALL_CYBER = (\[.*?\]);/s);
      if (bMatch) backend = JSON.parse(bMatch[1]);
      if (cMatch) cyber = JSON.parse(cMatch[1]);
    } catch (e) {
      console.warn('Failed reading from index.html, falling back to JSON:', e.message);
    }
  }

  if (!backend.length && fs.existsSync(path.join(BASE_DIR, 'final.json'))) {
    const f = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'final.json'), 'utf8'));
    backend = f.jobs || f;
  }
  if (!cyber.length && fs.existsSync(path.join(BASE_DIR, 'cyber_final.json'))) {
    const c = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'cyber_final.json'), 'utf8'));
    cyber = c.jobs || c;
  }

  // Tag categories
  backend.forEach(j => { j.category = 'backend'; });
  cyber.forEach(j => { j.category = 'cyber'; });

  return { backend, cyber };
}

// Wait helper
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// Prompt helper for Safe Mode
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

// Display Banner
function printBanner(opts, totalJobs, history) {
  const appliedCount = Object.keys(history.applied).length;
  console.log('\n' + '='.repeat(70));
  console.log('       🚀  IMRAN PASHA — AUTONOMOUS AI JOB APPLY AGENT  🚀');
  console.log('='.repeat(70));
  console.log(` Mode:        ${opts.mode.toUpperCase()}${opts.dryRun ? ' (DRY RUN - No Submissions)' : ''}`);
  console.log(` Target:      Apply up to ${opts.limit} jobs`);
  console.log(` Category:    ${opts.category.toUpperCase()}`);
  console.log(` ATS Filter:  ${opts.ats.toUpperCase()}`);
  console.log(` Headless:    ${opts.headless ? 'Yes (Background)' : 'No (Visible Browser)'}`);
  console.log(` Available:   ${totalJobs} total curated roles`);
  console.log(` Applied So Far: ${appliedCount} jobs`);
  console.log('='.repeat(70) + '\n');
}

async function run() {
  const opts = parseArgs();
  const history = loadHistory();
  const { backend, cyber } = loadJobs();

  let targetJobs = [];
  if (opts.category === 'backend') targetJobs = backend;
  else if (opts.category === 'cyber') targetJobs = cyber;
  else targetJobs = [...backend, ...cyber];

  // Filter by query if specified
  if (opts.query) {
    targetJobs = targetJobs.filter(j => {
      const hay = `${j.title} ${j.company} ${j.region} ${(j.tags||[]).join(' ')} ${j.snippet||''}`.toLowerCase();
      return hay.includes(opts.query);
    });
  }

  // Filter by ATS if specified
  if (opts.ats !== 'all') {
    targetJobs = targetJobs.filter(j => {
      const u = (j.url || '').toLowerCase();
      if (opts.ats === 'greenhouse') return u.includes('greenhouse.io');
      if (opts.ats === 'ashby') return u.includes('ashbyhq.com');
      if (opts.ats === 'lever') return u.includes('lever.co');
      return true;
    });
  }

  // Prioritize jobs from major standard ATS platforms (Greenhouse, Ashby, Lever have highest automation success)
  targetJobs.sort((a, b) => {
    const aATS = /greenhouse\.io|ashbyhq\.com|lever\.co/.test(a.url || '') ? 1 : 0;
    const bATS = /greenhouse\.io|ashbyhq\.com|lever\.co/.test(b.url || '') ? 1 : 0;
    if (bATS !== aATS) return bATS - aATS;
    return (b.score || 0) - (a.score || 0);
  });

  printBanner(opts, targetJobs.length, history);

  if (opts.statsOnly) {
    console.log('Statistics Summary:');
    console.log(JSON.stringify(history.stats, null, 2));
    console.log(`Total jobs in history: ${Object.keys(history.applied).length}`);
    return;
  }

  // Launch Playwright Browser
  console.log(`[Browser] Launching Chromium (headless: ${opts.headless})...`);
  const browser = await chromium.launch({
    headless: opts.headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--start-maximized',
      '--no-sandbox'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  let applicationCount = 0;
  let skippedCount = 0;

  for (let idx = 0; idx < targetJobs.length; idx++) {
    if (applicationCount >= opts.limit) {
      console.log(`\n🎉 Reached application limit of ${opts.limit}! Stopping.`);
      break;
    }

    const job = targetJobs[idx];
    const jobId = job.id || job.url;

    // Check if already applied or attempted
    if (history.applied[jobId] && history.applied[jobId].status === 'APPLIED') {
      skippedCount++;
      continue;
    }

    console.log(`\n[${idx + 1}/${targetJobs.length}] Processing Application #${applicationCount + 1}:`);
    console.log(`  Role:    ${job.title}`);
    console.log(`  Company: ${job.company}`);
    console.log(`  Region:  ${job.region}`);
    console.log(`  URL:     ${job.url}`);

    const resumeFile = selectResume(job);
    console.log(`  Resume:  ${path.basename(resumeFile)}`);

    try {
      console.log(`  [1/4] Navigating to job page...`);
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await sleep(1500);

      console.log(`  [2/4] Detecting form & auto-filling fields...`);
      const formReport = await processJobPage(page, job);

      console.log(`  [3/4] Form Result: ATS=${formReport.ats} | Resume=${formReport.resumeUploaded ? 'YES' : 'NO'} | Fields=${formReport.fieldsFilled} | Questions=${formReport.questionsAnswered} | SubmitFound=${formReport.submitFound ? 'YES' : 'NO'}`);

      if (formReport.details && formReport.details.length > 0) {
        formReport.details.slice(0, 5).forEach(d => console.log(`        - ${d}`));
      }

      // If dry-run, log and continue
      if (opts.dryRun) {
        console.log(`  [DRY RUN] Form filled successfully! Skipping submission.`);
        applicationCount++;
        continue;
      }

      // Submission logic based on mode
      if (opts.mode === 'safe') {
        console.log(`\n  👉 [SAFE MODE] Application form is filled!`);
        console.log(`     Look at the browser window to verify the details.`);
        
        // Take screenshot of filled form
        const ssPath = path.join(SCREENSHOTS_DIR, `job_${applicationCount + 1}_${job.company.replace(/[^a-zA-Z0-9]/g, '_')}.png`);
        await page.screenshot({ path: ssPath, fullPage: false }).catch(() => {});
        console.log(`     Saved review screenshot to: ${ssPath}`);

        const answer = await askQuestion(`     Press ENTER to Submit application, or type 's' to skip, 'q' to quit: `);
        
        if (answer.trim().toLowerCase() === 'q') {
          console.log('\nQuit command received. Saving progress and exiting...');
          break;
        }

        if (answer.trim().toLowerCase() === 's') {
          console.log('     Skipped by user.');
          history.applied[jobId] = {
            title: job.title,
            company: job.company,
            url: job.url,
            status: 'SKIPPED_BY_USER',
            date: new Date().toISOString()
          };
          saveHistory(history);
          continue;
        }

        // User pressed ENTER -> Submit
        console.log(`  [4/4] Submitting application...`);
        if (formReport.submitElement) {
          await formReport.submitElement.click().catch(() => {});
        } else {
          const btn = await page.$('button[type="submit"], input[type="submit"], button:has-text("Submit")');
          if (btn) await btn.click().catch(() => {});
        }

        console.log(`  [Verification] Checking server-side confirmation...`);
        const verification = await verifySubmission(page, 7500);

        const safeCo = job.company.replace(/[^a-zA-Z0-9]/g, '_');
        const ssFilename = `${verification.isConfirmed ? 'confirmed' : 'unconfirmed'}_${applicationCount + 1}_${safeCo}.png`;
        const ssPath = path.join(SCREENSHOTS_DIR, ssFilename);
        await page.screenshot({ path: ssPath, fullPage: false }).catch(() => {});

        if (verification.isConfirmed) {
          console.log(`  ✅ [CONFIRMED] Application officially accepted by ${job.company}! (${verification.confirmationText})`);
          applicationCount++;
          history.stats.successful++;
          history.applied[jobId] = {
            title: job.title,
            company: job.company,
            url: job.url,
            ats: formReport.ats,
            resume: path.basename(resumeFile),
            screenshot: ssFilename,
            status: 'CONFIRMED_APPLIED',
            date: new Date().toISOString()
          };
          saveHistory(history);
        } else {
          console.log(`  ❌ [NOT SUBMITTED] ${job.company} — ${verification.reason}`);
          history.stats.failed++;
          history.applied[jobId] = {
            title: job.title,
            company: job.company,
            url: job.url,
            ats: formReport.ats,
            resume: path.basename(resumeFile),
            screenshot: ssFilename,
            status: 'NOT_SUBMITTED',
            error: verification.reason,
            date: new Date().toISOString()
          };
          saveHistory(history);
        }

      } else {
        // FULL AUTO MODE
        console.log(`  [4/4] [AUTO MODE] Submitting application...`);
        if (formReport.submitElement) {
          await formReport.submitElement.click().catch(() => {});
        } else {
          const btn = await page.$('button[type="submit"], input[type="submit"], button:has-text("Submit")');
          if (btn) await btn.click().catch(() => {});
        }

        console.log(`  [Verification] Checking server-side confirmation...`);
        const verification = await verifySubmission(page, 7500);

        const safeCo = job.company.replace(/[^a-zA-Z0-9]/g, '_');
        const ssFilename = `${verification.isConfirmed ? 'confirmed' : 'unconfirmed'}_${applicationCount + 1}_${safeCo}.png`;
        const ssPath = path.join(SCREENSHOTS_DIR, ssFilename);
        await page.screenshot({ path: ssPath, fullPage: false }).catch(() => {});

        if (verification.isConfirmed) {
          console.log(`  ✅ [AUTO CONFIRMED] Application officially accepted by ${job.company}! (${verification.confirmationText})`);
          applicationCount++;
          history.stats.successful++;
          history.applied[jobId] = {
            title: job.title,
            company: job.company,
            url: job.url,
            ats: formReport.ats,
            resume: path.basename(resumeFile),
            screenshot: ssFilename,
            status: 'CONFIRMED_APPLIED',
            date: new Date().toISOString()
          };
          saveHistory(history);
        } else {
          console.log(`  ❌ [NOT SUBMITTED] ${job.company} — ${verification.reason}`);
          history.stats.failed++;
          history.applied[jobId] = {
            title: job.title,
            company: job.company,
            url: job.url,
            ats: formReport.ats,
            resume: path.basename(resumeFile),
            screenshot: ssFilename,
            status: 'NOT_SUBMITTED',
            error: verification.reason,
            date: new Date().toISOString()
          };
          saveHistory(history);
        }

        // Anti-bot pacing jitter (3 - 6 seconds)
        const jitter = opts.delayMs + Math.floor(Math.random() * 2500);
        console.log(`  ⏳ Pacing delay: waiting ${(jitter / 1000).toFixed(1)}s before next application...`);
        await sleep(jitter);
      }

    } catch (err) {
      console.error(`  ❌ Error processing ${job.company}: ${err.message}`);
      history.stats.failed++;
      history.applied[jobId] = {
        title: job.title,
        company: job.company,
        url: job.url,
        status: 'FAILED',
        error: err.message,
        date: new Date().toISOString()
      };
      saveHistory(history);
    }
  }

  await browser.close();

  console.log('\n' + '='.repeat(70));
  console.log('             🏁  APPLICATION RUN FINISHED  🏁');
  console.log('='.repeat(70));
  console.log(` Applications Processed: ${applicationCount}`);
  console.log(` Skipped (Already Applied): ${skippedCount}`);
  console.log(` Total in History:       ${Object.keys(history.applied).length}`);
  console.log(` Applied History Saved:  ${HISTORY_FILE}`);
  console.log('='.repeat(70) + '\n');
}

run().catch(err => {
  console.error('Fatal Runner Error:', err);
  process.exit(1);
});
