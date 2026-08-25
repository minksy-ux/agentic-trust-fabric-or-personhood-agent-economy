# Local Signed Runtime

The local runtime turns the protocol model into an executable reference flow without spending real funds.

## End-to-end sequence

1. Generate independent Ed25519 keys for the credential issuer, Sponsor, agent, insurer, and skill validator.
2. Sign the Sponsor credential, Agent Card, intent mandate, insurance policy, and skill attestation.
3. Credit the buyer with simulated currency in integer minor units.
4. Validate all signed artifacts and consume the Sponsor-scoped mandate nonce in persistent state.
5. Lock buyer funds against the protocol escrow ID.
6. Submit acceptance evidence and complete optimistic release.
7. Apply the declared payout plan to simulated balances exactly once.
8. Reopen the runtime file and verify balances, hold status, nonce state, whole-state integrity, and aggregate event chains.
9. Export a signed evidence package containing transaction artifacts and the linked audit events.

## Conformance CLI

The `atf` command validates protocol schemas and independently verifies artifacts produced by the runtime:

```bash
npm run atf -- validate evidence-package /path/to/evidence.json
npm run atf -- verify-evidence /path/to/evidence.json /path/to/evidence-public-key.pem
npm run atf -- verify-runtime /path/to/runtime.json
```

The example prints temporary paths for its runtime, evidence package, and verification key.

## Persistence model

The state file contains materialized balances and holds, consumed nonce keys, and versioned events. Every event includes the previous event hash for its aggregate. The whole state has an integrity hash and is replaced through an atomic filesystem rename.

This design is intentionally inspectable for conformance tests and local simulations. It is not safe for concurrent services or adversarial custody.

## Production migration

- Replace JSON persistence with a transactional database and unique nonce constraints.
- Store signing keys in hardware or managed key infrastructure.
- Sign periodic event roots and anchor them to independent transparency logs.
- Replace simulated credits and holds with a testnet payment adapter, then audited production contracts.
- Preserve the runtime interface so protocol tests can run against local and network adapters.