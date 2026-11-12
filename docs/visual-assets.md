# Visual assets

## Selected SOOB house logo

`public/soob-house-logo-transparent.png` is the active 1254 x 1254px RGBA
logo. The white background was removed with the built-in image editing tool on
November 8, 2026, at the user's request. Transparent negative space extends
inside the purple house and the SO / OB letter counters, so the mark blends into
Light, Cafe, Dark and Custom backgrounds. SHA-256:
`bcfe336e899486ef0ba9bf171c3fa29a4a7564bb72cc386ec9af14ad95e85ad3`.

The welcome heading, workspace brand, favicon, touch/install metadata and Windows
executable use the transparent asset. Header dimensions remain fixed with contain
sizing. Packaging passes the PNG to PyInstaller's icon converter; all seven native
icon sizes retain alpha transparency.

The original user-provided RGB image remains unchanged at
`public/soob-house-logo.png` (SHA-256
`4cd3be53ecbf2fd3baf62b44e6b6a24ef94494e142d2913db1b598802a6f7e00`).
Earlier explorations remain in [logo concepts](logo-concepts.md) and
[the two-by-two prototype notes](soob-house-grid-notes.md).

### Background-removal prompt

```text
Use case: background-extraction. Edit target: the supplied Soob house logo. Create the same logo with a genuinely transparent background. Remove all white/off-white background, including inside the house outline and the counters in the O and B letters. Preserve the purple house outline, exact SO / OB two-by-two lettering, purple gradient, shapes, relative position and proportions. No redesign, no extra artwork, no white matte, no shadow. Keep centered square composition. This is an app logo to blend cleanly into light, cafe, charcoal and custom theme backgrounds. Output RGBA PNG with clean antialiased edges.
```

## Previous Study Cottage logo

`public/soob-corner-logo.png` is the previously selected Study Cottage concept from
[the house-inspired logo exploration](logo-concepts.md). It was generated with
the built-in image generation tool on November 5, 2026, then copied unchanged
from `docs/images/logo-concepts/study-cottage.png`. The RGBA PNG is 1254 × 1254px
with genuine transparency; it depicts a purple cottage, cream facade, golden
window and small star. Its SHA-256 is
`6990eb659ab6e165bf58ad362a90e4566950b75bec3a8f741b8b33e81896a335`.

This earlier asset remains at its previous URL for compatibility. Its generation
prompt and the original concepts remain under `docs/`; active branding now uses
`soob-house-logo-transparent.png`.

## Previous HOME logo

`public/home-logo.png` is an unchanged copy of the user's
`personal-portfolio/public/logo.png`, used at their request. The original is
2000 × 2000px. It was used before the Study Cottage logo was selected. The
original file is retained at its earlier URL for compatibility; active branding
uses `soob-house-logo-transparent.png`.

## PPULBATU background stickers

