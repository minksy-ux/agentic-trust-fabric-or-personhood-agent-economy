# `@agentic-trust-fabric/cli`

Conformance and verification tooling for Agentic Trust Fabric artifacts.

## Commands

```bash
atf validate agent-card ./agent-card.json
atf verify-signature ./agent-card.json ./agent-public-key.pem
atf verify-evidence ./evidence.json ./auditor-public-key.pem
atf verify-runtime ./.atf/runtime.json
atf hash ./task-spec.json
```

All commands emit JSON and return exit code `0` on success or `1` on validation failure. Available schema names are:

- `agent-bond`
- `agent-card`
- `evidence-package`
- `insurance-policy`
- `intent-mandate`
- `skill-attestation`
- `task-spec`

By default, `validate` reads schemas from `./specs`. Use `--specs-dir <path>` when invoking the CLI outside the repository root.

## Local development

```bash
npm run build
npm run atf -- help
```

The CLI verifies local conformance and cryptographic integrity. It does not establish that a key is authorized for a DID; production callers must resolve DID documents, key validity periods, and revocation status.