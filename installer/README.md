# SFTMS Agent Windows Installer

This folder contains the source for the Windows `.exe` installer.

The installer provides:
- normal Windows wizard UI
- license/accept screen
- install completion screen
- scheduled background agent startup
- uninstall entry in Control Panel / Apps & Features
- uninstall cleanup for scheduled tasks and running agent processes

## Build
Install Inno Setup 6, then run:

```powershell
powershell -ExecutionPolicy Bypass -File installer\build-installer.ps1
```

Output:

```text
installer\output\SFTMSAgentSetup.exe
```

## Agent Target
The installer is configured to send events to:

```text
https://secure-file-transfer-monitoring.vercel.app
```
