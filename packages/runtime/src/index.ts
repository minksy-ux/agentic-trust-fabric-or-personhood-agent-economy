import {
  createHash,
  generateKeyPairSync,
  sign,
  verify,
} from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';

export type Ed25519KeyPair = {
  publicKeyPem: string;
  privateKeyPem: string;
};

export type FabricEvent = {
  id: string;
  aggregateId: string;
  type: string;
  actorDid: string;
  at: string;
  payload: unknown;
  previousHash: string;
  hash: string;
};

export type AppendEventInput = Omit<FabricEvent, 'previousHash' | 'hash'>;

export type LedgerHold = {
  escrowId: string;
  buyerDid: string;
  currency: string;
  amountMinor: number;
  status: 'locked' | 'released' | 'refunded';
};

export type LedgerPayout = {
  recipientDid: string;
  shareBasisPoints: number;
};

export type EvidenceArtifact = {
  name: string;
  mediaType: string;
  content: unknown;
  hash: string;
};

export type EvidencePackage = {
  schemaVersion: '1.0.0';
  id: string;
  transactionId: string;
  createdAt: string;
  signerDid: string;
  keyId: string;
  artifacts: EvidenceArtifact[];
  events: FabricEvent[];
  eventRoot: string;
  signature: string;
};

export type CreateEvidencePackageInput = {
  id: string;
  transactionId: string;
  createdAt: Date;
  signerDid: string;
  keyId: string;
  artifacts: Array<Omit<EvidenceArtifact, 'hash'>>;
  events: FabricEvent[];
};

type RuntimeState = {
  schemaVersion: '1.0.0';
  stateHash: string;
  events: FabricEvent[];
  consumedNonces: string[];
  balances: Record<string, number>;
  holds: Record<string, LedgerHold>;
};

const GENESIS_HASH = '0'.repeat(64);

export function canonicalize(value: unknown): string {
  return serializeCanonical(value, new Set<object>());
}

export function sha256(value: unknown): string {
  return createHash('sha256').update(canonicalize(value)).digest('hex');
}

export function generateEd25519KeyPair(): Ed25519KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return {
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
}

export function signArtifact<T extends object>(artifact: T, privateKeyPem: string): T & { signature: string } {
  const unsigned = withoutTopLevelSignature(artifact);
  const signature = signCanonical(unsigned, privateKeyPem);
  return { ...artifact, signature };
}

export function signCanonical(value: unknown, privateKeyPem: string): string {
  return sign(null, Buffer.from(canonicalize(value)), privateKeyPem).toString('base64');
}

export function verifyCanonicalSignature(value: unknown, signature: string, publicKeyPem: string): boolean {
  if (!signature) {
    return false;
  }

  try {
    return verify(
      null,
      Buffer.from(canonicalize(value)),
      publicKeyPem,
      Buffer.from(signature, 'base64'),
    );
  } catch {
    return false;
  }
}

export function verifyArtifactSignature(artifact: object & { signature: string }, publicKeyPem: string): boolean {
  return verifyCanonicalSignature(withoutTopLevelSignature(artifact), artifact.signature, publicKeyPem);
}

export function createEvidencePackage(
  input: CreateEvidencePackageInput,
  privateKeyPem: string,
): EvidencePackage {
  requireValidDate(input.createdAt, 'Evidence package creation time');
  if (!input.id || !input.transactionId || !input.signerDid || !input.keyId || input.artifacts.length === 0) {
    throw new Error('Evidence packages require identifiers, a signer, a key ID, and at least one artifact.');
  }
  if (new Set(input.artifacts.map((artifact) => artifact.name)).size !== input.artifacts.length) {
    throw new Error('Evidence artifact names must be unique.');
  }
  if (input.events.length === 0 || !verifyFabricEventChain(input.events)) {
    throw new Error('Evidence packages require a nonempty valid event chain.');
  }

  const unsignedPackage = {
    schemaVersion: '1.0.0' as const,
    id: input.id,
    transactionId: input.transactionId,
    createdAt: input.createdAt.toISOString(),
    signerDid: input.signerDid,
    keyId: input.keyId,
    artifacts: input.artifacts.map((artifact) => ({
      ...artifact,
      content: structuredClone(artifact.content),
      hash: sha256(artifact.content),
    })),
    events: structuredClone(input.events),
    eventRoot: sha256(input.events),
    signature: '',
  };
  return signArtifact(unsignedPackage, privateKeyPem);
}

