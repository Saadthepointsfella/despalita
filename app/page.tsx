import { ArrowLink } from "@/components/ui/arrow-link";
import { SectionLabel } from "@/components/ui/section-label";

export default function HomePage() {
  return (
    <main className="relative min-h-[100svh] bg-[#FAF9F6] text-[#1A1A1A]">
      {/* grid overlay */}
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

      <section className="relative z-10 mx-auto grid max-w-6xl grid-cols-12 gap-px bg-black/10 px-6 pt-28 pb-16">
        {/* Left: editorial title card */}
        <div className="col-span-12 md:col-span-8 bg-[#FAF9F6] border border-black/10 p-8 md:p-12">
          <SectionLabel section="01" title="DTC Analytics Maturity Assessment" />
          <h1 className="mt-7 font-serif text-[44px] leading-[0.98] tracking-[-0.02em] md:text-[84px]">
            A fast read on your{" "}
            <span className="italic underline-red">measurement</span> stack.
          </h1>

          <div className="mt-7 grid grid-cols-12 gap-6">
            <p className="col-span-12 md:col-span-8 font-mono text-[12px] uppercase tracking-[0.22em] text-black/65">
              24 questions. No fluff. Immediate level + gaps + roadmap.
            </p>
            <div className="col-span-12 md:col-span-4 md:text-right">
              <ArrowLink href="/assessment" direction="up_right">
                Start
              </ArrowLink>
            </div>
          </div>

          {/* simple motif */}
          <div className="mt-10 border-t border-black/10 pt-6">
            <div className="motif-line w-full" />
            <div className="motif-line w-[78%] mt-3" />
            <div className="motif-line w-[92%] mt-3" />
          </div>
        </div>

        {/* Right: black slab */}
        <div className="relative col-span-12 md:col-span-4 bg-[#121212] border border-black/10 overflow-hidden min-h-[280px] md:min-h-[520px]">
          <div className="absolute inset-0 opacity-[0.9]">
            <div className="hairline h1" />
            <div className="hairline h2" />
            <div className="hairline v1" />
            <div className="hairline v2" />
            <div className="sig-dot d1" />
            <div className="sig-dot d2" />
            <div className="sig-dot d3" />
          </div>

          <div className="absolute bottom-6 left-6 right-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">
              Output
            </p>
            <p className="mt-2 font-serif text-[18px] leading-[1.6] text-[#FAF9F6]">
              Your maturity level + top constraints + a build sequence that fits.
            </p>
          </div>

          <div className="plus absolute right-6 top-6 text-[44px] text-white/80">
            +
          </div>
        </div>
      </section>

    </main>
  );
}
