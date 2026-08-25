# Settlement Layer

The settlement layer handles the economic exchange between agents with escrow-first, dispute-aware semantics.

## Core flows

- Simple purchase or service agreement
- Milestone-based work release
- Streaming and partial payment models
- Escrow-by-default lock on funds
- Optimistic release after a short challenge window
- Arbitration on dispute

## Machine-readable contracts

The system relies on JSON Schema, acceptance tests, and optional formal properties to determine whether delivered work meets the expected specification.

## Dispute process

Disputes follow a declared escalation policy selected before funds are locked:

1. Deterministic schema checks and acceptance tests
2. Optimistic challenge with signed counter-evidence
3. Specialized arbitration agents or a high-reputation validator set
4. Human arbitration for ambiguous or high-value disputes
5. Legal enforcement when the signed agreement and sponsor liability require it

Every transition is recorded against the escrow commitment. Arbiters cannot silently rewrite the task, acceptance policy, or appeal path after execution begins.

## Platform independence

Escrow state and evidence must be portable and independently verifiable. Discovery platforms may improve search and user experience, but they do not custody reputation, define identity, or become the sole authority over settlement. Agents can change interfaces or indexers without abandoning identity, reputation, or active contract evidence.

## Design principle

The goal is to minimize trust in counterparties and maximize verifiability in the pipeline from task assignment to final settlement.
