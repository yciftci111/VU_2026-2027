// Gesimuleerde voorbeelddata om het dashboard te bekijken vóórdat er echte antwoorden zijn.
// Niet gebruiken voor rapportage!
(function (root) {
  function makeDemo(n = 180, seed = 7) {
    const S = root.Stats || require('./stats.js');
    const Q = typeof SURVEY !== 'undefined' ? { SURVEY } : require('./questions.js');
    const r = S.rng(seed), z = () => S.randn(r);
    const pick = (arr, w) => { let u = r() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < arr.length; i++) { u -= w[i]; if (u <= 0) return arr[i]; } return arr[arr.length - 1]; };
    const cut = (v, k) => Math.max(1, Math.min(k, Math.round((k + 1) / 2 + v * (k / 4))));
    const opts = key => Q.SURVEY.pages.flatMap(p => p.questions).find(q => q.key === key).options;
    const rows = [];
    for (let i = 0; i < n; i++) {
      const hd = pick(opts('hoofddoek'), [55, 20, 15, 10]);
      const wears = hd.startsWith('Ja') ? 1 : 0;
      const druk = z() + 0.3 * wears;
      const disc = 0.55 * druk + 0.8 * z();
      const ident = 0.35 * disc + 0.25 * wears + 0.85 * z();
      const keuze = -0.35 * druk - 0.15 * disc + 0.3 * ident + 0.8 * z();
      const row = {
        tijdstip: '2026-10-01', volwassen: 'Ja', toestemming: 'Ja, ik geef toestemming',
        geslacht: pick(opts('geslacht'), [94, 2, 3, 1]), leeftijd: 18 + Math.floor(r() * 40),
        opleiding: pick(opts('opleiding'), [1, 8, 10, 25, 30, 20, 2, 3, 1]), moslim: pick(opts('moslim'), [96, 1, 3]),
        achtergrond: pick(opts('achtergrond'), [8, 30, 35, 4, 2, 5, 3, 2, 2, 2, 3, 2, 2]), hoofddoek: hd,
        moeder_hoofddoek: pick(opts('moeder_hoofddoek'), [60, 15, 20, 2, 3]),
        religiositeit: Math.max(1, Math.min(10, Math.round(7 + 1.5 * ident + z()))),
        gebed: pick(opts('gebed'), [45, 20, 15, 10, 5, 5]), madhhab: pick(opts('madhhab'), [30, 30, 5, 3, 20, 8, 3, 1]),
        interview: pick(opts('interview'), [30, 70]), disc_oorzaak: pick(['Mijn hoofddoek; Mijn religie / islamitische identiteit', 'Mijn etnische of culturele achtergrond', 'Niet van toepassing', ''], [3, 2, 2, 1]),
        duur_sec: 300 + Math.floor(r() * 400)
      };
      for (let k = 1; k <= 8; k++) row['druk' + k] = cut(0.8 * druk + 0.6 * z(), 5);
      for (let k = 1; k <= 9; k++) row['disc' + k] = cut(0.75 * disc + 0.7 * z() - 0.3, 6);
      for (let k = 1; k <= 6; k++) row['id' + k] = cut(0.8 * ident + 0.5 * z() + 0.8, 5);
      for (let k = 1; k <= 6; k++) row['keuze' + k] = cut(0.8 * keuze + 0.6 * z() + 0.6, 5);
      rows.push(row);
    }
    return rows;
  }
  if (typeof module !== 'undefined') module.exports = { makeDemo }; else root.makeDemo = makeDemo;
})(this);
