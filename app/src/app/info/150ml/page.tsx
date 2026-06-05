import Link from "next/link";

// Content is isolated here for future i18n support.
// When app language switching is implemented, swap this object per locale.
const content = {
  title: "The 150 ml/kg/day guideline",
  subtitle: "Background on the daily target",
  back: "← Back to dashboard",

  intro: `The guideline of approximately 150 ml of prepared formula per kilogram of body weight per day is a practical rule of thumb that has been used worldwide for decades for healthy, full-term babies in their first months. It is not a strict rule, but an average based on typical energy and fluid needs of babies, taking into account growth, hydration and safety.`,

  science: {
    heading: "Scientific background",
    p1: `This guideline originates from observations of breast milk intake in healthy babies and clinical practice. Babies drink an average of 100–200 ml/kg/day, with 150 ml/kg as the widely used average for formula-fed infants after the first week.`,
    bullets: [
      `It accounts for an energy requirement of approximately 90–120 kcal/kg/day (formula is typically ~65–70 kcal/100 ml).`,
      `Studies and expert panels (such as ESPGHAN, FAO/WHO/UNU) base recommendations on growth patterns, metabolism and safe intake. A widely cited 1985 reference (Wilson et al.) established 150 ml/kg as the standard for dosage calculations.`,
      `It is empirical: it supports adequate growth without over- or underfeeding in most babies. Growth (weight, length, head circumference) and signs of satisfaction (6–8 wet nappies/day, contentment) are more important than exact ml.`,
    ],
    note: `There is no single "perfect" scientific study that dictates exactly 150 ml; it is a consensus from paediatric guidelines, based on breast milk data and safe formula use. For premature babies, values are often higher (160–180+ ml/kg).`,
  },

  belgium: {
    heading: "Variations in Belgium",
    bullets: [
      { org: "Gezondheid.be:", text: "Often states 150–180 ml/kg/day, covering a broader range for variation between babies." },
      { org: "Kind en Gezin:", text: "Typically uses ~150 ml/kg as the guideline (e.g. for a 4 kg baby: 440–750 ml/day, depending on rhythm). This is conservative and focuses on the average, with an emphasis on responsive feeding (baby decides)." },
    ],
    note: `The difference lies in conservative vs. slightly broader advice; both emphasise individual adjustment and monitoring growth. Kind en Gezin focuses on prevention and practical parental guidance.`,
  },

  international: {
    heading: "Guidelines in other countries",
    p1: `Guidelines are consistent: 150 ml/kg/day (or 150–200 ml/kg) as a general rule of thumb after the first week, up to ~6 months, then decreasing with the introduction of solid foods. It always refers to prepared formula (powder + water according to instructions), not water or powder alone.`,
    bullets: [
      { country: "UK (NHS):", text: "After the first week ~150–200 ml per kg per day up to 6 months. Emphasises variation per baby and responsive feeding." },
      { country: "USA (AAP, CDC):", text: "~75 ml (2½ oz) per pound (~165 ml/kg) per day as an average, or 140–200 ml/kg/day. Max ~900–960 ml/day. Focus on on-demand feeding." },
      { country: "EU / Australia / etc.:", text: "Similar, often 150 ml/kg as baseline. WHO/ESPGHAN focus mainly on breastfeeding, but the same volumes apply for formula." },
    ],
    disclaimer: `Important: These are guidelines for healthy, full-term babies. Premature babies, sick babies or special formulas require adapted advice — consult your doctor or health visitor.`,
  },

  preparedMilk: {
    heading: "Prepared formula or water?",
    text: `The quantity (150 ml/kg) always refers to the final, prepared formula. Measure water according to the packaging (e.g. 1 scoop of powder per 30 ml of water → ~35 ml of formula), shake well and feed. Never adjust the amount of powder or water without advice — this can lead to formula that is too thick or too thin, with risks (constipation, dehydration, electrolyte disorders).`,
  },

  summary: {
    heading: "Summary",
    bullets: [
      "Start small in the first few days and build up.",
      "Follow your baby (hunger cues, growth, nappy count).",
      "Maximum ~900–1000 ml/day after a few months, but per kg remains the guide.",
      "When in doubt: contact your health visitor, GP or paediatrician. Growth is the best indicator.",
    ],
    note: `These guidelines evolve slightly with new research, but 150 ml/kg has proven to be a robust, safe standard. Sources are government and paediatric organisations.`,
  },

  references: {
    heading: "References",
    groups: [
      {
        region: "Belgium",
        links: [
          { label: "Kind en Gezin — How much formula per day (~150 ml/kg)", url: "https://www.kindengezin.be/nl/thema/voeding/flesvoeding/hoeveel-flesjes-dag" },
          { label: "Kind en Gezin — PDF guide", url: "https://publicaties.vlaanderen.be/view-file/74087" },
          { label: "Gezondheid.be — 150–180 ml/kg range", url: "https://www.gezondheid.be/artikel/baby/borst-of-fles-hoeveel-voedingen-heeft-je-baby-nodig-per-dag-34161" },
        ],
      },
      {
        region: "Netherlands",
        links: [
          { label: "Voedingscentrum.nl — How much formula does my baby need?", url: "https://www.voedingscentrum.nl/nl/zwanger-en-kind/borstvoeding-en-flesvoeding/flesvoeding-geven/hoeveel-flesvoeding-heeft-mijn-baby-nodig-.aspx" },
          { label: "JGZ guideline — Nutrition and eating behaviour (~150 ml/kg)", url: "https://www.jgzrichtlijnen.nl/richtlijn/jgz-richtlijn-voeding-en-eetgedrag/" },
        ],
      },
      {
        region: "United Kingdom (NHS)",
        links: [
          { label: "NHS — Formula milk questions (150–200 ml/kg)", url: "https://www.nhs.uk/baby/breastfeeding-and-bottle-feeding/bottle-feeding/formula-milk-questions/" },
          { label: "Derbyshire Family Health Service NHS — Formula feeding", url: "https://derbyshirefamilyhealthservice.nhs.uk/our-services/0-5-years/infant-feeding-and-nutrition/formula-feeding" },
          { label: "UNICEF UK — Parents' guide to infant formula (PDF)", url: "https://www.unicef.org.uk/babyfriendly/wp-content/uploads/sites/2/2016/12/Parents-guide-to-infant-formula.pdf" },
        ],
      },
      {
        region: "United States (AAP / CDC)",
        links: [
          { label: "HealthyChildren.org (AAP) — Amount and schedule of formula feedings", url: "https://www.healthychildren.org/English/ages-stages/baby/formula-feeding/Pages/amount-and-schedule-of-formula-feedings.aspx" },
          { label: "CDC — How much and how often to feed infant formula", url: "https://www.cdc.gov/infant-toddler-nutrition/formula-feeding/how-much-and-how-often.html" },
        ],
      },
      {
        region: "International / Scientific",
        links: [
          { label: "Better Health Channel (Australia) — Bottle feeding nutrition and safety", url: "https://www.betterhealth.vic.gov.au/health/healthyliving/bottle-feeding-nutrition-and-safety" },
          { label: "FAO/WHO — Codex Standard for Infant Formula (PDF)", url: "https://www.fao.org/input/download/standards/288/CXS_072e_2015.pdf" },
          { label: "ESPGHAN — Enteral Nutrition in Preterm Infants 2022 (PDF)", url: "https://www.espghan.org/dam/jcr:092f7f5a-6557-433c-98d6-7259ab1a9cfa/Enteral%20Nutrition%20in%20Preterm%20Infants%202022%20A.204.pdf" },
          { label: "PubMed Central — Tailored recommendations based on growth and guidelines", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11473556/" },
        ],
      },
    ],
    footer: "Guidelines may change slightly with updates. Always check the most recent version on official sites. When in doubt, consult your health visitor, GP or paediatrician.",
  },
};

export default function Rule150mlPage() {
  const c = content;
  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24 text-slate-300 text-sm leading-relaxed">
      <Link href="/" className="text-blue-400 hover:text-blue-300 text-xs mb-6 block">{c.back}</Link>

      <h1 className="text-2xl font-bold text-slate-100 mb-1">{c.title}</h1>
      <p className="text-slate-400 text-xs mb-6">{c.subtitle}</p>

      <p className="mb-4">{c.intro}</p>

      {/* Science */}
      <h2 className="text-slate-100 font-semibold mt-6 mb-2">{c.science.heading}</h2>
      <p className="mb-3">{c.science.p1}</p>
      <ul className="list-disc pl-5 space-y-2 mb-4">
        {c.science.bullets.map((b, i) => <li key={i}>{b}</li>)}
      </ul>
      <p className="mb-4 text-slate-400">{c.science.note}</p>

      {/* Belgium */}
      <h2 className="text-slate-100 font-semibold mt-6 mb-2">{c.belgium.heading}</h2>
      <ul className="list-disc pl-5 space-y-2 mb-4">
        {c.belgium.bullets.map((b, i) => (
          <li key={i}><span className="text-slate-200 font-medium">{b.org}</span> {b.text}</li>
        ))}
      </ul>
      <p className="mb-4 text-slate-400">{c.belgium.note}</p>

      {/* International */}
      <h2 className="text-slate-100 font-semibold mt-6 mb-2">{c.international.heading}</h2>
      <p className="mb-3">{c.international.p1}</p>
      <ul className="list-disc pl-5 space-y-2 mb-4">
        {c.international.bullets.map((b, i) => (
          <li key={i}><span className="text-slate-200 font-medium">{b.country}</span> {b.text}</li>
        ))}
      </ul>
      <p className="mb-4 text-slate-400 text-xs">{c.international.disclaimer}</p>

      {/* Prepared milk */}
      <h2 className="text-slate-100 font-semibold mt-6 mb-2">{c.preparedMilk.heading}</h2>
      <p className="mb-4">{c.preparedMilk.text}</p>

      {/* Summary */}
      <div className="bg-slate-800 rounded-xl p-4 mt-6">
        <p className="text-slate-200 font-medium mb-2">{c.summary.heading}</p>
        <ul className="list-disc pl-5 space-y-1 text-slate-300">
          {c.summary.bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
        <p className="text-slate-400 text-xs mt-3">{c.summary.note}</p>
      </div>

      {/* References */}
      <h2 className="text-slate-100 font-semibold mt-8 mb-3">{c.references.heading}</h2>
      <div className="space-y-5 text-xs">
        {c.references.groups.map((g) => (
          <div key={g.region}>
            <p className="text-slate-300 font-medium mb-1">{g.region}</p>
            <ul className="space-y-1.5">
              {g.links.map((l) => (
                <li key={l.url}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline break-all">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-slate-500 text-xs mt-6 pb-4">{c.references.footer}</p>
    </div>
  );
}
