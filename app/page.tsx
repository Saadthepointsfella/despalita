// src/app/page.tsx
import { ArrowLink } from "@/components/ui/arrow-link";
import { SectionLabel } from "@/components/ui/section-label";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <SectionLabel
        section="01"
        title="DTC Analytics Maturity Assessment"
      />
      <p className="mt-2 text-sm text-muted">
        A premium, data-driven quiz → preview → email gate → full report.
      </p>

      <div className="mt-10">
        <ArrowLink href="/assessment" direction="up_right">
          Go to assessment
        </ArrowLink>
      </div>
    </main>
  );
}
