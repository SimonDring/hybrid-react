import { FAQ } from "@/content/marketing/landing";
import { Section } from "@/components/marketing/ui/Section";
import { SectionHeading } from "@/components/marketing/ui/SectionHeading";
import { FaqItem } from "@/components/marketing/ui/FaqItem";

/**
 * FAQSection — kills the objections coaches raise first (cost, complexity,
 * privacy, "does it replace me"). Accepts an optional override so other pages
 * (e.g. pricing) can reuse the accordion with their own items.
 */
export function FAQSection({
  eyebrow = FAQ.eyebrow,
  title = FAQ.title,
  items = FAQ.items,
}: {
  eyebrow?: string;
  title?: string;
  items?: { q: string; a: string }[];
}) {
  return (
    <Section id="faq">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading eyebrow={eyebrow} title={title} align="left" />
        <div>
          {items.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </Section>
  );
}
