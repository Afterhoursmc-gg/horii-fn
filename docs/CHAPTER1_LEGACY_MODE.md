# H0RII FN Chapter 1 Legacy Mode

H0RII FN primary runtime is the original `horii_runtime` stack. Chapter 1 is a separate legacy compatibility mode for lawfully obtained old Fortnite builds.

## Target

Use Chapter 1-era Fortnite only as a compatibility target:

- Preferred range: Chapter 1 / S3-S14 based on Project Reboot/Reboot Launcher source notes.
- Extended/unverified: S15 may work depending on runtime evidence.
- Avoid for now: S1-S2 and S16+ because upstream notes mark them imperfect/unstable or outside the narrower launcher support.

## Required user-supplied build

The user must provide or install a legally obtained compatible build on the Windows host. H0RII FN must not download, redistribute, mirror, or bundle Fortnite binaries.

Recommended host path:

```text
C:\FortniteBuilds\Chapter1\<version>\FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe
```

Examples of candidate versions to validate first:

```text
10.31
10.40
14.40
14.60
```

Do not assume a version works because the executable exists. Validate metadata and perform a real join test.

## Adapter boundary

Chapter 1 mode can use a legacy adapter/runtime path, but it is not H0RII's core runtime.

Allowed H0RII-owned pieces:

- H0RII login/account/profile/party/matchmaking.
- Host registration and heartbeat.
- Read-only build detection and hashing.
- Session allocation and diagnostics.
- Operator-owned runtime process management on a Windows host.

Not allowed:

- Downloading Fortnite builds from unauthorized mirrors.
- Distributing Fortnite binaries in releases.
- Bypassing Epic bans, DRM, anti-cheat, HWID restrictions, or entitlement checks.
- Marking a host playable before a real client joins and gameplay works.

## Verification gate

Before marking a Chapter 1 host allocatable/playable:

1. Build path exists on the Windows host.
2. SHA256 recorded locally for diagnostics.
3. Build version detected from manifests/metadata/version info.
4. Version is in the configured Chapter 1 target range.
5. Legacy runtime/backend starts on the Windows host.
6. Backend endpoint responds, commonly `http://127.0.0.1:3551` for Lawin/Reboot-style setups.
7. Game/session port is reachable, commonly UDP `7777` when configured.
8. H0RII host-agent sends fresh heartbeat with `verified_compatible=true` only after operator confirmation.
9. H0RII matchmaking allocates a non-mock legacy session.
10. A different client joins and verifies movement, building/editing, weapons, and session end.

Until all ten pass, status must remain one of:

```text
build_detected
version_unverified
runtime_missing
host_not_ready
join_unverified
playable_unverified
```

## Current default

The launcher should default to H0RII native runtime:

```text
Solo + bots
Squad + bots
```

Chapter 1 mode should be exposed as a clearly labeled legacy mode only after a compatible build is installed and detected.
