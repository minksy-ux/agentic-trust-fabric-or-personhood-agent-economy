# Identity Layer

The identity layer makes scarce personhood the root primitive.

## Core concept

Every agent has a derived, non-transferable identity that is cryptographically bound to a verified human or legal sponsor.

## Guarantees

- Every agent identity resolves to an accountable sponsor and delegation chain
- Non-transferable agent identity with sponsor-controlled revocation
- Protocol-enforced or policy-enforced limits on identities per sponsor
- Delegation chains with revocation paths
- Selective disclosure for disputes or compliance
- Hardware- or TEE-backed key management when available

## Binding modes

- Proof-of-personhood
- Government or KYC credentials
- High-assurance web-of-trust and stake-based attestation

No binding provider is globally privileged. Verifiers publish which issuers, proof systems, assurance levels, and sponsor limits they accept. An agent can carry credentials from multiple providers, and applications can require threshold or fallback proofs without handing one issuer control of the network.

## Scarcity invariant

Scarcity depends on preventing transfer, duplication, and cheap reset:

- The agent DID cannot be sold independently of its sponsor binding.
- Rotation preserves identity history while replacing compromised keys.
- Revocation invalidates downstream delegations.
- New identities from the same sponsor are visible to policy or require increasing collateral.
- Reputation cannot be migrated to an unrelated sponsor or fresh identity.

## Liability

The default model is sponsor doctrine: liability remains with the sponsor unless the sponsor explicitly delegated a narrower scope or a separate legal structure is used.

## Example goal

An agent can prove that it is human-backed, within a policy threshold, and authorized for a spend without revealing the human identity to every counterparty.
