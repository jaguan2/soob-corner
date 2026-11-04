# Keyboard access

The app supports normal Tab navigation, native form controls, and additional
arrow navigation in common control groups. **Settings → Accessibility** contains
keyboard help and a saved **Single-key shortcuts** switch. Turning it off disables
the app's Space/F/M/T/Z shortcuts while retaining native button activation,
Escape, and arrow navigation.

| Where | Keys | Action |
| --- | --- | --- |
| Any screen | Tab / Shift+Tab | Move between controls; focus outlines identify the current control |
| Focused button or link | Enter; Space on buttons | Activate the control |
| Video workspace | Esc | Return to video selection, including from Zen; the focus timer continues |
| Timer/task editor, captions, or an open disclosure | Esc | Cancel/close that local context first and restore focus |
| Fullscreen | Esc | Leave fullscreen first; another Esc returns to video selection |
| Tools tabs | Left / Right | Switch and focus the adjacent tab, wrapping at the ends |
| Tools tabs | Home / End | Switch to the first / last tab |
| Tools tabs | Tab | Enter the selected panel; inactive panels remain mounted but are skipped |
| Video cards | Arrows | Move between cards using the current column layout without starting playback |
| Video cards | Home / End | Focus the first / last card in the current list or picker page |
| Video card actions | Tab; Enter / Space | Reach and activate Play or Add to queue |
| Timer countdown | Up / Down | Add / remove one minute using the same bounded action as the wheel |
| Toolbar, playback buttons, presets, palette presets, member/type filters | Left / Right; Home / End | Focus another button; Enter / Space activates it |
| Volume, scrubber, number inputs, and selects | Native control keys | Adjust the focused control without seeking the background video |
| Video background, with shortcuts enabled | Space; F / M / T / Z | Play/pause; fullscreen / mute / timer / Zen |
| Video background outside other controls | Left / Right | Seek backward / forward ten seconds |

Keyboard users encounter skip links before the rest of each screen. The catalog
link jumps to video choices; workspace links jump to playback controls or study
tools. Opening a video focuses the back arrow, labelled Back to video selection.
Returning focuses its catalog card,
or the catalog heading if filters exclude that card. Automatic video changes
do not move focus. Queue buttons retain focus after adding a video, exposing the
Queued state without preventing continued keyboard browsing.

The welcome screen has a Browse tab list for Videos and Watch history, with one
Tab stop, Left/Right wrapping and Home/End navigation. Its skip link targets the
active view. Escape closes Settings or a nested disclosure first, then returns
from Watch history to Videos and focuses that tab. The full-page history list
uses document scrolling and keeps its filters when switching browsing tabs.

Leaving the timer duration editor with Tab or a pointer preserves the destination
control. Enter/Escape returns focus to the countdown. Removing a queued item
focuses the next removal control, or the previous one at the end; removing the
last item or clearing the queue focuses its heading. Automatic playback does not
trigger this removal focus behavior. Welcome timer Start/Pause keeps its focus
when its label changes. Its countdown has live announcements disabled; a separate
status announces running/paused changes.

## Implementation and verification

`lib/keyboardNavigation.ts` contains tab destinations, spatial card navigation,
and shared button-group behavior. Video collections retain ordinary list/button
semantics and Tab stops. Tools tabs use one active Tab stop and linked, labelled
panels. `useVideoScreenFocus` handles screen transitions. Local handlers consume
their events before global shortcuts; editing and native controls keep their
own keys. The decorative background iframe is inert and hidden from assistive
technology, with playback provided by the app's separate controls. Interactive
music embeds retain their own controls.

The November 3, 2026 pass verified skip links, responsive card movement, tab
wrapping, focus restoration, editor/disclosure dismissal, native slider behavior,
shortcut persistence, and 45 consecutive Tab transitions without entering the
hidden background iframe or inactive panels. Unit tests cover 2/3/4-column
movement, inherited browser rectangle properties, list boundaries, tab behavior,
and preference migration. Production UI tests used a simulated video player.

A temporary **axe-core 4.14.0** scan reported no violations for the selected WCAG
A/AA rules on the Dark catalog, Dark Timer workspace, Dark Settings workspace,
and Light Settings workspace. Contrast checks remained incomplete and require
manual review. This is a targeted keyboard improvement, not a full WCAG
conformance audit. Screen-reader testing, all content/states/themes at zoom and
high contrast, native fullscreen behavior, and third-party embeds still need a
broader audit before claiming conformance.

Reference guidance: [W3C keyboard access](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html),
[tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), and
[character-key shortcuts](https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html).
## Language selection

Settings' language selector has a native label and shows language names in their
own language. The document's `lang` and translated control names follow the
selection. November 3 localization checks covered four-language welcome Settings
and mobile tools with selected axe WCAG A/AA rules; no violations remained in
those views, while contrast required manual follow-up. See
[language verification](stability-test.md) for scope and media limits.
