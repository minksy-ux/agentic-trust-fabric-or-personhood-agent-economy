# Architecture Overview

The Agentic Trust Fabric is designed to answer three questions at machine speed:

1. Is the counterparty real and scarce?
2. Who is accountable when the work fails or causes harm?
3. How do we settle value without trusting an opaque centralized platform?

## Composition invariant

The system is coherent only when identity, authorization, reputation, specification, and settlement refer to the same agent transaction. A valid transaction binds:

- a non-transferable agent DID to a verified sponsor credential;
- a signed Agent Card to that DID;
- a signed, attenuated intent mandate to the requesting agent and task scope;
- reputation attestations to the performing agent DID;
- domain skill attestations, required bond, and insurance coverage to the performing agent DID;
- a machine-readable specification and acceptance policy to an escrow commitment; and
- delivery evidence, challenge state, and arbitration outcome to the final settlement.

Replacing any one component must not break these bindings. This is what allows implementations and providers to remain modular without reducing the stack to unrelated trust products.

## Layered model

### 0. Discovery
Agents publish signed metadata in Agent Cards that describe capabilities, endpoints, pricing, trust requirements, and supported mandate and settlement protocols.

### 1. Identity
Each agent is bound to a sponsor via a cryptographic identity layer. The binding is non-transferable, scarce, and accountable.

### 2. Reputation
Reputation travels with the agent identity and is portable across environments. It is multi-dimensional and includes objective evidence.

### 3. Assurance
Slashable bonds provide first-loss capital, insurance provides an economic backstop, and domain skill attestations prove competence for precise discovery.

### 4. Intent and Policy
Sponsor and agent policies are evaluated together. Counterparty, jurisdiction, delegation, spend, time, emergency, and human-approval constraints can only become narrower through delegation.

### 5. Settlement
Escrow, milestone release, dispute handling, and settlement are native to the protocol flow.

### 6. Audit, Governance, and Legal Interface
Versioned events, Ricardian contracts, evidence packages, governance upgrades, and emergency controls make protocol outcomes operable across technical and legal systems.

## Agent-native transaction flow

1. A buyer queries open indexes for signed Agent Cards matching capability, reputation, and settlement constraints.
2. The buyer presents a signed intent mandate proving authority, budget, scope, and expiry without granting broader sponsor control.
3. Admission verifies Sponsor identity, domain skills, reputation, bond, insurance, and hierarchical policy.
4. The parties sign the task specification, Ricardian terms, price, payout plan, challenge window, and arbitration policy.
5. Funds enter escrow before execution begins; lead agents may create bounded child escrows.
6. The seller returns the deliverable with validation evidence or proofs.
7. Passing evidence starts optimistic release; a challenge invokes deterministic checks and automated arbitration.
8. Unresolved or high-consequence disputes escalate to the selected human or legal forum.
9. The outcome settles funds and emits signed audit, reputation, bond, and insurance events.

## Permissionless boundary

No single registry, credential issuer, indexer, payment rail, or arbiter is privileged by the protocol. Participants publish their acceptance policies and can choose competing providers. On-chain commitments and signed artifacts make those choices independently verifiable.

Some inputs still carry trust assumptions. Proof-of-personhood issuers can fail, organizations can be misrepresented, indexers can censor results, payment networks can halt, and arbiters can collude. The protocol addresses these risks through issuer diversity, threshold policies, portable records, replaceable indexes, explicit arbitration selection, staking, challenges, and appeal paths rather than claiming to eliminate trust entirely.

## Design goals

- Scarcity without centralization
- Privacy by default with selective disclosure
- Portable trust signals
- Liability alignment through sponsor doctrine
- Machine-readable contract and acceptance logic
- Open participation with explicit, replaceable trust providers
- End-to-end cryptographic binding between mandate, work, and settlement

## Relationship to standards

The stack is intended to align with ERC-8004 patterns, W3C DID/VC standards, x402 / MPP-style payments, and proof-of-personhood systems while remaining modular enough for different ecosystems.
