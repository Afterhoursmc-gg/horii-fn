# H0RII FN Remote Host Diagnostics

Generated from live PostgreSQL state after investigating `allocatable = 0`.

## Root cause

There is no verified remote Project Reboot game host available.

The registered rows are test/debug registrations, not real remote game servers. Several rows say `ready`, but they are still rejected because they either have no available capacity, stale/missing heartbeat, or no verified compatible runtime.

Current live `/status` summary after adding explicit blockers:

```json
{
  "remoteHosts": {
    "total": 13,
    "ready": 5,
    "stale": 4,
    "allocatable": 0,
    "no_capacity": 13,
    "unverified": 8,
    "never_heartbeat": 8,
    "blockers": [
      "13 host(s) have no available capacity",
      "4 host(s) have stale heartbeat",
      "8 host(s) never heartbeated",
      "8 host(s) are not verified compatible"
    ]
  }
}
```

The count increased from 12 to 13 during the diagnostic test run because the current E2E flow still registers a test host against the active database. These rows should be cleaned only after owner approval or after a migration/test-isolation fix is merged.

## Per-host report

| Host ID | Name | OS | Ready | Verified | Capacity | Runtime status | Eligible | Rejected because |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `823f2c7e-6f98-4e01-bc5f-a0b3572c78cb` | Test Local Reboot Host | unknown | not_ready | false | 0/1 | none | false | status=registered; ready_state=not_ready; compatibility_unverified; no_capacity; heartbeat_missing |
| `57d7ac4f-bf7b-47bc-b469-7ec3efdf5669` | Test Local Reboot Host | unknown | not_ready | false | 0/1 | none | false | status=registered; ready_state=not_ready; compatibility_unverified; no_capacity; heartbeat_missing |
| `4198376b-e6f7-4433-8ef1-523022748694` | Test Local Reboot Host | unknown | not_ready | false | 0/1 | none | false | status=registered; ready_state=not_ready; compatibility_unverified; no_capacity; heartbeat_missing |
| `790c6645-8d7d-48e5-acae-a999a3d8b60b` | Debug Host | unknown | not_ready | false | 0/1 | none | false | status=registered; ready_state=not_ready; compatibility_unverified; no_capacity; heartbeat_missing |
| `d5af8b5c-4a83-4dd0-a3a6-7747ddcf481f` | Debug Host | unknown | not_ready | false | 0/1 | none | false | status=registered; ready_state=not_ready; compatibility_unverified; no_capacity; heartbeat_missing |
| `b31b884b-88d9-4025-9dec-6d479b283092` | Debug Host | unknown | not_ready | false | 0/1 | none | false | status=registered; ready_state=not_ready; compatibility_unverified; no_capacity; heartbeat_missing |
| `681d862a-aff5-4ec9-901b-ceae30eced06` | Test Local Reboot Host | unknown | not_ready | false | 0/1 | none | false | status=registered; ready_state=not_ready; compatibility_unverified; no_capacity; heartbeat_missing |
| `8de76e4e-4f3c-40f0-976f-0f551c4e542e` | Test Local Reboot Host | unknown | not_ready | false | 0/1 | none | false | status=registered; ready_state=not_ready; compatibility_unverified; no_capacity; heartbeat_missing |
| `486a84f1-74bd-4571-8319-407452f5b622` | Test Local Reboot Host | unknown | ready | true | 0/1 | backendOk=true, gamePortOpen=true, fortniteDetected=true | false | no_capacity; heartbeat_stale |
| `29c8fbdd-e936-421e-8462-3577e03256b6` | Test Local Reboot Host | unknown | ready | true | 0/1 | backendOk=true, gamePortOpen=true, fortniteDetected=true | false | no_capacity; heartbeat_stale |
| `26af827a-2e41-4093-8200-7df8eace8b72` | Test Local Reboot Host | unknown | ready | true | 0/1 | backendOk=true, gamePortOpen=true, fortniteDetected=true | false | no_capacity; heartbeat_stale |
| `1a82a172-7c22-405e-9d3b-59b8f441dc54` | Test Local Reboot Host | unknown | ready | true | 0/1 | backendOk=true, gamePortOpen=true, fortniteDetected=true | false | no_capacity; heartbeat_stale |
| `02d27de7-c1e4-48a1-bb6b-6cbdd0f6c657` | Test Local Reboot Host | unknown | ready | true | 0/1 | test-created | false | no_capacity |

