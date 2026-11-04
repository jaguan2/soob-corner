# Stability and patch test

Run on October 14, 2026, on the `dev` branch.

## November 3: live study-time accounting

The profile counter originally read completed focus minutes only. Running a
25-minute timer briefly, pausing, or resetting left it at zero; sub-minute
completed tests could also round to zero. **Total time studied** now uses actual
elapsed focus milliseconds, shows seconds, and saves unfinished work separately
from completion XP. Existing completed history is migrated once.

Mounted timer/profile tests cover partial sessions, pause/reset/relaunch,
short completions, Pomodoro breaks and automatic phase changes, skip-break,
switching running modes/presets, nudges, throttled deadline catch-up, page hide,
unmount, and failed-save recovery. Session tests cover concurrent time updates
and replay without duplication. Time checkpoints never award completion XP.

## Bugs reproduced and patched

| Area | Reproduced failure | Patch |
| --- | --- | --- |
| Saved timer settings | `sws.pomodoro` containing valid JSON `null` crashed `TimerPanel` during rendering. | Validate the parsed value before reading fields; malformed settings fall back to defaults. |
| Study streaks | A three-day streak spanning the March 2026 daylight-saving change counted only two days. | Walk calendar-day ordinals rather than subtracting 24 hours from local midnight. The calendar validator is shared with progression. |
| Focus history | Impossible dates and JSON numeric overflow (`1e999`) were accepted; today's total could remain `Infinity` even after another session. | Ignore invalid dates and non-finite totals before displaying or extending history. Pruning uses local calendar days. |
| YouTube API recovery | A timed-out script remained in the document and was reused by the next attempt. Existing failed tags also remained, callbacks accumulated, and synchronous injection errors left a rejected promise cached. | Remove failed/stalled scripts, detach listeners, restore the previous ready callback, and clear the failed promise cache. Concurrent players still share one request. |

The regression tests failed on the original implementation in seven assertions,
then passed after the patches. Additional coverage checks late error events,
pre-existing APIs/callbacks, premature ready callbacks, leap days, year boundaries,
and malformed timer settings. XP awards and the level curve are unchanged.

## Verification

| Check | Result |
| --- | --- |
| Original automated suite | 129 tests passed before patches. |
| Final `npm test` | 146 tests passed across 12 files (17 added tests). |
| `npm run lint` | Passed. |
| `npm run build` | Type-check and production build passed. |
| `git diff --check` | Passed. |
| Python desktop startup | Headless self-test passed; pywebview imported and the static server started on port 39218. |
| Windows executable | Rebuilt; all 61 bundled frontend assets match `dist/`, pywebview is present in the archive, and the frozen headless self-test exited successfully. |

The test runner prints deprecation warnings about the React plugin's esbuild
options; tests complete successfully. This patch does not upgrade dependencies.

## Scope and remaining manual checks

Timer settings are tested through a React server render. API recovery uses a
mocked document and fake timers; it does not contact YouTube. Existing tests
continue to cover task ordering/Undo, progression eligibility and persistence
helpers, catalog filtering, music links, and theme contrast calculations.

Live video/captions/audio playback and interactive desktop checks were not run:
the native computer-use connection is unavailable in this session. New
screenshots also remain pending; see [the capture plan](screenshots.md).

For a later interactive smoke test:

1. Select a video, switch tools, and confirm the timer and audio survive tab changes.
2. Add, edit, reorder, complete, reopen, delete, and Undo tasks. Confirm each task
   earns its bonus only once, including after relaunch.
3. Complete a short focus block and a Pomodoro round; confirm completed focus
   updates study time/XP, while breaks, pauses, and resets do not add credit.
4. Change the profile and appearance, relaunch the desktop app, and confirm
   local settings and totals remain saved.
5. Start offline, restore the network, and retry a video. Check actual playback,
   captions, and music controls once the API loads.

Suggested commit message: `fix: harden saved study state and YouTube API recovery`

## Follow-up fixes — October 16, 2026

An independent Codex review identified two additional issues, now patched:

- **Progression overwrites between tabs.** A stale profile save could replace
  newer task XP and lifetime claims. `progressionSession.ts` now queues actions,
  re-reads persisted state, and serializes read/modify/write with a shared browser
  Web Lock where available. Storage events refresh other tabs without writing
  back. Pending failed saves replay on the newest state; focus high-water marks
  prevent retry/backfill double-credit. Failed reads prevent writes that could
  overwrite unseen progress. The profile form awaits the save result.
