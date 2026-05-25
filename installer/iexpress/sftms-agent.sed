[Version]
Class=IEXPRESS
SEDVersion=3

[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=%InstallPrompt%
DisplayLicense=%DisplayLicense%
FinishMessage=%FinishMessage%
TargetName=%TargetName%
FriendlyName=%FriendlyName%
AppLaunched=%AppLaunched%
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
SourceFiles=SourceFiles

[Strings]
InstallPrompt=This will install SFTMS Agent and start monitoring file activity on this Windows device.
DisplayLicense=license.txt
FinishMessage=SFTMS Agent installation finished. The agent is now running in the background.
TargetName=output\SFTMSAgentSetup.exe
FriendlyName=SFTMS Agent Setup
AppLaunched=sftms-agent-installer.cmd
FILE0=sftms-agent-installer.cmd
FILE1=license.txt

[SourceFiles]
SourceFiles0=.

[SourceFiles0]
FILE0=
FILE1=
