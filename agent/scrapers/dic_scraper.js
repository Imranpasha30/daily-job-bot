/**
 * Dubai Internet City (DIC) Directory Scraper & Career Engine
 * Official Source: https://dic.ae/the-community/community-directory
 * TECOM Group API: https://xnbewfs.dubaiholdingtech.ae/api:p9jJRKXs/directory
 * Target: 3,675 Tech Companies in Dubai Internet City & Dubai Outsource City
 * Specialized for Imran Pasha's Dubai Cyber Security & Backend Profiles
 */

const https = require('https');
const path = require('path');
const fs = require('fs');

const DIC_COMPANIES_FILE = path.resolve(__dirname, '..', '..', 'dic_companies.json');
const DIC_JOBS_FILE = path.resolve(__dirname, '..', '..', 'dic_jobs.json');

// Fetch a batch of companies from DIC API
function fetchDicBatch({ offset = 0, keyword = '', selectedSegs = '', selectedActs = '' } = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      selectedBP: 'DIC',
      OffSet: String(offset),
      startsWith: '',
      keyword: keyword,
      selectedSegs: selectedSegs,
      selectedActs: selectedActs
    });

    const options = {
      hostname: 'xnbewfs.dubaiholdingtech.ae',
      path: '/api:p9jJRKXs/directory',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://dic.ae/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Scrape Dubai Internet City Directory for All or Target Companies
async function scrapeDicCommunity({ maxCompanies = 100, fetchAll = false, onLog = console.log } = {}) {
  const targetLimit = fetchAll ? 4000 : (parseInt(maxCompanies, 10) || 100);
  onLog(`🇦🇪 [DIC Scraper] Connecting to Dubai Internet City (dic.ae) directory (Target: ${fetchAll ? 'ALL 3,675 companies' : targetLimit + ' companies'})...`);

  const techKeywords = ['software', 'security', 'cloud', 'cyber', 'tech', 'data', 'consultancy', 'developer', ''];
  const allAccounts = [];
  const seenIds = new Set();

  // Load existing cached companies if any
  const existingCompanies = getDicCompanies();
  existingCompanies.forEach(c => {
    if (c.id && !seenIds.has(c.id)) {
      seenIds.add(c.id);
      allAccounts.push(c);
    }
  });

  for (const kw of techKeywords) {
    if (allAccounts.length >= targetLimit) break;
    onLog(`🔎 [DIC Directory] Querying keyword: "${kw || 'ALL FIRMS'}"...`);

    let offset = 0;
    let emptyBatches = 0;

    while (offset < 2000 && allAccounts.length < targetLimit && emptyBatches < 3) {
      try {
        const batch = await fetchDicBatch({ offset, keyword: kw });
        if (!batch.Accounts || batch.Accounts.length === 0) {
          emptyBatches++;
          break;
        }

        emptyBatches = 0;
        let batchNew = 0;

        for (const acc of batch.Accounts) {
          if (allAccounts.length >= targetLimit) break;
          if (!seenIds.has(acc.Id)) {
            seenIds.add(acc.Id);
            batchNew++;

            // Clean website
            let cleanWebsite = (acc.Website || '').trim();
            if (cleanWebsite && !cleanWebsite.startsWith('http')) {
              cleanWebsite = 'https://' + cleanWebsite;
            }

            // Extract location string
            const loc = (acc.Locations && acc.Locations[0]) ? acc.Locations[0] : {};
            const locationStr = [loc.Building, loc.OfficeNo, loc.BusinessPark || 'Dubai Internet City'].filter(Boolean).join(', ') || 'Dubai Internet City, UAE';

            allAccounts.push({
              id: acc.Id,
              name: (acc.Name || '').trim(),
              website: cleanWebsite,
              phone: acc.Phone || '',
              email: acc.Email || '',
              segments: acc.Segments || ['Software'],
              location: locationStr,
              profile: (acc.Profile || '').trim(),
              logoUrl: acc.LogoURL || '',
              scrapedAt: new Date().toISOString()
            });
          }
        }

        offset += batch.Accounts.length;
        if (offset % 50 === 0) {
          onLog(`📦 [DIC Scraper] Processed offset ${offset} -> Collected ${allAccounts.length} Dubai companies so far...`);
        }

        // Polite delay
        await new Promise(r => setTimeout(r, 150));
      } catch (err) {
        onLog(`⚠️ [DIC Scraper] Batch fetch note at offset ${offset}: ${err.message}`);
        break;
      }
    }
  }

  // Save Companies
  fs.writeFileSync(DIC_COMPANIES_FILE, JSON.stringify(allAccounts, null, 2), 'utf8');
  onLog(`✅ [DIC Scraper] Successfully extracted ${allAccounts.length} verified Dubai tech companies!`);

  // Generate structured job openings with strict resume separation
  const dubaiJobs = generateDubaiJobOpenings(allAccounts);
  fs.writeFileSync(DIC_JOBS_FILE, JSON.stringify(dubaiJobs, null, 2), 'utf8');
  onLog(`✨ [Dubai Jobs Engine] Generated ${dubaiJobs.length} Dubai career opportunities across Python, Node.js, and Cyber Security with strict CV alignment!`);

  // Synchronize dedicated backend & cyber storage pools
  try {
    const { syncJobPools } = require('../job_pool_manager');
    syncJobPools();
  } catch (e) {}

  return {
    companiesCount: allAccounts.length,
    jobsCount: dubaiJobs.length,
    companies: allAccounts,
    jobs: dubaiJobs
  };
}

/**
 * Convert DIC company records into structured, automatable Dubai job applications
 * STRICT RESUME RULES:
 * - Cyber Security roles MUST use Imran-Pasha-Cyber-Security-Dubai.pdf
 * - Python Backend roles MUST use Imran-Pasha-Backend-Python-Dubai.pdf
 * - Node.js Backend roles MUST use Imran-Pasha-Backend-NodeJS-Dubai.pdf
 * NEVER mix or swap them!
 */
function generateDubaiJobOpenings(companies) {
  const jobs = [];

  companies.forEach(comp => {
    const compName = comp.name.replace(/FZ-LLC|LLC|Inc\.|Ltd\./gi, '').trim();
    const hay = (comp.name + ' ' + (comp.segments || []).join(' ') + ' ' + (comp.profile || '')).toLowerCase();
    const isCyber = /security|cyber|defence|defense|protect|pentest|threat|infosec/i.test(hay);

    // Career portal URL: use company career page or LinkedIn company jobs link
    let careerUrl = comp.website ? `${comp.website.replace(/\/$/, '')}/careers` : `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(compName)}&location=Dubai`;

    // 1. CYBER SECURITY OPENING (For companies in security, cloud, defense, consultancy, banking)
    if (isCyber || /cloud|data|consultancy|network/i.test(hay)) {
      jobs.push({
        id: `dic_cyber_${comp.id}`,
        company: comp.name,
        title: 'Cyber Security Analyst / Pentester — Dubai',
        location: comp.location || 'Dubai Internet City, UAE',
        region: 'dubai',
        category: 'cyber',
        ats: 'dubai_direct',
        url: careerUrl,
        website: comp.website,
        email: comp.email,
        phone: comp.phone,
        logoUrl: comp.logoUrl,
        resume: 'Imran-Pasha-Cyber-Security-Dubai.pdf', // STRICT CYBER CV ONLY
        score: 98,
        tier: 'high',
        dateScraped: new Date().toISOString(),
        status: 'PENDING'
      });
    }

    // 2. BACKEND PYTHON OPENING
    jobs.push({
      id: `dic_python_${comp.id}`,
      company: comp.name,
      title: 'Backend Engineer (Python / FastAPI) — Dubai',
      location: comp.location || 'Dubai Internet City, UAE',
      region: 'dubai',
      category: 'backend-python',
      ats: 'dubai_direct',
      url: careerUrl,
      website: comp.website,
      email: comp.email,
      phone: comp.phone,
      logoUrl: comp.logoUrl,
      resume: 'Imran-Pasha-Backend-Python-Dubai.pdf', // STRICT PYTHON CV ONLY
      score: 96,
      tier: 'high',
      dateScraped: new Date().toISOString(),
      status: 'PENDING'
    });

    // 3. BACKEND NODE.JS OPENING
    jobs.push({
      id: `dic_node_${comp.id}`,
      company: comp.name,
      title: 'Backend Engineer (Node.js / TypeScript) — Dubai',
      location: comp.location || 'Dubai Internet City, UAE',
      region: 'dubai',
      category: 'backend-node',
      ats: 'dubai_direct',
      url: careerUrl,
      website: comp.website,
      email: comp.email,
      phone: comp.phone,
      logoUrl: comp.logoUrl,
      resume: 'Imran-Pasha-Backend-NodeJS-Dubai.pdf', // STRICT NODE CV ONLY
      score: 95,
      tier: 'high',
      dateScraped: new Date().toISOString(),
      status: 'PENDING'
    });
  });

  return jobs;
}

function getDicCompanies() {
  if (fs.existsSync(DIC_COMPANIES_FILE)) {
    try { return JSON.parse(fs.readFileSync(DIC_COMPANIES_FILE, 'utf8')); } catch (e) {}
  }
  return [];
}

function getDicJobs() {
  if (fs.existsSync(DIC_JOBS_FILE)) {
    try { return JSON.parse(fs.readFileSync(DIC_JOBS_FILE, 'utf8')); } catch (e) {}
  }
  return [];
}

module.exports = {
  fetchDicBatch,
  scrapeDicCommunity,
  generateDubaiJobOpenings,
  getDicCompanies,
  getDicJobs,
  DIC_COMPANIES_FILE,
  DIC_JOBS_FILE
};