- **Player recovery after an API failure.** Selecting another video in the dock
  now retries failed initialization, as does a browser `online` event. Normal
  video changes retain the existing player, and unmounting cancels pending work.

Added 17 regression tests: eight session-store tests, four mounted profile-hook
tests, and five mounted player tests. They cover stale and overlapping saves,
task/check-in deduplication, failed reads/writes, cross-tab storage notifications,
focus accounting, retry selection, restored connectivity, and cleanup. React's
test renderer and its types are development dependencies, pinned to 18.3.1.

Verification: **163 tests passed across 15 files**, lint and the production build
passed, and the patch passed `git diff --check`. The Windows executable was
rebuilt; all 61 bundled frontend assets match `dist/`. Both the Python launcher
and frozen executable passed their headless self-tests. The sandboxed executable
check timed out; the same check passed outside the sandbox. The independent
reviewer inspected the fixes and found no further concrete regression.

The dependency audit separately reported 16 advisories (six moderate, ten high).
No automatic dependency upgrades were applied in this patch. Actual browser
Web Locks, live YouTube playback/recovery, and desktop interaction remain
unverified; automated tests use a shared lock queue and a mocked player.

Suggested commit message: `fix: preserve cross-tab progression and retry failed video loading`

## Video queue — November 3, 2026

Added a shared, locally saved Up next queue to the welcome catalog and Videos &
sound. Queue entries override filters for Next and automatic video endings.
Previous stays in filtered order. Queue operations never recreate the player.

Verification: **214 tests passed across 20 files**, lint and production build
passed. Twelve new catalog-hook cases cover queue persistence and cleanup,
invalid saved data, deduplication, ordering/removal/clearing, starting a chosen
entry, filter independence, current-video replay, and unavailable embeds.

Production browser checks used an isolated profile and a mocked YouTube player
to exercise queue actions, reload persistence, Next/end advancement with zero
matching results, exhaustion, repeat, and an embed error. The player was created
once throughout the workspace checks. No page errors or horizontal overflow at
1440, 1000, 768, 375, and 320 pixels. These checks simulate player events; they
do not verify live YouTube transitions. The [queue screenshot](images/video-queue.jpg)
shows the running catalog with real thumbnails and example queue selections.
The Windows executable was rebuilt, all 61 bundled frontend assets match `dist/`,
and its headless startup self-test passed. `git diff --check` also passed.

Suggested commit message: `feat: add a persistent video playback queue`

## Settings and optional milestones — November 3, 2026

Added the sixth dock tab, Settings, and a matching welcome-screen disclosure.
They share appearance controls and the saved Show milestones switch. Removed
the toolbar Appearance disclosure and duplicate palette shortcuts; display
preferences use `sws.preferences`, leaving progression and appearance keys intact.

Verification: **220 tests passed across 21 files**, lint and production build
passed. Six new preference cases cover persisted visibility, hiding/restoring
earned cards without changing progression, malformed saved preferences, and
storage failures. The mounted-tools suite now includes Settings and still
checks that tab changes preserve drafts and mounted panels.

Browser checks exercised all palettes, custom hex entry and cleanup, opacity
and milestone persistence, profile visibility, and Space on the switch without
pausing playback. Timer state and the same mocked YouTube player survived tab
changes. There were no page errors or document/tab-label overflow at 1440, 1000,
768, 375, and 320 pixels; welcome settings also fit 320 pixels. A 320-pixel
Settings label clipping issue was patched by tightening tab gutters. These
checks use simulated video playback. The [Settings screenshot](images/settings-tab.jpg)
shows the actual running interface with an isolated demo profile.
The rebuilt Windows executable contains all 61 frontend assets matching `dist/`
and passed its headless startup self-test. `git diff --check` passed.

Suggested commit message: `feat: add settings tab with appearance and milestone preferences`

## Watch history and member stats — November 3, 2026

Added a History dock tab and start-screen shortcut, with recent-video snapshots,
search/member filters, replay/queue actions, and pagination. Profile derives
distinct-video, total-play, and member counts from the same saved entries.
Playback must actually start to count; pause/resume and failed loads add none.
Shared videos count once overall and once per featured member. Tracking starts
with this feature; legacy viewing totals are unavailable.

