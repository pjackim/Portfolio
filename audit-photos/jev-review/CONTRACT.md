# Jev second-pass photo review: data contract

Purpose: independently re-review the 61 deployed image assets audited in `audit-photos/`
(on their own, and where they sit on the page), using Jev (TypeSafe System One) for the
judgments, then compare with the first pass (`flagged-downloads/`, `COVERAGE.md`).

Why the pipeline looks like this (from https://docs.typesafe.ai docs, read 2026-09-29):

- Jev is text-only, literal, and cannot count or do arithmetic. Code therefore measures
  (pixels, crops, contrast) and vision agents *describe*; Jev *judges* narrow questions.
- Jev degrades on large or irrelevant state: one small state object per call, one narrow
  judgment per question, independent questions batched in one call.
- Composite scoring: several atomic Score questions per asset, combined with weights in code.

## Blindness rule (important)

Observers must be BLIND to the first pass. Never read, list or open: `flagged-downloads/`,
`portfolio-flagged-images.zip`, `COVERAGE.md`, `review-sheets/`, or `docs/audits/`. The
first pass is the thing being graded, so the second pass must not see it.

## Layout (all paths relative to `audit-photos/jev-review/`)

| Path | Producer | Content |
|---|---|---|
| `facts.json` | Task 1 | array of `AssetFacts`, one per asset id 1..61 |
| `inplace/<NN>--<viewport>--<k>.png` | Task 1 | element screenshots of the asset where it sits on the live page |
| `observations/standalone/<NN>.json` | Task 2 | `StandaloneObservation` |
| `observations/inplace/<NN>.json` | Task 3 | `InPlaceObservation` |
| `jev/standalone/<NN>.json`, `jev/inplace/<NN>.json` | Task 4 | raw Jev answers + the exact payload sent |

`<NN>` is the zero-padded asset id from `../assets.json` (01..61). The image file is
`../assets.json[].file` (under `audit-photos/`).

## AssetFacts (code-measured, no judgment)

```ts
type AssetFacts = {
  id: number; file: string; project: string | null;  // project slug if the asset belongs to one
  native: { w: number; h: number; bytes: number };
  pixels: {
    sharpness: number;        // variance of Laplacian on 1024px-max grayscale, raw
    sharpness_bucket: "very-soft" | "soft" | "moderate" | "crisp";  // thresholds documented in facts script
    mean_luma: number;        // 0..255
    luma_p5: number; luma_p95: number; luma_spread: number;  // p95-p5
    near_black_pct: number; near_white_pct: number;          // 0..100
    empty_margin_pct: { top: number; bottom: number; left: number; right: number };
    // % of that edge's depth that is near-uniform (std < 4 on rows/cols), scanned inward from the edge
    exposure_bucket: "very-dark" | "dark" | "balanced" | "bright" | "blown";
    contrast_bucket: "very-low" | "low" | "normal" | "high";
  };
  placements: Array<{
    page: string;            // slug used in inventory.json ("home", "work", "work--mordhau", ...)
    viewport: "desktop" | "wide" | "tablet" | "mobile" | "small-mobile";
    dpr: number;
    render: { w: number; h: number };  // CSS px
    fit: "cover" | "contain" | "fill" | "none" | string;
    role: "cover-card" | "hero" | "carousel-slide" | "figure" | "poster" | "other";
    source_used: { w: number; h: number };            // naturalWidth/Height of currentSrc
    device_px_per_source_px: number;                   // render.w*dpr / source_used.w  (>1 = upscaled)
    visible_area_pct: number;                          // % of source pixels visible after fit (100 for contain)
    crop_loss_pct: number;                             // 100 - visible_area_pct
    resolution_note: string;   // code-written plain English, e.g. "shown 1.25x larger than its pixels (upscaled)"
    crop_note: string;         // e.g. "cover crop hides 73% of the image"
  }>;
};
```

Thresholds and formulas live in the facts script so they are auditable; buckets exist because
Jev cannot compare numbers.

## StandaloneObservation (vision agent, blind, literal)

Written after viewing the asset file on its own at full size.

```ts
type StandaloneObservation = {
  id: number; file: string; project: string | null;
  kind: "game-screenshot" | "app-ui-screenshot" | "code-screenshot" | "diagram" | "logo-or-wordmark" | "3d-render" | "photo" | "video-poster" | "other";
  depicts: string;            // <= 30 words, literal: what is in the picture
  text_readable: string;      // quote 2-4 strings you can actually read at native size, and say which text you cannot read. "no text" if none
  composition: string;        // <= 40 words: framing, where the subject sits, dead/empty space, cut-off subject
  tone_and_contrast: string;  // <= 30 words: exposure, contrast, colour separation between subject and background
  sharpness_and_artifacts: string; // <= 40 words: blur, noise, compression, aliasing, banding, debug/HUD overlays, watermarks, cursors, baked-in margins
  scan_first_read: string;    // <= 30 words: in ~2 seconds at thumbnail size, what does a visitor take away? Say "nothing clear" if so
  observer_confirms_blind: true;
};
```

## InPlaceObservation (vision agent, blind, literal)

Written after viewing the asset's standalone file AND each `inplace/<NN>--*.png` for it.

```ts
type InPlaceObservation = {
  id: number;
  views: Array<{
    file: string;               // e.g. "inplace/02--desktop--1.png"
    viewport: string;           // from the filename
    context: string;            // <= 25 words: what surrounds it (card, carousel, figure caption, play button, badge, text overlay)
    visible_vs_full: string;    // <= 40 words: what part of the full asset is visible here, what is cut off or letterboxed vs the standalone file
    readable_here: string;      // <= 30 words: what text or detail is readable at this on-page size; what is not
    overlays_or_intrusions: string; // <= 25 words: UI drawn over the image (play button, labels, gradients). "none" if none
    at_a_glance: string;        // <= 30 words: what a scanning visitor takes away from this placement
  }>;
  observer_confirms_blind: true;
};
```

Rules for all observations: describe, never grade. No words like good/bad/poor/low quality/needs
fixing. Numbers of pixels or percentages come from `facts.json`, not from your eyes. If you can
only see something at a zoom, say so.

## Jev question set (Task 4; fixed so every asset is judged identically)

Standalone call state: `{ project, kind, facts (pixels + native), observation }`.
Composite Score questions (each 0-4 with concrete level text, mapped to 0-100 in code):
`resolution_headroom`, `text_legibility`, `subject_clarity`, `framing`, `contrast_exposure`,
`artifact_cleanliness`, `scan_first_impact`. Plus Noul: `is_defective_for_showcase`,
`fixable_by_gentle_ai_touchup`, `needs_new_capture_or_recrop`. Plus Choice `primary_issue`.
Then `jev_classify` verdict over: `fine`, `minor-polish`, `gentle-ai-touchup`, `recrop-or-recapture`, `replace`.

In-place call state: `{ project, viewport facts (placement rows), observation.views[] }` with the
same Score dimensions where applicable (`text_legibility`, `framing`, `resolution_headroom`,
`scan_first_impact`, `overlay_intrusion`) and the same verdict classify.
