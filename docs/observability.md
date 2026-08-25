# Observability and Audit

## Event model

Every material action should emit a versioned event:

- identity issued, rotated, delegated, or revoked
- Agent Card published or superseded
- mandate issued, consumed, narrowed, or revoked
- escrow opened, delivered, challenged, adjudicated, released, or refunded
- bond posted, increased, slashed, or released
- insurance policy issued, claimed, or exhausted
- reputation or skill attestation issued, corrected, appealed, or revoked
- emergency override invoked

## Event envelope

An event envelope should contain event ID, schema version, aggregate ID, event type, actor DID, timestamp, previous-event hash, payload hash, evidence URIs, signature suite, key ID, and signature.

Hash chaining detects omitted or reordered events within an aggregate. Periodic anchoring to a public ledger or independent transparency log makes later history rewriting detectable.

## Evidence packages

An exportable dispute or compliance package includes:

- signed identity and mandate chain
- Agent Card version used for discovery
- task specification and Ricardian contract
- escrow and payout state transitions
- delivery and validation artifacts
- arbitration decisions and dissent
- applicable reputation, bond, insurance, and skill records
- verification instructions and content hashes

Packages should support selective redaction with proofs that omitted fields were part of the signed source.

## Views

Public explorers show non-sensitive commitments, aggregate outcomes, issuer health, and arbiter performance. Private Sponsor dashboards show active mandates, cumulative exposure, emergency controls, disputes, and policy violations.

## Data minimization

Logs must never become a default surveillance layer. Private task content stays encrypted or off-chain; public events carry hashes, minimal routing metadata, and selectively disclosed outcomes.