Verification: **236 tests passed across 23 files**, lint and production build
passed. Sixteen new model/session/player tests cover rewatches, member attribution,
malformed history, retained metadata, clocks, overlapping tabs, failed saves,
unreadable-state protection, lock recovery, stale player events, and deliberate
same-video replay. The mounted-tools suite includes the new History tab.

Production-browser checks with an isolated profile and a simulated YouTube
player exercised confirmed starts, pause/resume, queue Next/end advancement,
history search/member filters, replay, unique/member stats, relaunch persistence,
welcome-screen access, and failed embeds. Workspace transitions reused one
player, and the timer stayed running across tab changes. No page errors,
document overflow, or clipped tab labels at 1440, 1000, 768, 375, and 320 pixels.
Tabs wrap on narrow docks. Captures of [History](images/watch-history.jpg) and
[member stats](images/watch-stats.jpg) show three real catalog selections and
two rewatches. These tests do not verify live YouTube streaming.
A separate 25-entry fixture passed pagination, filtering after expansion, and
disabled actions for catalog entries that are no longer available. The rebuilt
Windows executable contains all 61 frontend assets matching `dist/` and passed
its headless startup self-test. `git diff --check` passed.

Suggested commit message: `feat: add watch history and per-member viewing stats`

## Visible timer presets and wheel adjustment — November 3, 2026

Moved quick durations outside Session settings, keeping them available during
Pomodoro. Added countdown-only wheel gestures in one-minute steps, using a
non-passive native listener so adjustments prevent dock scrolling. Small trackpad
movements accumulate; modifier, horizontal, outside, and editing gestures pass
through. Fractional overshoot is discarded after a step to keep scaled mouse
wheel input predictable, and changing presets clears partial movement.

Verification: **247 tests passed across 24 files**, lint and production build
passed. Eleven new wheel/integration cases cover delta modes, trackpad movement,
scaled input, gesture resets and cleanup, multiple adjustments before rendering,
idle/running limits, paused Pomodoro, phase completion, and actual-time accounting.

Production-browser checks used actual mouse-wheel events and synthetic trackpad
events with a simulated video player. Presets were visible outside the closed
settings disclosure; adjustments kept running/Pomodoro sessions active and
prevented dock scrolling. Editing, outside scrolling, and modifier gestures did
not change time. Minimum/maximum duration, preset selection during Pomodoro,
and actual study-time accounting passed. There were no page errors or clipped
preset labels/document overflow at 1440, 1000, 768, 375, and 320 pixels. See the
[timer screenshot](images/timer-controls.jpg).
The Windows executable was rebuilt; all 61 bundled frontend assets match `dist/`,
its headless startup self-test passed, and `git diff --check` passed.

Suggested commit message: `feat: expose timer presets and add wheel adjustment`

## Keyboard access and Escape navigation — November 3, 2026

Added Esc return to the catalog with focus restoration, one-stop tool tabs with
Left/Right/Home/End, spatial video-card navigation, button-group arrows, timer
Up/Down, skip links, and shortcut preferences/help. Native input keys retain
their behavior. Local editors/disclosures/captions dismiss before screen return;
task/timer editors, captions, and the timer footer restore a useful focus target.
The decorative background iframe is inert. Corrected labelled-region roles and
visible-name mismatches in Change video, CC, and the timer footer.

Verification: **255 tests passed across 25 files**, lint and production build
passed. Eight new tests cover tab/card movement, responsive rows, inherited DOM
rectangle properties, collection edges, roving tab selection, and preference
migration. Production-browser checks passed catalog/queue focus, toolbar and
tab arrows, timer keys, editor/caption dismissal, Esc from Zen, timer retention,
missing-card fallback, native ranges, shortcut persistence, visible focus, and
45 Tab transitions excluding hidden panels and the background iframe. Mobile
card navigation and document width passed at 375 and 320 pixels.

Temporary axe-core 4.14.0 scans reported zero violations for the selected WCAG
A/AA rules in the Dark catalog, Timer, and Settings views and Light Settings.
Contrast checks remained incomplete. These checks use a simulated player and
do not certify full WCAG conformance; see [scope and references](accessibility.md).
The Windows executable was rebuilt, its 61 frontend assets match `dist/`, and
its headless startup self-test passed. Documentation and keyboard screenshots
were refreshed; `git diff --check` passed.

