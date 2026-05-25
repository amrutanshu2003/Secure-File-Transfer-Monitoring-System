$ErrorActionPreference = "SilentlyContinue"

$ApiBaseUrl = "https://secure-file-transfer-monitoring.vercel.app"
$ControlUrl = "$ApiBaseUrl/api/agent-control"
$TaskName = "SFTMS-Agent"
$BootTaskName = "SFTMS-Agent-Boot"
$StopFlag = Join-Path $env:ProgramData "SFTMSAgent.stop"

"stop" | Out-File -FilePath $StopFlag -Encoding ascii -Force

try {
  $body = @{ enabled = $false } | ConvertTo-Json -Compress
  Invoke-RestMethod -Uri $ControlUrl -Method POST -ContentType "application/json" -Body $body | Out-Null
} catch { }

schtasks /End /TN $TaskName | Out-Null
schtasks /End /TN $BootTaskName | Out-Null
schtasks /Delete /F /TN $TaskName | Out-Null
schtasks /Delete /F /TN $BootTaskName | Out-Null

for ($i = 0; $i -lt 8; $i++) {
  Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -match "powershell.exe|pwsh.exe|python.exe|pythonw.exe" -and
      ($_.CommandLine -match "SFTMS Agent" -or
       $_.CommandLine -match "SFTMSAgent" -or
       $_.CommandLine -match "agent-runner.ps1" -or
       $_.CommandLine -match "local_agent.py" -or
       $_.CommandLine -match "/api/events")
    } |
    ForEach-Object {
      Stop-Process -Id $_.ProcessId -Force
    }

  Start-Sleep -Milliseconds 250
}
