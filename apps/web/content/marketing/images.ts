/**
 * IMAGES — the swappable image-slot registry.
 *
 * The whole site references images by SLOT KEY, never by file path. Each slot is
 * `null` until you add a real asset — components render a labelled placeholder
 * block in the meantime, so the layout is final before any screenshot exists.
 *
 * To add a real image:
 *   1. Drop the file in  public/images/  (see public/images/README.md for sizes).
 *   2. Replace the slot's `null` with { src, alt, width, height }.
 * Nothing else changes — <MediaPlaceholder> swaps to an optimised next/image.
 */

export interface ImageAsset {
  src: string; // e.g. "/images/coach-dashboard.png"
  alt: string;
  width: number;
  height: number;
}

export type ImageSlot =
  | "hero-dashboard"
  | "player-app"
  | "coach-dashboard"
  | "how-it-works"
  | "team-founder"
  | "og-default";

/**
 * The registry. `null` = not supplied yet (shows a placeholder).
 * `label` + `ratio` shape the placeholder so it reserves the right space.
 */
export const IMAGE_SLOTS: Record<
  ImageSlot,
  { asset: ImageAsset | null; label: string; ratio: "phone" | "browser" | "square" | "wide" }
> = {
  "hero-dashboard": {
    asset: null,
    label: "Coach dashboard preview",
    ratio: "browser",
  },
  "player-app": {
    asset: null,
    label: "Player app — today's session",
    ratio: "phone",
  },
  "coach-dashboard": {
    asset: null,
    label: "Coach dashboard — squad readiness",
    ratio: "browser",
  },
  "how-it-works": {
    asset: null,
    label: "Data → decision",
    ratio: "wide",
  },
  "team-founder": {
    asset: null,
    label: "Founder",
    ratio: "square",
  },
  "og-default": {
    asset: null,
    label: "Social share image",
    ratio: "wide",
  },
};

export function getImage(slot: ImageSlot) {
  return IMAGE_SLOTS[slot];
}
