# `@agentic-trust-fabric/settlement`

Escrow lifecycle primitives for agent-to-agent settlement.

## API

### `createEscrow(id, amount, currency, buyerDid, sellerDid, terms)`

Creates an escrow in the `locked` state and binds it to a mandate, machine-readable specification, and arbitration policy.

### `submitDelivery(escrow, evidence, submittedAt)`

Checks evidence for every acceptance criterion. Passing evidence starts `optimistic-release`; incomplete or failing evidence starts `automated-arbitration`.

### `challengeEscrow(escrow)`

Challenges a pending optimistic release and starts automated arbitration.

### Arbitration and release

`releaseEscrow` enforces the challenge deadline. `resolveAutomatedArbitration` can release, refund, or escalate; `resolveHumanArbitration` resolves the final human stage.

```ts
import { createEscrow, submitDelivery } from '@agentic-trust-fabric/settlement';

const escrow = createEscrow(
  'escrow-001',
  25,
  'USDC',
  'did:example:buyer-001',
  'did:example:seller-001',
  {
    mandateId: 'mandate-001',
    specification,
    arbitrationPolicy,
  },
);

const pending = submitDelivery(escrow, evidence, new Date());
```

## Status

These in-memory objects demonstrate protocol semantics only. Production settlement requires signatures, durable state, authorization checks, idempotency, asset transfer, challenge windows, and arbitration enforcement.
