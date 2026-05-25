import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function buildCmd(origin) {
  const apiUrl = `${origin}/api/events`;
  const controlUrl = `${origin}/api/agent-control`;
  return `@echo off
setlocal EnableDelayedExpansion
set "AGENT_DIR=%APPDATA%\\SFTMSAgent"
set "AGENT_PS1=%AGENT_DIR%\\agent-runner.ps1"
set "STOP_FLAG=%AGENT_DIR%\\stop.flag"
set "STOP_FLAG_GLOBAL=%PROGRAMDATA%\\SFTMSAgent.stop"
set "TASK_NAME=SFTMS-Agent"
if not exist "%AGENT_DIR%" mkdir "%AGENT_DIR%"
if exist "%STOP_FLAG%" del /f /q "%STOP_FLAG%" >nul 2>nul
if exist "%STOP_FLAG_GLOBAL%" del /f /q "%STOP_FLAG_GLOBAL%" >nul 2>nul

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { $body = @{ enabled = $true } | ConvertTo-Json -Compress; Invoke-RestMethod -Uri '${controlUrl}' -Method POST -ContentType 'application/json' -Body $body | Out-Null } catch { }" >nul 2>nul

> "%AGENT_PS1%" (
  echo $ErrorActionPreference = "SilentlyContinue"
  echo $agentDir = Join-Path $env:APPDATA "SFTMSAgent"
  echo $stopFlag = Join-Path $agentDir "stop.flag"
  echo $stopFlagGlobal = "C:\\ProgramData\\SFTMSAgent.stop"
  echo if ^(Test-Path $stopFlag^) { exit 0 }
  echo if ^(Test-Path $stopFlagGlobal^) { exit 0 }
  echo $apiUrl = "${apiUrl}"
  echo $username = $env:USERNAME
  echo $hostname = $env:COMPUTERNAME
  echo $watchPaths = @^(^)
  echo $drives = Get-PSDrive -PSProvider FileSystem ^| Where-Object { $_.Free -ne $null }
  echo foreach ^($d in $drives^) { if ^($d.Root^) { $watchPaths += $d.Root } }
  echo function Send-Event ^($actionType, $srcPath, $dstPath^) {
  echo   $fileName = if ^($dstPath -and $dstPath -ne ""^) { [System.IO.Path]::GetFileName^($dstPath^) } else { [System.IO.Path]::GetFileName^($srcPath^) }
  echo   $payload = @{
  echo     action_type = $actionType
  echo     file_name = $fileName
  echo     source_path = $srcPath
  echo     destination_path = $dstPath
  echo     username = $username
  echo     host = $hostname
  echo   } ^| ConvertTo-Json -Depth 4
  echo   try { Invoke-RestMethod -Uri $apiUrl -Method POST -ContentType "application/json" -Body $payload ^| Out-Null } catch { }
  echo }
  echo $watchers = @^(^)
  echo foreach ^($path in $watchPaths^) {
  echo   if ^(-not ^(Test-Path $path^)^) { continue }
  echo   $w = New-Object System.IO.FileSystemWatcher
  echo   $w.Path = $path
  echo   $w.IncludeSubdirectories = $true
  echo   $w.EnableRaisingEvents = $true
  echo   $w.NotifyFilter = [System.IO.NotifyFilters]'FileName, DirectoryName, LastWrite, Size'
  echo   Register-ObjectEvent $w Created -Action { Send-Event "created" $Event.SourceEventArgs.FullPath "" } ^| Out-Null
  echo   Register-ObjectEvent $w Changed -Action { Send-Event "modified" $Event.SourceEventArgs.FullPath "" } ^| Out-Null
  echo   Register-ObjectEvent $w Deleted -Action { Send-Event "deleted" $Event.SourceEventArgs.FullPath "" } ^| Out-Null
  echo   Register-ObjectEvent $w Renamed -Action { Send-Event "moved" $Event.SourceEventArgs.OldFullPath $Event.SourceEventArgs.FullPath } ^| Out-Null
  echo   $watchers += $w
  echo }
  echo while ^($true^) {
  echo   if ^(Test-Path $stopFlag^) { break }
  echo   if ^(Test-Path $stopFlagGlobal^) { break }
  echo   Start-Sleep -Seconds 2
  echo }
)

schtasks /Create /F /SC ONLOGON /TN "%TASK_NAME%" /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%AGENT_PS1%""" >nul 2>nul
schtasks /Create /F /SC ONSTART /TN "%TASK_NAME%-Boot" /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%AGENT_PS1%""" >nul 2>nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell.exe -ArgumentList '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%AGENT_PS1%""' -WindowStyle Hidden" >nul 2>nul

echo SFTMS Agent installed and started.
echo It will auto-start on each login.
pause
`;
}

export async function GET(request) {
  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const script = buildCmd(origin);
  return new NextResponse(script, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sftms-agent-installer.cmd"'
    }
  });
}
