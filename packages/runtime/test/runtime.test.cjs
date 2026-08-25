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
  signArtifact,
  verifyArtifactSignature,
  verifyEvidencePackage,
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

test('refuses to load tampered persistent state', () => withRuntime((runtime, filePath) => {
  runtime.credit('did:example:buyer', 'USDC', 100, new Date('2026-08-25T12:00:00Z'));
  const state = JSON.parse(readFileSync(filePath, 'utf8'));
  state.events[0].payload.amountMinor = 1_000;
  writeFileSync(filePath, JSON.stringify(state));

  assert.throws(() => new LocalTrustRuntime(filePath), /integrity verification failed/);
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
  const evidencePackage = createEvidencePackage({
    id: 'evidence-001',
    transactionId: 'transaction-001',
    createdAt: new Date('2026-08-25T12:01:00.000Z'),
    signerDid: 'did:example:auditor',
    keyId: 'did:example:auditor#key-1',
    artifacts: [
      { name: 'task-spec', mediaType: 'application/json', content: { id: 'spec-001' } },
    ],
    events: runtime.listEvents('transaction-001'),
  }, keys.privateKeyPem);

  assert.equal(verifyEvidencePackage(evidencePackage, keys.publicKeyPem), true);
  const mutatedArtifact = structuredClone(evidencePackage);
  mutatedArtifact.artifacts[0].content.id = 'spec-002';
  assert.equal(verifyEvidencePackage(mutatedArtifact, keys.publicKeyPem), false);
  const mutatedEvents = structuredClone(evidencePackage);
  mutatedEvents.events[0].type = 'transaction-refunded';
  assert.equal(verifyEvidencePackage(mutatedEvents, keys.publicKeyPem), false);
}));