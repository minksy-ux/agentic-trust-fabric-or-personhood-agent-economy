import {
  verifySponsorBinding,
  type AgentIdentity,
  type SponsorCredential,
} from '@agentic-trust-fabric/identity';
import { isHighTrust, type ReputationScore } from '@agentic-trust-fabric/reputation';
import {
  verifyInsuranceCoverage,
  verifySkillRequirement,
  type AgentBond,
  type InsurancePolicy,
  type SkillAttestation,
  type SkillRequirement,
} from '@agentic-trust-fabric/assurance';
import {
  createEscrow,
  type ArbitrationPolicy,
  type Escrow,
  type MachineReadableSpec,
} from '@agentic-trust-fabric/settlement';

export {
  canonicalize,
  createEvidencePackage,
  generateEd25519KeyPair,
  LocalTrustRuntime,
  sha256,
  signArtifact,
  signCanonical,
  verifyArtifactSignature,
  verifyCanonicalSignature,
  verifyEvidencePackage,
  verifyFabricEventChain,
} from '@agentic-trust-fabric/runtime';
export type {
  AppendEventInput,
  CreateEvidencePackageInput,
  Ed25519KeyPair,
  EvidenceArtifact,
  EvidencePackage,
  FabricEvent,
  LedgerHold,
  LedgerPayout,
} from '@agentic-trust-fabric/runtime';

export {
  createAgentIdentity,
  createIdentityRegistry,
  registerAgentIdentity,
  verifySponsorBinding,
} from '@agentic-trust-fabric/identity';
export type { AgentIdentity, IdentityRegistry, Sponsor, SponsorCredential } from '@agentic-trust-fabric/identity';
export { scoreReputation, isHighTrust } from '@agentic-trust-fabric/reputation';
export {
  createBond,
  slashBond,
  verifyInsuranceCoverage,
  verifySkillRequirement,
} from '@agentic-trust-fabric/assurance';
export type {
  AgentBond,
  BondStatus,
  InsurancePolicy,
  SkillAttestation,
  SkillMetric,
  SkillRequirement,
  SlashRecord,
} from '@agentic-trust-fabric/assurance';
export {
  challengeEscrow,
  createChildEscrow,
  createEscrow,
  releaseEscrow,
  resolveAutomatedArbitration,
  resolveHumanArbitration,
  submitDelivery,
  triggerEmergencyStop,
} from '@agentic-trust-fabric/settlement';
export type {
  AcceptanceCriterion,
  AcceptanceEvidence,
  ArbitrationPolicy,
  ChildEscrowAllocation,
  Escrow,
  EscrowEvent,
  EscrowMilestone,
  EscrowStatus,
  MachineReadableSpec,
  LegalTerms,
  PayoutRecipient,
} from '@agentic-trust-fabric/settlement';

export type AgentCard = {
  schemaVersion: '1.0.0';
  id: string;
  agentDid: string;
  capabilities: string[];
  endpoint: string;
  acceptedCurrencies: string[];
  supportedProtocolVersions: string[];
  skillAttestationIds: string[];
  bondIds: string[];
  insurancePolicyIds: string[];
  signature: string;
};

export type IntentMandate = {
  schemaVersion: '1.0.0';
  id: string;
  sponsorDid: string;
  agentDid: string;
  allowedTaskTypes: string[];
  maxSpend: number;
  currency: string;
  validFrom: string;
  expiresAt: string;
  policyVersion: string;
  delegation: {
    depth: number;
    parentMandateId?: string;
  };
  policy: IntentPolicy;
  nonce: string;
  signature: string;
};

export type IntentPolicy = {
  allowedCounterparties?: string[];
  deniedCounterparties?: string[];
  allowedJurisdictions?: string[];
  maxDelegationDepth: number;
  emergencyStop: boolean;
  requireHumanApprovalAboveMinor?: number;
};

export type AgentHireRequest = {
  id: string;
  buyerDid: string;
  sellerDid: string;
  taskType: string;
  description: string;
  maxFee: number;
  currency: string;
  minimumReputation: number;
  jurisdiction: string;
  humanApproval?: string;
};

export type AgentTransaction = {
  request: AgentHireRequest;
  agentCard: AgentCard;
  mandate: IntentMandate;
  sellerIdentity: AgentIdentity;
  sellerReputation: ReputationScore;
  assurance: TransactionAssurance;
  escrow: Escrow;
};

export type AssuranceRequirements = {
  bondRequiredAboveMinor?: number;
  minimumBondMinor?: number;
  insuranceRequiredAboveMinor?: number;
  coverageRatioBasisPoints?: number;
  requiredSkills?: SkillRequirement[];
};

