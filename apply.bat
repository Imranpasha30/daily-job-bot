@echo off
TITLE Imran Pasha - Autonomous AI Job Apply Agent
cd /d "%~dp0"

:MENU
cls
echo ======================================================================
echo          IMRAN PASHA -- AUTONOMOUS AI JOB APPLY AGENT
echo ======================================================================
echo.
echo  Target: Apply to up to 1,000 Backend and Cybersecurity Roles
echo  Profile: Imran Pasha (Sharkify Backend Engineer ~2 yrs, IIT Roorkee PG)
echo.
echo  Choose an application mode:
echo.
echo   [1] Safe Mode (Interactive: browser opens, fills form, waits for review)
echo   [2] Full Auto Mode - Apply to All 1,000+ Jobs (Autonomous background/headful)
echo   [3] Full Auto Mode - Backend Jobs Only (Python, Node.js, FastAPI)
echo   [4] Full Auto Mode - Cybersecurity Jobs Only (SOC, Pentest, Dubai)
echo   [5] Dry Run Test (Fill forms without submitting)
echo   [6] View Application Statistics and History
echo   [7] Exit
echo.
echo ======================================================================
set /p choice="Enter your choice (1-7): "

if "%choice%"=="1" (
    cls
    echo Starting Safe Mode (Press Enter to approve each submission)...
    node agent/apply_agent.js --mode safe
    pause
    goto MENU
)
if "%choice%"=="2" (
    cls
    echo Starting Autonomous 1,000 Job Submitter...
    node agent/apply_agent.js --mode auto --limit 1000
    pause
    goto MENU
)
if "%choice%"=="3" (
    cls
    echo Starting Backend Autonomous Submitter...
    node agent/apply_agent.js --category backend --mode auto --limit 1000
    pause
    goto MENU
)
if "%choice%"=="4" (
    cls
    echo Starting Cybersecurity Autonomous Submitter...
    node agent/apply_agent.js --category cyber --mode auto --limit 1000
    pause
    goto MENU
)
if "%choice%"=="5" (
    cls
    echo Running Dry Run Test...
    node agent/apply_agent.js --dry-run --limit 5
    pause
    goto MENU
)
if "%choice%"=="6" (
    cls
    node agent/apply_agent.js --stats
    pause
    goto MENU
)
if "%choice%"=="7" (
    exit /b 0
)

echo Invalid choice, please try again.
timeout /t 2 >nul
goto MENU
