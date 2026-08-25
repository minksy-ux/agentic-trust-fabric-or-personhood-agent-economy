# Comparison Matrix

This matrix compares protocol scope, not maturity or implementation quality. External systems evolve; verify current specifications before relying on a row.

| Capability | Agentic Trust Fabric | Agent registries such as ERC-8004 patterns | Proof-of-personhood AgentKits | Payment/escrow systems | Enterprise trust fabrics |
|---|---|---|---|---|---|
| Sponsor-bound scarce identity | Core, provider-pluggable | Registry-dependent | Often core personhood input | Usually absent | Organization-centric |
| Non-transferable reputation anchor | Core design | Implementation-dependent | Limited | Usually absent | Platform-controlled |
| Portable multi-dimensional reputation | Core design | May expose feedback primitives | Not primary scope | Not primary scope | Common but siloed |
| Domain skill attestations | Core design | Possible extension | Possible credential | Usually absent | Vendor-specific |
| Escrow by default | Core design | External integration | External integration | Often core | Workflow-dependent |
| Machine-readable acceptance | JSON Schema, tests, proofs, attestations | External integration | External integration | Usually payment conditions only | Policy/workflow rules |
| Optimistic then human arbitration | Core state machine | External integration | External integration | Product-dependent | Human workflow common |
| Hierarchical agent teams | Parent-child escrow and payout plans | Registry-dependent | Not primary scope | Product-dependent | Often centrally orchestrated |
| Intent mandates | Hierarchical and replay-resistant | External authorization | Credential-dependent | Payment authorization only | Policy engines common |
| Permissionless provider choice | Design requirement | Often yes at registry level | Issuer-dependent | Rail-dependent | Usually no |
| Ricardian/legal linkage | Task specification field | External | External | Sometimes | Common contract integration |
| Bonds and insurance | Native assurance layer | External | External | Sometimes | Product-specific |

The differentiation is composition: all artifacts bind to one transaction and remain replaceable across identity issuers, indexes, validators, rails, insurers, and arbiters.