Suggested commit message: `feat: improve keyboard navigation and accessibility controls`

## Main/dev merge resolution — November 3, 2026

Combined `dev` at `6813be2` with `origin/main` at `700df25`. Conflicts were in
root AGENTS/CLAUDE/README, `src/App.tsx`, and the generated Windows executable.
Root files remain concise entry points into `docs/`; main's discovery and shared
toolkit requirements are retained in the canonical guide, with current paths.
The main catalog loader, cache validation, curation helpers, tests, and agent
adapters remain present. The shared toolkit was not installed in this environment;
verification used the project-local engineering/review/verification guidance.

App now composes `usePlaylist` with the existing catalog, queue, history, timer,
audio, and accessibility hooks. Pending links resolve against downloaded data;
explicit user selection/return takes precedence. Catalog removal preserves the
active video and its metadata, including a delayed first-play history record,
while unavailable queued entries leave the queue. No generated catalog data was
changed as part of this merge.

Verification: **267 tests passed across 27 files**, lint and production build
passed. Four new hook regressions cover pending links, user selection/cancellation,
invalid links, active metadata retention, and queue pruning. Main's remote catalog
and curation suites are included in the Vitest run; the curation tests also passed
as a focused Vitest run. A direct Node test-runner attempt was unsuitable for the
Vitest-based curation suite and was replaced by the documented npm test command.

Production preview used strict port **4196** and isolated browser contexts.
Routed catalog responses and a simulated player verified new-only deep links,
offline cached restart, retained playback/metadata/filter/favorite/timer state,
queue pruning, watch-history attribution for a removed current entry, manual
selection precedence, and one healthy player across video changes. The catalog
smoke recipe restored **254 of 254 videos** after an empty search; screenshots
and discovery evidence are under ignored `build/skill-verification/`.

Required discovery checked the latest **15 entries from each of four public
channel feeds** on November 3. Unreviewed candidates include TXT official vlog
`llxqGauQkQU` and archive uploads `2uBq5VFl0V4`, `rgG0eMG6Ax0`, and `LIey7QYEMCs`.
Durations and eligibility were not verified, and feed coverage is limited; the
full results are in `build/skill-verification/merge-discovery.json`. No candidates
were published or added to the generated catalog.

Suggested commit message: `Merge main into dev and resolve catalog integration conflicts`

The executable was rebuilt from the combined source; all 61 embedded frontend
assets match `dist/`. Source startup reported `webview import OK`; the windowed
binary exited successfully from its headless startup path (no console diagnostic
is available from that build). Both checks used unused ports and disposable
application-data directories. Results are in
`build/skill-verification/merge-desktop-results.json`. These checks do not prove
native window interaction or live YouTube playback.

## Dedicated welcome History tab — November 3, 2026

Replaced the start screen's history disclosure with separate Videos and Watch
history browsing tabs. History uses the full content width and normal page
scrolling. Search/member filters stay mounted across tab changes; Settings has
its own dismissal state. Escape closes nested settings first, then returns to
Videos. The video-return focus fallback explicitly targets the visible Videos
heading instead of the hidden History heading.

All **270 tests in 28 files**, build and lint passed. Two new mounted-component
regressions cover independent panels/filter retention and keyboard tab activation.
An isolated browser on strict port 4196 checked empty/populated history,
20-to-25-entry pagination, search/member retention, catalog filter independence,
queue/replay actions, Escape nesting, arrow navigation, return focus and timer
continuity. Layout checks passed at 1440, 768, 375 and 320px without a history
height cap or horizontal overflow. Selected axe checks found no WCAG A/AA
violations in dark desktop/mobile and light mobile; contrast remained incomplete.
The screenshot in `docs/images/watch-history-page.jpg` uses isolated demo data.

The rebuilt executable contains all 61 frontend assets matching `dist`. Source
startup reported `SELFTEST OK (webview import OK)` and the windowed executable's
headless startup exited 0 using a disposable profile and unused port. These
checks do not establish real media playback or native window interaction.

The required November 3 discovery scan checked 15 recent entries from each of
four trusted public channel feeds. Archive candidates `2uBq5VFl0V4` and
`rgG0eMG6Ax0` remain unverified for duration, members, duplicates and original
broadcast dates. No catalog additions were made; coverage is limited to those
feeds. Evidence is under ignored `build/skill-verification/history-tab-*`.

