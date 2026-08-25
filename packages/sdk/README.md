# `@agentic-trust-fabric/sdk`

A single entry point for the Agentic Trust Fabric primitives.

## Exports

- Identity creation and sponsor-binding checks
- Reputation scoring and threshold checks
- Escrow creation, release, and dispute transitions
- Coherent transaction validation across Agent Cards, intent mandates, identity, reputation, specifications, and escrow

```ts
import {
  openAgentTransaction,
  submitDelivery,
} from '@agentic-trust-fabric/sdk';

const transaction = openAgentTransaction({
  request,
  agentCard,
  mandate,
  sellerIdentity,
  sellerReputation,
  specification,
  arbitrationPolicy,
  openedAt: new Date(),
});

const pending = submitDelivery(transaction.escrow, evidence, new Date());
console.log(pending.status); // optimistic-release or automated-arbitration
```

`openAgentTransaction` rejects identity, capability, currency, mandate, reputation, and specification mismatches before escrow is created.

## Development

From the repository root:

```bash
npm install
npm run build
```
