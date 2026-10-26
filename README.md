# SLOTRACE

Transaction intelligence for Solana. Inspect confirmed transactions by signature: execution status, fees, compute usage, instructions, program logs and involved accounts. Read-only access; no wallet connection required.

**Website:** [slotrace.tech](https://slotrace.tech/) · **Explorer:** [Open Explorer](https://slotrace.tech/explorer/) · **Docs:** [Documentation](https://slotrace.tech/docs/) · **X:** [@slotrace_tech](https://x.com/slotrace_tech)

## Token

**Ticker: `$SLOT`** · **Network: Solana**

<!-- SLOT_CONTRACT_START -->
**Contract (Solana mint):**

`8ymf9KSWdqgqegouDicaCG1b9DtEQd5QhPeeSBuPpump`

[Solana Explorer](https://explorer.solana.com/address/8ymf9KSWdqgqegouDicaCG1b9DtEQd5QhPeeSBuPpump) · [pump.fun](https://pump.fun/coin/8ymf9KSWdqgqegouDicaCG1b9DtEQd5QhPeeSBuPpump)
<!-- SLOT_CONTRACT_END -->

The official $SLOT mint is published in the website header and on the [token page](https://slotrace.tech/token/). It was created on pump.fun using Solana Token-2022.

Token utility remains under development. Basic transaction inspection does not require a token. The SDK, replay and contributor network are planned capabilities, not currently available services.

## Run locally

Requires Node.js 22+ and Python 3.10+.

```sh
cp .env.example .env.local
# Set SOLANA_RPC_URL in .env.local.
python scripts/build-pages.py
node scripts/build-worker.mjs
node scripts/serve.mjs
```

Open `http://127.0.0.1:4174`. Keep RPC credentials server-side; never commit `.env.local`.

## Checks

```sh
node --test
python scripts/check-links.py
node scripts/validate-artifact.mjs
```

## Source and deployment

- `src/` — maintained page templates and documentation.
- `public/` — browser code, styles, logo and generated pages.
- `worker/index.mjs` — RPC gateway, token identity API and asset serving.
- `scripts/` — build tools, local preview and launch monitor.
- `tests/` — transaction, API and launch verification tests.

The build emits `dist/server/index.js` for Cloudflare Workers. Configure `SOLANA_RPC_URL` as a **runtime secret**. Devnet optionally uses `SOLANA_DEVNET_RPC_URL`. Transaction reads support legacy, v0 and v1 records.

There are no application runtime npm dependencies. Wrangler is a development tool used to publish token identity. The private RPC URL and Cloudflare token are never embedded in public assets.

## Launch monitor

The monitor verifies a successful, finalized pump.fun creation by the configured developer, the exact name `SLOTRACE`, ticker `SLOT` and initialized mint. It does not trade, sign wallet transactions or require a wallet private key.

Setup, commands and operational limits: [Launch monitor guide](docs/launch-monitor.md).

## Third-party software

See [THIRD_PARTY.md](THIRD_PARTY.md). Project licensing has not been selected; third-party software retains its own licenses.
