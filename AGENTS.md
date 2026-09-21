# Lighting-Blueprint

Home Assistant automation blueprint for mode-based lighting (Day / Evening / Night). This repo is **blueprint-only** — it is not a live Home Assistant config.

## Layout

- `flux_lighting.yaml` — the blueprint
- `test/blueprint.test.js` — Node tests that parse the YAML and assert structure/behaviour
- `package.json` — test runner only (`js-yaml`)

## Run / test

```bash
npm test
```

That is `node test/blueprint.test.js` (see `package.json`). The README does not document tests.

## Conventions

- Tests run on Node. Use `js-yaml` with HA `!input` custom tags; do not introduce another test runtime.
- YAML is a Home Assistant **automation blueprint** (`blueprint:` / `domain: automation`). Keep `!input` tags, selectors, and blueprint `input:` / `variables` / `trigger` / `action` shape.
- This repo ships the blueprint for import. Do not turn it into live HA config, dashboards, or instance-specific entity IDs.

## Worktrees / parallel work

Keep parallel checkouts under `.worktrees/` (gitignored). There is no `.worktreeinclude`: this repo has no useful gitignored local env or config to copy (`node_modules/` is installed per tree with `npm install`).

## Do not

- Invent lint, CI, or deploy that is not in the repo.
- Add `.codex/config.toml` unless asked.
- Treat this tree as a running Home Assistant install.

## Codex PR review

Reviewers (or Katie) can comment `@codex review` on a PR when Codex GitHub/cloud is connected. Automated review is optional: `.github/workflows/codex-review.yml` runs `openai/codex-action` on non-draft PRs when the repo secret `OPENAI_API_KEY` is set. Without that secret the job is skipped, so CI stays green. Ben adds the secret when ready.

## Done when

- `flux_lighting.yaml` still parses as a blueprint.
- `npm test` passes.
