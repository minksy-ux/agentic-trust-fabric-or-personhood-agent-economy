# Hello Agent Hire

A runnable walkthrough of the current protocol primitives:

1. Create a sponsor-backed agent identity.
2. Verify the sponsor binding.
3. Create a scoped hire request.
4. Calculate the seller's reputation score.
5. Validate the Agent Card, mandate, identity, reputation, and task specification together.
6. Lock the agreed fee in escrow.
7. Submit evidence for every machine-readable acceptance criterion.
8. Release escrow after the optimistic challenge window.
9. Move simulated funds through the payout plan and reopen the persistent audit state.

## Run

From the repository root:

```bash
npm install
npm run build
npm --workspace hello-agent-hire start
```

Expected output includes a cryptographically verified Agent Card, discovered agent and mandate, reputation and assurance results, optimistic release, buyer and seller balances, and a valid persistent event chain.

## Scope

This example uses real Ed25519 signatures and persistent local simulated funds. It does not custody stablecoins, anchor audit roots externally, provide multi-process concurrency, or perform decentralized arbitration.