Suggested commit message: `feat: give watch history a dedicated browsing tab`

## English-preferred titles — November 3, 2026

Catalog refresh now requests English watch-page metadata and keeps original
titles when unavailable. Optional `originalTitle` retains different originals
for search/tooltips. A titles-only refresh checked all 254 existing videos:
five labels changed (two translated titles and three English-locale date formats),
with zero failed video lookups. IDs, order and every non-title video field were
compared against the previous snapshot and remained identical. The YouTube
parser emitted recoverable warnings for unrelated watch-page structures; the
displayed titles were still available and verified.

All **278 tests in 30 files**, build, lint and script syntax checks passed.
New regressions cover localized/original fallback, failed localized requests,
search in both languages, downloaded original-title validation, read-only history
label updates and session-blocked history metadata. Browser checks with a real
localized catalog entry verified cards, original tooltips, queue/workspace/history
labels, both-language search, unchanged counts before replay, one additional play
after confirmed replay, original-title fallback and narrow-screen layout.

The Windows app was rebuilt and its 61 bundled assets match `dist`. Source startup
reported `SELFTEST OK (webview import OK)` and the frozen headless startup exited 0
using disposable application data. Browser playback was simulated; neither those
checks nor successful metadata retrieval prove live streaming or native-window
behavior. Evidence is under ignored `build/skill-verification/english-title*`.

Required discovery checked public recent-upload feeds: Moa's Diary returned 15
entries, while TXT official, V Live and TomorrowByEdits returned HTTP 404. Coverage
is limited; archive candidates such as `N5Ghn9ODnR4` remain unverified for duration,
members, duplicates and original broadcast dates. No videos were added or removed.

Suggested commit message: `feat: prefer YouTube English titles with original fallback`

## Interface languages — November 3, 2026

Added Settings' immediate, saved interface language choice for English,
Simplified Chinese, Korean and Spanish. The typed dictionaries contain 404
messages each. Provider persistence uses the existing storage gateway;
unsupported values fall back to English and blocked storage permits a temporary
selection. Document language, history dates and discovery month names follow
the selection. Video titles, caption preferences and user-owned text remain
independent. See [language scope and maintenance](languages.md).

Local structural self-review checked explicit lookup boundaries, complete
dictionary keys/placeholders, stable component/player lifecycles and progression
effect dependencies. The separately installed shared toolkit remains unavailable;
the repository's local engineering/review/verify instructions were used.
Review caught an untranslated month refinement and narrow Spanish preset text;
both were fixed. Accessibility checks also caught the Chinese Start accessible
name and Social member-link name overrides. Start now includes its visible label;
member links derive their names from visible name/handle content, retaining a
translated explanatory tooltip.

**282 tests across 32 files**, build and lint passed. Four new regressions cover
dictionary completeness, interpolation, saved/invalid/blocked language choices,
document language and mounted draft retention. Production preview on strict port
4196 used isolated profiles and a simulated player. All four language choices
survived reload; changing them preserved task/profile drafts, current video,
captions, queue, favorites and history, while the running timer continued and
the background player was created once. Keyboard Home/Escape navigation passed.
Sixty layout combinations (four languages, five panels, 1440/375/320px widths)
had no horizontal overflow or clipped button labels. The Spanish expanded timer
also fit at 375px. Localized January appeared as `enero`; the catalog smoke check
restored all 254 videos after an empty search.

Thirty selected axe checks across welcome Settings and mobile tool views found
no WCAG A/AA violations. Contrast remained incomplete; this is not a full
accessibility certification. Screenshots use isolated demo profiles in
`docs/images/language-settings.jpg` and `language-timer-spanish.jpg`.

The rebuilt executable's 61 frontend assets match the final `dist/`. Source
startup reported `SELFTEST OK (webview import OK)` and the windowed executable
exited 0 from headless startup using an unused port and disposable application
data. These checks do not establish real playback, captions or native window
interaction. Evidence is under ignored `build/skill-verification/languages-*`.

The required discovery attempt ran November 3 at 23:25 UTC against the four
trusted public feeds. TXT official, Moa's Diary and V Live returned HTTP 404;
TomorrowByEdits returned HTTP 500. No recent uploads could be verified from
these requests, so discovery coverage is incomplete. No catalog changes were
made for this language feature.

Suggested commit message: `feat: add English Chinese Korean and Spanish interface languages`
