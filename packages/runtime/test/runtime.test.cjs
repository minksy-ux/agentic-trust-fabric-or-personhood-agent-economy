const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const {
  canonicalize,
  createEvidencePackage,
  generateEd25519KeyPair,
  LocalTrustRuntime,
  sha256,
  signArtifact,
  verifyArtifactSignature,
  verifyEvidencePackage,
  verifyFabricEventChain,
} = require('../dist/index.js');

function withRuntime(run) {
  const directory = mkdtempSync(join(tmpdir(), 'atf-runtime-test-'));
  const filePath = join(directory, 'runtime.json');
  try {
    return run(new LocalTrustRuntime(filePath), filePath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('canonicalizes key order and rejects signature-covered mutations', () => {
  const keys = generateEd25519KeyPair();
  const left = { nested: { z: 2, a: 1 }, id: 'artifact-001', signature: '' };
  const right = { signature: '', id: 'artifact-001', nested: { a: 1, z: 2 } };
  const signed = signArtifact(left, keys.privateKeyPem);

  assert.equal(canonicalize(left), canonicalize(right));
  assert.equal(canonicalize({ id: 'artifact-001', optional: undefined }), '{"id":"artifact-001"}');
  assert.equal(verifyArtifactSignature(signed, keys.publicKeyPem), true);
  assert.equal(verifyArtifactSignature({ ...signed, id: 'artifact-002' }, keys.publicKeyPem), false);
});

test('persists nonce replay protection across runtime restarts', () => withRuntime((runtime, filePath) => {
  assert.equal(runtime.consumeNonce('did:example:sponsor', 'nonce-001', new Date('2026-08-25T12:00:00Z')), true);

  const reopened = new LocalTrustRuntime(filePath);
  assert.equal(reopened.consumeNonce('did:example:sponsor', 'nonce-001', new Date('2026-08-25T12:01:00Z')), false);
  assert.equal(reopened.verifyEventChain(), true);
}));

test('keeps sponsor and nonce identities unambiguous', () => withRuntime((runtime) => {
  assert.equal(runtime.consumeNonce('did:example:alice', 'secret', new Date('2026-08-25T12:00:00Z')), true);
  assert.equal(runtime.consumeNonce('did:example', 'alice:secret', new Date('2026-08-25T12:01:00Z')), true);
  assert.equal(runtime.consumeNonce('did:example:alice', 'secret', new Date('2026-08-25T12:02:00Z')), false);
  assert.equal(runtime.listEvents().length, 2);
}));

test('recognizes legacy persisted nonce keys', () => withRuntime((_runtime, filePath) => {
  const unsignedState = {
    schemaVersion: '1.0.0',
    events: [],
    consumedNonces: ['did:example:sponsor:nonce-001'],
    balances: {},
    holds: {},
  };
  writeFileSync(filePath, JSON.stringify({ ...unsignedState, stateHash: sha256(unsignedState) }));

  const reopened = new LocalTrustRuntime(filePath);
  assert.equal(reopened.consumeNonce('did:example:sponsor', 'nonce-001'), false);
}));

test('rolls back nonce consumption when persistence fails', () => {
  const directory = mkdtempSync(join(tmpdir(), 'atf-runtime-test-'));
  const blockedParent = join(directory, 'not-a-directory');
  const filePath = join(blockedParent, 'runtime.json');
  try {
    writeFileSync(blockedParent, 'blocks directory creation');
    const runtime = new LocalTrustRuntime(filePath);

    assert.throws(
      () => runtime.consumeNonce('did:example:sponsor', 'nonce-001', new Date('2026-08-25T12:00:00Z')),
      { code: 'EEXIST' },
    );
    assert.equal(runtime.listEvents().length, 0);
    assert.throws(
      () => runtime.consumeNonce('did:example:sponsor', 'nonce-001', new Date('2026-08-25T12:01:00Z')),
      { code: 'EEXIST' },
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('moves simulated funds through escrow exactly once', () => withRuntime((runtime, filePath) => {
  runtime.credit('did:example:buyer', 'USDC', 100, new Date('2026-08-25T12:00:00Z'));
  runtime.lockEscrow('escrow-001', 'did:example:buyer', 'USDC', 75, new Date('2026-08-25T12:01:00Z'));
  runtime.releaseEscrow('escrow-001', [
    { recipientDid: 'did:example:seller', shareBasisPoints: 9_000 },
    { recipientDid: 'did:example:validator', shareBasisPoints: 1_000 },
  ], new Date('2026-08-25T12:02:00Z'));

  const reopened = new LocalTrustRuntime(filePath);
  assert.equal(reopened.getBalance('did:example:buyer', 'USDC'), 25);
  assert.equal(reopened.getBalance('did:example:seller', 'USDC'), 67);
  assert.equal(reopened.getBalance('did:example:validator', 'USDC'), 8);
  assert.equal(reopened.getHold('escrow-001').status, 'released');
  assert.throws(
    () => reopened.releaseEscrow('escrow-001', [{ recipientDid: 'did:example:seller', shareBasisPoints: 10_000 }]),
    /not in the locked state/,
  );
}));

test('isolates audit history from caller-owned objects', () => withRuntime((runtime) => {
  const payload = { nested: { value: 'original' } };
  const returnedEvent = runtime.appendEvent({
    id: 'event-immutable',
    aggregateId: 'transaction-immutable',
    type: 'transaction-opened',
    actorDid: 'did:example:buyer',
    at: '2026-08-25T12:00:00.000Z',
    payload,
  });
  payload.nested.value = 'mutated-input';
  returnedEvent.payload.nested.value = 'mutated-result';

  const storedEvent = runtime.listEvents('transaction-immutable')[0];
  assert.equal(storedEvent.payload.nested.value, 'original');
  assert.equal(runtime.verifyEventChain(), true);

  runtime.credit('did:example:buyer', 'USDC', 100, new Date('2026-08-25T12:01:00Z'));
  runtime.lockEscrow('escrow-immutable', 'did:example:buyer', 'USDC', 100, new Date('2026-08-25T12:02:00Z'));
  const payouts = [{ recipientDid: 'did:example:seller', shareBasisPoints: 10_000 }];
  runtime.releaseEscrow('escrow-immutable', payouts, new Date('2026-08-25T12:03:00Z'));
  payouts[0].shareBasisPoints = 1;

  const releaseEvent = runtime.listEvents('escrow-immutable').find((event) => event.type === 'escrow-funds-released');
  assert.equal(releaseEvent.payload.payouts[0].shareBasisPoints, 10_000);
  assert.equal(runtime.verifyEventChain(), true);
}));

test('preserves safe integer ledger arithmetic', () => withRuntime((runtime) => {
  runtime.credit('did:example:overflow', 'USDC', Number.MAX_SAFE_INTEGER, new Date('2026-08-25T12:00:00Z'));
  assert.throws(
    () => runtime.credit('did:example:overflow', 'USDC', 1, new Date('2026-08-25T12:01:00Z')),
    /safe integer range/,
  );
  assert.equal(runtime.getBalance('did:example:overflow', 'USDC'), Number.MAX_SAFE_INTEGER);
  assert.equal(runtime.listEvents('did:example:overflow').length, 1);

  runtime.lockEscrow(
    'escrow-max',
    'did:example:overflow',
    'USDC',
    Number.MAX_SAFE_INTEGER,
    new Date('2026-08-25T12:02:00Z'),
  );
  runtime.releaseEscrow('escrow-max', [
    { recipientDid: 'did:example:first', shareBasisPoints: 3_333 },
    { recipientDid: 'did:example:second', shareBasisPoints: 6_667 },
  ], new Date('2026-08-25T12:03:00Z'));

  const firstShare = Number(BigInt(Number.MAX_SAFE_INTEGER) * 3_333n / 10_000n);
  assert.equal(runtime.getBalance('did:example:first', 'USDC'), firstShare);
  assert.equal(runtime.getBalance('did:example:second', 'USDC'), Number.MAX_SAFE_INTEGER - firstShare);
}));

test('refuses escrow holds inconsistent with their audit history', () => withRuntime((runtime, filePath) => {
  runtime.credit('did:example:buyer', 'USDC', 100, new Date('2026-08-25T12:00:00Z'));
  runtime.lockEscrow('escrow-001', 'did:example:buyer', 'USDC', 75, new Date('2026-08-25T12:01:00Z'));

  const state = JSON.parse(readFileSync(filePath, 'utf8'));
  state.holds['escrow-001'].amountMinor = 100;
  const { stateHash: _stateHash, ...unsignedState } = state;
  state.stateHash = sha256(unsignedState);
  writeFileSync(filePath, JSON.stringify(state));

  assert.throws(() => new LocalTrustRuntime(filePath), /inconsistent with its audit history/);
}));

test('refuses to load tampered persistent state', () => withRuntime((runtime, filePath) => {
  runtime.credit('did:example:buyer', 'USDC', 100, new Date('2026-08-25T12:00:00Z'));
  const state = JSON.parse(readFileSync(filePath, 'utf8'));
  state.events[0].payload.amountMinor = 1_000;
  writeFileSync(filePath, JSON.stringify(state));

  assert.throws(() => new LocalTrustRuntime(filePath), /integrity verification failed/);
}));

test('refuses to load correctly hashed state with invalid ledger values', () => withRuntime((_runtime, filePath) => {
  const unsignedState = {
    schemaVersion: '1.0.0',
    events: [],
    consumedNonces: [],
    balances: { 'did:example:buyer\u0000USDC': -100 },
    holds: {},
  };
  writeFileSync(filePath, JSON.stringify({ ...unsignedState, stateHash: sha256(unsignedState) }));

  assert.throws(() => new LocalTrustRuntime(filePath), /invalid or unsupported/);
}));

test('rejects malformed audit events without throwing', () => withRuntime((_runtime, filePath) => {
  const malformedEvent = {
    id: 'event-001',
    aggregateId: 'transaction-001',
    type: 'transaction-opened',
    actorDid: 'did:example:buyer',
    at: 1_787_659_200_000,
    payload: {},
    previousHash: '0'.repeat(64),
    hash: '0'.repeat(64),
  };
  assert.equal(verifyFabricEventChain([malformedEvent]), false);
  assert.equal(verifyFabricEventChain(null), false);

  const unsignedState = {
    schemaVersion: '1.0.0',
    events: [malformedEvent],
    consumedNonces: [],
    balances: {},
    holds: {},
  };
  writeFileSync(filePath, JSON.stringify({ ...unsignedState, stateHash: sha256(unsignedState) }));
  assert.throws(() => new LocalTrustRuntime(filePath), /invalid or unsupported/);
}));

test('exports a signed evidence package and detects artifact or event mutation', () => withRuntime((runtime) => {
  const keys = generateEd25519KeyPair();
  runtime.appendEvent({
    id: 'event-001',
    aggregateId: 'transaction-001',
    type: 'transaction-opened',
    actorDid: 'did:example:buyer',
    at: '2026-08-25T12:00:00.000Z',
    payload: { escrowId: 'escrow-001' },
  });
  const artifactContent = { id: 'spec-001' };
  const evidencePackage = createEvidencePackage({
    id: 'evidence-001',
    transactionId: 'transaction-001',
    createdAt: new Date('2026-08-25T12:01:00.000Z'),
    signerDid: 'did:example:auditor',
    keyId: 'did:example:auditor#key-1',
    artifacts: [
      { name: 'task-spec', mediaType: 'application/json', content: artifactContent },
    ],
    events: runtime.listEvents('transaction-001'),
  }, keys.privateKeyPem);

  artifactContent.id = 'mutated-source';
  assert.equal(verifyEvidencePackage(evidencePackage, keys.publicKeyPem), true);
  const mutatedArtifact = structuredClone(evidencePackage);
  mutatedArtifact.artifacts[0].content.id = 'spec-002';
  assert.equal(verifyEvidencePackage(mutatedArtifact, keys.publicKeyPem), false);
  const mutatedEvents = structuredClone(evidencePackage);
  mutatedEvents.events[0].type = 'transaction-refunded';
  assert.equal(verifyEvidencePackage(mutatedEvents, keys.publicKeyPem), false);
}));

test('rejects malformed evidence packages without throwing', () => {
  const keys = generateEd25519KeyPair();

  assert.equal(verifyEvidencePackage(null, keys.publicKeyPem), false);
  assert.equal(verifyEvidencePackage({}, keys.publicKeyPem), false);
  assert.equal(verifyEvidencePackage({ schemaVersion: '1.0.0', artifacts: null }, keys.publicKeyPem), false);
  assert.equal(verifyEvidencePackage({
    schemaVersion: '1.0.0',
    id: 'evidence-001',
    transactionId: 'transaction-001',
    createdAt: 'not-a-date',
    signerDid: 'did:example:auditor',
    keyId: 'did:example:auditor#key-1',
    artifacts: [{ name: 'task-spec', mediaType: 'application/json', hash: 'invalid' }],
    events: [],
    eventRoot: 'invalid',
    signature: 'invalid',
  }, keys.publicKeyPem), false);
});