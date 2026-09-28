# Audit report template

Save as `docs/audits/<report-slug>.md` with its screenshots in `docs/audits/<report-slug>/`
(`<report-slug>` = `<YYYY-MM-DD>-<focus-slug>`). Keep it scannable: the summary and the table
carry the report. Each finding section is a work order that `/audit-portfolio fix` executes
exactly as written, so the solution must be specific.

Statuses: `open` (audit mode) → `fixed (<sha>)` / `needs owner` / `blocked: <reason>` (fix
mode).

```markdown
# Audit: <focus or "whole site"> (<YYYY-MM-DD>)

**Scope:** <pages · components · checks covered>
**Branch / commit audited:** `<branch>` @ `<short sha>`
**Previous audit:** <link or "none"> · Regressions since then: <list or "none">
**Apply:** `/audit-portfolio fix docs/audits/<report-slug>.md`

## Summary

<2–4 sentences: overall state against the goals and the style, the biggest risk, the biggest
win.>

| Severity | Count |     | Route  | Count |
| -------- | ----- | --- | ------ | ----- |
| P0       | n     |     | fix    | n     |
| P1       | n     |     | design | n     |
| P2       | n     |     | owner  | n     |
| P3       | n     |     |        |       |

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

| ID  | Sev | Checks | Title | Where | Route | Status |
| --- | --- | ------ | ----- | ----- | ----- | ------ |
| F1  | P1  | G2, S4 | …     | …     | fix   | open   |

### F1: <title>

![F1: <what the shot shows>](<report-slug>/F1.webp)

_<Caption: page, width, scheme, state, and what to look at in the image.>_

- **Evidence:** <what the screenshot shows> · <file:line + quoted code, if the cause is in code>
- **Rule:** <checklist ID + doc link>
- **Route:** fix / design / owner (<why>)
- **Proposed solution:** <the exact change: files, selectors/properties/tokens/markup/copy.
  For owner findings: exactly what Parker must supply or decide, plus a proposed default.>
- **Verify:** <how to confirm it's fixed: what to look at, which spec to run>
- **Files:** <paths>

<!-- Added by fix mode: -->

![F1 after](<report-slug>/F1-after.webp)

- **Result:** fixed in `<sha>` · <deviation from the proposed solution and why, if any>

## Needed from Parker

- F<n>: <the exact fact, file, or decision needed>

## What's working (keep it)

- <strengths from the lenses: things fixes must not break>

## Rejected on verification

- <title>: <reason> (so the next audit doesn't re-raise it)

## Found during fix

- <new issues noticed in fix mode but out of its scope, for the next audit>
```
