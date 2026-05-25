@echo off
setlocal EnableDelayedExpansion

set "API_BASE=https://secure-file-transfer-monitoring.vercel.app"
set "EVENTS_URL=%API_BASE%/api/events"
set "CONTROL_URL=%API_BASE%/api/agent-control"
set "AGENT_DIR=%APPDATA%\SFTMSAgent"
set "AGENT_PS1=%AGENT_DIR%\agent-runner.ps1"
set "STOP_CMD=%AGENT_DIR%\sftms-agent-stop.cmd"
set "STOP_FLAG=%PROGRAMDATA%\SFTMSAgent.stop"
set "TASK_NAME=SFTMS-Agent"
set "BOOT_TASK_NAME=SFTMS-Agent-Boot"

if not exist "%AGENT_DIR%" mkdir "%AGENT_DIR%"
if exist "%STOP_FLAG%" del /f /q "%STOP_FLAG%" >nul 2>nul

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { $body = @{ enabled = $true } | ConvertTo-Json -Compress; Invoke-RestMethod -Uri '%CONTROL_URL%' -Method POST -ContentType 'application/json' -Body $body | Out-Null } catch { }" >nul 2>nul

> "%AGENT_PS1%" (
  echo $ErrorActionPreference = "SilentlyContinue"
  echo $EventsUrl = "%EVENTS_URL%"
  echo $StopFlag = "C:\ProgramData\SFTMSAgent.stop"
  echo $Username = $env:USERNAME
  echo $Hostname = $env:COMPUTERNAME
  echo if ^(Test-Path $StopFlag^) { exit 0 }
  echo function Send-Event ^($actionType, $srcPath, $dstPath^) {
  echo   if ^(Test-Path $StopFlag^) { return }
  echo   $fileName = if ^($dstPath -and $dstPath -ne ""^) { [System.IO.Path]::GetFileName^($dstPath^) } else { [System.IO.Path]::GetFileName^($srcPath^) }
  echo   $payload = @{
  echo     action_type = $actionType
  echo     file_name = $fileName
  echo     source_path = $srcPath
  echo     destination_path = $dstPath
  echo     username = $Username
  echo     host = $Hostname
  echo   } ^| ConvertTo-Json -Depth 4
  echo   try { Invoke-RestMethod -Uri $EventsUrl -Method POST -ContentType "application/json" -Body $payload ^| Out-Null } catch { }
  echo }
  echo $watchPaths = @^(^)
  echo $drives = Get-PSDrive -PSProvider FileSystem ^| Where-Object { $_.Free -ne $null }
  echo foreach ^($d in $drives^) { if ^($d.Root^) { $watchPaths += $d.Root } }
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
  echo while ^($true^) { if ^(Test-Path $StopFlag^) { break }; Start-Sleep -Seconds 1 }
)

> "%STOP_CMD%" (
  echo @echo off
  echo setlocal
  echo set "AGENT_DIR=%%APPDATA%%\SFTMSAgent"
  echo set "STOP_FLAG=%%PROGRAMDATA%%\SFTMSAgent.stop"
  echo echo stop^>"%%STOP_FLAG%%"
  echo powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { $body = @{ enabled = $false } ^| ConvertTo-Json -Compress; Invoke-RestMethod -Uri '%CONTROL_URL%' -Method POST -ContentType 'application/json' -Body $body ^| Out-Null } catch { }" ^>nul 2^>nul
  echo schtasks /End /TN "%TASK_NAME%" ^>nul 2^>nul
  echo schtasks /End /TN "%BOOT_TASK_NAME%" ^>nul 2^>nul
  echo schtasks /Delete /F /TN "%TASK_NAME%" ^>nul 2^>nul
  echo schtasks /Delete /F /TN "%BOOT_TASK_NAME%" ^>nul 2^>nul
  echo powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process ^| Where-Object { $_.Name -match 'powershell.exe^|pwsh.exe^|python.exe^|pythonw.exe' -and ($_.CommandLine -match 'SFTMSAgent' -or $_.CommandLine -match 'agent-runner.ps1' -or $_.CommandLine -match '/api/events' -or $_.CommandLine -match 'local_agent.py') } ^| ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" ^>nul 2^>nul
  echo reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\SFTMS Agent" /f ^>nul 2^>nul
  echo echo SFTMS Agent stopped and uninstalled.
  echo pause
)

schtasks /Create /F /SC ONLOGON /TN "%TASK_NAME%" /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%AGENT_PS1%""" >nul 2>nul
schtasks /Create /F /SC ONSTART /TN "%BOOT_TASK_NAME%" /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%AGENT_PS1%""" >nul 2>nul

reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\SFTMS Agent" /f /v "DisplayName" /t REG_SZ /d "SFTMS Agent" >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\SFTMS Agent" /f /v "DisplayVersion" /t REG_SZ /d "1.0.0" >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\SFTMS Agent" /f /v "Publisher" /t REG_SZ /d "SFTMS" >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\SFTMS Agent" /f /v "InstallLocation" /t REG_SZ /d "%AGENT_DIR%" >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\SFTMS Agent" /f /v "UninstallString" /t REG_SZ /d "\"%STOP_CMD%\"" >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\SFTMS Agent" /f /v "NoModify" /t REG_DWORD /d 1 >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\SFTMS Agent" /f /v "NoRepair" /t REG_DWORD /d 1 >nul

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell.exe -ArgumentList '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%AGENT_PS1%""' -WindowStyle Hidden" >nul 2>nul

echo SFTMS Agent installed successfully.
echo You can uninstall it from Windows Apps and Features.
exit /b 0
