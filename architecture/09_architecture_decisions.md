# 9. Architecture Decisions

_Documents important, expensive, large-scale, or risky architectural decisions including their rationales and consequences._

No formal Architecture Decision Records (ADRs) have been written for this repository
yet. The fundamental design decisions are described — with their rationale — in
[4. Solution Strategy](04_solution_strategy.md) and [8. Crosscutting Concepts](08_crosscutting_concepts.md).
This chapter is the canonical home for ADRs (the repository has **no** separate
`docs/adr/` tree); the table below is a derived decision log linking each significant,
code-evidenced decision to where its rationale already lives.

## Decision log

The decisions below are all evidenced in code, configuration, manifests, or the
existing architecture chapters. Rationale is not repeated here — follow the
cross-reference.

| # | Decision | Evidence in repo | Rationale (cross-reference) |
|---|---|---|---|
| D1 | Clinical semantics are carried by standard BPMN 2.0 `<extensionElements>`, not by changes to BPMN core | `packages/*/src/moddle/*.json` (`Element` superClass, attached via `extensionElements`); `architecture/08` "Generated XML" sample | [Ch. 4 — extensionElements as persistence mechanism](04_solution_strategy.md); [Ch. 1 — backwards compatibility](01_introduction_and_goals.md) |
| D2 | Two independent XML namespaces: `term:` (`https://clinical-bpmn.org/terminology/v1`) and `fhirmap:` (`https://clinical-bpmn.org/fhir-mapping/v1`) | `packages/terminology/src/moddle/clinical.json`, `packages/fhir-mapping/src/moddle/fhir-mapping.json` | [Ch. 4 — Separate XML namespaces](04_solution_strategy.md) |
| D3 | npm-workspaces monorepo with three independently consumable packages (`terminology`, `fhir-mapping`, `vue`) | root `package.json` `workspaces`; `packages/*/package.json` | [Ch. 4 — Monorepo with npm workspaces](04_solution_strategy.md); [Ch. 5 — "Why three packages?"](05_building_block_view.md) |
| D4 | Raw-ESM, no-build library publishing (pure JS + JSDoc, `"type": "module"`, source-only `exports`); consumers bring their own bundler | `packages/terminology/package.json` (`exports` point at `src/*`, no `build` script); `CONTRIBUTING.md` "Coding Standards / No build step for libraries" | [Ch. 4 / Ch. 8](04_solution_strategy.md) (design decisions); `CONTRIBUTING.md` |
| D5 | Provider/Adapter + Registry-as-facade design for terminology access | `packages/terminology/src/core/`, `/adapters/`, `/providers/`; [Ch. 5 class diagram](05_building_block_view.md) | [Ch. 4 — Provider/Adapter pattern; Registry as a facade](04_solution_strategy.md); [Ch. 8 — Design Principles](08_crosscutting_concepts.md) |
| D6 | Publish to GitHub Packages under `@forschungsgruppe-digital-health`, scope = repo owner | `publishConfig.registry = https://npm.pkg.github.com`; `.github/workflows/release-please.yml`; `CONTRIBUTING.md` "Publish scope" | `CONTRIBUTING.md` (no provenance attestation — unsupported on GitHub Packages) |
| D7 | Automated, lockstep versioning via release-please (manifest mode; `linked-versions` + `node-workspace` plugins); all three packages share one `v<version>` tag | `release-please-config.json`, `.release-please-manifest.json`, `.github/workflows/release-please.yml` | `CONTRIBUTING.md` "Releasing with release-please / Lockstep versioning" |
| D8 | Deterministic, agent-independent conformance gate run identically in CI, git hooks, and VS Code tasks | `tools/` (`lint-bpmn.mjs`, `moddle-roundtrip.mjs`, `validate-xsd.sh`, `check-package-conventions.mjs`); root `package.json` scripts (`check:conformance`, `check:packages`, `verify`); `.github/workflows/ci.yml`; `.githooks/` | `CONTRIBUTING.md` "Conformance and Quality Checks" |
| D9 | Three-layer conformance verdict: bpmnlint (structure, blocking), moddle roundtrip (extension data, blocking on instability), XSD core (informational only) | `tools/validate-xsd.sh`, `tools/moddle-roundtrip.mjs`; `.bpmnlintrc` (`recommended` + `correctness`) | `CONTRIBUTING.md` "The three layers / Why XSD is informational" |
| D10 | Apache-2.0 licensing across the repository | root `LICENSE`; `license` field in every `package.json` | _Requires human input: rationale for the license choice (not recorded in the repo)._ |

## How decisions are recorded going forward

- New significant decisions should be captured as **ADRs appended to this chapter**
  (this file), not as a new directory or template — the repository deliberately has
  no `docs/adr/` tree. The decision rationale that predates ADRs continues to live in
  [4. Solution Strategy](04_solution_strategy.md).
- The repository ships an `adr-draft` slash command
  (`.claude/commands/adr-draft.md`) that drafts a new ADR section, numbers it
  sequentially within this chapter, and reuses the existing tone — use it to add the
  next ADR.
- A moddle-descriptor change that renames or removes a type or property is a
  breaking (MAJOR) change and requires explicit maintainer sign-off before merge (see
  `AGENTS.md` and the `moddle-extension-review` skill); such a change should be
  accompanied by an ADR here.

## Open items requiring human input

- _Requires human input: the consequences/trade-offs of each decision above (e.g. the cost of lockstep versioning, or of shipping un-bundled ESM) are not stated in the repo and must be supplied by the maintainers._
- _Requires human input: any decisions taken but not reflected in code/config (e.g. why GitHub Packages over the public npm registry, why pure JS + JSDoc instead of TypeScript) — record the rationale as a proper ADR._

---

[← Architecture index](../ARCHITECTURE.md)