export function verifyEvidencePackage(evidencePackage: unknown, publicKeyPem: string): boolean {
  try {
    if (!isEvidencePackage(evidencePackage)
      || evidencePackage.artifacts.length === 0
      || new Set(evidencePackage.artifacts.map((artifact) => artifact.name)).size !== evidencePackage.artifacts.length
      || evidencePackage.eventRoot !== sha256(evidencePackage.events)
      || !verifyFabricEventChain(evidencePackage.events)
      || evidencePackage.artifacts.some((artifact) => artifact.hash !== sha256(artifact.content))) {
      return false;
    }
    return verifyArtifactSignature(evidencePackage, publicKeyPem);
  } catch {
    return false;
  }
}

export function verifyFabricEventChain(events: unknown): boolean {
  if (!Array.isArray(events) || !events.every(isFabricEvent)) {
    return false;
  }

  const previousByAggregate = new Map<string, string>();
  const eventIds = new Set<string>();

  try {
    for (const event of events) {
      if (eventIds.has(event.id)) {
        return false;
      }
      eventIds.add(event.id);

      const expectedPreviousHash = previousByAggregate.get(event.aggregateId) ?? GENESIS_HASH;
      if (event.previousHash !== expectedPreviousHash) {
        return false;
      }

      const { hash, ...unsignedEvent } = event;
      if (hash !== sha256(unsignedEvent)) {
        return false;
      }
      previousByAggregate.set(event.aggregateId, hash);
    }
  } catch {
    return false;
  }

  return true;
}

