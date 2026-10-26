# SLOT launch monitor

This is a read-only Mainnet observer with a separate Cloudflare publication step.
It is not a token-launch script, trading bot or wallet signer.

## Identity

Configured in `launch.config.json`:

- Developer: `CaA5KuiSLde3GwG7c38awS9M4Ah8zA1QbzTPnacshvHD`
- Platform: pump.fun
- Name: **SLOTRACE** (exact, case-sensitive)
- Symbol: **SLOT** (exact, case-sensitive)
- Worker: `slotracesol`
- Website: `https://slotrace.tech`

The watcher recognizes Pump `create` and `create_v2` from the official
[Pump IDL](https://github.com/pump-fun/pump-public-docs/blob/main/idl/pump.json).
It verifies the program, payer, creator argument, developer signature, creation
metadata, mint initialization, token program, decimals and finalized mint account.
A buy, transfer, failed creation or another wallet's SLOT does not qualify.

Both the transaction payer and the on-chain `creator` argument must be the
configured developer. Delegated launches through a different payer/creator will
not publish automatically. Review the configuration before launch if using one.

## One-time setup

1. Deploy this repository update to Cloudflare. Confirm `/api/token` returns
   `{"symbol":"SLOT","status":"pending","mint":null}`.
2. Install Node.js 22+ and run `npm ci` in the repository.
3. Put the private HTTPS Mainnet RPC in `.env.local` as `SOLANA_RPC_URL`.
4. Copy `.env.launch.example` to `.env.launch.local`. Fill in the Cloudflare
   account ID and a scoped API token with **Workers Scripts Write** (or the
   equivalent individual Worker edit permission). Use the intended account and
   restrict the token to this Worker where supported. Do not use a Global API Key.
5. Never put seed phrases, wallet keys or Cloudflare credentials in source files,
   screenshots or GitHub. The observer needs only the developer's public address.

Cloudflare tokens are created in your account's API token settings. Keep the token
in the local env file, not in the chat. This monitor has no need for DNS, billing
or account-administration permissions.

## Before launching

Run these commands in separate steps:

```sh
npm run launch:arm
npm run launch:watch
```

Wait for `WATCHING` before creating the token. Keep this process running with
network access. A laptop that sleeps or a closed terminal will stop observation.
It is a local script; it does not keep running merely because this chat is open.

Arming records a finalized slot. It does not publish historical launches. The
checkpoint and pending transaction queue are saved in `.launch-state.json`;
restarting `launch:watch` resumes from that checkpoint. Failed RPC requests and
temporary transaction-indexing delays do not discard queued signatures.

The watcher polls every three seconds and waits for finalized commitment. Actual
latency includes Solana finality, RPC indexing and Cloudflare propagation. It is
not a zero-delay guarantee. The header checks for a published mint every five
seconds while the page is visible, for up to one hour per page load.

## Publication

After validation, the script uses `wrangler secret put SLOT_TOKEN` to update the
Worker's runtime token identity. Cloudflare creates and immediately deploys a new
Worker version; there is no asset rebuild or GitHub commit at launch.
See [Cloudflare secret behavior](https://developers.cloudflare.com/workers/configuration/secrets/).

The record contains only public mint/creation data. Existing RPC secrets are not
changed. The monitor checks `https://slotrace.tech/api/token` to verify the result
before reporting success. It will not automatically replace a different mint.

The site updates the header, copy buttons, token page and token-status passages
in documentation. Publishing a mint does not turn proposed token utility into a
delivered feature or claim that distribution details have been decided.

## Dry run and recovery

```sh
npm run launch:arm -- --dry-run
npm run launch:watch -- --dry-run
npm run launch:status
```

Dry runs use a separate checkpoint and never write to Cloudflare. No live token
creation was performed as a test. Fixture tests cover both Pump creation formats.

If launch occurred before arming, publish from its exact creation signature:

```sh
npm run launch:publish -- --signature CREATION_TRANSACTION_SIGNATURE
```

This command applies the same creator/name/symbol/mint checks. It is not an
unchecked setter. Stop any running watcher before using it. For an independent
check, add `--dry-run` to verify without publication.

Multiple matching mints or a missing history cursor stop automatic publication.
Review them manually. Do not delete state to force a match. A `.lock` file blocks
duplicate processes; remove a stale lock only after confirming no monitor is
running. Pagination is capped at 10,000 unseen transactions per scan and refuses
to skip a larger backlog. The script deliberately stops after 20 consecutive RPC
failures; resume it after repairing the provider.

Future Pump instruction layouts that differ from the pinned reader require code
review. The monitor fails closed instead of guessing a new mint layout.
