// ─────────────────────────────────────────────────────────────
// Vragenlijst "Keuzevrijheid onder maatschappelijke druk"
// Eén definitie voor zowel de enquête (index.html) als het
// resultatendashboard (resultaten.html).
// ─────────────────────────────────────────────────────────────

const AGREE5 = ["Helemaal mee oneens", "Mee oneens", "Niet mee eens, niet mee oneens", "Mee eens", "Helemaal mee eens"];
const FREQ6 = ["Nooit", "Minder dan één keer per jaar", "Enkele keren per jaar", "Enkele keren per maand", "Minstens één keer per week", "Bijna dagelijks"];

const SURVEY = {
  title: "Keuzevrijheid onder maatschappelijke druk",
  intro: [
    "Welkom en bedankt voor je deelname aan dit onderzoek.",
    "Deze vragenlijst gaat over maatschappelijke druk, ervaren discriminatie, religieuze identiteit en keuzevrijheid rond het dragen van een hoofddoek onder moslimvrouwen. Het onderzoek wordt uitgevoerd vanuit de Postacademische Islamitische Ambtsopleiding en heeft als doel meer inzicht te krijgen in de persoonlijke en maatschappelijke ervaringen van moslimvrouwen.",
    "De vragenlijst duurt ongeveer 5–10 minuten. Deelname is vrijwillig en je antwoorden worden anoniem en vertrouwelijk verwerkt. Er zijn geen goede of foute antwoorden; het gaat om jouw persoonlijke ervaringen en opvattingen.",
    "Alvast hartelijk dank voor je deelname."
  ],

  pages: [
    {
      id: "toestemming",
      title: "Toestemming",
      text: "Door hieronder ‘Ja, ik geef toestemming’ te kiezen, bevestig je dat je vrijwillig deelneemt aan dit onderzoek en toestemming geeft om je antwoorden anoniem en vertrouwelijk te verwerken voor onderzoeksdoeleinden.",
      questions: [
        { key: "volwassen", n: "1", type: "radio", required: true, label: "Ben je 18 jaar of ouder?", options: ["Ja", "Nee"] },
        { key: "toestemming", n: "2", type: "radio", required: true, label: "Geef je toestemming om deel te nemen aan dit onderzoek en je antwoorden anoniem te laten verwerken?", options: ["Ja, ik geef toestemming", "Nee, ik geef geen toestemming"] }
      ]
    },
    {
      id: "achtergrond",
      title: "Achtergrondgegevens",
      text: "In dit onderdeel vragen we naar enkele algemene achtergrondkenmerken. Deze gegevens helpen om de deelnemers aan het onderzoek te beschrijven en de onderzoeksresultaten beter te begrijpen. Je antwoorden worden anoniem en vertrouwelijk verwerkt.",
      questions: [
        { key: "geslacht", n: "1", type: "radio", required: true, label: "Wat is je geslacht?", options: ["Vrouw", "Man", "Zeg ik liever niet", "Anders"], other: "Anders" },
        { key: "leeftijd", n: "2", type: "number", required: true, label: "Wat is je leeftijd?", help: "Vul je leeftijd in (hele) jaren in:", min: 18, max: 110 },
        { key: "opleiding", n: "3", type: "radio", required: true, label: "Wat is je hoogst afgeronde opleidingsniveau?", options: ["Basisonderwijs", "Vmbo", "Havo/vwo", "Mbo", "Hbo", "Wo", "PhD", "Zeg ik liever niet", "Anders"], other: "Anders" },
        { key: "moslim", n: "4", type: "radio", required: true, label: "Beschouw je jezelf als moslim?", options: ["Ja", "Nee", "Zeg ik liever niet"] },
        { key: "achtergrond", n: "5", type: "radio", required: true, label: "Wat is je culturele of etnische achtergrond?", options: ["Nederlands", "Turks", "Marokkaans", "Surinaams", "Indonesisch", "Syrisch", "Bosnisch", "Irakees", "Afghaans", "Pakistaans", "Somalisch", "Zeg ik liever niet", "Anders"], other: "Anders" },
        { key: "hoofddoek", n: "6", type: "radio", required: true, label: "Draag je momenteel een hoofddoek?", options: ["Ja, altijd of vrijwel altijd buitenshuis", "Ja, maar alleen in bepaalde situaties", "Nee, maar ik heb eerder een hoofddoek gedragen", "Nee, ik heb nooit een hoofddoek gedragen"] },
        { key: "moeder_hoofddoek", n: "7", type: "radio", required: true, label: "Draagt of droeg je moeder een hoofddoek?", options: ["Ja, zij draagt momenteel een hoofddoek", "Ja, zij droeg vroeger een hoofddoek", "Nee", "Weet ik niet", "Zeg ik liever niet"] },
        { key: "religiositeit", n: "8", type: "scale", required: true, label: "Hoe religieus beschouw je jezelf?", min: 1, max: 10, minLabel: "Helemaal niet religieus", maxLabel: "Zeer religieus" },
        { key: "gebed", n: "9", type: "radio", required: true, label: "Hoe vaak verricht je doorgaans de vijf dagelijkse gebeden?", options: ["Altijd of bijna altijd", "Vaak", "Soms", "Zelden", "Nooit", "Zeg ik liever niet"] },
        { key: "madhhab", n: "10", type: "radio", required: true, label: "Reken je jezelf tot een bepaalde islamitische rechtsschool (madhhab)?", options: ["Hanafitisch", "Malikitisch", "Shafi'itisch", "Hanbalitisch", "Nee, ik reken mij niet tot een specifieke rechtsschool", "Weet ik niet", "Zeg ik liever niet", "Anders"], other: "Anders" },
        { key: "reden_hoofddoek", n: "11", type: "textarea", required: false, label: "Wil je kort toelichten wat voor jou een belangrijke reden is om wel, niet of alleen in bepaalde situaties een hoofddoek te dragen?" }
      ]
    },
    {
      id: "druk",
      title: "Maatschappelijke druk rond de hoofddoek",
      text: "In hoeverre ben je het eens met de volgende uitspraken over jouw ervaringen met het dragen van een hoofddoek in de Nederlandse samenleving?",
      questions: [
        { key: "druk1", n: "1", type: "likert", required: true, options: AGREE5, label: "Ik ervaar vanuit de Nederlandse samenleving druk om geen hoofddoek te dragen." },
        { key: "druk2", n: "2", type: "likert", required: true, options: AGREE5, label: "Ik heb het gevoel dat ik makkelijker geaccepteerd word als ik geen hoofddoek draag." },
        { key: "druk3", n: "3", type: "likert", required: true, options: AGREE5, label: "Negatieve reacties van anderen geven mij het gevoel dat ik mijn hoofddoek beter niet kan dragen." },
        { key: "druk4", n: "4", type: "likert", required: true, options: AGREE5, label: "Ik heb het gevoel dat ik beter in de Nederlandse samenleving pas als ik geen hoofddoek draag." },
        { key: "druk5", n: "5", type: "likert", required: true, options: AGREE5, label: "Ik heb het gevoel dat het dragen van een hoofddoek mijn kansen op werk of carrière kan beperken." },
        { key: "druk6", n: "6", type: "likert", required: true, options: AGREE5, label: "Ik heb het gevoel dat het dragen van een hoofddoek mij kan beperken op school, tijdens een opleiding of binnen andere instellingen." },
        { key: "druk7", n: "7", type: "likert", required: true, options: AGREE5, label: "In sommige openbare situaties voel ik druk om mijn hoofddoek niet te dragen." },
        { key: "druk8", n: "8", type: "likert", required: true, options: AGREE5, label: "Ik heb het gevoel dat van mij wordt verwacht dat ik mijn hoofddoek afdoe of niet draag om meer geaccepteerd te worden." },
        { key: "druk_open", n: "9", type: "textarea", required: false, label: "Kun je, als je dat wilt, een situatie beschrijven waarin je maatschappelijke druk hebt ervaren rond het wel of niet dragen van een hoofddoek?" }
      ]
    },
    {
      id: "discriminatie",
      title: "Ervaren discriminatie",
      text: "Hoe vaak maak je in je dagelijks leven de volgende situaties mee?",
      questions: [
        { key: "disc1", n: "1", type: "likert", required: true, options: FREQ6, label: "Ik word minder beleefd behandeld dan andere mensen." },
        { key: "disc2", n: "2", type: "likert", required: true, options: FREQ6, label: "Ik word met minder respect behandeld dan andere mensen." },
        { key: "disc3", n: "3", type: "likert", required: true, options: FREQ6, label: "Ik krijg in winkels, restaurants of andere gelegenheden slechtere service dan andere mensen." },
        { key: "disc4", n: "4", type: "likert", required: true, options: FREQ6, label: "Mensen doen alsof ze denken dat ik niet slim ben." },
        { key: "disc5", n: "5", type: "likert", required: true, options: FREQ6, label: "Mensen doen alsof ze bang voor mij zijn." },
        { key: "disc6", n: "6", type: "likert", required: true, options: FREQ6, label: "Mensen doen alsof ze denken dat ik niet te vertrouwen ben." },
        { key: "disc7", n: "7", type: "likert", required: true, options: FREQ6, label: "Mensen doen alsof ze beter zijn dan ik." },
        { key: "disc8", n: "8", type: "likert", required: true, options: FREQ6, label: "Ik word uitgescholden of beledigd." },
        { key: "disc9", n: "9", type: "likert", required: true, options: FREQ6, label: "Ik word bedreigd of lastiggevallen." },
        { key: "disc_oorzaak", n: "10", type: "checkbox", required: false, help: "Meerdere antwoorden mogelijk.",
          label: "Als je één of meer van bovenstaande situaties hebt meegemaakt, waaraan denk je dat deze behandeling vooral te maken had?",
          options: ["Mijn religie / islamitische identiteit", "Mijn hoofddoek", "Mijn etnische of culturele achtergrond", "Mijn huidskleur", "Mijn geslacht", "Mijn leeftijd", "Anders", "Niet van toepassing"], other: "Anders" },
        { key: "disc_open", n: "11", type: "textarea", required: false, label: "Kun je, als je dat wilt, een situatie beschrijven waarin je het gevoel had anders of ongelijk behandeld te worden vanwege je religie, islamitische identiteit of hoofddoek?" }
      ]
    },
    {
      id: "identiteit",
      title: "Islamitische religieuze identiteit",
      text: "In hoeverre ben je het eens met de volgende uitspraken?",
      questions: [
        { key: "id1", n: "1", type: "likert", required: true, options: AGREE5, label: "Moslim zijn is een belangrijk onderdeel van wie ik ben." },
        { key: "id2", n: "2", type: "likert", required: true, options: AGREE5, label: "Ik zie mezelf sterk als moslim." },
        { key: "id3", n: "3", type: "likert", required: true, options: AGREE5, label: "Mijn islamitische identiteit betekent veel voor mij." },
        { key: "id4", n: "4", type: "likert", required: true, options: AGREE5, label: "De islam speelt een belangrijke rol in hoe ik mijn leven begrijp." },
        { key: "id5", n: "5", type: "likert", required: true, options: AGREE5, label: "Mijn islamitische identiteit is belangrijk voor de waarden waarnaar ik probeer te leven." },
        { key: "id6", n: "6", type: "likert", required: true, options: AGREE5, label: "Ik voel mij verbonden met andere moslims." },
        { key: "id_open", n: "7", type: "textarea", required: false, label: "Wat betekent jouw islamitische identiteit voor jou persoonlijk?" }
      ]
    },
    {
      id: "keuzevrijheid",
      title: "Ervaren keuzevrijheid (autonomie)",
      text: "In hoeverre ben je het eens met de volgende uitspraken over jouw keuze rond het dragen van een hoofddoek?",
      questions: [
        { key: "keuze1", n: "1", type: "likert", required: true, options: AGREE5, label: "Het is mijn eigen keuze of ik een hoofddoek draag." },
        { key: "keuze2", n: "2", type: "likert", required: true, options: AGREE5, label: "Ik voel mij vrij om zelf te bepalen of ik een hoofddoek draag." },
        { key: "keuze3", n: "3", type: "likert", required: true, options: AGREE5, label: "Ik zou mij vrij voelen om mijn keuze over het dragen van een hoofddoek te veranderen." },
        { key: "keuze4", n: "4", type: "likert", required: true, options: AGREE5, label: "Ik voel mij vrij om zelf te bepalen hoe ik mijn hoofddoek draag." },
        { key: "keuze5", n: "5", type: "likert", required: true, options: AGREE5, label: "Mijn keuze rond het dragen van een hoofddoek past bij wat ik zelf wil." },
        { key: "keuze6", n: "6", type: "likert", required: true, options: AGREE5, label: "Ik heb het gevoel dat de beslissing over het dragen van een hoofddoek bij mijzelf ligt." },
        { key: "keuze_open", n: "7", type: "textarea", required: false, label: "Wat helpt of belemmert jou het meest om vrij te kiezen of je wel of geen hoofddoek draagt?" }
      ]
    },
    {
      id: "afronding",
      title: "Afronding van de enquête",
      text: "Bedankt voor je deelname aan dit onderzoek. Tot slot wil ik je vragen of je eventueel bereid bent om deel te nemen aan een kort online interview. In dit interview is er ruimte om jouw ervaringen en opvattingen over het onderwerp verder toe te lichten.",
      questions: [
        { key: "interview", n: "", type: "radio", required: true, label: "Ben je bereid om deel te nemen aan een online interview?", options: ["Ja, ik ben bereid om deel te nemen", "Nee, ik wil niet deelnemen"] }
      ]
    }
  ],

  interview: {
    title: "Aanmelding online interview",
    text: [
      "Bedankt dat je bereid bent om deel te nemen aan een online interview. In dit interview is er ruimte om jouw ervaringen en opvattingen over maatschappelijke druk, religieuze identiteit en keuzevrijheid rond het dragen van een hoofddoek verder toe te lichten.",
      "Je enquête-antwoorden zijn al opgeslagen. Je contactgegevens worden apart verzameld en worden níet gekoppeld aan de antwoorden die je in de enquête hebt gegeven. Deelname aan het interview is vrijwillig; je kunt je altijd nog afmelden."
    ],
    questions: [
      { key: "naam", type: "text", required: true, label: "Naam of voornaam", help: "Hoe mag ik je aanspreken wanneer ik contact met je opneem?", autocomplete: "given-name" },
      { key: "email", type: "email", required: true, label: "E-mailadres", help: "Op welk e-mailadres mag ik contact met je opnemen voor het online interview?", autocomplete: "email" },
      { key: "opmerking", type: "textarea", required: false, label: "Eventuele opmerking", help: "Is er iets waar ik rekening mee kan houden wanneer ik contact met je opneem?" }
    ]
  }
};

// ── Schalen voor de analyse ──────────────────────────────────
const SCALES = {
  druk:   { name: "Maatschappelijke druk",   short: "Druk",       items: ["druk1","druk2","druk3","druk4","druk5","druk6","druk7","druk8"], range: [1,5] },
  disc:   { name: "Ervaren discriminatie",   short: "Discriminatie", items: ["disc1","disc2","disc3","disc4","disc5","disc6","disc7","disc8","disc9"], range: [1,6] },
  ident:  { name: "Religieuze identiteit",   short: "Identiteit", items: ["id1","id2","id3","id4","id5","id6"], range: [1,5] },
  keuze:  { name: "Ervaren keuzevrijheid",   short: "Keuzevrijheid", items: ["keuze1","keuze2","keuze3","keuze4","keuze5","keuze6"], range: [1,5] }
};

if (typeof module !== "undefined") module.exports = { SURVEY, SCALES, AGREE5, FREQ6 };
