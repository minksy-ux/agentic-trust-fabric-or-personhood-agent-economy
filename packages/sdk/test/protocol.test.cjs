const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const {
  challengeEscrow,
  createAgentIdentity,
  createBond,
  createChildEscrow,
  createIdentityRegistry,
  openAgentTransaction,
  registerAgentIdentity,
  releaseEscrow,
  resolveAutomatedArbitration,
  resolveHumanArbitration,
  scoreReputation,
  slashBond,
  submitDelivery,
  triggerEmergencyStop,
} = require('../dist/index.js');

const specificationDirectory = path.resolve(__dirname, '../../../specs');

function createFixture() {
  const consumedNonces = new Set();
  const sellerIdentity = createAgentIdentity(
    {
      did: 'did:example:seller-sponsor',
      name: 'Seller Sponsor',
      credential: {
        schemaVersion: '1.0.0',
        id: 'credential-001',
        issuerDid: 'did:example:personhood-issuer',
        subjectDid: 'did:example:seller-sponsor',
        type: 'proof-of-personhood',
        issuedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: '2027-01-01T00:00:00.000Z',
        proof: 'personhood-proof',
      },
    },
    'did:example:seller',
  );
  const request = {
    id: 'hire-001',
    buyerDid: 'did:example:buyer',
    sellerDid: sellerIdentity.did,
    taskType: 'research',
    description: 'research a market',
    maxFee: 50,
    currency: 'USDC',
    minimumReputation: 80,
    jurisdiction: 'US-DE',
  };
  const specification = {
    schemaVersion: '1.0.0',
    id: 'spec-001',
    taskType: 'research',
    inputSchemaUri: 'ipfs://input',
    outputSchemaUri: 'ipfs://output',
    acceptanceCriteria: [
      { id: 'valid-output', kind: 'json-schema', description: 'Output is valid.' },
    ],
    legalTerms: {
      ricardianContractUri: 'ipfs://ricardian-contract',
      governingJurisdiction: 'US-DE',
      compliancePolicyUri: 'ipfs://compliance-policy',
      emergencyOverrideDid: 'did:example:buyer-sponsor',
    },
  };

  return {
    request,
    sellerIdentity,
    sellerReputation: scoreReputation(sellerIdentity.did, [
      { kind: 'completed-contracts', weight: 4, value: 1 },
    ]),
    agentCard: {
      schemaVersion: '1.0.0',
      id: 'card-001',
      agentDid: sellerIdentity.did,
      capabilities: ['research'],
      endpoint: 'https://seller.example/a2a',
      acceptedCurrencies: ['USDC'],
      supportedProtocolVersions: ['1.0.0'],
      skillAttestationIds: [],
      bondIds: [],
      insurancePolicyIds: [],
      signature: 'agent-signature',
    },
    mandate: {
      schemaVersion: '1.0.0',
      id: 'mandate-001',
      sponsorDid: 'did:example:buyer-sponsor',
      agentDid: request.buyerDid,
      allowedTaskTypes: ['research'],
      maxSpend: 100,
      currency: 'USDC',
      validFrom: '2026-01-01T00:00:00.000Z',
      expiresAt: '2027-01-01T00:00:00.000Z',
      policyVersion: '1.0.0',
      delegation: { depth: 0 },
      policy: {
        allowedCounterparties: [sellerIdentity.did],
        allowedJurisdictions: ['US-DE'],
        maxDelegationDepth: 1,
        emergencyStop: false,
      },
      nonce: 'nonce-001',
      signature: 'sponsor-signature',
    },
    specification,
    arbitrationPolicy: {
      challengeWindowSeconds: 60,
      automatedArbiters: ['did:example:arbiter'],
      humanForum: 'Example Forum',
    },
    openedAt: new Date('2026-08-25T12:00:00.000Z'),
    verification: {
      verifySponsorCredential: (credential) => credential.proof === 'personhood-proof',
      verifyAgentCard: (card) => card.signature === 'agent-signature',
      verifyIntentMandate: (mandate) => mandate.signature === 'sponsor-signature',
      consumeMandateNonce: (sponsorDid, nonce) => {
        const key = `${sponsorDid}:${nonce}`;
        if (consumedNonces.has(key)) {
          return false;
        }
        consumedNonces.add(key);
        return true;
      },
      verifyInsurancePolicy: (policy) => policy.signature === 'insurance-signature',
      verifySkillAttestation: (attestation) => attestation.signature === 'skill-signature',
      verifyHumanApproval: (request) => Boolean(request.humanApproval),
    },
  };
}

