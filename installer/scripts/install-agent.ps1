$ErrorActionPreference = "SilentlyContinue"

$InstallDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AgentScript = Join-Path $InstallDir "agent-runner.ps1"
$TaskName = "SFTMS-Agent"
$BootTaskName = "SFTMS-Agent-Boot"
$StopFlag = Join-Path $env:ProgramData "SFTMSAgent.stop"

if (Test-Path $StopFlag) {
  Remove-Item $StopFlag -Force
}

$taskCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$AgentScript`""

schtasks /Create /F /SC ONLOGON /TN $TaskName /TR $taskCommand /RL HIGHEST | Out-Null
schtasks /Create /F /SC ONSTART /TN $BootTaskName /TR $taskCommand /RL HIGHEST | Out-Null

Start-Process -FilePath "powershell.exe" `
  -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$AgentScript`"" `
  -WindowStyle Hidden
