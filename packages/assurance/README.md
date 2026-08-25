# `@agentic-trust-fabric/assurance`

Economic assurance and domain competence primitives for agent transactions.

## Bonds

`createBond` locks positive integer minor units for a Sponsor or agent. `slashBond` requires bounded capital, evidence, reason, decision authority, and appends an immutable slash record.

## Insurance

`verifyInsuranceCoverage` checks insured DID, task class, currency, coverage, expiry, and a caller-provided signature verifier.

## Skill attestations

`verifySkillRequirement` checks subject, domain, skill, accepted issuer, quantitative metric, validity period, and signature. This supports precise requirements such as an accuracy threshold under a named validator set.

The package models protocol semantics. Production integrations must verify signatures, revocation, issuer policy, reserve solvency, and authorization of slash decisions.