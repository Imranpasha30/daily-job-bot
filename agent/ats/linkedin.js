/**
 * LinkedIn Job Application Handler
 * - Off-site Apply: Extracts external employer portal link (Greenhouse, Lever, Ashby, Workday, etc.)
 *   and redirects worker directly to the real application form.
 * - On-site Easy Apply: Handles the LinkedIn modal dialog if session is authenticated.
 * - Non-blocking: Avoids triggering false CAPTCHA alarms when a site requires user sign-in.
 */

const { PROFILE, getNoticePeriod } = require('../profile');

async function handleLinkedIn(page, job, processPageCallback) {
  const result = {
    ats: 'LinkedIn',
    questionsAnswered: 0,
    submitElement: null,
    status: 'PENDING'
  };

  try {
    // 1. Check for off-site apply link (redirects to Greenhouse, Lever, Ashby, or company portal)
    const offsiteLink = await page.$(
      'a[data-tracking-control-name*="apply-link-offsite"], ' +
      'a.jobs-apply-button[href*="http"], ' +
      'a.apply-button[href*="http"], ' +
      'a[href*="greenhouse.io"], a[href*="lever.co"], a[href*="ashbyhq.com"]'
    );

    if (offsiteLink) {
      const targetUrl = await offsiteLink.getAttribute('href');
      if (targetUrl) {
        // If the offsite link redirects to a LinkedIn signup or login wall, skip immediately!
        if (targetUrl.includes('linkedin.com/signup') || targetUrl.includes('linkedin.com/login') || targetUrl.includes('linkedin.com/uas')) {
          console.log(`ℹ️ [LinkedIn Handler] ${job.company} external link is a LinkedIn guest sign-in gate.`);
          result.status = 'REQUIRES_AUTH';
          result.reason = 'Requires platform login';
          return result;
        }

        console.log(`🔗 [LinkedIn Handler] Detected external application link for ${job.company}: ${targetUrl.slice(0, 80)}...`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
        await page.waitForTimeout(2000);
        if (processPageCallback) {
          return await processPageCallback(page, job);
        }
      }
    }

    // 2. Check for On-Site Easy Apply
    const applyBtn = await page.$(
      'button.jobs-apply-button, ' +
      'button[data-tracking-control-name*="apply-link-onsite"], ' +
      'button:has-text("Easy Apply")'
    );

    if (applyBtn) {
      // Check if sign-in modal is shown (user not logged in to LinkedIn)
      const isLoginRequired = await page.$(
        '.contextual-sign-in-modal:not(.hidden), ' +
        '[data-modal*="sign-in"], ' +
        '.nav__button-secondary--login'
      );

      if (isLoginRequired) {
        console.log(`ℹ️ [LinkedIn Handler] ${job.company} requires active LinkedIn session. Skipping guest lock.`);
        result.status = 'REQUIRES_AUTH';
        return result;
      }

      await applyBtn.click().catch(() => {});
      await page.waitForTimeout(2000);

      // Check if clicking apply brought up a sign-in or guest registration prompt
      const passwordField = await page.$('input[name*="password" i], input[type="password"]');
      const signInPrompt = await page.$('.contextual-sign-in-modal, [data-modal*="sign-in"], form[action*="login"], form[action*="signin"]');
      if (passwordField || signInPrompt) {
        console.log(`ℹ️ [LinkedIn Handler] ${job.company} Easy Apply prompt redirected to sign-in modal.`);
        result.status = 'REQUIRES_AUTH';
        result.reason = 'Requires platform login';
        return result;
      }

      // Handle Genuine Easy Apply Modal if opened
      const modal = await page.$('.jobs-easy-apply-modal, div[role="dialog"]');
      if (modal) {
        // Double check modal isn't asking for password
        const modalHasPassword = await modal.$('input[type="password"]');
        if (modalHasPassword) {
          result.status = 'REQUIRES_AUTH';
          result.reason = 'Requires platform login';
          return result;
        }

        const phoneInput = await page.$('input[id*="phoneNumber"], input[name*="phoneNumber"], input[type="tel"]');
        if (phoneInput && !(await phoneInput.inputValue())) {
          await phoneInput.fill(PROFILE.phone);
        }

        const nextBtn = await page.$('button[aria-label="Continue to next step"], button:has-text("Next"), button:has-text("Review")');
        if (nextBtn) await nextBtn.click().catch(() => {});
        await page.waitForTimeout(1000);

        const submitBtn = await page.$('button[aria-label="Submit application"], button:has-text("Submit application")');
        if (submitBtn) {
          result.submitElement = submitBtn;
        }
      }
    }
  } catch (e) {
    console.error(`Error in LinkedIn handler: ${e.message}`);
  }

  return result;
}

module.exports = {
  handleLinkedIn
};
