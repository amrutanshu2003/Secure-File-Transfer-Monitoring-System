param(
  [Parameter(Mandatory = $false)]
  [string]$CertName = "SFTMS Test Publisher",

  [Parameter(Mandatory = $false)]
  [string]$PfxPath = "C:\Users\amrut\Documents\Secure File Transfer Monitoring System\scripts\sftms-test-signing.pfx",

  [Parameter(Mandatory = $false)]
  [string]$Password = "SFTMS_test_2026!"
)

$ErrorActionPreference = "Stop"

$securePassword = ConvertTo-SecureString -String $Password -AsPlainText -Force

$cert = New-SelfSignedCertificate `
  -Type CodeSigningCert `
  -Subject "CN=$CertName" `
  -FriendlyName "SFTMS Test Code Signing" `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -HashAlgorithm SHA256 `
  -NotAfter (Get-Date).AddYears(2)

Export-PfxCertificate -Cert $cert -FilePath $PfxPath -Password $securePassword | Out-Null

$bytes = [System.IO.File]::ReadAllBytes($PfxPath)
$base64 = [System.Convert]::ToBase64String($bytes)
$base64Path = [System.IO.Path]::ChangeExtension($PfxPath, ".base64.txt")
Set-Content -Path $base64Path -Value $base64

Write-Host "Created test cert and PFX:"
Write-Host "PFX: $PfxPath"
Write-Host "BASE64: $base64Path"
Write-Host "PASSWORD: $Password"
