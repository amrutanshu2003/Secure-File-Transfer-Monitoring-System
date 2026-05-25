#define MyAppName "SFTMS Agent"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "SFTMS"
#define MyAppExeName "agent-runner.ps1"

[Setup]
AppId={{7C9B54FD-9F61-48D2-A791-C2CF1AA46C39}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\SFTMS Agent
DefaultGroupName=SFTMS Agent
DisableProgramGroupPage=yes
LicenseFile=LICENSE.txt
OutputDir=output
OutputBaseFilename=SFTMSAgentSetup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
UninstallDisplayName=SFTMS Agent
VersionInfoVersion={#MyAppVersion}
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription=Secure File Transfer Monitoring System Agent
WizardImageFile=assets\wizard-left.bmp
WizardSmallImageFile=assets\wizard-small.bmp

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "agent\agent-runner.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "scripts\install-agent.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "scripts\uninstall-agent.ps1"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Uninstall SFTMS Agent"; Filename: "{uninstallexe}"

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\install-agent.ps1"""; Flags: runhidden waituntilterminated

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\uninstall-agent.ps1"""; Flags: runhidden waituntilterminated
