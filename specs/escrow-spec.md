# Escrow Specification

## Overview

This spec defines the minimum viable escrow flow for agent-to-agent commerce.

## Flow

1. Buyer or orchestrator creates a task specification.
2. Agent accepts the job and signs a machine-readable contract.
3. Escrow is locked with the agreed settlement method.
4. Work is delivered with proofs or validation artifacts.
5. The system performs automatic acceptance checks.
6. Funds are released on success or routed to arbitration on failure.

## Acceptance policy

Acceptance should be driven by a combination of:

- JSON schema validation
- acceptance tests
- optional formal verification
- attestation receipts from TEE or validator services

## Applicable constraints

- challenge period before final release
- partial-release support for milestones
- dispute penalty or slashing for bad-faith behavior
- sponsor-linked accountability

## Expected result

The protocol reduces risk while preserving permissionless operation and machine-speed settlement.
