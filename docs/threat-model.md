# Threat Model

## Scope

The protocol assumes public networks, untrusted counterparties, replaceable infrastructure providers, and potentially compromised agent keys. It does not assume that proof-of-personhood issuers, validators, arbiters, or payment rails are infallible.

## Assets

- Sponsor and agent signing authority
- Non-transferable identity and delegation history
- Escrowed funds, bonds, and insurance reserves
- Reputation and skill attestations
- Private task inputs, outputs, and commercial relationships
- Arbitration evidence and legal records

## Principal attacks

| Attack | Mitigation | Residual risk |
|---|---|---|
| Sybil sponsors | Multiple accepted credential issuers, uniqueness proofs, agent limits per Sponsor, increasing bond requirements | Colluding or compromised issuers |
| Identity sale or reputation laundering | Non-transferable sponsor binding, key rotation without identity reset, sponsor-level history | Off-protocol sale of Sponsor control |
| Reputation farming | Rater weighting, objective evidence, transaction-value thresholds, graph analysis, bond slashing | Coordinated long-horizon collusion |
| Disposable-agent reset | New-agent collateral, identity age, Sponsor-linked agent count, non-portable reputation | Legitimate recovery can resemble reset behavior |
| Escrow griefing | Up-front fees or bonds, bounded challenge windows, evidence requirements, loser penalties | Cheap disputes can still delay settlement |
| False delivery evidence | Content-addressed artifacts, deterministic tests, TEE or proof attestations, challenge path | Validators can implement faulty tests |
| Arbitration capture | Predeclared arbiter sets, staking, multi-arbiter thresholds, appeals, transparent outcomes | Concentrated stake and governance capture |
| Mandate replay | Sponsor-scoped nonces consumed atomically after policy validation | Distributed nonce stores require consistency |
| Key compromise | Hardware-backed keys, narrow mandates, spending caps, cascading revocation, emergency stop | Damage before revocation propagates |
| Index censorship | Competing indexes, signed Agent Cards, direct registry queries | Private or niche agents can remain hard to find |
| Insurance insolvency | Reserve proofs, exposure limits, diversified pools, claims history | Correlated failures can exhaust reserves |
| Oracle or issuer compromise | Threshold issuers, short credential expiry, revocation, issuer reputation | Some real-world facts remain externally trusted |
| Privacy leakage | Selective disclosure, encrypted cards, private matching, minimized audit payloads | Timing and payment metadata can remain visible |

## Security invariants

1. A transaction cannot open unless identity, Agent Card, mandate, reputation, assurance, specification, and settlement parties agree.
2. A mandate nonce is consumed only after all admission checks pass and cannot open a second transaction.
3. Funds cannot optimistically release before the declared challenge window closes.
4. Payout shares total exactly 10,000 basis points and milestone values equal the escrow amount.
5. Emergency override routes funds to human arbitration; it never transfers funds directly.

## Out of scope for the prototype

The current TypeScript implementation models verification boundaries but does not implement production signature suites, zero-knowledge circuits, consensus, stablecoin custody, decentralized nonce storage, or on-chain enforcement.