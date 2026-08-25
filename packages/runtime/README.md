# `@agentic-trust-fabric/runtime`

Local reference infrastructure for signed protocol artifacts, durable replay protection, hash-chained audit events, and simulated escrow settlement.

## Cryptographic artifacts

- `generateEd25519KeyPair()` creates PEM-encoded Ed25519 keys.
- `signArtifact()` signs a deterministic representation with the top-level `signature` field removed.
- `verifyArtifactSignature()` verifies the complete artifact and rejects mutation.
- `signCanonical()` and `verifyCanonicalSignature()` support detached proof fields such as Sponsor credentials.

Private keys are never persisted by the runtime.

## Persistent runtime

`LocalTrustRuntime` stores state in one versioned JSON file using write-then-rename replacement and owner-only file permissions. It provides:

- atomic local nonce consumption
- hash-chained audit events per aggregate
- whole-state integrity verification at startup
- integer minor-unit balances
- idempotent escrow lock, release, and refund
- deterministic basis-point payout allocation

```ts
const runtime = new LocalTrustRuntime('.atf/runtime.json');
runtime.credit(buyerDid, 'USDC', 100);
runtime.lockEscrow('escrow-001', buyerDid, 'USDC', 75);
runtime.releaseEscrow('escrow-001', [
  { recipientDid: sellerDid, shareBasisPoints: 10_000 },
]);
```

## Security boundary

This package is a single-process local simulator, not a custody system. Integrity hashes detect corruption and partial rewriting, but an attacker controlling the host can rewrite the file and recompute unkeyed hashes. Production deployments require transactional storage, process-level concurrency control, hardware-backed keys, signed checkpoints, external transparency anchoring, and a real payment rail.

The deterministic JSON implementation is the current ATF prototype profile. Cross-language production interoperability requires published canonicalization test vectors and adoption of a formally specified canonical JSON standard.