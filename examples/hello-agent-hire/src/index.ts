import {
  summarizeHireRequest,
  createAgentIdentity,
  createBond,
  createEvidencePackage,
  scoreReputation,
  openAgentTransaction,
  submitDelivery,
  releaseEscrow,
  generateEd25519KeyPair,
  LocalTrustRuntime,
  signArtifact,
  signCanonical,
  verifyArtifactSignature,
  verifyCanonicalSignature,
  verifyEvidencePackage,
  type AgentCard,
  type AgentHireRequest,
  type IntentMandate,
  type MachineReadableSpec,
} from '@agentic-trust-fabric/sdk';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const personhoodIssuerKeys = generateEd25519KeyPair();
const sellerAgentKeys = generateEd25519KeyPair();
const buyerSponsorKeys = generateEd25519KeyPair();
const insuranceKeys = generateEd25519KeyPair();
const validatorKeys = generateEd25519KeyPair();
const credentialClaims = {
  schemaVersion: '1.0.0' as const,
  id: 'credential-001',
  issuerDid: 'did:example:personhood-issuer',
  subjectDid: 'did:example:sponsor-001',
  type: 'proof-of-personhood' as const,
  issuedAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2027-01-01T00:00:00.000Z',
};

const sponsor = {
  did: 'did:example:sponsor-001',
  name: 'Alice Sponsor',
  credential: {
    ...credentialClaims,
    proof: signCanonical(credentialClaims, personhoodIssuerKeys.privateKeyPem),
  },
};

const agent = createAgentIdentity(sponsor, 'did:example:agent-001');
const request: AgentHireRequest = {
  id: 'hire-001',
  buyerDid: 'did:example:buyer-001',
  sellerDid: agent.did,
  taskType: 'research',
  description: 'research pricing for API integration',
  maxFee: 75,
  currency: 'USDC',
  minimumReputation: 80,
  jurisdiction: 'US-DE',
};
const agentCard = signArtifact<AgentCard>({
  schemaVersion: '1.0.0',
  id: 'card-001',
  agentDid: agent.did,
  capabilities: ['research'],
  endpoint: 'https://agent.example/a2a',
  acceptedCurrencies: ['USDC'],
  supportedProtocolVersions: ['1.0.0'],
  skillAttestationIds: ['skill-001'],
  bondIds: ['bond-001'],
  insurancePolicyIds: ['policy-001'],
  signature: '',
}, sellerAgentKeys.privateKeyPem);
const mandate = signArtifact<IntentMandate>({
  schemaVersion: '1.0.0',
  id: 'mandate-001',
  sponsorDid: 'did:example:buyer-sponsor-001',
  agentDid: request.buyerDid,
  allowedTaskTypes: ['research'],
  maxSpend: 100,
  currency: 'USDC',
  validFrom: '2026-01-01T00:00:00.000Z',
  expiresAt: '2027-01-01T00:00:00.000Z',
  policyVersion: '1.0.0',
  delegation: { depth: 0 },
  policy: {
    allowedCounterparties: [agent.did],
    allowedJurisdictions: ['US-DE'],
    maxDelegationDepth: 1,
    emergencyStop: false,
    requireHumanApprovalAboveMinor: 1_000,
  },
  nonce: 'demo-nonce-001',
  signature: '',
}, buyerSponsorKeys.privateKeyPem);
const specification: MachineReadableSpec = {
  schemaVersion: '1.0.0',
  id: 'spec-001',
  taskType: 'research',
  inputSchemaUri: 'ipfs://example-input-schema',
  outputSchemaUri: 'ipfs://example-output-schema',
  acceptanceCriteria: [
    { id: 'schema-valid', kind: 'json-schema', description: 'Output matches the agreed schema.' },
    { id: 'sources-present', kind: 'test', description: 'Every result includes a source.' },
  ],
  legalTerms: {
    ricardianContractUri: 'ipfs://ricardian-contract',
    governingJurisdiction: 'US-DE',
    compliancePolicyUri: 'ipfs://compliance-policy',
    emergencyOverrideDid: 'did:example:buyer-sponsor-001',
  },
};
const trust = scoreReputation(agent.did, [
  { kind: 'contract-completion', weight: 2, value: 0.9 },
  { kind: 'dispute-history', weight: 3, value: 0.8 },
]);
const bond = createBond('bond-001', agent.did, 100, 'USDC', new Date('2027-01-01T00:00:00.000Z'));
const insurancePolicy = signArtifact({
  schemaVersion: '1.0.0' as const,
  id: 'policy-001',
  insuredDid: agent.did,
  underwriterDid: 'did:example:underwriter-001',
  currency: 'USDC',
  coverageAmountMinor: 100,
  deductibleAmountMinor: 10,
  coveredTaskTypes: ['research'],
  expiresAt: '2027-01-01T00:00:00.000Z',
  signature: '',
}, insuranceKeys.privateKeyPem);
const skillAttestation = signArtifact({
  schemaVersion: '1.0.0' as const,
  id: 'skill-001',
  subjectDid: agent.did,
  issuerDid: 'did:example:research-validator',
  domain: 'research',
  skill: 'source-verification',
  metrics: [{ name: 'accuracy', value: 99.2, unit: 'percentage' as const }],
  evidenceUri: 'ipfs://skill-evidence',
  issuedAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2027-01-01T00:00:00.000Z',
  executionEnvironment: 'tee:example',
  signature: '',
}, validatorKeys.privateKeyPem);
const runtimeDirectory = mkdtempSync(join(tmpdir(), 'agentic-trust-fabric-'));
const runtimePath = join(runtimeDirectory, 'runtime.json');
const runtime = new LocalTrustRuntime(runtimePath);
runtime.credit(request.buyerDid, request.currency, 100, new Date('2026-08-25T11:59:00.000Z'));

