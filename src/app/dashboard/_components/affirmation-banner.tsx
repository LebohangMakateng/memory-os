import { pickAffirmation } from "@/lib/affirmations";

export function AffirmationBanner() {
  const affirmation = pickAffirmation();

  return (
    <aside
      className="sticky top-0 z-30 -mx-1 mb-6 rounded-xl border border-[#dce4dd]/45 bg-white/40 px-4 py-3 shadow-sm backdrop-blur-xl"
      aria-label="Daily affirmation"
    >
      <p className="text-[10px] font-bold tracking-[.14em] text-[#64726b]">AFFIRMATION</p>
      <p className="mt-1 font-serif text-base leading-snug text-[#16231e] md:text-lg">{affirmation}</p>
    </aside>
  );
}
