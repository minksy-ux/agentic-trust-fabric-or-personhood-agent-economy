export type EscrowStatus =
  | 'locked'
  | 'optimistic-release'
  | 'automated-arbitration'
  | 'human-arbitration'
  | 'released'
  | 'refunded';

export type AcceptanceCriterion = {
  id: string;
  kind: 'json-schema' | 'test' | 'formal-proof' | 'attestation';
  description: string;
};

export type MachineReadableSpec = {
  schemaVersion: '1.0.0';
  id: string;
  taskType: string;
  inputSchemaUri: string;
  outputSchemaUri: string;
  acceptanceCriteria: AcceptanceCriterion[];
  legalTerms: LegalTerms;
};

export type LegalTerms = {
  ricardianContractUri: string;
  governingJurisdiction: string;
  compliancePolicyUri: string;
  emergencyOverrideDid: string;
};

export type ArbitrationPolicy = {
  challengeWindowSeconds: number;
  automatedArbiters: string[];
  humanForum: string;
};

export type AcceptanceEvidence = {
  criterionId: string;
  passed: boolean;
  artifactUri: string;
};

export type EscrowEvent = {
  type: 'locked' | 'child-escrow-opened' | 'delivery-submitted' | 'challenged' | 'emergency-stop' | 'automated-decision' | 'human-decision' | 'released';
  at: string;
  detail?: string;
};

export type PayoutRecipient = {
  recipientDid: string;
  shareBasisPoints: number;
  role: 'lead' | 'subcontractor' | 'validator' | 'insurer' | 'other';
};

export type EscrowMilestone = {
  id: string;
  amountMinor: number;
  acceptanceCriterionIds: string[];
};

export type Escrow = {
  schemaVersion: '1.0.0';
  id: string;
  amount: number;
  currency: string;
  status: EscrowStatus;
  buyerDid: string;
  sellerDid: string;
  mandateId: string;
  specification: MachineReadableSpec;
  arbitrationPolicy: ArbitrationPolicy;
  parentEscrowId?: string;
  payoutPlan: PayoutRecipient[];
  milestones: EscrowMilestone[];
  childAllocatedAmountMinor: number;
  evidence?: AcceptanceEvidence[];
  challengeDeadline?: string;
  history: EscrowEvent[];
};

export type EscrowTerms = {
  mandateId: string;
  specification: MachineReadableSpec;
  arbitrationPolicy: ArbitrationPolicy;
  openedAt: Date;
  parentEscrowId?: string;
  payoutPlan?: PayoutRecipient[];
  milestones?: EscrowMilestone[];
};

