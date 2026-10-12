# H0RII FN — Windows 11 Local Reboot Host Setup

Target: your own Windows 11 Pro gaming PC.

This setup keeps the Linux VPS as the H0RII FN backend and uses your PC as the local Project Reboot host/client test machine.

## Safety boundary

Do not use this to bypass Epic bans, HWID restrictions, DRM, anti-cheat or entitlement checks. Do not download Fortnite builds from unauthorized mirrors. H0RII FN only detects local files and reports readiness; real gameplay is not marked verified until a client joins and the checklist evidence is recorded.

## What Project Reboot/Reboot Launcher source indicates

- Project Reboot README says:
  - S3–S15 support.
  - S1–S2 and S16–S19 may not work perfectly.
  - S20+ branch is unstable.
  - Build with Visual Studio 2022.
  - Run the server using Reboot Launcher.
- Reboot Launcher README says GUI is stable for playing/hosting Fortnite S0–14.
- Reboot Launcher backend is a LawinServer fork and uses local backend port `3551`.
- Reboot host/game port documented for public/private access is UDP `7777`.
- Reboot Launcher searches for `FortniteClient-Win64-Shipping.exe` under a selected build path.
- Reboot Launcher host mode can run headless and watches logs for login/match-end strings.

## Files you need from this repo

Copy these to your PC:

```text
scripts/windows/setup-horii-fn-host.ps1
apps/host-agent/src/index.ts
apps/host-agent/package.json
apps/host-agent/tsconfig.json
```

Recommended PC folder:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\H0RII-FN" | Out-Null
```

Place the repo files inside that folder preserving paths.

## Install/check dependencies

Open PowerShell as your normal Windows user:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force
cd $env:USERPROFILE\H0RII-FN
.\scripts\windows\setup-horii-fn-host.ps1 `
  -ApiUrl "https://api.fn.horii.dev" `
  -Region "EU" `
  -FortnitePath "C:\Program Files\Epic Games\Fortnite" `
  -RebootBackendUrl "http://127.0.0.1:3551" `
  -PublicHost "127.0.0.1" `
  -PublicPort 7777 `
  -BootstrapToken "PASTE_BACKEND_BOOTSTRAP_TOKEN_HERE"
```

The script checks:

- Windows/PowerShell version.
- Node.js/npm availability.
- Local `FortniteClient-Win64-Shipping.exe` detection.
- SHA256 hash of the detected executable.
- Reboot/Lawin backend probe at `http://127.0.0.1:3551`.
- UDP `7777` listener state.

## Configure host-agent

Config file:

```powershell
notepad $env:USERPROFILE\.horii-fn\host-agent.json
```

Important fields:

```json
{
  "apiUrl": "https://api.fn.horii.dev",
  "region": "EU",
  "fortnitePath": "C:\\Program Files\\Epic Games\\Fortnite",
  "rebootBackendUrl": "http://127.0.0.1:3551",
  "publicHost": "127.0.0.1",
  "publicPort": 7777,
  "capacityTotal": 1,
  "allowReady": false
}
```

Keep `allowReady=false` until all diagnostics are green. The backend will not allocate real sessions unless `allowReady=true`, a compatible executable is detected, backend probe passes, and port readiness is detected.

## Run host-agent

From the folder containing `apps/host-agent`:

```powershell
cd $env:USERPROFILE\H0RII-FN
npm install --workspaces=false
npm install --prefix apps\host-agent
node --import tsx apps\host-agent\src\index.ts diagnose
node --import tsx apps\host-agent\src\index.ts register
node --import tsx apps\host-agent\src\index.ts heartbeat
node --import tsx apps\host-agent\src\index.ts loop
```

After `register`, the bootstrap token is removed from config and replaced with a one-time host token. Do not paste that token in chat.

## Local Reboot host process

Use Reboot Launcher/Project Reboot according to their own setup. H0RII FN does not bundle their DLLs or Fortnite binaries.

Expected local state before setting `allowReady=true`:

```powershell
# Lawin/Reboot backend reachable
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3551/fortnite/api/version

# Game host port present when host is running
Get-NetUDPEndpoint -LocalPort 7777

# Fortnite executable exists in your selected path
Get-ChildItem -Path "C:\Program Files\Epic Games\Fortnite" -Filter FortniteClient-Win64-Shipping.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 FullName
```

If all are green and you have confirmed the selected build is compatible/permitted, set:

```json
"allowReady": true
```

Then run:

```powershell
node --import tsx apps\host-agent\src\index.ts heartbeat
```

Backend should report `allocatable: true` only then.

## Windows launcher build

Windows build is defined in:

```text
.github/workflows/windows-launcher.yml
```

On GitHub:

```powershell
git add .
git commit -m "Add H0RII FN Reboot host integration"
git push
```

Then run workflow:

```text
Actions → Build H0RII FN Windows Launcher → Run workflow
```

Expected artifact:

```text
horii-fn-windows-launcher
```

It should contain portable `.exe` and installer bundles if Tauri packaging succeeds. Do not treat the installer as the portable executable.

## Real gameplay checklist

Record evidence under `evidence/<date>-reboot-test/`:

1. Host-agent `diagnose` output.
2. Host-agent `heartbeat` output showing `allocatable: true`.
3. H0RII FN login screenshot or API login log.
4. Matchmaking response showing `adapter: project_reboot` and real host server ID, not `mock`.
5. Reboot/Lawin backend log around client login.
6. Client join proof: screenshot/video after loading into match.
7. Movement test: WASD + jump.
8. Building test: wall/floor/ramp placement.
9. Editing test: edit piece and confirm collision/geometry.
10. Weapons test: equip/fire/hit or projectile proof.
11. Match end/session-result submission.

`playableVerified` stays false until this evidence is reviewed and linked to the session.
