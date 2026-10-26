/**
 * Imran Pasha — Safe Platform Authenticator
 * Launches native Google Chrome directly on user's desktop to log into LinkedIn & Naukri
 * Saves session cookies and storage locally in .user_browser_profile so scrapers run logged-in with ZERO ban risk
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROFILE_DIR = path.resolve(__dirname, '..', '.user_browser_profile');

if (!fs.existsSync(PROFILE_DIR)) {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
}

let isBrowserOpen = false;

function launchAuthSession() {
  return new Promise((resolve, reject) => {
    console.log('\n' + '='.repeat(70));
    console.log('   🔐  LINKEDIN & NAUKRI SAFE AUTHENTICATION SESSION  🔐');
    console.log('='.repeat(70));
    console.log(' Opening native Google Chrome on your desktop...');
    console.log(` Storage profile: ${PROFILE_DIR}`);
    console.log('='.repeat(70) + '\n');

    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

    let browserExe = chromePath;
    if (!fs.existsSync(chromePath) && fs.existsSync(edgePath)) {
      browserExe = edgePath;
    }

    const urls = '"https://www.linkedin.com/login" "https://www.naukri.com/nlogin/login"';
    const cmd = `start "" "${browserExe}" --user-data-dir="${PROFILE_DIR}" --start-maximized ${urls}`;

    exec(cmd, (error) => {
      if (error) {
        console.error('Failed to launch browser via shell:', error);
        return reject(error);
      }
      isBrowserOpen = true;
      console.log('👉 Native browser launched successfully on user desktop!');
      resolve({ status: 'opened', browser: browserExe, profileDir: PROFILE_DIR });
    });
  });
}

function closeAuthSession() {
  return new Promise((resolve) => {
    // Gracefully release flag
    isBrowserOpen = false;
    resolve({ success: true, message: 'Session flag released' });
  });
}

function isAuthSessionActive() {
  return isBrowserOpen;
}

function checkAuthStatus() {
  const profileExists = fs.existsSync(PROFILE_DIR);
  let hasStorage = false;

  if (profileExists) {
    const defaultDir = path.join(PROFILE_DIR, 'Default');
    if (fs.existsSync(defaultDir)) {
      try {
        const files = fs.readdirSync(defaultDir);
        hasStorage = files.some(f => f.toLowerCase().includes('cookie') || f.toLowerCase().includes('network'));
      } catch (e) {}
    }
  }

  return {
    profileDir: PROFILE_DIR,
    profileExists,
    sessionReady: hasStorage,
    browserActive: isBrowserOpen
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