export type TransactionAssurance = {
  bond?: AgentBond;
  insurancePolicy?: InsurancePolicy;
  skillAttestations: SkillAttestation[];
};

export type OpenTransactionInput = {
  request: AgentHireRequest;
  agentCard: AgentCard;
  mandate: IntentMandate;
  sellerIdentity: AgentIdentity;
  sellerReputation: ReputationScore;
  assurance?: TransactionAssurance;
  assuranceRequirements?: AssuranceRequirements;
  agentPolicy?: IntentPolicy;
  specification: MachineReadableSpec;
  arbitrationPolicy: ArbitrationPolicy;
  openedAt: Date;
  verification: TransactionVerification;
};

export type TransactionVerification = {
  verifySponsorCredential: (credential: SponsorCredential) => boolean;
  verifyAgentCard: (card: AgentCard) => boolean;
  verifyIntentMandate: (mandate: IntentMandate) => boolean;
  consumeMandateNonce: (sponsorDid: string, nonce: string) => boolean;
  verifyInsurancePolicy: (policy: InsurancePolicy) => boolean;
  verifySkillAttestation: (attestation: SkillAttestation) => boolean;
  verifyHumanApproval: (request: AgentHireRequest) => boolean;
};

export function openAgentTransaction(input: OpenTransactionInput): AgentTransaction {
  const { request, agentCard, mandate, sellerIdentity, sellerReputation, specification, arbitrationPolicy } = input;

  requireCondition(!Number.isNaN(input.openedAt.getTime()), 'Transaction opening time is invalid.');
  requireCondition(
    Number.isSafeInteger(request.maxFee) && request.maxFee > 0,
    'Maximum fee must be a positive integer in the currency minor unit.',
  );
  requireCondition(
    Number.isFinite(request.minimumReputation)
      && request.minimumReputation >= 0
      && request.minimumReputation <= 100,
    'Minimum reputation must be between zero and 100.',
  );
  requireCondition(
    verifySponsorBinding(sellerIdentity, input.openedAt, input.verification.verifySponsorCredential),
    'Seller identity is not backed by a valid sponsor credential.',
  );
  requireCondition(sellerIdentity.did === request.sellerDid, 'Seller identity does not match the request.');
  requireCondition(agentCard.agentDid === request.sellerDid, 'Agent Card does not match the seller.');
  requireCondition(agentCard.capabilities.includes(request.taskType), 'Agent Card does not advertise the task type.');
  requireCondition(agentCard.acceptedCurrencies.includes(request.currency), 'Agent Card does not accept the currency.');
  requireCondition(input.verification.verifyAgentCard(agentCard), 'Agent Card signature is invalid.');
  requireCondition(mandate.agentDid === request.buyerDid, 'Mandate does not authorize the buyer agent.');
  requireCondition(mandate.allowedTaskTypes.includes(request.taskType), 'Mandate does not authorize the task type.');
  requireCondition(mandate.currency === request.currency, 'Mandate currency does not match the request.');
  requireCondition(mandate.maxSpend >= request.maxFee, 'Request exceeds the mandate spend limit.');
  const mandateValidFrom = new Date(mandate.validFrom);
  const mandateExpiry = new Date(mandate.expiresAt);
  requireCondition(!Number.isNaN(mandateValidFrom.getTime()), 'Mandate start time is invalid.');
  requireCondition(!Number.isNaN(mandateExpiry.getTime()), 'Mandate expiry is invalid.');
  requireCondition(mandateValidFrom <= input.openedAt, 'Mandate is not active yet.');
  requireCondition(mandateExpiry > input.openedAt, 'Mandate has expired.');
  requireCondition(input.verification.verifyIntentMandate(mandate), 'Intent mandate signature is invalid.');
  const sponsorPolicyViolations = evaluateIntentPolicy(
    mandate.policy,
    request,
    mandate.delegation.depth,
    input.verification.verifyHumanApproval,
  );
  requireCondition(
    sponsorPolicyViolations.length === 0,
    `Sponsor policy denied the transaction: ${sponsorPolicyViolations.join('; ')}`,
  );
  if (input.agentPolicy) {
    const agentPolicyViolations = evaluateIntentPolicy(
      input.agentPolicy,
      request,
      mandate.delegation.depth,
      input.verification.verifyHumanApproval,
    );
    requireCondition(
      agentPolicyViolations.length === 0,
      `Agent policy denied the transaction: ${agentPolicyViolations.join('; ')}`,
    );
  }
  requireCondition(sellerReputation.agentDid === request.sellerDid, 'Reputation does not match the seller.');
  requireCondition(isHighTrust(sellerReputation, request.minimumReputation), 'Seller does not meet the trust threshold.');
  requireCondition(specification.taskType === request.taskType, 'Specification does not match the task type.');
  requireCondition(
    specification.legalTerms.governingJurisdiction === request.jurisdiction,
    'Legal terms jurisdiction does not match the request.',
  );
  const assurance = input.assurance ?? { skillAttestations: [] };
  verifyAssurance(
    assurance,
    input.assuranceRequirements ?? {},
    request,
    input.openedAt,
    input.verification,
  );
  requireCondition(
    input.verification.consumeMandateNonce(mandate.sponsorDid, mandate.nonce),
    'Intent mandate nonce has already been consumed.',
  );

  const escrow = createEscrow(
    request.id,
    request.maxFee,
    request.currency,
    request.buyerDid,
    request.sellerDid,
    {
      mandateId: mandate.id,
      specification,
      arbitrationPolicy,
      openedAt: input.openedAt,
    },
  );

  return {
    request,
    agentCard,
    mandate,
    sellerIdentity,
    sellerReputation,
    assurance,
    escrow,
  };
}

