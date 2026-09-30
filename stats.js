// ─────────────────────────────────────────────────────────────
// Statistiek-engine (geen externe afhankelijkheden)
// Cronbach's α, McDonald's ω, KMO/Bartlett, EFA (PAF + varimax/promax),
// parallelle analyse, kruistabellen (χ², Cramér's V), correlaties,
// ANOVA, OLS-regressie en PROCESS Model 6 (seriële mediatie, bootstrap).
// ─────────────────────────────────────────────────────────────
(function (root) {
  'use strict';

  // ── Basis ──────────────────────────────────────────────────
  const sum = a => a.reduce((s, x) => s + x, 0);
  const mean = a => sum(a) / a.length;
  const variance = a => { const m = mean(a); return sum(a.map(x => (x - m) ** 2)) / (a.length - 1); };
  const sd = a => Math.sqrt(variance(a));
  function skewness(a) { const n = a.length, m = mean(a), s = sd(a); return n / ((n - 1) * (n - 2)) * sum(a.map(x => ((x - m) / s) ** 3)); }
  function kurtosis(a) { // excess kurtosis (SPSS-definitie)
    const n = a.length, m = mean(a), s = sd(a);
    const k = sum(a.map(x => ((x - m) / s) ** 4));
    return n * (n + 1) / ((n - 1) * (n - 2) * (n - 3)) * k - 3 * (n - 1) ** 2 / ((n - 2) * (n - 3));
  }

  // ── Matrices ───────────────────────────────────────────────
  const zeros = (r, c) => Array.from({ length: r }, () => new Array(c).fill(0));
  const T = A => A[0].map((_, j) => A.map(r => r[j]));
  function mul(A, B) {
    const n = A.length, m = B[0].length, k = B.length, C = zeros(n, m);
    for (let i = 0; i < n; i++) for (let p = 0; p < k; p++) { const a = A[i][p]; if (a) for (let j = 0; j < m; j++) C[i][j] += a * B[p][j]; }
    return C;
  }
  function inv(A) {
    const n = A.length, M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => +(i === j))]);
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-12) throw new Error('Matrix is singulier (perfecte samenhang tussen variabelen?)');
      [M[c], M[p]] = [M[p], M[c]];
      const d = M[c][c]; for (let j = 0; j < 2 * n; j++) M[c][j] /= d;
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; if (f) for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j]; }
    }
    return M.map(r => r.slice(n));
  }
  function logDet(A) {
    const n = A.length, M = A.map(r => [...r]); let ld = 0;
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-300) return -Infinity;
      [M[c], M[p]] = [M[p], M[c]];
      ld += Math.log(Math.abs(M[c][c]));
      for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let j = c; j < n; j++) M[r][j] -= f * M[c][j]; }
    }
    return ld;
  }
  // Jacobi-eigendecompositie voor symmetrische matrices → {values (aflopend), vectors (kolommen)}
  function eigSym(A) {
    const n = A.length, a = A.map(r => [...r]), v = zeros(n, n);
    for (let i = 0; i < n; i++) v[i][i] = 1;
    for (let sweep = 0; sweep < 100; sweep++) {
      let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] ** 2;
      if (off < 1e-22) break;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-300) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) { const akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; }
        for (let k = 0; k < n; k++) { const apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; }
        for (let k = 0; k < n; k++) { const vkp = v[k][p], vkq = v[k][q]; v[k][p] = c * vkp - s * vkq; v[k][q] = s * vkp + c * vkq; }
      }
    }
    const idx = [...Array(n).keys()].sort((i, j) => a[j][j] - a[i][i]);
    return { values: idx.map(i => a[i][i]), vectors: v.map(r => idx.map(i => r[i])) };
  }
  function corMatrix(cols) { // cols: array van kolommen (gelijke lengte, zonder missings)
    const k = cols.length, n = cols[0].length, ms = cols.map(mean);
    const z = cols.map((c, i) => { const s = Math.sqrt(sum(c.map(x => (x - ms[i]) ** 2))); return c.map(x => (x - ms[i]) / s); });
    const R = zeros(k, k);
    for (let i = 0; i < k; i++) for (let j = i; j < k; j++) { let s = 0; for (let t = 0; t < n; t++) s += z[i][t] * z[j][t]; R[i][j] = R[j][i] = s; }
    return R;
  }

  // ── Verdelingen ────────────────────────────────────────────
  function lgamma(x) {
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let y = x, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp); let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) ser += c[j] / ++y;
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }
  function betacf(a, b, x) {
    const MAXIT = 300, EPS = 3e-14, FPMIN = 1e-300;
    let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d; let h = d;
    for (let m = 1; m <= MAXIT; m++) {
      const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d;
      const del = d * c; h *= del; if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }
  function ibeta(x, a, b) { // geregulariseerde onvolledige bèta I_x(a,b)
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  function gammaP(a, x) { // geregulariseerde onvolledige gamma P(a,x)
    if (x <= 0) return 0;
    if (x < a + 1) { let ap = a, s = 1 / a, del = s; for (let n = 0; n < 500; n++) { ap++; del *= x / ap; s += del; if (Math.abs(del) < Math.abs(s) * 1e-15) break; } return s * Math.exp(-x + a * Math.log(x) - lgamma(a)); }
    let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
    for (let i = 1; i < 500; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break; }
    return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
  }
  const pT = (t, df) => ibeta(df / (df + t * t), df / 2, 0.5);             // tweezijdig
  const pF = (F, d1, d2) => F <= 0 ? 1 : ibeta(d2 / (d2 + d1 * F), d2 / 2, d1 / 2);
  const pChi2 = (x, df) => 1 - gammaP(df / 2, x / 2);
  function qT(p, df) { // kwantiel van t (p = 1-α/2), via bisectie
    let lo = 0, hi = 1000;
    for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; (1 - pT(mid, df) / 2 < p) ? lo = mid : hi = mid; }
    return (lo + hi) / 2;
  }

  // ── Random (reproduceerbaar) ───────────────────────────────
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function randn(r) { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }

  // ── Beschrijvend ───────────────────────────────────────────
  function describe(a) {
    const s = [...a].sort((x, y) => x - y), n = a.length;
    const med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
    return { n, mean: mean(a), sd: sd(a), median: med, min: s[0], max: s[n - 1], skew: n > 2 ? skewness(a) : NaN, kurt: n > 3 ? kurtosis(a) : NaN };
  }

  // ── Betrouwbaarheid ────────────────────────────────────────
  function cronbach(cols) {
    const k = cols.length, n = cols[0].length;
    const total = Array.from({ length: n }, (_, i) => sum(cols.map(c => c[i])));
    const alpha = k / (k - 1) * (1 - sum(cols.map(variance)) / variance(total));
    const R = corMatrix(cols); let rs = 0, cnt = 0;
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) { rs += R[i][j]; cnt++; }
    const items = cols.map((c, j) => {
      const rest = total.map((t, i) => t - c[i]);
      const others = cols.filter((_, m) => m !== j);
      const aDel = k > 2 ? (k - 1) / (k - 2) * (1 - sum(others.map(variance)) / variance(rest)) : NaN;
      return { mean: mean(c), sd: sd(c), rit: corMatrix([c, rest])[0][1], alphaIfDeleted: aDel };
    });
    const R2 = cols.length > 1 ? R : null;
    // gestandaardiseerde alfa
    const rbar = rs / cnt, alphaStd = k * rbar / (1 + (k - 1) * rbar);
    let omega = NaN;
    try { const f = paf(R2, 1); const l = f.loadings.map(r => r[0]); const sl = sum(l); omega = sl * sl / (sl * sl + sum(l.map(x => 1 - x * x))); } catch (e) { /* laat NaN */ }
    return { k, n, alpha, alphaStd, meanInterItem: rbar, omega, items };
  }

  // ── KMO & Bartlett ────────────────────────────────────────
  function kmo(R) {
    const p = R.length, Ri = inv(R); let r2 = 0, q2 = 0; const msa = [];
    for (let i = 0; i < p; i++) {
      let ri = 0, qi = 0;
      for (let j = 0; j < p; j++) if (i !== j) { const pc = -Ri[i][j] / Math.sqrt(Ri[i][i] * Ri[j][j]); ri += R[i][j] ** 2; qi += pc * pc; }
      msa.push(ri / (ri + qi)); r2 += ri; q2 += qi;
    }
    return { kmo: r2 / (r2 + q2), msa };
  }
  function bartlett(R, n) {
    const p = R.length, chi2 = -(n - 1 - (2 * p + 5) / 6) * logDet(R), df = p * (p - 1) / 2;
    return { chi2, df, p: pChi2(chi2, df) };
  }
  function kmoLabel(v) { return v >= .9 ? 'uitstekend' : v >= .8 ? 'zeer goed' : v >= .7 ? 'goed' : v >= .6 ? 'matig' : v >= .5 ? 'zwak' : 'onvoldoende'; }

  // ── Factoranalyse ─────────────────────────────────────────
  function paf(R, nf, maxIter = 500, tol = 1e-7) {
    const p = R.length, Ri = inv(R);
    let h = Ri.map((r, i) => Math.min(0.995, Math.max(0.005, 1 - 1 / r[i])));
    let L, iter = 0, converged = false;
    for (; iter < maxIter; iter++) {
      const Rh = R.map((r, i) => r.map((x, j) => i === j ? h[i] : x));
      const e = eigSym(Rh);
      L = Array.from({ length: p }, (_, i) => Array.from({ length: nf }, (_, f) => e.vectors[i][f] * Math.sqrt(Math.max(e.values[f], 0))));
      const hn = L.map(r => sum(r.map(x => x * x)));
      const diff = Math.max(...hn.map((x, i) => Math.abs(x - h[i])));
      h = hn.map(x => Math.min(x, 0.9995));
      if (diff < tol) { converged = true; break; }
    }
    // tekenconventie: kolomsom positief
    for (let f = 0; f < nf; f++) if (sum(L.map(r => r[f])) < 0) L.forEach(r => r[f] = -r[f]);
    return { loadings: L, communalities: L.map(r => sum(r.map(x => x * x))), iterations: iter + 1, converged };
  }
  function varimax(L, normalize = true, eps = 1e-5) { // volgt R stats::varimax
    const p = L.length, nc = L[0].length;
    if (nc < 2) return { loadings: L.map(r => [...r]), rotmat: [[1]] };
    let sc = L.map(r => Math.sqrt(sum(r.map(x => x * x))));
    let x = normalize ? L.map((r, i) => r.map(v => v / sc[i])) : L.map(r => [...r]);
    let TT = zeros(nc, nc); for (let i = 0; i < nc; i++) TT[i][i] = 1;
    let d = 0;
    for (let i = 0; i < 1000; i++) {
      const z = mul(x, TT);
      const colSq = Array.from({ length: nc }, (_, j) => sum(z.map(r => r[j] * r[j])));
      const Bm = mul(T(x), z.map(r => r.map((v, j) => v ** 3 - v * colSq[j] / p)));
      const s = svd(Bm);
      TT = mul(s.U, T(s.V));
      const dpast = d; d = sum(s.S);
      if (d < dpast * (1 + eps)) break;
    }
    let z = mul(x, TT);
    if (normalize) z = z.map((r, i) => r.map(v => v * sc[i]));
    return { loadings: z, rotmat: TT };
  }
  function promax(L, m = 4) { // volgt R stats::promax + psych Phi
    const nc = L[0].length;
    if (nc < 2) return { loadings: L.map(r => [...r]), phi: [[1]] };
    const vm = varimax(L);
    const x = vm.loadings;
    const Q = x.map(r => r.map(v => v * Math.abs(v) ** (m - 1)));
    let U = mul(inv(mul(T(x), x)), mul(T(x), Q));
    const dd = inv(mul(T(U), U)).map((r, i) => r[i]);
    U = U.map(r => r.map((v, j) => v * Math.sqrt(dd[j])));
    const z = mul(x, U);
    const Ufull = mul(vm.rotmat, U);
    const ui = inv(Ufull), phi = mul(ui, T(ui));
    return { loadings: z, phi };
  }
  // Kleine SVD voor vierkante matrices (via eigen van AᵀA)
  function svd(A) {
    const e = eigSym(mul(T(A), A));
    const V = e.vectors, S = e.values.map(v => Math.sqrt(Math.max(v, 0)));
    const AV = mul(A, V);
    const U = AV.map(r => r.map((v, j) => S[j] > 1e-12 ? v / S[j] : 0));
    // vul eventuele nul-kolommen van U aan (Gram-Schmidt)
    const n = U.length;
    for (let j = 0; j < S.length; j++) if (S[j] <= 1e-12) {
      for (let t = 0; t < n; t++) { const cand = Array.from({ length: n }, (_, i) => +(i === t)); for (let k = 0; k < S.length; k++) if (k !== j) { const d = sum(cand.map((c, i) => c * U[i][k])); cand.forEach((_, i) => cand[i] -= d * U[i][k]); } const nr = Math.sqrt(sum(cand.map(c => c * c))); if (nr > 1e-6) { cand.forEach((c, i) => U[i][j] = c / nr); break; } }
    }
    return { U, S, V };
  }
  function sortLoadings(L) { // sorteer items op hoogste lading (voor leesbaarheid)
    return L.map((r, i) => ({ i, f: r.reduce((b, v, j) => Math.abs(v) > Math.abs(r[b]) ? j : b, 0), v: r })).sort((a, b) => a.f - b.f || Math.abs(b.v[b.f]) - Math.abs(a.v[a.f])).map(o => o.i);
  }
  function parallelAnalysis(n, p, iters = 200, seed = 20260930) {
    const r = rng(seed), all = [];
    for (let it = 0; it < iters; it++) {
      const cols = Array.from({ length: p }, () => Array.from({ length: n }, () => randn(r)));
      all.push(eigSym(corMatrix(cols)).values);
    }
    const meanEv = Array.from({ length: p }, (_, j) => mean(all.map(a => a[j])));
    const p95 = Array.from({ length: p }, (_, j) => { const s = all.map(a => a[j]).sort((x, y) => x - y); return s[Math.floor(0.95 * (s.length - 1))]; });
    return { mean: meanEv, p95 };
  }
  function efa(cols, nf, rotation = 'promax') {
    const R = corMatrix(cols), n = cols[0].length;
    const ex = paf(R, nf);
    let rot, phi = null;
    if (rotation === 'varimax') rot = varimax(ex.loadings).loadings;
    else if (rotation === 'promax') { const pm = promax(ex.loadings); rot = pm.loadings; phi = pm.phi; }
    else rot = ex.loadings;
    for (let f = 0; f < nf; f++) if (sum(rot.map(r => r[f])) < 0) { rot.forEach(r => r[f] = -r[f]); if (phi) { phi.forEach(r => r[f] = -r[f]); phi[f] = phi[f].map(v => -v); } }
    const ssl = Array.from({ length: nf }, (_, f) => sum(rot.map(r => r[f] ** 2)));
    const ev = eigSym(R).values;
    return { R, n, eigen: ev, extraction: ex, loadings: rot, phi, ssLoadings: ssl, propVar: ssl.map(s => s / R.length), converged: ex.converged, iterations: ex.iterations };
  }

  // ── Correlaties ───────────────────────────────────────────
  function pearson(x, y) { const r = corMatrix([x, y])[0][1], n = x.length, t = r * Math.sqrt((n - 2) / (1 - r * r)); return { r, n, p: pT(t, n - 2) }; }

  // ── Kruistabel ────────────────────────────────────────────
  function crosstab(a, b) {
    const ra = [...new Set(a)], cb = [...new Set(b)];
    const O = ra.map(x => cb.map(y => a.filter((v, i) => v === x && b[i] === y).length));
    const n = a.length, rs = O.map(sum), cs = cb.map((_, j) => sum(O.map(r => r[j])));
    const E = O.map((r, i) => r.map((_, j) => rs[i] * cs[j] / n));
    let chi2 = 0, low = 0;
    O.forEach((r, i) => r.forEach((o, j) => { chi2 += (o - E[i][j]) ** 2 / E[i][j]; if (E[i][j] < 5) low++; }));
    const df = (ra.length - 1) * (cb.length - 1);
    const V = Math.sqrt(chi2 / (n * Math.max(1, Math.min(ra.length, cb.length) - 1)));
    return { rows: ra, cols: cb, O, E, rs, cs, n, chi2, df, p: df > 0 ? pChi2(chi2, df) : NaN, V, lowExpectedPct: 100 * low / (ra.length * cb.length) };
  }

  // ── ANOVA ─────────────────────────────────────────────────
  function anova(y, g) {
    const groups = [...new Set(g)], N = y.length, gm = mean(y);
    const stats = groups.map(k => { const v = y.filter((_, i) => g[i] === k); return { group: k, n: v.length, mean: mean(v), sd: v.length > 1 ? sd(v) : NaN }; });
    const ssb = sum(stats.map(s => s.n * (s.mean - gm) ** 2)), sst = sum(y.map(v => (v - gm) ** 2)), ssw = sst - ssb;
    const df1 = groups.length - 1, df2 = N - groups.length, F = (ssb / df1) / (ssw / df2);
    return { groups: stats, F, df1, df2, p: pF(F, df1, df2), eta2: ssb / sst };
  }

  // ── OLS-regressie ─────────────────────────────────────────
  function ols(y, Xcols, names) {
    const n = y.length, k = Xcols.length;
    const X = Array.from({ length: n }, (_, i) => [1, ...Xcols.map(c => c[i])]);
    const XtX = mul(T(X), X), XtXi = inv(XtX);
    const b = mul(XtXi, mul(T(X), y.map(v => [v]))).map(r => r[0]);
    const yhat = X.map(r => sum(r.map((v, j) => v * b[j])));
    const res = y.map((v, i) => v - yhat[i]), sse = sum(res.map(r => r * r)), my = mean(y), sst = sum(y.map(v => (v - my) ** 2));
    const df = n - k - 1, mse = sse / df, tc = qT(0.975, df);
    const sdy = sd(y);
    const coefs = b.map((bj, j) => {
      const se = Math.sqrt(mse * XtXi[j][j]), t = bj / se;
      return { name: j === 0 ? 'constante' : names[j - 1], b: bj, se, t, p: pT(t, df), llci: bj - tc * se, ulci: bj + tc * se, beta: j === 0 ? NaN : bj * sd(Xcols[j - 1]) / sdy };
    });
    const R2 = 1 - sse / sst, F = k ? (R2 / k) / ((1 - R2) / df) : NaN;
    let vif = [];
    if (k > 1) vif = Xcols.map((c, j) => { const others = Xcols.filter((_, m) => m !== j); const r2 = olsR2(c, others); return 1 / (1 - r2); });
    return { n, k, coefs, R2, adjR2: 1 - (1 - R2) * (n - 1) / df, R: Math.sqrt(R2), F, df1: k, df2: df, p: k ? pF(F, k, df) : NaN, mse, vif };
  }
  function olsCoef(y, Xcols) { // snelle variant voor bootstrap
    const n = y.length, k = Xcols.length + 1, XtX = zeros(k, k), Xty = new Array(k).fill(0);
    for (let i = 0; i < n; i++) {
      const row = [1]; for (const c of Xcols) row.push(c[i]);
      for (let a = 0; a < k; a++) { Xty[a] += row[a] * y[i]; for (let b = a; b < k; b++) XtX[a][b] += row[a] * row[b]; }
    }
    for (let a = 0; a < k; a++) for (let b = 0; b < a; b++) XtX[a][b] = XtX[b][a];
    return mul(inv(XtX), Xty.map(v => [v])).map(r => r[0]);
  }
  function olsR2(y, Xcols) { const b = olsCoef(y, Xcols); const my = mean(y); let sse = 0, sst = 0; y.forEach((v, i) => { let f = b[0]; Xcols.forEach((c, j) => f += b[j + 1] * c[i]); sse += (v - f) ** 2; sst += (v - my) ** 2; }); return 1 - sse / sst; }

  // ── PROCESS Model 6 (twee seriële mediatoren) ─────────────
  // M1 = a1·X (+cov) ; M2 = a2·X + d21·M1 (+cov) ; Y = c'·X + b1·M1 + b2·M2 (+cov)
  function process6(X, M1, M2, Y, covs = [], covNames = [], opts = {}) {
    const B = opts.boot || 5000, seed = opts.seed || 1234, conf = opts.conf || 95;
    const nm = opts.names || { X: 'X', M1: 'M1', M2: 'M2', Y: 'Y' };
    const m1 = ols(M1, [X, ...covs], [nm.X, ...covNames]);
    const m2 = ols(M2, [X, M1, ...covs], [nm.X, nm.M1, ...covNames]);
    const my = ols(Y, [X, M1, M2, ...covs], [nm.X, nm.M1, nm.M2, ...covNames]);
    const tot = ols(Y, [X, ...covs], [nm.X, ...covNames]);
    const a1 = m1.coefs[1].b, a2 = m2.coefs[1].b, d21 = m2.coefs[2].b, cp = my.coefs[1].b, b1 = my.coefs[2].b, b2 = my.coefs[3].b, c = tot.coefs[1].b;
    const est = ind => [ind.a1 * ind.b1, ind.a1 * ind.d21 * ind.b2, ind.a2 * ind.b2];
    const point = est({ a1, a2, d21, b1, b2 });
    const n = X.length, r = rng(seed), boots = [[], [], [], []];
    const bx = new Array(n), bm1 = new Array(n), bm2 = new Array(n), by = new Array(n), bc = covs.map(() => new Array(n));
    for (let it = 0; it < B; it++) {
      for (let i = 0; i < n; i++) { const j = Math.floor(r() * n); bx[i] = X[j]; bm1[i] = M1[j]; bm2[i] = M2[j]; by[i] = Y[j]; covs.forEach((cv, q) => bc[q][i] = cv[j]); }
      try {
        const A = olsCoef(bm1, [bx, ...bc]), Bm = olsCoef(bm2, [bx, bm1, ...bc]), C = olsCoef(by, [bx, bm1, bm2, ...bc]);
        const e = est({ a1: A[1], a2: Bm[1], d21: Bm[2], b1: C[2], b2: C[3] });
        boots[0].push(e[0]); boots[1].push(e[1]); boots[2].push(e[2]); boots[3].push(e[0] + e[1] + e[2]);
      } catch (err) { /* singuliere resample overslaan */ }
    }
    const lo = (100 - conf) / 200, hi = 1 - lo;
    const ci = arr => { const s = [...arr].sort((x, y) => x - y); const q = p => s[Math.min(s.length - 1, Math.max(0, Math.floor(p * s.length)))]; return { se: sd(arr), llci: q(lo), ulci: q(hi) }; };
    const sdX = sd(X), sdY = sd(Y);
    const labels = [`${nm.X} → ${nm.M1} → ${nm.Y}`, `${nm.X} → ${nm.M1} → ${nm.M2} → ${nm.Y}`, `${nm.X} → ${nm.M2} → ${nm.Y}`];
    const indirect = [
      { label: 'Totaal indirect effect', effect: sum(point), ...ci(boots[3]), std: sum(point) * sdX / sdY, stdCI: scaleCI(ci(boots[3]), sdX / sdY) },
      ...point.map((p, i) => ({ label: `Ind${i + 1}: ${labels[i]}`, effect: p, ...ci(boots[i]), std: p * sdX / sdY, stdCI: scaleCI(ci(boots[i]), sdX / sdY) }))
    ];
    return { n, models: { M1: m1, M2: m2, Y: my, total: tot }, paths: { a1, a2, d21, b1, b2, cp, c }, indirect, boot: boots[3].length, seed, conf, sdX, sdY };
  }
  function scaleCI(c, f) { return { llci: c.llci * f, ulci: c.ulci * f }; }

  const api = { mean, sd, variance, describe, corMatrix, eigSym, inv, logDet, cronbach, kmo, kmoLabel, bartlett, paf, varimax, promax, efa, sortLoadings, parallelAnalysis,
    pearson, crosstab, anova, ols, process6, pT, pF, pChi2, qT, rng, randn };
  if (typeof module !== 'undefined') module.exports = api; else root.Stats = api;
})(this);
