# Project Rules

## Git workflow
- Base branch: `main`
- Branch naming: `feature/<desc>` (use `fix/`, `hotfix/`, `chore/` if it fits better)
- PR target: `main`

## Commits
- Conventional commits: `<type>: <short description>` (english)
- One logical change per commit
- Keep commits small; include schema/test updates in the same commit when possible

## Pull Requests
- Template:
  - What was done
  - Why
  - How to test (exact commands if any)
  - Risks / roll-back plan (if relevant)

## Code expectations
- Prefer clarity over brevity; add short comments only when intent is non-obvious
- Keep APIs backward compatible unless the change is explicitly breaking
- Add/adjust tests when fixing bugs or changing behavior
- For DB changes: include Alembic migration and note backward/forward compatibility

## Testing
- Run the smallest meaningful test set; state what was run
- If tests are skipped, say why and what to run instead
