@echo off
title Imran Pasha - LinkedIn and Naukri Safe Authenticator
echo ======================================================================
echo    IMRAN PASHA - SAFE ACCOUNT AUTHENTICATION BROWSER
echo ======================================================================
echo  Launching visible Google Chrome window...
echo  - LinkedIn Login
echo  - Naukri Login
echo.
echo  Please log into your accounts in the browser window.
echo  Your active session will be saved automatically with ZERO ban risk.
echo ======================================================================
echo.

cd /d "E:\resume\Jobs"
node -e "const { launchAuthSession } = require('./agent/auth_session'); launchAuthSession().then(() => console.log('\n[ONLINE] Browser is now active on your desktop.\nLog in to LinkedIn & Naukri, then close the browser window when done.\n'));"

pause