test('opens and optimistically releases a coherent agent transaction', () => {
  const transaction = openAgentTransaction(createFixture());
  const pending = submitDelivery(transaction.escrow, [
    { criterionId: 'valid-output', passed: true, artifactUri: 'ipfs://evidence' },
  ], new Date('2026-08-25T12:01:00.000Z'));

  assert.equal(pending.status, 'optimistic-release');
  assert.throws(
    () => releaseEscrow(pending, new Date('2026-08-25T12:01:30.000Z')),
    /challenge window/,
  );
  const released = releaseEscrow(pending, new Date('2026-08-25T12:02:00.000Z'));
  assert.equal(released.status, 'released');
  assert.deepEqual(released.history.map((event) => event.type), ['locked', 'delivery-submitted', 'released']);
});

test('rejects a request outside the sponsor mandate', () => {
  const fixture = createFixture();
  fixture.request.maxFee = 101;

  assert.throws(() => openAgentTransaction(fixture), /spend limit/);
});

test('escalates a challenge from automated to human arbitration', () => {
  const transaction = openAgentTransaction(createFixture());
  const pending = submitDelivery(transaction.escrow, [
    { criterionId: 'valid-output', passed: true, artifactUri: 'ipfs://evidence' },
  ], new Date('2026-08-25T12:01:00.000Z'));
  const challenged = challengeEscrow(pending, new Date('2026-08-25T12:01:30.000Z'));
  const escalated = resolveAutomatedArbitration(challenged, 'escalate', new Date('2026-08-25T12:02:00.000Z'));
  const resolved = resolveHumanArbitration(escalated, 'refund', new Date('2026-08-25T12:03:00.000Z'));

  assert.equal(challenged.status, 'automated-arbitration');
  assert.equal(escalated.status, 'human-arbitration');
  assert.equal(resolved.status, 'refunded');
});

test('rejects invalid signatures without consuming the mandate nonce', () => {
  const fixture = createFixture();
  fixture.verification.verifyAgentCard = () => false;
  let consumed = false;
  fixture.verification.consumeMandateNonce = () => {
    consumed = true;
    return true;
  };

  assert.throws(() => openAgentTransaction(fixture), /signature is invalid/);
  assert.equal(consumed, false);
});

test('rejects replay of a consumed intent mandate', () => {
  const fixture = createFixture();
  openAgentTransaction(fixture);

  assert.throws(() => openAgentTransaction(fixture), /already been consumed/);
});

test('rejects late challenges and duplicate delivery evidence', () => {
  const transaction = openAgentTransaction(createFixture());
  const evidence = [
    { criterionId: 'valid-output', passed: true, artifactUri: 'ipfs://evidence' },
  ];
  const pending = submitDelivery(transaction.escrow, evidence, new Date('2026-08-25T12:01:00.000Z'));

  assert.throws(
    () => challengeEscrow(pending, new Date('2026-08-25T12:02:01.000Z')),
    /after the challenge window/,
  );
  assert.throws(
    () => submitDelivery(transaction.escrow, [...evidence, ...evidence], new Date('2026-08-25T12:01:00.000Z')),
    /unique criterion/,
  );
});

test('normalizes reputation and rejects invalid signals', () => {
  const score = scoreReputation('did:example:agent', [
    { kind: 'quality', weight: 2, value: 0.9 },
    { kind: 'reliability', weight: 3, value: 0.8 },
  ]);

  assert.equal(score.overall, 84);
  assert.throws(
    () => scoreReputation('did:example:agent', [{ kind: 'invalid', weight: 1, value: 1.1 }]),
    /between zero and one/,
  );
});

