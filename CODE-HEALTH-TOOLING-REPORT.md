# Code-Health Tooling Report — `bpmn-js-clinical-semantics`

> Tailored, adversarially-verified recommendations for detecting **(1) dead/unused code**,
> **(2) disabled/unused/hidden features**, **(3) inconsistent code or features**, and
> **(4) vulnerable or insecure code & dependencies** in this repository.
>
> _Date: 2026-06-18. JS tooling churns fast; every version-/status-sensitive claim below was
> re-verified against primary sources (see [Further reading](#further-reading)). Claims that the
> upstream research digests got wrong or overstated are called out inline as **[CORRECTED]**._

## Intro: scope and stack profile

**Scope.** This report recommends tools, the matching already-available agents/skills, and a
repeatable orchestration to surface the four issue classes above. It is opinionated toward a
**minimal, high-signal** stack that slots in next to the repo's existing BPMN conformance gate.

**Stack profile (from the repo).** `clinical-bpmn` is a **private npm-workspaces monorepo**,
**raw ESM** (`"type": "module"` everywhere, no build step for the libs), **plain JavaScript + JSDoc
(no TypeScript, no `tsconfig`)**. Workspaces: `packages/terminology`, `packages/fhir-mapping`,
`packages/vue` (Vue 3 wrapper/composables) plus `examples/*` (Vite demo). Each lib ships **moddle
descriptors** (`packages/*/src/moddle/*.json`) and **properties-panel** providers. Testing is
**Vitest 3.x** (no config file). Publishing is to **GitHub Packages** (`@forschungsgruppe-digital-health`
scope, raw-src, via `release-please`). CI is **GitHub Actions on Node 18/20** with a **custom BPMN
conformance gate** (`bpmnlint` + moddle roundtrip + XSD core) and **git hooks** (`.githooks/pre-commit`,
`.githooks/pre-push`). Install uses **`npm install --legacy-peer-deps`**. There is **no ESLint/Prettier/
tsconfig** and **no SCA/SAST/secret-scanning** beyond informal `npm audit`. Healthcare/clinical context:
**only synthetic data**, PII sensitivity.

**Guiding principle.** *Deterministic tools decide; agents/skills orchestrate and explain.* This is
exactly how the repo's own conformance gate works (`bpmnlint`/roundtrip/XSD give the pass/fail; a human
or skill reads the result). Every recommendation below pairs a **deterministic CLI/Action** (the gate)
with an **available model-driven skill/agent** (triage, narrative, cross-validation). Never let the
model be the pass/fail authority.

---

## 1. Dead or unused code

**What to look for.** Unused files, unused module **exports**, uncalled functions, **unused/unlisted
dependencies**, unresolved imports, orphaned properties-panel entries/providers, dead moddle helper
code. The blind spots that matter here: **dynamic registration** (moddle descriptors and properties
providers are wired through bpmn-js DI/registration, not always via a static import that a graph
walker sees) and **published library exports** (an export consumed only by a downstream consumer repo
looks "unused" to a local graph — it must be declared as an entry point).

### Tools

| Tool | What it finds | Fit for this repo | CI / local integration | Maturity (2026-06) |
|---|---|---|---|---|
| **Knip** | Unused files, exports, deps, unlisted deps, unresolved imports, unused config | **Excellent.** Plain-JS + JSDoc supported (no TS required; honors `@public`/`@internal` JSDoc tags); npm workspaces auto-detected; Vite/Vitest/Vue plugins. Primary pick. | `npx knip`; package.json script; GitHub Actions; pre-commit. Per-workspace `entry`/`project` config needed for moddle + panel + published exports. | **Mature, active.** Industry standard. |
| **find-unused-exports** | Unused ESM exports only (whole-project) | **Good, narrow.** Native ESM (`.mjs`), JSDoc `@import` aware. Useful as a lightweight export-only second opinion; **v9.0.0** (Jun 2026). | `npx find-unused-exports` in a script. | Mature, active. |
| **rev-dep** | Unused exports, orphan files, unused node modules, circular imports, module-boundary violations | **Good for speed.** Go-native, first-class npm/yarn/pnpm workspaces, ~10–200× faster than JS tools. Overkill at this repo's size today; keep in reserve. | Go CLI; CI. | Active, **emerging** (smaller adoption than Knip). |
| **Fallow** | Unused code + duplication + circular deps + complexity + arch boundaries | **Good.** Rust/Oxc-native, sub-second, zero-config, structured JSON for agents; free static layer (paid runtime layer is optional and out of scope here). Newer than Knip. | `fallow` CLI; SARIF/JSON; GitHub annotations. | Active (newer; **verify before relying on it as the sole gate**). |
| **eslint-plugin-unused-imports** / ESLint `no-unused-vars` | File-scoped unused imports/vars | **Good as a fast local layer**, not a replacement: cannot see cross-file unused exports/files. | ESLint CLI + pre-commit. | Mature. |
| **Skott** | Circular deps + unused files (Madge replacement) | Optional, for circular-dep **visualization**. | CLI/API. | Active. |
| ~~unimported~~ | unused files only | **[CORRECTED] Do NOT use — archived/unmaintained; the project itself now recommends Knip.** | — | **Deprecated.** |
| ~~Madge~~ | circular deps (legacy) | **Avoid for ESM** — use Skott or rev-dep instead. | — | Stale for ESM. |
| ~~ts-prune~~ / ~~ts-unused-exports~~ | unused TS exports | **[TS-ONLY — does not apply]** This repo has no `tsconfig`; do not introduce TS tooling just for this. | — | Maintenance-mode / superseded by Knip. |

> **[CORRECTED] depcheck** appears in the digests as a dead-code option. It is **dated, weak on
> monorepos, and the ecosystem (incl. its own docs) points at Knip**. Use it only as a throwaway
> illustration, not a gate. **`npm audit` is NOT a dead-code tool** — different concern.

### Matching available skill/agent
- **`dead-code-detector`** (agent + skill): unused exports, unreferenced routes, uncalled functions,
  orphaned endpoints; cross-validates Frontend↔Backend (here: Vue wrapper/composables ↔ the
  terminology/fhir-mapping libs ↔ properties-panel providers). Reports candidates with confidence;
  **never deletes**.

### Recommended approach
1. **Knip is the deterministic gate.** Add a root `knip.json` declaring per-workspace entry points:
   the published package `exports`/`main`, the moddle descriptor JSON, each properties-panel
   `index.js`, Vue composables, and Vitest test files. Treat published exports as entries so
   downstream-only usage is not flagged.
2. **Run `dead-code-detector` to triage Knip's output**, especially to separate genuinely dead code
   from **dynamically-registered** moddle/panel code (the largest false-positive source here).
   The skill explains *why* something looks unused; Knip decides *that* it is unreferenced.
3. Add **`eslint-plugin-unused-imports`** as a fast pre-commit layer once ESLint lands (see §3).
4. Treat every finding as a candidate; **verify before deletion** (PII may live in
   reported-as-dead fixtures — confirm before removing).

---

## 2. Disabled, unused, or hidden features

**What to look for.** Features that are *declared but not wired* (a moddle type with no panel entry,
a panel entry not registered with a provider, an exported provider never imported by the Vue wrapper
or demo), **commented-out feature blocks**, **env/flag-gated** branches (`process.env.*`,
`import.meta.env.*`), and **doc/README claims with no implementation**. There is no LaunchDarkly-style
flag system here, so dedicated flag-cleanup tooling is largely out of scope.

### Tools

| Tool | What it finds | Fit for this repo | CI / local integration | Maturity (2026-06) |
|---|---|---|---|---|
| **Knip** (reused) | Exports/files/deps not reached from entry points | **Excellent.** A moddle type or panel provider that nothing imports surfaces here. Same gate as §1. | as §1 | Mature. |
| **Vitest coverage** (`--coverage`, v8) | Lines/branches/functions never exercised by tests | **Excellent — already in the stack.** Cross-correlate with Knip: code that is *both* unreferenced and *uncovered* is high-confidence dead/disabled. | `vitest run --coverage`; LCOV in CI. | Mature, in use. |
| **eslint-plugin-no-commented-code** | Commented-out code blocks | Good once ESLint exists; prevents commented "disabled features" from accumulating. | ESLint rule. | Active (niche — verify upkeep before gating on it). |
| **Grep / ripgrep audit** | `process.env.*`, `import.meta.env.*`, `if (FLAG)` branches | **Practical.** Cheap, deterministic sweep for env-gated/hidden branches; cross-check against CI `.env`. | shell script in CI. | n/a (built-in). |
| **Piranha / FlagShark / bye-bye-flag** | Stale feature flags | **Out of scope** unless a flag system is adopted; these assume flags-as-code. FlagShark is commercial SaaS; bye-bye-flag is experimental. | — | Active (not applicable here). |
| **SonarQube/SonarCloud** | Unreachable statements, smells | **[CORRECTED] Detects *unreachable* code, NOT unused exports/features** — and needs a hosted instance. Heavy for this repo; skip unless compliance demands it. | SaaS/self-host. | Mature (overkill). |

### Matching available skill/agent
- **`feature-inventarist`** (agent + skill): scans routes/modules/components/endpoints/**FHIR ops** and
  produces a **Feature Inventory Matrix** with *preliminary* maturity (human review mandatory). This is
  the natural home for "declared vs. implemented vs. tested vs. used."

### Recommended approach
1. Run **`feature-inventarist`** to enumerate declared features (moddle types, panel entries, Vue
   composables, FHIR mappings, README/`EXTENDING-BPMN-IO.md` claims).
2. For each declared feature, cross-reference: **Knip** (is the export reached?) + **Vitest coverage**
   (is it exercised?) + a **ripgrep sweep** (is it behind an env flag / commented out?).
3. **Gap table** output: *declared-but-unwired*, *implemented-but-untested*, *documented-but-absent*.
   The matrix is the durable artifact; the deterministic tools supply each cell's evidence.

---

## 3. Inconsistent code or features

**What to look for.** Style/format drift (no ESLint/Prettier today), **JSDoc type drift** (since there's
no TS), **naming drift** across extension property names / moddle attributes / clinical helper prefixes,
**dependency-version drift** across workspaces (overlapping `bpmn-js`, `bpmn-moddle`, `vue`,
`@bpmn-io/properties-panel` ranges), **circular deps / module-boundary leaks** (Vue wrapper leaking into
core moddle logic), **code duplication** across the three libs, and **docs ↔ code drift**.

### Tools

| Tool | What it finds | Fit for this repo | CI / local integration | Maturity (2026-06) |
|---|---|---|---|---|
| **ESLint 9 (flat config) + eslint-plugin-jsdoc** | Style, unused vars/imports, naming, **JSDoc `@param`/`@returns`/`@typedef` consistency** | **Excellent — top gap.** Repo has zero linting; ESLint gives the most consistency leverage with no TS friction. | `eslint.config.mjs`; npm script; lint-staged; CI. | Mature. |
| **eslint-plugin-vue** | Vue 3 SFC/template consistency + `vue/no-v-html` | **Good** for `packages/vue`. (Also the *correct* place to catch unsafe `v-html` — see §4 correction.) | ESLint flat config. | Mature. |
| **Prettier** (+ `eslint-config-prettier`) | Formatting | Good; pairs with ESLint to kill bikeshedding. | lint-staged; CI `--check`. | Mature. |
| **EditorConfig** | Cross-editor whitespace/EOL/charset | Excellent, zero-friction floor (no CLI gate, editor-enforced). | `.editorconfig`. | Mature. |
| **Syncpack** | Cross-workspace dependency **version mismatches**; single-version policy | **Excellent.** Reads npm `workspaces` from root `package.json`; catches `bpmn-js`/`vue`/`bpmn-moddle` range drift. Actively maintained. | `syncpack lint`/`fix`; CI; lint-staged on `package.json`. | Active (broadly adopted). |
| **dependency-cruiser** | Forbidden imports / module-boundary rules / circular deps | **Excellent.** **v17.x**, actively maintained, native ESM/JS (no TS needed). Enforce "Vue wrapper must not be imported by core libs", "panels don't leak into moddle." | `depcruise --validate`; CI; `.dependency-cruiser.mjs`. | Active. |
| **jscpd** (v5) | Copy/paste duplication across JS/Vue/Markdown | **Good.** v5 is a Rust/Oxc rewrite (24–37× faster, single binary); threshold-fail in CI; AI/SARIF reporters. | `jscpd --threshold N`; CI. | Active (v5). |
| **Skott / rev-dep** | Circular deps (alt to dependency-cruiser) | Optional second opinion. | CLI. | Active. |
| **bpmn-moddle roundtrip + XSD** | Schema/roundtrip consistency for extensions | **Critical — already in the gate.** Extend coverage to *extension-specific* properties so clinical semantics survive export/import. | existing `check:conformance`. | Mature, in use. |
| **Stylelint** | CSS/SCSS consistency | Moderate — only if panels/Vue ship real styles. | lint-staged. | Mature. |
| ~~ts-prune / TS-only tools~~ | — | **[TS-ONLY — does not apply.]** | — | n/a. |

### Matching available skills/agents
- **`code-review`** and **`simplify`** skills — correctness bugs + reuse/simplification cleanups on the diff.
- **`docs-auditor`** skill — role-aware docs↔code consistency: contradictions, version/status drift, stale
  claims, **broken links/anchors and orphan docs**, plus a small consolidation plan. Ideal for the repo's
  large doc set (`README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `EXTENDING-BPMN-IO.md`, `docs/`).
- **`css-auditor`** skill — only if/when component styles grow (unused classes, token candidates, selector
  complexity).
- **`moddle-extension-review`** / **`bpmn-conformance`** / **`bpmn-naming-publishing`** skills — keep
  descriptor and packaging conventions consistent (these wrap the existing deterministic gate).

### Recommended approach
1. **Land ESLint 9 flat config first** (`eslint.config.mjs`) with `eslint-plugin-jsdoc`,
   `eslint-plugin-unused-imports`, `eslint-plugin-vue` for `packages/vue`. This is the single
   highest-leverage consistency move (the repo has none today). Add Prettier + `.editorconfig` alongside.
2. **Syncpack** as a CI gate for version alignment; **dependency-cruiser** for module-boundary rules.
3. **jscpd** with a duplication threshold; tune to avoid flagging legitimately parallel
   terminology/fhir-mapping structure.
4. Run **`docs-auditor`** for docs↔code drift; let **`code-review`**/**`simplify`** sweep the diff.
   Deterministic linters decide pass/fail; the skills triage and narrate.

---

## 4. Vulnerable or insecure code & dependencies

**What to look for.** Known-CVE dependencies (SCA), insecure code patterns (SAST: unsafe HTML sinks,
unsafe regex, weak crypto, `eval`), **committed secrets**, **CI/CD supply-chain exposure** (unpinned
GitHub Actions), **lockfile integrity**, and — given the clinical context — **PII/PHI leakage** (only
synthetic data allowed). Note: these are **libraries** (no server, no auth layer), so JWT/CORS/rate-limit
findings from generic healthcare checklists mostly **do not apply**; the live risk surface is
**supply-chain + the Vue render path + secrets**.

### Tools

| Tool | What it finds | Fit for this repo | CI / local integration | Maturity (2026-06) |
|---|---|---|---|---|
| **npm audit** | Known CVEs in deps (GitHub Advisory DB) | **Baseline, already used informally.** Free, built-in, workspace-aware. Insufficient alone (single DB, reactive, no peerDeps). | `npm audit --audit-level=…`; CI. **Pair with `npm ci`** (currently CI uses `npm install --legacy-peer-deps`). | Mature. |
| **OSV-Scanner** (Google) | CVEs from osv.dev (30+ sources); **guided remediation** for npm `package.json`/`package-lock.json` | **Excellent.** Reads `package-lock.json`, npm fix guidance, official GitHub Action; broader DB than npm audit. **v2.x** (2026). | `google/osv-scanner-action`; CLI. | Active. |
| **GitHub Dependabot** | Vulnerable-dep alerts + auto security PRs; opt-in npm malware detection (2026) | **Excellent, native, free** for the repo on GitHub; supports the GitHub Packages ecosystem. | Enable in repo settings. | Mature. |
| **GitHub Secret Scanning + Push Protection** | Committed/pushed secrets; npm-token validity checks (2026) | **Excellent, native.** Critical given the PII context. | Enable in settings. | Mature. |
| **Gitleaks** | Secrets in diffs/history (regex), SARIF | **Excellent pre-commit hook** (sub-second). Mirrors the portal repo's gitleaks practice. | pre-commit + CI. | Mature. |
| **TruffleHog** | 800+ secret types **with live verification** | Good deeper CI pass (slower than Gitleaks). | CI. | Mature. |
| **GitHub Actions SHA-pinning** (+ Renovate/`pinact`) | Mutable-tag supply-chain risk | **Critical here.** **[VERIFIED on this repo]** CI pins actions to *mutable tags* (`actions/checkout@v4`, `setup-node@v4`, `release-please-action@v5`). The **March 2026 Trivy `trivy-action` incident** (76/77 tags force-pushed to malware) showed SHA-pinned workflows were unaffected. Pin to commit SHAs. | edit `.github/workflows/*`; Renovate `minimumReleaseAge`. | Best practice; native lockfile on GitHub roadmap. |
| **ESLint security plugins** | Unsafe code patterns | See below; lands with the §3 ESLint adoption. | ESLint. | see below |
| `eslint-plugin-security` | unsafe regex, weak crypto, `eval`, bidi/Trojan-Source | **Good generic Node floor** (v4.x, Feb 2026). | ESLint. | Mature. |
| `eslint-plugin-no-unsanitized` (Mozilla) | unsafe `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`setHTMLUnsafe` in **JS** | **Good for JS DOM sinks. [CORRECTED] It does NOT cover Vue template `v-html`** — for that use **`eslint-plugin-vue`'s `vue/no-v-html`** rule (see §3). Supports ESLint 9 flat config. | ESLint (flat config). | Active. |
| **GitHub CodeQL** | Semantic SAST (data-flow): injection, SSRF, XSS | **[VERIFIED] Free for public repos; JS/TS default setup, no TS required.** Repo is currently **private**, so CodeQL needs GitHub Advanced Security — **defer unless GHAS/public.** Vue template logic coverage is limited. | `github/codeql-action` (if eligible). | Mature. |
| **Semgrep** | Pattern SAST + **custom YAML rules** | **Good** for *custom healthcare anti-patterns* (e.g., realistic-name fixtures, PII in logs). Community edition free. | CLI/Action; SARIF. | Active. |
| **Socket.dev** / Aikido Safe Chain | **Behavioral** supply-chain malware detection | Strong complement to CVE scanning given 2026 npm-malware campaigns; freemium. | GitHub App / npm wrapper. | Active. |
| **lockfile-lint** | Lockfile policy (HTTPS, host allowlist, integrity) | Good lightweight CI/pre-commit guard for `package-lock.json`. v5.x (2026). | CLI; CI/pre-commit. | Active. |
| **npm provenance / SLSA** | Published-artifact attestation | **[CORRECTED] Not usable here today.** Provenance is built for the **public npm registry** (Sigstore trust root for `registry.npmjs.org`); this repo publishes to **GitHub Packages** with **no `--provenance` flag**. Document as *not applicable* until/unless publishing to public npm. | n/a here. | Active (public-npm only). |
| **OpenSSF Scorecard** | Repo security-posture score (18 checks) | Optional self-assessment; ~9/18 checks auto. | GitHub Action. | Mature. |
| **license-checker-evergreen** | SPDX license compliance | Useful for an audit trail; not security per se. | CLI; CI. | Active. |
| ~~Trivy~~ | FS/dep/SBOM scanning | **[CORRECTED — nuance]** Trivy is *not* "permanently unsafe": the March 2026 compromise was of its **GitHub Actions/release tags**, now remediated (safe: trivy binary ≤ v0.69.3, `trivy-action` v0.35.0). The real lesson is **SHA-pin all actions**. OSV-Scanner/Dependabot already cover this repo's SCA needs, so Trivy is simply **unnecessary**, not forbidden. | — | Active (incident-scarred). |
| ~~eslint-plugin-pii~~ | hardcoded email/DOB/IP/phone | **Unmaintained; insufficient for healthcare.** Use only as a supplementary heuristic; the real control is the AGENTS.md synthetic-data-only rule + code review + a custom Semgrep rule. | — | Niche/stale. |

### Matching available skill/agent
- **`security-reviewer`** (agent + skill) and the built-in **`/security-review`** command — secrets,
  unvalidated JWTs, authz bypass, injection, permissive CORS, missing rate limits, **PII leakage in logs**.
  Use it to triage SCA/SAST output and to enforce the synthetic-data rule (the part no static tool does well).

### Recommended approach
1. **Tier 1 (native, free, do now):** enable **Dependabot** + **Secret Scanning/Push Protection**; add
   **`npm audit --audit-level=high`** to CI and switch CI installs to **`npm ci --legacy-peer-deps`**
   (reproducible installs); add **Gitleaks** pre-commit; **SHA-pin all GitHub Actions**.
2. **Tier 2:** add **OSV-Scanner** Action (better remediation than npm audit); add **lockfile-lint**;
   add the **ESLint security plugins** + `vue/no-v-html` with the §3 ESLint rollout.
3. **Tier 3 (as warranted):** **Semgrep** with a small custom rule set for *PII-in-fixtures/logs*;
   **Socket.dev** for behavioral supply-chain detection; **CodeQL** only if the repo goes public or
   gets GHAS.
4. **Process control (non-negotiable for healthcare):** mandatory **`security-reviewer`** pass on any
   change touching fixtures/logging; no static PII scanner is mature enough to be the sole gate in 2026.

---

## Concrete findings on this repo right now

*Illustrative — these are live, reproduced findings, not the full audit a gate would produce.*

**`npm audit` (full, incl. dev deps) — reproduced 2026-06-18:**

```text
# npm audit report
esbuild  0.27.3 - 0.28.0   (low)      arbitrary file read via dev server on Windows
vite     <=6.4.2 || 7.0.0-7.3.3 (high) launch-editor NTLMv2 hash disclosure + server.fs.deny bypass (Windows)
vitest   <3.2.6           (critical)  Vitest UI server: arbitrary file read & execute
3 vulnerabilities (1 low, 1 high, 1 critical) — fix available via `npm audit fix`
```

- **All three are dev-/toolchain dependencies** (Vitest, Vite, esbuild), reached only via the test
  runner and the Vite demo. **`npm audit --omit=dev` → 0 vulnerabilities** (production/library deps are
  clean). They are **Windows-leaning, local-dev-server** issues — real but **not in shipped library
  surface**. Triage: bump via `npm audit fix` (patch-level), but they would not block a *production*
  gate. This is the textbook reason to scan **with and without** `--omit=dev` and gate accordingly.
- **`depcheck` illustration:** the stack profile notes a `depcheck` run could not complete in-budget;
  this is expected (it needs a full install/cache) and is **why Knip is the recommended dead-deps tool**
  instead — better monorepo support, faster, maintained.
- **CI install is `npm install --legacy-peer-deps`, not `npm ci`** — non-reproducible; switch CI to
  `npm ci --legacy-peer-deps`.
- **GitHub Actions are pinned to mutable tags** (`actions/checkout@v4`, `actions/setup-node@v4`,
  `googleapis/release-please-action@v5`) — the exact exposure the March 2026 Trivy incident exploited.
- **No ESLint/Prettier/tsconfig and no SCA/SAST/secret-scanning in CI** — confirmed; the four gaps the
  recommended stack closes.

---

## Recommended stack for this repo (minimal, high-signal)

Pick the best 1–2 per category; everything is free/OSS and CI-friendly.

| Category | Top pick(s) | Exact CLI / Action |
|---|---|---|
| Dead/unused code | **Knip** (+ `find-unused-exports` as export-only second opinion) | `npx knip` / `npx find-unused-exports` |
| Disabled/hidden features | **Knip × Vitest coverage** correlation (+ `feature-inventarist`) | `vitest run --coverage` + `npx knip` |
| Inconsistency | **ESLint 9 + eslint-plugin-jsdoc + eslint-plugin-vue + Prettier**; **Syncpack**; **dependency-cruiser**; **jscpd** | `npx eslint .` / `npx syncpack lint` / `npx depcruise packages --validate` / `npx jscpd packages` |
| Vulnerable/insecure | **Dependabot + Secret Scanning** (native) + **OSV-Scanner** + **Gitleaks** + **SHA-pinned actions** | `google/osv-scanner-action` / `gitleaks/gitleaks-action` |

### Wire it as a CI gate next to the conformance gate

Add a `quality` job to `ci.yml` (mirrors the existing `conformance` job; SHA-pin every `uses:`):

```yaml
quality:
  runs-on: ubuntu-latest
  permissions: { contents: read }
  steps:
    - uses: actions/checkout@<SHA>            # pin to commit SHA, not @v4
    - uses: actions/setup-node@<SHA>
      with: { node-version: 20 }
    - run: npm ci --legacy-peer-deps          # reproducible (replaces npm install)
    - run: npx eslint .
    - run: npx syncpack lint
    - run: npx depcruise packages --config .dependency-cruiser.mjs
    - run: npx jscpd packages --threshold 5
    - run: npx knip                            # dead code/deps gate
    - run: npx vitest run --coverage
    - run: npm audit --audit-level=high        # gate prod-relevant CVEs
    - uses: google/osv-scanner-action@<SHA>    # better remediation than npm audit
```

### Wire it as a git hook (extend the existing `.githooks`)

```sh
# .githooks/pre-commit — append after the existing conformance/package gates
command -v gitleaks >/dev/null 2>&1 && gitleaks protect --staged --no-banner
npx --no-install lint-staged   # eslint --fix + prettier --write on staged files

# .githooks/pre-push — extend `npm run verify`
# verify currently = check:packages && check:conformance && test
# add:  && npx knip && npm audit --audit-level=high
```

### Phased rollout

- **Phase 0 — Quick wins (native, hours):** enable Dependabot + Secret Scanning + Push Protection;
  add `npm audit --audit-level=high` to CI; switch CI to `npm ci --legacy-peer-deps`; **SHA-pin all
  actions**; add a Gitleaks pre-commit hook.
- **Phase 1 — Consistency baseline (days):** ESLint 9 flat config (+ jsdoc/vue/unused-imports/security
  plugins) + Prettier + `.editorconfig`; lint-staged + the existing hooks.
- **Phase 2 — Structure & dead code (1–2 weeks):** Knip (with per-workspace entry config) + Syncpack +
  dependency-cruiser + jscpd; correlate Knip with Vitest coverage; run `feature-inventarist` +
  `dead-code-detector` to triage.
- **Phase 3 — Deeper (as warranted):** OSV-Scanner Action + lockfile-lint; Semgrep custom PII rules;
  Socket.dev; CodeQL only if public/GHAS; OpenSSF Scorecard + license-checker for audit trails.

---

## Generating the report (orchestration)

Produce **one repeatable code-health report** with a **find → adversarially verify → synthesize**
multi-agent workflow — the durable pattern this very report followed:

1. **Find (deterministic tools first).** Run the gate tools and capture machine-readable output:
   `knip --reporter json`, `vitest run --coverage`, `npm audit --json`, `osv-scanner --format json`,
   `eslint -f json`, `syncpack list-mismatches`, `depcruise --output-type json`, `jscpd --reporters json`.
2. **Explain/triage (available skills/agents, scoped to category):**
   - `dead-code-detector` → category 1 (separate dynamic moddle/panel registration from true dead code).
   - `feature-inventarist` → category 2 (Feature Inventory Matrix; preliminary maturity).
   - `code-review` + `simplify` + `docs-auditor` (+ `css-auditor` if styles) → category 3.
   - `security-reviewer` / `/security-review` → category 4 (and the synthetic-data/PII control).
   - `bpmn-conformance` / `moddle-extension-review` / `bpmn-naming-publishing` keep the existing BPMN gate honest.
3. **Adversarially verify.** Have an agent re-check shaky/version-sensitive claims against **primary
   sources** before they enter the report (deprecations, TS-only traps, registry support). This is the
   step that caught the corrections flagged above.
4. **Synthesize.** Merge into one Markdown report; **let the deterministic tool output be the pass/fail
   authority** and the agents supply triage, confidence, and narrative. Never let the model alone decide
   a gate — exactly the principle the repo's conformance gate already embodies.

---

## Further reading

_De-duplicated, verified to resolve as of 2026-06-18._

**Dead / unused code**
- Knip — https://knip.dev/ · monorepos: https://knip.dev/features/monorepos-and-workspaces · comparison/migration (unimported→Knip): https://knip.dev/explanations/comparison-and-migration
- find-unused-exports (v9.0.0) — https://github.com/jaydenseric/find-unused-exports
- rev-dep — https://github.com/jayu/rev-dep · https://rev-dep.com/
- Fallow — https://github.com/fallow-rs/fallow
- Skott — https://github.com/antoine-coulon/skott
- eslint-plugin-unused-imports — https://www.npmjs.com/package/eslint-plugin-unused-imports
- unimported (archived; use Knip) — https://github.com/smeijer/unimported

**Features / coverage**
- Vitest coverage — https://vitest.dev/guide/coverage

**Inconsistency**
- ESLint — https://github.com/eslint/eslint · no-unused-vars: https://eslint.org/docs/latest/rules/no-unused-vars
- eslint-plugin-jsdoc — https://github.com/gajus/eslint-plugin-jsdoc
- eslint-plugin-vue — https://eslint.vuejs.org/
- Prettier — https://github.com/prettier/prettier · EditorConfig — https://editorconfig.org/
- Syncpack — https://syncpack.dev/ · https://github.com/JamieMason/syncpack
- dependency-cruiser (v17.x) — https://github.com/sverweij/dependency-cruiser
- jscpd (v5, Rust) — https://jscpd.dev/ · https://github.com/kucherenko/jscpd
- bpmn-moddle — https://github.com/bpmn-io/bpmn-moddle

**Vulnerable / insecure**
- npm audit — https://docs.npmjs.com/cli/audit/
- OSV-Scanner — https://github.com/google/osv-scanner · lockfiles: https://google.github.io/osv-scanner/supported-languages-and-lockfiles/
- GitHub Dependabot — https://docs.github.com/en/code-security/dependabot/dependabot-alerts/about-dependabot-alerts
- GitHub Secret Scanning / Push Protection — https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection
- Gitleaks — https://github.com/gitleaks/gitleaks · TruffleHog — https://github.com/trufflesecurity/trufflehog
- CodeQL — https://github.com/github/codeql-action
- Semgrep — https://semgrep.dev/
- eslint-plugin-security — https://github.com/eslint-community/eslint-plugin-security
- eslint-plugin-no-unsanitized — https://github.com/mozilla/eslint-plugin-no-unsanitized
- lockfile-lint — https://github.com/lirantal/lockfile-lint
- npm provenance (public npm only) — https://docs.npmjs.com/generating-provenance-statements/ · https://github.com/npm/provenance
- GitHub Actions SHA-pinning — https://www.stepsecurity.io/blog/pinning-github-actions-for-enhanced-security-a-complete-guide
- Trivy March 2026 advisory — https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23
- OpenSSF Scorecard — https://scorecard.dev/ · OWASP npm cheat sheet — https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html
- license-checker-evergreen — https://github.com/greenstevester/license-checker-evergreen
