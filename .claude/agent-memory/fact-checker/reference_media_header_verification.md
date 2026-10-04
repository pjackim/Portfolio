---
name: media-header-verification
description: How to verify "# media:" header recipes (frame counts, crops, CRF, GIF palette, WebP/PNG dims) with only the read-only Bash hook, plus the verified facts for bodycam-external, lichess-app and hero-trivia as of branch media/quality-first (2026-10-04)
metadata:
  type: reference
---

## Read-only byte tricks (hook allows head/tail/grep/cat/rg/sed -n/wc; blocks echo, od, ffprobe, `;`)

- Offsets: `grep -a -o -b -e mdhd -e stts -e stsz file.mp4`. Then `head -c <off+N> file | tail -c N | cat -A` (cat -A prints bytes as `^@`, `M-x`; 0x0A shows as `$`; a trailing 0x20 is stripped by the tool, e.g. `N` = 0x4E20). One tool call per dump (no `echo` separators).
- mp4 frame count: `stts` at off -> `head -c off+20 | tail -c 20` = type, flags, entry_count, sample_count(4), delta(4). `stsz` at off -> `head -c off+16 | tail -c 16`, last 4 bytes = sample_count. Timescale/duration: `mdhd` at off -> `head -c off+24 | tail -c 28` (timescale = bytes 12-15 after 'mdhd', duration 16-19). Pipeline loops: timescale 15360, delta 512 = 30 fps; hero-trivia GIF loops: 10240/1024 = 10 fps.
- Source video dims: `tkhd` width/height are the last 8 bytes of the box (16.16): `head -c tkhd+88 | tail -c 8`. Output dims: `avc1` at 461 -> `head -c 493 | tail -c 4` (07 80 04 38 = 1920x1080).
- x264 CRF actually used: `grep -a -o -e 'crf=[0-9.]*' file.mp4` (SEI string survives `-map_metadata -1`).
- Lossless WebP (VP8L) dims: `head -c 25 f.webp | cat -A`; bytes 21-24 = width-1 (14 bits LE) | height-1 (14 bits). `95 C8 CD 00` = 2198x824. `RIFF....WEBPVP8L` confirms lossless.
- PNG dims: `head -c 24 f.png | tail -c 8`. GIF: `head -c 14`: bytes 6-9 W/H LE, byte 10 `M-w` (0xF7) = global colour table 256 colours.
- Read tool reports "original WxH" only when it downscales; no note = shown at native size (<=2000 px).
- `git show <rev>:<file> | head -c N | tail -c M | cat -A` works for blobs on another branch.

## Verified facts (2026-10-04, branch media/quality-first, commits bac464e/52a70c9/4b16e65 media regen 2026-10-03 19:57-19:58 -0400, 32b35bf headers 20:00)

- bodycam source: ~/Videos/portfolio-to-add/bodycam/world-editor.mp4 = 2560x1440, 30 fps, 3990 frames = 133.0 s. teleport-map.mp4 = 30.0 s (900 frames). zombie-spawn-single.mp4 = 20.0 s (600 frames). BodyCam/.media JPGs: overview 2206x1080, lobby 2206x1080, overview-bottom 2206x1081, zombie-spawn 1920x1080 (inferred). `.media/` is untracked in BodyCam (git log -- .media is empty).
- Crop `2198:824:8:0` = exactly the width after an 8 px left trim; removes 256 px at bottom of 1080-high JPGs but 257 of overview-bottom. Header line 13 still says "bottom 256 px ... (the desktop behind the panel)".
- Loop outputs: outline 360 f = 12 s (6-18); lights 435 f = 14.5 s (63.5-78; 63-78 would be 450); teleport 420 f (0-14); zombie 420 f (6-20, ends at source end). main's old lights mp4 already had 435 frames, so the old "1:03-1:18" text never matched. Start offset 63.5 itself cannot be proven (no decoder); lights poster (frame 0) shows Emergency red armed, "1 placed", PID 51708 (same session as cover).
- cover.webp = VP8L 2304x1440. Panels = VP8L 2198x824.
- lichess PNGs: desktop 1913x1078, ease-of-use 490x451, puzzle-tracking 481x438, scroll 512x451; the four webps are VP8L with identical dims. PNG mtimes 2026-09-27 14:11. lib.ts:250 `assertSamePixels` guards lossless encodes.
- hero-trivia: GIFs at a085340 Images/hero_trivia/hero_trivia_gameplay.gif (65,931,588 B) and hero_trivia_variety.gif (64,728,753 B), both 1168x920, 256-colour GCT. Outputs: gameplay 331 f @10 fps = 33.1 s (the longer), puzzle-variety 262 f = 26.2 s; both x264 crf=24.0; legacy-manifest.json has "crf": 24 on both; BUDGETS.loop = 24*MB, MB = 1,000,000 (lib.ts:35-37). The "24.99 MB at CRF 20" figure is in no file in the repo (only the caller's run log). Gameplay mp4 at CRF 24 = 14,099,989 B.
- src/data/site.ts:5 still cites `git show 1460ff3^:index.html`; d8782d1 and 1460ff3 are NOT objects in this clone (`cat-file -t` = fatal). a085340 = commit "ci: deploy legacy site via GitHub Actions (Pages passthrough)" 2026-09-25. d8782d1 no longer cited anywhere in repo (grep excl. node_modules/.git/.cache/audit-photos).