export function evaluateIntentPolicy(
  policy: IntentPolicy,
  request: AgentHireRequest,
  delegationDepth: number,
  verifyHumanApproval: (request: AgentHireRequest) => boolean,
): string[] {
  const violations: string[] = [];
  if (policy.emergencyStop) {
    violations.push('emergency stop is active');
  }
  if (policy.allowedCounterparties && !policy.allowedCounterparties.includes(request.sellerDid)) {
    violations.push('counterparty is not allowlisted');
  }
  if (policy.deniedCounterparties?.includes(request.sellerDid)) {
    violations.push('counterparty is denied');
  }
  if (policy.allowedJurisdictions && !policy.allowedJurisdictions.includes(request.jurisdiction)) {
    violations.push('jurisdiction is not allowed');
  }
  if (!Number.isSafeInteger(delegationDepth) || delegationDepth < 0 || delegationDepth > policy.maxDelegationDepth) {
    violations.push('delegation depth exceeds policy');
  }
  if (policy.requireHumanApprovalAboveMinor !== undefined
    && request.maxFee >= policy.requireHumanApprovalAboveMinor
    && !verifyHumanApproval(request)) {
    violations.push('human approval is required');
  }
  return violations;
}

function verifyAssurance(
  assurance: TransactionAssurance,
  requirements: AssuranceRequirements,
  request: AgentHireRequest,
  verifiedAt: Date,
  verification: TransactionVerification,
): void {
  if (requirements.bondRequiredAboveMinor !== undefined && request.maxFee >= requirements.bondRequiredAboveMinor) {
    const minimumBondMinor = requirements.minimumBondMinor ?? request.maxFee;
    requireCondition(
      assurance.bond?.principalDid === request.sellerDid
        && assurance.bond.currency === request.currency
        && assurance.bond.availableAmountMinor >= minimumBondMinor
        && assurance.bond.status !== 'released'
        && assurance.bond.status !== 'slashed'
        && new Date(assurance.bond.lockedUntil) > verifiedAt,
      'Seller does not satisfy the transaction bond requirement.',
    );
  }

  if (requirements.insuranceRequiredAboveMinor !== undefined
    && request.maxFee >= requirements.insuranceRequiredAboveMinor) {
    const coverageRatioBasisPoints = requirements.coverageRatioBasisPoints ?? 10_000;
    requireCondition(
      Number.isSafeInteger(coverageRatioBasisPoints)
        && coverageRatioBasisPoints > 0
        && coverageRatioBasisPoints <= 100_000,
      'Coverage ratio must be between one and 100,000 basis points.',
    );
    const requiredCoverageMinor = Math.ceil(request.maxFee * coverageRatioBasisPoints / 10_000);
    requireCondition(
      assurance.insurancePolicy !== undefined
        && verifyInsuranceCoverage(
          assurance.insurancePolicy,
          request.sellerDid,
          request.taskType,
          request.currency,
          requiredCoverageMinor,
          verifiedAt,
          verification.verifyInsurancePolicy,
        ),
      'Seller does not satisfy the transaction insurance requirement.',
    );
  }

  for (const requirement of requirements.requiredSkills ?? []) {
    requireCondition(
      assurance.skillAttestations.some((attestation) => verifySkillRequirement(
        attestation,
        request.sellerDid,
        requirement,
        verifiedAt,
        verification.verifySkillAttestation,
      )),
      `Seller does not satisfy the required skill ${requirement.domain}:${requirement.skill}.`,
    );
  }
}

export function summarizeHireRequest(request: AgentHireRequest): string {
  return `${request.buyerDid} requests ${request.description} from ${request.sellerDid} with max fee ${request.maxFee} ${request.currency}.`;
}

function requireCondition(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
