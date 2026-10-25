/*
  Silnik aplikacji: model 3D domu, spacer z kolizjami i schodami, rzuty kondygnacji i pomieszczeń.
  Dane: window.HOUSE (data/house.js) + moduły pomieszczeń window.ROOM_MODULES (data/rooms/*.json, ładuje js/room-builder.js).
  Jednostki danych: cm. Three.js pracuje w metrach (M = 0.01).
*/
window.ROOMS_READY.then(function () {
  const H = window.HOUSE, MODS = window.ROOM_MODULES || {};
  const M = 0.01;
  const LV_Y = H.levels.map(l => l.y);
  const R = H.levels[1].roof, TAN = Math.tan(R.pitchDeg * Math.PI / 180);
  const roofH = z => Math.min(R.ceiling, R.knee + TAN * Math.max(0, Math.min(z - R.eaveZ[0], R.eaveZ[1] - z)));
  const ceilAt = (lv, z) => lv === 0 ? H.levels[0].ceiling : roofH(z);
  const KINKS = [R.eaveZ[0], R.eaveZ[0] + (R.ceiling - R.knee) / TAN, R.eaveZ[1] - (R.ceiling - R.knee) / TAN, R.eaveZ[1]];
  const C = { wall: 0xF1EEE7, navy: 0x1F3A5F, blue: 0x8FA9C4, red: 0xC8382E, oak: 0xC9A27A, turner: 0x9A6A3A, white: 0xFAFAF8, grey: 0x6B7280, dark: 0x2B3038, ink: 0xD9D4C8 };
  const FLOORC = { 'panel podłogowy': 0xC9A27A, 'kafelki': 0xD8D2C6, 'wylewka przemysłowa': 0xA7A9A6, 'drewno dąb': 0xB98E62 };
  const $ = id => document.getElementById(id);
  const roomById = id => H.rooms.find(r => r.id === id);

  /* ================= Scena ================= */
  const canvas = $('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xD8E3EC);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 120); camera.rotation.order = 'YXZ';
  const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, metalness: 0 }, o || {}));
  const levelGroups = H.levels.map((l, i) => { const g = new THREE.Group(); g.position.y = l.y * M; scene.add(g); return g; });

  // bryła z górą przyciętą do sufitu/skosu (cm, układ domu, y względem kondygnacji)
  function prism(x0, x1, z0, z1, y0, y1, lv, color, group, o) {
    const zs = [z0]; if (lv === 1) KINKS.forEach(k => { if (k > z0 + 0.1 && k < z1 - 0.1) zs.push(k); }); zs.push(z1); zs.sort((a, b) => a - b);
    const m = mat(color, o); const out = [];
    for (let i = 0; i < zs.length - 1; i++) {
      const a = zs[i], b = zs[i + 1];
      const topA = y1 === 'ceil' ? ceilAt(lv, a) : Math.min(y1, ceilAt(lv, a)), topB = y1 === 'ceil' ? ceilAt(lv, b) : Math.min(y1, ceilAt(lv, b));
      if (topA <= y0 + 0.5 && topB <= y0 + 0.5) continue;
      const g = new THREE.BoxGeometry((x1 - x0) * M, 1, (b - a) * M), pos = g.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        const zl = pos.getZ(k) / M + (a + b) / 2, top = pos.getY(k) > 0;
        const yt = Math.max(y0, y1 === 'ceil' ? ceilAt(lv, zl) : Math.min(y1, ceilAt(lv, zl)));
        pos.setY(k, (top ? yt : y0) * M);
      }
      g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, m); mesh.position.set((x0 + x1) / 2 * M, 0, (a + b) / 2 * M);
      mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); out.push(mesh);
    }
    return out;
  }
  function shapeFrom(poly, flip) { const s = new THREE.Shape(); poly.forEach((p, i) => { const y = flip ? -p[1] : p[1]; i ? s.lineTo(p[0] * M, y * M) : s.moveTo(p[0] * M, y * M); }); return s; }
  function rectPoly(x0, x1, z0, z1) { return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]; }
  function floorMesh(poly, y, color, group, holes) {
    const s = shapeFrom(poly, true);
    (holes || []).forEach(h => { const p = new THREE.Path(); h.forEach((q, i) => i ? p.lineTo(q[0] * M, -q[1] * M) : p.moveTo(q[0] * M, -q[1] * M)); s.holes.push(p); });
    const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mat(color)); m.position.y = y * M; m.receiveShadow = true; group.add(m); return m;
  }
  function ceilMesh(poly, y, group, holes) {
    const s = shapeFrom(poly, false);
    (holes || []).forEach(h => { const p = new THREE.Path(); h.forEach((q, i) => i ? p.lineTo(q[0] * M, q[1] * M) : p.moveTo(q[0] * M, q[1] * M)); s.holes.push(p); });
    const g = new THREE.ShapeGeometry(s); g.rotateX(Math.PI / 2);
    const mm = mat(C.wall); mm.side = THREE.FrontSide; mm.shadowSide = THREE.DoubleSide;
    const m = new THREE.Mesh(g, mm); m.position.y = y * M; m.castShadow = true; group.add(m); return m;
  }
  function quad(p, group, color, wantDown) { // p: 4 punkty [x,y,z] cm
    const g = new THREE.BufferGeometry(), v = [p[0], p[1], p[2], p[0], p[2], p[3]].flat().map(n => n * M);
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals();
    if (wantDown && g.attributes.normal.getY(0) > 0) { const v2 = [p[0], p[2], p[1], p[0], p[3], p[2]].flat().map(n => n * M); g.setAttribute('position', new THREE.Float32BufferAttribute(v2, 3)); g.computeVertexNormals(); }
    const mm = mat(color); mm.side = THREE.FrontSide; mm.shadowSide = THREE.DoubleSide;
    const m = new THREE.Mesh(g, mm); m.castShadow = true; group.add(m); return m;
  }

  /* ---- powłoka budynku ---- */
  const FP = [0, H.footprint[0], 0, H.footprint[1]];
  const ST = H.stairs, VOID = ST.void;
  // grunt
  { const g = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat(0xB7C2A6)); g.rotation.x = -Math.PI / 2; g.position.set(7.2, -0.03, 4.5); g.receiveShadow = true; scene.add(g); }
  H.levels.forEach((L, lv) => {
    const grp = levelGroups[lv];
    // płyta podłogi i podłogi pomieszczeń
    floorMesh(rectPoly(FP[0], FP[1], FP[2], FP[3]), 0, 0xCFC9BE, grp, lv === 1 ? [rectPoly(VOID.x0, VOID.x1, VOID.z0, VOID.z1)] : null);
    H.rooms.filter(r => r.level === lv && !(lv === 1 && r.id === '1.01')).forEach(r => floorMesh(r.poly, 0.3, FLOORC[r.floor] || 0xD8D2C6, grp));
    // ściany
    L.walls.forEach(w => prism(w[0], w[0] + w[2], w[1], w[1] + w[3], 0, 'ceil', lv, C.wall, grp));
    // sufity
    if (lv === 0) ceilMesh(rectPoly(FP[0], FP[1], FP[2], FP[3]), L.ceiling, grp, [rectPoly(VOID.x0, VOID.x1, VOID.z0, VOID.z1)]);
    else {
      const k1 = KINKS[1], k2 = KINKS[2];
      ceilMesh(rectPoly(0, FP[1], k1, k2), R.ceiling, grp);
      quad([[0, R.knee, R.eaveZ[0]], [FP[1], R.knee, R.eaveZ[0]], [FP[1], R.ceiling, k1], [0, R.ceiling, k1]], grp, C.wall, true);
      quad([[0, R.ceiling, k2], [FP[1], R.ceiling, k2], [FP[1], R.knee, R.eaveZ[1]], [0, R.knee, R.eaveZ[1]]], grp, C.wall, true);
    }
  });
  // otwory: nadproża, podokienniki, szyby, ramy, drzwi zewnętrzne
  const glassM = new THREE.MeshStandardMaterial({ color: 0xBFD9EE, transparent: true, opacity: 0.2, roughness: 0.1, side: THREE.DoubleSide });
  H.openings.forEach(o => {
    const grp = levelGroups[o.lv], lv = o.lv;
    if (o.sill > 0) prism(o.x0, o.x1, o.z0, o.z1, 0, o.sill, lv, C.wall, grp);
    prism(o.x0, o.x1, o.z0, o.z1, o.head, 'ceil', lv, C.wall, grp);
    if (o.k === 'idoor') return;
    const alongX = (o.x1 - o.x0) > (o.z1 - o.z0);
    const cx = (o.x0 + o.x1) / 2, cz = (o.z0 + o.z1) / 2, len = alongX ? o.x1 - o.x0 : o.z1 - o.z0, hgt = o.head - o.sill;
    const addBox = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w * M, h * M, d * M), m); b.position.set(x * M, y * M, z * M); b.castShadow = m !== glassM; grp.add(b); return b; };
    if (o.k === 'window') {
      alongX ? addBox(len, hgt, 1, cx, o.sill + hgt / 2, cz, glassM) : addBox(1, hgt, len, cx, o.sill + hgt / 2, cz, glassM);
      const fm = mat(C.turner, { roughness: 0.6 });
      const t = 6;
      [[o.sill, o.sill + t], [o.head - t, o.head]].forEach(r => alongX ? addBox(len, r[1] - r[0], 7, cx, (r[0] + r[1]) / 2, cz, fm) : addBox(7, r[1] - r[0], len, cx, (r[0] + r[1]) / 2, cz, fm));
      [-1, 1].forEach(s => alongX ? addBox(t, hgt, 7, cx + s * (len / 2 - t / 2), o.sill + hgt / 2, cz, fm) : addBox(7, hgt, t, cx, o.sill + hgt / 2, cz + s * (len / 2 - t / 2), fm));
    } else {
      const col = o.k === 'garage' ? 0xA7AEB6 : 0x3A3F48;
      alongX ? addBox(len, hgt, 5, cx, o.sill + hgt / 2, cz, mat(col)) : addBox(5, hgt, len, cx, o.sill + hgt / 2, cz, mat(col));
    }
  });
  // okna dachowe
  const roofWinMats = [];
  H.roofWindows.forEach(w => {
    const grp = levelGroups[1], s = w.side === 'S' ? 1 : -1, z0 = s > 0 ? R.eaveZ[0] : R.eaveZ[1];
    const run = (R.ceiling - R.knee) / TAN, zc = z0 + s * run / 2, yc = (R.knee + R.ceiling) / 2;
    const u = new THREE.Vector3(0, TAN, s).normalize(), h = 60;
    const p = [[-39, -h], [39, -h], [39, h], [-39, h]].map(q => [w.x + q[0], yc + u.y * q[1] - 1.5, zc + u.z * q[1] - s * 1.0]);
    const m = quad(p, grp, 0xBFD9EE, true); m.material.emissive = new THREE.Color(0x9CC2E6); m.material.emissiveIntensity = 0.5; roofWinMats.push(m.material);
  });
  // schody
  (function () {
    const grp = levelGroups[0], sm = mat(0xB98E62);
    ST.flights.forEach((f, fi) => {
      const n = f.steps, rise = (f.to - f.from) / n, run = (f.z1 - f.z0) / n;
      for (let i = 0; i < n; i++) {
        const top = f.from + rise * (i + 1);
        const za = f.dir === '+z' ? f.z0 + run * i : f.z1 - run * (i + 1), zb = za + run;
        const y0 = fi === 0 ? 0 : top - 5;
        const b = new THREE.Mesh(new THREE.BoxGeometry((f.x1 - f.x0) * M, (top - y0) * M, run * M), sm);
        b.position.set((f.x0 + f.x1) / 2 * M, (y0 + top) / 2 * M, (za + zb) / 2 * M); b.castShadow = b.receiveShadow = true; grp.add(b);
      }
    });
    const Lg = ST.landing, b = new THREE.Mesh(new THREE.BoxGeometry((Lg.x1 - Lg.x0) * M, 0.12, (Lg.z1 - Lg.z0) * M), sm);
    b.position.set((Lg.x0 + Lg.x1) / 2 * M, (Lg.y - 6) * M, (Lg.z0 + Lg.z1) / 2 * M); b.castShadow = b.receiveShadow = true; grp.add(b);
    // balustrada na poddaszu nad dolnym biegiem
    const g1 = levelGroups[1], rm = mat(0x3A3F48), gm = new THREE.MeshStandardMaterial({ color: 0xCFE0EE, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    const f1 = ST.flights[0];
    const rail = new THREE.Mesh(new THREE.BoxGeometry((f1.x1 - f1.x0 + 8) * M, 0.04, 0.05), rm); rail.position.set((f1.x0 + f1.x1 + 8) / 2 * M, 1.0, VOID.z0 * M); g1.add(rail);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry((f1.x1 - f1.x0 + 8) * M, 0.95), gm); pane.position.set((f1.x0 + f1.x1 + 8) / 2 * M, 0.5, VOID.z0 * M); g1.add(pane);
  })();

  /* ---- meble: szkic architekta + moduły pomieszczeń ---- */
  const archGroups = {};
  H.furniture.forEach(f => {
    const r = roomById(f.room); if (!r) return;
    const grp = archGroups[f.room] || (archGroups[f.room] = (() => { const g = new THREE.Group(); levelGroups[r.level].add(g); return g; })());
    const b = new THREE.Mesh(new THREE.BoxGeometry((f.x1 - f.x0) * M, (f.y1 - f.y0) * M, (f.z1 - f.z0) * M), mat(new THREE.Color(f.c).getHex()));
    b.position.set((f.x0 + f.x1) / 2 * M, (f.y0 + f.y1) / 2 * M, (f.z0 + f.z1) / 2 * M); b.castShadow = b.receiveShadow = true; b.userData.label = f.name; grp.add(b);
  });

  // przełączane elementy (drzwi, fronty, łóżko)
  const doors = [];
  const RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function toggle(o) { const piv = new THREE.Group(); (o.parent || scene).add(piv); const d = { piv, ang: 1, open: false, cur: 0, kind: o.kind, slide: o.slide || null }; doors.push(d); return d; }
  function hinged(o) {
    const piv = new THREE.Group(); piv.position.set(o.px, o.y0, o.pz); (o.parent || scene).add(piv);
    const t = 0.022, len = o.len, h = o.h;
    const leaf = new THREE.Mesh(o.axis === 'x' ? new THREE.BoxGeometry(len, h, t) : new THREE.BoxGeometry(t, h, len), mat(o.color || C.white));
    if (o.axis === 'x') leaf.position.set(o.dir * len / 2, h / 2, 0); else leaf.position.set(0, h / 2, o.dir * len / 2);
    leaf.castShadow = leaf.receiveShadow = true; piv.add(leaf);
    const d = { piv, ang: o.ang, open: !!o.open, cur: o.open ? o.ang : 0, kind: o.kind }; leaf.userData.door = d;
    const hy = (o.handleY == null ? 1.0 : o.handleY) - o.y0, hl = o.handleLen || 0.14, far = o.dir * (len - 0.05);
    (o.handle || []).forEach(side => { const hm = new THREE.Mesh(new THREE.BoxGeometry(0.02, hl, 0.02), mat(C.dark)); if (o.axis === 'x') hm.position.set(far, hy, side * 0.022); else hm.position.set(side * 0.022, hy, far); hm.userData.door = d; piv.add(hm); });
    piv.rotation.y = d.cur; doors.push(d); return d;
  }
  function box(x0, x1, y0, y1, z0, z1, color, parent, o) { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat(color, o)); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = m.receiveShadow = true; (parent || scene).add(m); return m; }
  function cyl(r, h, x, y, z, color, parent) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), mat(color)); m.position.set(x, y, z); m.castShadow = true; (parent || scene).add(m); return m; }
  function rod(x0, x1, y, z, parent) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, x1 - x0, 12), mat(0x9AA0A8, { metalness: 0.6, roughness: 0.4 })); m.rotation.z = Math.PI / 2; m.position.set((x0 + x1) / 2, y, z); (parent || scene).add(m); return m; }
  // oświetlenie pomieszczeń: oprawy z danych pokoju (pole lights) albo domyślny plafon na środku; świecą tylko w trybie nocnym
  const glows = [], LIGHTS = [];
  const glow = m => { glows.push(m); return m; };
  const LK = { ceiling: { power: 1, dist: 6.5 }, wall: { power: 0.5, dist: 3.5 }, lamp: { power: 0.4, dist: 2.5 } };
  const NORMAL = { '+x': [1, 0], '-x': [-1, 0], '+z': [0, 1], '-z': [0, -1] };
  function addLight(l, parent, room) { // l: wpis z data/rooms/*.json → lights (cm, układ rodzica)
    const k = LK[l.kind]; if (!k) throw new Error('Pokój ' + room + ': nieznany rodzaj światła "' + l.kind + '"');
    const at = l.at.map(v => v * M), anchor = new THREE.Object3D(); parent.add(anchor);
    if (l.kind === 'ceiling') {
      const r = (l.r || 20) * M, m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.05, 24), glow(mat(C.white)));
      m.position.set(at[0], at[1] - 0.025, at[2]); parent.add(m); anchor.position.set(at[0], at[1] - 0.2, at[2]);
    } else if (l.kind === 'wall') {
      const n = NORMAL[l.n || '+z'], m = new THREE.Mesh(new THREE.BoxGeometry(n[0] ? 0.08 : 0.16, 0.1, n[0] ? 0.16 : 0.08), glow(mat(C.white)));
      m.position.set(at[0] + n[0] * 0.04, at[1], at[2] + n[1] * 0.04); parent.add(m); anchor.position.set(at[0] + n[0] * 0.2, at[1], at[2] + n[1] * 0.2);
    } else anchor.position.set(at[0], at[1], at[2]); // lamp: oprawa zbudowana z elementów (glow: true)
    LIGHTS.push({ anchor, room, lv: H.rooms.find(r => r.id === room).level, power: l.power != null ? l.power : k.power, dist: (l.dist != null ? l.dist * M : k.dist) });
  }
  const modState = {};
  Object.keys(MODS).forEach(id => {
    const md = MODS[id], root = new THREE.Group();
    root.position.set(md.origin.x * M, 0, md.origin.z * M); levelGroups[md.level].add(root);
    const res = md.build({ THREE, box, cyl, hinged, rod, mat, C, root, toggle, glow, light: (l, parent) => addLight(l, parent, id) }) || {};
    const vkeys = Object.keys(md.variants || {});
    modState[id] = { root, variants: res.variants || {}, variant: vkeys[0] || null };
    applyVariant(id);
  });
  function applyVariant(id) { const s = modState[id]; Object.keys(s.variants).forEach(k => { s.variants[k].visible = k === s.variant; }); }
  // pomieszczenia bez modułu: światła z data/house.js (rooms[].lights), a bez nich plafony na osi obrysu,
  // jeden na każde rozpoczęte 4 m długości. Schody 1.01 to dusza schodów 0.09 i korzystają z jej świateł.
  H.rooms.forEach(r => {
    if (r.id === '1.01' || LIGHTS.some(l => l.room === r.id)) return;
    if (r.lights) { r.lights.forEach(l => addLight(l, levelGroups[r.level], r.id)); return; }
    const xs = r.poly.map(p => p[0]), zs = r.poly.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
    const alongX = x1 - x0 >= z1 - z0, n = Math.ceil((alongX ? x1 - x0 : z1 - z0) / 400);
    let pts = [];
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, p = alongX ? [x0 + (x1 - x0) * t, (z0 + z1) / 2] : [(x0 + x1) / 2, z0 + (z1 - z0) * t]; if (pointIn(r.poly, p[0], p[1])) pts.push(p); }
    if (!pts.length) pts = [centroid(r.poly)];
    pts.forEach(c => addLight({ kind: 'ceiling', at: [c[0], ceilAt(r.level, c[1]), c[1]], r: 18 }, levelGroups[r.level], r.id));
  });

  // drzwi wewnętrzne: białe skrzydło i ościeżnica w każdym otworze idoor, chyba że moduł pomieszczenia ma tam własne drzwi
  (function () {
    scene.updateMatrixWorld(true);
    const own = doors.filter(d => !d.slide && d.kind !== 'w').map(d => { const v = d.piv.getWorldPosition(new THREE.Vector3()); return { x: v.x / M, z: v.z / M, lv: v.y / M >= LV_Y[1] - 1 ? 1 : 0 }; });
    const corridor = r => /Korytarz|Wiatrołap|Schody/.test(r.name);
    const fm = mat(C.white);
    H.openings.filter(o => o.k === 'idoor').forEach(o => {
      if (own.some(p => p.lv === o.lv && p.x >= o.x0 - 10 && p.x <= o.x1 + 10 && p.z >= o.z0 - 10 && p.z <= o.z1 + 10)) return;
      const grp = levelGroups[o.lv], alongX = (o.x1 - o.x0) > (o.z1 - o.z0), F = 4;
      const len = alongX ? o.x1 - o.x0 : o.z1 - o.z0, a0 = alongX ? o.x0 : o.z0, d0 = alongX ? o.z0 : o.x0, d1 = alongX ? o.z1 : o.x1, dep = d1 - d0;
      // skrzydło otwiera się do pomieszczenia, nie na korytarz (gdy obie strony to pokoje: na stronę o mniejszej współrzędnej)
      const side = s => { const c = (d0 + d1) / 2 + s * (dep / 2 + 30), m = (a0 + a0 + len) / 2; return H.rooms.find(r => r.level === o.lv && pointIn(r.poly, alongX ? m : c, alongX ? c : m)); };
      const rp = side(1), sgn = rp && !corridor(rp) && !(side(-1) && !corridor(side(-1))) ? 1 : -1;
      const piece = (u0, u1, y0, y1) => { const b = new THREE.Mesh(alongX ? new THREE.BoxGeometry((u1 - u0) * M, (y1 - y0) * M, (dep + 2) * M) : new THREE.BoxGeometry((dep + 2) * M, (y1 - y0) * M, (u1 - u0) * M), fm); const u = (u0 + u1) / 2, w = (d0 + d1) / 2; b.position.set((alongX ? u : w) * M, (y0 + y1) / 2 * M, (alongX ? w : u) * M); b.castShadow = b.receiveShadow = true; grp.add(b); };
      piece(a0, a0 + F, 0, o.head); piece(a0 + len - F, a0 + len, 0, o.head); piece(a0 + F, a0 + len - F, o.head - F, o.head);
      const face = sgn > 0 ? d1 - 1.2 : d0 + 1.2, ang = (alongX ? -sgn : sgn) * Math.PI / 2;
      hinged({ px: (alongX ? a0 + F : face) * M, y0: 0, pz: (alongX ? face : a0 + F) * M, len: (len - 2 * F - 0.5) * M, h: (o.head - F - 1) * M, axis: alongX ? 'x' : 'z', dir: 1, ang, open: true, kind: 'room', handle: [1, -1], handleLen: 0.04, parent: grp });
    });
  })();

  /* ---- światło ---- */
  const hemi = new THREE.HemisphereLight(0xFFFFFF, 0xB89A78, 0.6); scene.add(hemi);
  const amb = new THREE.AmbientLight(0xFFFFFF, 0.14); scene.add(amb);
  const sun = new THREE.DirectionalLight(0xFFE6C4, 0.85);
  sun.position.set(26, 9, 3); sun.target.position.set(7.2, 0, 4.5); scene.add(sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 50 }); sun.shadow.bias = -0.0006;
  scene.add(sun);
  const pool = [];
  [[2.3, 1.5], [9.5, 2.7], [5.0, 6.4]].forEach(p => { const l = new THREE.PointLight(0xFFF1DC, 0.22, 9); l.position.set(p[0], 2.6, p[1]); scene.add(l); const l2 = l.clone(); l2.position.y = 3.2 + 2.4; scene.add(l2); pool.push(l, l2); });
  pool.forEach(l => { l.userData.day = l.position.clone(); });

  /* ---- dzień / noc ----
     Liczba świateł w scenie jest stała (zmiana liczby przekompilowuje wszystkie shadery): w nocy te same 6 świateł punktowych,
     które w dzień doświetlają dom, przenosi się do opraw pomieszczenia, w którym jesteś. Pozostałe oprawy tylko świecą (emissive). */
  const DAY = { bg: 0xD8E3EC, sky: 0xFFFFFF, gnd: 0xB89A78, hemi: 0.6, amb: 0.14, sun: 0xFFE6C4, sunI: 0.85, glass: 0xBFD9EE, glassO: 0.2, roof: 0.5 };
  const NIGHT = { bg: 0x0B1322, sky: 0x31456B, gnd: 0x1A1712, hemi: 0.16, amb: 0.04, sun: 0x9DB4E0, sunI: 0.1, glass: 0x0F1A2C, glassO: 0.55, roof: 0 };
  let night = false, litKey = null;
  const lightRoomAt = (lv, x, z) => { const r = H.rooms.find(q => q.level === lv && pointIn(q.poly, x, z)); return r ? (r.id === '1.01' ? '0.09' : r.id) : null; };
  function focusRoom() {
    if (st.mode === 'walk' && !st.overlay) return lightRoomAt(st.y < 140 ? 0 : 1, st.x, st.z);
    return st.room ? (st.room === '1.01' ? '0.09' : st.room) : null;
  }
  function assignLights() {
    const fr = focusRoom(), key = night + '|' + fr + '|' + st.mode + '|' + (st.room ? modState[st.room] && modState[st.room].variant : '');
    if (key === litKey) return; litKey = key;
    if (!night) { pool.forEach(l => { l.position.copy(l.userData.day); l.color.setHex(0xFFF1DC); l.intensity = 0.22; l.distance = 9; l.decay = 1; }); return; }
    // światła pokoju świecą także, gdy jego kondygnacja jest ukryta (schody 0.09 w widoku parteru); warianty mebli się liczą
    const shown = o => { while (o && levelGroups.indexOf(o) < 0) { if (!o.visible) return false; o = o.parent; } return true; };
    const v = new THREE.Vector3();
    let pick;
    if (fr) pick = LIGHTS.filter(l => l.room === fr && shown(l.anchor)).sort((a, b) => b.power - a.power);
    else { const T = st.target; pick = LIGHTS.filter(l => isVis(l.anchor)).filter(l => l.lv === st.level).map(l => ({ l, d: l.anchor.getWorldPosition(v).distanceTo(T) })).sort((a, b) => a.d - b.d).map(p => p.l); }
    pool.forEach((p, i) => {
      const l = pick[i];
      if (!l) { p.intensity = 0; return; }
      l.anchor.getWorldPosition(p.position); p.color.setHex(0xFFD7A6); p.intensity = (fr ? 1.25 : 0.8) * l.power; p.distance = l.dist; p.decay = 1.6;
    });
  }
  function applyTime() {
    const T = night ? NIGHT : DAY;
    scene.background.setHex(T.bg); hemi.color.setHex(T.sky); hemi.groundColor.setHex(T.gnd); hemi.intensity = T.hemi; amb.intensity = T.amb;
    sun.color.setHex(T.sun); sun.intensity = T.sunI; glassM.color.setHex(T.glass); glassM.opacity = T.glassO;
    roofWinMats.forEach(m => { m.emissiveIntensity = T.roof; });
    glows.forEach(m => { m.emissive.setHex(0xFFE2B0); m.emissiveIntensity = night ? 0.95 : 0; });
    setPressed2($('tD'), !night); setPressed2($('tN'), night);
    litKey = null; assignLights();
  }

  /* ================= Spacer: kolizje i schody ================= */
  const CELL = 5, NX = Math.ceil(FP[1] / CELL) + 2, NZ = Math.ceil(FP[3] / CELL) + 2;
  const grids = [new Uint8Array(NX * NZ), new Uint8Array(NX * NZ)];
  const mark = (lv, x0, x1, z0, z1) => { for (let i = Math.max(0, Math.floor(x0 / CELL)); i <= Math.min(NX - 1, Math.floor(x1 / CELL)); i++) for (let j = Math.max(0, Math.floor(z0 / CELL)); j <= Math.min(NZ - 1, Math.floor(z1 / CELL)); j++) grids[lv][j * NX + i] = 1; };
  H.levels.forEach((L, lv) => L.walls.forEach(w => mark(lv, w[0], w[0] + w[2], w[1], w[1] + w[3])));
  H.openings.forEach(o => { if (o.k !== 'idoor') mark(o.lv, o.x0, o.x1, o.z0, o.z1); });
  const blocked = (lv, x, z) => { if (x < 2 || z < 2 || x > FP[1] - 2 || z > FP[3] - 2) return true; const i = Math.floor(x / CELL), j = Math.floor(z / CELL); return grids[lv][j * NX + i] === 1; };
  const inR = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
  function ramp(f, z) { const t = f.dir === '+z' ? (z - f.z0) / (f.z1 - f.z0) : (f.z1 - z) / (f.z1 - f.z0); return f.from + (f.to - f.from) * Math.max(0, Math.min(1, t)); }
  function surfaces(x, z) {
    const s = [], f1 = ST.flights[0], f2 = ST.flights[1];
    if (inR(f1, x, z)) s.push(ramp(f1, z)); else s.push(0);
    if (inR(f2, x, z)) s.push(ramp(f2, z));
    if (inR(ST.landing, x, z)) s.push(ST.landing.y);
    if (!inR(VOID, x, z)) s.push(LV_Y[1]);
    return s;
  }
  const RAD = 18;
  function canStand(x, z, y) {
    const lv = y < 140 ? 0 : 1;
    for (let a = 0; a < 8; a++) { if (blocked(lv, x + Math.cos(a * Math.PI / 4) * RAD, z + Math.sin(a * Math.PI / 4) * RAD)) return false; }
    if (blocked(lv, x, z)) return false;
    if (lv === 1 && y >= LV_Y[1] - 1 && y - LV_Y[1] + st.eye > roofH(z) - 6) return false;
    return true;
  }
  function tryMove(nx, nz) {
    const c = surfaces(nx, nz).filter(s => Math.abs(s - st.y) <= 30).sort((a, b) => Math.abs(a - st.y) - Math.abs(b - st.y));
    for (const s of c) { if (canStand(nx, nz, s)) { st.x = nx; st.z = nz; st.y = s; return true; } }
    return false;
  }
  function findFree(cx, cz, lv) {
    const y = LV_Y[lv];
    for (let r = 0; r < 200; r += 5) for (let a = 0; a < 16; a++) { const x = cx + Math.cos(a * Math.PI / 8) * r, z = cz + Math.sin(a * Math.PI / 8) * r; if (!inR(VOID, x, z) || lv === 0) { if (canStand(x, z, y)) return { x, z }; } }
    return { x: cx, z: cz };
  }

  /* ================= Stan i sterowanie ================= */
  const st = { screen: 'home', mode: 'orbit', level: 0, room: null, eye: 165, x: 480, z: 700, y: 0, yaw: 0, pitch: -0.05, th: 0.6, ph: 0.75, r: 12, target: new THREE.Vector3(7.2, 1, 4.5), keys: {}, overlay: null, sel: null, selP: null };
  const bar = $('bar'), help = $('help'), pad = $('pad');
  const showLayer = id => ['home', 'floor', 'plan', 'notes'].forEach(k => { $(k).hidden = k !== id; });

  // --- ekran główny
  function levelThumb(lv) {
    const L = H.levels[lv];
    let s = '<svg viewBox="-10 -10 1462 917" aria-hidden="true">';
    H.rooms.filter(r => r.level === lv).forEach(r => { s += '<polygon class="f-room' + (MODS[r.id] ? ' det' : '') + '" points="' + r.poly.map(p => p.join(',')).join(' ') + '"/>'; });
    L.walls.forEach(w => { s += '<rect class="f-wall" x="' + w[0] + '" y="' + w[1] + '" width="' + w[2] + '" height="' + w[3] + '"/>'; });
    return s + '</svg>';
  }
  $('cards').innerHTML = H.levels.map((L, lv) => '<button class="card" type="button" data-lv="' + lv + '"><strong>' + L.name + '</strong><span class="meta">' + String(L.area).replace('.', ',') + ' m² · ' + H.rooms.filter(r => r.level === lv).length + ' pomieszczeń</span>' + levelThumb(lv) + '</button>').join('');
  $('cards').addEventListener('click', e => { const b = e.target.closest('[data-lv]'); if (b) openFloor(+b.dataset.lv); });
  $('walkAll').onclick = () => { st.room = null; st.level = H.start.level; enter3D('walk', { x: H.start.x, z: H.start.z, lv: H.start.level, yaw: H.start.yaw }); };
  $('houseNotes').onclick = () => { st.room = null; st.overlay = 'notes'; renderNotes(null); showLayer('notes'); bar.hidden = false; configBar('notesHouse'); };

  // --- ekran kondygnacji
  function openFloor(lv) {
    st.screen = 'floor'; st.level = lv; st.room = null; bar.hidden = true; help.hidden = true; pad.hidden = true;
    $('floorTtl').textContent = H.levels[lv].name; showLayer('floor'); drawFloor();
  }
  function drawFloor() {
    const lv = st.level, L = H.levels[lv], ub = H.underlayBox, svg = $('floorSvg');
    svg.setAttribute('viewBox', '-70 -60 1582 1020');
    let s = '';
    if ($('underChk').checked) s += '<image href="' + L.underlay + '" x="' + ub[0] + '" y="' + ub[1] + '" width="' + ub[2] + '" height="' + ub[3] + '" opacity="0.55" preserveAspectRatio="none"/>';
    const rooms = H.rooms.filter(r => r.level === lv);
    rooms.forEach(r => { s += '<polygon class="f-room' + (MODS[r.id] ? ' det' : '') + '" data-room="' + r.id + '" tabindex="0" role="button" aria-label="' + r.id + ' ' + r.name + ', ' + String(r.area).replace('.', ',') + ' m²" points="' + r.poly.map(p => p.join(',')).join(' ') + '" fill-opacity="' + ($('underChk').checked ? 0.55 : 1) + '"/>'; });
    L.walls.forEach(w => { s += '<rect class="f-wall" x="' + w[0] + '" y="' + w[1] + '" width="' + w[2] + '" height="' + w[3] + '" opacity="' + ($('underChk').checked ? 0.75 : 1) + '"/>'; });
    if (lv === 0) ST.flights.forEach(f => { for (let i = 0; i <= f.steps; i++) { const z = f.z0 + (f.z1 - f.z0) * i / f.steps; s += '<line class="f-st" x1="' + f.x0 + '" y1="' + z + '" x2="' + f.x1 + '" y2="' + z + '"/>'; } });
    rooms.forEach(r => {
      const c = centroid(r.poly), small = area(r.poly) < 25000;
      s += '<text class="f-lab" x="' + c[0] + '" y="' + (c[1] - (small ? 4 : 8)) + '" text-anchor="middle"' + (small ? ' style="font-size:16px"' : '') + '>' + r.id + '</text>';
      s += '<text class="f-lab2" x="' + c[0] + '" y="' + (c[1] + (small ? 12 : 16)) + '" text-anchor="middle"' + (small ? ' style="font-size:12px"' : '') + '>' + (small ? '' : r.name + ' · ') + String(r.area).replace('.', ',') + ' m²</text>';
      if (MODS[r.id]) s += '<text class="f-tag" x="' + c[0] + '" y="' + (c[1] + 36) + '" text-anchor="middle">zaprojektowany</text>';
    });
    svg.innerHTML = s;
    $('floorSide').innerHTML = '<h2>' + L.name + '</h2><p>Kliknij pomieszczenie na rzucie albo na liście. Podkład pokazuje oryginalny rysunek pod rekonstrukcją — tak sprawdzisz zgodność ścian.</p><h3>Pomieszczenia</h3><div class="rl">' + rooms.map(r => '<button type="button" data-room="' + r.id + '"><span>' + r.id + ' ' + r.name + (MODS[r.id] ? ' ✓' : '') + '</span><small>' + String(r.area).replace('.', ',') + ' m²</small></button>').join('') + '</div><p>Razem: <strong>' + String(L.area).replace('.', ',') + ' m²</strong> (wg zestawienia projektu)</p>';
  }
  function centroid(p) { let x = 0, z = 0, a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length], f = q[0] * r[1] - r[0] * q[1]; a += f; x += (q[0] + r[0]) * f; z += (q[1] + r[1]) * f; } a *= 0.5; return [x / (6 * a), z / (6 * a)]; }
  function pointIn(p, x, z) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const a = p[i], b = p[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  function area(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return Math.abs(a / 2); }
  $('underChk').onchange = drawFloor;
  $('floorBack').onclick = () => { st.screen = 'home'; showLayer('home'); };
  $('floorWalk').onclick = () => { const lv = st.level, p = lv === 0 ? { x: H.start.x, z: H.start.z, yaw: H.start.yaw } : { x: 560, z: 450, yaw: -Math.PI / 2 }; enter3D('walk', { x: p.x, z: p.z, lv, yaw: p.yaw }); };
  $('floorOrbit').onclick = () => enter3D('orbit', { lv: st.level });
  const pickRoom = e => { const g = e.target.closest('[data-room]'); if (g) openRoom(g.dataset.room); };
  $('floorSvg').addEventListener('click', pickRoom); $('floorSide').addEventListener('click', pickRoom);
  $('floorSvg').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickRoom(e); } });

  // --- pomieszczenie
  function openRoom(id) {
    const r = roomById(id); st.room = id; st.level = r.level; st.sel = null; st.selP = null;
    const md = MODS[id], c = centroid(r.poly);
    if (md && md.start) { const s = md.start; enter3D('orbit', { lv: r.level, room: id, x: md.origin.x + s.x, z: md.origin.z + s.z, yaw: s.yaw }); }
    else enter3D('orbit', { lv: r.level, room: id, x: c[0], z: c[1], yaw: 0 });
  }
  function enter3D(mode, o) {
    st.screen = '3d'; showLayer(null); bar.hidden = false; st.level = o.lv;
    if (o.room !== undefined) st.room = o.room;
    const r = st.room ? roomById(st.room) : null, c = r ? centroid(r.poly) : [FP[1] / 2, FP[3] / 2];
    const p = (o.x != null) ? findFree(o.x, o.z, o.lv) : findFree(c[0], c[1], o.lv);
    st.x = p.x; st.z = p.z; st.y = LV_Y[o.lv]; st.yaw = o.yaw || 0; st.pitch = -0.05;
    st.target.set(c[0] * M, (LV_Y[o.lv] + 90) * M, c[1] * M); st.r = r ? 6.5 : 13; st.ph = r ? 0.55 : 0.7; st.th = 0.5;
    setMode(mode);
  }
  $('backBtn').onclick = () => { if (st.room) openFloor(st.level); else if (st.screen === 'notes' || !$('notes').hidden) { st.screen = 'home'; showLayer('home'); bar.hidden = true; } else openFloor(st.level); };

  function configBar(kind) {
    const r = st.room ? roomById(st.room) : null, md = st.room ? MODS[st.room] : null;
    $('ttl').textContent = kind === 'notesHouse' ? 'Uwagi do modelu' : r ? r.id + ' ' + r.name + ' · ' + H.levels[r.level].name : 'Dom · ' + H.levels[st.level].name;
    $('varGrp').hidden = !(md && md.variants);
    if (md && md.variants) { const ks = Object.keys(md.variants); $('vA').textContent = md.variants[ks[0]]; $('vB').textContent = md.variants[ks[1]]; setPressed2($('vA'), modState[st.room].variant === ks[0]); setPressed2($('vB'), modState[st.room].variant === ks[1]); }
    $('viewGrp').hidden = kind === 'notesHouse';
    $('mP').hidden = !r; $('mN').hidden = !r; $('mE').hidden = !(md && md.points);
    $('wGrp').hidden = !(md && doors.some(d => d.kind === 'w'));
    $('eyeGrp').hidden = st.mode !== 'walk' || st.overlay;
    $('dnGrp').hidden = kind === 'notesHouse' || !!st.overlay;
  }
  function setPressed2(b, on) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  function setMode(m) {
    if (m === 'plan' || m === 'elec' || m === 'notes') { st.overlay = m; }
    else { st.overlay = null; st.mode = m; }
    [['mW', 'walk'], ['mO', 'orbit'], ['mP', 'plan'], ['mE', 'elec'], ['mN', 'notes']].forEach(p => setPressed2($(p[0]), st.overlay ? st.overlay === p[1] : st.mode === p[1]));
    configBar();
    const flat = !!st.overlay;
    help.hidden = flat; pad.hidden = flat || st.mode !== 'walk';
    if (!flat) { showLayer(null); levelGroups[1].visible = !(st.mode === 'orbit' && st.level === 0); updateHelp(); assignLights(); }
    if (m === 'plan' || m === 'elec') { showLayer('plan'); fitLayer('plan'); st.sel = null; st.selP = null; m === 'elec' ? drawElec() : drawPlan(); }
    if (m === 'notes') { renderNotes(st.room); showLayer('notes'); fitLayer('notes'); }
  }
  function fitLayer(id) { $(id).style.paddingTop = (bar.getBoundingClientRect().height + 8) + 'px'; }
  function updateHelp() {
    help.innerHTML = st.mode === 'walk'
      ? '<strong>Spacer</strong><span>Przeciągnij, żeby się rozejrzeć. Ruch: W A S D, strzałki lub przyciski. Schodami wchodzisz na poddasze.</span><span class="long">Kliknij drzwi, front szafy lub łóżko w 1.08, żeby je otworzyć lub rozłożyć. Noc: zapala światła pomieszczenia, w którym jesteś.</span>'
      : '<strong>Z góry</strong><span>Przeciągnij, żeby obrócić. Kółko myszy lub dwa palce: przybliżenie.</span><span class="long">' + (st.level === 0 ? 'Poddasze ukryte, żeby było widać parter.' : 'Sufity są przezroczyste od góry.') + '</span>';
  }
  $('mW').onclick = () => setMode('walk'); $('mO').onclick = () => setMode('orbit'); $('mP').onclick = () => setMode('plan'); $('mE').onclick = () => setMode('elec'); $('mN').onclick = () => setMode('notes');
  $('eK').onclick = () => { st.eye = 120; setPressed2($('eK'), true); setPressed2($('eD'), false); };
  $('eD').onclick = () => { st.eye = 165; setPressed2($('eD'), true); setPressed2($('eK'), false); };
  $('tD').onclick = () => { night = false; applyTime(); };
  $('tN').onclick = () => { night = true; applyTime(); };
  const pickVar = k => { const s = modState[st.room]; s.variant = k; applyVariant(st.room); configBar(); assignLights(); st.sel = null; if (st.overlay === 'plan') drawPlan(); if (st.overlay === 'elec') drawElec(); };
  $('vA').onclick = () => pickVar(Object.keys(MODS[st.room].variants)[0]);
  $('vB').onclick = () => pickVar(Object.keys(MODS[st.room].variants)[1]);
  const wO = $('wO');
  function syncW() { const all = doors.filter(d => d.kind === 'w').every(d => d.open); setPressed2(wO, all); wO.textContent = all ? 'Zamknij' : 'Otwórz'; }
  wO.onclick = () => { const any = doors.some(d => d.kind === 'w' && !d.open); doors.forEach(d => { if (d.kind === 'w') d.open = any; }); syncW(); };

  /* ================= Rzut pomieszczenia ================= */
  const fmt = v => String(Math.round(v * 2) / 2).replace('.', ',');
  const ov = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0) > 1;
  const mid = (a0, a1, b0, b1) => (Math.max(a0, b0) + Math.min(a1, b1)) / 2;
  function dimLine(x1, y1, x2, y2, t, cls, side) {
    side = side || 1; const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, hor = Math.abs(y2 - y1) < 0.01;
    const tk = hor ? 'M' + x1 + ',' + (y1 - 4) + 'V' + (y1 + 4) + 'M' + x2 + ',' + (y2 - 4) + 'V' + (y2 + 4) : 'M' + (x1 - 4) + ',' + y1 + 'H' + (x1 + 4) + 'M' + (x2 - 4) + ',' + y2 + 'H' + (x2 + 4);
    const tx = hor ? mx : mx + 5 * side, ty = hor ? my - 5 * side + (side < 0 ? 8 : 0) : my + 3, an = hor ? 'middle' : (side > 0 ? 'start' : 'end');
    return '<path class="' + cls + '" d="M' + x1 + ',' + y1 + 'L' + x2 + ',' + y2 + tk + '"/><text class="' + cls + '-t" x="' + tx + '" y="' + ty + '" text-anchor="' + an + '">' + t + '</text>';
  }
  // rama pomieszczenia: dla modułu lokalny układ, dla pozostałych przesunięcie do narożnika obrysu
  function roomFrame(id) {
    const r = roomById(id), md = MODS[id];
    if (md && md.plan) {
      const v = modState[id].variant, P = md.plan;
      return { poly: P.poly, wallsV: P.wallsV, wallsH: P.wallsH, items: P.items.common.concat(P.items[v] || []), dims: P.dims.map(d => dimLine(d[0], d[1], d[2], d[3], d[4], 'p-dim', d[5])).join(''), door: P.door, window: P.window, slope: P.slope, info: P.info, O: md.origin };
    }
    const xs = r.poly.map(p => p[0]), zs = r.poly.map(p => p[1]), O = { x: Math.min(...xs), z: Math.min(...zs) };
    const poly = r.poly.map(p => [Math.round((p[0] - O.x) * 2) / 2, Math.round((p[1] - O.z) * 2) / 2]);
    const wallsV = [], wallsH = [], dims = [];
    let sa = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; sa += a[0] * b[1] - b[0] * a[1]; }
    const sgn = sa > 0 ? 1 : -1;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], dx = b[0] - a[0], dz = b[1] - a[1];
      const nx = dz * sgn, nz = -dx * sgn, ln = Math.hypot(dx, dz) || 1, ux = nx / ln, uz = nz / ln;
      if (Math.abs(dx) < 0.1) wallsV.push({ x: a[0], a: Math.min(a[1], b[1]), b: Math.max(a[1], b[1]), n: 'ściana' });
      else wallsH.push({ z: a[1], a: Math.min(a[0], b[0]), b: Math.max(a[0], b[0]), n: 'ściana' });
      const o = 22;
      const side = Math.abs(dx) < 0.1 ? (ux > 0 ? 1 : -1) : (uz > 0 ? -1 : 1);
      dims.push(dimLine(a[0] + ux * o, a[1] + uz * o, b[0] + ux * o, b[1] + uz * o, fmt(ln), 'p-dim', side));
    }
    const items = H.furniture.filter(f => f.room === id).map((f, i) => ({ id: 'f' + i, s: f.name.split(' ')[0], name: f.name, x0: f.x0 - O.x, x1: f.x1 - O.x, z0: f.z0 - O.z, z1: f.z1 - O.z, h: (f.y1 - f.y0) + ' cm', along: (f.x1 - f.x0) >= (f.z1 - f.z0) ? 'x' : 'z', solid: true, note: 'Szkic z rysunku architekta — do zaprojektowania.' }));
    const bw = Math.max(...poly.map(p => p[0])), bd = Math.max(...poly.map(p => p[1]));
    return { poly, wallsV, wallsH, items, dims: dims.join(''), info: [['Pomieszczenie', fmt(bw) + ' × ' + fmt(bd) + ' cm (obrys)'], ['Powierzchnia', String(r.area).replace('.', ',') + ' m² (wg projektu)'], ['Wykończenie', r.floor]], O };
  }
  function dimsOf(it) { const w = it.x1 - it.x0, d = it.z1 - it.z0; return it.along === 'x' ? fmt(w) + ' × ' + fmt(d) : fmt(d) + ' × ' + fmt(w); }
  function gaps(F, it) {
    const obs = F.items.filter(o => o.solid && o.id !== it.id), res = [];
    const L = { v: -1e9 }, Rr = { v: 1e9 }, U = { v: -1e9 }, Dn = { v: 1e9 };
    F.wallsV.forEach(w => { if (!ov(it.z0, it.z1, w.a, w.b)) return; const m = mid(it.z0, it.z1, w.a, w.b); if (w.x <= it.x0 + 0.5 && w.x > L.v) Object.assign(L, { v: w.x, n: w.n, m }); if (w.x >= it.x1 - 0.5 && w.x < Rr.v) Object.assign(Rr, { v: w.x, n: w.n, m }); });
    F.wallsH.forEach(w => { if (!ov(it.x0, it.x1, w.a, w.b)) return; const m = mid(it.x0, it.x1, w.a, w.b); if (w.z <= it.z0 + 0.5 && w.z > U.v) Object.assign(U, { v: w.z, n: w.n, m }); if (w.z >= it.z1 - 0.5 && w.z < Dn.v) Object.assign(Dn, { v: w.z, n: w.n, m }); });
    obs.forEach(o => {
      if (ov(it.z0, it.z1, o.z0, o.z1)) { const m = mid(it.z0, it.z1, o.z0, o.z1); if (o.x1 <= it.x0 + 0.5 && o.x1 > L.v) Object.assign(L, { v: o.x1, n: o.name, m }); if (o.x0 >= it.x1 - 0.5 && o.x0 < Rr.v) Object.assign(Rr, { v: o.x0, n: o.name, m }); }
      if (ov(it.x0, it.x1, o.x0, o.x1)) { const m = mid(it.x0, it.x1, o.x0, o.x1); if (o.z1 <= it.z0 + 0.5 && o.z1 > U.v) Object.assign(U, { v: o.z1, n: o.name, m }); if (o.z0 >= it.z1 - 0.5 && o.z0 < Dn.v) Object.assign(Dn, { v: o.z0, n: o.name, m }); }
    });
    if (L.n) res.push({ k: '←', d: it.x0 - L.v, n: L.n, l: [L.v, L.m, it.x0, L.m] });
    if (Rr.n) res.push({ k: '→', d: Rr.v - it.x1, n: Rr.n, l: [it.x1, Rr.m, Rr.v, Rr.m] });
    if (U.n) res.push({ k: '↑', d: it.z0 - U.v, n: U.n, l: [U.m, U.v, U.m, it.z0] });
    if (Dn.n) res.push({ k: '↓', d: Dn.v - it.z1, n: Dn.n, l: [Dn.m, it.z1, Dn.m, Dn.v] });
    res.forEach(g => { g.d = Math.max(0, g.d); }); return res;
  }
  function shellSvg(F) {
    const pts = F.poly.map(p => p.join(',')).join(' ');
    let s = '<polygon class="p-wall" points="' + pts + '"/>';
    if (F.door) { const d = F.door; s += '<line class="p-gap" x1="' + d.x0 + '" y1="' + d.wallZ + '" x2="' + d.x1 + '" y2="' + d.wallZ + '"/><line class="p-leaf" x1="' + d.hinge + '" y1="' + d.wallZ + '" x2="' + d.hinge + '" y2="' + (d.wallZ - d.swing) + '"/><path class="p-swing" d="M' + d.hinge + ',' + (d.wallZ - d.swing) + ' A' + d.swing + ',' + d.swing + ' 0 0 1 ' + (d.hinge + d.swing) + ',' + d.wallZ + '"/>'; }
    if (F.window) { const w = F.window; s += w.wall === 'x' ? '<line class="p-win" x1="' + w.at + '" y1="' + w.a + '" x2="' + w.at + '" y2="' + w.b + '"/>' : '<line class="p-win" x1="' + w.a + '" y1="' + w.at + '" x2="' + w.b + '" y2="' + w.at + '"/>'; }
    // otwory z danych domu (dla pomieszczeń bez modułu)
    if (!F.door) H.openings.filter(o => o.lv === st.level).forEach(o => {
      const x0 = o.x0 - F.O.x, x1 = o.x1 - F.O.x, z0 = o.z0 - F.O.z, z1 = o.z1 - F.O.z;
      const bw = Math.max(...F.poly.map(p => p[0])), bd = Math.max(...F.poly.map(p => p[1]));
      if (x1 < -30 || x0 > bw + 30 || z1 < -30 || z0 > bd + 30) return;
      const cls = o.k === 'window' ? 'p-win' : 'p-gap', alongX = (x1 - x0) > (z1 - z0);
      const onEdge = alongX ? [0, bd].map(v => Math.abs((z0 + z1) / 2 - v) < 40) : [0, bw].map(v => Math.abs((x0 + x1) / 2 - v) < 40);
      if (!onEdge.some(Boolean)) return;
      if (alongX) { const zz = Math.abs((z0 + z1) / 2) < 40 ? 0 : bd; s += '<line class="' + cls + '" x1="' + Math.max(0, x0) + '" y1="' + zz + '" x2="' + Math.min(bw, x1) + '" y2="' + zz + '"/>'; }
      else { const xx = Math.abs((x0 + x1) / 2) < 40 ? 0 : bw; s += '<line class="' + cls + '" x1="' + xx + '" y1="' + Math.max(0, z0) + '" x2="' + xx + '" y2="' + Math.min(bd, z1) + '"/>'; }
    });
    return s;
  }
  function viewBoxFor(F) { const xs = F.poly.map(p => p[0]), zs = F.poly.map(p => p[1]); const x0 = Math.min(...xs) - 70, z0 = Math.min(...zs) - 55, x1 = Math.max(...xs) + 95, z1 = Math.max(...zs) + 55; return x0 + ' ' + z0 + ' ' + (x1 - x0) + ' ' + (z1 - z0); }
  function drawPlan() {
    const F = roomFrame(st.room), svg = $('planSvg'); svg.setAttribute('viewBox', viewBoxFor(F));
    const pts = F.poly.map(p => p.join(',')).join(' ');
    let s = '<defs><clipPath id="rc"><polygon points="' + pts + '"/></clipPath></defs><polygon class="p-fill" points="' + pts + '"/>';
    const r = roomById(st.room);
    if (F.slope) s += '<g clip-path="url(#rc)">' + F.slope.map(q => '<rect class="' + q.cls + '" x="-10" y="' + q.z0 + '" width="1000" height="' + (q.z1 - q.z0) + '"/>').join('') + '</g>';
    else if (r.level === 1) { // skosy z dachu dla pomieszczeń poddasza
      const k1 = KINKS[1] - F.O.z, k2 = KINKS[2] - F.O.z, e0 = R.eaveZ[0] - F.O.z, e1 = R.eaveZ[1] - F.O.z, z220a = e0 + 60 / TAN, z220b = e1 - 60 / TAN;
      s += '<g clip-path="url(#rc)"><rect class="p-slope1" x="-10" y="' + e0 + '" width="2000" height="' + (z220a - e0) + '"/><rect class="p-slope2" x="-10" y="' + z220a + '" width="2000" height="' + (k1 - z220a) + '"/><rect class="p-slope2" x="-10" y="' + k2 + '" width="2000" height="' + (z220b - k2) + '"/><rect class="p-slope1" x="-10" y="' + z220b + '" width="2000" height="' + (e1 - z220b) + '"/></g>';
    }
    F.items.forEach(it => {
      const sel = it.id === st.sel, w = it.x1 - it.x0, d = it.z1 - it.z0, cx = (it.x0 + it.x1) / 2, cz = (it.z0 + it.z1) / 2;
      s += '<g class="p-it' + (it.floor ? ' p-floor' : '') + (sel ? ' sel' : '') + '" data-id="' + it.id + '" tabindex="0" role="button" aria-pressed="' + sel + '" aria-label="' + it.name + ', ' + dimsOf(it) + ' cm"><rect x="' + it.x0 + '" y="' + it.z0 + '" width="' + w + '" height="' + d + '" rx="2"/>';
      if (w >= 40 && d >= 30) s += '<text class="p-lab" x="' + cx + '" y="' + (cz - 2) + '" text-anchor="middle">' + it.s + '</text><text class="p-lab2" x="' + cx + '" y="' + (cz + 10) + '" text-anchor="middle">' + dimsOf(it) + '</text>';
      s += '</g>';
    });
    s += shellSvg(F) + F.dims;
    const sel = F.items.find(i => i.id === st.sel);
    if (sel) gaps(F, sel).forEach(g => { if (g.d >= 0.5) s += dimLine(g.l[0], g.l[1], g.l[2], g.l[3], fmt(g.d), 'p-gapd'); });
    svg.innerHTML = s; renderInfo(F, sel);
  }
  function renderInfo(F, it) {
    const info = $('info');
    if (!it) { info.innerHTML = '<h2>Rzut z wymiarami</h2><p>Kliknij mebel, żeby zobaczyć jego wymiary oraz odległości od ścian i sąsiednich mebli.</p><dl>' + F.info.map(p => '<dt>' + p[0] + '</dt><dd>' + p[1] + '</dd>').join('') + '</dl><p>Wymiary mebli: szerokość × głębokość w cm.' + (MODS[st.room] ? '' : ' Meble to szkic z rysunku architekta.') + '</p>'; return; }
    const g = gaps(F, it);
    info.innerHTML = '<h2>' + it.name + '</h2><dl><dt>Szer. × gł.</dt><dd>' + dimsOf(it) + ' cm</dd><dt>Wysokość</dt><dd>' + it.h + '</dd></dl><h3>Odległości</h3><ul>' + g.map(x => '<li>' + x.k + ' ' + x.n + ': <strong>' + (x.d < 0.5 ? 'przylega' : fmt(x.d) + ' cm') + '</strong></li>').join('') + '</ul>' + (it.note ? '<p>' + it.note + '</p>' : '') + '<button class="btn2" id="clr" type="button">Odznacz</button>';
    $('clr').onclick = () => { st.sel = null; drawPlan(); };
  }
  // instalacje
  const CAT = { sock: ['Gniazda', '#2F6EA6'], sw: ['Włączniki', '#3A3F48'], ctl: ['Sterowniki', '#C8382E'], light: ['Oświetlenie', '#A87B1E'], net: ['Sieć', '#4E7D52'], pow: ['Zasilanie urządzeń', '#6B7280'], ac: ['Klimatyzacja', '#4F86BC'] };
  function drawElec() {
    const F = roomFrame(st.room), md = MODS[st.room], svg = $('planSvg'); svg.setAttribute('viewBox', viewBoxFor(F));
    const pts = F.poly.map(p => p.join(',')).join(' ');
    let s = '<polygon class="p-fill" points="' + pts + '"/>';
    F.items.forEach(it => { if (it.floor || it.id === 'chair') return; const w = it.x1 - it.x0, d = it.z1 - it.z0; s += '<g class="p-ghost" aria-hidden="true"><rect x="' + it.x0 + '" y="' + it.z0 + '" width="' + w + '" height="' + d + '" rx="2"/>' + (w >= 40 && d >= 30 ? '<text x="' + (it.x0 + w / 2) + '" y="' + (it.z0 + d / 2 + 3) + '" text-anchor="middle">' + it.s + '</text>' : '') + '</g>'; });
    s += shellSvg(F);
    (md.points || []).forEach(p => {
      const px = p.x + (p.ox || 0), pz = p.z + (p.oz || 0), col = CAT[p.c][1], sel = p.id === st.selP;
      if (p.ox || p.oz) s += '<line class="e-lead" x1="' + p.x + '" y1="' + p.z + '" x2="' + px + '" y2="' + pz + '"/>';
      s += '<g class="e-pt' + (sel ? ' sel' : '') + '" data-pid="' + p.id + '" tabindex="0" role="button" aria-pressed="' + sel + '" aria-label="' + p.name + ', ' + p.h + '">';
      s += p.rect ? '<rect x="' + (px - 40) + '" y="' + (pz - 6) + '" width="80" height="12" rx="3" style="fill:' + col + '"/>' : '<circle cx="' + px + '" cy="' + pz + '" r="7" style="fill:' + col + '"/>';
      s += '<text x="' + px + '" y="' + (pz + 2.5) + '" text-anchor="middle">' + p.k + '</text></g>';
    });
    s += F.dims; svg.innerHTML = s;
    const p = (md.points || []).find(q => q.id === st.selP), info = $('info');
    if (p) { info.innerHTML = '<h2>' + p.name + '</h2><dl><dt>Wysokość</dt><dd>' + p.h + '</dd><dt>Miejsce</dt><dd>' + p.loc + '</dd><dt>Rodzaj</dt><dd>' + CAT[p.c][0] + '</dd></dl>' + (p.note ? '<p>' + p.note + '</p>' : '') + '<button class="btn2" id="clr" type="button">Odznacz</button>'; $('clr').onclick = () => { st.selP = null; drawElec(); }; return; }
    let h = '<h2>Instalacje</h2><p>Kliknij punkt na rzucie, żeby zobaczyć wysokość montażu i uzasadnienie. Wysokości od gotowej podłogi.</p><ul class="legend">';
    Object.keys(CAT).forEach(k => { const n = md.points.filter(q => q.c === k).length; if (n) h += '<li><span class="dot" style="background:' + CAT[k][1] + '"></span><span>' + CAT[k][0] + ': <strong>' + n + '</strong></span></li>'; });
    h += '</ul><h3>Wszystkie punkty</h3><ul class="legend">' + md.points.map(q => '<li><span class="dot" style="background:' + CAT[q.c][1] + '"></span><span>' + q.name + ' — ' + q.h + '</span></li>').join('') + '</ul><p>Wszystkie gniazda z przesłonami torów prądowych.</p>';
    info.innerHTML = h;
  }
  const planSvg = $('planSvg');
  planSvg.addEventListener('click', e => {
    if (st.overlay === 'elec') { const q = e.target.closest('[data-pid]'); st.selP = q ? (q.dataset.pid === st.selP ? null : q.dataset.pid) : null; drawElec(); return; }
    const g = e.target.closest('[data-id]'); st.sel = g ? (g.dataset.id === st.sel ? null : g.dataset.id) : null; drawPlan();
  });
  planSvg.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const attr = st.overlay === 'elec' ? 'data-pid' : 'data-id', g = e.target.closest('[' + attr + ']'); if (!g) return; e.preventDefault();
    const id = g.getAttribute(attr);
    if (st.overlay === 'elec') { st.selP = id === st.selP ? null : id; drawElec(); } else { st.sel = id === st.sel ? null : id; drawPlan(); }
    const n = planSvg.querySelector('[' + attr + '="' + id + '"]'); if (n) n.focus();
  });
  // uwagi
  function renderNotes(id) {
    const md = id ? MODS[id] : null, r = id ? roomById(id) : null;
    let html;
    if (!id) html = '<h1>Uwagi do modelu</h1><p class="lead">Założenia, na których opiera się model domu.</p><section><h2>Model</h2><ul>' + H.notes.map(n => '<li>' + n + '</li>').join('') + '</ul></section>';
    else if (md && md.notes) html = '<h1>Uwagi i ustalenia — ' + r.id + ' ' + r.name + '</h1><p class="lead">Wszystko, co ustaliliśmy dla tego pomieszczenia, w jednym miejscu.</p>' + md.notes.map(n => '<section' + (n.warn ? ' class="warn"' : '') + '><h2>' + n.t + '</h2><ul>' + n.items.map(i => '<li>' + i + '</li>').join('') + '</ul></section>').join('');
    else html = '<h1>' + r.id + ' ' + r.name + '</h1><p class="lead">To pomieszczenie czeka na projekt.</p><section><h2>Stan</h2><ul><li>Powierzchnia wg projektu: ' + String(r.area).replace('.', ',') + ' m², wykończenie: ' + r.floor + '.</li><li>Meble w modelu to szkic z rysunku architekta, bez uzgodnień.</li><li>Projekt tego pomieszczenia zrobimy w osobnej rozmowie, tak jak pokój 1.08.</li></ul></section>';
    $('notesIn').innerHTML = html;
  }

  /* ================= Wejście: mysz, dotyk, klawiatura ================= */
  const keyMap = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
  canvas.tabIndex = 0;
  canvas.addEventListener('keydown', e => { const k = keyMap[e.code]; if (k) { st.keys[k] = true; e.preventDefault(); } });
  canvas.addEventListener('keyup', e => { const k = keyMap[e.code]; if (k) st.keys[k] = false; });
  canvas.addEventListener('blur', () => { st.keys = {}; });
  pad.querySelectorAll('button').forEach(b => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', e => { e.preventDefault(); st.keys[k] = true; try { b.setPointerCapture(e.pointerId); } catch (_) { } });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, () => { st.keys[k] = false; }));
  });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function isVis(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
  function pickDoor(e) { const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); const hits = ray.intersectObjects(scene.children, true); for (const h of hits) { if (!isVis(h.object)) continue; return h.object.userData.door || null; } return null; }
  const ptrs = new Map(); let pinch0 = 0, r0 = 0;
  canvas.addEventListener('pointerdown', e => { canvas.focus(); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }); try { canvas.setPointerCapture(e.pointerId); } catch (_) { } if (ptrs.size === 2) { const a = [...ptrs.values()]; pinch0 = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); r0 = st.r; } });
  canvas.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId);
    if (!p) { if (e.pointerType === 'mouse' && st.screen === '3d') canvas.style.cursor = pickDoor(e) ? 'pointer' : ''; return; }
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 2 && st.mode === 'orbit') { const a = [...ptrs.values()]; const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); if (pinch0 > 0) st.r = Math.min(30, Math.max(2.5, r0 * pinch0 / d)); return; }
    if (st.mode === 'walk') { st.yaw -= dx * 0.005; st.pitch = Math.max(-1.2, Math.min(1.2, st.pitch - dy * 0.005)); }
    else { st.th -= dx * 0.006; st.ph = Math.max(0.12, Math.min(1.35, st.ph - dy * 0.006)); }
  });
  canvas.addEventListener('pointerup', e => { const p = ptrs.get(e.pointerId); if (p && ptrs.size === 1 && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < 6) { const d = pickDoor(e); if (d) { d.open = !d.open; syncW(); } } });
  ['pointerup', 'pointercancel'].forEach(ev => canvas.addEventListener(ev, e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; }));
  canvas.addEventListener('wheel', e => { if (st.mode !== 'orbit') return; e.preventDefault(); st.r = Math.min(30, Math.max(2.5, st.r * (1 + Math.sign(e.deltaY) * 0.08))); }, { passive: false });
  window.addEventListener('resize', () => { resize(); if (st.overlay === 'plan' || st.overlay === 'elec') fitLayer('plan'); if (st.overlay === 'notes') fitLayer('notes'); });

  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 85 : 70; camera.updateProjectionMatrix(); }
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    requestAnimationFrame(frame);
    if (st.screen !== '3d' || st.overlay) return;
    if (canvas.width !== Math.floor(canvas.clientWidth * renderer.getPixelRatio())) resize();
    if (st.mode === 'walk') {
      const sp = 130 * dt, k = st.keys, f = (k.f ? 1 : 0) - (k.b ? 1 : 0), s = (k.r ? 1 : 0) - (k.l ? 1 : 0);
      if (f || s) {
        const sy = Math.sin(st.yaw), cy = Math.cos(st.yaw), nx = st.x + (-sy * f + cy * s) * sp, nz = st.z + (-cy * f - sy * s) * sp;
        if (!tryMove(nx, nz)) { if (!tryMove(nx, st.z)) tryMove(st.x, nz); }
      }
      camera.position.set(st.x * M, (st.y + st.eye) * M, st.z * M); camera.rotation.set(st.pitch, st.yaw, 0);
      if (night && (f || s)) assignLights(); // przejście do innego pomieszczenia przenosi światła
    } else {
      const T = st.target;
      camera.position.set(T.x + st.r * Math.sin(st.ph) * Math.sin(st.th), T.y + st.r * Math.cos(st.ph), T.z + st.r * Math.sin(st.ph) * Math.cos(st.th));
      camera.lookAt(T);
    }
    doors.forEach(d => { const tg = d.open ? d.ang : 0; d.cur = RM ? tg : d.cur + (tg - d.cur) * Math.min(1, dt * 7); if (d.slide) d.piv.position.set(d.slide[0] * d.cur, d.slide[1] * d.cur, d.slide[2] * d.cur); else d.piv.rotation.y = d.cur; });
    renderer.render(scene, camera);
  }
  resize(); requestAnimationFrame(frame);
  showLayer('home');
}).catch(err => {
  console.error(err);
  document.querySelector('#home .lead').textContent = 'Nie udało się wczytać danych pomieszczeń: ' + err.message;
});
