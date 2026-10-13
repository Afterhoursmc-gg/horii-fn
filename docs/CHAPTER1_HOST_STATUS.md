# H0RII FN Chapter 1 Host Status

## Current host

- VM: `horii-fn-host-01`
- Public RDP: `185.244.0.19:33893`
- Windows user: `horiiadmin`
- Password: stored root-only on VPS, not committed or printed
- H0RII host kit ISO: `/var/lib/h0rii-fn-host/horii-fn-host-01/horii-chapter1-host-kit.iso`
- ISO label: `HORII_CH1_KIT`

## Public forwards now active

- `185.244.0.19:33893/tcp` -> Windows RDP
- `185.244.0.19:3551/tcp` -> Chapter 1 backend/runtime on VM
- `185.244.0.19:7777/tcp` -> game/runtime port on VM
- `185.244.0.19:7777/udp` -> game/runtime port on VM

These forwards were verified listening on the VPS side. RDP auth was verified.

## Persistent VM startup

The VM start script has been updated so after reboot it attaches:

- VirtIO ISO
- H0RII Chapter 1 host kit ISO
- RDP/backend/game host forwards

Start script:

```text
/var/lib/h0rii-fn-host/horii-fn-host-01/start.sh
```

## What the ISO contains

- `README-FIRST.txt`
- `scripts/setup-chapter1-legacy-host.ps1`
- `scripts/setup-horii-fn-host.ps1`
- `host-agent/src/index.ts`
- `host-agent/package.json`
- `host-agent/tsconfig.json`
- `docs/CHAPTER1_LEGACY_MODE.md`

It does not contain Fortnite files, Epic files, Reboot/Lawin binaries, patches, bypasses, accounts, or keys.

## Required lawful build placement

Place the lawful Chapter 1 Fortnite build in Windows at:

```text
C:\FortniteBuilds\Chapter1\
```

Expected executable somewhere under that root:

```text
FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe
```

## Windows setup command

From PowerShell on the VM, after the build exists:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
D:\scripts\setup-chapter1-legacy-host.ps1 -FortnitePath "C:\FortniteBuilds\Chapter1" -PublicHost "185.244.0.19" -PublicPort 7777
```

The CD drive letter may differ. Use the drive named `HORII_CH1_KIT`.

## Runtime expectations

The host-agent expects:

- Backend/runtime probe: `http://127.0.0.1:3551`
- Public game port: `185.244.0.19:7777`
- Local port bound in Windows: `7777`

Only set `allowReady=true` in `%USERPROFILE%\.horii-fn\host-agent.json` after:

1. The lawful Chapter 1 executable is detected.
2. Reboot/Lawin-compatible backend responds locally.
3. Game port `7777` is bound.
4. A real compatible client joins and gameplay is tested.

Do not mark this host allocatable before those checks pass.
