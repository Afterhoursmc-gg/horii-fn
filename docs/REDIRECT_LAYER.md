# H0RII FN Redirect Layer

## Boundary

Starfall/Tellurium-style components are client redirect / SSL-bypass / hook DLLs. H0RII automation does not build, inject, map, patch, bypass, or launch those components.

They may be used only as architecture reference or as a user-managed local component in a lawful legacy setup.

## Current backend stack

Better-Reload staging is running on the VPS:

```text
http://127.0.0.1:43551
```

Verified endpoints:

```text
/unknown
/fortnite/api/version
/lightswitch/api/service/Fortnite/status
```

Matchmaker/XMPP:

```text
ws://127.0.0.1:6969
```

## Windows VM network notes

The Windows VM currently has public forwards:

```text
185.244.0.19:33893/tcp  -> RDP
185.244.0.19:3551/tcp   -> Windows VM backend port
185.244.0.19:7777/tcp   -> Windows VM game port
185.244.0.19:7777/udp   -> Windows VM game port
```

Inside the Windows VM, if the user-managed redirect layer needs a backend URL, use one of these approaches:

1. Backend running inside Windows VM:

```text
http://127.0.0.1:3551
```

2. Backend running on VPS Better-Reload staging and reachable from the VM through QEMU user networking:

```text
http://10.0.2.2:43551
```

The second option should be probed from Windows before use:

```powershell
Invoke-WebRequest -UseBasicParsing http://10.0.2.2:43551/unknown
Invoke-WebRequest -UseBasicParsing http://10.0.2.2:43551/fortnite/api/version
Invoke-WebRequest -UseBasicParsing http://10.0.2.2:43551/lightswitch/api/service/Fortnite/status
```

## What can be automated safely

- Start/verify backend endpoints.
- Start/verify XMPP/matchmaker endpoints.
- Detect a lawful local Chapter 1 build read-only.
- Verify whether Windows can reach the backend URL.
- Keep H0RII host-agent `allowReady=false` until real join/play evidence exists.

## What is not automated

- DLL injection.
- SSL bypass.
- Anti-cheat bypass.
- DRM/auth bypass.
- Manual mapping.
- Protected-client patching.
- Downloading Fortnite builds from mirrors.

## Readiness rule

Even if redirect/backend works, host readiness stays false until all pass:

1. lawful compatible build detected,
2. backend endpoint reachable from the client context,
3. game runtime bound on port `7777`,
4. real client join succeeds,
5. movement/gameplay evidence recorded.
