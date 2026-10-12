# H0RII FN — Project Reboot Integration

## Current implementation status

Implemented in this repository:

- Independent H0RII FN account registration/login with Argon2id.
- PostgreSQL persistence and Redis-backed presence/session state.
- Locker catalog, starter inventory, equip flow.
- Friends request/list/accept flow.
- Party creation.
- Matchmaking route with `project_reboot` as primary adapter.
- Mock adapter only as explicit development fallback via `allowMockFallback: true`.
- Admin game-server registration API.
- Project Reboot health probing API.
- Player-session diagnostics API that explicitly marks playable gameplay as unverified.
- Tauri/React launcher shell with local Fortnite path/version/integrity diagnostics.

## Researched Project Reboot sources

Local research clone:

- `/root/horii-fn-research/Project-Reboot-3.0`
- `/root/horii-fn-research/Reboot-Launcher`

Observed facts from source:

- Project Reboot license: BSD 3-Clause.
- `Reboot-Launcher` README describes it as a GUI/CLI launcher for Project Reboot.
- Reboot Launcher README says GUI is stable for hosting/playing Fortnite **S0-14**.
- Reboot Launcher auth backend starts an Express/LawinServer-compatible service on port `3551`.
- Project Reboot C++ source is a Fortnite runtime integration, not a normal Linux HTTP dedicated server.
- The C++ code hooks Fortnite runtime functions, forces net mode/dedicated-server behavior, manipulates NetDriver replication and game session hooks.

## Legal/safety boundary

H0RII FN must not:

- Redistribute Fortnite binaries.
- Download builds from unauthorized mirrors.
- Bypass Epic bans, HWID restrictions, anti-cheat, DRM, entitlement checks, or Epic authentication.
- Claim support for current Fortnite versions without verified authorized integration.

Supported safe path:

- Detect locally installed, lawfully obtained Fortnite files.
- Verify local file presence/version/hash metadata where the user supplies the path.
- Register a user-operated Reboot-compatible host as a game server.
- Allocate H0RII FN matchmaking sessions to that registered server only after health checks pass.
- Mark gameplay playable only after a compatible local client joins and a real movement/build/edit/weapons smoke test passes.

## Adapter model

Table: `game_servers`

Required fields for Project Reboot:

- `adapter = project_reboot`
- `region = EU|NA|AS`
- `base_url` pointing to the Reboot/Lawin-compatible backend, usually `http://host:3551`
- `public_host` and `public_port` for connection/session diagnostics
- `supported_versions`, e.g. seasons/builds known to work on that host

Health route:

```http
POST /admin/game-servers/:id/health
Authorization: Bearer <admin-token>
```

The health probe checks Reboot/Lawin-style endpoints such as:

- `/fortnite/api/version`
- `/lightswitch/api/service/Fortnite/status`
- `/`

Passing backend health does **not** prove playable gameplay.

## Matchmaking behavior

Primary request:

```http
POST /matchmaking/queue
Authorization: Bearer <player-token>
Content-Type: application/json

{
  "region": "EU",
  "adapter": "project_reboot"
}
```

If no registered healthy Reboot server exists, the API returns `503`.

Development-only fallback:

```json
{
  "region": "EU",
  "adapter": "project_reboot",
  "allowMockFallback": true
}
```

This allocates a mock session and marks `playable: false`.

## Actual gameplay verification requirements

A session can be marked playable only when all are verified:

1. A compatible, lawfully obtained Fortnite build is present locally.
2. Project Reboot version supports that build.
3. The host backend is reachable and healthy.
4. The Reboot runtime/server is running on a permitted host.
5. A client joins the allocated session.
6. Movement, building, editing, weapons and match termination are tested.
7. Logs prove the session was real, not mock.

## Current blocker for real playable match

This Linux VPS cannot by itself run the Windows Fortnite client/Reboot Launcher flow. The available Project Reboot source is a C++ runtime integration that requires compatible Fortnite game files and a Windows/Reboot host path. No authorized local Fortnite build has been supplied or verified here.

Therefore current status is:

- Backend: working.
- Database: working.
- Launcher shell: buildable.
- Lobby/friends/party/matchmaking fallback: working.
- Project Reboot adapter: implemented.
- Project Reboot real server health test: implemented, requires registered host.
- Playable Fortnite session: **not verified**.
