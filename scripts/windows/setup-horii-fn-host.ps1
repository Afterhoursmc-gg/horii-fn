# H0RII FN local Windows host setup
# Run in PowerShell 7+ or Windows PowerShell as your normal user.
# This script does not download Fortnite builds and does not bypass anti-cheat/DRM/Epic controls.

param(
  [string]$ApiUrl = "https://api.fn.horii.dev",
  [string]$Region = "EU",
  [string]$FortnitePath = "",
  [string]$RebootBackendUrl = "http://127.0.0.1:3551",
  [string]$PublicHost = "127.0.0.1",
  [int]$PublicPort = 7777,
  [string]$BootstrapToken = ""
)

$ErrorActionPreference = "Stop"
$ConfigDir = Join-Path $env:USERPROFILE ".horii-fn"
$AgentDir = Join-Path $ConfigDir "host-agent"
$ConfigPath = Join-Path $ConfigDir "host-agent.json"

function Test-Cmd($Name) { return [bool](Get-Command $Name -ErrorAction SilentlyContinue) }
function Find-FortniteExe([string]$Root) {
  $candidates = @()
  if ($Root) { $candidates += $Root }
  if ($env:FORTNITE_PATH) { $candidates += $env:FORTNITE_PATH }
  $candidates += "C:\Program Files\Epic Games\Fortnite"
  $candidates += "C:\Program Files (x86)\Epic Games\Fortnite"
  foreach ($base in $candidates | Select-Object -Unique) {
    if (-not (Test-Path $base)) { continue }
    $direct = Join-Path $base "FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe"
    if (Test-Path $direct) { return $direct }
    $found = Get-ChildItem -Path $base -Filter "FortniteClient-Win64-Shipping.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { return $found.FullName }
  }
  return $null
}

Write-Host "== H0RII FN Windows host preflight =="
Write-Host "OS: $([System.Environment]::OSVersion.VersionString)"
Write-Host "Computer: $env:COMPUTERNAME"
Write-Host "User: $env:USERNAME"
Write-Host "PowerShell: $($PSVersionTable.PSVersion)"

if (-not (Test-Cmd node)) {
  Write-Host "Node.js is missing. Installing LTS with winget..."
  winget install OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}
node --version
npm --version

$exe = Find-FortniteExe $FortnitePath
if ($exe) {
  Write-Host "Detected Fortnite executable: $exe"
  Get-FileHash $exe -Algorithm SHA256 | Format-List
} else {
  Write-Warning "No FortniteClient-Win64-Shipping.exe found. Provide -FortnitePath pointing to a lawful compatible install."
}

Write-Host "Checking Reboot/Lawin backend at $RebootBackendUrl ..."
try {
  $probe = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 "$RebootBackendUrl/fortnite/api/version"
  Write-Host "Backend probe HTTP $($probe.StatusCode) bytes=$($probe.RawContentLength)"
} catch {
  Write-Warning "Backend probe failed. Start Reboot Launcher embedded/local backend or Lawin-compatible backend before setting allowReady=true. $_"
}

$udp = Get-NetUDPEndpoint -LocalPort $PublicPort -ErrorAction SilentlyContinue
if ($udp) { Write-Host "UDP $PublicPort appears bound." } else { Write-Warning "UDP $PublicPort is not currently bound. Reboot host may not be running yet." }

New-Item -ItemType Directory -Force -Path $AgentDir | Out-Null
Push-Location $AgentDir
if (-not (Test-Path "package.json")) {
  npm init -y | Out-Null
  npm install tsx typescript @types/node | Out-Null
}
Pop-Location

if (-not (Test-Path $ConfigPath)) {
  $cfg = [ordered]@{
    apiUrl = $ApiUrl
    bootstrapToken = $BootstrapToken
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
  $cfg | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $ConfigPath
  Write-Host "Created config: $ConfigPath"
} else {
  Write-Host "Config already exists: $ConfigPath"
}

Write-Host "\nNext: copy apps/host-agent/src/index.ts from the H0RII FN repo into:"
Write-Host "  $AgentDir\src\index.ts"
Write-Host "Then run:"
Write-Host "  cd $AgentDir"
Write-Host "  node --import tsx .\src\index.ts diagnose"
Write-Host "  node --import tsx .\src\index.ts register"
Write-Host "  node --import tsx .\src\index.ts loop"
Write-Host "\nDo not set allowReady=true until diagnostics show: Fortnite exe detected, Reboot backend reachable, and UDP/TCP $PublicPort bound."
