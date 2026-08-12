import { pickAffirmation } from "@/lib/affirmations";

export function AffirmationBanner() {
  const affirmation = pickAffirmation();

  return (
    <div className="sticky top-0 z-30 mb-6 flex justify-center">
      <aside
        className="w-fit max-w-full rounded-2xl border border-white/30 bg-white/[0.06] px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_32px_rgba(22,35,30,0.04)] backdrop-blur-2xl backdrop-saturate-150"
        aria-label="Daily affirmation"
      >
        <p className="font-serif text-base leading-snug text-[#16231e] md:text-lg">{affirmation}</p>
      </aside>
    </div>
  );
}
