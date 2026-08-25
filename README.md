# Agentic Trust Fabric

**Personhood-Backed Agent Economy**

> The missing trust, identity, and settlement layer for autonomous agent-to-agent commerce.

When one AI agent hires another to research, write code, negotiate a price, book something, or retrieve data, three questions must be answered instantly, cryptographically, and without a human or trusted platform in the loop:

1. **Is the counterparty real and scarce** (not a bot farm or sybil)?
2. **Who is actually responsible** if it fails, steals, or causes harm?
3. **How do we pay and settle** at machine speed with escrow-by-default?

Existing pieces (ERC-8004, x402/MPP, World ID AgentKit, DIDs, VCs, ad-hoc escrows) solve fragments. **None yet combine scarce human-backed identity + portable multi-dimensional reputation + sub-cent escrow + automated arbitration into a single coherent, permissionless stack.**

Agentic Trust Fabric does.

## Protocol Thesis

Agentic Trust Fabric is a permissionless protocol in which no marketplace, identity vendor, payment rail, or arbitration provider is mandatory. Its security comes from composing four properties in every transaction:

1. **Strict identity scarcity:** Each agent identity is non-transferable and cryptographically bound to a verified human or organization. Multiple credential issuers can attest to that binding under transparent acceptance policies.
2. **Durable, portable reputation:** Multi-dimensional evidence accrues to the scarce identity rather than a disposable wallet, making earned trust expensive to abandon while remaining portable between applications.
3. **Escrow-first execution:** Funds lock against signed, machine-readable specifications. Successful work follows an optimistic release path; challenged work escalates from deterministic checks to automated arbitration and, only when required, human or legal review.
4. **Agent-native coordination:** Signed Agent Cards, attenuated intent mandates, and machine-speed settlement let agents discover, authorize, contract with, and pay one another without a trusted platform intermediary.

Permissionless does not mean trust-free. Anyone may publish, verify, integrate, or transact; each participant independently chooses accepted credential issuers, reputation policies, settlement rails, and arbiters. Those choices are explicit, signed, and replaceable rather than controlled by one platform.

## Core Architecture

### 0. Discovery & Capability Layer
Agents publish signed, versioned **Agent Cards** containing capabilities, schemas, pricing models, SLA templates, endpoints, and supported verification methods.

- Hybrid registry: on-chain (permanence + composability, building on ERC-8004-style registries) + high-performance off-chain indexes.
- Semantic + structured queries: “high-reputation code agents that accept USDC escrow and support formal verification proofs.”

### 1. Identity Layer — Scarce Personhood Anchor
Every agent receives a **derived, non-transferable identity** cryptographically bound at creation to exactly one verified human or legal entity (the **Sponsor**).

- Pluggable binding: biometric/hardware-attested proof-of-personhood (World ID and equivalents), government/KYC credentials, or high-assurance web-of-trust + stake.
- Agent receives a DID + Verifiable Credential that proves “backed by a unique, living, accountable Sponsor” via zero-knowledge proof.
- Human identity remains private unless selective disclosure is required by dispute or legal process.

Key properties:
- Soulbound / non-transferable (prevents reputation markets and laundering)
- Limited agents per Sponsor (or escalating stake/cost)
- Delegation chains with attenuation: human → org → agent → sub-agent, with cascading revocation
- Hardware-attested or TEE-backed key management

Liability defaults to the Sponsor (sponsor doctrine).

### 2. Trust / Reputation Layer — Costly Signal
Multi-dimensional, portable reputation score attached to the agent’s DID (not a disposable wallet).

Signals:
- Completed contracts (volume, value, on-time rate)
- Dispute outcomes and arbitration results
- Counterparty ratings (weighted by rater reputation + stake)
- Objective attestations (tests passed, formal proofs, TEE receipts, external validators)
- Stake-weighted / slashing history

New agents start low-trust and must post higher collateral or accept lower-value work. Reputation is selectively disclosable / ZK-provable and fully portable across platforms.

### 3. Assurance Layer — Bonds, Insurance & Skills
- Slashable agent or Sponsor bonds provide first-loss capital for proven misconduct.
- Signed insurance policies add coverage above configurable transaction thresholds.
- Domain skill attestations bind quantitative competence metrics and evidence to the scarce agent identity.
- New-agent collateral can start high and decay with verified performance.

