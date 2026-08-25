#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import type { AnySchema } from 'ajv';
import {
  LocalTrustRuntime,
  sha256,
  verifyArtifactSignature,
  verifyEvidencePackage,
  type EvidencePackage,
} from '@agentic-trust-fabric/runtime';

const SCHEMA_FILES = {
  'agent-bond': 'agent-bond.json',
  'agent-card': 'agent-card.json',
  'evidence-package': 'evidence-package.json',
  'insurance-policy': 'insurance-policy.json',
  'intent-mandate': 'intent-mandate.json',
  'skill-attestation': 'skill-attestation.json',
  'task-spec': 'task-spec.json',
} as const;

type SchemaName = keyof typeof SCHEMA_FILES;

type CommandResult = {
  ok: boolean;
  command: string;
  details?: unknown;
  error?: string;
};

export function runCli(args: string[]): CommandResult {
  const [command, ...rest] = args;
  switch (command) {
    case 'validate':
      return validateCommand(rest);
    case 'verify-signature':
      return verifySignatureCommand(rest);
    case 'verify-evidence':
      return verifyEvidenceCommand(rest);
    case 'verify-runtime':
      return verifyRuntimeCommand(rest);
    case 'hash':
      return hashCommand(rest);
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      return { ok: true, command: 'help', details: helpText() };
    default:
      return { ok: false, command, error: `Unknown command: ${command}` };
  }
}

function validateCommand(args: string[]): CommandResult {
  const [schemaName, artifactPath, ...options] = args;
  if (!isSchemaName(schemaName) || !artifactPath) {
    return {
      ok: false,
      command: 'validate',
      error: `Usage: atf validate <${Object.keys(SCHEMA_FILES).join('|')}> <artifact.json> [--specs-dir <path>]`,
    };
  }

  try {
    const specsDirectory = readOption(options, '--specs-dir') ?? resolve(process.cwd(), 'specs');
    const schema = readJson(resolve(specsDirectory, SCHEMA_FILES[schemaName])) as AnySchema;
    const artifact = readJson(resolve(artifactPath));
    const ajv = new Ajv2020({ strict: true, allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    const valid = validate(artifact);
    return valid
      ? { ok: true, command: 'validate', details: { schema: schemaName, artifactPath: resolve(artifactPath) } }
      : { ok: false, command: 'validate', error: 'Artifact does not conform to schema.', details: validate.errors };
  } catch (error) {
    return failure('validate', error);
  }
}

function verifySignatureCommand(args: string[]): CommandResult {
  const [artifactPath, publicKeyPath] = args;
  if (!artifactPath || !publicKeyPath) {
    return { ok: false, command: 'verify-signature', error: 'Usage: atf verify-signature <artifact.json> <public-key.pem>' };
  }

  try {
    const artifact = readJson(resolve(artifactPath)) as object & { signature: string };
    const publicKey = readFileSync(resolve(publicKeyPath), 'utf8');
    const valid = verifyArtifactSignature(artifact, publicKey);
    return valid
      ? { ok: true, command: 'verify-signature', details: { artifactPath: resolve(artifactPath) } }
      : { ok: false, command: 'verify-signature', error: 'Artifact signature is invalid.' };
  } catch (error) {
    return failure('verify-signature', error);
  }
}

function verifyEvidenceCommand(args: string[]): CommandResult {
  const [packagePath, publicKeyPath] = args;
  if (!packagePath || !publicKeyPath) {
    return { ok: false, command: 'verify-evidence', error: 'Usage: atf verify-evidence <package.json> <public-key.pem>' };
  }

  try {
    const evidencePackage = readJson(resolve(packagePath)) as EvidencePackage;
    const publicKey = readFileSync(resolve(publicKeyPath), 'utf8');
    const valid = verifyEvidencePackage(evidencePackage, publicKey);
    return valid
      ? {
        ok: true,
        command: 'verify-evidence',
        details: {
          packageId: evidencePackage.id,
          transactionId: evidencePackage.transactionId,
          artifacts: evidencePackage.artifacts.length,
          events: evidencePackage.events.length,
        },
      }
      : { ok: false, command: 'verify-evidence', error: 'Evidence package is invalid.' };
  } catch (error) {
    return failure('verify-evidence', error);
  }
}

function verifyRuntimeCommand(args: string[]): CommandResult {
  const [runtimePath] = args;
  if (!runtimePath) {
    return { ok: false, command: 'verify-runtime', error: 'Usage: atf verify-runtime <runtime.json>' };
  }

  try {
    const resolvedRuntimePath = resolve(runtimePath);
    if (!existsSync(resolvedRuntimePath)) {
      throw new Error('Runtime state file does not exist.');
    }
    const runtime = new LocalTrustRuntime(resolvedRuntimePath);
    const valid = runtime.verifyEventChain();
    return valid
      ? { ok: true, command: 'verify-runtime', details: { events: runtime.listEvents().length } }
      : { ok: false, command: 'verify-runtime', error: 'Runtime event chain is invalid.' };
  } catch (error) {
    return failure('verify-runtime', error);
  }
}

function hashCommand(args: string[]): CommandResult {
  const [artifactPath] = args;
  if (!artifactPath) {
    return { ok: false, command: 'hash', error: 'Usage: atf hash <artifact.json>' };
  }

  try {
    return {
      ok: true,
      command: 'hash',
      details: { artifactPath: resolve(artifactPath), sha256: sha256(readJson(resolve(artifactPath))) },
    };
  } catch (error) {
    return failure('hash', error);
  }
}

function isSchemaName(value: string | undefined): value is SchemaName {
  return value !== undefined && Object.hasOwn(SCHEMA_FILES, value);
}

function readOption(args: string[], option: string): string | undefined {
  const index = args.indexOf(option);
  if (index === -1) {
    return undefined;
  }
  if (!args[index + 1]) {
    throw new Error(`${option} requires a value.`);
  }
  return resolve(args[index + 1]);
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function failure(command: string, error: unknown): CommandResult {
  return {
    ok: false,
    command,
    error: error instanceof Error ? error.message : String(error),
  };
}

function helpText(): string {
  return [
    'Agentic Trust Fabric conformance CLI',
    '',
    'Commands:',
    '  atf validate <schema> <artifact.json> [--specs-dir <path>]',
    '  atf verify-signature <artifact.json> <public-key.pem>',
    '  atf verify-evidence <package.json> <public-key.pem>',
    '  atf verify-runtime <runtime.json>',
    '  atf hash <artifact.json>',
  ].join('\n');
}

if (require.main === module) {
  const result = runCli(process.argv.slice(2));
  const stream = result.ok ? process.stdout : process.stderr;
  stream.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}
