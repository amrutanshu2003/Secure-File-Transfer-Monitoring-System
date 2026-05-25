param(
  [Parameter(Mandatory = $false)]
  [string]$ExePath = "C:\Users\amrut\Documents\Secure File Transfer Monitoring System\installer\output\SFTMSAgentSetup.exe",

  [Parameter(Mandatory = $false)]
  [string]$PfxPath = "C:\Users\amrut\Documents\Secure File Transfer Monitoring System\scripts\sftms-test-signing.pfx",

  [Parameter(Mandatory = $false)]
  [string]$Password = "SFTMS_test_2026!"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ExePath)) {
  throw "EXE not found: $ExePath"
}
if (-not (Test-Path $PfxPath)) {
  throw "PFX not found: $PfxPath"
}

$signtool = Get-ChildItem "C:\Program Files (x86)\Windows Kits" -Recurse -Filter signtool.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
if (-not $signtool) {
  throw "signtool.exe not found. Install Windows SDK."
}

& $signtool sign /f $PfxPath /p $Password /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 $ExePath
Write-Host "Signed: $ExePath"

Get-AuthenticodeSignature $ExePath | Format-List Status,StatusMessage,SignerCertificate
