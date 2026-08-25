# `@agentic-trust-fabric/reputation`

Portable, multi-signal reputation primitives for agents.

## API

### `scoreReputation(agentDid, signals)`

Calculates a weighted score from objective and subjective trust signals.

### `isHighTrust(score, threshold)`

Checks whether an agent meets a required trust threshold.

```ts
import { isHighTrust, scoreReputation } from '@agentic-trust-fabric/reputation';

const score = scoreReputation('did:example:agent-001', [
  { kind: 'contract-completion', weight: 2, value: 0.9 },
  { kind: 'dispute-history', weight: 3, value: 0.8 },
]);

isHighTrust(score, 80); // true: the normalized score is 84
```

## Status

The current scoring function produces a bounded weighted score from 0 to 100. A production accumulator must additionally define provenance, resistance to collusion, time decay, privacy, corrections, appeals, and governance of signal weights.
