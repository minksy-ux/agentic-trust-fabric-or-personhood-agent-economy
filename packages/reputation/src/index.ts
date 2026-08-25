export type ReputationSignal = {
  kind: string;
  weight: number;
  value: number;
};

export type ReputationScore = {
  schemaVersion: '1.0.0';
  agentDid: string;
  overall: number;
  signals: ReputationSignal[];
};

export function scoreReputation(agentDid: string, signals: ReputationSignal[]): ReputationScore {
  if (signals.length === 0) {
    throw new Error('At least one reputation signal is required.');
  }

  for (const signal of signals) {
    if (!Number.isFinite(signal.weight) || signal.weight <= 0) {
      throw new Error('Reputation signal weights must be finite and greater than zero.');
    }

    if (!Number.isFinite(signal.value) || signal.value < 0 || signal.value > 1) {
      throw new Error('Reputation signal values must be between zero and one.');
    }
  }

  const totalWeight = signals.reduce((total, signal) => total + signal.weight, 0);
  const weightedValue = signals.reduce((total, signal) => total + signal.weight * signal.value, 0);
  const overall = Math.round((weightedValue / totalWeight) * 10_000) / 100;

  return {
    schemaVersion: '1.0.0',
    agentDid,
    overall,
    signals,
  };
}

export function isHighTrust(score: ReputationScore, threshold: number): boolean {
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
    throw new Error('Reputation threshold must be between zero and 100.');
  }

  return score.overall >= threshold;
}
