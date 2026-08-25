export type BondStatus = 'active' | 'partially-slashed' | 'slashed' | 'released';

export type SlashRecord = {
  amountMinor: number;
  reason: string;
  evidenceUri: string;
  decidedBy: string;
  decidedAt: string;
};

export type AgentBond = {
  schemaVersion: '1.0.0';
  id: string;
  principalDid: string;
  currency: string;
  initialAmountMinor: number;
  availableAmountMinor: number;
  lockedUntil: string;
  status: BondStatus;
  slashHistory: SlashRecord[];
};

export type InsurancePolicy = {
  schemaVersion: '1.0.0';
  id: string;
  insuredDid: string;
  underwriterDid: string;
  currency: string;
  coverageAmountMinor: number;
  deductibleAmountMinor: number;
  coveredTaskTypes: string[];
  expiresAt: string;
  signature: string;
};

export type SkillMetric = {
  name: string;
  value: number;
  unit: 'count' | 'percentage' | 'score';
};

export type SkillAttestation = {
  schemaVersion: '1.0.0';
  id: string;
  subjectDid: string;
  issuerDid: string;
  domain: string;
  skill: string;
  metrics: SkillMetric[];
  evidenceUri: string;
  issuedAt: string;
  expiresAt: string;
  executionEnvironment?: string;
  signature: string;
};

export type SkillRequirement = {
  domain: string;
  skill: string;
  metricName?: string;
  minimumValue?: number;
  acceptedIssuers?: string[];
};

export function createBond(
  id: string,
  principalDid: string,
  amountMinor: number,
  currency: string,
  lockedUntil: Date,
): AgentBond {
  requirePositiveMinorUnits(amountMinor, 'Bond amount');
  requireValidDate(lockedUntil, 'Bond lock expiry');

  return {
    schemaVersion: '1.0.0',
    id,
    principalDid,
    currency,
    initialAmountMinor: amountMinor,
    availableAmountMinor: amountMinor,
    lockedUntil: lockedUntil.toISOString(),
    status: 'active',
    slashHistory: [],
  };
}

export function slashBond(bond: AgentBond, record: SlashRecord): AgentBond {
  if (bond.status === 'released' || bond.status === 'slashed') {
    throw new Error(`Cannot slash a bond with status ${bond.status}.`);
  }
  requirePositiveMinorUnits(record.amountMinor, 'Slash amount');
  if (record.amountMinor > bond.availableAmountMinor || !record.reason || !record.evidenceUri || !record.decidedBy) {
    throw new Error('Slash requires sufficient capital, a reason, evidence, and an authorized decision maker.');
  }

  const availableAmountMinor = bond.availableAmountMinor - record.amountMinor;
  return {
    ...bond,
    availableAmountMinor,
    status: availableAmountMinor === 0 ? 'slashed' : 'partially-slashed',
    slashHistory: [...bond.slashHistory, record],
  };
}

export function verifyInsuranceCoverage(
  policy: InsurancePolicy,
  insuredDid: string,
  taskType: string,
  currency: string,
  requiredCoverageMinor: number,
  verifiedAt: Date,
  verifySignature: (policy: InsurancePolicy) => boolean,
): boolean {
  const expiresAt = new Date(policy.expiresAt);
  return policy.insuredDid === insuredDid
    && policy.currency === currency
    && policy.coveredTaskTypes.includes(taskType)
    && policy.coverageAmountMinor >= requiredCoverageMinor
    && policy.deductibleAmountMinor >= 0
    && expiresAt > verifiedAt
    && verifySignature(policy);
}

export function verifySkillRequirement(
  attestation: SkillAttestation,
  subjectDid: string,
  requirement: SkillRequirement,
  verifiedAt: Date,
  verifySignature: (attestation: SkillAttestation) => boolean,
): boolean {
  const issuedAt = new Date(attestation.issuedAt);
  const expiresAt = new Date(attestation.expiresAt);
  const metric = requirement.metricName
    ? attestation.metrics.find((candidate) => candidate.name === requirement.metricName)
    : undefined;

  return attestation.subjectDid === subjectDid
    && attestation.domain === requirement.domain
    && attestation.skill === requirement.skill
    && (!requirement.acceptedIssuers || requirement.acceptedIssuers.includes(attestation.issuerDid))
    && (!requirement.metricName || Boolean(metric))
    && (requirement.minimumValue === undefined || (metric?.value ?? Number.NEGATIVE_INFINITY) >= requirement.minimumValue)
    && issuedAt <= verifiedAt
    && expiresAt > verifiedAt
    && verifySignature(attestation);
}

function requirePositiveMinorUnits(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer in currency minor units.`);
  }
}

function requireValidDate(value: Date, label: string): void {
  if (Number.isNaN(value.getTime())) {
    throw new Error(`${label} must be valid.`);
  }
}