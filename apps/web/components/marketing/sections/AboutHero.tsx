import { ABOUT_HERO } from "@/content/marketing/about";
import { Eyebrow } from "@/components/marketing/ui/Eyebrow";
import { GlowBackdrop } from "@/components/marketing/ui/GlowBackdrop";

/** AboutHero — the mission stated as a belief, kept tight and confident. */
export function AboutHero() {
  return (
    <section className="relative overflow-hidden">
      <GlowBackdrop />
      <div className="relative mx-auto max-w-4xl px-5 pb-12 pt-20 text-center sm:px-6 lg:px-8 lg:pb-16 lg:pt-28">
        <Eyebrow className="flex justify-center">{ABOUT_HERO.eyebrow}</Eyebrow>
        <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-strong sm:text-5xl">
          {ABOUT_HERO.title}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-body">
          {ABOUT_HERO.subtitle}
        </p>
      </div>
    </section>
  );
}
