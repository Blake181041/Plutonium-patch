# Vanillia server

This is the server-side half of the Plutonium Vanillia integration.

It runs VanilliaPXY separately from the static Plutonium frontend.

## Run

```sh
npm install
npm start
```

The default port is `8080`. Set `PORT` when the host provides its own port.

The server exposes the VanilliaPXY routes:

- `/vanillia?url=...`
- `/ws?url=...`
- `/wisp/`
- `/service-worker.js`
- `/favicon?url=...`
- `/api/icon?url=...`

Set `window.PLUTONIUM_VANILLIA_SERVER` in `js/vanillia-config.js` to the public origin of this server.

