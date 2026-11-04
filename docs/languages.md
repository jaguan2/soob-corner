# Interface languages

Open **Settings → App language** on the start screen or in the study dock.
Choose **English**, **简体中文** (Simplified Chinese), **한국어** (Korean), or
**Español** (Spanish). Changes take effect immediately. English is the default;
the selection is remembered on this browser/device when storage is available.
Each choice always shows its own language name so you can switch back easily.

The main navigation, settings, timer, tasks, profile, history, discovery and
playback controls use the chosen language. History dates and discovery month
names also follow it. Switching languages preserves the running timer, current
player, queue, favorites, history, profile and unfinished task/profile drafts.

Your own task text, display name and station labels stay as entered. Member and
account names remain proper names. Video titles continue to prefer YouTube's
English metadata with the original as fallback; choosing an interface language
does not request different titles. Subtitles have their own independent saved
language in **CC**. Embedded YouTube/Spotify interfaces, operating-system
notifications and some exceptional recovery messages can still use English or
the external service's language. This setting does not translate external pages.

## Maintenance

`src/i18n/LanguageProvider.tsx` owns the validated `sws.language` preference
through the existing storage gateway and updates the document's `lang` attribute.
The supported codes are `en`, `zh-CN`, `ko` and `es`. Invalid saved values fall
back to English; blocked storage still allows a session-only selection. Changing
language updates context without remounting the application or its media player.

`useLanguage()` supplies `t(key, values)` for explicit application messages.
`en.ts` defines typed English source-message keys; `zh-CN.ts`, `ko.ts` and `es.ts`
must provide every key. Translate complete phrases and preserve named
placeholders such as `{count}`; avoid constructing sentences from translated
fragments. Interpolation replaces values once, leaving React to escape text.
The `text()` helper is only for known app-owned dynamic labels, such as milestone
descriptions. Never pass user text, video titles or persisted IDs through it.
Keep translated display labels separate from storage values, theme IDs and
keyboard shortcuts. Progress notifications read current translations through a
ref so language changes cannot restart persistence effects or award check-ins.

Dictionary tests check completeness and matching placeholders. Provider tests
cover persistence, invalid values, blocked storage and mounted draft retention.
Browser checks cover actual controls, longer labels, keyboard navigation and
timer/player continuity. See [verification notes](stability-test.md) and
[screenshots](screenshots.md).
