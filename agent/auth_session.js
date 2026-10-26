/**
 * Imran Pasha — Safe Platform Authenticator
 * Launches real Chromium with persistent user profile to log into LinkedIn & Naukri
 * Saves session cookies and storage locally so scrapers & agents run logged-in with ZERO ban risk
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PROFILE_DIR = path.resolve(__dirname, '..', '.user_browser_profile');

if (!fs.existsSync(PROFILE_DIR)) {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
}

let activeAuthContext = null;

async function launchAuthSession() {
  if (activeAuthContext) {
    try {
      const pages = activeAuthContext.pages();
      if (pages.length > 0) {
        await pages[0].bringToFront();
        return { context: activeAuthContext, message: 'Browser already open' };
      }
    } catch (e) {
      activeAuthContext = null;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('   🔐  LINKEDIN & NAUKRI SAFE AUTHENTICATION SESSION  🔐');
  console.log('='.repeat(70));
  console.log(' Opening real visible browser window...');
  console.log(' Log into LinkedIn and Naukri. Your session will be saved locally.');
  console.log(` Storage: ${PROFILE_DIR}`);
  console.log(' Once you have logged in, keep it open or click "Done" in the UI.');
  console.log('='.repeat(70) + '\n');

  try {
    activeAuthContext = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: false,
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      args: [
        '--disable-blink-features=AutomationControlled',
        '--start-maximized',
        '--no-sandbox'
      ]
    });

    activeAuthContext.on('close', () => {
      activeAuthContext = null;
    });

    const page1 = activeAuthContext.pages()[0] || await activeAuthContext.newPage();
    console.log('Opening LinkedIn login...');
    await page1.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' }).catch(() => {});

    const page2 = await activeAuthContext.newPage();
    console.log('Opening Naukri login...');
    await page2.goto('https://www.naukri.com/nlogin/login', { waitUntil: 'domcontentloaded' }).catch(() => {});

    return { context: activeAuthContext, page1, page2, status: 'opened' };
  } catch (err) {
    if (err.message && err.message.includes('Process singleton')) {
      throw new Error('A browser instance is already using this profile. Please close other Chromium windows.');
    }
    throw err;
  }
}

async function closeAuthSession() {
  if (activeAuthContext) {
    try {
      await activeAuthContext.close();
    } catch (e) {}
    activeAuthContext = null;
    return true;
  }
  return false;
}

function isAuthSessionActive() {
  return activeAuthContext !== null;
}

function checkAuthStatus() {
  const profileExists = fs.existsSync(PROFILE_DIR);
  let hasStorage = false;
  if (profileExists) {
    const defaultDir = path.join(PROFILE_DIR, 'Default');
    if (fs.existsSync(defaultDir)) {
      const files = fs.readdirSync(defaultDir);
      hasStorage = files.some(f => f.toLowerCase().includes('cookie') || f.toLowerCase().includes('network'));
    }
  }

  return {
    profileDir: PROFILE_DIR,
    profileExists,
    sessionReady: hasStorage,
    browserActive: isAuthSessionActive()
  };
}

if (require.main === module) {
  launchAuthSession().catch(e => console.error('Auth error:', e));
}

module.exports = {
  launchAuthSession,
  closeAuthSession,
  isAuthSessionActive,
  checkAuthStatus,
  PROFILE_DIR
};
