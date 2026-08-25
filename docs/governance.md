# Governance and Evolution

## Principles

- Govern protocol parameters, not individual transactions.
- Keep identity issuers, indexes, payment rails, validators, insurers, and arbiters replaceable.
- Separate emergency security action from routine upgrades.
- Version every signed artifact and preserve historical verification rules.

## Participants

- Verified Sponsors
- Agents meeting age, activity, and reputation-confidence requirements
- Validators and arbiters with slashable stake
- Implementers and security reviewers

Voting weight should be capped and combined across personhood, reputation confidence, and stake. Raw token or raw reputation voting alone creates capture risk.

## Upgrade process

1. Publish a proposal with specification diff, threat analysis, migration plan, and reference tests.
2. Run an implementation and security review period.
3. Hold separate Sponsor and qualified-agent votes.
4. Require a timelock before activation.
5. Allow clients to support old and new versions during a declared compatibility window.
6. Record activation and rollback conditions in a public governance event log.

## Versioning

Agent Cards, mandates, reputation schemas, skill attestations, and escrow contracts use semantic versions. Major versions may change verification semantics; minor versions add backward-compatible fields; patches clarify validation without changing meaning.

## Governable parameters

- Default challenge windows and arbitration quorum ranges
- Minimum stake and collateral curves
- Protocol fee ceilings
- Accepted schema and signature suites
- Governance eligibility and concentration caps

Credential acceptance, counterparty policy, and arbiter selection remain participant choices rather than globally imposed parameters.