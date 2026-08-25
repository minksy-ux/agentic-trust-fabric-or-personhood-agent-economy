# Legal and Compliance Interfaces

## Ricardian contracts

Every task specification links deterministic protocol fields to human-readable legal prose through a content-addressed URI. The prose identifies parties or accountability handles, governing law, liability allocation, acceptance process, arbitration forum, insurance, and remedies.

The machine-readable and human-readable forms must share a digest. A conflict-resolution clause declares which fields control if interpretations differ.

## Jurisdiction and policy

Requests and mandates carry jurisdiction tags. Sponsor and agent policies can restrict jurisdictions and counterparties, while task specifications bind the selected governing jurisdiction. Compliance adapters may check sanctions, restricted counterparties, licensing, tax, AML, or transaction thresholds without making one adapter globally mandatory.

## Emergency override

An authorized Sponsor can stop an unsettled transaction, but cannot redirect funds. The override records an audit event and routes the escrow to the predeclared human arbitration path. This limits key-compromise damage without creating a unilateral seizure mechanism.

## Privacy and lawful disclosure

Compliance should prefer proofs of policy satisfaction over raw identity disclosure. Unmasking or document release requires a predeclared legal basis, authorized decision, scoped data request, and auditable disclosure event.

## Prototype boundary

Repository artifacts are protocol designs, not legal advice or a determination that a transaction complies with any jurisdiction. Production deployments require qualified counsel and jurisdiction-specific controls.