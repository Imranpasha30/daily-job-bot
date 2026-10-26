@echo off
title LINKEDIN & NAUKRI SAFE AUTHENTICATOR
cls
echo ======================================================================
echo    IMRAN PASHA -- SAFE LINKEDIN ^& NAUKRI PLATFORM AUTHENTICATOR
echo ======================================================================
echo.
echo Launching dedicated safe authentication browser...
echo Profile path: %~dp0.user_browser_profile
echo.
echo Log in to your LinkedIn, Naukri, and Google accounts in the opened window.
echo Cookies and session tokens will be preserved locally with ZERO ban risk.
echo.
cd /d "%~dp0"
node agent\auth_session.js
echo.
echo Session saved. You can close this window.
pause
