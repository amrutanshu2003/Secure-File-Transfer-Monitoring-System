import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function buildScript(origin) {
  const apiUrl = `${origin}/api/events`;
  return `
$ErrorActionPreference = "SilentlyContinue"

$apiUrl = "${apiUrl}"
$username = $env:USERNAME
$hostname = $env:COMPUTERNAME
$watchPaths = @(
  "$env:USERPROFILE\\Documents",
  "$env:USERPROFILE\\Desktop",
  "$env:USERPROFILE\\Downloads"
)

function Send-Event($actionType, $srcPath, $dstPath) {
  $fileName = if ($dstPath -and $dstPath -ne "") { [System.IO.Path]::GetFileName($dstPath) } else { [System.IO.Path]::GetFileName($srcPath) }
  $payload = @{
    action_type = $actionType
    file_name = $fileName
    source_path = $srcPath
    destination_path = $dstPath
    username = $username
    host = $hostname
  } | ConvertTo-Json -Depth 4

  try {
    Invoke-RestMethod -Uri $apiUrl -Method POST -ContentType "application/json" -Body $payload | Out-Null
  } catch { }
}

$watchers = @()
foreach ($path in $watchPaths) {
  if (-not (Test-Path $path)) { continue }

  $w = New-Object System.IO.FileSystemWatcher
  $w.Path = $path
  $w.IncludeSubdirectories = $true
  $w.EnableRaisingEvents = $true
  $w.NotifyFilter = [System.IO.NotifyFilters]'FileName, DirectoryName, LastWrite, Size'

  Register-ObjectEvent $w Created -Action {
    Send-Event "created" $Event.SourceEventArgs.FullPath ""
  } | Out-Null

  Register-ObjectEvent $w Changed -Action {
    Send-Event "modified" $Event.SourceEventArgs.FullPath ""
  } | Out-Null

  Register-ObjectEvent $w Deleted -Action {
    Send-Event "deleted" $Event.SourceEventArgs.FullPath ""
  } | Out-Null

  Register-ObjectEvent $w Renamed -Action {
    Send-Event "moved" $Event.SourceEventArgs.OldFullPath $Event.SourceEventArgs.FullPath
  } | Out-Null

  $watchers += $w
}

Write-Host "SFTMS Agent started. Monitoring: $($watchPaths -join ', ')"
while ($true) { Start-Sleep -Seconds 2 }
`.trimStart();
}

export async function GET(request) {
  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const script = buildScript(origin);

  return new NextResponse(script, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sftms-agent.ps1"'
    }
  });
}
