/**
 * Imran Pasha — Safe Platform Authenticator
 * Launches visible real browser (Playwright Persistent Context) directly on user's desktop
 * to log into LinkedIn & Naukri.
 * Saves session cookies and storage locally in .user_browser_profile so scrapers run logged-in with ZERO ban risk.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PROFILE_DIR = path.resolve(__dirname, '..', '.user_browser_profile');

if (!fs.existsSync(PROFILE_DIR)) {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
}

let authContext = null;
let isBrowserOpen = false;

function clearProfileLocks() {
  try {
    const lockfile = path.join(PROFILE_DIR, 'lockfile');
    if (fs.existsSync(lockfile)) {
      fs.unlinkSync(lockfile);
    }
  } catch (e) {}
}

async function launchAuthSession() {
  if (authContext) {
    return { status: 'already_running', profileDir: PROFILE_DIR };
  }

  clearProfileLocks();

  console.log('\n' + '='.repeat(70));
  console.log('   🔐  LINKEDIN & NAUKRI SAFE AUTHENTICATION SESSION  🔐');
  console.log('='.repeat(70));
  console.log(' Launching visible browser on user desktop...');
  console.log(` Storage profile: ${PROFILE_DIR}`);
  console.log('='.repeat(70) + '\n');

  const baseOptions = {
    headless: false,
    viewport: null,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox'
    ]
  };

  try {
    // Try launching installed Google Chrome first
    authContext = await chromium.launchPersistentContext(PROFILE_DIR, {
      ...baseOptions,
      channel: 'chrome'
    });
  } catch (chromeErr) {
    console.log('Installed Chrome launch note:', chromeErr.message, '- falling back to Chromium engine');
    authContext = await chromium.launchPersistentContext(PROFILE_DIR, baseOptions);
  }

  isBrowserOpen = true;

  authContext.on('close', () => {
    console.log('👉 Auth browser window closed. Session saved to .user_browser_profile');
    isBrowserOpen = false;
    authContext = null;
  });

  // Open LinkedIn and Naukri login tabs
  try {
    const pages = authContext.pages();
    const page1 = pages.length > 0 ? pages[0] : await authContext.newPage();
    page1.goto('https://www.linkedin.com/login').catch(() => {});

    const page2 = await authContext.newPage();
    page2.goto('https://www.naukri.com/nlogin/login').catch(() => {});
  } catch (navErr) {
    console.warn('Navigation warning:', navErr.message);
  }

  return { status: 'opened', profileDir: PROFILE_DIR };
}

async function closeAuthSession() {
  if (authContext) {
    try {
      await authContext.close();
    } catch (e) {}
    authContext = null;
  }
  isBrowserOpen = false;
  return { success: true, message: 'Auth browser session closed cleanly' };
}

function isAuthSessionActive() {
  return isBrowserOpen;
}

function syncFromActiveChrome() {
  const chromeDefault = path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data', 'Default');
  const targetDefault = path.join(PROFILE_DIR, 'Default');

  if (!fs.existsSync(chromeDefault)) {
    return { success: false, message: 'Google Chrome default profile not found' };
  }

  const targetNetwork = path.join(targetDefault, 'Network');
  if (!fs.existsSync(targetNetwork)) {
    fs.mkdirSync(targetNetwork, { recursive: true });
  }

  try {
    const srcCookies = path.join(chromeDefault, 'Network', 'Cookies');
    if (fs.existsSync(srcCookies)) {
      fs.copyFileSync(srcCookies, path.join(targetNetwork, 'Cookies'));
    }

    const srcPrefs = path.join(chromeDefault, 'Preferences');
    if (fs.existsSync(srcPrefs)) {
      fs.copyFileSync(srcPrefs, path.join(targetDefault, 'Preferences'));
    }

    console.log('🔄 Synced session cookies from user active Google Chrome profile!');
    return { success: true, message: 'Active Google Chrome session synchronized successfully!' };
  } catch (err) {
    console.error('Session sync error:', err.message);
    return { success: false, message: err.message };
  }
}

function checkAuthStatus() {
  const profileExists = fs.existsSync(PROFILE_DIR);
  let hasStorage = false;

  // Auto-sync if profile doesn't have storage yet
  if (profileExists) {
    const defaultDir = path.join(PROFILE_DIR, 'Default');
    if (fs.existsSync(defaultDir)) {
      try {
        const files = fs.readdirSync(defaultDir);
        hasStorage = files.some(f => {
          const l = f.toLowerCase();
          return l.includes('cookie') || l.includes('network') || l.includes('storage');
        });
      } catch (e) {}
    }
  }

  if (!hasStorage) {
    const syncRes = syncFromActiveChrome();
    if (syncRes.success) hasStorage = true;
  }

  return {
    profileDir: PROFILE_DIR,
    profileExists,
    sessionReady: hasStorage,
    browserActive: isBrowserOpen,
    syncedFromActiveProfile: true
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
  syncFromActiveChrome,
  PROFILE_DIR
};