test('enforces the maximum number of agent identities per Sponsor', () => {
  const fixture = createFixture();
  const registry = registerAgentIdentity(createIdentityRegistry(1), fixture.sellerIdentity);
  const secondIdentity = createAgentIdentity(fixture.sellerIdentity.sponsor, 'did:example:second-agent');

  assert.throws(() => registerAgentIdentity(registry, secondIdentity), /identity limit/);
});

test('rejects an expired Sponsor credential', () => {
  const fixture = createFixture();
  fixture.sellerIdentity.sponsor.credential.expiresAt = '2026-08-01T00:00:00.000Z';

  assert.throws(() => openAgentTransaction(fixture), /valid sponsor credential/);
});

test('slashes bonded capital only with bounded evidence-backed decisions', () => {
  const bond = createBond(
    'bond-001',
    'did:example:agent',
    100,
    'USDC',
    new Date('2027-01-01T00:00:00.000Z'),
  );
  const partial = slashBond(bond, {
    amountMinor: 40,
    reason: 'Proven acceptance-test manipulation',
    evidenceUri: 'ipfs://slash-evidence',
    decidedBy: 'did:example:arbiter',
    decidedAt: '2026-08-25T12:00:00.000Z',
  });
  const fullySlashed = slashBond(partial, {
    amountMinor: 60,
    reason: 'Final appeal decision',
    evidenceUri: 'ipfs://appeal-evidence',
    decidedBy: 'did:example:appeal-panel',
    decidedAt: '2026-08-25T13:00:00.000Z',
  });

  assert.equal(partial.status, 'partially-slashed');
  assert.equal(fullySlashed.status, 'slashed');
  assert.equal(fullySlashed.availableAmountMinor, 0);
  assert.throws(() => slashBond(fullySlashed, fullySlashed.slashHistory[0]), /Cannot slash/);
});

test('requires bond, insurance, and domain skill assurance above configured thresholds', () => {
  const fixture = createFixture();
  fixture.assuranceRequirements = {
    bondRequiredAboveMinor: 50,
    minimumBondMinor: 50,
    insuranceRequiredAboveMinor: 50,
    requiredSkills: [{
      domain: 'research',
      skill: 'source-verification',
      metricName: 'accuracy',
      minimumValue: 97,
      acceptedIssuers: ['did:example:validator'],
    }],
  };
  fixture.assurance = {
    bond: createBond('bond-001', fixture.request.sellerDid, 50, 'USDC', new Date('2027-01-01T00:00:00.000Z')),
    insurancePolicy: {
      schemaVersion: '1.0.0',
      id: 'policy-001',
      insuredDid: fixture.request.sellerDid,
      underwriterDid: 'did:example:underwriter',
      currency: 'USDC',
      coverageAmountMinor: 50,
      deductibleAmountMinor: 5,
      coveredTaskTypes: ['research'],
      expiresAt: '2027-01-01T00:00:00.000Z',
      signature: 'insurance-signature',
    },
    skillAttestations: [{
      schemaVersion: '1.0.0',
      id: 'skill-001',
      subjectDid: fixture.request.sellerDid,
      issuerDid: 'did:example:validator',
      domain: 'research',
      skill: 'source-verification',
      metrics: [{ name: 'accuracy', value: 99.2, unit: 'percentage' }],
      evidenceUri: 'ipfs://skill-evidence',
      issuedAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2027-01-01T00:00:00.000Z',
      signature: 'skill-signature',
    }],
  };

  assert.equal(openAgentTransaction(fixture).assurance.bond.id, 'bond-001');
  const uninsured = createFixture();
  uninsured.assuranceRequirements = fixture.assuranceRequirements;
  assert.throws(() => openAgentTransaction(uninsured), /bond requirement/);
});

