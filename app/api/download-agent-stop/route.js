import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const stopScript = `@echo off
setlocal
set "TASK_NAME=SFTMS-Agent"
set "AGENT_DIR=%APPDATA%\\SFTMSAgent"
set "AGENT_PS1=%AGENT_DIR%\\agent-runner.ps1"
set "STOP_FLAG=%AGENT_DIR%\\stop.flag"
set "STOP_FLAG_GLOBAL=%PROGRAMDATA%\\SFTMSAgent.stop"

if not exist "%AGENT_DIR%" mkdir "%AGENT_DIR%"
echo stop>"%STOP_FLAG%"
echo stop>"%STOP_FLAG_GLOBAL%"

echo [1/4] Stopping scheduled tasks...
for /f "tokens=1,* delims=," %%A in ('schtasks /Query /FO CSV ^| findstr /I "SFTMS-Agent"') do (
  schtasks /End /TN %%~B >nul 2>nul
  schtasks /Delete /F /TN %%~B >nul 2>nul
)
schtasks /End /TN "%TASK_NAME%" >nul 2>nul
schtasks /End /TN "%TASK_NAME%-Boot" >nul 2>nul

schtasks /Delete /F /TN "%TASK_NAME%" >nul 2>nul
schtasks /Delete /F /TN "%TASK_NAME%-Boot" >nul 2>nul

echo [2/4] Killing running agent processes...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
"Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'powershell.exe|pwsh.exe' -and ($_.CommandLine -match 'SFTMSAgent\\\\agent-runner.ps1' -or $_.CommandLine -match '/api/events') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
"Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'python.exe|pythonw.exe' -and ($_.CommandLine -match 'local_agent.py' -or $_.CommandLine -match 'config/agent.json') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>nul

echo [3/4] Removing local runner...
if exist "%AGENT_PS1%" del /f /q "%AGENT_PS1%" >nul 2>nul

echo [4/4] Verification...
schtasks /Query /FO LIST | findstr /I "SFTMS-Agent" >nul
if %errorlevel%==0 (
  echo WARNING: Some scheduled tasks may still exist. Run this tool as Administrator once.
) else (
  echo OK: No SFTMS scheduled tasks found.
)

echo SFTMS Agent fully stopped. The agent will remain stopped even after you close the CMD window.
pause
`;

export async function GET() {
  return new NextResponse(stopScript, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sftms-agent-stop.cmd"'
    }
  });
}