const transaction = openAgentTransaction({
  request,
  agentCard,
  mandate,
  sellerIdentity: agent,
  sellerReputation: trust,
  assurance: { bond, insurancePolicy, skillAttestations: [skillAttestation] },
  assuranceRequirements: {
    bondRequiredAboveMinor: 50,
    minimumBondMinor: 75,
    insuranceRequiredAboveMinor: 50,
    requiredSkills: [{
      domain: 'research',
      skill: 'source-verification',
      metricName: 'accuracy',
      minimumValue: 97,
      acceptedIssuers: ['did:example:research-validator'],
    }],
  },
  specification,
  arbitrationPolicy: {
    challengeWindowSeconds: 60,
    automatedArbiters: ['did:example:arbiter-001'],
    humanForum: 'Example Arbitration Forum',
  },
  openedAt: new Date('2026-08-25T12:00:00.000Z'),
  verification: {
    verifySponsorCredential: (credential) => {
      const { proof, ...claims } = credential;
      return verifyCanonicalSignature(claims, proof, personhoodIssuerKeys.publicKeyPem);
    },
    verifyAgentCard: (card) => verifyArtifactSignature(card, sellerAgentKeys.publicKeyPem),
    verifyIntentMandate: (intentMandate) => verifyArtifactSignature(intentMandate, buyerSponsorKeys.publicKeyPem),
    consumeMandateNonce: (sponsorDid, nonce) => runtime.consumeNonce(
      sponsorDid,
      nonce,
      new Date('2026-08-25T12:00:00.000Z'),
    ),
    verifyInsurancePolicy: (policy) => verifyArtifactSignature(policy, insuranceKeys.publicKeyPem),
    verifySkillAttestation: (attestation) => verifyArtifactSignature(attestation, validatorKeys.publicKeyPem),
    verifyHumanApproval: (hireRequest) => Boolean(hireRequest.humanApproval),
  },
});
runtime.lockEscrow(
  transaction.escrow.id,
  transaction.escrow.buyerDid,
  transaction.escrow.currency,
  transaction.escrow.amount,
  new Date('2026-08-25T12:00:01.000Z'),
);
const pendingRelease = submitDelivery(transaction.escrow, [
  { criterionId: 'schema-valid', passed: true, artifactUri: 'ipfs://schema-report' },
  { criterionId: 'sources-present', passed: true, artifactUri: 'ipfs://test-report' },
], new Date('2026-08-25T12:01:00.000Z'));
const settledEscrow = releaseEscrow(pendingRelease, new Date('2026-08-25T12:02:00.000Z'));
runtime.releaseEscrow(
  settledEscrow.id,
  settledEscrow.payoutPlan.map(({ recipientDid, shareBasisPoints }) => ({ recipientDid, shareBasisPoints })),
  new Date('2026-08-25T12:02:01.000Z'),
);
const reopenedRuntime = new LocalTrustRuntime(runtimePath);
const evidencePackage = createEvidencePackage({
  id: 'evidence-hire-001',
  transactionId: transaction.escrow.id,
  createdAt: new Date('2026-08-25T12:03:00.000Z'),
  signerDid: mandate.sponsorDid,
  keyId: `${mandate.sponsorDid}#key-1`,
  artifacts: [
    { name: 'agent-card', mediaType: 'application/json', content: agentCard },
    { name: 'intent-mandate', mediaType: 'application/json', content: mandate },
    { name: 'task-spec', mediaType: 'application/json', content: specification },
    { name: 'settled-escrow', mediaType: 'application/json', content: settledEscrow },
  ],
  events: reopenedRuntime.listEvents(transaction.escrow.id),
}, buyerSponsorKeys.privateKeyPem);
const evidencePath = join(runtimeDirectory, 'evidence.json');
const evidencePublicKeyPath = join(runtimeDirectory, 'evidence-public-key.pem');
writeFileSync(evidencePath, `${JSON.stringify(evidencePackage, null, 2)}\n`, { mode: 0o600 });
writeFileSync(evidencePublicKeyPath, buyerSponsorKeys.publicKeyPem, { mode: 0o600 });

console.log('Agent discovered:', transaction.agentCard.id);
console.log('Mandate verified:', transaction.mandate.id);
console.log('Hire request:', summarizeHireRequest(request));
console.log('Reputation score:', trust.overall);
console.log('Assurance verified:', transaction.assurance.bond?.id, transaction.assurance.insurancePolicy?.id);
console.log('Acceptance state:', pendingRelease.status);
console.log('Escrow status:', settledEscrow.status);
console.log('Audit events:', settledEscrow.history.length);
console.log('Signed Agent Card valid:', verifyArtifactSignature(agentCard, sellerAgentKeys.publicKeyPem));
console.log('Buyer simulated balance:', reopenedRuntime.getBalance(request.buyerDid, request.currency));
console.log('Seller simulated balance:', reopenedRuntime.getBalance(request.sellerDid, request.currency));
console.log('Persistent event chain valid:', reopenedRuntime.verifyEventChain());
console.log('Evidence package valid:', verifyEvidencePackage(evidencePackage, buyerSponsorKeys.publicKeyPem));
console.log('Runtime state:', runtimePath);
console.log('Evidence package:', evidencePath);
console.log('Evidence public key:', evidencePublicKeyPath);