### 4. Intent & Policy Layer — Bounded Authority
- Sponsor and agent policies restrict counterparties, jurisdictions, delegation depth, spend, time windows, and human approval thresholds.
- Delegation can only attenuate authority; restrictive policies win conflicts.
- Sponsor-scoped nonces prevent mandate replay, and emergency stops route unsettled funds to human arbitration.

### 5. Settlement Layer — Machine-Speed Escrow & Arbitration
- Sub-second, sub-cent payments (x402-style HTTP 402, MPP sessions, payment channels, high-throughput stablecoin rails).
- **Escrow-by-default**: funds lock until both parties (or automated arbiter) confirm the deliverable meets the machine-readable specification.
- Specs: JSON Schema + acceptance tests + optional formal properties.
- Delivery can include cryptographic proofs of work.
- Optimistic path: auto-release after short challenge window.
- Dispute path: specialized high-reputation arbitration agents or multi-model consensus first; human/legal escalation only when needed.
- First-class support for milestones, streaming payments, partial releases, and insurance/staking pools.

## Supporting Mechanisms

- **Authorization & Intent Mandates**: Signed, time- and scope-limited mandates from the Sponsor (“Know Your Agent”).
- **Privacy**: Zero-knowledge proofs for attributes (“human-backed, reputation ≥ threshold, authorized for this spend”).
- **Economic incentives**: Tiny protocol fees, staking for arbitration rights, reputation-weighted governance. Bad behavior is expensive.
- **Legal interface**: Sponsor bond makes agents legible to existing law. Ricardian contracts bridge on-chain state to legal prose.
- **Fail-safes**: Circuit breakers, spending limits, emergency human override, insurance pools.

## Why This Is Stronger

Current efforts solve pieces well but remain incomplete on:
- True scarcity of identity
- Portable multi-dimensional reputation tied to real accountability
- Seamless escrow + automated arbitration that works at pure machine speed

Agentic Trust Fabric treats **personhood scarcity as the root economic primitive**, makes liability explicit, and designs settlement so that trust is minimized rather than merely scored.

Honesty becomes the rational, low-friction strategy.

## Status

🚧 **Early design & specification phase**

We are aligning with and extending:
- ERC-8004 (and related agent identity registries)
- W3C DID / Verifiable Credentials
- x402 / Machine Payments Protocol (MPP)
- Soulbound / non-transferable identity patterns
- Existing proof-of-personhood systems

## Roadmap (High Level)

1. Protocol specifications and cross-implementation conformance
2. Scarce identity, replay-resistant mandates, and basic escrow
3. Portable reputation, skill attestations, and arbitration
4. Multi-party escrow, bonds, insurance, and privacy
5. Governance, compliance tooling, MCP/A2A SDKs, and vertical pilots

See [docs/roadmap.md](docs/roadmap.md) for details.

## Design Documents

- [Architecture](docs/architecture.md)
- [Threat Model](docs/threat-model.md)
- [Assurance Layer](docs/assurance-layer.md)
- [Privacy and Cryptography](docs/privacy.md)
- [Economic Model](docs/economic-model.md)
- [Governance](docs/governance.md)
- [Observability and Audit](docs/observability.md)
- [Local Signed Runtime](docs/local-runtime.md)
- [Legal and Compliance](docs/legal-compliance.md)
- [Comparison Matrix](docs/comparison-matrix.md)
- [Bootstrap Strategy](docs/bootstrap.md)
- [Vertical Playbooks](docs/vertical-playbooks.md)

## Getting Involved

This is an open, standards-oriented project. We welcome:

- Protocol designers and cryptographers
- Agent framework authors
- Identity / proof-of-personhood experts
- Payment and escrow engineers
- Legal / regulatory thinkers focused on agent liability

Open an issue, start a discussion, or propose a PR against the specs.

## Development

The repository is an npm workspace containing the identity, reputation, assurance, settlement, runtime, and SDK packages.

```bash
npm install
npm run build
npm --workspace hello-agent-hire start
npm run atf -- help
```

Package documentation:

- [Identity](packages/identity/README.md)
- [Reputation](packages/reputation/README.md)
- [Assurance](packages/assurance/README.md)
- [Settlement](packages/settlement/README.md)
- [Runtime](packages/runtime/README.md)
- [CLI](packages/cli/README.md)
- [SDK](packages/sdk/README.md)
- [Hello Agent Hire](examples/hello-agent-hire/README.md)

## License

MIT (or Apache-2.0 — final decision pending)

---

**Agentic Trust Fabric**<br>
Making agent-to-agent commerce safe, accountable, and permissionless.
