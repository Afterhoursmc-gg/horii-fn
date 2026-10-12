# H0RII FN Windows local installer
# Installs the local host-agent package from this ZIP. Does not download Fortnite builds.

param(
  [string]$ApiUrl = "https://api.fn.horii.dev",
  [string]$Region = "EU",
  [string]$FortnitePath = "C:\Program Files\Epic Games\Fortnite",
  [string]$RebootBackendUrl = "http://127.0.0.1:3551",
  [string]$PublicHost = "127.0.0.1",
  [int]$PublicPort = 7777
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$InstallDir = Join-Path $env:USERPROFILE ".horii-fn"
$AgentDir = Join-Path $InstallDir "host-agent"
$ConfigPath = Join-Path $InstallDir "host-agent.json"
$LogDir = Join-Path $InstallDir "logs"
$LogPath = Join-Path $LogDir "host-agent.log"

function Test-Cmd($Name) { return [bool](Get-Command $Name -ErrorAction SilentlyContinue) }
function ConvertFrom-SecureStringPlain([securestring]$Secure) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}
function Find-FortniteExe([string]$Base) {
  $candidates = @()
  if ($Base) { $candidates += $Base }
  if ($env:FORTNITE_PATH) { $candidates += $env:FORTNITE_PATH }
  $candidates += "C:\Program Files\Epic Games\Fortnite"
  $candidates += "C:\Program Files (x86)\Epic Games\Fortnite"
  foreach ($dir in $candidates | Select-Object -Unique) {
    if (-not (Test-Path $dir)) { continue }
    $direct = Join-Path $dir "FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe"
    if (Test-Path $direct) { return $direct }
    $found = Get-ChildItem -Path $dir -Filter "FortniteClient-Win64-Shipping.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { return $found.FullName }
  }
  return $null
}

Write-Host "== H0RII FN local installer =="
Write-Host "API: $ApiUrl"
Write-Host "Install dir: $InstallDir"

if (-not (Test-Cmd node)) {
  Write-Host "Node.js LTS missing. Installing via winget..."
  winget install OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}
node --version

try {
  $status = Invoke-WebRequest -UseBasicParsing -TimeoutSec 10 "$ApiUrl/status"
  Write-Host "Backend reachable: HTTP $($status.StatusCode)"
} catch {
  Write-Warning "Backend is not reachable yet: $ApiUrl/status"
  Write-Warning "Install can continue, but register/heartbeat will fail until DNS/backend is live."
}

New-Item -ItemType Directory -Force $AgentDir,$LogDir | Out-Null
Copy-Item -Force (Join-Path $Root "host-agent\dist\index.js") (Join-Path $AgentDir "index.js")
Copy-Item -Force (Join-Path $Root "host-agent\README.txt") (Join-Path $AgentDir "README.txt")

$bootstrapPlain = ""
if (Test-Path $ConfigPath) {
  Write-Host "Existing config found: $ConfigPath"
} else {
  $secure = Read-Host "Paste H0RII FN host bootstrap token (input hidden; leave empty to configure later)" -AsSecureString
  $bootstrapPlain = ConvertFrom-SecureStringPlain $secure
  $cfg = [ordered]@{
    apiUrl = $ApiUrl
    hostName = "$env:COMPUTERNAME Reboot Host"
    region = $Region
    fortnitePath = $FortnitePath
    rebootBackendUrl = $RebootBackendUrl
    publicHost = $PublicHost
    publicPort = $PublicPort
    supportedVersions = @('3.0','3.1','3.1.1','3.2','3.3','3.5','3.6','4.0','4.1','4.2','4.4','4.5','5.00','5.10','5.21','5.30','5.40','6.00','6.10','6.21','6.22','7.00','7.10','7.20','7.30','7.40','8.00','8.20','8.30','8.40','8.50','8.51','9.00','9.10','9.30','9.40','10.00','10.10','10.20','10.31')
    agentVersion = '0.1.0'
    capacityTotal = 1
    allowReady = $false
  }
  if ($bootstrapPlain) { $cfg.bootstrapToken = $bootstrapPlain }
  $cfg | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $ConfigPath
}

$exe = Find-FortniteExe $FortnitePath
if ($exe) {
  Write-Host "Detected Fortnite executable: $exe"
  Get-FileHash $exe -Algorithm SHA256 | Format-List
} else {
  Write-Warning "No FortniteClient-Win64-Shipping.exe detected. Set fortnitePath in $ConfigPath."
}

Write-Host "\nInstalled. Commands:"
Write-Host "  node `"$AgentDir\index.js`" diagnose"
Write-Host "  node `"$AgentDir\index.js`" register"
Write-Host "  node `"$AgentDir\index.js`" heartbeat"
Write-Host "  node `"$AgentDir\index.js`" loop *> `"$LogPath`""
Write-Host "\nReadiness/logs:"
Write-Host "  Get-Content `"$LogPath`" -Tail 120 -Wait"
Write-Host "  Get-Content `"$ConfigPath`""
Write-Host "\nDo not set allowReady=true until Reboot backend, compatible local build, and port 7777 are verified."
