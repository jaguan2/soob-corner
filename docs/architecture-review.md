# Structure and scalability review

Reviewed October 30, 2026 with an independent Codex session. This pass preserves
the current interface and saved-data formats while separating application wiring
from reusable behavior.

November 3 follow-up: `useVideoAudio` now owns saved video volume, startup mute,
and mute/volume gestures. Its controls live only in the playback bar; the M
shortcut remains bound by `App` and calls the same hook action.

## Changes implemented

| Boundary | Responsibility | Reason |
| --- | --- | --- |
| `src/App.tsx` | Compose player, timer, progression, screens, and tools | Keep integration visible without owning every feature's persistence |
| `src/hooks/useVideoAudio.ts` | Saved volume, startup mute, and audio gestures | Share consistent behavior between the playback bar and M shortcut |
| `src/hooks/useAppearance.ts` | Validate saved appearance, apply root styles, persist selections | Share one owner across welcome and dock Settings views |
| `src/hooks/usePreferences.ts` | Validate and save optional display preferences | Keep choices such as milestone visibility separate from earned progression |
| `src/hooks/useTimerWheel.ts` | Local wheel capture, input normalization, gesture accumulation and cleanup | Keep DOM input handling separate from the timer state machine's bounded `adjustTime` action |
| `src/lib/keyboardNavigation.ts` | Tab destinations, responsive card movement, and native button group enhancements | Share keyboard behavior while retaining native controls and list semantics |
| `src/hooks/useVideoScreenFocus.ts` | Focus targets when switching between catalog and workspace | Restore context without moving focus during automatic video changes |
| `src/hooks/useWatchHistory.ts` | Connect confirmed playback to saved history and live stats | Keep viewing data separate from focus time and XP |
| `src/lib/watchHistorySession.ts` | Serialize history writes and retain failed starts for retry | Preserve overlapping tabs and prevent unreadable-state overwrites |
| `src/lib/watchHistory.ts` | Normalize per-video snapshots and derive viewing totals | History and profile counts use one source of truth |
| `src/components/SettingsCard.tsx` | Group appearance and profile display controls | Reuse the same settings view before and during study sessions |
| `src/lib/theme.ts` | Palette derivation and shared `Theme` type | Components depend on the domain rather than importing from `App` |
| `src/hooks/useVideoCatalog.ts` | Selection, filters, favorites, blocked videos, last selection, URL | Test navigation with an injected catalog without creating a player |
| `src/lib/workspace.ts` | Stable tool IDs, labels, icons, and order | Define tools once and derive the selection type from that definition |
| `src/components/StudyTools.tsx` | Tab/panel connections, dock visibility, timer footer | Preserve mounted tools while centralizing the dock layout |

Adding a tool means adding metadata to `STUDY_TOOLS` and providing its view in
the `App` panels record. TypeScript reports a missing view, and the tab grid
wraps on narrow docks and fits available width on larger docks. Stable IDs
preserve panel identity across renders.

The catalog hook has no knowledge of iframe creation. It calls `onRepeat` when
the only matching video should replay, and `onBlocked` when a failed embed is
excluded. `App` connects these events to the player and notices. Pomodoro playback
integration and keyboard shortcuts remain in `App`; video audio belongs to
`useVideoAudio`.

## Preserved behavior and verification

- Existing localStorage keys and preference defaults remain compatible.
- Valid `?v=` links select a video; invalid IDs open the welcome screen. Returning
  there removes only `v`, retaining other query parameters and the URL fragment.
- Filters and favorites leave current playback alone. Previous/next, random
  selection, and blocked-video recovery use the filtered order.
- Inactive tools and the hidden dock retain mounted panels, preserving drafts,
  timer state, and audio. The profile remains confined to its own tools tab.
- Leaving the custom theme clears inline colors; panel opacity changes the
  surface token without fading text.

Mounted hook and dock tests cover these boundaries. Existing player recovery,
progression concurrency, catalog, task-planning, and theme-contrast tests remain
part of `npm test`. Production build and desktop packaging checks are required
after runtime changes. These checks do not verify live third-party playback.

## Recommended next passes

1. **Task state ownership.** `TasksCard` combines saved tasks, ordering, selection,
   Undo, editing, and form rendering. `useProgression` also reads the task schema
   when migrating a profile. Introduce a task-specific read adapter shared by
   both, then a task controller hook. Keep drafts and DOM focus in the component;
   preserve IDs, migration, Undo ordering, and once-per-task XP rules.
2. **Timer transitions.** The November 3 study-time fix adds mounted fake-clock
   timer/profile coverage for partial time, completion, pause/reset/relaunch,
   Pomodoro phases and skip-break, mode changes, nudges, throttling, and save
   recovery. Preserve these regressions and extend boundary cases before a
   future separation of scheduling, state transitions, and completion effects.
3. **Larger catalogs.** Profile search and welcome-grid rendering as the catalog
   grows. Precomputed searchable metadata, membership sets, or pagination can
   address measured bottlenecks. No performance improvement is claimed by this
   structural refactor.

Progression already distinguishes unreadable storage from absent data and
replays pending writes under a lock. Retain those guarantees when adding
persistence helpers; a generic saved-state hook must not replace them.

## Catalog integration after the main/dev merge

The November 3 merge keeps `usePlaylist` responsible for downloading and caching
validated catalogs, separate from `useVideoCatalog` selection/URL/queue ownership.
Pending deep links resolve when loading finishes; explicit selection or return
cancels them. Active metadata survives catalog removal, and App includes that
snapshot when recording a delayed first playback in watch history. Remote updates
do not recreate the player or reset the timer. Unavailable queued entries are
pruned by the existing queue owner.
