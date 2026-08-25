export type Sponsor = {
  did: string;
  name: string;
  credential: SponsorCredential;
};

export type SponsorCredential = {
  schemaVersion: '1.0.0';
  id: string;
  issuerDid: string;
  subjectDid: string;
  type: 'proof-of-personhood' | 'organization-registry' | 'kyc' | 'web-of-trust';
  issuedAt: string;
  expiresAt: string;
  proof: string;
};

export type AgentIdentity = {
  schemaVersion: '1.0.0';
  did: string;
  sponsor: Sponsor;
  nonce: string;
  nonTransferable: true;
};

export type IdentityRegistry = {
  maxAgentsPerSponsor: number;
  identities: AgentIdentity[];
};

export function createIdentityRegistry(maxAgentsPerSponsor: number): IdentityRegistry {
  if (!Number.isSafeInteger(maxAgentsPerSponsor) || maxAgentsPerSponsor <= 0) {
    throw new Error('Maximum agents per Sponsor must be a positive integer.');
  }
  return { maxAgentsPerSponsor, identities: [] };
}

export function registerAgentIdentity(registry: IdentityRegistry, identity: AgentIdentity): IdentityRegistry {
  if (registry.identities.some((registered) => registered.did === identity.did)) {
    throw new Error('Agent DID is already registered.');
  }

  const sponsorAgentCount = registry.identities.filter(
    (registered) => registered.sponsor.did === identity.sponsor.did,
  ).length;
  if (sponsorAgentCount >= registry.maxAgentsPerSponsor) {
    throw new Error('Sponsor has reached the agent identity limit.');
  }

  return { ...registry, identities: [...registry.identities, identity] };
}

export function createAgentIdentity(sponsor: Sponsor, did: string): AgentIdentity {
  if (!did.startsWith('did:') || sponsor.credential.subjectDid !== sponsor.did) {
    throw new Error('Agent and sponsor identifiers must be valid and the credential subject must match the sponsor.');
  }

  return {
    schemaVersion: '1.0.0',
    did,
    sponsor,
    nonce: crypto.randomUUID(),
    nonTransferable: true,
  };
}

export function verifySponsorBinding(
  identity: AgentIdentity,
  verifiedAt: Date,
  verifyCredentialProof: (credential: SponsorCredential) => boolean,
): boolean {
  const { credential } = identity.sponsor;
  const issuedAt = new Date(credential.issuedAt);
  const expiresAt = new Date(credential.expiresAt);

  return identity.did.startsWith('did:')
    && identity.sponsor.did.startsWith('did:')
    && identity.nonTransferable
    && credential.subjectDid === identity.sponsor.did
    && credential.issuerDid.startsWith('did:')
    && !Number.isNaN(issuedAt.getTime())
    && !Number.isNaN(expiresAt.getTime())
    && issuedAt <= verifiedAt
    && expiresAt > verifiedAt
    && verifyCredentialProof(credential);
}
