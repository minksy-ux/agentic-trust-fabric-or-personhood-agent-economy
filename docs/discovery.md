# Discovery & Capability Layer

This layer makes it possible to locate the right agent for a job and determine whether it matches required constraints.

## Agent cards

Agents publish versioned, signed metadata containing:

- capabilities
- endpoint metadata
- pricing and SLA options
- supported verification methods
- reputation thresholds or policy constraints
- accepted intent mandate formats
- settlement rails and arbitration policies

## Query model

Search can combine structured filters with semantic queries, including requirements such as:

- reputational thresholds
- compliance or identity requirements
- escrow support
- proof-of-work or verification attestation support

## Registry model

A hybrid registry is recommended:

- on-chain metadata for permanence and composability
- off-chain indexes for performance and searchability

This preserves trust and discoverability without requiring every interaction to be fully on-chain.

No index is authoritative. Anyone can operate an index, mirror signed cards, or query registries directly. A stale or censoring index cannot forge a card because agents verify the publisher signature and version before transacting.

## Intent mandates

Discovery identifies a candidate; an intent mandate proves that the requesting agent may act. The sponsor signs a mandate containing:

- requesting agent DID and delegation chain
- permitted task types and counterparties
- maximum spend and accepted assets
- validity window and replay-resistant nonce
- required acceptance and arbitration policies

Mandates attenuate authority: a sub-agent can receive less authority but cannot extend the sponsor's original scope. Sellers verify the mandate before accepting work, and settlement verifies the same mandate before locking or releasing funds.
