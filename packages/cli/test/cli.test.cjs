const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { runCli } = require('../dist/index.js');
const {
  createEvidencePackage,
  generateEd25519KeyPair,
  LocalTrustRuntime,
  signArtifact,
} = require('../../runtime/dist/index.js');

function withFixtureDirectory(run) {
  const directory = mkdtempSync(join(tmpdir(), 'atf-cli-test-'));
  try {
    return run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function createAgentCard() {
  return {
    schemaVersion: '1.0.0',
    id: 'card-001',
    agentDid: 'did:example:agent',
    capabilities: ['research'],
    endpoint: 'https://agent.example/a2a',
    acceptedCurrencies: ['USDC'],
    supportedProtocolVersions: ['1.0.0'],
    skillAttestationIds: [],
    bondIds: [],
    insurancePolicyIds: [],
    signature: 'schema-only-signature',
  };
}

test('validates artifacts against named protocol schemas', () => withFixtureDirectory((directory) => {
  const artifactPath = join(directory, 'agent-card.json');
  writeJson(artifactPath, createAgentCard());

  const valid = runCli(['validate', 'agent-card', artifactPath, '--specs-dir', resolve('specs')]);
  assert.equal(valid.ok, true);

  const invalidCard = createAgentCard();
  delete invalidCard.endpoint;
  writeJson(artifactPath, invalidCard);
  const invalid = runCli(['validate', 'agent-card', artifactPath, '--specs-dir', resolve('specs')]);
  assert.equal(invalid.ok, false);
  assert.match(invalid.error, /does not conform/);
}));

test('verifies signed artifacts and rejects mutation', () => withFixtureDirectory((directory) => {
  const keys = generateEd25519KeyPair();
  const artifactPath = join(directory, 'agent-card.json');
  const publicKeyPath = join(directory, 'public.pem');
  const signed = signArtifact(createAgentCard(), keys.privateKeyPem);
  writeJson(artifactPath, signed);
  writeFileSync(publicKeyPath, keys.publicKeyPem);

  assert.equal(runCli(['verify-signature', artifactPath, publicKeyPath]).ok, true);
  writeJson(artifactPath, { ...signed, endpoint: 'https://attacker.example/a2a' });
  assert.equal(runCli(['verify-signature', artifactPath, publicKeyPath]).ok, false);
}));

test('verifies persistent runtime and signed evidence packages', () => withFixtureDirectory((directory) => {
  const runtimePath = join(directory, 'runtime.json');
  const runtime = new LocalTrustRuntime(runtimePath);
  runtime.appendEvent({
    id: 'event-001',
    aggregateId: 'transaction-001',
    type: 'transaction-opened',
    actorDid: 'did:example:buyer',
    at: '2026-08-25T12:00:00.000Z',
    payload: { escrowId: 'escrow-001' },
  });
  assert.equal(runCli(['verify-runtime', runtimePath]).ok, true);

  const keys = generateEd25519KeyPair();
  const publicKeyPath = join(directory, 'public.pem');
  const evidencePath = join(directory, 'evidence.json');
  writeFileSync(publicKeyPath, keys.publicKeyPem);
  const evidencePackage = createEvidencePackage({
    id: 'evidence-001',
    transactionId: 'transaction-001',
    createdAt: new Date('2026-08-25T12:01:00.000Z'),
    signerDid: 'did:example:auditor',
    keyId: 'did:example:auditor#key-1',
    artifacts: [{ name: 'agent-card', mediaType: 'application/json', content: createAgentCard() }],
    events: runtime.listEvents('transaction-001'),
  }, keys.privateKeyPem);
  writeJson(evidencePath, evidencePackage);

  const evidenceResult = runCli(['verify-evidence', evidencePath, publicKeyPath]);
  assert.equal(evidenceResult.ok, true);
  assert.equal(evidenceResult.details.events, 1);
  assert.equal(runCli(['validate', 'evidence-package', evidencePath, '--specs-dir', resolve('specs')]).ok, true);
}));

test('produces stable canonical hashes and rejects unknown commands', () => withFixtureDirectory((directory) => {
  const leftPath = join(directory, 'left.json');
  const rightPath = join(directory, 'right.json');
  writeJson(leftPath, { z: 2, a: 1 });
  writeJson(rightPath, { a: 1, z: 2 });

  const left = runCli(['hash', leftPath]);
  const right = runCli(['hash', rightPath]);
  assert.equal(left.ok, true);
  assert.equal(left.details.sha256, right.details.sha256);
  const missingRuntime = runCli(['verify-runtime', join(directory, 'missing-runtime.json')]);
  assert.equal(missingRuntime.ok, false);
  assert.match(missingRuntime.error, /does not exist/);
  assert.equal(runCli(['unknown']).ok, false);
}));
