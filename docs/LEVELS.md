# Study profile and progression

Your profile is available in the **Profile** tools tab after you choose a video.
Open **Edit profile** there to choose a display name
and one of four study avatars. The card shows your level, total XP, progress to
the next level, total time studied, completed-task total, check-in streak,
best streak, and eight milestones.

The **Videos watched** section also shows distinct videos, plays including
rewatches, and counts by member from your [local watch history](watch-history.md).
These viewing stats are independent of XP and focus-timer study time.

Milestone cards are optional: open **Settings → Profile** and turn off **Show
milestones** to hide them. This display preference saves on your device separately
from progression. Study time, XP, and milestone eligibility continue to accumulate;
turning the cards back on restores their current earned status.

**Total time studied** shows hours, minutes, and seconds. It increases while the
focus timer runs, including unfinished sessions, and retains elapsed time when
you pause, reset, change durations, or exit Pomodoro. Pauses, Pomodoro breaks,
and simply watching a video do not count. The display updates during a session;
you do not need to finish a full block first.

Time is checkpointed locally about once a second, with a final partial checkpoint
on timer actions and page exit. Existing completed-focus history seeds the total
once, and elapsed time persists across launches and old-history pruning. Earlier
unfinished sessions were never recorded by the old implementation and cannot be
reconstructed. A hard crash can lose time since the last successful checkpoint.

## XP rules

| Activity | XP |
| --- | --- |
| Completed focus block | 1 per recorded focus minute |
| First completion of a task | 10 once per task id |
| Daily check-in | 10 + 1 per additional consecutive day, capped at 20 per day |

Focus XP uses the same rounded completed-block durations as the existing focus stats.
The available saved study history counts when this feature first loads. Minutes
that were already pruned from the old 400-day stats log cannot be reconstructed.
After migration, the progression ledger retains lifetime credit even as ordinary
stats prune old days. Breaks, interrupted/reset timers, and picking a video do
not earn focus XP. Partial focus time is included in **Total time studied** without
awarding completion XP. Finishing a block does not add its duration to that counter
a second time. Milestones and daily focus goals continue to use completed blocks.

Unchecking a task does not remove its earned XP. Rechecking it, deleting it,
clearing completed work, or restoring it with Undo never creates another reward
for that same id. Old completed tasks are remembered in the lifetime count and
milestones without receiving retroactive task bonus XP.

Opening, returning to, or using the app counts as a daily check-in. A window
left unattended overnight does not extend the streak. A missed local calendar
day resets the current streak, while best streak, earned XP and milestones
remain. Calendar day comparisons handle daylight-saving changes. Moving the
clock backward cannot reopen a reward day.

## Levels and milestones

The curve matches TaskNook's `frontend/src/lib/progression.js`:

| Advance | Required XP | Total XP at the new level |
| --- | ---: | ---: |
| 1 → 2 | 100 | 100 |
| 2 → 3 | 150 | 250 |
| 3 → 4 | 200 | 450 |
| 4 → 5 | 250 | 700 |

Each later level requires 50 more XP. Milestones celebrate first focus, first
task, one hour of focus, 10 tasks, a three-day check-in streak, 10 hours of focus,
a seven-day check-in streak, and 50 tasks. Earned milestones remain earned.

## Persistence and implementation

Everything is stored locally under `sws.progression`; there is no account,
backend, currency, or feature gate. Clearing browser storage removes this local
profile and its lifetime ledger. Browser profiles, origins, and the desktop
app's persisted WebView profile each have their own storage.

`lib/progression.ts` contains the pure model. `hooks/useProgression.ts` initializes
history and known task claims, saves outside React updaters, and handles
completion/check-in actions. `lib/progressionSession.ts` queues operations, reads
current persisted progress before applying them, and uses a shared Web Lock to
serialize saves across tabs in supported browsers (including modern Edge/WebView2).
Older browsers fall back to a fresh synchronous read before writing. Storage
events refresh other tabs without echo writes. Failed saves retain pending actions
in memory and replay them on the next successful save; failed reads prevent writing
an unseen profile. Profile saves await the result before reporting success.
`useTimer` invokes the completion callback after
ordinary stats are written. Completion and task-reward callbacks do not run on timer ticks.
The separate elapsed-time callback checkpoints actual running focus time through
the same save queue without XP rewards or reward notifications. The additive
`studyMilliseconds` field is initialized after legacy-history backfill; pending
elapsed deltas coalesce during failed saves and replay once against fresh state.
Failed storage writes keep progress in memory and report that it is session-only.

Tests cover exact level thresholds, increasing requirements, history backfill
and pruning, completion/relaunch credit, task deduplication, check-in caps and
clock correction, DST/month/year boundaries, malformed storage, profile edits,
and permanent milestones. Run `npm test`, `npm run lint`, and `npm run build`.
Rebuild the Windows executable and run its `SWS_SELFTEST=1` path after runtime
changes.
