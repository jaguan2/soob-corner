# Watch history and video stats

Open **History** in the tools dock, or **Watch history** on the start screen.
Search watched titles, filter by member, play a video again, or add it to your
queue. History shows one entry per distinct video, ordered by its most recent
play, with the last-played date and number of plays. Longer lists load 20 entries
at a time. Videos unavailable in the current catalog or session remain in history
with playback actions disabled.

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
