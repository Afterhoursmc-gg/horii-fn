# H0RII FN Chapter 1 legacy host setup
# Run on the Windows VM/host that has your lawful Chapter 1 Fortnite install.
# This script does not download Fortnite, does not patch protected files, and does not bypass Epic/anti-cheat/DRM.

param(
  [string]$ApiUrl = "https://api.fn.horii.dev",
  [string]$FortnitePath = "C:\FortniteBuilds\Chapter1",
  [string]$RebootBackendUrl = "http://127.0.0.1:3551",
  [string]$PublicHost = "185.244.0.19",
  [int]$PublicPort = 7777,
  [string]$BootstrapToken = ""
)

$ErrorActionPreference = "Stop"
$ConfigDir = Join-Path $env:USERPROFILE ".horii-fn"
$ConfigPath = Join-Path $ConfigDir "host-agent.json"
$AgentDir = Join-Path $ConfigDir "host-agent"

function Find-FortniteExe([string]$Root) {
  $roots = @($Root, "C:\FortniteBuilds", "C:\Program Files\Epic Games\Fortnite", "C:\Program Files (x86)\Epic Games\Fortnite") | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique
  foreach ($base in $roots) {
    $direct = Join-Path $base "FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe"
    if (Test-Path $direct) { return $direct }
    $found = Get-ChildItem -Path $base -Filter "FortniteClient-Win64-Shipping.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { return $found.FullName }
  }
  return $null
}

function Probe-Http($Url) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 $Url
    return "HTTP $($r.StatusCode) bytes=$($r.RawContentLength)"
  } catch { return "FAILED: $($_.Exception.Message)" }
}

New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null
New-Item -ItemType Directory -Force -Path $AgentDir | Out-Null

Write-Host "== H0RII FN Chapter 1 Legacy Host =="
Write-Host "Computer: $env:COMPUTERNAME"
Write-Host "Expected Fortnite root: $FortnitePath"

$exe = Find-FortniteExe $FortnitePath
if (-not $exe) {
  Write-Error "No FortniteClient-Win64-Shipping.exe found. Put the lawful Chapter 1 build under C:\FortniteBuilds\Chapter1\ first."
}

$hash = Get-FileHash $exe -Algorithm SHA256
Write-Host "Detected Fortnite exe: $exe"
Write-Host "SHA256: $($hash.Hash)"

Write-Host "Backend probe /fortnite/api/version: $(Probe-Http "$RebootBackendUrl/fortnite/api/version")"
Write-Host "Backend probe /lightswitch/api/service/Fortnite/status: $(Probe-Http "$RebootBackendUrl/lightswitch/api/service/Fortnite/status")"

$udp = Get-NetUDPEndpoint -LocalPort $PublicPort -ErrorAction SilentlyContinue
$tcp = Get-NetTCPConnection -LocalPort $PublicPort -ErrorAction SilentlyContinue
if ($udp -or $tcp) { Write-Host "Game port $PublicPort is bound." } else { Write-Warning "Game port $PublicPort is not bound yet. Start the host runtime before allowReady=true." }

$cfg = [ordered]@{
  apiUrl = $ApiUrl
  bootstrapToken = $BootstrapToken
  hostName = "$env:COMPUTERNAME Chapter 1 Host"
  region = "EU"
  fortnitePath = $FortnitePath
  rebootBackendUrl = $RebootBackendUrl
  publicHost = $PublicHost
  publicPort = $PublicPort
  supportedVersions = @('1.7.2','1.8','1.8.2','1.9','1.10','1.11','2.1.0','2.2.0','2.3.0','2.4.0','2.5.0','3.0','3.1','3.1.1','3.2','3.3','3.5','3.6','4.0','4.1','4.2','4.4','4.5','5.00','5.10','5.21','5.30','5.40','6.00','6.10','6.21','6.22','7.00','7.10','7.20','7.30','7.40','8.00','8.20','8.30','8.40','8.50','8.51')
  agentVersion = '0.2.1-chapter1'
  capacityTotal = 1
  allowReady = $false
}
$cfg | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $ConfigPath
Write-Host "Wrote config: $ConfigPath"
Write-Host "Copy host-agent src into $AgentDir\src\index.ts, then run:"
Write-Host "  node --import tsx .\src\index.ts diagnose"
Write-Host "  node --import tsx .\src\index.ts register"
Write-Host "  node --import tsx .\src\index.ts loop"
Write-Host "Only set allowReady=true after exe + backend + game port are all verified."
