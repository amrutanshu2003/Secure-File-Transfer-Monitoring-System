$ErrorActionPreference = "SilentlyContinue"

$ApiBaseUrl = "https://secure-file-transfer-monitoring.vercel.app"
$EventsUrl = "$ApiBaseUrl/api/events"
$ControlUrl = "$ApiBaseUrl/api/agent-control"
$StopFlag = Join-Path $env:ProgramData "SFTMSAgent.stop"
$Username = $env:USERNAME
$Hostname = $env:COMPUTERNAME

function Set-AgentControl($enabled) {
  try {
    $body = @{ enabled = [bool]$enabled } | ConvertTo-Json -Compress
    Invoke-RestMethod -Uri $ControlUrl -Method POST -ContentType "application/json" -Body $body | Out-Null
  } catch { }
}

function Send-Event($actionType, $srcPath, $dstPath) {
  if (Test-Path $StopFlag) { return }

  $fileName = if ($dstPath -and $dstPath -ne "") {
    [System.IO.Path]::GetFileName($dstPath)
  } else {
    [System.IO.Path]::GetFileName($srcPath)
  }

  $payload = @{
    action_type = $actionType
    file_name = $fileName
    source_path = $srcPath
    destination_path = $dstPath
    username = $Username
    host = $Hostname
  } | ConvertTo-Json -Depth 4

  try {
    Invoke-RestMethod -Uri $EventsUrl -Method POST -ContentType "application/json" -Body $payload | Out-Null
  } catch { }
}

if (Test-Path $StopFlag) {
  exit 0
}

Set-AgentControl $true

$watchPaths = @()
$drives = Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Free -ne $null }
foreach ($drive in $drives) {
  if ($drive.Root) {
    $watchPaths += $drive.Root
  }
}

$watchers = @()
foreach ($path in $watchPaths) {
  if (-not (Test-Path $path)) { continue }

  $watcher = New-Object System.IO.FileSystemWatcher
  $watcher.Path = $path
  $watcher.IncludeSubdirectories = $true
  $watcher.EnableRaisingEvents = $true
  $watcher.NotifyFilter = [System.IO.NotifyFilters]'FileName, DirectoryName, LastWrite, Size'

  Register-ObjectEvent $watcher Created -Action {
    Send-Event "created" $Event.SourceEventArgs.FullPath ""
  } | Out-Null

  Register-ObjectEvent $watcher Changed -Action {
    Send-Event "modified" $Event.SourceEventArgs.FullPath ""
  } | Out-Null

  Register-ObjectEvent $watcher Deleted -Action {
    Send-Event "deleted" $Event.SourceEventArgs.FullPath ""
  } | Out-Null

  Register-ObjectEvent $watcher Renamed -Action {
    Send-Event "moved" $Event.SourceEventArgs.OldFullPath $Event.SourceEventArgs.FullPath
  } | Out-Null

  $watchers += $watcher
}

while ($true) {
  if (Test-Path $StopFlag) { break }
  Start-Sleep -Seconds 1
}
