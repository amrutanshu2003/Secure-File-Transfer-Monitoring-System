param(
  [Parameter(Mandatory = $false)]
  [string]$ApiBaseUrl = "https://secure-file-transfer-monitoring.vercel.app",

  [Parameter(Mandatory = $false)]
  [string]$FilePath = "installer\\output\\SFTMSAgentSetup.exe",

  [Parameter(Mandatory = $false)]
  [string]$Version = "1.0.0"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $FilePath)) {
  Write-Host "EXE file not found: $FilePath"
  exit 1
}

if (-not $env:AGENT_UPLOAD_KEY) {
  Write-Host "Please set AGENT_UPLOAD_KEY environment variable first."
  exit 1
}

$bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $FilePath))
$base64 = [System.Convert]::ToBase64String($bytes)

$payload = @{
  file_name = [System.IO.Path]::GetFileName($FilePath)
  version = $Version
  mime_type = "application/vnd.microsoft.portable-executable"
  base64_data = $base64
} | ConvertTo-Json -Depth 4

$headers = @{
  "x-agent-upload-key" = $env:AGENT_UPLOAD_KEY
}

$url = "$ApiBaseUrl/api/agent-exe"

Write-Host "Uploading EXE to: $url"
$resp = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -ContentType "application/json" -Body $payload
Write-Host "Upload complete."
$resp | ConvertTo-Json -Depth 5
