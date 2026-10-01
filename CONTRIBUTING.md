# Contributing

Current application issues and feature PRs belong in [romania-reforms](https://github.com/CristianNichifor/romania-reforms), under `simulators/salarizare`. Keep this repository's retained source historical.

For redirect/documentation fixes, use Node 22+, run `node --test tests/redirect.test.cjs`, and open a PR to `dev`. Include the original URL and expected destination, including a synthetic query/hash example. Deployment is a separate maintainer action from `main`.

## Contribution workflow

- Work from the remote default branch in a separate checkout. With the maintainer's `wt` tool, run `git fetch origin` then `wt new chore/<task> origin/dev`; it creates `<repo>/.worktrees/chore/<task>`. Contributors without `wt` can use a separate clone and feature branch. Never modify another task's working tree.
- Use Conventional Commits: imperative lower-case subject, at most 72 characters, no trailing full stop, one change per commit. Explain why in the body only when needed; link issues with `Refs: #N` or `Closes: #N`.
- Open a PR against `dev` with the problem, resulting behavior, verification command/results and any limitations. Agents never merge PRs, push directly to protected branches, deploy, or publish releases.
- A required check or administrator-only branch rule is not an agent permission boundary: administrator credentials can bypass rules. Keep publication credentials out of ordinary development.
- Tasks need an observable acceptance criterion, affected area, constraints and a verification command. Use synthetic fixtures; do not include credentials or personal data in issues, logs or tests.

## Retained historical CI

An explicitly authorized historical-maintenance task can run `npm ci`,
`npm run typecheck` and `npm test` with Node 22+. `npm test` runs every engine
Vitest suite under `engine/`, then the Node-native redirect tests. The separate
`test:engine` and `test:redirect` scripts keep the runners explicit: Vitest cannot
register tests declared with `node:test`. Neither suite is disabled or allowed to
fail. Redirect-only maintenance still needs only the dependency-free command above.

Historical engine tests retain their salary, rounding, date, cap, distribution and
scenario assertions against synthetic fixtures and committed regime/fiscal data.
The separate data CI validates schemas, runs importer fixtures, and regenerates the
July coefficient regime to check reproducibility. Its workbook is committed under
`sources/Proiect-COEFICIENTI-1-8-MMFTSS-16.07.2026-1000.xlsx`; no production collection
or external salary source is required for these CI checks. This does not make the
historical application a maintained product or change the `redirect/` deployment.