export function createEscrow(
  id: string,
  amount: number,
  currency: string,
  buyerDid: string,
  sellerDid: string,
  terms: EscrowTerms,
): Escrow {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error('Escrow amount must be a positive integer in the currency minor unit.');
  }

  if (!id || !currency || !buyerDid || !sellerDid || buyerDid === sellerDid) {
    throw new Error('Escrow requires distinct parties and non-empty identifiers.');
  }

  assertValidDate(terms.openedAt, 'Escrow opening time');

  if (!Number.isSafeInteger(terms.arbitrationPolicy.challengeWindowSeconds)
    || terms.arbitrationPolicy.challengeWindowSeconds <= 0) {
    throw new Error('Challenge window must be a positive integer number of seconds.');
  }

  if (terms.arbitrationPolicy.automatedArbiters.length === 0 || !terms.arbitrationPolicy.humanForum) {
    throw new Error('Escrow requires automated arbiters and a human appeal forum.');
  }

  if (new Set(terms.specification.acceptanceCriteria.map((criterion) => criterion.id)).size
    !== terms.specification.acceptanceCriteria.length) {
    throw new Error('Acceptance criterion identifiers must be unique.');
  }

  const payoutPlan = terms.payoutPlan ?? [
    { recipientDid: sellerDid, shareBasisPoints: 10_000, role: 'lead' as const },
  ];
  if (payoutPlan.length === 0
    || payoutPlan.some((recipient) => !recipient.recipientDid
      || !Number.isSafeInteger(recipient.shareBasisPoints)
      || recipient.shareBasisPoints <= 0)
    || payoutPlan.reduce((total, recipient) => total + recipient.shareBasisPoints, 0) !== 10_000) {
    throw new Error('Payout shares must be positive integer basis points totaling 10,000.');
  }

  const criterionIds = new Set(terms.specification.acceptanceCriteria.map((criterion) => criterion.id));
  const milestones = terms.milestones ?? [
    { id: `${id}:complete`, amountMinor: amount, acceptanceCriterionIds: [...criterionIds] },
  ];
  if (milestones.length === 0
    || new Set(milestones.map((milestone) => milestone.id)).size !== milestones.length
    || milestones.some((milestone) => !Number.isSafeInteger(milestone.amountMinor)
      || milestone.amountMinor <= 0
      || milestone.acceptanceCriterionIds.length === 0
      || milestone.acceptanceCriterionIds.some((criterionId) => !criterionIds.has(criterionId)))
    || milestones.reduce((total, milestone) => total + milestone.amountMinor, 0) !== amount) {
    throw new Error('Milestones must be unique, reference known criteria, and allocate the full escrow amount.');
  }

  if (terms.specification.acceptanceCriteria.length === 0) {
    throw new Error('Escrow requires at least one acceptance criterion.');
  }

  return {
    schemaVersion: '1.0.0',
    id,
    amount,
    currency,
    status: 'locked',
    buyerDid,
    sellerDid,
    mandateId: terms.mandateId,
    specification: terms.specification,
    arbitrationPolicy: terms.arbitrationPolicy,
    parentEscrowId: terms.parentEscrowId,
    payoutPlan,
    milestones,
    childAllocatedAmountMinor: 0,
    history: [{ type: 'locked', at: terms.openedAt.toISOString() }],
  };
}

export type ChildEscrowAllocation = {
  parent: Escrow;
  child: Escrow;
};

export function createChildEscrow(
  parent: Escrow,
  id: string,
  amount: number,
  sellerDid: string,
  terms: Omit<EscrowTerms, 'parentEscrowId'>,
): ChildEscrowAllocation {
  if (parent.status !== 'locked' || amount > parent.amount - parent.childAllocatedAmountMinor) {
    throw new Error('Child escrow requires a locked parent and cannot exceed its unallocated amount.');
  }

  const child = createEscrow(
    id,
    amount,
    parent.currency,
    parent.sellerDid,
    sellerDid,
    { ...terms, parentEscrowId: parent.id },
  );

  return {
    parent: {
      ...parent,
      childAllocatedAmountMinor: parent.childAllocatedAmountMinor + amount,
      history: [
        ...parent.history,
        { type: 'child-escrow-opened', at: terms.openedAt.toISOString(), detail: child.id },
      ],
    },
    child,
  };
}

export function submitDelivery(escrow: Escrow, evidence: AcceptanceEvidence[], submittedAt: Date): Escrow {
  assertStatus(escrow, 'locked');
  assertValidDate(submittedAt, 'Delivery submission time');

  const evidenceByCriterion = new Map(evidence.map((item) => [item.criterionId, item]));
  if (evidenceByCriterion.size !== evidence.length) {
    throw new Error('Delivery evidence must contain unique criterion identifiers.');
  }

  const criterionIds = new Set(escrow.specification.acceptanceCriteria.map((criterion) => criterion.id));
  if (evidence.some((item) => !criterionIds.has(item.criterionId) || !item.artifactUri)) {
    throw new Error('Delivery evidence contains an unknown criterion or missing artifact.');
  }

  const accepted = escrow.specification.acceptanceCriteria.every(
    (criterion) => evidenceByCriterion.get(criterion.id)?.passed === true,
  );

  if (!accepted) {
    return {
      ...escrow,
      status: 'automated-arbitration',
      evidence,
      history: [...escrow.history, { type: 'delivery-submitted', at: submittedAt.toISOString(), detail: 'failed' }],
    };
  }

  const challengeDeadline = new Date(
    submittedAt.getTime() + escrow.arbitrationPolicy.challengeWindowSeconds * 1000,
  ).toISOString();

  return {
    ...escrow,
    status: 'optimistic-release',
    evidence,
    challengeDeadline,
    history: [...escrow.history, { type: 'delivery-submitted', at: submittedAt.toISOString(), detail: 'accepted' }],
  };
}

