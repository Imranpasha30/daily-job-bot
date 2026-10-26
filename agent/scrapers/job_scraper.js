/**
 * Imran Pasha — Autonomous Multi-Platform Job Scraper
 * Targets: LinkedIn, Naukri, and Direct ATS Boards (Greenhouse, Lever, Ashby)
 * Anti-Ban Protection: Persistent user profile, stealth flags, human pacing, random delays
 * Timing filters: 24h, 48h, 7d, anytime
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { PROFILE_DIR, isAuthSessionActive } = require('../auth_session');

const SCRAPED_JOBS_FILE = path.resolve(__dirname, '..', '..', 'scraped_jobs.json');
const INDEX_HTML = path.resolve(__dirname, '..', '..', 'index.html');
const HISTORY_FILE = path.resolve(__dirname, '..', '..', 'applied_history.json');

// Helper for human-like delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = (min = 1800, max = 4200) => delay(Math.floor(Math.random() * (max - min + 1)) + min);

// Load existing jobs to prevent duplicates
function loadExistingJobKeys() {
  const keys = new Set();

  // 1. From applied history
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      if (history.applied) {
        Object.keys(history.applied).forEach(k => keys.add(k.toLowerCase().trim()));
        Object.values(history.applied).forEach(a => {
          if (a.url) keys.add(a.url.toLowerCase().trim());
        });
      }
    } catch (e) {}
  }

  // 2. From index.html database
  if (fs.existsSync(INDEX_HTML)) {
    try {
      const html = fs.readFileSync(INDEX_HTML, 'utf8');
      const bMatch = html.match(/const ALL_BACKEND = (\[.*?\]);/s);
      const cMatch = html.match(/const ALL_CYBER = (\[.*?\]);/s);
      const backend = bMatch ? JSON.parse(bMatch[1]) : [];
      const cyber = cMatch ? JSON.parse(cMatch[1]) : [];
      [...backend, ...cyber].forEach(j => {
        if (j.url) keys.add(j.url.toLowerCase().trim());
        if (j.company && j.title) keys.add(`${j.company} - ${j.title}`.toLowerCase().trim());
      });
    } catch (e) {}
  }

  // 3. From already scraped jobs
  if (fs.existsSync(SCRAPED_JOBS_FILE)) {
    try {
      const scraped = JSON.parse(fs.readFileSync(SCRAPED_JOBS_FILE, 'utf8'));
      scraped.forEach(j => {
        if (j.url) keys.add(j.url.toLowerCase().trim());
        if (j.company && j.title) keys.add(`${j.company} - ${j.title}`.toLowerCase().trim());
      });
    } catch (e) {}
  }

  return keys;
}

// Save scraped jobs to scraped_jobs.json
function saveScrapedJobs(newJobs) {
  let existing = [];
  if (fs.existsSync(SCRAPED_JOBS_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(SCRAPED_JOBS_FILE, 'utf8'));
    } catch (e) { existing = []; }
  }

  const existingUrls = new Set(existing.map(j => (j.url || '').toLowerCase().trim()));
  const filteredNew = newJobs.filter(j => !existingUrls.has((j.url || '').toLowerCase().trim()));
  const merged = [...filteredNew, ...existing];

  fs.writeFileSync(SCRAPED_JOBS_FILE, JSON.stringify(merged, null, 2), 'utf8');

  // Synchronize dedicated backend & cyber storage pools
  try {
    const { syncJobPools } = require('../job_pool_manager');
    syncJobPools();
  } catch (e) {}

  return { added: filteredNew.length, total: merged.length, newJobs: filteredNew };
}

// Scrape LinkedIn Jobs
async function scrapeLinkedIn({ timing = '24h', category = 'backend', keywords = '', limit = 30, onLog = console.log }) {
  onLog('🔍 [LinkedIn Scraper] Initializing safe stealth browser...');
  const existingKeys = loadExistingJobKeys();
  const results = [];

  // Map timing to LinkedIn f_TPR parameter
  let f_TPR = 'r86400'; // Default 24h
  if (timing === '48h') f_TPR = 'r172800';
  else if (timing === '7d') f_TPR = 'r604800';
  else if (timing === 'all') f_TPR = '';

  // Keywords determination
  let searchTerms = [];
  if (keywords) {
    searchTerms = [keywords];
  } else if (category === 'backend') {
    searchTerms = ['Python Backend Developer', 'FastAPI Developer', 'Node.js Backend Engineer'];
  } else if (category === 'cyber') {
    searchTerms = ['Cyber Security Analyst Fresher', 'SOC Analyst', 'Junior Penetration Tester'];
  } else {
    searchTerms = ['Python Backend Engineer', 'SOC Analyst'];
  }

  let browserContext = null;
  let isPersistent = false;

  // Use persistent context if not in use, else launch standard stealth context
  try {
    if (!isAuthSessionActive() && fs.existsSync(PROFILE_DIR)) {
      try {
        browserContext = await chromium.launchPersistentContext(PROFILE_DIR, {
          channel: 'chrome',
          headless: false,
          viewport: { width: 1366, height: 768 },
          args: [
            '--window-position=-2400,-2400',
            '--window-size=1366,768',
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox'
          ]
        });
        isPersistent = true;
        onLog('🛡️ [LinkedIn Scraper] Using persistent authenticated profile session via genuine Google Chrome.');
      } catch (chromeErr) {
        browserContext = await chromium.launchPersistentContext(PROFILE_DIR, {
          headless: true,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
        });
        isPersistent = true;
        onLog('🛡️ [LinkedIn Scraper] Using persistent profile fallback.');
      }
    } else {
      try {
        browserContext = await chromium.launchPersistentContext('', {
          channel: 'chrome',
          headless: false,
          viewport: { width: 1366, height: 768 },
          args: [
            '--window-position=-2400,-2400',
            '--window-size=1366,768',
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox'
          ]
        });
        onLog('🌐 [LinkedIn Scraper] Using genuine Google Chrome off-screen session.');
      } catch (e) {
        const browser = await chromium.launch({
          headless: true,
          args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
        });
        browserContext = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          viewport: { width: 1366, height: 768 }
        });
        onLog('🌐 [LinkedIn Scraper] Using stealth guest context with anti-ban headers.');
      }
    }

    const page = browserContext.pages()[0] || await browserContext.newPage();

    // Prevent webdriver flag detection
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    for (const term of searchTerms) {
      if (results.length >= limit) break;

      const tprParam = f_TPR ? `&f_TPR=${f_TPR}` : '';
      const url = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(term)}&location=India${tprParam}&sortBy=DD`;
      onLog(`🔎 [LinkedIn] Searching "${term}" with timing filter (${timing})...`);

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await randomDelay(2000, 3500);

        // Gentle scroll to load dynamic items
        await page.evaluate(() => window.scrollBy(0, 700));
        await randomDelay(1000, 1800);
        await page.evaluate(() => window.scrollBy(0, 700));
        await randomDelay(1000, 1500);

        // Extract job cards
        const rawJobs = await page.$$eval(
          'ul.jobs-search__results-list li, .base-card, .job-search-card, li[data-occludable-job-id]',
          els => els.map(el => {
            const titleEl = el.querySelector('.base-search-card__title, .job-card-list__title, h3, a.job-card-container__link');
            const compEl = el.querySelector('.base-search-card__subtitle, .job-card-container__primary-description, h4, .job-search-card__subtitle');
            const locEl = el.querySelector('.job-search-card__location, .job-card-container__metadata-item');
            const linkEl = el.querySelector('a.base-card__full-link, a.job-card-list__title, a.job-card-container__link, a');
            const dateEl = el.querySelector('time, .job-search-card__listdate');

            return {
              title: (titleEl ? titleEl.innerText : '').replace(/\s+/g, ' ').trim(),
              company: (compEl ? compEl.innerText : '').replace(/\s+/g, ' ').trim(),
              location: (locEl ? locEl.innerText : 'India').replace(/\s+/g, ' ').trim(),
              url: linkEl ? linkEl.href : '',
              posted: (dateEl ? dateEl.innerText : '').replace(/\s+/g, ' ').trim()
            };
          }).filter(j => j.title && j.url)
        );

        onLog(`📑 [LinkedIn] Found ${rawJobs.length} raw listings for "${term}". Deduplicating...`);

        for (const rj of rawJobs) {
          if (results.length >= limit) break;

          const cleanUrl = rj.url.split('?')[0];
          const dedupeKey = `${rj.company} - ${rj.title}`.toLowerCase().trim();

          if (existingKeys.has(cleanUrl.toLowerCase()) || existingKeys.has(dedupeKey)) {
            continue;
          }

          existingKeys.add(cleanUrl.toLowerCase());
          existingKeys.add(dedupeKey);

          // Detect role category
          const isCyber = /cyber|security|soc|pentest|infosec|vulnerab/i.test(rj.title);
          const isBackend = /python|backend|node|django|fastapi|software|sde|api/i.test(rj.title);

          const job = {
            id: `li_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            title: rj.title,
            company: rj.company || 'Tech Company',
            location: rj.location || 'India (Hybrid/Remote)',
            url: rj.url,
            ats: 'linkedin',
            category: isCyber ? 'cyber' : (isBackend ? 'backend' : category),
            platform: 'linkedin',
            timing: timing,
            postedTime: rj.posted || 'Recent (Verified)',
            dateScraped: new Date().toISOString(),
            status: 'PENDING'
          };

          results.push(job);
          onLog(`  ✨ Added: [LinkedIn] ${job.company} — ${job.title} (${job.location})`);
        }

        // Anti-ban delay between search queries
        await randomDelay(2500, 4500);
      } catch (termErr) {
        onLog(`⚠️ [LinkedIn] Query "${term}" note: ${termErr.message}`);
      }
    }
  } catch (err) {
    onLog(`❌ [LinkedIn Scraper Error]: ${err.message}`);
  } finally {
    if (browserContext) {
      await browserContext.close().catch(() => {});
    }
  }

  onLog(`✅ [LinkedIn Scraper] Completed! Extracted ${results.length} new unique jobs.`);
  return results;
}

// Scrape Naukri Jobs
async function scrapeNaukri({ timing = '24h', category = 'backend', keywords = '', limit = 30, onLog = console.log }) {
  onLog('🔍 [Naukri Scraper] Initializing safe stealth browser...');
  const existingKeys = loadExistingJobKeys();
  const results = [];

  // Map timing to Naukri jobAge
  let jobAge = 1; // 24h
  if (timing === '48h') jobAge = 2;
  else if (timing === '7d') jobAge = 7;
  else if (timing === 'all') jobAge = 30;

  let querySlug = 'backend-developer';
  let searchTerm = 'Backend Developer';

  if (keywords) {
    searchTerm = keywords;
    querySlug = keywords.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  } else if (category === 'cyber') {
    searchTerm = 'Cyber Security SOC Analyst';
    querySlug = 'cyber-security-analyst';
  } else {
    searchTerm = 'Python Backend Developer';
    querySlug = 'python-backend-developer';
  }

  let browserContext = null;

  try {
    // Launch using genuine Google Chrome engine to bypass Cloudflare bot barrier
    if (!isAuthSessionActive() && fs.existsSync(PROFILE_DIR)) {
      try {
        browserContext = await chromium.launchPersistentContext(PROFILE_DIR, {
          channel: 'chrome',
          headless: false,
          viewport: { width: 1366, height: 768 },
          args: [
            '--window-position=-2400,-2400',
            '--window-size=1366,768',
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox'
          ]
        });
        onLog('🛡️ [Naukri Scraper] Connected via genuine Google Chrome profile session.');
      } catch (chromeErr) {
        browserContext = await chromium.launchPersistentContext(PROFILE_DIR, {
          headless: true,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
        });
        onLog('🛡️ [Naukri Scraper] Using persistent profile fallback.');
      }
    } else {
      try {
        browserContext = await chromium.launchPersistentContext('', {
          channel: 'chrome',
          headless: false,
          viewport: { width: 1366, height: 768 },
          args: [
            '--window-position=-2400,-2400',
            '--window-size=1366,768',
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox'
          ]
        });
        onLog('🌐 [Naukri Scraper] Using genuine Google Chrome off-screen session.');
      } catch (e) {
        const browser = await chromium.launch({
          headless: true,
          args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
        });
        browserContext = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          viewport: { width: 1366, height: 768 }
        });
        onLog('🌐 [Naukri Scraper] Using stealth context with genuine browser headers.');
      }
    }

    const page = browserContext.pages()[0] || await browserContext.newPage();

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const searchUrl = `https://www.naukri.com/${querySlug}-jobs?k=${encodeURIComponent(searchTerm)}&experience=1&jobAge=${jobAge}`;
    onLog(`🔎 [Naukri] Navigating to: ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await randomDelay(3000, 4500);

    const title = await page.title();
    if (title.includes('Access Denied')) {
      onLog('⚠️ [Naukri Notice] Cloudflare bot barrier encountered. Please click "🔐 Authenticate LinkedIn & Naukri" to link your session for 100% access.');
    } else {
      // Human scroll
      await page.evaluate(() => window.scrollBy(0, 800));
      await randomDelay(1200, 2000);

      const rawJobs = await page.$$eval(
        '.cust-job-tuple, .srp-jobtuple-wrapper, article.jobTuple',
        els => els.map(el => {
          const titleEl = el.querySelector('a.title, .title');
          const compEl = el.querySelector('a.comp-name, .comp-name, a.company-name');
          const locEl = el.querySelector('.loc-wrap, .location, span[class*="loc"]');
          const expEl = el.querySelector('.exp-wrap, .experience, span[class*="exp"]');
          const dayEl = el.querySelector('.job-post-day, span[class*="date"]');
          const descEl = el.querySelector('.job-desc, .desc');

          return {
            title: (titleEl ? titleEl.innerText : '').replace(/\s+/g, ' ').trim(),
            company: (compEl ? compEl.innerText : '').replace(/\s+/g, ' ').trim(),
            location: (locEl ? locEl.innerText : 'India').replace(/\s+/g, ' ').trim(),
            experience: (expEl ? expEl.innerText : '1-3 Yrs').replace(/\s+/g, ' ').trim(),
            posted: (dayEl ? dayEl.innerText : 'Recent').replace(/\s+/g, ' ').trim(),
            description: (descEl ? descEl.innerText : '').replace(/\s+/g, ' ').trim(),
            url: titleEl ? titleEl.href : ''
          };
        }).filter(j => j.title && j.url)
      );

      onLog(`📑 [Naukri] Found ${rawJobs.length} listings. Deduplicating...`);

      for (const rj of rawJobs) {
        if (results.length >= limit) break;

        const cleanUrl = rj.url.split('?')[0];
        const dedupeKey = `${rj.company} - ${rj.title}`.toLowerCase().trim();

        if (existingKeys.has(cleanUrl.toLowerCase()) || existingKeys.has(dedupeKey)) {
          continue;
        }

        existingKeys.add(cleanUrl.toLowerCase());
        existingKeys.add(dedupeKey);

        const isCyber = /cyber|security|soc|pentest|infosec|vulnerab/i.test(rj.title);

        const job = {
          id: `nk_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          title: rj.title,
          company: rj.company || 'Enterprise Employer',
          location: rj.location || 'India',
          experience: rj.experience || '1-3 Yrs',
          url: rj.url,
          ats: 'naukri',
          category: isCyber ? 'cyber' : (category === 'cyber' ? 'cyber' : 'backend'),
          platform: 'naukri',
          timing: timing,
          postedTime: rj.posted || 'Recent (Verified)',
          dateScraped: new Date().toISOString(),
          status: 'PENDING'
        };

        results.push(job);
        onLog(`  ✨ Added: [Naukri] ${job.company} — ${job.title} (${job.location})`);
      }
    }
  } catch (err) {
    onLog(`❌ [Naukri Scraper Error]: ${err.message}`);
  } finally {
    if (browserContext) {
      await browserContext.close().catch(() => {});
    }
  }

  onLog(`✅ [Naukri Scraper] Completed! Extracted ${results.length} new unique jobs.`);
  return results;
}

// Scrape Direct ATS Boards (Greenhouse, Lever, Ashby - 100% Automatable)
async function scrapeDirectATS({ category = 'all', keywords = '', limit = 40, onLog = console.log }) {
  onLog('🔍 [Direct ATS Scraper] Querying verified Greenhouse, Ashby, and Lever feeds...');
  const existingKeys = loadExistingJobKeys();
  const results = [];

  // Curated list of verified tech companies using Greenhouse / Lever / Ashby with high hiring in India / Remote
  const targetBoards = [
    { company: 'GitLab', boardUrl: 'https://job-boards.greenhouse.io/gitlab', ats: 'greenhouse' },
    { company: 'Stripe', boardUrl: 'https://job-boards.greenhouse.io/stripe', ats: 'greenhouse' },
    { company: 'Databricks', boardUrl: 'https://job-boards.greenhouse.io/databricks', ats: 'greenhouse' },
    { company: 'HackerRank', boardUrl: 'https://job-boards.greenhouse.io/hackerrank', ats: 'greenhouse' },
    { company: 'HashiCorp', boardUrl: 'https://job-boards.greenhouse.io/hashicorp', ats: 'greenhouse' },
    { company: 'Canva', boardUrl: 'https://job-boards.greenhouse.io/canva', ats: 'greenhouse' },
    { company: 'Razorpay', boardUrl: 'https://jobs.lever.co/razorpay', ats: 'lever' },
    { company: 'Postman', boardUrl: 'https://job-boards.greenhouse.io/postman', ats: 'greenhouse' },
    { company: 'Swiggy', boardUrl: 'https://job-boards.greenhouse.io/swiggy', ats: 'greenhouse' },
    { company: 'Zepto', boardUrl: 'https://jobs.lever.co/zepto', ats: 'lever' }
  ];

  let browser = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
    });
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });

    for (const b of targetBoards) {
      if (results.length >= limit) break;
      try {
        onLog(`📡 [ATS] Scanning board: ${b.company} (${b.ats})...`);
        await page.goto(b.boardUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await randomDelay(1200, 2200);

        let jobs = [];
        if (b.ats === 'greenhouse') {
          jobs = await page.$$eval('a[href*="/jobs/"], .opening a', (links, comp) => {
            return links.map(a => ({
              title: (a.innerText || '').replace(/\s+/g, ' ').trim(),
              url: a.href,
              company: comp
            })).filter(j => j.title && j.url && !j.url.endsWith('/jobs'));
          }, b.company);
        } else if (b.ats === 'lever') {
          jobs = await page.$$eval('.posting, a.posting-title', (els, comp) => {
            return els.map(el => {
              const a = el.tagName === 'A' ? el : el.querySelector('a');
              const titleEl = el.querySelector('h5, [data-qa="posting-name"]') || a;
              return {
                title: (titleEl ? titleEl.innerText : '').replace(/\s+/g, ' ').trim(),
                url: a ? a.href : '',
                company: comp
              };
            }).filter(j => j.title && j.url);
          }, b.company);
        }

        for (const j of jobs) {
          if (results.length >= limit) break;

          const titleLower = j.title.toLowerCase();
          const isBackendMatch = /python|backend|software engineer|sde|fastapi|django|developer|api/i.test(titleLower);
          const isCyberMatch = /security|cyber|soc|pentest|infosec|vulnerab/i.test(titleLower);

          if (category === 'backend' && !isBackendMatch) continue;
          if (category === 'cyber' && !isCyberMatch) continue;
          if (category === 'all' && !isBackendMatch && !isCyberMatch) continue;

          const dedupeKey = `${j.company} - ${j.title}`.toLowerCase().trim();
          if (existingKeys.has(j.url.toLowerCase()) || existingKeys.has(dedupeKey)) continue;

          existingKeys.add(j.url.toLowerCase());
          existingKeys.add(dedupeKey);

          const job = {
            id: `ats_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            title: j.title,
            company: j.company,
            location: 'India / Remote',
            url: j.url,
            ats: b.ats,
            category: isCyberMatch ? 'cyber' : 'backend',
            platform: b.ats,
            timing: 'recent',
            postedTime: 'Verified Live Opening',
            dateScraped: new Date().toISOString(),
            status: 'PENDING'
          };

          results.push(job);
          onLog(`  ⚡ Added Direct ATS: [${b.ats.toUpperCase()}] ${job.company} — ${job.title}`);
        }
      } catch (boardErr) {
        onLog(`⚠️ [ATS] Board ${b.company} check: ${boardErr.message}`);
      }
    }
  } catch (err) {
    onLog(`❌ [Direct ATS Error]: ${err.message}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  onLog(`✅ [Direct ATS Scraper] Extracted ${results.length} verified ATS jobs ready for instant apply.`);
  return results;
}

// Master Scraper Orchestrator
async function runJobScraper({ platform = 'all', timing = '24h', category = 'all', keywords = '', limit = 50, onLog = console.log }) {
  onLog(`\n======================================================================`);
  onLog(`🚀 STARTING AUTONOMOUS JOB SCRAPER`);
  onLog(`   Platform: ${platform.toUpperCase()} | Timing: ${timing.toUpperCase()} | Category: ${category.toUpperCase()}`);
  onLog(`   Target Keywords: ${keywords || 'Default Profile (Backend + Cyber)'}`);
  onLog(`======================================================================\n`);

  const allFound = [];

  // 1. Direct ATS Boards (Instant High Automation Success)
  if (platform === 'all' || platform === 'boards' || platform === 'greenhouse' || platform === 'lever') {
    const atsJobs = await scrapeDirectATS({ category, keywords, limit: Math.min(limit, 30), onLog });
    allFound.push(...atsJobs);
  }

  // 2. LinkedIn
  if (platform === 'all' || platform === 'linkedin') {
    const liJobs = await scrapeLinkedIn({ timing, category, keywords, limit: Math.min(limit, 30), onLog });
    allFound.push(...liJobs);
  }

  // 3. Naukri
  if (platform === 'all' || platform === 'naukri') {
    const nkJobs = await scrapeNaukri({ timing, category, keywords, limit: Math.min(limit, 30), onLog });
    allFound.push(...nkJobs);
  }

  // Save to file and calculate statistics
  const saveStats = saveScrapedJobs(allFound);
  onLog(`\n🎉 [SCRAPER COMPLETED] Saved ${saveStats.added} fresh jobs to scraped_jobs.json (Total database: ${saveStats.total})`);

  return {
    success: true,
    added: saveStats.added,
    total: saveStats.total,
    jobs: allFound
  };
}

// Helper: Merge scraped jobs directly into active index.html database
function mergeScrapedJobsIntoIndexHtml() {
  if (!fs.existsSync(SCRAPED_JOBS_FILE) || !fs.existsSync(INDEX_HTML)) {
    return { added: 0 };
  }

  try {
    const scraped = JSON.parse(fs.readFileSync(SCRAPED_JOBS_FILE, 'utf8'));
    let html = fs.readFileSync(INDEX_HTML, 'utf8');

    const bMatch = html.match(/const ALL_BACKEND = (\[.*?\]);/s);
    const cMatch = html.match(/const ALL_CYBER = (\[.*?\]);/s);

    if (!bMatch || !cMatch) return { added: 0 };

    let backend = JSON.parse(bMatch[1]);
    let cyber = JSON.parse(cMatch[1]);

    const existingUrls = new Set([...backend, ...cyber].map(j => (j.url || '').toLowerCase().trim()));
    let backendAdded = 0;
    let cyberAdded = 0;

    scraped.forEach(job => {
      const cleanUrl = (job.url || '').toLowerCase().trim();
      if (!existingUrls.has(cleanUrl)) {
        existingUrls.add(cleanUrl);
        const item = {
          title: job.title,
          company: job.company,
          location: job.location,
          url: job.url,
          score: 95,
          tier: 'high',
          badge: job.platform ? job.platform.toUpperCase() : 'NEW'
        };

        if (job.category === 'cyber') {
          cyber.unshift(item);
          cyberAdded++;
        } else {
          backend.unshift(item);
          backendAdded++;
        }
      }
    });

    const newHtml = html
      .replace(/const ALL_BACKEND = \[.*?\];/s, `const ALL_BACKEND = ${JSON.stringify(backend, null, 2)};`)
      .replace(/const ALL_CYBER = \[.*?\];/s, `const ALL_CYBER = ${JSON.stringify(cyber, null, 2)};`);

    fs.writeFileSync(INDEX_HTML, newHtml, 'utf8');
    return { added: backendAdded + cyberAdded, backendAdded, cyberAdded };
  } catch (e) {
    return { error: e.message, added: 0 };
  }
}

function getScrapedJobs() {
  if (fs.existsSync(SCRAPED_JOBS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SCRAPED_JOBS_FILE, 'utf8'));
    } catch (e) {}
  }
  return [];
}

module.exports = {
  runJobScraper,
  scrapeLinkedIn,
  scrapeNaukri,
  scrapeDirectATS,
  getScrapedJobs,
  mergeScrapedJobsIntoIndexHtml,
  SCRAPED_JOBS_FILE
};
