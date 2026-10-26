# SLOTRACE

Solana transaction inspection for developers. SLOTRACE retrieves confirmed transaction records through a server-side RPC gateway and displays execution status, fees, compute usage, instructions, logs and accounts.

**Website:** https://slotrace.tech/

**Token ticker:** `$SLOT`. The token has not launched. The contract address remains `soon` until an official mint is published.

## Features

- Mainnet and Devnet signature lookup, with no wallet connection.
- Parsed and raw instruction inspection, including inner instructions.
- Source-labeled chain metadata and raw execution errors.
- Searchable documentation, responsive pages and GSAP motion.
- Pause controls and reduced-motion support.
- Server-only private RPC credentials; they are never compiled into browser assets.

The SDK, historical replay and contributor economy are development directions. The homepage signal route visualizes a workflow; it is not a live internal-validator timing feed.

## Requirements

- Node.js 20 or newer.
- Python 3.10 or newer for page generation.
- An HTTPS Solana Mainnet RPC endpoint with `getTransaction` support.

There are no npm runtime dependencies. GSAP and ScrollTrigger 3.14.2 are vendored with their original license notices.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Set `SOLANA_RPC_URL` in `.env.local`. Never commit this file.
3. Build and start:

```sh
python scripts/build-pages.py
node scripts/build-worker.mjs
node scripts/serve.mjs
```

Open `http://127.0.0.1:4174`. The local server loads `.env.local` without printing values. Set `PORT` to change the port.

Devnet uses the public endpoint unless `SOLANA_DEVNET_RPC_URL` is configured. Endpoints must allow server requests; provider limits and history coverage affect availability.

## Checks

```sh
node --test
python scripts/check-links.py
node scripts/validate-artifact.mjs
```

Tests cover signature validation, missing metadata, raw execution errors, inner instructions, invalid API requests and secret-safe errors. Unit tests do not require live credentials.

## Source layout

```text
src/                Maintained page templates and documentation articles
public/             Browser scripts, styles, icons, cursors and generated pages
worker/index.mjs    Read-only API boundary and asset serving
scripts/            Page generation, Worker build, local server and checks
tests/              Transaction and server unit tests
dist/               Generated Worker artifact; excluded from Git
```

Edit text and page structure in `src/`, not generated HTML. Edit browser code and styles in `public/`. Rebuild after changes. Optional cursor regeneration requires Pillow; cursor assets are already included.

## API and secrets

`GET /api/transaction?network=mainnet&signature=<base58 signature>` returns the upstream record, including `null` if unavailable. Only Mainnet and Devnet are accepted. The server fixes the method to `getTransaction`, requests confirmed commitment and supports legacy/v0 transaction records.

The browser cannot specify an upstream URL or arbitrary method. Provider error messages are sanitized because they may contain private URLs. The gateway uses a timeout and a bounded, per-instance request limiter. Configure deployment-wide rate limiting at the hosting edge for higher traffic.

Keep production credentials in runtime secrets, not source files, hosting manifests or frontend variables. `.env.local` is ignored; `.env.example` has empty values.

## Deployment

The build emits `dist/server/index.js`, a dependency-free Worker ESM module with embedded static assets. Configure `SOLANA_RPC_URL` as a runtime secret; optionally configure `SOLANA_DEVNET_RPC_URL`.

For Sites deployment, keep project identity in the local `.openai/hosting.json`. This deployment-specific file is excluded from the GitHub export. Other Worker hosts can serve the ESM module with their own deployment configuration.

## Third-party software

See [THIRD_PARTY.md](THIRD_PARTY.md). Project-specific licensing has not been selected; third-party software retains its own licenses.
