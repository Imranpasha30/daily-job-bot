// Form Router: Detects ATS type and delegates to specialized handlers
// Includes Auto-Authentication for portals requiring Google/LinkedIn/Email sign-in
// Resolves Google Multi-Account Chooser automatically to select candidate's account

const { handleGreenhouse } = require('./ats/greenhouse');
const { handleAshby } = require('./ats/ashby');
const { handleLever } = require('./ats/lever');
const { handleLinkedIn } = require('./ats/linkedin');
const { handleGeneric } = require('./ats/generic');
const { PROFILE } = require('./profile');

// Resolves Google Account Chooser when multiple Google IDs are logged into the browser
async function resolveGoogleAccountChooser(targetPage, targetEmail = PROFILE.email, targetName = PROFILE.fullName) {
  try {
    const url = targetPage.url();
    if (url.includes('accounts.google.com') || url.includes('google.com/o/oauth2') || url.includes('google.com/signin')) {
      console.log(`🔍 [Google Auth Resolver] Resolving Google Account Chooser for target: "${targetEmail}"...`);
      await targetPage.waitForTimeout(1500);

      // 1. Look for specific account tile matching candidate email
      const accountTile = await targetPage.$(`[data-identifier*="${targetEmail}" i], [data-email*="${targetEmail}" i], div:has-text("${targetEmail}"), li:has-text("${targetEmail}")`);
      if (accountTile && await accountTile.isVisible()) {
        console.log(`✅ [Google Auth Resolver] Found matching Google account tile for ${targetEmail}. Selecting...`);
        await accountTile.click();
        await targetPage.waitForTimeout(2500);
      } else {
        // 2. Fallback to candidate name
        const nameTile = await targetPage.$(`div:has-text("${targetName}"), li:has-text("${targetName}")`);
        if (nameTile && await nameTile.isVisible()) {
          console.log(`✅ [Google Auth Resolver] Found matching account tile for "${targetName}". Selecting...`);
          await nameTile.click();
          await targetPage.waitForTimeout(2500);
        } else {
          // 3. Check for "Use another account" if candidate email is not in the quick list
          const useAnother = await targetPage.$('div:has-text("Use another account"), li:has-text("Use another account"), span:has-text("Use another account")');
          if (useAnother && await useAnother.isVisible()) {
            console.log(`👉 [Google Auth Resolver] Clicking "Use another account" to specify ${targetEmail}...`);
            await useAnother.click();
            await targetPage.waitForTimeout(1500);
            const emailInput = await targetPage.$('input[type="email"]');
            if (emailInput && await emailInput.isVisible()) {
              await emailInput.fill(targetEmail);
              await targetPage.keyboard.press('Enter');
              await targetPage.waitForTimeout(2500);
            }
          }
        }
      }

      // Check for Google OAuth consent/permission screen ("Continue", "Allow", "Confirm")
      const consentBtn = await targetPage.$('button:has-text("Continue"), button:has-text("Allow"), button:has-text("Confirm"), button:has-text("Next"), #submit_approve_access');
      if (consentBtn && await consentBtn.isVisible()) {
        await consentBtn.click();
        await targetPage.waitForTimeout(2000);
      }
      return true;
    }
  } catch (e) {
    console.log(`⚠️ [Google Auth Resolver Note]: ${e.message}`);
  }
  return false;
}

async function handleAutoLoginIfRequired(page, job) {
  try {
    // 1. Check for "Sign in with Google" or "Continue with Google"
    const googleBtn = await page.$('button:has-text("Sign in with Google"), button:has-text("Continue with Google"), a:has-text("Sign in with Google"), [aria-label*="Google" i], div.g_id_signin');
    if (googleBtn && await googleBtn.isVisible()) {
      console.log(`🔐 [Auto-Auth] Detected Google login on ${job.company}. Initiating auto-auth for ${PROFILE.email}...`);

      // Prepare for potential popup window
      const popupPromise = page.context().waitForEvent('page', { timeout: 4000 }).catch(() => null);
      await googleBtn.click();

      const popup = await popupPromise;
      if (popup) {
        await popup.waitForLoadState('domcontentloaded').catch(() => {});
        await resolveGoogleAccountChooser(popup, PROFILE.email, PROFILE.fullName);
      } else {
        await page.waitForTimeout(2000);
        await resolveGoogleAccountChooser(page, PROFILE.email, PROFILE.fullName);
      }
      return true;
    }

    // 2. Check for "Apply with LinkedIn" or "Sign in with LinkedIn"
    const linkedInBtn = await page.$('button:has-text("Apply with LinkedIn"), button:has-text("Sign in with LinkedIn"), a:has-text("Apply with LinkedIn"), .jobs-apply-button');
    if (linkedInBtn && await linkedInBtn.isVisible()) {
      console.log(`🔐 [Auto-Auth] Detected LinkedIn login on ${job.company}. Auto-authorizing using persistent session...`);
      await linkedInBtn.click();
      await page.waitForTimeout(3000);
      return true;
    }

    // 3. Check for standalone email login / verification prompt
    const emailPrompt = await page.$('input[type="email"]:not([name*="first"]):not([id*="first"])');
    const isLoginGate = await page.$('button:has-text("Continue"), button:has-text("Next"), button:has-text("Sign In"), button:has-text("Log In")');
    if (emailPrompt && isLoginGate && (await emailPrompt.isVisible()) && (await isLoginGate.isVisible())) {
      const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
      if (pageText.includes('sign in') || pageText.includes('log in') || pageText.includes('enter your email to apply')) {
        console.log(`🔐 [Auto-Auth] Detected email authentication prompt on ${job.company}. Filling candidate email (${PROFILE.email})...`);
        await emailPrompt.fill(PROFILE.email);
        await page.waitForTimeout(500);
        await isLoginGate.click();
        await page.waitForTimeout(2500);
        return true;
      }
    }
  } catch (e) {
    // Silently continue to form filling
  }
  return false;
}

async function processJobPage(page, job) {
  // Step 1: Automatically handle login prompts if portal requires authentication
  await handleAutoLoginIfRequired(page, job);

  const url = page.url().toLowerCase();

  // Detect ATS type from URL or DOM
  if (url.includes('linkedin.com/jobs/view') || url.includes('linkedin.com/jobs/collections')) {
    return await handleLinkedIn(page, job, processJobPage);
  }

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
  processJobPage,
  handleAutoLoginIfRequired,
  resolveGoogleAccountChooser
};
