@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM DigitalOcean App Platform Deployment Script
REM ============================================================

REM Always execute from the repository root where this BAT file is located
cd /d "%~dp0"

REM ------------------------------------------------------------
REM 0. Configuration & Defaults
REM ------------------------------------------------------------
set "APP_NAME=synco-frontend"
set "TARGET_REPO=https://github.com/ordyanh/Sinko-Front-End.git"
set "REMOTE_AUTH_URL=https://lobster-app-zhysf.ondigitalocean.app"
set "REMOTE_CORE_URL=https://octopus-app-bomx6.ondigitalocean.app"

echo ============================================================
echo   Deploying %APP_NAME% to DigitalOcean App Platform
echo ============================================================
echo Auth Service: %REMOTE_AUTH_URL%
echo Core Service: %REMOTE_CORE_URL%
echo.

REM ------------------------------------------------------------
REM 1. Set Remote Backend (DigitalOcean)
REM ------------------------------------------------------------
echo [1/4] Configuring backend endpoints for DigitalOcean...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not found in PATH!
    goto :ERROR_EXIT
)

call node scripts/switch-backend.js remote
if errorlevel 1 (
    echo [ERROR] Failed to switch backend target!
    goto :ERROR_EXIT
)
echo.

REM ------------------------------------------------------------
REM 2. Local Build Validation
REM ------------------------------------------------------------
echo [2/4] Validating build integrity (npm run build)...
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not found in PATH!
    goto :ERROR_EXIT
)

call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] npm run build failed! Fix compilation errors before deploying.
    goto :ERROR_EXIT
)
echo Build completed successfully!
echo.

REM ------------------------------------------------------------
REM 3. Git Commit and Push to GitHub (Triggers DO Auto-Deploy)
REM ------------------------------------------------------------
echo [3/4] Synchronizing changes with GitHub repository...
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git is not found in PATH!
    goto :ERROR_EXIT
)

REM Detect active branch
for /f "delims=" %%B in ('git branch --show-current 2^>nul') do set "CURRENT_BRANCH=%%B"
if not defined CURRENT_BRANCH (
    for /f "delims=" %%B in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "CURRENT_BRANCH=%%B"
)
if not defined CURRENT_BRANCH (
    set "CURRENT_BRANCH=connect-to-backend"
)

echo Active branch: %CURRENT_BRANCH%

REM Check for uncommitted changes
git status --porcelain | findstr /R "." >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Staging and committing local changes...
    set "COMMIT_MSG=%*"
    if not defined COMMIT_MSG (
        set "COMMIT_MSG=Deploy to DigitalOcean [%DATE% %TIME%]"
    )
    git add -A
    git commit -m "!COMMIT_MSG!"
    if errorlevel 1 (
        echo [ERROR] git commit failed!
        goto :ERROR_EXIT
    )
) else (
    echo Working tree clean, checking for unpushed commits...
)

echo Pushing to origin %CURRENT_BRANCH%...
git push origin "%CURRENT_BRANCH%"
if errorlevel 1 (
    echo [ERROR] git push failed! Please check your network and GitHub credentials.
    goto :ERROR_EXIT
)
echo Git push successful!
echo.

REM ------------------------------------------------------------
REM 4. DigitalOcean App Platform Deployment & Verification
REM ------------------------------------------------------------
echo [4/4] Verifying DigitalOcean App Platform deployment...
node scripts/do-deploy.js
if errorlevel 1 (
    echo [WARNING] Deployment verification encountered an issue. Check DO dashboard.
)

echo.
echo ============================================================
echo   Deployment process completed!
echo ============================================================
echo.

goto :FINISH

:ERROR_EXIT
echo.
echo ============================================================
echo   [FAILED] Deployment stopped due to an error.
echo ============================================================
echo.

:FINISH
REM Pause if launched via double-click in Windows Explorer
echo %cmdcmdline% | findstr /i /c:"%~nx0" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    pause
)

exit /b %ERRORLEVEL%
