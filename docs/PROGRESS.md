# H0RII FN — Progress Report

## Completed

- Created `/root/horii-fn` monorepo with apps and packages:
  - `apps/api`
  - `apps/web`
  - `apps/admin`
  - `apps/launcher`
  - `packages/database`
  - `docs`
  - `infrastructure/docker`
- Created Docker Compose staging infrastructure for PostgreSQL and Redis.
- Implemented TypeScript API with:
  - registration/login
  - Argon2id password hashing
  - JWT access tokens
  - refresh-token storage/rotation foundation
  - profile endpoint
  - locker catalog/inventory/equip
  - starter inventory grants on registration
  - friends request/list/accept
  - party creation/readiness
  - matchmaking queue
  - audit logs
  - OpenAPI JSON/docs shell
  - health/status routes
- Implemented Project Reboot adapter foundation:
  - `game_servers` table
  - admin game-server registration
  - Project Reboot/Lawin-compatible health probing
  - matchmaking allocation to healthy `project_reboot` server
  - player session tracking
  - session diagnostics
  - explicit `playableVerified: false` until real gameplay test is passed
- Kept mock adapter only as explicit fallback via `allowMockFallback: true`.
- Built React web landing app.
- Built React admin shell.
- Built React launcher UI shell.
- Added Tauri Rust command for local Fortnite executable detection without modifying game files.
- Researched Project Reboot and Reboot Launcher source locally.
- Documented compatibility and legal boundaries.

## Verified commands

Successful:

```bash
cd /root/horii-fn
npm install
npm run migrate
npm run typecheck
TEST_PORT=4319 npm test
npm run build --workspace apps/web
npm run build --workspace apps/admin
npm run build --workspace apps/launcher
```

Successful E2E flow:

- Create H0RII FN account A.
- Create H0RII FN account B.
- Retrieve profile.
- Equip starter locker item.
- Send friend request.
- Accept friend request.
- Create party.
- Attempt Project Reboot matchmaking without registered healthy server.
- Correctly receive unavailable state.
- Allocate mock fallback only when explicitly requested.
- Retrieve diagnostics showing `playableVerified: false`.

## Current blockers

### Real playable Fortnite session

Not verified. Missing requirements:

- A lawfully obtained compatible Fortnite build path.
- A permitted Windows/Reboot host environment.
- A running Project Reboot runtime/game server.
- Verified client join.
- Movement/build/edit/weapons smoke test logs.

### Native Tauri launcher check on this Linux VPS

`cargo check` currently fails before validating the launcher Rust binary because system build dependency `pkg-config` is missing, with `libdbus-1-dev` also indicated by the compiler output.

This does not affect the React launcher frontend build, which passes.

## Important non-claims

- No Fortnite binaries were downloaded or redistributed.
- No Epic authentication, bans, HWID restrictions, DRM, anti-cheat, or entitlement controls were bypassed.
- No playable Fortnite session has been claimed.
- Project Reboot backend health does not equal gameplay success.

## Next steps

1. Install isolated Tauri build dependencies or build on a Windows CI/VM target.
2. Register a real Reboot/Lawin-compatible host through `/admin/game-servers`.
3. Run `/admin/game-servers/:id/health`.
4. Attempt Project Reboot matchmaking without mock fallback.
5. On a Windows host with compatible lawfully obtained Fortnite files, run launcher diagnostics and attempt real join.
6. Store gameplay proof logs before marking playable support.
