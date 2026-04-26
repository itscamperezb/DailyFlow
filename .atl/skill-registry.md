# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `~/.claude/skills/_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| When creating a pull request, opening a PR, or preparing changes for review | branch-pr | /home/camilo/.claude/skills/branch-pr/SKILL.md |
| When writing Go tests, using teatest, or adding test coverage | go-testing | /home/camilo/.claude/skills/go-testing/SKILL.md |
| When creating a GitHub issue, reporting a bug, or requesting a feature | issue-creation | /home/camilo/.claude/skills/issue-creation/SKILL.md |
| When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen" | judgment-day | /home/camilo/.claude/skills/judgment-day/SKILL.md |
| When user asks to create a new skill, add agent instructions, or document patterns for AI | skill-creator | /home/camilo/.claude/skills/skill-creator/SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### branch-pr
- Every PR MUST link an approved issue — no exceptions (`Closes #N`, `Fixes #N`, or `Resolves #N`)
- Every PR MUST have exactly one `type:*` label matching the commit type
- Branch naming: `type/description` — regex `^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)\/[a-z0-9._-]+$`
- Commit messages: `type(scope): description` — conventional commits, no `Co-Authored-By` trailers
- PR body MUST contain: linked issue, PR type checkbox, summary, changes table, test plan, contributor checklist
- Automated checks must pass before merge: issue reference, status:approved, type label, shellcheck
- `feat!` / `fix!` → `type:breaking-change` label

### go-testing
- Use table-driven tests for all test cases: `tests := []struct{ name, input, expected string; wantErr bool }{...}`
- Bubbletea: test Model state transitions directly via `m.Update(tea.KeyMsg{...})`, cast result to Model
- Use `teatest.NewTestModel` for TUI integration tests that need to simulate key sequences
- Golden file tests: `tm.WaitFor(teatest.WaitForRenderTimeout(...))` then compare `tm.FinalOutput()`
- Run tests with `go test ./...` and `-race` flag for concurrent code
- Use `t.Helper()` in assertion helpers to report failures at call site, not inside helper

### issue-creation
- Always search for duplicate issues before creating a new one
- MUST use a template (bug report or feature request) — blank issues are disabled
- Every new issue automatically gets `status:needs-review`; a maintainer MUST add `status:approved` before any PR
- Questions go to Discussions, NOT issues
- Bug report requires: description, steps to reproduce, expected vs actual behavior, OS, agent/client, shell
- Feature request requires: problem description, proposed solution, affected area

### judgment-day
- Launch TWO judge sub-agents in parallel (async) — never sequential, never the orchestrator itself reviewing
- Judges are blind — neither knows about the other, no cross-contamination
- Orchestrator synthesizes: Confirmed (both found) → fix immediately; Suspect A/B → triage; Contradiction → manual decision
- Every WARNING must be classified: "real" (can a normal user trigger it?) vs "theoretical" (contrived/edge case)
- Theoretical warnings → reported as INFO, NOT fixed, do NOT trigger re-judgment
- Fix Agent runs only after confirmed CRITICALs or real WARNINGs; then re-judge both in parallel
- Convergence: 2 iterations max, then escalate to user if still failing
- ALWAYS resolve skill registry before launching judges and inject matching compact rules into judge prompts

### skill-creator
- Skill structure: `skills/{name}/SKILL.md` + optional `assets/` and `references/`
- Frontmatter required: `name`, `description` (includes "Trigger:" keywords), `license: Apache-2.0`, `metadata.author`, `metadata.version`
- Start SKILL.md with most critical patterns — avoid lengthy explanations
- `references/` must point to LOCAL files, not web URLs
- After creating, register in `AGENTS.md` with name, description, and path
- Do NOT create a skill for trivial/one-off patterns or when docs already exist

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| — | — | No project-level convention files found (new project) |
