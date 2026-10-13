# H0RII FN OGFN Research Stack

This document tracks third-party OGFN components inspected for Chapter 1 legacy compatibility.

## Video description source

YouTube video: `G6RmPV5y4sQ`

Listed sources:

- `PuppeOGFN/Project-Reboot-3.0.1`
- `PuppeOGFN/Starfall`
- `PuppeOGFN/Launcher`
- `PuppeOGFN/Helix-backend`
- `PuppeOGFN/arena-paks`
- `Auties00/Reboot-Launcher`

Additional user-provided sources:

- `31Benzi/Better-Reload`
- `plooshi/Tellurium`
- `fortforge.co.uk/builds`
- `builds.cbn.lol/builds`

## What can be used safely

### Backend / account / profile / matchmaking APIs

Candidates:

- Better-Reload
- Helix-backend
- Lawin-style endpoints inside these backends
- Matchmaker websocket components

These are server-side components and can be staged locally for API compatibility testing.

### Build metadata

Build archive pages can be used for metadata only:

- version numbers
- CL numbers
- season mapping
- expected build identifiers

Do not download Fortnite binaries from mirrors as part of H0RII automation.

## What cannot be used directly by H0RII automation

### Tellurium / Starfall

Tellurium README describes it as a `redirect/SSL bypass` for UE HTTP games, and the source is a DLL loaded through `DllMain` with hook initialization.

Observed config:

- backend URL: `http://127.0.0.1:3551`
- URL redirect modes: Default, Hybrid, Dev, All
- manual mapping option

H0RII will not automate DLL injection, SSL bypass, anti-cheat bypass, DRM bypass, Epic auth bypass, or protected-client patching.

Tellurium/Starfall can be used only as architecture reference for understanding which backend endpoints old private-server stacks expect.

### Project Reboot / launcher forks

Some launchers include flags and runtime behavior that may depend on client patching, anti-cheat disablement, or DLL loading. H0RII will not mark this playable until a lawful compatible build and runtime are tested without prohibited bypass work.

## Current recommended target

Chapter 1 Season 8 metadata:

- 8.51: `++Fortnite+Release-8.51-CL-6165369`
- 8.50: `++Fortnite+Release-8.50-CL-6058028`
- 8.40: `++Fortnite+Release-8.40-CL-6005771`
- 8.30: `++Fortnite+Release-8.30-CL-5793395`
- 8.20: `++Fortnite+Release-8.20-CL-5625478`
- 8.00: `++Fortnite+Release-8.00-CL-5203069`

Use 8.51 or 8.50 first only if a lawful compatible build is provided by the user.

## Next safe implementation step

1. Stage Better-Reload or Helix backend locally.
2. Verify `/`, `/unknown`, `/fortnite/api/version`, `/lightswitch/api/service/Fortnite/status`, and matchmaking endpoints.
3. Point H0RII host-agent probes at the staged backend.
4. Keep host `allocatable=false` until a lawful old client/runtime join test succeeds.
