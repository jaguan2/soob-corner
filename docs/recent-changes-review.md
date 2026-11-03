# Recent code and UI/UX review

Reviewed on November 3, 2026 by the primary Codex session and an independent
Codex session. Scope: `4c7e3c2..0dc4ff2` (settings, queue, study-time tracking,
history, timer controls, keyboard navigation and the main/dev merge), plus the
uncommitted icon-only back-arrow change. The original review was report-only;
the fixes below were subsequently authorized and implemented.

## Fixes completed November 3, 2026

- Timer editing now restores countdown focus only for Enter/Escape. Tab,
  Shift+Tab and clicks preserve the intended destination. The hint reserves its
  space during editing so closing the editor does not move Start beneath a click.
- Narrow/short layouts let the tools dock grow and use page scrolling. Desktop
  retains its bounded dock scroller; hidden panels remain mounted.
- Explicit queue removal focuses the adjacent removal control, or the queue
  heading when empty. Clear queue uses the same heading. Automatic consumption
  does not request focus.
- The welcome screen has a persistent compact timer with Start/Pause. Its
  countdown is silent; only running/paused status is live. Keeping the control
  mounted preserves focus after pausing and allows resuming before choosing a video.
- Independent re-review found that Start could not restart a completed Pomodoro.
  The shared timer toggle now resets the completed cycle before starting it.
  A regression test failed before the fix and passes afterward, checking the new
  cycle's countdown, elapsed time and completion XP without repeating old credit.

Final verification: 268 tests in 27 files, build and lint passed. Browser checks
passed the editor and queue focus scenarios, welcome pause/resume, a clock-controlled
completed-cycle restart, and dock layout at 320, 375, 768 and 1440px. Enlarging the
root font to 125% retained the expanding dock and avoided horizontal overflow.
Selected axe checks passed on welcome, mobile timer and mobile settings; contrast
remained incomplete. Independent structural re-review found no remaining supported
issues in the final changes. See [screenshots](screenshots.md) for updated captures.
The Windows executable was rebuilt; all 61 bundled assets match the production
build. Source startup reported `SELFTEST OK (webview import OK)` and the frozen
windowed application's headless startup exited successfully. These checks do not
verify native-window persistence or streaming media.

The required catalog check on November 3 read 15 recent uploads from each of the
four trusted public channel feeds. Unreviewed archive candidates include
`2uBq5VFl0V4` and `rgG0eMG6Ax0`; duration, participants, duplicate eligibility
and original broadcast dates remain unverified. This limited feed scan is not a
complete catalog audit, and no videos were added. Discovery details are retained
in `build/skill-verification/review-fixes-discovery.json`.

## Original findings

### P2: Timer editing steals the next control's focus

Location: `src/components/TimerPanel.tsx:35-39`, with the blur handler at line 71.

Reproduction: open the timer duration editor, type `20`, then press Tab. Focus
returns to the countdown instead of continuing to Reset. Editing and clicking
the Tasks tab can leave focus on the page body after the timer panel hides.
Both sessions identified this issue; the primary session reproduced it in the
browser.

The effect restores countdown focus whenever editing ends, including a blur
caused by navigation to another control. Restore it for explicit Enter/Escape
completion only; preserve the user's chosen destination when committing on
blur. Verify Tab, Shift+Tab, clicking another tab, and Enter/Escape separately.

### P2: The narrow-screen dock hides the primary timer controls

Location: `src/index.css:257-269`.

At 375 x 812, the two rows of tool tabs occupy about 161px and leave about
203px for panel content. At 320 x 568, panel content gets about 126px. With the
inner scroller at its initial position, Start focus and the quick durations sit
below its clipped edge. Scrolling the outer page to the bottom does not reveal
them; the user must discover and scroll the separate panel body.

This is a reproduced usability problem, not a claim that the controls are
unreachable or that a specific accessibility standard has failed. Preserve the
managed placement while allowing the dock to grow with its content on narrow
screens, or reduce the tab strip and keep the timer's transport visible. Verify
the result with touch-sized viewports and enlarged text.

### P3: Removing a queue row loses visible keyboard focus

Location: `src/components/VideoQueue.tsx:30`; consider Clear queue at line 19 too.

Reproduction: queue two videos, focus the first row's Remove button, and press
Enter. Its DOM node disappears and `document.activeElement` becomes `BODY`.
The next Tab still reaches the remaining row, so this did not reproduce a full
navigation reset; the confirmed problem is loss of visible focus and context
immediately after removal. The independent reviewer also identified it.

Move focus to an adjacent row's corresponding control after keyboard removal.
Provide a stable fallback such as the queue heading when the last row is
removed or the queue is cleared. Avoid moving focus for automatic playback
consumption of queue entries.

## Original additional UX recommendation

The welcome screen shows a running countdown after using Back, but offers no
Pause or Open timer action. A user must select a video to regain timer controls.
This behavior predates the back-arrow edit; consider adding a pause action to
the existing running-timer banner. Keep its visible countdown separate from
announcements so assistive technology does not receive an update every second.

## Original review coverage

The independent session reviewed elapsed-time accounting, progression
persistence/replay, history locking/retry, queue consumption, remote catalog
replacement and deep-link handling. It found no additional supported defects
in those paths. Feature hooks, the typed tool registry, and separate persistence
modules provide useful boundaries; this review does not justify a broad
rewrite or extra abstractions.

The immediately preceding merge verification passed all 267 tests in 27 files,
TypeScript/production build, lint, desktop server startup, and comparison of all
61 executable-bundled assets with `dist`. Application files were unchanged
during this review, so those results were reused. Browser checks also passed
new-catalog deep links, offline cached restart, active-video metadata retention,
queue pruning, filter/favorite retention, hidden timer continuity and late
history recording across catalog replacement.

This review additionally inspected desktop and narrow-screen layouts, exercised
Light/Cafe/Dark/Custom selection and clearing custom overrides, milestone
visibility, disabling single-key shortcuts, and Escape navigation. Automated
axe checks reported no violations for the selected WCAG A/AA rules in Light
Settings at 1440px, Profile at 375px, and Timer at 320px. Color contrast remained
incomplete; this is not a complete accessibility audit.

YouTube and remote-catalog responses were mocked in the deterministic browser
checks. Real playback, subtitles, native-window behavior and screen-reader
speech were not verified. The shared upstream toolkit was unavailable; both
sessions followed the repository's local review guidance instead.

Screenshots and verification details are under ignored
`build/skill-verification/` (`review-*.png` and `merge-check-results.json`). These
are diagnostic captures, with a mocked black video stage, rather than product
screenshots for publication.
