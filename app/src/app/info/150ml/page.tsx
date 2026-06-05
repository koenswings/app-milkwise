import Link from "next/link";

export default function Rule150mlPage() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24 text-slate-300 text-sm leading-relaxed">
      <Link href="/" className="text-blue-400 hover:text-blue-300 text-xs mb-6 block">← Back to dashboard</Link>

      <h1 className="text-2xl font-bold text-slate-100 mb-1">De 150 ml/kg/dag richtlijn</h1>
      <p className="text-slate-400 text-xs mb-6">Achtergrond bij de dagelijkse doelstelling</p>

      <p className="mb-4">
        De richtlijn van circa 150 ml flesvoeding (klaargemaakte voeding) per kg lichaamsgewicht per dag is een
        praktische vuistregel die al decennia wereldwijd wordt gebruikt voor gezonde, voldragen baby&apos;s in de
        eerste maanden. Het is geen strikte wet, maar een gemiddelde gebaseerd op typische energie- en
        vochtbehoeften van baby&apos;s, met aandacht voor groei, hydratatie en veiligheid.
      </p>

      <h2 className="text-slate-100 font-semibold mt-6 mb-2">Wetenschappelijke onderbouwing</h2>
      <p className="mb-3">
        Deze richtlijn komt voort uit observaties van borstmelkintake bij gezonde baby&apos;s en klinische praktijk.
        Baby&apos;s drinken gemiddeld 100–200 ml/kg/dag, met 150 ml/kg als veelgebruikt gemiddelde voor
        formula-fed infants na de eerste week.
      </p>
      <ul className="list-disc pl-5 space-y-2 mb-4">
        <li>Het houdt rekening met een energiebehoefte van ongeveer 90–120 kcal/kg/dag (formule is typisch ~65–70 kcal/100 ml).</li>
        <li>Studies en expertpanels (zoals ESPGHAN, FAO/WHO/UNU) baseren aanbevelingen op groeipatronen, metabolisme en veilige intake. Een veel geciteerde referentie uit 1985 (Wilson et al.) stelde 150 ml/kg voor als standaard voor doseringsberekeningen.</li>
        <li>Het is empirisch: het ondersteunt adequate groei zonder over- of ondervoeding bij de meeste baby&apos;s. Groei (gewicht, lengte, hoofdomtrek) en tekenen van voldoening (6–8 natte luiers/dag, tevredenheid) zijn belangrijker dan exacte ml.</li>
      </ul>
      <p className="mb-4 text-slate-400">
        Er is geen enkele &ldquo;perfecte&rdquo; wetenschappelijke studie die precies 150 ml dicteert; het is een consensus uit
        pediatrische richtlijnen, gebaseerd op borstmelkdata en veilige formula-use. Voor premature baby&apos;s liggen
        waarden vaak hoger (160–180+ ml/kg).
      </p>

      <h2 className="text-slate-100 font-semibold mt-6 mb-2">Variaties in België</h2>
      <ul className="list-disc pl-5 space-y-2 mb-4">
        <li><span className="text-slate-200 font-medium">Gezondheid.be:</span> Geeft vaak 150–180 ml/kg/dag aan, wat een breder bereik dekt voor variatie tussen baby&apos;s.</li>
        <li><span className="text-slate-200 font-medium">Kind en Gezin:</span> Houdt het vaak bij ~150 ml/kg als richtlijn (bijv. voor een baby van 4 kg: 440–750 ml/dag, afhankelijk van ritme). Dit is conservatief en richt zich op het gemiddelde, met nadruk op responsief voeden (baby bepaalt).</li>
      </ul>
      <p className="mb-4 text-slate-400">
        Het verschil zit in conservatief vs. iets ruimer advies; beide benadrukken individuele aanpassing en groei
        volgen. Kind en Gezin richt zich op preventie en praktische ouderbegeleiding.
      </p>

      <h2 className="text-slate-100 font-semibold mt-6 mb-2">Richtlijnen in andere landen</h2>
      <p className="mb-3">
        Richtlijnen zijn consistent: 150 ml/kg/dag (of 150–200 ml/kg) als algemene vuistregel na de eerste week,
        tot ~6 maanden, daarna afnemend bij introductie van vast voedsel. Het is altijd klaargemaakte voeding
        (poeder + water volgens instructies), niet alleen water of poeder.
      </p>
      <ul className="list-disc pl-5 space-y-2 mb-4">
        <li><span className="text-slate-200 font-medium">VK (NHS):</span> Na de eerste week ~150–200 ml per kg per dag tot 6 maanden. Benadrukt variatie per baby en responsief voeden.</li>
        <li><span className="text-slate-200 font-medium">USA (AAP, CDC):</span> ~75 ml (2½ oz) per pound (~165 ml/kg) per dag als gemiddelde, of 140–200 ml/kg/dag. Max ~900–960 ml/dag. Focus op on-demand voeden.</li>
        <li><span className="text-slate-200 font-medium">EU / Australië / etc.:</span> Vergelijkbaar, vaak 150 ml/kg als baseline. WHO/ESPGHAN richten zich vooral op borstvoeding, maar voor formula dezelfde volumina.</li>
      </ul>
      <p className="mb-4 text-slate-400 text-xs">
        Belangrijk: Dit zijn richtlijnen voor gezonde voldragen baby&apos;s. Prematuren, zieke baby&apos;s of speciale
        formules hebben aangepaste adviezen — raadpleeg arts of consultatiebureau.
      </p>

      <h2 className="text-slate-100 font-semibold mt-6 mb-2">Klaargemaakte melk of water?</h2>
      <p className="mb-4">
        De hoeveelheid (150 ml/kg) verwijst altijd naar de uiteindelijke, klaargemaakte flesvoeding. Je meet water
        af volgens de verpakking (bijv. 1 maatschepje poeder op 30 ml water → ~35 ml voeding), schudt goed, en
        geeft dat. Nooit extra poeder of water aanpassen zonder advies — dat kan leiden tot te dikke/te dunne
        voeding met risico&apos;s (constipatie, dehydratatie, elektrolytenstoornissen).
      </p>

      <div className="bg-slate-800 rounded-xl p-4 mt-6">
        <p className="text-slate-200 font-medium mb-2">Samenvatting</p>
        <ul className="list-disc pl-5 space-y-1 text-slate-300">
          <li>Begin klein in de eerste dagen en bouw op.</li>
          <li>Volg de baby (hongersignalen, groei, luiers).</li>
          <li>Maximaal ~900–1000 ml/dag na enkele maanden, maar per kg blijft de leidraad.</li>
          <li>Bij twijfel: contacteer Kind en Gezin, huisarts of pediater. Groei is de beste indicator.</li>
        </ul>
        <p className="text-slate-400 text-xs mt-3">
          Deze richtlijnen evolueren licht met nieuw onderzoek, maar 150 ml/kg is een robuuste, veilige standaard gebleken.
          Bronnen zijn overheids- en pediatrische organisaties.
        </p>
      </div>

      {/* References */}
      <h2 className="text-slate-100 font-semibold mt-8 mb-3">Bronnen</h2>

      <div className="space-y-5 text-xs">
        <div>
          <p className="text-slate-300 font-medium mb-1">België</p>
          <ul className="space-y-1.5">
            <li>
              <span className="text-slate-400">Kind en Gezin — Hoeveel flesvoeding per dag (~150 ml/kg): </span>
              <a href="https://www.kindengezin.be/nl/thema/voeding/flesvoeding/hoeveel-flesjes-dag" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline break-all">kindengezin.be/…/hoeveel-flesjes-dag</a>
              <span className="text-slate-500"> · </span>
              <a href="https://publicaties.vlaanderen.be/view-file/74087" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">PDF</a>
            </li>
            <li>
              <span className="text-slate-400">Gezondheid.be — 150–180 ml/kg bereik: </span>
              <a href="https://www.gezondheid.be/artikel/baby/borst-of-fles-hoeveel-voedingen-heeft-je-baby-nodig-per-dag-34161" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline break-all">gezondheid.be/…</a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-slate-300 font-medium mb-1">Nederland</p>
          <ul className="space-y-1.5">
            <li>
              <a href="https://www.voedingscentrum.nl/nl/zwanger-en-kind/borstvoeding-en-flesvoeding/flesvoeding-geven/hoeveel-flesvoeding-heeft-mijn-baby-nodig-.aspx" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline break-all">Voedingscentrum.nl — Hoeveel flesvoeding heeft mijn baby nodig?</a>
            </li>
            <li>
              <a href="https://www.jgzrichtlijnen.nl/richtlijn/jgz-richtlijn-voeding-en-eetgedrag/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline break-all">JGZ-richtlijn Voeding en eetgedrag — circa 150 ml/kg</a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-slate-300 font-medium mb-1">Verenigd Koninkrijk (NHS)</p>
          <ul className="space-y-1.5">
            <li><a href="https://www.nhs.uk/baby/breastfeeding-and-bottle-feeding/bottle-feeding/formula-milk-questions/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline break-all">NHS — Formula milk questions (150–200 ml/kg)</a></li>
            <li><a href="https://derbyshirefamilyhealthservice.nhs.uk/our-services/0-5-years/infant-feeding-and-nutrition/formula-feeding" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline break-all">Derbyshire Family Health Service NHS — Formula feeding</a></li>
            <li><a href="https://www.unicef.org.uk/babyfriendly/wp-content/uploads/sites/2/2016/12/Parents-guide-to-infant-formula.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline break-all">UNICEF UK — Parents&apos; guide to infant formula (PDF)</a></li>
          </ul>
        </div>

        <div>
          <p className="text-slate-300 font-medium mb-1">Verenigde Staten (AAP / CDC)</p>
          <ul className="space-y-1.5">
            <li><a href="https://www.healthychildren.org/English/ages-stages/baby/formula-feeding/Pages/amount-and-schedule-of-formula-feedings.aspx" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline break-all">HealthyChildren.org (AAP) — Amount and schedule of formula feedings</a></li>
            <li><a href="https://www.cdc.gov/infant-toddler-nutrition/formula-feeding/how-much-and-how-often.html" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline break-all">CDC — How much and how often to feed infant formula</a></li>
          </ul>
        </div>

        <div>
          <p className="text-slate-300 font-medium mb-1">Internationaal / Wetenschappelijk</p>
          <ul className="space-y-1.5">
            <li><a href="https://www.betterhealth.vic.gov.au/health/healthyliving/bottle-feeding-nutrition-and-safety" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline break-all">Better Health Channel (Australië) — Bottle feeding nutrition and safety</a></li>
            <li><a href="https://www.fao.org/input/download/standards/288/CXS_072e_2015.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline break-all">FAO/WHO — Codex Standard for Infant Formula (PDF)</a></li>
            <li><a href="https://www.espghan.org/dam/jcr:092f7f5a-6557-433c-98d6-7259ab1a9cfa/Enteral%20Nutrition%20in%20Preterm%20Infants%202022%20A.204.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline break-all">ESPGHAN — Enteral Nutrition in Preterm Infants 2022 (PDF)</a></li>
            <li><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC11473556/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline break-all">PubMed Central — Tailored recommendations based on growth and guidelines</a></li>
          </ul>
        </div>
      </div>

      <p className="text-slate-500 text-xs mt-6 pb-4">
        Richtlijnen kunnen licht variëren per update. Controleer altijd de meest recente versie op de officiële sites.
        Bij twijfel: raadpleeg Kind en Gezin, huisarts of pediater.
      </p>
    </div>
  );
}
