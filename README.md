# avalon-ledger-explorer

An independent, public ledger explorer and verifier for the Avalon Protocol. It is a
browser app that checks Avalon ledger data itself, through the TypeScript SDK
([`avalon-sdks`](https://github.com/avalon-initiative/avalon-sdks)), instead of trusting
the node it reads from. It shares its look and components with the other Avalon clients
through `@avalon-initiative/common-ui`.

The protocol, its architecture and design decisions live in
[`avalon-protocol`](https://github.com/avalon-initiative/avalon-protocol) and
[`avalon-docs`](https://github.com/avalon-initiative/avalon-docs).

**Status:** the first slice is in place. Enter a node URL and the app fetches its latest
cosigned tree head and verifies it locally: the trust anchor for the claimed network, the
author signature against the pinned key, and the witness cosignatures against a known
witness list built from the network's own seed nodes (never from the node being checked).
Browsing shards, viewing entries, and inclusion and consistency proofs are next.

## What it is

A read-only client with no server of its own. The result reads "Verified" only when every
check passed; if the witness policy could not be applied (fewer than two known witnesses)
it says so and reads as an author-signature-only check. Trust anchors come from the
published list the SDK points at; set `VITE_AVALON_TRUST_ANCHORS_URL` to use another
list, for example a fork's own network.

## Setup

Node 22 or newer. The `@avalon-initiative` packages (`protocol-sdk`, `common-ui`) are
published to GitHub Packages, so installs need a token with `read:packages`:

```bash
export NODE_AUTH_TOKEN=$(gh auth token)   # or a personal access token with read:packages
make install
```

`make dev`, `make build`, `make lint`, `make test` and `make check` run the install for you
when `node_modules` is missing or `package-lock.json` has changed, so the token is the only
setup step.

## Commands

```bash
make dev      # Vite dev server on :5173
make check    # what CI runs: lint, type-check and build, tests
make test     # Vitest suites in tests/
```

Tests live in `tests/`, not beside the sources. Styles live in
`src/styles/<Name>.module.scss`, never in `.vue` files.

## Hosting

`make build` writes a static bundle to `dist/`. Serve it from any static file host. It
makes requests only to the node you enter, that network's seed nodes, and the trust-anchor
list.

License: Apache-2.0.