`public/ppulbatu/` contains 15 unmodified, transparent PNG previews from
[HYBE's official Animated PPULBATU WARI WARI (TXT) set on LINE](https://store.line.me/stickershop/product/34033/en).
These are the static `sticker@2x.png` previews, not animated files. Each is 300px
high and 320–350px wide; together they total 184,140 bytes. They show complete
character poses with their original effects and lettering. No backgrounds were
removed and no generated artwork was substituted.

| Local PNG | LINE sticker ID | Source PNG |
| --- | --- | --- |
| `choi-yong-meong.png` | 746795514 | [Original](https://stickershop.line-scdn.net/stickershop/v1/sticker/746795514/iPhone/sticker@2x.png?v=2) |
| `hwang-choon.png` | 746795526 | [Original](https://stickershop.line-scdn.net/stickershop/v1/sticker/746795526/iPhone/sticker@2x.png?v=2) |
| `bamgeut.png` | 746795530 | [Original](https://stickershop.line-scdn.net/stickershop/v1/sticker/746795530/iPhone/sticker@2x.png?v=2) |
| `da-go-nyang.png` | 746795525 | [Original](https://stickershop.line-scdn.net/stickershop/v1/sticker/746795525/iPhone/sticker@2x.png?v=2) |
| `hhm-nya-ring.png` | 746795518 | [Original](https://stickershop.line-scdn.net/stickershop/v1/sticker/746795518/iPhone/sticker@2x.png?v=2) |
| `choi-yong-meong-thinking.png` | 746795527 | [Original](https://stickershop.line-scdn.net/stickershop/v1/sticker/746795527/iPhone/sticker@2x.png?v=2) |
| `choi-yong-meong-huffy.png` | 746795529 | [Original](https://stickershop.line-scdn.net/stickershop/v1/sticker/746795529/iPhone/sticker@2x.png?v=2) |
| `hwang-choon-snack.png` | 746795519 | [Original](https://stickershop.line-scdn.net/stickershop/v1/sticker/746795519/iPhone/sticker@2x.png?v=2) |
| `hwang-choon-singing.png` | 746795534 | [Original](https://stickershop.line-scdn.net/stickershop/v1/sticker/746795534/iPhone/sticker@2x.png?v=2) |
| `bamgeut-love.png` | 746795517 | [Original](https://stickershop.line-scdn.net/stickershop/v1/sticker/746795517/iPhone/sticker@2x.png?v=2) |
| `bamgeut-curious.png` | 746795536 | [Original](https://stickershop.line-scdn.net/stickershop/v1/sticker/746795536/iPhone/sticker@2x.png?v=2) |
| `da-go-nyang-cute.png` | 746795522 | [Original](https://stickershop.line-scdn.net/stickershop/v1/sticker/746795522/iPhone/sticker@2x.png?v=2) |
| `da-go-nyang-fired-up.png` | 746795535 | [Original](https://stickershop.line-scdn.net/stickershop/v1/sticker/746795535/iPhone/sticker@2x.png?v=2) |
| `hhm-nya-ring-resting.png` | 746795531 | [Original](https://stickershop.line-scdn.net/stickershop/v1/sticker/746795531/iPhone/sticker@2x.png?v=2) |
| `hhm-nya-ring-surprised.png` | 746795533 | [Original](https://stickershop.line-scdn.net/stickershop/v1/sticker/746795533/iPhone/sticker@2x.png?v=2) |

The files are stored locally, so loading the home page does not contact LINE.
Only the day's five selected files are requested by the background component.
They replace the earlier reveal-poster image and circular portrait crops.

Character/member names are confirmed by
[Weverse Magazine's BIGHIT MUSIC interview](https://magazine.weverse.io/article/view/1184?lang=en):

| Character | Member |
| --- | --- |
| CHOI YONG MEONG | Soobin |
| HWANG CHOON | Yeonjun |
| BAMGEUT | Beomgyu |
| DA-GO-NYANG | Taehyun |
| HHM NYA RING | Hueningkai |

PPULBATU artwork belongs to BIGHIT MUSIC / HYBE and retains its original rights;
it is separate from this application's source code. The welcome header credits
the owner and links to the [official release notice](https://weverse.io/txt/notice/21278).
This is a fan-made study app, not an official TXT product.

`PpulbatuWelcome` places five static stickers around the home background at 12%
opacity. Each uses `object-fit: contain`, without a circular frame, zoom or crop.
The absolutely positioned layer does not take up layout space;
its stacking context keeps controls above it. It has empty image alt text and
`aria-hidden`, with no focus targets or pointer events. The readable source credit
is separate from this decorative layer. The images have no animation or audio;
the layer is absent from Watch history and the playback workspace.

## Daily rotation and extending the bank

`src/data/ppulbatu.ts` groups three poses under each of the five character IDs.
`dailyPpulbatuStickers` advances each group's index once per local calendar day;
there is no per-render randomness or saved selection. Reloads and multiple tabs
with the same bank/date select the same images. Every character changes pose the
next day; the current three-pose banks cycle every three days.

`useLocalDay` schedules the next local midnight using calendar constructors, so
23-hour and 25-hour DST days rotate correctly. Focus, pageshow and returning from
a hidden page refresh the date after sleep. Unmounting removes the timeout and
listeners; timer, queue and playback lifecycles remain independent. No service,
cron job or network fetch supplies the daily choice.

To expand the bank, add a sourced static transparent PNG to `public/ppulbatu/`,
record its source here, and append its basename and native width to the matching
character's `stickers` array. Keep all five groups nonempty and use single-character
poses so every daily selection has exactly one of each character. Preserve PNG
transparency and the original art. Each group rotates using its own array length;
changing the bank can change the selection for the current date.
