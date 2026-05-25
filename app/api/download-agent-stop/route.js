import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const stopScript = `@echo off
setlocal
set "TASK_NAME=SFTMS-Agent"

schtasks /Delete /F /TN "%TASK_NAME%" >nul 2>nul
schtasks /Delete /F /TN "%TASK_NAME%-Boot" >nul 2>nul

for /f "tokens=2 delims=," %%P in ('tasklist /v /fo csv ^| findstr /i "powershell.exe"') do (
  rem keep loop safe; we only stop hidden agent launched from APPDATA path below
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
"Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'powershell.exe' -and $_.CommandLine -match 'SFTMSAgent\\\\agent-runner.ps1' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>nul

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

