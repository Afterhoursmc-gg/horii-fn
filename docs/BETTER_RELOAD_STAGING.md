# Better-Reload Staging Notes

Better-Reload was inspected as a server-side OGFN backend candidate.

## Source

- Repository: `https://github.com/31Benzi/Better-Reload`
- Local research checkout: `/root/horii-fn-research/benzi/Better-Reload`

## Staging changes applied locally only

The research checkout was modified for local staging:

- backend port changed from `3551` to `43551` because `3551` is already forwarded to the Windows VM
- MongoDB URI changed to `mongodb://127.0.0.1:27018/HoriiBetterReloadStaging`
- Discord bot disabled
- website disabled
- HTTPS disabled
- autorotate/webhooks disabled
- matchmaker/XMPP moved to `6969`
- XMPP code patched locally to support `config.xmppPort || 80`

These changes are not production deployment changes.

## Running staging processes

- MongoDB Docker container: `horii-betterreload-mongo`
- Backend process: `node index.js` from the Better-Reload checkout

## Verified endpoints

Verified on `2026-10-13` from VPS localhost:

```text
GET http://127.0.0.1:43551/unknown
HTTP/1.1 200 OK
{"msg":"Reload Backend - Made by Burlone"}
```

```text
GET http://127.0.0.1:43551/fortnite/api/version
HTTP/1.1 200 OK
version: 18.30
branch: Release-18.30
```

```text
GET http://127.0.0.1:43551/lightswitch/api/service/Fortnite/status
HTTP/1.1 200 OK
status: UP
message: Fortnite is online
```

Listeners verified:

```text
127.0.0.1:27018 Mongo staging
0.0.0.0:43551 Better-Reload backend staging
0.0.0.0:6969 Better-Reload XMPP/matchmaker staging
```

## Compatibility caveat

Better-Reload is backend/lobby/API-side. It does not by itself provide a lawful Fortnite client build or prove gameplay host readiness.

Do not mark the H0RII remote host `allocatable=true` until:

1. a lawful compatible client build exists on the Windows host,
2. backend endpoints are reachable from that host/client context,
3. game runtime/host is bound on `7777`,
4. a real join/movement/gameplay test succeeds.
