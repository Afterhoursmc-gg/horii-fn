# H0RII FN Remote Host Next Steps

## Current host

Windows VM created on the VPS:

- Name: `horii-fn-host-01`
- Public RDP: `185.244.0.19:33893`
- Username: `horiiadmin`
- Password: root-only at `/var/lib/h0rii-fn-host/horii-fn-host-01/admin-password.txt`
- VNC remains localhost-only: `127.0.0.1:5912`
- VM disk: `/var/lib/h0rii-fn-host/horii-fn-host-01/win11.qcow2`
- VM is not marked allocatable yet.

## Why it is not allocatable yet

A host must not be marked allocatable until a real Project Reboot-compatible runtime is running and verified. Required evidence:

1. Compatible Fortnite build is present on the Windows game-host.
2. Project Reboot/Reboot Launcher host mode starts successfully on the game-host.
3. Backend/auth service is reachable locally on the game-host.
4. UDP game service on port `7777` is listening and reachable.
5. H0RII host-agent reports fresh heartbeat with `capacity_available > 0`.
6. H0RII launcher allocates a session to that host.
7. A separate client joins and gameplay is tested: join, movement, building, editing, weapons.

## What the user must provide/install

The user selected: use an existing legal Fortnite installation from a Windows host they provide access to.

Do not download Fortnite builds from mirrors. Do not redistribute proprietary binaries. Transfer/use only a legally obtained compatible build that the user is authorized to use.

On the Windows host/VM:

1. Log in through RDP.
2. Place the compatible Fortnite installation in a stable path, for example:
   - `C:\FortniteBuilds\Fortnite-10.31\FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe`
3. Install Reboot Launcher/Project Reboot from the official project releases/source.
4. Configure hosting mode/headless if supported.
5. Start the runtime and confirm backend/host process state.

## H0RII host-agent setup target

Once the runtime exists, install/run the H0RII FN host-agent on the same Windows game-host. It must report:

- `publicHost`: public IP/hostname reachable by the launcher clients
- `publicPort`: `7777` or the configured UDP game port
- `baseUrl`: local Reboot backend URL if applicable
- `supportedVersions`: actual supported Fortnite build(s), e.g. `10.31` only if verified
- `verifiedCompatible`: true only after real runtime and client join proof
- `capacity_available`: > 0 only when runtime can accept a session

Until then, any host row must remain `not_ready`, `verified_compatible=false`, or `capacity_available=0`.

## Network requirement

Current public RDP uses TCP `33893`. For actual gameplay, the VM/host also needs a public path for the Project Reboot game port, expected UDP `7777`, after runtime is installed. Do not open/forward UDP `7777` until the runtime exists and the scope is approved.

## Cleanup recommendation

Existing DB rows named `Test Local Reboot Host` and `Debug Host` are stale/test registrations pointing at `127.0.0.1`. They inflate host counts. They should be deleted or archived after approval, or tests should be isolated from production DB so new E2E runs no longer create production host rows.
