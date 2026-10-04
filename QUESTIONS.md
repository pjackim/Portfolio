# Questions for Parker

Open items from the ArcExploit and TongueTickle review (2026-10-03). None block the PR; each
entry says what was done in the meantime.

## ArcExploit

1. **Game-side explanation.** The old entry said ArcRaiders' inventory "doesn't roll back" a
   drag/drop made during a brief disconnect. No source (repo, README, author quote) backs that, so
   it was removed; the entry now says only what the code shows (timed outbound packet drops around
   inventory actions). If you want the mechanism described, give me your own words and I will add
   them with a `per the author` citation.
2. **Publishing a duplication tool.** The entry is now `draft: false` as asked. It is a tool that
   duplicates items in a live game, which breaks the game's terms of service and may matter to
   employers or the studio. It is now featured (slot 4 on the home page). Is
   that visibility what you want, or should it be un-featured, or stay off `/work/` too?
3. **The in-game clip.** The recording you supplied (`arc-exploit-proof.mp4`) is used as the cover
   and a silent loop. The caption describes only the overlay (routine-start toast, Disconnected /
   Reconnected, Net Drop / Online). I cannot tell from the video whether a dupe actually
   succeeded, so no outcome is claimed. Is there a longer clip or a before/after inventory shot
   that shows it?
4. **Stale README.** The ArcExploit README still lists Keydoor and Throwable dupes and ViGEmBus
   gamepad emulation. Both were removed (commits `fe0346f`, `0931fe7`), and `vgamepad` is an
   unused dependency. The portfolio follows the code. Do you want the README fixed too?
5. **Repo link.** `links.private: [repo]` is kept. The repo's remote is `mort-sh/ArcDupers`
   while the README links `killinmesmalls/ArcExploit`. Which, if either, should be public?

## TongueTickle

6. **Home page.** Now featured (slot 5 on the home page). Set `featured: false` if you want it on
   `/work/` only.
7. **"TongueTickler" wordmark.** The web UI's wordmark reads "TongueTickler" while everything
   else says TongueTickle. The entry notes this. Should the app be fixed instead?
8. **Live provider pass.** The Qwen3-TTS, Grok and OpenAI paths are covered only by mocks. A
   short live run (and a real-voice clip with sound) would let the entry drop its "not done" note.
