// src/app/page.tsx
import { ArrowLink } from "@/components/ui/arrow-link";
import { SectionLabel } from "@/components/ui/section-label";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <SectionLabel
        number={1}
        title="DTC Analytics Maturity Assessment"
        subtitle="A premium, data-driven quiz → preview → email gate → full report."
      />

      <div className="mt-10">
        <ArrowLink href="/assessment" arrow="upRight">
          Go to assessment
        </ArrowLink>
      </div>
    </main>
  );
}
