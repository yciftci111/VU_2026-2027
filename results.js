// Resultatendashboard – leest antwoorden via Apps Script (met wachtwoord) en rekent alles in de browser uit.
(function () {
  'use strict';
  const S = window.Stats;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f = (x, d = 2) => (x === undefined || x === null || Number.isNaN(x)) ? '–' : (Math.abs(x) >= 1e5 ? x.toExponential(2) : x.toFixed(d));
  const f0 = x => f(x, 0);
  const fr = (x, d = 3) => { const s = f(x, d); return s.replace(/^(-?)0\./, '$1.'); }; // APA: geen voorloopnul voor r, p, β
  const fp = p => Number.isNaN(p) ? '–' : p < .001 ? '< .001' : fr(p, 3);
  const stars = p => p < .001 ? '***' : p < .01 ? '**' : p < .05 ? '*' : '';
  const pct = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '–';

  const ALLQ = SURVEY.pages.flatMap(p => p.questions);
  const QOPT = k => (ALLQ.find(q => q.key === k) || {}).options || [];
  const TABS = [
    ['overzicht', 'Overzicht'], ['betrouwbaarheid', 'Betrouwbaarheid'], ['factor', 'KMO & factoranalyse'], ['correlaties', 'Correlaties'],
    ['kruistabellen', 'Kruistabellen'], ['groepen', 'Groepsverschillen'], ['regressie', 'Regressie'], ['process', 'PROCESS Model 6'],
    ['open', 'Open antwoorden'], ['data', 'Data & export']
  ];

  let password = '', source = null, raw = [], rows = [], tab = 'overzicht';
  const ui = {
    efaItems: 'alle', efaN: 0, efaRot: 'promax', efaHide: true,
    ctRow: 'hoofddoek2', ctCol: 'interview',
    anDV: 'keuze', anG: 'hoofddoek',
    regY: 'keuze', regX: ['druk', 'disc', 'ident'],
    pX: 'druk', pM1: 'disc', pM2: 'ident', pY: 'keuze', pCov: [], pBoot: 5000, pSeed: 1234,
    openKey: 'reden_hoofddoek'
  };

  // ── Variabelen ─────────────────────────────────────────────
  const GEBED = { 'Altijd of bijna altijd': 5, 'Vaak': 4, 'Soms': 3, 'Zelden': 2, 'Nooit': 1 };
  const NUM = {
    druk:  { label: 'Maatschappelijke druk', get: r => r._druk },
    disc:  { label: 'Ervaren discriminatie', get: r => r._disc },
    ident: { label: 'Religieuze identiteit', get: r => r._ident },
    keuze: { label: 'Ervaren keuzevrijheid', get: r => r._keuze },
    religiositeit: { label: 'Religiositeit (1–10)', get: r => num(r.religiositeit) },
    gebed: { label: 'Gebedsfrequentie (1–5)', get: r => GEBED[r.gebed] ?? NaN },
    leeftijd: { label: 'Leeftijd', get: r => num(r.leeftijd) },
    draagt: { label: 'Draagt hoofddoek (1 = ja)', get: r => r.hoofddoek ? (String(r.hoofddoek).startsWith('Ja') ? 1 : 0) : NaN }
  };
  const ageGroup = a => Number.isNaN(a) ? '' : a < 25 ? '18–24' : a < 35 ? '25–34' : a < 45 ? '35–44' : '45+';
  const CAT = {
    geslacht: { label: 'Geslacht', get: r => r.geslacht },
    leeftijdsgroep: { label: 'Leeftijdsgroep', get: r => ageGroup(num(r.leeftijd)), order: ['18–24', '25–34', '35–44', '45+'] },
    opleiding: { label: 'Opleiding', get: r => r.opleiding },
    opleiding3: { label: 'Opleiding (3 niveaus)', get: r => ({ Basisonderwijs: 'Laag', Vmbo: 'Laag', 'Havo/vwo': 'Midden', Mbo: 'Midden', Hbo: 'Hoog', Wo: 'Hoog', PhD: 'Hoog' }[r.opleiding] || ''), order: ['Laag', 'Midden', 'Hoog'] },
    moslim: { label: 'Moslim', get: r => r.moslim },
    achtergrond: { label: 'Culturele achtergrond', get: r => r.achtergrond },
    hoofddoek: { label: 'Hoofddoek (4 categorieën)', get: r => r.hoofddoek },
    hoofddoek2: { label: 'Draagt hoofddoek (ja/nee)', get: r => r.hoofddoek ? (String(r.hoofddoek).startsWith('Ja') ? 'Draagt hoofddoek' : 'Draagt geen hoofddoek') : '', order: ['Draagt hoofddoek', 'Draagt geen hoofddoek'] },
    moeder_hoofddoek: { label: 'Moeder draagt(e) hoofddoek', get: r => r.moeder_hoofddoek },
    gebed: { label: 'Gebedsfrequentie', get: r => r.gebed },
    madhhab: { label: 'Rechtsschool (madhhab)', get: r => r.madhhab },
    interview: { label: 'Bereid tot interview', get: r => r.interview }
  };
  for (const k of Object.keys(CAT)) if (!CAT[k].order && QOPT(k).length) CAT[k].order = QOPT(k);
  function num(v) { if (v === '' || v === null || v === undefined) return NaN; const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : NaN; }

  function prepare(list) {
    return list.filter(r => String(r.toestemming || '').startsWith('Ja')).map(r => {
      const o = { ...r };
      for (const [s, d] of Object.entries(SCALES)) {
        d.items.forEach(i => o[i] = num(r[i]));
        const v = d.items.map(i => o[i]);
        o['_' + s] = v.some(Number.isNaN) ? NaN : S.mean(v);
      }
      return o;
    });
  }
  function applyFilters() {
    const all = prepare(raw);
    rows = all.filter(r => (!$('#fVrouw').checked || r.geslacht === 'Vrouw') && (!$('#fMoslim').checked || r.moslim === 'Ja') && (!$('#fSnel').checked || !(num(r.duur_sec) < 120)));
    $('#nInfo').textContent = `n = ${rows.length} van ${all.length} volledige deelnemers`;
  }
  // Listwise: haal kolommen op en verwijder rijen met missende waarden
  function cols(getters) {
    const out = getters.map(() => []);
    rows.forEach(r => { const v = getters.map(g => g(r)); if (v.every(x => typeof x === 'number' ? !Number.isNaN(x) : x !== '' && x != null)) v.forEach((x, i) => out[i].push(x)); });
    return out;
  }

  // ── Kleine UI-bouwstenen ──────────────────────────────────
  const card = (title, body, extra = '') => `<section class="card"${extra}>${title ? `<h3>${title}</h3>` : ''}${body}</section>`;
  const table = (head, body, foot = '') => `<div class="tbl-wrap"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr${r.cls ? ` class="${r.cls}"` : ''}>${(r.cells || r).map(c => typeof c === 'object' && c !== null ? `<td class="${c.c || ''}">${c.v}</td>` : `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${foot ? `<p class="note">${foot}</p>` : ''}`;
  const select = (id, opts, val, label) => `<label>${label}<select data-ui="${id}">${opts.map(([k, l]) => `<option value="${esc(k)}" ${String(k) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  const numOpts = keys => (keys || Object.keys(NUM)).map(k => [k, NUM[k].label]);
  const catOpts = () => Object.entries(CAT).map(([k, v]) => [k, v.label]);
  const alphaBadge = a => a >= .8 ? `<span class="badge good">goed</span>` : a >= .7 ? `<span class="badge good">acceptabel</span>` : a >= .6 ? `<span class="badge warn">matig</span>` : `<span class="badge bad">onvoldoende</span>`;
  const tooFew = (n, min = 10) => n < min ? `<div class="notice">Te weinig volledige waarnemingen voor deze analyse (n = ${n}; minimaal ${min} nodig).</div>` : '';

  function freqBlock(key, label, multi = false) {
    const vals = rows.map(r => r[key]).filter(v => v !== '' && v != null);
    const counts = {};
    vals.forEach(v => (multi ? String(v).split(';').map(s => s.trim()).filter(Boolean) : [String(v)]).forEach(x => counts[x] = (counts[x] || 0) + 1));
    const order = QOPT(key).length ? [...QOPT(key), ...Object.keys(counts).filter(k => !QOPT(key).includes(k))] : Object.keys(counts);
    const items = order.filter(k => counts[k]);
    const base = multi ? rows.filter(r => r[key]).length : vals.length;
    const max = Math.max(1, ...items.map(k => counts[k]));
    const others = rows.map(r => r[key + '_anders']).filter(Boolean);
    return card(esc(label) + (multi ? ' <span class="badge">meerdere antwoorden</span>' : ''), items.length ? `<div class="freq">${items.map(k =>
      `<span>${esc(k)}</span><span class="bar" title="${esc(k)}: ${counts[k]} (${pct(counts[k], base)})"><i style="width:${100 * counts[k] / max}%"></i></span><span class="n">${counts[k]} · ${pct(counts[k], base)}</span>`).join('')}</div>
      ${others.length ? `<p class="note">“Anders”: ${others.map(esc).join(' · ')}</p>` : ''}<p class="note">n = ${base}</p>` : '<p class="muted">Nog geen antwoorden.</p>');
  }

  // ── Tabbladen ─────────────────────────────────────────────
  const R = {};

  R.overzicht = () => {
    const interviewJa = rows.filter(r => String(r.interview).startsWith('Ja')).length;
    const dur = rows.map(r => num(r.duur_sec)).filter(x => !Number.isNaN(x));
    const ages = rows.map(r => num(r.leeftijd)).filter(x => !Number.isNaN(x));
    let h = `<div class="tiles">
      <div class="tile"><div class="v">${rows.length}</div><div class="l">deelnemers (na filters)</div></div>
      <div class="tile"><div class="v">${ages.length ? f(S.mean(ages), 1) : '–'}</div><div class="l">gemiddelde leeftijd${ages.length > 1 ? ` (SD ${f(S.sd(ages), 1)})` : ''}</div></div>
      <div class="tile"><div class="v">${pct(interviewJa, rows.length)}</div><div class="l">bereid tot interview (${interviewJa})</div></div>
      <div class="tile"><div class="v">${dur.length ? f(S.describe(dur).median / 60, 1) : '–'}</div><div class="l">mediane invulduur (min)</div></div>
    </div>`;
    // Schaalscores
    const body = Object.entries(SCALES).map(([s, d]) => {
      const v = rows.map(r => r['_' + s]).filter(x => !Number.isNaN(x));
      if (v.length < 2) return [d.name, v.length, '–', '–', '–', '–', '–', '–', '–'];
      const ds = S.describe(v);
      return [`${d.name} <span class="muted small">(${d.items.length} items, ${d.range[0]}–${d.range[1]})</span>`, ds.n, f(ds.mean), f(ds.sd), f(ds.median), f(ds.min), f(ds.max), f(ds.skew), f(ds.kurt)];
    });
    const rel = rows.map(r => num(r.religiositeit)).filter(x => !Number.isNaN(x));
    if (rel.length > 1) { const ds = S.describe(rel); body.push(['Religiositeit <span class="muted small">(1–10)</span>', ds.n, f(ds.mean), f(ds.sd), f(ds.median), f(ds.min), f(ds.max), f(ds.skew), f(ds.kurt)]); }
    if (ages.length > 1) { const ds = S.describe(ages); body.push(['Leeftijd', ds.n, f(ds.mean, 1), f(ds.sd, 1), f(ds.median, 1), f0(ds.min), f0(ds.max), f(ds.skew), f(ds.kurt)]); }
    h += card('Beschrijvende statistiek schaalscores', table(['Schaal', 'n', 'M', 'SD', 'Mediaan', 'Min', 'Max', 'Scheefheid', 'Kurtosis'], body,
      'Schaalscore = gemiddelde van de items (hoger = meer druk / discriminatie / identiteit / keuzevrijheid). Scheefheid en kurtosis tussen −2 en +2 worden doorgaans als acceptabel beschouwd.'));
    h += '<div class="grid">' + [['hoofddoek', 'Draagt momenteel een hoofddoek'], ['geslacht', 'Geslacht'], ['opleiding', 'Opleidingsniveau'], ['achtergrond', 'Culturele achtergrond'],
      ['moeder_hoofddoek', 'Moeder draagt(e) hoofddoek'], ['gebed', 'Frequentie vijf dagelijkse gebeden'], ['madhhab', 'Rechtsschool (madhhab)'], ['interview', 'Bereid tot interview']]
      .map(([k, l]) => freqBlock(k, l)).join('') + freqBlock('disc_oorzaak', 'Toegeschreven oorzaak discriminatie', true) + '</div>';
    return h;
  };

  R.betrouwbaarheid = () => {
    let h = `<p class="muted">Cronbach’s α per schaal, met gecorrigeerde item-totaalcorrelatie (r<sub>it</sub>) en α als het item wordt verwijderd. McDonald’s ω (op basis van een één-factormodel) is als aanvulling vermeld. Vuistregels: α ≥ .70 acceptabel, ≥ .80 goed; r<sub>it</sub> ≥ .30.</p><div class="grid">`;
    const summary = [];
    for (const [s, d] of Object.entries(SCALES)) {
      const c = cols(d.items.map(i => r => r[i]));
      if (c[0].length < 5) { h += card(esc(d.name), tooFew(c[0].length, 5)); continue; }
      const a = S.cronbach(c);
      summary.push([d.name, a.k, a.n, fr(a.alpha), fr(a.alphaStd), fr(a.omega), fr(a.meanInterItem)]);
      const body = d.items.map((it, j) => {
        const q = ALLQ.find(x => x.key === it), row = a.items[j];
        return [`<b>${it}</b> <span class="muted small">${esc(q.label)}</span>`, f(row.mean), f(row.sd), { v: fr(row.rit), c: row.rit < .3 ? 'flag' : '' }, { v: fr(row.alphaIfDeleted), c: row.alphaIfDeleted > a.alpha + .005 ? 'flag' : '' }];
      });
      const weak = d.items.filter((_, j) => a.items[j].rit < .3 || a.items[j].alphaIfDeleted > a.alpha + .005);
      h += card(`${esc(d.name)} <span class="badge">α = ${fr(a.alpha)}</span>${alphaBadge(a.alpha)}`,
        `<p class="small muted">k = ${a.k} items · n = ${a.n} · gestandaardiseerde α = ${fr(a.alphaStd)} · ω = ${fr(a.omega)} · gem. inter-itemcorrelatie = ${fr(a.meanInterItem)}</p>` +
        table(['Item', 'M', 'SD', 'r<sub>it</sub>', 'α zonder item'], body) +
        `<div class="interp">De schaal ${esc(d.name.toLowerCase())} heeft een ${a.alpha >= .8 ? 'goede' : a.alpha >= .7 ? 'acceptabele' : a.alpha >= .6 ? 'matige' : 'onvoldoende'} interne consistentie (α = ${fr(a.alpha, 2)}).${weak.length ? ` Let op item(s) ${weak.join(', ')}: lage item-totaalcorrelatie en/of α stijgt bij verwijdering.` : ' Alle items dragen bij aan de schaal.'}</div>`);
    }
    h += '</div>';
    if (summary.length) h = card('Samenvatting', table(['Schaal', 'Items', 'n', 'α', 'α (gest.)', 'ω', 'r̄ inter-item'], summary)) + h;
    return h;
  };

  R.factor = () => {
    const sets = { alle: ['Alle schaalitems (29)', Object.values(SCALES).flatMap(d => d.items)], ...Object.fromEntries(Object.entries(SCALES).map(([s, d]) => [s, [d.name + ` (${d.items.length})`, d.items]])) };
    const items = sets[ui.efaItems][1];
    const c = cols(items.map(i => r => r[i]));
    const n = c[0].length, p = items.length;
    let h = `<div class="controls">${select('efaItems', Object.entries(sets).map(([k, v]) => [k, v[0]]), ui.efaItems, 'Items')}</div>`;
    if (n < p + 2 || n < 10) return h + tooFew(n, Math.max(10, p + 2)) + `<p class="note">Voor een factoranalyse is een ruime steekproef nodig (vuistregel: minstens 5–10 respondenten per item, idealiter n ≥ 150).</p>`;
    let e0;
    try { e0 = S.efa(c, 1, 'none'); } catch (err) { return h + `<div class="notice error">${esc(err.message)}</div>`; }
    const k = S.kmo(e0.R), b = S.bartlett(e0.R, n);
    const pa = S.parallelAnalysis(n, p, 100);
    const kaiser = e0.eigen.filter(v => v > 1).length;
    let paN = 0; while (paN < p && e0.eigen[paN] > pa.p95[paN]) paN++;
    const def = ui.efaItems === 'alle' ? 4 : 1;
    const nf = Math.min(p - 1, Math.max(1, ui.efaN || def));

    h += `<div class="grid">` + card('Geschiktheid van de data',
      table(['Toets', 'Waarde', 'Oordeel'], [
        ['Kaiser-Meyer-Olkin (KMO)', fr(k.kmo), `<span class="badge ${k.kmo >= .7 ? 'good' : k.kmo >= .6 ? 'warn' : 'bad'}">${S.kmoLabel(k.kmo)}</span>`],
        [`Bartlett’s toets op sfericiteit`, `χ²(${b.df}) = ${f(b.chi2)}`, `p ${fp(b.p).startsWith('<') ? fp(b.p) : '= ' + fp(b.p)}`],
        ['n / items', `${n} / ${p}`, `${f(n / p, 1)} per item`]
      ]) + `<div class="interp">KMO = ${fr(k.kmo, 2)} (${S.kmoLabel(k.kmo)}) en Bartlett’s toets is ${b.p < .05 ? 'significant' : 'niet significant'} (χ²(${b.df}) = ${f(b.chi2, 2)}, p ${fp(b.p).startsWith('<') ? fp(b.p) : '= ' + fp(b.p)}); de data zijn ${k.kmo >= .6 && b.p < .05 ? 'geschikt' : 'mogelijk niet geschikt'} voor factoranalyse.</div>`)
      + card('Aantal factoren', screePlot(e0.eigen, pa.p95) +
        `<p class="small">Kaiser-criterium (eigenwaarde > 1): <b>${kaiser}</b> · Parallelle analyse (Horn, 95e percentiel): <b>${paN}</b> factor(en)${ui.efaItems === 'alle' ? ' · Theoretisch verwacht: <b>4</b>' : ''}</p>`) + `</div>`;

    let e;
    try { e = S.efa(c, nf, nf > 1 ? ui.efaRot : 'none'); } catch (err) { return h + `<div class="notice error">${esc(err.message)}</div>`; }
    const order = S.sortLoadings(e.loadings);
    const thr = ui.efaHide ? .3 : -1;
    const head = ['Item', ...Array.from({ length: nf }, (_, j) => 'F' + (j + 1)), 'h²', 'MSA'];
    const body = order.map(i => {
      const r = e.loadings[i], maxj = r.reduce((b2, v, j) => Math.abs(v) > Math.abs(r[b2]) ? j : b2, 0);
      const cross = r.filter(v => Math.abs(v) >= .3).length > 1;
      return [`<b title="${esc((ALLQ.find(q => q.key === items[i]) || {}).label)}">${items[i]}</b>${cross ? ' <span class="flag small">kruislading</span>' : ''}`, ...r.map((v, j) => ({ v: Math.abs(v) >= thr ? fr(v, 2) : '', c: j === maxj ? 'hi' : 'dim' })), fr(e.extraction.communalities[i], 2), { v: fr(k.msa[items.indexOf(items[i])] ?? NaN, 2), c: k.msa[i] < .6 ? 'flag' : '' }];
    });
    body.push({ cls: 'sub', cells: ['SS-ladingen', ...e.ssLoadings.map(v => f(v, 2)), '', ''] });
    if (nf > 1 && ui.efaRot !== 'promax') body.push({ cls: 'sub', cells: ['% verklaarde variantie', ...e.propVar.map(v => f(100 * v, 1)), f(100 * S.mean(e.propVar) * nf, 1), ''] });
    const ctrl = `<div class="controls">
      <label>Aantal factoren<input type="number" data-ui="efaN" min="1" max="${p - 1}" value="${nf}"></label>
      ${select('efaRot', [['promax', 'Promax (oblique)'], ['varimax', 'Varimax (orthogonaal)'], ['none', 'Geen rotatie']], ui.efaRot, 'Rotatie')}
      <div class="checks"><label><input type="checkbox" data-ui="efaHide" ${ui.efaHide ? 'checked' : ''}> Ladingen &lt; .30 verbergen</label></div></div>`;
    h += card(`Patroonmatrix – principal axis factoring, ${nf} factor(en), ${nf > 1 ? { promax: 'promax', varimax: 'varimax', none: 'ongeroteerd' }[ui.efaRot] : 'ongeroteerd'}`,
      ctrl + table(head, body, `Extractie: principal axis factoring (iteratief, ${e.iterations} iteraties${e.converged ? '' : ', niet geconvergeerd!'}). Vetgedrukt = hoogste lading per item. h² = communaliteit. MSA = measure of sampling adequacy per item (&lt; .60 gemarkeerd).`));
    if (e.phi) h += card('Factorcorrelaties (promax)', table(['', ...e.phi.map((_, j) => 'F' + (j + 1))], e.phi.map((r, i) => ['F' + (i + 1), ...r.map((v, j) => j === i ? '1' : fr(v, 2))])));
    return h;
  };

  function screePlot(ev, pa) {
    const W = 520, H = 220, m = { l: 36, r: 12, t: 12, b: 28 }, k = Math.min(ev.length, 15);
    const ymax = Math.ceil(Math.max(ev[0], pa[0], 1.5)), x = i => m.l + i * (W - m.l - m.r) / Math.max(1, k - 1), y = v => m.t + (H - m.t - m.b) * (1 - v / ymax);
    const path = a => a.slice(0, k).map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
    let g = '';
    for (let t = 0; t <= ymax; t += ymax > 6 ? 2 : 1) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)" stroke-width="1"/><text x="${m.l - 6}" y="${y(t) + 4}" text-anchor="end" font-size="11">${t}</text>`;
    for (let i = 0; i < k; i++) g += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="11">${i + 1}</text>`;
    g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(1)}" y2="${y(1)}" stroke="var(--ink-3)" stroke-dasharray="2 3"/>`;
    g += `<path d="${path(pa)}" fill="none" stroke="var(--series-2)" stroke-width="2" stroke-dasharray="6 4"/>`;
    g += `<path d="${path(ev)}" fill="none" stroke="var(--series-1)" stroke-width="2"/>`;
    g += ev.slice(0, k).map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="4.5" fill="var(--series-1)" stroke="var(--surface)" stroke-width="2"><title>Factor ${i + 1}: eigenwaarde ${f(v)} · toeval (95%) ${f(pa[i])}</title></circle>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Screeplot">${g}</svg>
      <div class="legend"><span><i style="background:var(--series-1)"></i>Eigenwaarden (data)</span><span><i style="background:var(--series-2)"></i>Parallelle analyse (95%)</span><span><i style="background:var(--ink-3)"></i>Kaiser (1)</span></div>`;
  }

  R.correlaties = () => {
    const keys = Object.keys(NUM);
    const vals = keys.map(k => rows.map(NUM[k].get));
    const body = keys.map((k, i) => [`${i + 1}. ${esc(NUM[k].label)}`, ...keys.map((k2, j) => {
      if (j > i) return '';
      if (j === i) return '—';
      const x = [], y = []; vals[i].forEach((v, t) => { if (!Number.isNaN(v) && !Number.isNaN(vals[j][t])) { x.push(v); y.push(vals[j][t]); } });
      if (x.length < 4 || S.sd(x) === 0 || S.sd(y) === 0) return '–';
      const r = S.pearson(x, y);
      return { v: `<span title="r = ${f(r.r, 3)}, p = ${fp(r.p)}, n = ${r.n}">${fr(r.r, 2)}${stars(r.p)}</span>`, c: r.p < .05 ? 'hi' : '' };
    })]);
    return card('Pearson-correlaties', table(['Variabele', ...keys.map((_, i) => i + 1)], body,
      '* p &lt; .05 · ** p &lt; .01 · *** p &lt; .001 (tweezijdig). Paarsgewijze deletie; beweeg over een waarde voor p en n. Hoofddoek-dummy: puntbiseriële correlatie.'));
  };

  R.kruistabellen = () => {
    const ctrl = `<div class="controls">${select('ctRow', catOpts(), ui.ctRow, 'Rijvariabele')}${select('ctCol', catOpts(), ui.ctCol, 'Kolomvariabele')}</div>`;
    const [a, b] = cols([CAT[ui.ctRow].get, CAT[ui.ctCol].get]);
    if (a.length < 5) return card('Kruistabel', ctrl + tooFew(a.length, 5));
    const ct = S.crosstab(a, b);
    const ord = (list, k) => { const o = CAT[k].order || []; return [...list].sort((x, y) => (o.indexOf(x) + 1 || 999) - (o.indexOf(y) + 1 || 999)); };
    const rOrd = ord(ct.rows, ui.ctRow), cOrd = ord(ct.cols, ui.ctCol);
    const body = [];
    rOrd.forEach(rv => {
      const i = ct.rows.indexOf(rv);
      body.push([`<b>${esc(rv)}</b>`, ...cOrd.map(cv => ct.O[i][ct.cols.indexOf(cv)]), `<b>${ct.rs[i]}</b>`]);
      body.push({ cls: 'sub', cells: ['rij-%', ...cOrd.map(cv => pct(ct.O[i][ct.cols.indexOf(cv)], ct.rs[i])), '100%'] });
    });
    body.push(['<b>Totaal</b>', ...cOrd.map(cv => `<b>${ct.cs[ct.cols.indexOf(cv)]}</b>`), `<b>${ct.n}</b>`]);
    const sig = ct.p < .05;
    return card(`${esc(CAT[ui.ctRow].label)} × ${esc(CAT[ui.ctCol].label)}`, ctrl + table(['', ...cOrd.map(esc), 'Totaal'], body) +
      `<p><b>χ²(${ct.df}, N = ${ct.n}) = ${f(ct.chi2)}, p ${fp(ct.p).startsWith('<') ? fp(ct.p) : '= ' + fp(ct.p)}, Cramér’s V = ${fr(ct.V, 2)}</b></p>` +
      (ct.lowExpectedPct > 20 ? `<div class="notice">Let op: ${f(ct.lowExpectedPct, 0)}% van de cellen heeft een verwachte frequentie &lt; 5. De χ²-toets is dan onbetrouwbaar; voeg categorieën samen (bijv. “Draagt hoofddoek (ja/nee)” of “Opleiding (3 niveaus)”) of rapporteer Fisher’s exact test (SPSS).</div>` : '') +
      `<div class="interp">Er is ${sig ? 'een' : 'geen'} statistisch significant verband tussen ${esc(CAT[ui.ctRow].label.toLowerCase())} en ${esc(CAT[ui.ctCol].label.toLowerCase())}${sig ? ` (effectgrootte ${ct.V < .1 ? 'verwaarloosbaar' : ct.V < .3 ? 'klein' : ct.V < .5 ? 'middelgroot' : 'groot'})` : ''}.</div>`);
  };

  R.groepen = () => {
    const ctrl = `<div class="controls">${select('anDV', numOpts(['druk', 'disc', 'ident', 'keuze', 'religiositeit', 'leeftijd']), ui.anDV, 'Afhankelijke variabele')}${select('anG', catOpts(), ui.anG, 'Groepen')}</div>`;
    const [y, g] = cols([NUM[ui.anDV].get, CAT[ui.anG].get]);
    const groups = [...new Set(g)];
    if (y.length < 5 || groups.length < 2) return card('Eenweg-ANOVA', ctrl + tooFew(y.length, 5) + (groups.length < 2 ? '<div class="notice">Minstens twee groepen nodig.</div>' : ''));
    const a = S.anova(y, g), o = CAT[ui.anG].order || [];
    a.groups.sort((p, q) => (o.indexOf(p.group) + 1 || 999) - (o.indexOf(q.group) + 1 || 999));
    const body = a.groups.map(s => [esc(s.group), s.n, f(s.mean), f(s.sd)]);
    let extra = '';
    if (groups.length === 2) { const d = (a.groups[0].mean - a.groups[1].mean) / Math.sqrt(((a.groups[0].n - 1) * a.groups[0].sd ** 2 + (a.groups[1].n - 1) * a.groups[1].sd ** 2) / (a.groups[0].n + a.groups[1].n - 2)); extra = ` · t(${a.df2}) = ${f(Math.sqrt(a.F) * Math.sign(a.groups[0].mean - a.groups[1].mean))}, Cohen’s d = ${f(d)}`; }
    const small = a.groups.filter(s => s.n < 5).length;
    return card(`${esc(NUM[ui.anDV].label)} naar ${esc(CAT[ui.anG].label.toLowerCase())}`, ctrl + table(['Groep', 'n', 'M', 'SD'], body) +
      `<p><b>F(${a.df1}, ${a.df2}) = ${f(a.F)}, p ${fp(a.p).startsWith('<') ? fp(a.p) : '= ' + fp(a.p)}, η² = ${fr(a.eta2, 3)}</b>${extra}</p>` +
      (small ? `<div class="notice">${small} groep(en) met n &lt; 5; overweeg categorieën samen te voegen.</div>` : '') +
      `<div class="interp">De gemiddelde ${esc(NUM[ui.anDV].label.toLowerCase())} verschilt ${a.p < .05 ? '' : 'niet '}significant tussen de groepen${a.p < .05 ? ` (η² = ${fr(a.eta2, 2)}: ${a.eta2 < .06 ? 'klein' : a.eta2 < .14 ? 'middelgroot' : 'groot'} effect). Gebruik post-hoc toetsen (bijv. Tukey in SPSS) om te zien welke groepen verschillen` : ''}.</div>`);
  };

  R.regressie = () => {
    const opts = Object.keys(NUM);
    const ctrl = `<div class="controls">${select('regY', numOpts(), ui.regY, 'Afhankelijke variabele (Y)')}
      <label>Predictoren<div class="checks">${opts.filter(k => k !== ui.regY).map(k => `<label><input type="checkbox" data-uilist="regX" value="${k}" ${ui.regX.includes(k) ? 'checked' : ''}> ${esc(NUM[k].label)}</label>`).join('')}</div></label></div>`;
    const xs = ui.regX.filter(k => k !== ui.regY);
    if (!xs.length) return card('Meervoudige lineaire regressie', ctrl + '<div class="notice">Kies minstens één predictor.</div>');
    const c = cols([NUM[ui.regY].get, ...xs.map(k => NUM[k].get)]);
    if (c[0].length < xs.length + 5) return card('Meervoudige lineaire regressie', ctrl + tooFew(c[0].length, xs.length + 5));
    let m; try { m = S.ols(c[0], c.slice(1), xs.map(k => NUM[k].label)); } catch (e) { return card('Regressie', ctrl + `<div class="notice error">${esc(e.message)}</div>`); }
    const body = m.coefs.map((k, j) => [esc(k.name), f(k.b, 3), f(k.se, 3), j ? fr(k.beta, 3) : '', f(k.t, 2), { v: fp(k.p), c: k.p < .05 && j ? 'hi' : '' }, `[${f(k.llci, 3)}, ${f(k.ulci, 3)}]`, j && m.vif.length ? { v: f(m.vif[j - 1], 2), c: m.vif[j - 1] > 5 ? 'flag' : '' } : '']);
    const sigs = m.coefs.slice(1).filter(k => k.p < .05);
    return card(`Regressie van ${esc(NUM[ui.regY].label.toLowerCase())}`, ctrl +
      `<p><b>R² = ${fr(m.R2, 3)}, R²<sub>adj</sub> = ${fr(m.adjR2, 3)}, F(${m.df1}, ${m.df2}) = ${f(m.F)}, p ${fp(m.p).startsWith('<') ? fp(m.p) : '= ' + fp(m.p)}</b> · n = ${m.n}</p>` +
      table(['', 'B', 'SE', 'β', 't', 'p', '95%-BI (B)', 'VIF'], body, 'OLS, listwise deletie. VIF &gt; 5 wijst op multicollineariteit.') +
      `<div class="interp">Het model verklaart ${f(100 * m.R2, 1)}% van de variantie in ${esc(NUM[ui.regY].label.toLowerCase())}. ${sigs.length ? 'Significante voorspellers: ' + sigs.map(k => `${esc(k.name.toLowerCase())} (β = ${fr(k.beta, 2)})`).join(', ') + '.' : 'Geen van de predictoren is significant.'}</div>`);
  };

  R.process = () => {
    const opts = numOpts();
    const covOpts = Object.keys(NUM).filter(k => ![ui.pX, ui.pM1, ui.pM2, ui.pY].includes(k));
    const ctrl = `<div class="controls">${select('pX', opts, ui.pX, 'X (onafhankelijk)')}${select('pM1', opts, ui.pM1, 'M1 (mediator 1)')}${select('pM2', opts, ui.pM2, 'M2 (mediator 2)')}${select('pY', opts, ui.pY, 'Y (afhankelijk)')}
      ${select('pBoot', [[1000, '1.000'], [5000, '5.000'], [10000, '10.000']], ui.pBoot, 'Bootstrap-samples')}
      <label>Seed<input type="number" data-ui="pSeed" value="${ui.pSeed}" style="min-width:110px"></label></div>
      <div class="controls"><label>Covariaten<div class="checks">${covOpts.map(k => `<label><input type="checkbox" data-uilist="pCov" value="${k}" ${ui.pCov.includes(k) ? 'checked' : ''}> ${esc(NUM[k].label)}</label>`).join('')}</div></label></div>`;
    const roles = [ui.pX, ui.pM1, ui.pM2, ui.pY];
    if (new Set(roles).size < 4) return card('PROCESS Model 6', ctrl + '<div class="notice">Kies vier verschillende variabelen voor X, M1, M2 en Y.</div>');
    const covs = ui.pCov.filter(k => !roles.includes(k));
    const c = cols([...roles, ...covs].map(k => NUM[k].get));
    if (c[0].length < 20) return card('PROCESS Model 6', ctrl + tooFew(c[0].length, 20));
    const nm = { X: NUM[ui.pX].label, M1: NUM[ui.pM1].label, M2: NUM[ui.pM2].label, Y: NUM[ui.pY].label };
    let r; try { r = S.process6(c[0], c[1], c[2], c[3], c.slice(4), covs.map(k => NUM[k].label), { boot: +ui.pBoot, seed: +ui.pSeed, names: nm }); }
    catch (e) { return card('PROCESS Model 6', ctrl + `<div class="notice error">${esc(e.message)}</div>`); }

    const modelTbl = (title, m) => `<h4 style="margin:18px 0 6px">${esc(title)}</h4>
      <p class="small">R = ${fr(m.R, 4)}, R² = ${fr(m.R2, 4)}, MSE = ${f(m.mse, 4)}, F(${m.df1}, ${m.df2}) = ${f(m.F, 4)}, p ${fp(m.p).startsWith('<') ? fp(m.p) : '= ' + fp(m.p)}</p>` +
      table(['', 'coeff', 'se', 't', 'p', 'LLCI', 'ULCI'], m.coefs.map(k => [esc(k.name), f(k.b, 4), f(k.se, 4), f(k.t, 4), { v: fp(k.p), c: k.p < .05 && k.name !== 'constante' ? 'hi' : '' }, f(k.llci, 4), f(k.ulci, 4)]));
    const eff = (m, j) => m.coefs[j];
    const tot = eff(r.models.total, 1), dir = eff(r.models.Y, 1);
    const indBody = r.indirect.map(i => { const sig = i.llci > 0 || i.ulci < 0; return [esc(i.label), f(i.effect, 4), f(i.se, 4), { v: f(i.llci, 4), c: sig ? 'hi' : '' }, { v: f(i.ulci, 4), c: sig ? 'hi' : '' }, f(i.std, 4), `[${f(i.stdCI.llci, 4)}, ${f(i.stdCI.ulci, 4)}]`, sig ? '<span class="badge good">ja</span>' : '<span class="badge">nee</span>']; });
    const sigInd = r.indirect.slice(1).filter(i => i.llci > 0 || i.ulci < 0);
    const P = r.paths, pm = { a1: r.models.M1.coefs[1].p, a2: r.models.M2.coefs[1].p, d21: r.models.M2.coefs[2].p, b1: r.models.Y.coefs[2].p, b2: r.models.Y.coefs[3].p, cp: r.models.Y.coefs[1].p };

    return card('PROCESS Model 6 – seriële mediatie', ctrl + diagram(nm, P, pm) +
      `<p class="small muted">n = ${r.n} · ${r.boot.toLocaleString('nl-NL')} percentiel-bootstrapsamples · ${r.conf}%-betrouwbaarheidsintervallen · seed ${r.seed}${covs.length ? ' · covariaten: ' + covs.map(k => esc(NUM[k].label)).join(', ') : ''}</p>`) +
      card('Indirecte effecten van X op Y', table(['Pad', 'Effect', 'BootSE', 'BootLLCI', 'BootULCI', 'Volledig gestand.', '95%-BI (gestand.)', 'Significant'], indBody,
        'Een indirect effect is significant als het bootstrap-betrouwbaarheidsinterval de 0 niet bevat. Volledig gestandaardiseerd effect = effect × SD<sub>X</sub> / SD<sub>Y</sub>.') +
        table(['Effect', 'coeff', 'se', 't', 'p', 'LLCI', 'ULCI'], [
          ['Totaal effect (c)', f(tot.b, 4), f(tot.se, 4), f(tot.t, 4), fp(tot.p), f(tot.llci, 4), f(tot.ulci, 4)],
          ['Direct effect (c′)', f(dir.b, 4), f(dir.se, 4), f(dir.t, 4), fp(dir.p), f(dir.llci, 4), f(dir.ulci, 4)]
        ]) +
        `<div class="interp">${sigInd.length ? `Er is sprake van significante mediatie via: ${sigInd.map(i => esc(i.label.replace(/^Ind\d: /, ''))).join('; ')}.` : 'Geen van de specifieke indirecte effecten is significant.'}
          Het directe effect van ${esc(nm.X.toLowerCase())} op ${esc(nm.Y.toLowerCase())} is ${dir.p < .05 ? '' : 'niet '}significant (c′ = ${f(dir.b, 3)}, p ${fp(dir.p).startsWith('<') ? fp(dir.p) : '= ' + fp(dir.p)})${sigInd.length ? (dir.p < .05 ? ', wat wijst op partiële mediatie.' : ', wat past bij volledige (indirect-only) mediatie.') : '.'}</div>`) +
      card('Modeluitkomsten (zoals in PROCESS-output)', modelTbl(`Uitkomst: ${nm.M1} (M1)`, r.models.M1) + modelTbl(`Uitkomst: ${nm.M2} (M2)`, r.models.M2) + modelTbl(`Uitkomst: ${nm.Y} (Y)`, r.models.Y) + modelTbl(`Totaal-effectmodel – uitkomst: ${nm.Y}`, r.models.total) +
        `<p class="note">Coëfficiënten zijn ongestandaardiseerd (OLS), identiek aan Hayes’ PROCESS v4 Model 6. Bootstrapgrenzen kunnen door toeval minimaal afwijken van SPSS; gebruik dezelfde seed voor reproduceerbaarheid binnen dit dashboard.</p>`);
  };

  function diagram(nm, P, pm) {
    const W = 780, H = 290, BW = 196, BH = 50;
    const short = t => t.length > 26 ? t.slice(0, 25) + '…' : t;
    const box = ([x, y], role, t) => `<rect x="${x - BW / 2}" y="${y - BH / 2}" width="${BW}" height="${BH}" rx="10" fill="var(--surface-2)" stroke="var(--ink-3)"/>
      <text x="${x}" y="${y - 6}" text-anchor="middle" font-size="11">${role}</text><text x="${x}" y="${y + 13}" text-anchor="middle" font-size="12.5" style="fill:var(--ink);font-weight:600">${esc(short(t))}</text>`;
    const lab = (v, p) => `${f(v, 3)}${stars(p)}`;
    const arrow = (x1, y1, x2, y2, t, lx, ly, sig, anchor = 'middle') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${sig ? 'var(--accent)' : 'var(--ink-3)'}" stroke-width="${sig ? 2.2 : 1.5}" ${sig ? '' : 'stroke-dasharray="5 4"'} marker-end="url(#ah${sig ? 's' : ''})"/>
      <text x="${lx}" y="${ly}" text-anchor="${anchor}" font-size="12" style="fill:var(--ink);paint-order:stroke;stroke:var(--surface);stroke-width:4px">${t}</text>`;
    const X = [110, 235], M1 = [255, 70], M2 = [525, 70], Y = [670, 235];
    return `<div class="tbl-wrap"><svg viewBox="0 0 ${W} ${H}" width="100%" style="min-width:600px" role="img" aria-label="Padmodel seriële mediatie">
      <defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink-3)"/></marker>
      <marker id="ahs" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--accent)"/></marker></defs>
      ${arrow(X[0] + 20, X[1] - BH / 2, M1[0] - 40, M1[1] + BH / 2 + 2, 'a1 = ' + lab(P.a1, pm.a1), 150, 150, pm.a1 < .05, 'end')}
      ${arrow(M1[0] + BW / 2, M1[1], M2[0] - BW / 2 - 2, M2[1], 'd21 = ' + lab(P.d21, pm.d21), (M1[0] + M2[0]) / 2, M1[1] - BH / 2 - 8, pm.d21 < .05)}
      ${arrow(M2[0] + 40, M2[1] + BH / 2, Y[0] - 10, Y[1] - BH / 2 - 2, 'b2 = ' + lab(P.b2, pm.b2), 640, 150, pm.b2 < .05, 'start')}
      ${arrow(X[0] + 70, X[1] - BH / 2, M2[0] - 60, M2[1] + BH / 2 + 2, 'a2 = ' + lab(P.a2, pm.a2), 330, 172, pm.a2 < .05)}
      ${arrow(M1[0] + 60, M1[1] + BH / 2, Y[0] - 70, Y[1] - BH / 2 - 2, 'b1 = ' + lab(P.b1, pm.b1), 470, 172, pm.b1 < .05)}
      ${arrow(X[0] + BW / 2, X[1], Y[0] - BW / 2 - 2, Y[1], `c′ = ${lab(P.cp, pm.cp)}   (totaal c = ${f(P.c, 3)})`, (X[0] + Y[0]) / 2, X[1] + 22, pm.cp < .05)}
      ${box(X, 'X', nm.X)}${box(M1, 'M1', nm.M1)}${box(M2, 'M2', nm.M2)}${box(Y, 'Y', nm.Y)}
    </svg></div><p class="note">Ongestandaardiseerde coëfficiënten. Doorgetrokken groene pijl = significant (p &lt; .05); gestippeld = niet significant. * p &lt; .05 · ** p &lt; .01 · *** p &lt; .001</p>`;
  }

  R.open = () => {
    const keys = ALLQ.filter(q => q.type === 'textarea');
    const q = keys.find(k => k.key === ui.openKey) || keys[0];
    const answers = rows.map(r => String(r[q.key] || '').trim()).filter(Boolean);
    return card('Open antwoorden', `<div class="controls">${select('openKey', keys.map(k => [k.key, k.label.length > 80 ? k.label.slice(0, 78) + '…' : k.label]), q.key, 'Vraag')}</div>
      <p class="small muted">${answers.length} antwoord(en) · ${esc(q.label)}</p>
      ${answers.length ? `<ul class="open-list">${answers.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : '<p class="muted">Nog geen antwoorden op deze vraag.</p>'}`);
  };

  R.data = () => card('Exporteren', `<p>Download de (gefilterde) data als CSV voor SPSS, JASP, R of Excel. Likert-items zijn gecodeerd als 1 = eerste antwoordoptie (bijv. “Helemaal mee oneens” / “Nooit”) t/m 5 of 6. Schaalscores staan in de kolommen <code>schaal_*</code>.</p>
      <div class="nav" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn primary" data-act="csv">CSV downloaden (${rows.length} rijen)</button><button class="btn" data-act="print">Dit dashboard afdrukken / PDF</button></div>
      <p class="note">Bron: ${source === 'demo' ? '<b>gesimuleerde voorbeelddata</b> (niet voor rapportage)' : 'Google Sheet via Apps Script'}. Interview-aanmeldingen (naam/e-mail) staan in een aparte spreadsheet en worden hier nooit getoond.</p>`)
    + card('Werkwijze & kanttekeningen', `<ul class="small">
      <li>Alleen deelnemers die 18+ zijn en toestemming gaven worden opgeslagen. Schaalscores worden alleen berekend als alle items van die schaal zijn ingevuld.</li>
      <li>Analyses gebruiken listwise deletie per analyse; n kan daardoor per tabblad verschillen.</li>
      <li>Factoranalyse: principal axis factoring met SMC-startwaarden, promax (κ = 4) of varimax (Kaiser-normalisatie) – gelijk aan SPSS/R. Parallelle analyse met 100 gesimuleerde datasets.</li>
      <li>Alle berekeningen zijn gecontroleerd tegen R/Python (α, KMO, Bartlett, PAF, rotaties, OLS, PROCESS-paden). Controleer de uiteindelijke rapportage bij voorkeur nog in SPSS met de PROCESS-macro.</li></ul>`);

  // ── CSV ────────────────────────────────────────────────────
  function downloadCSV() {
    const keys = [...new Set(rows.flatMap(r => Object.keys(r)))].filter(k => !k.startsWith('_'));
    const all = [...keys, ...Object.keys(SCALES).map(s => 'schaal_' + s)];
    const q = v => { const s = v === undefined || v === null || (typeof v === 'number' && Number.isNaN(v)) ? '' : String(v); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const lines = [all.join(',')].concat(rows.map(r => all.map(k => k.startsWith('schaal_') ? q(Number.isNaN(r['_' + k.slice(7)]) ? '' : r['_' + k.slice(7)].toFixed(4)) : q(r[k])).join(',')));
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `enquete-data-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ── Render & events ───────────────────────────────────────
  function render() {
    $('#tabs').innerHTML = TABS.map(([k, l]) => `<button role="tab" aria-selected="${k === tab}" data-tab="${k}">${l}</button>`).join('');
    const el = $('#panels');
    try { el.innerHTML = rows.length ? R[tab]() : '<div class="card"><p>Er zijn (nog) geen antwoorden die aan de filters voldoen.</p></div>'; }
    catch (e) { console.error(e); el.innerHTML = `<div class="notice error">Fout bij berekenen: ${esc(e.message)}</div>`; }
  }
  function rerender() { const y = window.scrollY; render(); window.scrollTo(0, y); }

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; render(); window.scrollTo(0, 0); return; }
    const a = e.target.closest('[data-act]'); if (a) { if (a.dataset.act === 'csv') downloadCSV(); else window.print(); }
  });
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.ui) { const k = el.dataset.ui; ui[k] = el.type === 'checkbox' ? el.checked : (el.type === 'number' ? Number(el.value) : el.value); if (k === 'efaItems') ui.efaN = 0; rerender(); }
    else if (el.dataset.uilist) { const k = el.dataset.uilist; ui[k] = [...document.querySelectorAll(`[data-uilist="${k}"]:checked`)].map(i => i.value); rerender(); }
    else if (el.closest('.filters')) { applyFilters(); rerender(); }
  });

  async function load() {
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'results', password }) });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'Onbekende fout');
    return j.rows;
  }
  function start(list, src) {
    raw = list; source = src;
    $('#login').hidden = true; $('#dash').hidden = false; $('#tabs').hidden = false;
    const b = $('#srcBadge'); b.hidden = false; b.textContent = src === 'demo' ? 'Voorbeelddata' : 'Live data'; b.className = 'badge ' + (src === 'demo' ? 'warn' : 'good');
    $('#reload').hidden = src === 'demo';
    applyFilters(); render();
  }

  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#loginErr'), btn = $('#loginBtn'); err.style.display = 'none';
    if (!/^https:\/\/script\.google\.com\//.test(CONFIG.APPS_SCRIPT_URL)) { err.textContent = 'Er is nog geen Apps Script-URL ingesteld in config.js. Bekijk intussen de voorbeelddata.'; err.style.display = 'block'; return; }
    password = $('#pw').value; btn.disabled = true; btn.textContent = 'Laden…';
    try { start(await load(), 'live'); }
    catch (x) { err.textContent = x.message === 'Failed to fetch' ? 'Kan de server niet bereiken.' : x.message; err.style.display = 'block'; }
    finally { btn.disabled = false; btn.textContent = 'Inloggen'; }
  });
  $('#demoBtn').addEventListener('click', () => start(window.makeDemo(180, 7), 'demo'));
  $('#reload').addEventListener('click', async () => { const b = $('#reload'); b.disabled = true; b.textContent = 'Laden…'; try { raw = await load(); applyFilters(); rerender(); } catch (x) { alert(x.message); } finally { b.disabled = false; b.textContent = 'Vernieuwen'; } });
})();
