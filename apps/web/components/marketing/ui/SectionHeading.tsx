import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Eyebrow } from "./Eyebrow";

/**
 * SectionHeading — eyebrow + display title + optional lead paragraph, with
 * consistent type scale across every section. `align` centres it for full-width
 * intros or left-aligns it for split layouts.
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl",
        className,
      )}
    >
      {eyebrow && <Eyebrow className="mb-4">{eyebrow}</Eyebrow>}
      <h2 className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-strong sm:text-4xl lg:text-[2.75rem]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-5 text-base leading-relaxed text-body sm:text-lg">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}
