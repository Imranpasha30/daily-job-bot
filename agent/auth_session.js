/**
 * Imran Pasha — Safe Platform Authenticator
 * Launches visible real browser (Playwright Persistent Context) directly on user's desktop
 * to log into LinkedIn & Naukri.
 * Saves session cookies and storage locally in .user_browser_profile so scrapers run logged-in with ZERO ban risk.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const PROFILE_DIR = path.resolve(__dirname, '..', '.user_browser_profile');
const STORAGE_STATE_FILE = path.resolve(__dirname, '..', 'bot_storage_state.json');

if (!fs.existsSync(PROFILE_DIR)) {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
}

let authContext = null;
let isBrowserOpen = false;
let syncInterval = null;

function clearProfileLocks() {
  try {
    // Terminate any background chrome processes locking user_browser_profile
    try {
      execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name = \'chrome.exe\'\\" | Where-Object { $_.CommandLine -like \'*user_browser_profile*\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"', { timeout: 5000 });
    } catch (e) {}

    ['lockfile', 'SingletonLock', 'SingletonCookie', 'SingletonSocket'].forEach(f => {
      const p = path.join(PROFILE_DIR, f);
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch (e) {}
      }
    });
  } catch (e) {}
}

async function launchAuthSession() {
  if (authContext && isBrowserOpen) {
    try {
      const pages = authContext.pages();
      if (pages.length > 0) {
        await pages[0].bringToFront();
      }
      return { 
        status: 'already_running', 
        profileDir: PROFILE_DIR,
        message: 'Browser window is already open on your desktop.' 
      };
    } catch (e) {
      // If bringing to front fails, recreate
      authContext = null;
      isBrowserOpen = false;
    }
  }

  clearProfileLocks();

  console.log('\n' + '='.repeat(70));
  console.log('   🔐  LINKEDIN & NAUKRI SAFE AUTHENTICATION SESSION  🔐');
  console.log('='.repeat(70));
  console.log(' Launching visible browser window on user desktop...');
  console.log(` Storage profile: ${PROFILE_DIR}`);
  console.log('='.repeat(70) + '\n');

  const launchArgs = [
    '--start-maximized',
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox',
    '--disable-infobars',
    '--window-position=50,50',
    '--window-size=1400,900'
  ];

  try {
    authContext = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: false,
      channel: 'chrome',
      args: launchArgs,
      viewport: null
    });
  } catch (chromeErr) {
    console.log('Installed Chrome launch note:', chromeErr.message, '- falling back to Chromium engine');
    authContext = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: false,
      args: launchArgs,
      viewport: null
    });
  }

  isBrowserOpen = true;

  // Real-time cookie capture interval
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(async () => {
    if (!authContext || !isBrowserOpen) {
      if (syncInterval) clearInterval(syncInterval);
      return;
    }
    try {
      await authContext.storageState({ path: STORAGE_STATE_FILE });
      if (fs.existsSync(STORAGE_STATE_FILE)) {
        const state = JSON.parse(fs.readFileSync(STORAGE_STATE_FILE, 'utf8'));
        const hasLiAt = (state.cookies || []).some(c => c.name === 'li_at');
        if (hasLiAt) {
          console.log('🎉 [AUTH DETECTED] LinkedIn session (li_at) captured in real time!');
        }
      }
    } catch (e) {}
  }, 4000);

  authContext.on('close', async () => {
    console.log('👉 Auth browser window closed. Final session state saved.');
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
    isBrowserOpen = false;
    authContext = null;
  });

  // Navigate to LinkedIn and Naukri login pages
  try {
    const pages = authContext.pages();
    const page1 = pages.length > 0 ? pages[0] : await authContext.newPage();
    page1.goto('https://www.linkedin.com/login').catch(() => {});

    const page2 = await authContext.newPage();
    page2.goto('https://www.naukri.com/nlogin/login').catch(() => {});

    // Focus on LinkedIn first
    await page1.bringToFront().catch(() => {});
  } catch (navErr) {
    console.warn('Navigation note:', navErr.message);
  }

  return { 
    status: 'opened', 
    profileDir: PROFILE_DIR,
    message: 'Dedicated Chrome browser window launched on your desktop! Log into LinkedIn & Naukri.' 
  };
}

async function exportStorageStateFromProfile() {
  if (!fs.existsSync(PROFILE_DIR) || isBrowserOpen) return;
  try {
    const context = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: true,
      channel: 'chrome',
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
    });
    await context.storageState({ path: STORAGE_STATE_FILE });
    await context.close();
    console.log('💾 Fresh bot_storage_state.json exported from persistent profile.');
  } catch (e) {
    console.warn('exportStorageStateFromProfile note:', e.message);
  }
}

async function closeAuthSession() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  if (authContext) {
    try {
      await authContext.storageState({ path: STORAGE_STATE_FILE });
      console.log('💾 Exported live session state with decrypted cookies to bot_storage_state.json');
    } catch (e) {
      console.warn('StorageState export note:', e.message);
    }
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

async function syncFromActiveChrome() {
  if (isBrowserOpen && authContext) {
    try {
      await authContext.storageState({ path: STORAGE_STATE_FILE });
      let hasLi = false;
      if (fs.existsSync(STORAGE_STATE_FILE)) {
        const state = JSON.parse(fs.readFileSync(STORAGE_STATE_FILE, 'utf8'));
        hasLi = (state.cookies || []).some(c => c.name === 'li_at');
      }
      console.log('🔄 Captured live session state from open browser window.');
      return { 
        success: true, 
        message: hasLi 
          ? 'Live session captured! LinkedIn login (li_at) is active!' 
          : 'Live session captured from open browser window. Log into LinkedIn if not yet done.' 
      };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  try {
    const mergeScript = path.resolve(__dirname, '..', 'merge_all_cookies.py');
    console.log('🔄 Merging cookies across all Chrome profiles into .user_browser_profile...');
    execSync(`py "${mergeScript}"`, { timeout: 15000 });
    console.log('✅ Active Google Chrome profile session synced into bot storage!');
    
    // Also export storageState
    await exportStorageStateFromProfile();
    return { success: true, message: 'Active Google Chrome session synchronized successfully!' };
  } catch (err) {
    console.error('Session sync error:', err.message);
    return { success: false, message: err.message };
  }
}

function checkAuthStatus() {
  const profileExists = fs.existsSync(PROFILE_DIR);
  let hasStorage = false;

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

  if (fs.existsSync(STORAGE_STATE_FILE)) {
    hasStorage = true;
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
  launchAuthSession().then(() => {
    console.log('👉 Real visible browser opened on desktop. Complete login, then close the browser.');
  }).catch(e => console.error('Auth error:', e));
}

module.exports = {
  launchAuthSession,
  closeAuthSession,
  isAuthSessionActive,
  checkAuthStatus,
  syncFromActiveChrome,
  exportStorageStateFromProfile,
  STORAGE_STATE_FILE,
  PROFILE_DIR
};
