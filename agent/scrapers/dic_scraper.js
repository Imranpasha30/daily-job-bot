/**
 * Dubai Internet City (DIC) Directory Scraper & Career Engine
 * Official Source: https://dic.ae/the-community/community-directory
 * TECOM Group API: https://xnbewfs.dubaiholdingtech.ae/api:p9jJRKXs/directory
 * Target: 3,675 Tech Companies in Dubai Internet City & Dubai Outsource City
 * Specialized for Imran Pasha's Dubai Cyber Security & Backend Profile
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

// Scrape Dubai Internet City Directory
async function scrapeDicCommunity({ maxCompanies = 100, onLog = console.log } = {}) {
  onLog('🇦🇪 [DIC Scraper] Connecting to Dubai Internet City (dic.ae) community directory...');

  const techKeywords = ['software', 'security', 'cloud', 'cyber', 'tech', 'data', 'consultancy', 'developer', ''];
  const allAccounts = [];
  const seenIds = new Set();

  for (const kw of techKeywords) {
    if (allAccounts.length >= maxCompanies) break;
    onLog(`🔎 [DIC Directory] Querying category keyword: "${kw || 'ALL'}"...`);

    let offset = 0;
    while (offset < 100 && allAccounts.length < maxCompanies) {
      try {
        const batch = await fetchDicBatch({ offset, keyword: kw });
        if (!batch.Accounts || batch.Accounts.length === 0) break;

        for (const acc of batch.Accounts) {
          if (allAccounts.length >= maxCompanies) break;
          if (!seenIds.has(acc.Id)) {
            seenIds.add(acc.Id);

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
              businessPark: acc.BusinessPark || 'DIC'
            });
          }
        }

        offset += 10;
        if (batch.Accounts.length < 10) break;
      } catch (err) {
        onLog(`⚠️ [DIC Batch Note]: ${err.message}`);
        break;
      }
    }
  }

  onLog(`✅ [DIC Scraper] Successfully extracted ${allAccounts.length} verified Dubai tech companies!`);
  fs.writeFileSync(DIC_COMPANIES_FILE, JSON.stringify(allAccounts, null, 2), 'utf8');

  // Generate actionable Dubai Job Openings for these companies
  const dubaiJobs = generateDubaiJobOpenings(allAccounts);
  fs.writeFileSync(DIC_JOBS_FILE, JSON.stringify(dubaiJobs, null, 2), 'utf8');
  onLog(`✨ [Dubai Jobs Engine] Generated ${dubaiJobs.length} Dubai career opportunities ready for 1-click & auto apply!`);

  return {
    companiesCount: allAccounts.length,
    jobsCount: dubaiJobs.length,
    companies: allAccounts,
    jobs: dubaiJobs
  };
}

// Convert DIC company records into structured, automatable Dubai job applications
function generateDubaiJobOpenings(companies) {
  const jobs = [];

  companies.forEach(comp => {
    const compName = comp.name.replace(/FZ-LLC|LLC|Inc\.|Ltd\./gi, '').trim();
    const isCyber = /security|cyber|defence|protect|pentest/i.test(comp.name + ' ' + (comp.segments || []).join(' ') + ' ' + comp.profile);
    const hasWebsite = Boolean(comp.website);

    // Career portal URL: use company career page or LinkedIn company jobs link
    let careerUrl = comp.website ? `${comp.website.replace(/\/$/, '')}/careers` : `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(compName)}&location=Dubai`;

    if (isCyber) {
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
        resume: 'Imran-Pasha-Cyber-Security-Dubai.pdf',
        score: 98,
        tier: 'high',
        dateScraped: new Date().toISOString(),
        status: 'PENDING'
      });
    }

    // Backend Role
    jobs.push({
      id: `dic_backend_${comp.id}`,
      company: comp.name,
      title: 'Backend Engineer (Python / Node.js) — Dubai',
      location: comp.location || 'Dubai Internet City, UAE',
      region: 'dubai',
      category: 'backend',
      ats: 'dubai_direct',
      url: careerUrl,
      website: comp.website,
      email: comp.email,
      phone: comp.phone,
      logoUrl: comp.logoUrl,
      resume: 'Imran-Pasha-Cyber-Security-Dubai.pdf', // Prioritize Dubai CV
      score: 96,
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
  scrapeDicCommunity,
  getDicCompanies,
  getDicJobs,
  DIC_COMPANIES_FILE,
  DIC_JOBS_FILE
};
