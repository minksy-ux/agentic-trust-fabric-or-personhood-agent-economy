# `@agentic-trust-fabric/identity`

Sponsor-backed identity primitives for autonomous agents.

## API

### `createAgentIdentity(sponsor, did)`

Creates an agent identity bound to a human or legal sponsor.

### `verifySponsorBinding(identity)`

Performs basic structural validation of an identity's sponsor binding.

```ts
import { createAgentIdentity, verifySponsorBinding } from '@agentic-trust-fabric/identity';

const identity = createAgentIdentity({
    did: 'did:example:sponsor-001',
    name: 'Example Sponsor',
    credential: {
      schemaVersion: '1.0.0',
      id: 'credential-001',
      issuerDid: 'did:example:issuer',
      subjectDid: 'did:example:sponsor-001',
      type: 'proof-of-personhood',
      issuedAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2027-01-01T00:00:00.000Z',
      proof: 'credential-proof',
    },
  },
  'did:example:agent-001',
);

verifySponsorBinding(identity, new Date(), verifyCredentialProof);
```

`createIdentityRegistry` and `registerAgentIdentity` enforce unique agent DIDs and a configurable maximum number of identities per Sponsor.

## Status

This package currently models the protocol surface. Production use will require signed credentials, proof verification, key management, revocation, and persistent identity records.
