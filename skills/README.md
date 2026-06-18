# Agent skills — single source, consumed by every tool

This directory is the **single source** for the repository's vendor-neutral
[Agent Skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills): each
`skills/<name>/SKILL.md` carries YAML frontmatter (`name`, `description`) plus Markdown
instructions. Every tool matches on the `description` to decide when a skill applies. All
tool-specific files only point here — never copy a skill's body.

| Skill | When it fires | Gate |
|---|---|---|
| [`bpmn-conformance`](bpmn-conformance/SKILL.md) | editing `**/*.bpmn` or `packages/*/src/moddle/*.json` | `npm run check:conformance` |
| [`moddle-extension-review`](moddle-extension-review/SKILL.md) | changing a moddle type / property / namespace / prefix in `packages/*/src/moddle/*.json` | `npm run check:conformance` |
| [`bpmn-naming-publishing`](bpmn-naming-publishing/SKILL.md) | editing `packages/*/package.json` or releasing | `npm run check:packages` |

## How each tool consumes these skills

- **Claude Code** — auto-discovers via the `.claude/skills` symlink (→ `../skills`); loads a
  skill when the task matches its `description`. No extra config.
- **OpenAI Codex** — auto-discovers via the `.agents/skills` symlink (→ `../skills`): Codex scans
  `.agents/skills` from the working directory up to the repo root and follows symlink targets.
  Implicit invocation (matches `description`) or explicit (`/skills`, or `$<name>` in a prompt).
  The trigger/path mapping is also spelled out in the root [`AGENTS.md`](../AGENTS.md) because
  Codex has no per-glob `applyTo` frontmatter. (Codex custom prompts are personal-only —
  `~/.codex/prompts` — and deprecated; these committed skills are the shared equivalent.)
- **GitHub Copilot** — auto-discovers via the `.agents/skills` (or `.claude/skills`) symlink;
  Copilot scans `.github/skills` / `.claude/skills` / `.agents/skills`, **not** a top-level
  `skills/`. Copilot also reads [`.github/copilot-instructions.md`](../.github/copilot-instructions.md)
  (repo-wide), [`.github/instructions/*.instructions.md`](../.github/instructions/) (path-scoped via
  `applyTo` globs), and the manual `/`-invoked [`.github/prompts/*.prompt.md`](../.github/prompts/)
  wrappers — all of which point back to these SKILL.md files.
- **Cursor / other AGENTS.md readers** — read the root [`AGENTS.md`](../AGENTS.md), whose
  "Agent skills" section lists the same triggers and gate commands.

## Editing rule

Change a skill in `skills/<name>/SKILL.md` only. The pointer files in `.github/`, `AGENTS.md`,
and the `.claude/skills` / `.agents/skills` symlinks reference it; they must never copy its body.
