# Contributing to bpmn-js-clinical-semantics

Thank you for your interest in contributing! This guide covers everything you need to know about development, testing, deployment, packaging, and releasing.

---

## Table of Contents

- [Development Setup](#development-setup)
- [Repository Layout](#repository-layout)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Branching Strategy](#branching-strategy)
- [Commit Conventions](#commit-conventions)
- [Pull Requests](#pull-requests)
- [GitHub Pages Deployment](#github-pages-deployment)
- [Packaging and Publishing](#packaging-and-publishing)
- [Release Process](#release-process)
- [Troubleshooting](#troubleshooting)

---

## Development Setup

### Prerequisites

- **Node.js >= 18** (check with `node --version`)
- **npm >= 9** (ships with Node 18+)
- **Git**

### Initial Setup

```bash
git clone https://github.com/forschungsgruppe-digital-health/bpmn-js-clinical-semantics.git
cd bpmn-js-clinical-semantics
npm install --legacy-peer-deps
```

The `--legacy-peer-deps` flag is required because bpmn-js and bpmn-js-properties-panel have overlapping peer dependency ranges that npm's strict resolver cannot satisfy automatically.

### Verify the setup

```bash
npm test       # Run all tests (173 tests across 2 packages)
npm run build  # Build the demo app to docs/
npm run dev    # Start the dev server at http://localhost:5173
```

---

## Repository Layout

This is a **monorepo** managed with [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces). The root `package.json` defines four workspaces:

| Workspace | Package name | Purpose |
|---|---|---|
| `packages/terminology` | `@bpmn-js-clinical-semantics/terminology` | Terminology annotation engine, providers, adapters, moddle extension, properties panel |
| `packages/fhir-mapping` | `@bpmn-js-clinical-semantics/fhir-mapping` | FHIR resource mapping, moddle extension, properties panel |
| `packages/vue` | `@bpmn-js-clinical-semantics/vue` | Vue 3 composables (optional framework integration) |
| `examples/vanilla` | `clinical-bpmn-demo` (private) | Interactive demo app, not published |

### Key files

| File | Purpose |
|---|---|
| `package.json` | Root workspace config, shared scripts, shared dev dependencies |
| `.github/workflows/ci.yml` | CI pipeline (lint, test, build on Node 18 + 20) |
| `.github/workflows/deploy.yml` | GitHub Pages deployment (tests + build + deploy) on push to `main` |
| `ARCHITECTURE.md` | Design decisions, UML diagrams, data model, project structure |
| `packages/*/src/moddle/*.json` | BPMN moddle extension descriptors (XML schema) |
| `packages/*/test/` | Unit test directories |

### npm workspace commands

```bash
# Run a script in all workspaces
npm test                                           # test in all workspaces
npm run build                                      # build in all workspaces

# Run a script in a specific workspace
npm run test --workspace=packages/terminology      # test only terminology
npm run test --workspace=packages/fhir-mapping     # test only fhir-mapping

# Install a dependency in a specific workspace
npm install <pkg> --workspace=packages/terminology
```

---

## Development Workflow

### Running the demo

```bash
npm run dev
```

This starts the Vite dev server for `examples/vanilla/`. The demo includes a sample BPMN file (`examples/vanilla/public/sample.bpmn`) with pre-existing terminology annotations and FHIR mappings on a lung cancer diagnostic pathway.

### Making changes

1. Edit source files in `packages/*/src/`.
2. The Vite dev server has hot module replacement, so changes to the demo app and its imported package sources are reflected immediately.
3. Write or update tests in `packages/*/test/` to cover your changes.
4. Run `npm test` to verify.

### Adding a new source file

When adding new modules, ensure they are re-exported through the package's `src/index.js` if they should be part of the public API. Check the corresponding `test/index.test.js` to verify the export surface is tested.

---

## Coding Standards

### Language and style

- **Pure JavaScript with JSDoc type annotations.** No TypeScript in this project; we rely on JSDoc for editor IntelliSense and documentation.
- **ES modules** (`import`/`export`), not CommonJS. All packages have `"type": "module"` in their `package.json`.
- **No build step for libraries.** The packages export raw ES module source files. Consumers are expected to have their own bundler (Vite, webpack, Rollup, etc.).

### File naming

- Source files: `PascalCase.js` for classes, `camelCase.js` for utilities and helpers.
- Test files: mirror the source path with `.test.js` suffix, e.g., `src/core/TerminologyRegistry.js` is tested in `test/core/TerminologyRegistry.test.js`.
- Moddle descriptors: `kebab-case.json` (e.g. `clinical.json`, `fhir-mapping.json`).

### Code organisation

Each package follows a consistent structure:

```
packages/<name>/
├── src/
│   ├── core/           Type definitions, interfaces, registries
│   ├── adapters/       Protocol-specific API adapters (optional)
│   ├── providers/      Concrete terminology providers (optional)
│   ├── moddle/         BPMN moddle extension descriptor (JSON)
│   ├── properties-panel/  bpmn-js-properties-panel integration
│   ├── services/       Helper functions for reading/writing annotations
│   └── index.js        Public API barrel export
└── test/
    ├── core/
    ├── adapters/
    ├── providers/
    ├── services/
    └── index.test.js   Public API surface test
```

---

## Testing

### Test framework

Tests use [Vitest](https://vitest.dev/), which is installed as a root dev dependency and shared across all workspaces.

### Running tests

```bash
npm test                                           # All workspaces
npm run test --workspace=packages/terminology      # Single workspace
npx vitest --watch                                 # Watch mode (from a package directory)
```

### Writing tests

- **Unit tests only.** Tests mock external dependencies (fetch, bpmn-moddle) and do not require running servers.
- **Mock fetch for adapter/provider tests.** Pass a `fetchFn` parameter to providers and adapters to inject mock implementations. See `test/adapters/SnowstormAdapter.test.js` for examples.
- **Mock moddle for helper tests.** Create a minimal `{ create(type, props) { return { $type: type, ...props }; } }` mock. See `test/services/AnnotationHelper.test.js`.
- **Properties panel modules are excluded from unit tests** because they depend on bpmn-js peer dependencies that are not fully available in the test environment. UI-level testing should be done via the demo app or integration tests.

### Test coverage targets

Aim for coverage of all public API functions, all provider types (static, FHIR, SNOMED CT), all adapter request paths (search, lookup, hierarchy), and all helper CRUD operations (add, get, remove, export).

---

## Branching Strategy

| Branch | Purpose |
|---|---|
| `main` | Stable release branch. Protected. Every push deploys to GitHub Pages. |
| `feature/<name>` | Feature branches. Branch from `main`, merge back via PR. |
| `fix/<name>` | Bug fix branches. Branch from `main`, merge back via PR. |
| `release/<version>` | Release preparation branches (optional, for coordinated releases). |

### Rules

- Never push directly to `main`. Always use pull requests.
- Keep feature branches short-lived (days, not weeks).
- Rebase on `main` before merging to keep history linear.

---

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Usage |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `test` | Adding or updating tests |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `chore` | Build, CI, dependency, or tooling changes |
| `perf` | Performance improvement |

### Scopes

Use the package name as scope: `terminology`, `fhir-mapping`, `vue`, `demo`, or omit for cross-cutting changes.

### Examples

```
feat(terminology): add OPS code system preset
fix(fhir-mapping): handle missing keyElements in export
docs: update README with GitHub Pages instructions
test(terminology): add SnowstormAdapter auth header tests
chore: update vitest to 3.2.x
```

---

## Pull Requests

### Before opening a PR

1. Run `npm test` and ensure all 173+ tests pass.
2. Run `npm run build` and ensure the demo builds without errors.
3. If you added a new public API, update the `test/index.test.js` for the affected package.
4. If you added a new provider or adapter, include tests with mocked fetch.

### PR template

Describe what you changed and why. Reference any related issues. The CI pipeline will automatically run tests on Node 18 and 20 and build the demo.

### Review guidelines

- One approval required before merging.
- Squash-merge feature branches to keep `main` history clean.
- Ensure the commit message on squash follows the Conventional Commits format.

---

## GitHub Pages Deployment

The demo app is automatically deployed to GitHub Pages via the [`deploy.yml`](.github/workflows/deploy.yml) workflow on every push to `main`.

### First-time setup (repository owner)

1. Go to **Settings > Pages** in the GitHub repository.
2. Under **Build and deployment > Source**, select **GitHub Actions**.
3. Push to `main`. The workflow will build the demo and deploy it.
4. The demo will be available at `https://forschungsgruppe-digital-health.github.io/bpmn-js-clinical-semantics/`.

### How it works

The workflow first runs the full test suite on Node 18 and 20. On success, it installs dependencies, runs `npm run build` (which builds the Vite demo app to `docs/` at the repository root), uploads the `docs/` directory as a Pages artifact, and deploys it. This ensures the demo is only deployed when all tests pass.

---

## Packaging and Publishing

### Package registry

Packages are published to the **GitHub Package Registry** under the `@bpmn-js-clinical-semantics` scope.

### Configuring npm for the GitHub registry

Add to your project's `.npmrc` (or create one):

```ini
@bpmn-js-clinical-semantics:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

For local development, set `GITHUB_TOKEN` to a personal access token with `read:packages` scope. For CI publishing, use the `GITHUB_TOKEN` secret available in GitHub Actions.

### What gets published

Each package under `packages/` is an independent npm package. The root package (`clinical-bpmn`) and the demo app (`clinical-bpmn-demo`) are marked `"private": true` and are never published.

### Package exports

Each package defines explicit `exports` in its `package.json`. Consumers can import from:

```js
// Main entry point
import { ... } from '@bpmn-js-clinical-semantics/terminology';

// Moddle descriptor (for moddleExtensions config)
import descriptor from '@bpmn-js-clinical-semantics/terminology/moddle';

// Properties panel module (for additionalModules config)
import module from '@bpmn-js-clinical-semantics/terminology/properties-panel';

// Preset factory functions
import { createKdlProvider } from '@bpmn-js-clinical-semantics/terminology/providers/presets';
```

---

## Release Process

### Version numbering

Follow [Semantic Versioning](https://semver.org/):

- **PATCH** (0.1.x): Bug fixes, documentation improvements, test additions.
- **MINOR** (0.x.0): New features that are backwards-compatible (new providers, new aspects, new FHIR resource types).
- **MAJOR** (x.0.0): Breaking changes to public API, moddle schema changes, renamed exports.

All three publishable packages (`terminology`, `fhir-mapping`, `vue`) are versioned together to keep compatibility simple.

### Step-by-step release

1. **Create a release branch** (optional but recommended for coordinated releases):

   ```bash
   git checkout -b release/0.2.0 main
   ```

2. **Update version numbers** in all three package.json files:

   ```bash
   # From the repo root:
   npm version 0.2.0 --workspace=packages/terminology --no-git-tag-version
   npm version 0.2.0 --workspace=packages/fhir-mapping --no-git-tag-version
   npm version 0.2.0 --workspace=packages/vue --no-git-tag-version
   ```

3. **Update peer dependency ranges** if the vue package's peer dependencies on terminology or fhir-mapping need adjusting.

4. **Run the full test suite:**

   ```bash
   npm test
   npm run build
   ```

5. **Commit and push:**

   ```bash
   git add -A
   git commit -m "chore: release v0.2.0"
   git push origin release/0.2.0
   ```

6. **Open a PR** from the release branch to `main`. Let CI pass, get approval, then merge.

7. **Tag the release** on `main`:

   ```bash
   git checkout main
   git pull
   git tag v0.2.0
   git push origin v0.2.0
   ```

8. **Publish to GitHub Package Registry:**

   ```bash
   cd packages/terminology && npm publish
   cd ../fhir-mapping && npm publish
   cd ../vue && npm publish
   ```

   If publishing from CI (recommended), use a GitHub Actions workflow:

   ```yaml
   - name: Publish packages
     env:
       NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
     run: |
       npm publish --workspace=packages/terminology
       npm publish --workspace=packages/fhir-mapping
       npm publish --workspace=packages/vue
   ```

9. **Create a GitHub Release** from the tag, documenting the changes with links to relevant PRs and issues.

### Preparing packages for the GitHub Package Registry

Each package needs a `publishConfig` in its `package.json` to target GitHub Packages:

```json
{
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

---

## Troubleshooting

### `npm install` fails with peer dependency conflicts

Use `npm install --legacy-peer-deps`. The bpmn-js ecosystem has overlapping peer dependency ranges that npm's strict resolver cannot satisfy automatically.

### Tests fail with "Cannot find module" for bpmn-js internals

The `test/index.test.js` files use dynamic imports and avoid importing properties panel modules, which depend on bpmn-js peer dependencies. If you see these errors, make sure you are not importing properties panel modules in unit tests.

### Vite build fails with EPERM on `docs/`

If a previous build left artefacts in `docs/`, Vite may fail to clean it. Delete `docs/` manually and rebuild.

### GitHub Pages deployment shows 404

Ensure GitHub Pages is configured to use **GitHub Actions** as the source (not a branch). Go to **Settings > Pages > Source** and select **GitHub Actions**.
