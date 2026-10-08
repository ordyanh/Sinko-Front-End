@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM Git Commit & Push Script for Active Branch
REM ============================================================

REM Always execute from the repository root where this BAT file is located
cd /d "%~dp0"

echo ======================================================
echo   Git Auto Commit and Push
echo ======================================================
echo.

REM 1. Verify Git availability
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git is not installed or not found in PATH!
    goto :END
)

REM 2. Detect current active branch
for /f "delims=" %%B in ('git branch --show-current 2^>nul') do set "CURRENT_BRANCH=%%B"
if not defined CURRENT_BRANCH (
    for /f "delims=" %%B in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "CURRENT_BRANCH=%%B"
)

if not defined CURRENT_BRANCH (
    echo [ERROR] Could not determine the active Git branch!
    goto :END
)

if /i "%CURRENT_BRANCH%"=="HEAD" (
    echo [ERROR] You are in detached HEAD state. Please switch to a branch before pushing.
    goto :END
)

echo Active branch: %CURRENT_BRANCH%
echo.

REM 3. Show current git status
echo --- Current Status ---
git status --short
echo ----------------------
echo.

REM 4. Check if there are uncommitted changes
git status --porcelain | findstr /R "." >nul 2>&1
set "HAS_CHANGES=%ERRORLEVEL%"

REM 5. Determine commit message
set "COMMIT_MSG=%~1"
if not defined COMMIT_MSG (
    if %HAS_CHANGES% EQU 0 (
        set /p "COMMIT_MSG=Enter commit message (press Enter for default): "
    )
)

if not defined COMMIT_MSG (
    set "COMMIT_MSG=Update on %CURRENT_BRANCH% [%DATE% %TIME%]"
)

REM 6. Stage and commit if there are changes
if %HAS_CHANGES% EQU 0 (
    echo.
    echo Staging all changes (git add -A)...
    git add -A

    echo Committing changes: "%COMMIT_MSG%"
    git commit -m "%COMMIT_MSG%"
    if errorlevel 1 (
        echo [ERROR] git commit failed!
        goto :END
    )
    echo Commit created successfully!
) else (
    echo No uncommitted local changes found.
    echo Checking for unpushed commits...
)

echo.
REM 7. Push to current branch on origin
echo Pushing to origin/%CURRENT_BRANCH%...
git push -u origin "%CURRENT_BRANCH%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ======================================================
    echo   [SUCCESS] Successfully pushed to '%CURRENT_BRANCH%'!
    echo ======================================================
) else (
    echo.
    echo ======================================================
    echo   [ERROR] git push failed! Check credentials or conflict.
    echo ======================================================
)

:END
echo.
REM Pause if executed from Windows Explorer (double-click)
echo %cmdcmdline% | findstr /i /c:"%~nx0" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    pause
)

endlocal
exit /b %ERRORLEVEL%
