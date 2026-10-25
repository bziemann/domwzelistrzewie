/*
  Przybliżanie i przesuwanie rzutu SVG przez zmianę viewBox.
  Dotyk: dwa palce = przybliżanie, jeden palec = przesuwanie (bez przybliżenia przewija ekran).
  Mysz: kółko = przybliżanie w miejscu kursora, przeciąganie = przesuwanie. Klawiatura: + / − / 0.
  Krótkie stuknięcie bez ruchu przechodzi dalej jako zwykły click (wybór pomieszczenia).
  API: PlanZoom(svg, {base:[x,y,w,h], scroller, onChange(s), max}) -> {apply, reset, setBase([x,y,w,h]), zoomIn, zoomOut, scale}.
  Kilka instancji na stronie nie koliduje: globalne listenery reagują tylko na wskaźniki zaczęte na danym SVG.
*/
window.PlanZoom = function (svg, opts) {
  const MAX = opts.max || 6, TAP = 8;
  let base = opts.base, s = 1, cx = 0, cy = 0, dragged = false;
  const ptrs = new Map();
  let g0 = null; // stan gestu w chwili zmiany liczby palców

  function clamp() {
    s = Math.min(MAX, Math.max(1, s));
    const w = base[2] / s, h = base[3] / s;
    cx = Math.min(base[0] + base[2] - w / 2, Math.max(base[0] + w / 2, cx));
    cy = Math.min(base[1] + base[3] - h / 2, Math.max(base[1] + h / 2, cy));
  }
  function apply() {
    clamp();
    const w = base[2] / s, h = base[3] / s;
    svg.setAttribute('viewBox', [cx - w / 2, cy - h / 2, w, h].join(' '));
    svg.classList.toggle('zoomed', s > 1.001);
    if (opts.onChange) opts.onChange(s);
  }
  // punkt ekranu -> jednostki rzutu (svg ma proporcje viewBox, więc skala jest jedna)
  function toPlan(px, py) {
    const r = svg.getBoundingClientRect(), k = base[2] / s / r.width;
    return [cx - base[2] / s / 2 + (px - r.left) * k, cy - base[3] / s / 2 + (py - r.top) * k];
  }
  // przybliż o współczynnik f tak, by punkt pod (px, py) został w miejscu
  function zoomAt(f, px, py) {
    const p = toPlan(px, py), s1 = Math.min(MAX, Math.max(1, s * f)), q = s / s1;
    cx = p[0] + (cx - p[0]) * q; cy = p[1] + (cy - p[1]) * q; s = s1; apply();
  }
  function zoomCenter(f) { const r = svg.getBoundingClientRect(); zoomAt(f, r.left + r.width / 2, r.top + r.height / 2); }

  function startGesture() {
    const a = [...ptrs.values()];
    if (a.length === 0) { g0 = null; return; }
    const mx = a.reduce((t, p) => t + p.x, 0) / a.length, my = a.reduce((t, p) => t + p.y, 0) / a.length;
    g0 = { n: a.length, mx, my, d: a.length > 1 ? Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) : 0, s, cx, cy, anchor: toPlan(mx, my), scroll: opts.scroller ? opts.scroller.scrollTop : 0 };
  }
  svg.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (ptrs.size === 0) dragged = false;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
    startGesture();
  });
  window.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p || !g0) return;
    p.x = e.clientX; p.y = e.clientY;
    if (!dragged && Math.hypot(p.x - p.x0, p.y - p.y0) < TAP && ptrs.size === 1) return;
    dragged = true; e.preventDefault();
    const a = [...ptrs.values()];
    const mx = a.reduce((t, q) => t + q.x, 0) / a.length, my = a.reduce((t, q) => t + q.y, 0) / a.length;
    if (a.length > 1 && g0.d > 0) s = g0.s * Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) / g0.d;
    else s = g0.s;
    // bez przybliżenia jeden palec przewija ekran zamiast rzutu (rzut ma touch-action:none)
    if (a.length === 1 && g0.s <= 1.001 && opts.scroller) { opts.scroller.scrollTop = g0.scroll - (my - g0.my); return; }
    s = Math.min(MAX, Math.max(1, s));
    const r = svg.getBoundingClientRect(), k = base[2] / s / r.width;
    // punkt rzutu, który był pod środkiem gestu, ma zostać pod bieżącym środkiem
    cx = g0.anchor[0] - (mx - r.left) * k + base[2] / s / 2;
    cy = g0.anchor[1] - (my - r.top) * k + base[3] / s / 2;
    apply();
  }, { passive: false });
  const up = e => { if (ptrs.delete(e.pointerId)) startGesture(); };
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  // po przeciągnięciu nie otwieraj pomieszczenia
  svg.addEventListener('click', e => { if (dragged) { e.stopImmediatePropagation(); e.preventDefault(); dragged = false; } }, true);
  svg.addEventListener('wheel', e => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0015)), e.clientX, e.clientY); }, { passive: false });
  svg.addEventListener('keydown', e => {
    if (e.key === '+' || e.key === '=') { zoomCenter(1.5); e.preventDefault(); }
    else if (e.key === '-') { zoomCenter(1 / 1.5); e.preventDefault(); }
    else if (e.key === '0') { reset(); e.preventDefault(); }
  });

  function reset() { s = 1; cx = base[0] + base[2] / 2; cy = base[1] + base[3] / 2; apply(); }
  // ten sam obszar (np. odświeżenie rysunku) zachowuje przybliżenie, inny je zeruje
  function setBase(b) { if (b.join(' ') === base.join(' ')) apply(); else { base = b.slice(); reset(); } }
  reset();
  return { apply, reset, setBase, zoomIn: () => zoomCenter(1.5), zoomOut: () => zoomCenter(1 / 1.5), get scale() { return s; } };
};
