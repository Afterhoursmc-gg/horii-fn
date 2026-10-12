# H0RII FN Compatibility Research

Status: engineering baseline, not a gameplay-complete claim.

## Operating boundary

H0RII FN may detect locally installed, lawfully obtained Fortnite files and manage independent H0RII FN accounts, profiles, locker, friends, parties, matchmaking and mock sessions.

H0RII FN must not:
- redistribute Epic/Fortnite binaries,
- download builds from unauthorized mirrors,
- bypass DRM, anti-cheat, bans, HWID restrictions, entitlement checks or Epic authentication,
- claim current Fortnite compatibility unless a permitted client/server test succeeds.

## Sources inspected

### EZFNDEV/FNPrivateServer

Repository: `https://github.com/EZFNDEV/FNPrivateServer`

Observed README claims:
- Private server made for EZFN.DEV.
- Launcher download is provided by repository releases.
- Features listed: access all cosmetics, item shop, dashboard account settings.
- Joining others on the private server is explicitly marked `IN PROGRESS`.

Engineering conclusion:
- Useful as a reference for launcher/account/private-server product shape.
- Not sufficient evidence of verified playable private match support from the public README alone.
- License was not clearly established from extracted README; treat as not reusable until license is checked directly.

### Project Reboot / Project-Reboot-3.0

Repository: `https://github.com/Milxnor/Project-Reboot-3.0`
Website: `https://rebootfn.org/`
Launcher repo: `https://github.com/Auties00/Reboot-Launcher`

Observed claims:
- Project Reboot 3.0 is a Fortnite game server.
- README states support for seasons 3 through 15.
- Seasons 1-2 and 16-19 might not work perfectly.
- S20+ branch is unstable.
- License: BSD-3-Clause.
- Reboot Launcher README says GUI/CLI launcher for Project Reboot and GUI supports playing/hosting Fortnite S0-14.

Engineering conclusion:
- Best candidate for a future *separate verified gameplay adapter* if license and implementation review pass.
- It targets older Fortnite seasons/builds, not latest/current Fortnite.
- Integration likely requires Windows game client/runtime details and potentially networking/client configuration that must be reviewed for legality and safety before implementation.
- No H0RII code may claim playable Reboot sessions until a permitted local client + server test succeeds.

### Sirius

Repository: `https://github.com/GDBOI101/Sirius`

Observed claims:
- TypeScript Fortnite private server backend.
- Public MIT license.
- Tested/supported versions listed from Chapter 1 Season 2 through Chapter 2 Season 4, specific build strings.
- Broken versions listed for Chapter 1 Season 1 and Chapter 1 Season 4 build 4.5.
- Finished features include OAuth, Timeline, CloudStorage, Item Shop, Parties, Friends, Matchmaking Bans, ClientSettings saving and more.
- TODO/WIP includes quests, XP, stats, Arena, voice chat, gifting, Party V2.

Engineering conclusion:
- Useful TypeScript backend reference for legacy private-server API shape.
- It is not evidence of current/latest Fortnite support.
- H0RII FN should not import Sirius code blindly; any reuse needs license notice preservation, security review and endpoint isolation.

## Current H0RII FN adapter status

Implemented adapter in this repository:
- `mock` session adapter only.
- Allocates synthetic session connection details for end-to-end account/party/matchmaking verification.
- Explicitly reports `fortniteCompatibility: not_verified`.

Not implemented yet:
- Reboot adapter.
- Sirius adapter.
- Any launch flags or client modifications.
- Any Epic authentication or entitlement integration.
- Any actual Fortnite playable session.

## Required future verification for playable claim

Before H0RII FN may claim a playable Fortnite session:
1. Identify exact supported build version.
2. Confirm user-provided game files are lawfully obtained and local.
3. Confirm integration does not bypass DRM, anti-cheat, bans, HWID restrictions, or Epic access controls.
4. Build/launch a compatible dedicated server or community server adapter from appropriately licensed source.
5. Connect a compatible local client in a controlled lab.
6. Verify movement, building/editing, weapons and private match lifecycle.
7. Record exact version, commands, logs and limitations.

Until then, product language must say: launcher/backend/lobby/matchmaking are available; Fortnite gameplay is not verified.
