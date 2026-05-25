$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$IssFile = Join-Path $Root "SFTMSAgentSetup.iss"

$possibleCompilers = @(
  "ISCC.exe",
  "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
  "$env:ProgramFiles\Inno Setup 6\ISCC.exe"
)

$compiler = $null
foreach ($candidate in $possibleCompilers) {
  $resolved = Get-Command $candidate -ErrorAction SilentlyContinue
  if ($resolved) {
    $compiler = $resolved.Source
    break
  }
}

if (-not $compiler) {
  Write-Host "Inno Setup compiler not found."
  Write-Host "Install Inno Setup 6, then run this script again."
  Write-Host "Download: https://jrsoftware.org/isdl.php"
  exit 1
}

Push-Location $Root
try {
  & $compiler $IssFile
  Write-Host "Installer created at: $(Join-Path $Root 'output\SFTMSAgentSetup.exe')"
} finally {
  Pop-Location
}