export function challengeEscrow(escrow: Escrow, challengedAt: Date): Escrow {
  assertStatus(escrow, 'optimistic-release');
  assertValidDate(challengedAt, 'Challenge time');

  if (!escrow.challengeDeadline || challengedAt > new Date(escrow.challengeDeadline)) {
    throw new Error('Escrow cannot be challenged after the challenge window closes.');
  }

  return {
    ...escrow,
    status: 'automated-arbitration',
    history: [...escrow.history, { type: 'challenged', at: challengedAt.toISOString() }],
  };
}

export function triggerEmergencyStop(
  escrow: Escrow,
  sponsorDid: string,
  stoppedAt: Date,
  verifyOverride: (sponsorDid: string, escrow: Escrow) => boolean,
): Escrow {
  if (escrow.status === 'released' || escrow.status === 'refunded') {
    throw new Error('A settled escrow cannot be stopped.');
  }
  assertValidDate(stoppedAt, 'Emergency stop time');
  if (sponsorDid !== escrow.specification.legalTerms.emergencyOverrideDid || !verifyOverride(sponsorDid, escrow)) {
    throw new Error('Emergency override is not authorized.');
  }

  return {
    ...escrow,
    status: 'human-arbitration',
    history: [...escrow.history, { type: 'emergency-stop', at: stoppedAt.toISOString(), detail: sponsorDid }],
  };
}

export function releaseEscrow(escrow: Escrow, releasedAt: Date): Escrow {
  assertStatus(escrow, 'optimistic-release');
  assertValidDate(releasedAt, 'Release time');

  if (!escrow.challengeDeadline || releasedAt < new Date(escrow.challengeDeadline)) {
    throw new Error('Escrow cannot be released before the challenge window closes.');
  }

  return {
    ...escrow,
    status: 'released',
    history: [...escrow.history, { type: 'released', at: releasedAt.toISOString() }],
  };
}

export function resolveAutomatedArbitration(
  escrow: Escrow,
  decision: 'release' | 'refund' | 'escalate',
  decidedAt: Date,
): Escrow {
  assertStatus(escrow, 'automated-arbitration');
  assertValidDate(decidedAt, 'Automated arbitration decision time');

  return {
    ...escrow,
    status: decision === 'escalate' ? 'human-arbitration' : decision === 'release' ? 'released' : 'refunded',
    history: [...escrow.history, { type: 'automated-decision', at: decidedAt.toISOString(), detail: decision }],
  };
}

export function resolveHumanArbitration(escrow: Escrow, decision: 'release' | 'refund', decidedAt: Date): Escrow {
  assertStatus(escrow, 'human-arbitration');
  assertValidDate(decidedAt, 'Human arbitration decision time');

  return {
    ...escrow,
    status: decision === 'release' ? 'released' : 'refunded',
    history: [...escrow.history, { type: 'human-decision', at: decidedAt.toISOString(), detail: decision }],
  };
}

function assertStatus(escrow: Escrow, expected: EscrowStatus): void {
  if (escrow.status !== expected) {
    throw new Error(`Expected escrow status ${expected}, received ${escrow.status}.`);
  }
}

function assertValidDate(value: Date, label: string): void {
  if (Number.isNaN(value.getTime())) {
    throw new Error(`${label} must be valid.`);
  }
}