test('applies restrictive policy and verified emergency override', () => {
  const denied = createFixture();
  denied.mandate.policy.deniedCounterparties = [denied.request.sellerDid];
  assert.throws(() => openAgentTransaction(denied), /counterparty is denied/);

  const transaction = openAgentTransaction(createFixture());
  assert.throws(
    () => triggerEmergencyStop(
      transaction.escrow,
      'did:example:attacker',
      new Date('2026-08-25T12:01:00.000Z'),
      () => true,
    ),
    /not authorized/,
  );
  const stopped = triggerEmergencyStop(
    transaction.escrow,
    'did:example:buyer-sponsor',
    new Date('2026-08-25T12:01:00.000Z'),
    () => true,
  );
  assert.equal(stopped.status, 'human-arbitration');
});

test('creates a bounded child escrow with conserved payouts and milestones', () => {
  const transaction = openAgentTransaction(createFixture());
  const firstAllocation = createChildEscrow(
    transaction.escrow,
    'child-001',
    20,
    'did:example:subcontractor',
    {
      mandateId: 'sub-mandate-001',
      specification: transaction.escrow.specification,
      arbitrationPolicy: transaction.escrow.arbitrationPolicy,
      openedAt: new Date('2026-08-25T12:01:00.000Z'),
      payoutPlan: [
        { recipientDid: 'did:example:subcontractor', shareBasisPoints: 9_000, role: 'subcontractor' },
        { recipientDid: 'did:example:validator', shareBasisPoints: 1_000, role: 'validator' },
      ],
    },
  );

  assert.equal(firstAllocation.child.parentEscrowId, transaction.escrow.id);
  assert.equal(firstAllocation.child.buyerDid, transaction.escrow.sellerDid);
  assert.equal(firstAllocation.child.payoutPlan.reduce((total, payout) => total + payout.shareBasisPoints, 0), 10_000);
  assert.equal(firstAllocation.parent.childAllocatedAmountMinor, 20);
  assert.throws(
    () => createChildEscrow(
      firstAllocation.parent,
      'oversized-child',
      31,
      'did:example:subcontractor',
      {
        mandateId: 'sub-mandate-002',
        specification: transaction.escrow.specification,
        arbitrationPolicy: transaction.escrow.arbitrationPolicy,
        openedAt: new Date('2026-08-25T12:01:00.000Z'),
      },
    ),
    /cannot exceed/,
  );
});

test('validates protocol payloads against the published JSON Schemas', () => {
  const fixture = createFixture();
  const ajv = new Ajv2020({ strict: true });
  addFormats(ajv);
  const cases = [
    ['agent-card.json', fixture.agentCard],
    ['intent-mandate.json', fixture.mandate],
    ['task-spec.json', fixture.specification],
    ['agent-bond.json', createBond(
      'bond-schema-001',
      fixture.request.sellerDid,
      100,
      'USDC',
      new Date('2027-01-01T00:00:00.000Z'),
    )],
    ['insurance-policy.json', {
      schemaVersion: '1.0.0',
      id: 'policy-001',
      insuredDid: fixture.request.sellerDid,
      underwriterDid: 'did:example:underwriter',
      currency: 'USDC',
      coverageAmountMinor: 100,
      deductibleAmountMinor: 10,
      coveredTaskTypes: ['research'],
      expiresAt: '2027-01-01T00:00:00.000Z',
      signature: 'insurance-signature',
    }],
    ['skill-attestation.json', {
      schemaVersion: '1.0.0',
      id: 'skill-001',
      subjectDid: fixture.request.sellerDid,
      issuerDid: 'did:example:validator',
      domain: 'research',
      skill: 'source-verification',
      metrics: [{ name: 'accuracy', value: 99.2, unit: 'percentage' }],
      evidenceUri: 'ipfs://skill-evidence',
      issuedAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2027-01-01T00:00:00.000Z',
      signature: 'skill-signature',
    }],
  ];

  for (const [schemaFile, payload] of cases) {
    const schema = require(path.join(specificationDirectory, schemaFile));
    const validate = ajv.compile(schema);
    assert.equal(validate(payload), true, JSON.stringify(validate.errors));
  }
});