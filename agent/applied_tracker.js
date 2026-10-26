/**
 * Imran Pasha — Applied Job History & Anti-Revolving Deduplication Engine
 * Strictly guarantees the bot never revolves around or re-applies to jobs applied earlier.
 * Tracks applications by Job ID, exact URL, normalized URL (stripped params), and Company + Role.
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..');
const HISTORY_FILE = path.join(BASE_DIR, 'applied_history.json');
const CSV_FILE = path.join(BASE_DIR, 'applied_companies.csv');
const MD_FILE = path.join(BASE_DIR, 'applied_companies.md');

function normalizeUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const u = new URL(rawUrl);
    // Remove transient tracking query parameters
    const cleanParams = new URLSearchParams();
    for (const [k, v] of u.searchParams.entries()) {
      if (!/^(utm_|ref|source|tracking|fbclid|gclid|gh_src|_hsenc|_hsmi)/i.test(k)) {
        cleanParams.set(k, v);
      }
    }
    const qs = cleanParams.toString();
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/, '')}${qs ? '?' + qs : ''}`.toLowerCase();
  } catch (e) {
    return String(rawUrl).trim().toLowerCase().replace(/\/+$/, '');
  }
}

function cleanText(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/\b(fz-llc|llc|inc|ltd|pvt|private|limited|technologies|solutions|services|group)\b/gi, '')
    .replace(/[^a-z0-9]/g, '');
}

function loadHistory() {
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      if (!data.applied) data.applied = {};
      if (!data.stats) data.stats = { totalAttempted: 0, successful: 0, failed: 0 };
      return data;
    } catch (e) {
      console.error('Error reading applied_history.json:', e.message);
    }
  }
  return { applied: {}, stats: { totalAttempted: 0, successful: 0, failed: 0 } };
}

function saveHistory(history) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');

    const apps = Object.values(history.applied || {});

    // CSV Output
    const csvRows = [
      ['#', 'Company', 'Role', 'ATS', 'Resume Used', 'Status', 'Date Applied', 'Job URL', 'Proof Screenshot']
    ];
    apps.forEach((app, idx) => {
      csvRows.push([
        idx + 1,
        `"${(app.company || '').replace(/"/g, '""')}"`,
        `"${(app.title || '').replace(/"/g, '""')}"`,
        `"${app.ats || ''}"`,
        `"${app.resume || ''}"`,
        `"${app.status || ''}"`,
        `"${app.date || ''}"`,
        `"${app.url || ''}"`,
        `"${app.screenshot || ''}"`
      ]);
    });
    fs.writeFileSync(CSV_FILE, csvRows.map(r => r.join(',')).join('\n'), 'utf8');

    // Markdown Output
    let md = `# Imran Pasha — Applied Companies Tracking Log\n\n`;
    md += `**Total Applied:** ${apps.filter(a => a.status === 'APPLIED').length} | **Last Updated:** ${new Date().toLocaleString()}\n\n`;
    md += `| # | Company | Role | ATS | Resume Submitted | Date Applied | Job Link | Screenshot Proof |\n`;
    md += `|---|---------|------|-----|------------------|--------------|----------|------------------|\n`;
    apps.forEach((app, idx) => {
      md += `| ${idx + 1} | **${app.company}** | ${app.title} | ${app.ats || 'ATS'} | \`${app.resume}\` | ${new Date(app.date).toLocaleString()} | [Open Job](${app.url}) | ${app.screenshot ? `[View Proof](screenshots/${app.screenshot})` : '--'} |\n`;
    });
    fs.writeFileSync(MD_FILE, md, 'utf8');
  } catch (e) {
    console.error('Error saving history files:', e.message);
  }
}

/**
 * Checks if a job has already been applied.
 * Returns { isApplied: boolean, record: object|null, reason: string }
 */
function checkJobApplied(job, historyObj) {
  if (!job) return { isApplied: false, record: null, reason: '' };

  const history = historyObj || loadHistory();
  const applied = history.applied || {};

  const jobId = job.id;
  const jobUrl = job.url;
  const normUrl = normalizeUrl(jobUrl);
  const compClean = cleanText(job.company);
  const titleClean = cleanText(job.title);

  // 1. Direct ID match
  if (jobId && applied[jobId] && applied[jobId].status === 'APPLIED') {
    return { isApplied: true, record: applied[jobId], reason: 'Matched by Job ID' };
  }

  // 2. Direct URL match
  if (jobUrl && applied[jobUrl] && applied[jobUrl].status === 'APPLIED') {
    return { isApplied: true, record: applied[jobUrl], reason: 'Matched by exact URL' };
  }

  // 3. Scan all entries for normalized URL or Company + Role match
  const entries = Object.values(applied);
  for (const app of entries) {
    if (!app || app.status !== 'APPLIED') continue;

    // A. Normalized URL match
    if (normUrl && app.url && normalizeUrl(app.url) === normUrl) {
      return { isApplied: true, record: app, reason: 'Matched by normalized URL' };
    }

    // B. Same Company + Same Role match
    if (compClean && app.company && cleanText(app.company) === compClean) {
      if (titleClean && app.title && cleanText(app.title) === titleClean) {
        return { isApplied: true, record: app, reason: `Matched duplicate role at ${app.company}` };
      }
    }
  }

  return { isApplied: false, record: null, reason: '' };
}

function isJobApplied(job, historyObj) {
  return checkJobApplied(job, historyObj).isApplied;
}

/**
 * Record a successfully submitted job application
 */
function recordApplication(job, status, extra = {}) {
  const history = loadHistory();
  const id = job.id || job.url;

  const record = {
    company: job.company || 'Unknown',
    title: job.title || 'Role',
    ats: job.ats || 'direct',
    url: job.url || '',
    resume: extra.resume || job.resume || 'Resume.pdf',
    status: status, // 'APPLIED' | 'FAILED' | 'SKIPPED'
    date: new Date().toISOString(),
    screenshot: extra.screenshot || null,
    answersCount: extra.answersCount || 0,
    fieldsFilled: extra.fieldsFilled || 0,
    ...extra
  };

  history.applied[id] = record;
  if (status === 'APPLIED') {
    history.stats.successful = (history.stats.successful || 0) + 1;
  } else if (status === 'FAILED') {
    history.stats.failed = (history.stats.failed || 0) + 1;
  }
  history.stats.totalAttempted = (history.stats.totalAttempted || 0) + 1;

  saveHistory(history);
  return record;
}

/**
 * Filter an array of jobs to exclude all previously applied jobs
 */
function filterUnappliedJobs(jobs, historyObj) {
  const history = historyObj || loadHistory();
  return (jobs || []).filter(j => !isJobApplied(j, history));
}

module.exports = {
  loadHistory,
  saveHistory,
  isJobApplied,
  checkJobApplied,
  recordApplication,
  filterUnappliedJobs,
  normalizeUrl,
  HISTORY_FILE,
  CSV_FILE,
  MD_FILE
};
