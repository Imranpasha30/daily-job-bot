@echo off
title LINKEDIN & NAUKRI SAFE AUTHENTICATOR
cls
echo ======================================================================
echo    IMRAN PASHA -- SAFE LINKEDIN ^& NAUKRI PLATFORM AUTHENTICATOR
echo ======================================================================
echo.
echo Launching Google Chrome with dedicated bot session...
echo Profile path: %~dp0.user_browser_profile
echo.
echo Log in to your LinkedIn and Naukri accounts in the browser window that opens.
echo Once logged in, your session is saved locally for safe scraping and applying.
echo.
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --user-data-dir="%~dp0.user_browser_profile" --start-maximized "https://www.linkedin.com/login" "https://www.naukri.com/nlogin/login"
echo.
echo [OK] Chrome has been launched on your desktop!
echo When you finish logging in, you can close Chrome and return to the dashboard.
echo.
pause
