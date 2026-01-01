// src/app/assessment/page.tsx
import { Panel } from "@/components/ui/panel";
import { SectionLabel } from "@/components/ui/section-label";
import { ArrowLink } from "@/components/ui/arrow-link";
import { Divider } from "@/components/ui/divider";

export default function AssessmentLandingPage() {
  return (
    <main className="relative min-h-[100svh] bg-[#FAF9F6] text-[#1A1A1A]">
      {/* Swiss grid overlay */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.05]">
        <div className="mx-auto grid h-full max-w-6xl grid-cols-12 px-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className={[
                "h-full border-l border-black/70",
                i === 11 ? "border-r" : "",
              ].join(" ")}
            />
          ))}
        </div>
      </div>

      {/* Page layout: editorial card + black slab */}
      <section className="relative z-10 mx-auto grid max-w-6xl grid-cols-12 gap-px bg-black/10 px-6 pt-28 pb-16">
        {/* Left: intro + content */}
        <div className="col-span-12 md:col-span-8 bg-[#FAF9F6] border border-black/10 p-8 md:p-12">
          {/* Header */}
          <header className="space-y-5">
            <SectionLabel section="01" title="Assessment" />

            <h1 className="font-serif text-[42px] leading-[0.98] tracking-[-0.02em] md:text-[74px]">
              DTC Analytics <span className="italic underline-red">Maturity</span>{" "}
              Assessment
            </h1>

            <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-black/65 max-w-[65ch] leading-relaxed">
              24 questions. 6 dimensions. A clear diagnosis, your biggest gap, and a priority roadmap.
            </p>

            <div className="pt-2">
              <ArrowLink href="/assessment/quiz" direction="up_right">
                Start the assessment
              </ArrowLink>
            </div>

            {/* Minimal motif */}
            <div className="pt-6 border-t border-black/10">
              <div className="motif-line w-full" />
              <div className="motif-line w-[78%] mt-3" />
              <div className="motif-line w-[92%] mt-3" />
            </div>
          </header>

          {/* Panels */}
          <div className="mt-10 space-y-6">
            <Panel className="space-y-4">
              <SectionLabel section="02" title="Overview" />
              <Divider />
              <p className="text-sm text-muted">
                This assessment measures how reliably your analytics stack turns data into decisions. It’s designed
                for operators, you can answer it without deep technical knowledge.
              </p>
            </Panel>

            <Panel className="space-y-4">
              <SectionLabel section="03" title="How it works" />
              <Divider />
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
                <li>Answer 24 behavior-based questions (what you do, not what tools you own).</li>
                <li>Get scored across six dimensions (tracking → infrastructure).</li>
                <li>See your primary constraint and the top three priorities to fix next.</li>
              </ul>
            </Panel>

            <Panel className="space-y-4">
              <SectionLabel section="04" title="What you get" />
              <Divider />
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
                <li>Level badge + concise summary (what’s working / what’s holding you back).</li>
                <li>Dimension breakdown with a tiered roadmap (Now / Next / Later).</li>
                <li>Tokenized share link + export-ready report later.</li>
              </ul>
            </Panel>

            <Panel className="space-y-4">
              <SectionLabel section="05" title="Time & privacy" />
              <Divider />
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
                <li>Takes ~4 minutes. You can move quickly, no long text inputs.</li>
                <li>Your answers are used only to compute your result and recommendations.</li>
                <li>Email is only required at the gate to unlock the full report.</li>
              </ul>
            </Panel>
          </div>
        </div>

        {/* Right: black slab (visual + “what it measures”) */}
        <aside className="relative col-span-12 md:col-span-4 bg-[#121212] border border-black/10 overflow-hidden min-h-[320px] md:min-h-[780px]">
          {/* Content blocks inside slab */}
          <div className="absolute left-6 right-14 top-6 z-10 space-y-7">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">
                Measures
              </p>
              <p className="mt-2 font-serif text-[18px] leading-[1.6] text-[#FAF9F6]">
                Reliability of measurement → speed of decisions → compounding performance.
              </p>
            </div>

            <div className="border-t border-white/10 pt-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">
                Dimensions
              </p>
              <div className="mt-3 space-y-2 text-white/70 font-mono text-[12px] tracking-[0.08em] uppercase">
                <div className="flex items-center justify-between">
                  <span>Tracking</span>
                  <span className="text-[#C54B4B]">01</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Attribution</span>
                  <span className="text-[#C54B4B]">02</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Reporting</span>
                  <span className="text-[#C54B4B]">03</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Experimentation</span>
                  <span className="text-[#C54B4B]">04</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Forecasting</span>
                  <span className="text-[#C54B4B]">05</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Infrastructure</span>
                  <span className="text-[#C54B4B]">06</span>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">
                Output
              </p>
              <p className="mt-2 font-serif text-[18px] leading-[1.6] text-[#FAF9F6]">
                Your level, your constraint, and the sequence to fix it.
              </p>
            </div>
          </div>

          <div className="plus absolute right-6 top-6 z-10 text-[44px] text-white/80">
            +
          </div>

          {/* Sparse motion lines/dots */}
          <div className="absolute bottom-0 left-0 right-0 top-[52%] opacity-[0.9]">
            <div className="hairline h1" />
            <div className="hairline h2" />
            <div className="hairline v1" />
            <div className="hairline v2" />
            <div className="sig-dot d1" />
            <div className="sig-dot d2" />
            <div className="sig-dot d3" />
          </div>
        </aside>
      </section>

    </main>
  );
}
