@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM Azure Deployment configuration
REM ============================================================
set "TENANT_ID=da7e178e-6040-4a21-86e6-cd2101623209"
set "CLIENT_ID=8d50b8d4-ac56-489a-b5a3-e81c67cb1703"
set "CLIENT_SECRET=u-C8Q~S-Zk-m12fNlIFCEK_GYmG-q5-Y3itCocDy"
set "SUBSCRIPTION_ID=8061f227-7384-4972-a727-0f4b2133336c"
set "RESOURCE_GROUP=Horeca"
set "APP_NAME=Synco-FrontEnd"
set "KUDU_ZIP_URL=https://synco-frontend-fwb5c4cqc8a9buf0.scm.swedencentral-01.azurewebsites.net/api/zipdeploy"
set "KUDU_CMD_URL=https://synco-frontend-fwb5c4cqc8a9buf0.scm.swedencentral-01.azurewebsites.net/api/command"
set "LIVE_URL=https://synco-frontend-fwb5c4cqc8a9buf0.swedencentral-01.azurewebsites.net"

REM Always run from the directory containing this BAT file
cd /d "%~dp0"

echo ========================================
echo   Deploying %APP_NAME% to Azure App Service
echo ========================================
echo.

REM ============================================================
REM 1. Build if npm is available
REM ============================================================
echo [1/6] Building project (npm run build)...

where npm >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call npm run build
    if errorlevel 1 (
        echo [ERROR] npm run build failed!
        exit /b 1
    )
) else (
    echo [WARNING] npm not found in PATH.
    echo          Skipping build and using existing build folder...
)

echo.
REM ============================================================
REM 2. Authenticate
REM ============================================================
echo [2/6] Authenticating with Azure Service Principal...

set "TOKEN_RESPONSE=%TEMP%\synco_azure_token_%RANDOM%.json"

curl.exe -s -X POST "https://login.microsoftonline.com/%TENANT_ID%/oauth2/token" ^
    -H "Content-Type: application/x-www-form-urlencoded" ^
    --data-urlencode "grant_type=client_credentials" ^
    --data-urlencode "client_id=%CLIENT_ID%" ^
    --data-urlencode "client_secret=%CLIENT_SECRET%" ^
    --data-urlencode "resource=https://management.azure.com/" ^
    -o "%TOKEN_RESPONSE%"

if errorlevel 1 (
    echo [ERROR] Failed to contact Azure authentication endpoint!
    del /q "%TOKEN_RESPONSE%" >nul 2>&1
    exit /b 1
)

for /f "usebackq delims=" %%T in (`powershell.exe -NoProfile -Command ^
    "$j=Get-Content -Raw '%TOKEN_RESPONSE%' | ConvertFrom-Json; if($j.access_token){$j.access_token}"`) do (
    set "TOKEN=%%T"
)

del /q "%TOKEN_RESPONSE%" >nul 2>&1

if not defined TOKEN (
    echo [ERROR] Authentication failed!
    echo Please check your Azure Service Principal credentials.
    exit /b 1
)

echo Authentication successful!
echo.

REM ============================================================
REM 3. Create ZIP package
REM ============================================================
echo [3/6] Packaging deployment files...

set "ZIP_PATH=%TEMP%\synco-frontend-deploy.zip"

if exist "%ZIP_PATH%" del /q "%ZIP_PATH%"

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
    "$files=@('build','package.json','package-lock.json','server.js','web.config','public','scripts');" ^
    "$existing=$files | Where-Object { Test-Path -LiteralPath $_ };" ^
    "$missing=$files | Where-Object { -not (Test-Path -LiteralPath $_) };" ^
    "if($missing){Write-Host '[WARNING] Missing:' ($missing -join ', ')};" ^
    "if(-not $existing){Write-Error 'No deployment files found.'; exit 1};" ^
    "Compress-Archive -Path $existing -DestinationPath '%ZIP_PATH%' -Force"

if errorlevel 1 (
    echo [ERROR] Failed to create deployment ZIP!
    exit /b 1
)

echo Package created: %ZIP_PATH%
echo.

REM ============================================================
REM 4. Upload ZIP to Kudu
REM ============================================================
echo [4/6] Uploading package to Azure Kudu ZipDeploy...

curl.exe -s -f -X POST "%KUDU_ZIP_URL%" ^
    -H "Authorization: Bearer %TOKEN%" ^
    -H "Content-Type: application/zip" ^
    --data-binary "@%ZIP_PATH%"

if errorlevel 1 (
    echo.
    echo [ERROR] Zip deployment failed!
    del /q "%ZIP_PATH%" >nul 2>&1
    exit /b 1
)

del /q "%ZIP_PATH%" >nul 2>&1

echo.
echo Zip deployment completed!
echo.

REM ============================================================
REM 5. Ensure dependencies on Azure
REM ============================================================
echo [5/6] Verifying server dependencies on Azure...

set "NPM_CMD_FILE=%TEMP%\synco_dep_cmd_%RANDOM%.json"
set "NPM_RES_FILE=%TEMP%\synco_dep_res_%RANDOM%.json"

echo {"command":"node scripts/azure-check-deps.js","dir":"C:\\home\\site\\wwwroot"} > "%NPM_CMD_FILE%"

curl.exe -s -X POST "%KUDU_CMD_URL%" ^
    -H "Authorization: Bearer %TOKEN%" ^
    -H "Content-Type: application/json" ^
    --data-binary "@%NPM_CMD_FILE%" ^
    -o "%NPM_RES_FILE%"

del /q "%NPM_CMD_FILE%" >nul 2>&1

findstr /C:"\"ExitCode\":0" "%NPM_RES_FILE%" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    del /q "%NPM_RES_FILE%" >nul 2>&1
    echo Dependencies verified!
) else (
    del /q "%NPM_RES_FILE%" >nul 2>&1
    echo Missing dependencies detected. Installing on Azure - please wait...
    set "INSTALL_CMD_FILE=%TEMP%\synco_npm_install_%RANDOM%.json"
    echo {"command":"npm install --omit=dev --no-audit --no-fund","dir":"C:\\home\\site\\wwwroot"} > "%INSTALL_CMD_FILE%"
    curl.exe -s -X POST "%KUDU_CMD_URL%" -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" --data-binary "@%INSTALL_CMD_FILE%" >nul 2>&1
    del /q "%INSTALL_CMD_FILE%" >nul 2>&1
    echo Installation finished!
)

echo.

REM ============================================================
REM 6. Restart web app
REM ============================================================
echo [6/6] Restarting Azure App Service...

curl.exe -s -f -X POST ^
    "https://management.azure.com/subscriptions/%SUBSCRIPTION_ID%/resourceGroups/%RESOURCE_GROUP%/providers/Microsoft.Web/sites/%APP_NAME%/restart?api-version=2022-03-01" ^
    -H "Authorization: Bearer %TOKEN%" ^
    -H "Content-Length: 0"

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to restart Azure App Service!
    exit /b 1
)

powershell.exe -NoProfile -Command "Start-Sleep -Seconds 6"

echo.
echo Checking site health...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
    "try { $res = Invoke-WebRequest -Uri '%LIVE_URL%' -UseBasicParsing -TimeoutSec 15; Write-Host ('Site responded with status: ' + $res.StatusCode) } catch { Write-Host ('Health check notice: ' + $_.Exception.Message) }"

echo.
echo ========================================
echo Deployment finished successfully!
echo Live URL: %LIVE_URL%
echo ========================================
echo.

endlocal
exit /b 0
