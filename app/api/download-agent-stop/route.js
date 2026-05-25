import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const stopScript = `@echo off
setlocal
set "TASK_NAME=SFTMS-Agent"
set "AGENT_DIR=%APPDATA%\\SFTMSAgent"
set "AGENT_PS1=%AGENT_DIR%\\agent-runner.ps1"
set "STOP_FLAG=%AGENT_DIR%\\stop.flag"

if not exist "%AGENT_DIR%" mkdir "%AGENT_DIR%"
echo stop>"%STOP_FLAG%"

schtasks /End /TN "%TASK_NAME%" >nul 2>nul
schtasks /End /TN "%TASK_NAME%-Boot" >nul 2>nul

schtasks /Delete /F /TN "%TASK_NAME%" >nul 2>nul
schtasks /Delete /F /TN "%TASK_NAME%-Boot" >nul 2>nul

for /f "tokens=2 delims=," %%P in ('tasklist /v /fo csv ^| findstr /i "powershell.exe"') do (
  rem keep loop safe; we only stop hidden agent launched from APPDATA path below
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
"Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'powershell.exe' -and $_.CommandLine -match 'SFTMSAgent\\\\agent-runner.ps1' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>nul

if exist "%AGENT_PS1%" del /f /q "%AGENT_PS1%" >nul 2>nul

echo SFTMS Agent stopped and startup tasks removed.
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
