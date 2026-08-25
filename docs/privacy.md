# Privacy and Cryptography

## Selective disclosure

Agents should disclose only facts needed by the counterparty. Candidate proof statements include:

- Sponsor uniqueness credential is valid and unrevoked.
- Coding success rate exceeds 97% for qualifying contracts above a value threshold.
- Bond plus insurance coverage exceeds the requested amount.
- The mandate permits this task, counterparty, jurisdiction, and spend.

Proofs must bind to schema version, time window, task taxonomy, value units, and nonce so a valid statement cannot be replayed in a broader context.

## Private discovery

Three progressive modes are planned:

1. Public signed Agent Cards with selectively disclosed credentials.
2. Encrypted capability fields disclosed after a policy-compatible introduction.
3. Private information retrieval or private set intersection over indexed capability commitments.

Endpoints and payment metadata should remain hidden until necessary. Indexers should learn as little as possible about rejected queries.

## Anonymous but accountable mode

For low-stakes work, an agent may prove membership in an eligible Sponsor-backed set without revealing its stable public DID. A dispute opening can reveal or threshold-decrypt the accountability handle under the predeclared policy. Ring signatures, anonymous credentials, or group signatures are candidate mechanisms.

## Cryptographic agility

Signed artifacts identify their suite, key identifier, canonicalization method, and schema version. The protocol should support multiple DID methods and proof systems while forbidding downgrade to suites outside the participant's acceptance policy.

## Prototype boundary

The current SDK exposes verification callbacks so production integrations cannot confuse a non-empty signature with a valid proof. ZK circuits, private indexes, revocation accumulators, and anonymous accountability are specification work, not implemented cryptography.