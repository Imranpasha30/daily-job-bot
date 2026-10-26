// Form Router: Detects ATS type and delegates to specialized handlers
const { handleGreenhouse } = require('./ats/greenhouse');
const { handleAshby } = require('./ats/ashby');
const { handleLever } = require('./ats/lever');
const { handleGeneric } = require('./ats/generic');

async function processJobPage(page, job) {
  const url = page.url().toLowerCase();

  // Detect ATS type from URL or DOM
  if (url.includes('greenhouse.io') || url.includes('gh_jid=')) {
    return await handleGreenhouse(page, job);
  }

  if (url.includes('ashbyhq.com')) {
    return await handleAshby(page, job);
  }

  if (url.includes('lever.co')) {
    return await handleLever(page, job);
  }

  // Check DOM markers if custom domain embeds Greenhouse / Ashby / Lever
  try {
    const isGhEmbedded = await page.$('iframe[src*="greenhouse.io"], form#application_form, div#grnhse_app');
    if (isGhEmbedded) {
      return await handleGreenhouse(page, job);
    }

    const isAshbyEmbedded = await page.$('iframe[src*="ashbyhq.com"], div#ashby_app');
    if (isAshbyEmbedded) {
      return await handleAshby(page, job);
    }

    const isLeverEmbedded = await page.$('iframe[src*="lever.co"], div.lever-form');
    if (isLeverEmbedded) {
      return await handleLever(page, job);
    }
  } catch (e) {}

  // Fallback to Universal Generic Heuristic Handler
  return await handleGeneric(page, job);
}

module.exports = {
  processJobPage
};
