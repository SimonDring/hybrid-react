import Image from "next/image";
import { getImage, type ImageSlot } from "@/content/marketing/images";
import { cn } from "@/lib/cn";

/**
 * MediaPlaceholder — the website's swappable image system.
 *
 * Reference any visual by SLOT KEY. Until a real asset is registered in
 * content/marketing/images.ts, this renders a labelled placeholder at the right
 * aspect ratio (phone frame for the app, browser frame for the dashboard). Once
 * the asset is set, it swaps to an optimised next/image automatically — no JSX
 * change. This is the main thing the website needs that the app doesn't.
 */

const RATIO_CLASS: Record<string, string> = {
  phone: "aspect-[9/19]",
  browser: "aspect-[16/10]",
  square: "aspect-square",
  wide: "aspect-[16/7]",
};

export function MediaPlaceholder({
  slot,
  className,
  frame = true,
}: {
  slot: ImageSlot;
  className?: string;
  /** Browser/phone chrome around the media. */
  frame?: boolean;
}) {
  const { asset, label, ratio } = getImage(slot);
  const isPhone = ratio === "phone";

  const media = asset ? (
    <Image
      src={asset.src}
      alt={asset.alt}
      width={asset.width}
      height={asset.height}
      className="h-full w-full object-cover"
    />
  ) : (
    <Placeholder label={label} ratio={ratio} />
  );

  if (!frame) {
    return (
      <div className={cn("overflow-hidden rounded-card", RATIO_CLASS[ratio], className)}>
        {media}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden border border-hairline-strong bg-surface-2 shadow-lg",
        isPhone ? "rounded-[2rem] p-2" : "rounded-xl",
        className,
      )}
    >
      {/* Browser-style chrome (skipped for the phone frame). */}
      {!isPhone && (
        <div className="flex items-center gap-1.5 border-b border-hairline bg-surface px-3 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-adjust/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-monitor/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-ready/70" />
        </div>
      )}
      <div
        className={cn(
          "overflow-hidden",
          isPhone ? "rounded-[1.5rem]" : "",
          RATIO_CLASS[ratio],
        )}
      >
        {media}
      </div>
    </div>
  );
}

function Placeholder({ label, ratio }: { label: string; ratio: string }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-surface-3">
      {/* Subtle grid so an empty slot still feels intentional, not broken. */}
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-hairline) 1px, transparent 1px), linear-gradient(90deg, var(--color-hairline) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative flex flex-col items-center gap-2 px-4 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-soft">
          {ratio === "phone" ? "App screen" : "Screenshot"}
        </span>
        <span className="text-sm font-medium text-muted">{label}</span>
      </div>
    </div>
  );
}
