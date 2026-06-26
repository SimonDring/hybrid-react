# Marketing images

Drop real screenshots / mockups here, then register them in
[`content/marketing/images.ts`](../../content/marketing/images.ts). Until a slot
is registered, the site shows a labelled placeholder at the correct size — so the
layout is final before any asset exists.

## How to swap a placeholder for a real image

1. Export the screenshot and save it here, e.g. `coach-dashboard.png`.
2. In `content/marketing/images.ts`, set that slot's `asset`:

   ```ts
   "coach-dashboard": {
     asset: {
       src: "/images/coach-dashboard.png",
       alt: "Coach dashboard showing squad readiness",
       width: 1600,
       height: 1000,
     },
     label: "Coach dashboard — squad readiness",
     ratio: "browser",
   },
   ```

That's it — `<MediaPlaceholder>` swaps to an optimised `next/image` automatically.

## Slots & recommended dimensions

| Slot | Where it shows | Ratio | Suggested export |
| --- | --- | --- | --- |
| `hero-dashboard` | (reserved) hero preview | browser 16:10 | 1600 × 1000 |
| `coach-dashboard` | "Two modes" — coach card | browser 16:10 | 1600 × 1000 |
| `player-app` | "Two modes" — player card | phone 9:19 | 540 × 1140 |
| `how-it-works` | Lead-magnet visual | wide 16:7 | 1400 × 612 |
| `team-founder` | About — team card | square 1:1 | 600 × 600 |
| `og-default` | Social share image | wide ~1.91:1 | 1200 × 630 → save to `public/og/default.png` |

Tip: a real screenshot of the live `/dashboard` makes a great `coach-dashboard`
image — it's the actual product.
