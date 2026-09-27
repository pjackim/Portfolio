# Audit report template

Save as `docs/audits/<YYYY-MM-DD>-<focus-slug>.md`. Keep it scannable: the summary and table
carry the report, and the detail sections are for whoever fixes each finding.

```markdown
# Audit: <focus or "whole site"> (<YYYY-MM-DD>)

**Scope:** <pages · components · checks covered>
**Branch / commit audited:** `<branch>` @ `<short sha>`
**Evidence:** `.cache/captures/<run>/` (gitignored). Regenerate with
`node .claude/skills/audit-portfolio/scripts/capture.ts --base <url> --pages "<list>" --out <dir>`.
**Previous audit:** <link or "none"> · Regressions since then: <list or "none">

## Summary

<2–4 sentences: overall state against the goals and the style, the biggest risk, the biggest win.>

| Severity | Count |
| -------- | ----- |
| P0       | n     |
| P1       | n     |
| P2       | n     |
| P3       | n     |

## Checks run

| Check                                     | Result                         |
| ----------------------------------------- | ------------------------------ |
| `npm run lint`                            | pass / fail (<summary>)        |
| `tests/a11y.spec.ts` (chromium)           | pass / fail                    |
| <other specs>                             | …                              |
| `npm run test:lhci` (if run)              | …                              |
| Capture flags (`manifest.json`)           | <overflow / 3rd-party / JS KB> |
| Chrome pass (hover, focus, motion, phone) | <notes>                        |

## Findings

| ID  | Sev | Checks | Title | Where | Fix class | Status |
| --- | --- | ------ | ----- | ----- | --------- | ------ |
| F1  | P1  | G2, S4 | …     | …     | J         | open   |

### F1: <title>

- **Evidence:** <screenshot file: what it shows> / <file:line + quoted code>
- **Rule:** <checklist ID + doc link>
- **Fix:** <concrete change>
- **Files:** <paths>

## What's working (keep it)

- <strengths from the lenses: things fixes must not break>

## Rejected on verification

- <title>: <reason> (so the next audit doesn't re-raise it)
```
