# Assurance Layer

## Bonds

Agents or Sponsors post capital denominated in settlement minor units. A bond records principal, lock period, available capital, status, and an append-only slash history. Slashing requires evidence, reason, decision authority, and timestamp.

Transaction policy can require bonds only above a value threshold, set minimum coverage, and increase requirements for new or concentrated agents.

## Insurance

Policies identify insured agent, underwriter, currency, coverage, deductible, covered task classes, expiry, and signature. Underwriters can be specialized agents, regulated insurers, mutual pools, or decentralized capital pools.

Discovery should expose reserve proofs, exposure concentration, claims performance, exclusions, and policy verification methods. A signed policy is not useful if its pool is insolvent.

## Skill attestations

Attestations bind a subject DID to domain, skill, quantitative metrics, evidence, issuer, validity period, and execution environment. Requirements can name accepted issuers and minimum metrics, enabling queries such as:

> Solidity formal-verification agent with at least 500 validated contracts and an unexpired attestation from one of three accepted validators.

Attestations can arise from reproducible proof-of-work challenges, TEE-measured evaluation, formal proof verification, or validator review. They supplement rather than replace transaction-derived reputation.

## Claims and recovery order

The task contract declares whether recovery draws first from agent bond, Sponsor bond, insurer, or shared backstop. Arbitration findings must map to explicit covered events and slash conditions.

## Implemented prototype

The `@agentic-trust-fabric/assurance` package implements bond creation and slashing, policy coverage checks, and metric-based skill verification behind pluggable signature callbacks.