export class LocalTrustRuntime {
  readonly filePath: string;
  private state: RuntimeState;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.state = this.load();
    if (!this.verifyEventChain()) {
      throw new Error('Runtime event chain verification failed.');
    }
  }

  consumeNonce(sponsorDid: string, nonce: string, consumedAt: Date = new Date()): boolean {
    requireValidDate(consumedAt, 'Nonce consumption time');
    const key = createNonceKey(sponsorDid, nonce);
    const legacyKey = `${sponsorDid}:${nonce}`;
    if (!sponsorDid || !nonce
      || this.state.consumedNonces.includes(key)
      || this.state.consumedNonces.includes(legacyKey)) {
      return false;
    }

    return this.commit(() => {
      this.state.consumedNonces.push(key);
      this.appendToState({
        id: `nonce:${sha256(key)}`,
        aggregateId: sponsorDid,
        type: 'mandate-nonce-consumed',
        actorDid: sponsorDid,
        at: consumedAt.toISOString(),
        payload: { nonceHash: sha256(nonce) },
      });
      return true;
    });
  }

  appendEvent(input: AppendEventInput): FabricEvent {
    return structuredClone(this.commit(() => this.appendToState(input)));
  }

  listEvents(aggregateId?: string): FabricEvent[] {
    return this.state.events
      .filter((event) => aggregateId === undefined || event.aggregateId === aggregateId)
      .map((event) => structuredClone(event));
  }

  verifyEventChain(): boolean {
    return verifyFabricEventChain(this.state.events);
  }

  credit(accountDid: string, currency: string, amountMinor: number, creditedAt: Date = new Date()): void {
    requirePositiveMinorUnits(amountMinor, 'Credit amount');
    requireValidDate(creditedAt, 'Credit time');
    this.commit(() => {
      const balanceKey = createBalanceKey(accountDid, currency);
      this.addBalance(balanceKey, amountMinor);
      this.appendToState({
        id: `credit:${cryptoId(accountDid, currency, creditedAt.toISOString(), String(this.state.events.length))}`,
        aggregateId: accountDid,
        type: 'ledger-credited',
        actorDid: 'did:atf:local-ledger',
        at: creditedAt.toISOString(),
        payload: { currency, amountMinor },
      });
    });
  }

  getBalance(accountDid: string, currency: string): number {
    return this.state.balances[createBalanceKey(accountDid, currency)] ?? 0;
  }

  getHold(escrowId: string): LedgerHold | undefined {
    const hold = this.state.holds[escrowId];
    return hold ? structuredClone(hold) : undefined;
  }

  lockEscrow(
    escrowId: string,
    buyerDid: string,
    currency: string,
    amountMinor: number,
    lockedAt: Date = new Date(),
  ): LedgerHold {
    requirePositiveMinorUnits(amountMinor, 'Escrow amount');
    requireValidDate(lockedAt, 'Escrow lock time');
    if (this.state.holds[escrowId]) {
      throw new Error('Escrow funds are already recorded.');
    }

    const balanceKey = createBalanceKey(buyerDid, currency);
    if ((this.state.balances[balanceKey] ?? 0) < amountMinor) {
      throw new Error('Buyer has insufficient simulated funds.');
    }

    return this.commit(() => {
      this.state.balances[balanceKey] -= amountMinor;
      const hold: LedgerHold = { escrowId, buyerDid, currency, amountMinor, status: 'locked' };
      this.state.holds[escrowId] = hold;
      this.appendToState({
        id: `escrow:${escrowId}:locked`,
        aggregateId: escrowId,
        type: 'escrow-funds-locked',
        actorDid: buyerDid,
        at: lockedAt.toISOString(),
        payload: { currency, amountMinor },
      });
      return structuredClone(hold);
    });
  }

  releaseEscrow(
    escrowId: string,
    payouts: LedgerPayout[],
    releasedAt: Date = new Date(),
  ): LedgerHold {
    requireValidDate(releasedAt, 'Escrow release time');
    validatePayouts(payouts);

    return this.commit(() => {
      const hold = this.requireLockedHold(escrowId);
      let allocatedMinor = 0;
      payouts.forEach((payout, index) => {
        const amountMinor = index === payouts.length - 1
          ? hold.amountMinor - allocatedMinor
          : Number(BigInt(hold.amountMinor) * BigInt(payout.shareBasisPoints) / 10_000n);
        allocatedMinor += amountMinor;
        const balanceKey = createBalanceKey(payout.recipientDid, hold.currency);
        this.addBalance(balanceKey, amountMinor);
      });

      hold.status = 'released';
      this.appendToState({
        id: `escrow:${escrowId}:released`,
        aggregateId: escrowId,
        type: 'escrow-funds-released',
        actorDid: 'did:atf:local-ledger',
        at: releasedAt.toISOString(),
        payload: { amountMinor: hold.amountMinor, currency: hold.currency, payouts: structuredClone(payouts) },
      });
      return structuredClone(hold);
    });
  }

  refundEscrow(escrowId: string, refundedAt: Date = new Date()): LedgerHold {
    requireValidDate(refundedAt, 'Escrow refund time');
    return this.commit(() => {
      const hold = this.requireLockedHold(escrowId);
      const balanceKey = createBalanceKey(hold.buyerDid, hold.currency);
      this.addBalance(balanceKey, hold.amountMinor);
      hold.status = 'refunded';
      this.appendToState({
        id: `escrow:${escrowId}:refunded`,
        aggregateId: escrowId,
        type: 'escrow-funds-refunded',
        actorDid: 'did:atf:local-ledger',
        at: refundedAt.toISOString(),
        payload: { amountMinor: hold.amountMinor, currency: hold.currency },
      });
      return structuredClone(hold);
    });
  }

  private commit<T>(mutation: () => T): T {
    const previousState = this.state;
    this.state = structuredClone(previousState);
    try {
      const result = mutation();
      this.persist();
      return result;
    } catch (error) {
      this.state = previousState;
      throw error;
    }
  }

  private addBalance(balanceKey: string, amountMinor: number): void {
    const balance = (this.state.balances[balanceKey] ?? 0) + amountMinor;
    if (!Number.isSafeInteger(balance)) {
      throw new Error('Ledger balance exceeds the safe integer range.');
    }
    this.state.balances[balanceKey] = balance;
  }

  private requireLockedHold(escrowId: string): LedgerHold {
    const hold = this.state.holds[escrowId];
    if (!hold || hold.status !== 'locked') {
      throw new Error('Escrow funds are not in the locked state.');
    }
    return hold;
  }

  private appendToState(input: AppendEventInput): FabricEvent {
    if (!input.id || !input.aggregateId || !input.type || !input.actorDid) {
      throw new Error('Audit events require identifiers, a type, and an actor DID.');
    }
    if (this.state.events.some((event) => event.id === input.id)) {
      throw new Error('Audit event ID is already present.');
    }
    const at = new Date(input.at);
    requireValidDate(at, 'Audit event time');

    const previousHash = [...this.state.events]
      .reverse()
      .find((event) => event.aggregateId === input.aggregateId)?.hash ?? GENESIS_HASH;
    const unsignedEvent = { ...input, payload: structuredClone(input.payload), previousHash };
    const event: FabricEvent = { ...unsignedEvent, hash: sha256(unsignedEvent) };
    this.state.events.push(event);
    return event;
  }

  private load(): RuntimeState {
    if (!existsSync(this.filePath)) {
      const initialState: Omit<RuntimeState, 'stateHash'> = {
        schemaVersion: '1.0.0',
        events: [],
        consumedNonces: [],
        balances: {},
        holds: {},
      };
      return { ...initialState, stateHash: sha256(initialState) };
    }

    const parsed = JSON.parse(readFileSync(this.filePath, 'utf8')) as unknown;
    if (!isRuntimeState(parsed)) {
      throw new Error('Runtime state file is invalid or unsupported.');
    }
    const { stateHash, ...unsignedState } = parsed;
    if (stateHash !== sha256(unsignedState)) {
      throw new Error('Runtime state integrity verification failed.');
    }
    if (!hasConsistentEscrowHistory(parsed)) {
      throw new Error('Runtime escrow state is inconsistent with its audit history.');
    }
    return parsed;
  }

  private persist(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    const { stateHash: _stateHash, ...unsignedState } = this.state;
    this.state.stateHash = sha256(unsignedState);
    writeFileSync(temporaryPath, `${JSON.stringify(this.state, null, 2)}\n`, { mode: 0o600 });
    renameSync(temporaryPath, this.filePath);
  }
}

