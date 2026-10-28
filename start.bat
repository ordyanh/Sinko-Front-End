@echo off
title Sinko Front-End Launcher
cd /d "%~dp0"

echo ======================================================
echo             Sinko Front-End Launcher
echo ======================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [INFO] Dependencies not found. Running npm install...
    call npm.cmd install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

if /i "%~1"=="remote" goto run_remote
if /i "%~1"=="local" goto run_local
if /i "%~1"=="dev" goto run_dev
if /i "%~1"=="build" goto run_build
if /i "%~1"=="start" goto run_prod

if exist "scripts\switch-backend.js" (
    call node scripts\switch-backend.js status
)

echo.
echo Select an option:
echo   1 - Start with Local Backend         [npm run dev:local] (Recommended)
echo   2 - Start with Remote Cloud Backend  [npm run dev:remote]
echo   3 - Start dev server in current mode [npm run dev]
echo   4 - Build and start production       [npm run build + npm run start]
echo   5 - Switch backend to Local          [npm run use:local]
echo   6 - Switch backend to Remote         [npm run use:remote]
echo   7 - Exit
echo.

set "CHOICE="
set /p "CHOICE=Choice [1-7, Enter = 1]: "
if not defined CHOICE set "CHOICE=1"

set "KEY=%CHOICE:~0,1%"

if "%KEY%"=="1" goto run_local
if "%KEY%"=="2" goto run_remote
if "%KEY%"=="3" goto run_dev
if "%KEY%"=="4" goto run_build
if "%KEY%"=="5" goto switch_local
if "%KEY%"=="6" goto switch_remote
if "%KEY%"=="7" exit /b 0

echo Invalid choice. Starting with Local Backend...
goto run_local

:run_local
echo.
echo [Starting] Local Backend mode...
call npm.cmd run dev:local
goto end

:run_remote
echo.
echo [Starting] Remote Cloud Backend mode...
call npm.cmd run dev:remote
goto end

:run_dev
echo.
echo [Starting] Dev server in current mode...
call npm.cmd run dev
goto end

:run_build
echo.
echo [Building] Running npm run build...
call npm.cmd run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)
:run_prod
echo.
echo [Starting] Production server...
call npm.cmd run start
goto end

:switch_remote
echo.
call npm.cmd run use:remote
pause
goto end

:switch_local
echo.
call npm.cmd run use:local
pause
goto end

:end
if %errorlevel% neq 0 (
    echo.
    echo Server process exited with code %errorlevel%.
    pause
)
