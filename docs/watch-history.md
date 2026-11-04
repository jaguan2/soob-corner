# Watch history and video stats

Open **History** in the tools dock, or **Watch history** on the start screen.
The start screen has separate **Videos** and **Watch history** tabs. History fills
the main content area and scrolls with the page. Switch back with **Videos** or
Escape; Left/Right and Home/End also navigate the tabs. Search and member filters
stay in place when switching between these two tabs. Settings closes first if it
is open when you press Escape.

Search watched titles, filter by member, play a video again, or add it to your
queue. Videos are grouped under their most recent play's local calendar date,
newest day first, with the most recently played videos first within each day.
Headings include the year and use your selected app language. Each row shows its
last-played time and lifetime play count. The old distinct-video result count is
no longer displayed. Longer lists load 20 entries at a time; loading more extends
an existing day group or adds older days without duplicating headings. Search
and member filters apply before grouping, so empty days disappear.

History still keeps one entry per video. Replaying a video moves it to its latest
play date rather than placing copies under every day it was watched. Previous
individual play dates are not stored and cannot be reconstructed from the saved
first/last timestamps. Per-row play counts cover all days, not just the heading's
date. Profile totals retain their existing meaning. Videos unavailable in the
current catalog or session remain in history with playback actions disabled.

Titles prefer YouTube's English metadata when supplied, with the original as
fallback. History uses the current catalog label without changing your saved
play counts. Searches match both preferred and original titles; removed videos
keep their last saved title. Original labels appear in title tooltips when they
differ from the displayed label.

**Profile → Videos watched** shows the distinct-video total, total plays including
rewatches, and distinct-video counts for each of the five TXT members. A video
featuring Soobin and Yeonjun adds one to each member and one to the overall total.
Member counts can therefore add up to more than the overall total.

A video counts when YouTube reports that playback has started. Finishing it is
not required. Pause/resume, buffering, seeking, changing tools, and failed loads
do not add plays. Choosing the video again, replaying it, returning to it later,
or reopening the application and starting it adds a play. Its distinct-video
count remains one. Queued and automatically selected videos follow the same rule.
Watching videos does not award XP or add focus-timer study time.

Tracking starts with this update. Existing resume positions do not contain a
complete watch history, so earlier viewing totals are unavailable.

## Storage and maintenance

History is local to this browser or desktop profile in `sws.watchHistory`,
separate from progression, favorites, queue, and display preferences. Clearing
browser storage removes history and its totals. Each entry keeps a small title,
thumbnail, duration, and member snapshot so removed catalog entries retain their
history and attribution. Each video has one entry regardless of how many plays
it accumulates; timestamps and play counts update in place.

`lib/watchHistory.ts` validates saved data and computes totals. The
`watchHistorySession.ts` store serializes read/modify/write with a browser Web
Lock where available. Each write re-reads saved history, preserving other tabs'
starts. Failed reads prevent writes; failed saves retain pending starts for a
later retry. Storage events refresh the view without writing back. Older browsers
use a synchronous read/modify/write fallback, which cannot guarantee atomic
updates across tabs. `useWatchHistory` connects this store to React and reports
session-only save failures.

`VideoBackground.onVideoStarted` fires only on the first confirmed PLAYING event
for a selection or explicit replay. Keep its guard separate from position-resume
logic, and retain stale-video event checks. App connects this callback directly
to the history hook. Neither selecting a card nor setting desired play state
alone records a watch. History and member stats share the same saved entries;
there is no second counter to drift out of sync.

`WatchHistoryCard` performs date grouping only in the view, using `localDayKey`
from `lib/stats.ts` after filtering, sorting and taking the visible page. Never
use the UTC ISO date to choose a local day. Rendering, filtering, loading more
and changing language do not write to history. The welcome heading hierarchy is
h1 → day h2 → video h3; the dock uses h2 → day h3 → video h4. Each day's list is
labelled by its date heading.