function serializeCanonical(value: unknown, ancestors: Set<object>): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Canonical JSON does not support non-finite numbers.');
    }
    return JSON.stringify(value);
  }
  if (typeof value !== 'object') {
    throw new Error(`Canonical JSON does not support ${typeof value} values.`);
  }
  if (ancestors.has(value)) {
    throw new Error('Canonical JSON does not support cyclic structures.');
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return `[${value.map((item) => serializeCanonical(item, ancestors)).join(',')}]`;
    }

    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${serializeCanonical(record[key], ancestors)}`);
    return `{${entries.join(',')}}`;
  } finally {
    ancestors.delete(value);
  }
}

function withoutTopLevelSignature<T extends object>(artifact: T): Omit<T, 'signature'> {
  const { signature: _signature, ...unsigned } = artifact as T & { signature?: unknown };
  return unsigned;
}

function isEvidencePackage(value: unknown): value is EvidencePackage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<EvidencePackage>;
  return candidate.schemaVersion === '1.0.0'
    && typeof candidate.id === 'string'
    && typeof candidate.transactionId === 'string'
    && typeof candidate.createdAt === 'string'
    && typeof candidate.signerDid === 'string'
    && typeof candidate.keyId === 'string'
    && typeof candidate.eventRoot === 'string'
    && typeof candidate.signature === 'string'
    && Array.isArray(candidate.events)
    && Array.isArray(candidate.artifacts)
    && candidate.artifacts.every((artifact) => artifact !== null
      && typeof artifact === 'object'
      && typeof artifact.name === 'string'
      && typeof artifact.mediaType === 'string'
      && typeof artifact.hash === 'string');
}

function createBalanceKey(accountDid: string, currency: string): string {
  if (!accountDid || !currency) {
    throw new Error('Balance entries require an account DID and currency.');
  }
  return `${accountDid}\u0000${currency}`;
}

function createNonceKey(sponsorDid: string, nonce: string): string {
  return `v2:${sha256([sponsorDid, nonce])}`;
}

function cryptoId(...parts: string[]): string {
  return createHash('sha256').update(parts.join('\u0000')).digest('hex');
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

function validatePayouts(payouts: LedgerPayout[]): void {
  if (payouts.length === 0
    || new Set(payouts.map((payout) => payout.recipientDid)).size !== payouts.length
    || payouts.some((payout) => !payout.recipientDid
      || !Number.isSafeInteger(payout.shareBasisPoints)
      || payout.shareBasisPoints <= 0)
    || payouts.reduce((total, payout) => total + payout.shareBasisPoints, 0) !== 10_000) {
    throw new Error('Ledger payouts require unique recipients and positive integer shares totaling 10,000 basis points.');
  }
}

function isRuntimeState(value: unknown): value is RuntimeState {
  if (!isRecord(value)
    || value.schemaVersion !== '1.0.0'
    || typeof value.stateHash !== 'string'
    || !Array.isArray(value.events)
    || !Array.isArray(value.consumedNonces)
    || !isRecord(value.balances)
    || !isRecord(value.holds)) {
    return false;
  }

  return value.consumedNonces.every((nonce) => typeof nonce === 'string')
    && new Set(value.consumedNonces).size === value.consumedNonces.length
    && value.events.every(isFabricEvent)
    && Object.values(value.balances).every((balance) => Number.isSafeInteger(balance) && Number(balance) >= 0)
    && Object.entries(value.holds).every(([escrowId, hold]) => isLedgerHold(hold, escrowId));
}

function isFabricEvent(value: unknown): value is FabricEvent {
  return isRecord(value)
    && typeof value.id === 'string'
    && value.id.length > 0
    && typeof value.aggregateId === 'string'
    && value.aggregateId.length > 0
    && typeof value.type === 'string'
    && value.type.length > 0
    && typeof value.actorDid === 'string'
    && value.actorDid.length > 0
    && typeof value.at === 'string'
    && !Number.isNaN(new Date(value.at).getTime())
    && typeof value.previousHash === 'string'
    && /^[0-9a-f]{64}$/.test(value.previousHash)
    && typeof value.hash === 'string'
    && /^[0-9a-f]{64}$/.test(value.hash)
    && Object.hasOwn(value, 'payload');
}

function isLedgerHold(value: unknown, escrowId: string): value is LedgerHold {
  return isRecord(value)
    && value.escrowId === escrowId
    && typeof value.buyerDid === 'string'
    && value.buyerDid.length > 0
    && typeof value.currency === 'string'
    && value.currency.length > 0
    && Number.isSafeInteger(value.amountMinor)
    && Number(value.amountMinor) > 0
    && (value.status === 'locked' || value.status === 'released' || value.status === 'refunded');
}

function hasConsistentEscrowHistory(state: RuntimeState): boolean {
  return Object.values(state.holds).every((hold) => {
    const escrowEvents = state.events.filter((event) => event.aggregateId === hold.escrowId);
    const lockEvents = escrowEvents.filter((event) => event.type === 'escrow-funds-locked');
    const releaseEvents = escrowEvents.filter((event) => event.type === 'escrow-funds-released');
    const refundEvents = escrowEvents.filter((event) => event.type === 'escrow-funds-refunded');
    if (lockEvents.length !== 1 || releaseEvents.length > 1 || refundEvents.length > 1) {
      return false;
    }

    const lockEvent = lockEvents[0];
    if (lockEvent.actorDid !== hold.buyerDid
      || !isRecord(lockEvent.payload)
      || lockEvent.payload.currency !== hold.currency
      || lockEvent.payload.amountMinor !== hold.amountMinor) {
      return false;
    }

    return (hold.status === 'locked' && releaseEvents.length === 0 && refundEvents.length === 0)
      || (hold.status === 'released' && releaseEvents.length === 1 && refundEvents.length === 0)
      || (hold.status === 'refunded' && releaseEvents.length === 0 && refundEvents.length === 1);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
