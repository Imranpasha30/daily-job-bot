@echo off
TITLE Imran Pasha - Autonomous AI Job Apply Agent & Dashboard
cd /d "%~dp0"

:MENU
cls
echo ======================================================================
echo          IMRAN PASHA -- AUTONOMOUS AI JOB APPLY AGENT & UI
echo ======================================================================
echo.
echo  Target: Apply to up to 1,000 Backend and Cybersecurity Roles
echo  Profile: Imran Pasha (Sharkify Backend Engineer ~2 yrs, IIT Roorkee PG)
echo  Claude: Anthropic AI Engine Active
echo.
echo  Choose an option:
echo.
echo   [1] Open Live Web Dashboard (Real-time status, counters, controls at http://localhost:4000)
echo   [2] Safe Mode CLI (Interactive: browser opens, fills form, waits for review)
echo   [3] Full Auto CLI - Apply to All 1,000+ Jobs (Autonomous headful/background)
echo   [4] Full Auto CLI - Backend Jobs Only (Python, Node.js, FastAPI)
echo   [5] Full Auto CLI - Cybersecurity Jobs Only (SOC, Pentest, Dubai)
echo   [6] Dry Run Test (Fill forms without submitting)
echo   [7] View Application Statistics and History
echo   [8] Exit
echo.
echo ======================================================================
set /p choice="Enter your choice (1-8): "

if "%choice%"=="1" (
    cls
    echo Starting Real-Time Web Dashboard...
    start http://localhost:4000
    node dashboard_server.js
    pause
    goto MENU
)
if "%choice%"=="2" (
    cls
    echo Starting Safe Mode (Press Enter to approve each submission)...
    node agent/apply_agent.js --mode safe
    pause
    goto MENU
)
if "%choice%"=="3" (
    cls
    echo Starting Autonomous 1,000 Job Submitter...
    node agent/apply_agent.js --mode auto --limit 1000
    pause
    goto MENU
)
if "%choice%"=="4" (
    cls
    echo Starting Backend Autonomous Submitter...
    node agent/apply_agent.js --category backend --mode auto --limit 1000
    pause
    goto MENU
)
if "%choice%"=="5" (
    cls
    echo Starting Cybersecurity Autonomous Submitter...
    node agent/apply_agent.js --category cyber --mode auto --limit 1000
    pause
    goto MENU
)
if "%choice%"=="6" (
    cls
    echo Running Dry Run Test...
    node agent/apply_agent.js --dry-run --limit 5
    pause
    goto MENU
)
if "%choice%"=="7" (
    cls
    node agent/apply_agent.js --stats
    pause
    goto MENU
)
if "%choice%"=="8" (
    exit /b 0
)

echo Invalid choice, please try again.
timeout /t 2 >nul
goto MENU