## Why ready > 0 but allocatable = 0

Allocation requires all of this:

```text
status = online
ready_state = ready
verified_compatible = true
capacity_available > 0
last_heartbeat_at fresh within 90 seconds
```

The ready rows fail because `capacity_available = 0`; most also have stale heartbeat. So the backend correctly refuses allocation.

## Duplicate/stale registration finding

The rows are duplicates from test/debug registrations:

- `Test Local Reboot Host`
- `Debug Host`
- `publicHost = 127.0.0.1`
- `baseUrl = http://127.0.0.1:3551`

These are not valid remote VPS game hosts for a Windows PC client. `127.0.0.1` would point to the user's own PC from the client side, not the VPS.

## Client build detection

Launcher v0.1.3 adds read-only detection from Epic installation manifests:

- Checks standard Fortnite shipping executable paths.
- Reads `C:\ProgramData\Epic\EpicGamesLauncher\Data\Manifests\*.item`.
- Matches manifest `InstallLocation`/Fortnite metadata to the detected executable.
- Extracts version/build from fields such as `BuildVersion`, `AppVersion`, `FullAppName`.
- Classifies Project Reboot compatibility without modifying files.

Compatibility rule used:

- Project Reboot README documents S3-S15 support.
- S1-S2 and S16-S19 may be imperfect.
- S20+ is documented unstable.
- Reboot Launcher source marks downloadable builds up to `10.31` as available and `10.40+` as unavailable in the checked list.

## Remote hosting feasibility conclusion

Source evidence:

- Project Reboot README says build with Visual Studio 2022 and run using Reboot Launcher.
- Reboot Launcher README says the CLI is for hosting a Fortnite Server on a Windows VPS and GUI can play/host S0-S14.
- Reboot Launcher host mode launches `FortniteClient-Win64-Shipping.exe` and injects game-server/auth DLLs after login.
- Host mode supports `-nullrhi` for headless rendering, plus `-nosplash` and `-nosound`.
- Game server readiness is checked by UDP ping on port `7777`; auth/backend default is `3551`.
- Public accessibility expects UDP `7777` reachable from clients.

Conclusion:

A remote host path appears technically intended for Windows VPS/Windows host, not Linux-native headless dedicated server. The current Linux VPS has KVM and enough CPU/RAM, but only ASPEED VGA and no gaming GPU. A Windows VM is feasible from virtualization alone, but real Project Reboot/Fortnite runtime viability without GPU is unverified. Do not mark playable until a separate Windows game host or Windows VM actually launches the runtime and a different machine joins.

## Next blocker

The next real blocker is not accounts or locker. It is one real remote Project Reboot host:

1. Choose a Windows game-host target: Windows VPS/bare-metal host preferred; Linux VPS Windows VM possible but GPU/runtime risk remains.
2. Install Reboot Launcher/Project Reboot on that Windows host with a legally obtained compatible build.
3. Start Reboot backend on `3551` and game host on UDP `7777`.
4. Run H0RII host-agent on that same game-host machine.
5. Heartbeat with `capacity_available > 0`, fresh timestamp, real runtime diagnostics, and supported client version.
6. From the gaming PC, install launcher v0.1.3, detect local build version, log in, and attempt allocation.
7. Verify real gameplay: remote host running, client joins from different machine, movement/building/editing/weapons work, evidence recorded.

No mock session counts as evidence.
