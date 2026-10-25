/*
  Moduł pomieszczenia 1.08 (poddasze, pokój dziecka).
  Wszystkie wymiary w lokalnym układzie pokoju:
    x — od lewej ściany pokoju (wschód) w stronę okna (zachód), z — od ściany kolankowej (południe).
  origin: położenie lokalnego (0,0) w układzie domu [cm].
  Szablon dla kolejnych pomieszczeń: skopiuj plik, zmień id/origin i zawartość.
*/
window.ROOM_MODULES = window.ROOM_MODULES || {};
window.ROOM_MODULES['1.08'] = {
  origin: { x: 981, z: 47 },
  level: 1,
  variants: { A: 'A · KALLAX', B: 'B · TROFAST' },
  start: { x: 100, z: 255, yaw: -0.45 },

  /* ---------- 3D ---------- */
  build(api) {
    const { THREE, box, cyl, hinged, rod, mat, C, root, toggle } = api;
    const T = 0.018, BACK = 0xEDEBE6;
    const W = 4.145, D_R = 3.9, X_STEP = 1.745, H_MAX = 2.65;
    const CLOTH = [C.navy, C.red, C.blue, 0x6B7280, 0xFFFFFF, 0x2F6EA6, 0xE8B04A];
    const common = new THREE.Group(); root.add(common);
    const gA = new THREE.Group(); root.add(gA);
    const gB = new THREE.Group(); root.add(gB);

    // kolor: granat na ściance kolankowej i skosie nad łóżkiem
    box(0, 2.1, 0.0, 1.6, 0.002, 0.006, C.navy, common);
    {
      const zb = 1.344, g = new THREE.BufferGeometry();
      const p = [0, 1.6, 0.012, 2.1, 1.6, 0.012, 2.1, H_MAX - 0.005, zb, 0, 1.6, 0.012, 2.1, H_MAX - 0.005, zb, 0, H_MAX - 0.005, zb];
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat(C.navy)); m.material.side = THREE.DoubleSide; common.add(m);
    }
    // poprzeczka okna na 90 cm (szyba stała do 90)
    box(W - 0.07, W, 0.87, 0.93, 1.67, 3.04, C.turner, common);

    // drzwi pokoju (otwór 90, skrzydło 80, zawiasy po lewej) i jednostka klimatyzacji nad drzwiami
    hinged({ px: 0.65, pz: 3.005, y0: 0, len: 0.8, h: 2.05, axis: 'x', dir: 1, ang: Math.PI / 2, open: true, kind: 'room', handle: [1, -1], handleLen: 0.04, parent: common });
    box(0.65, 1.45, 2.18, 2.46, 2.77, 3.0, 0xFFFFFF, common);
    box(0.7, 1.4, 2.2, 2.23, 2.765, 2.77, 0xD9D4C8, common);

    // szafa we wnęce 100 x 60 do sufitu
    const A0 = X_STEP, A1 = X_STEP + 1.0, AZ0 = 3.3, AZ1 = D_R, AH = H_MAX - 0.01, AM = (A0 + A1) / 2;
    box(A0, A0 + T, 0, AH, AZ0, AZ1, C.white, common); box(A1 - T, A1, 0, AH, AZ0, AZ1, C.white, common);
    box(A0, A1, 0, 0.05, AZ0, AZ1, C.white, common); box(A0, A1, AH - T, AH, AZ0, AZ1, C.white, common);
    box(A0, A1, 0, AH, AZ1 - 0.01, AZ1, BACK, common);
    box(AM - T / 2, AM + T / 2, 0.05, 2.30, AZ0 + 0.02, AZ1, C.white, common);
    box(A0, A1, 2.30, 2.30 + T, AZ0 + 0.02, AZ1, C.white, common);
    rod(A0 + T, AM - T / 2, 1.02, 3.6, common); rod(A0 + T, AM - T / 2, 1.95, 3.6, common);
    for (let i = 0; i < 8; i++) { const x = A0 + 0.06 + i * 0.05; box(x - 0.01, x + 0.01, 0.48, 0.99, 3.42, 3.78, CLOTH[i % 7], common); }
    for (let i = 0; i < 5; i++) { const x = A0 + 0.08 + i * 0.08; box(x - 0.012, x + 0.012, 1.17, 1.92, 3.4, 3.8, CLOTH[(i + 3) % 7], common); }
    [[0.07, 0.25], [0.27, 0.45]].forEach(r => { box(AM + T / 2 + 0.005, A1 - T - 0.005, r[0], r[1], AZ0 + 0.03, AZ1 - 0.02, C.white, common); box(AM + 0.22, AM + 0.38, r[1] - 0.05, r[1] - 0.03, AZ0 + 0.01, AZ0 + 0.03, C.dark, common); });
    [0.75, 1.05, 1.35, 1.65, 1.95].forEach((y, j) => {
      box(AM + T / 2, A1 - T, y, y + T, AZ0 + 0.02, AZ1 - 0.01, C.white, common);
      box(AM + 0.04, AM + 0.29, y + T, y + T + 0.13, 3.42, 3.78, CLOTH[j % 7], common); box(AM + 0.32, A1 - 0.04, y + T, y + T + 0.09, 3.42, 3.78, CLOTH[(j + 4) % 7], common);
    });
    box(A0 + 0.05, A0 + 0.45, 2.32, 2.58, 3.38, 3.82, 0xD9CBB5, common); box(A0 + 0.55, A1 - 0.05, 2.32, 2.55, 3.38, 3.82, 0xC8D3DF, common);
    const AW = (A1 - A0) / 2 - 0.003;
    hinged({ px: A0 + 0.002, pz: AZ0 - 0.012, y0: 0.05, len: AW, h: 2.25, axis: 'x', dir: 1, ang: 1.5, kind: 'w', handle: [-1], parent: common });
    hinged({ px: A1 - 0.002, pz: AZ0 - 0.012, y0: 0.05, len: AW, h: 2.25, axis: 'x', dir: -1, ang: -1.45, kind: 'w', handle: [-1], parent: common });
    hinged({ px: A0 + 0.002, pz: AZ0 - 0.012, y0: 2.31, len: AW, h: 0.32, axis: 'x', dir: 1, ang: 1.3, kind: 'w', handle: [-1], handleY: 2.36, handleLen: 0.06, parent: common });
    hinged({ px: A1 - 0.002, pz: AZ0 - 0.012, y0: 2.31, len: AW, h: 0.32, axis: 'x', dir: -1, ang: -1.3, kind: 'w', handle: [-1], handleY: 2.36, handleLen: 0.06, parent: common });

    // HEMNES — kliknięcie rozkłada
    {
      const bed = toggle({ kind: 'bed', slide: true, parent: common });
      const tag = m => { m.userData.door = bed; return m; };
      const HW = 0xF3F1EC;
      tag(box(0, 2.07, 0, 0.83, 0, 0.04, HW, common)); tag(box(0, 0.04, 0, 0.83, 0, 0.91, HW, common)); tag(box(2.03, 2.07, 0, 0.83, 0, 0.91, HW, common));
      for (let i = 0; i < 9; i++) { const x = 0.18 + i * 0.21; tag(box(x, x + 0.05, 0.42, 0.80, 0.04, 0.052, 0xE4E0D8, common)); }
      tag(box(0.04, 2.03, 0.30, 0.38, 0.04, 0.91, HW, common));
      tag(box(0.06, 2.01, 0.38, 0.50, 0.06, 0.89, 0xF7F7F5, common));
      tag(box(0.6, 2.0, 0.50, 0.54, 0.05, 0.9, C.navy, common));
      tag(box(0.08, 0.5, 0.50, 0.62, 0.12, 0.84, 0xFFFFFF, common));
      tag(box(0.12, 0.42, 0.54, 0.72, 0.06, 0.2, C.red, common));
      tag(box(0.06, 2.01, 0.02, 0.22, 0.08, 0.90, HW, bed.piv));
      [0.08, 0.74, 1.40].forEach(x => { tag(box(x, x + 0.6, 0.04, 0.21, 0.90, 0.915, 0xEFEDE8, bed.piv)); tag(box(x + 0.24, x + 0.36, 0.15, 0.17, 0.915, 0.93, C.dark, bed.piv)); });
      tag(box(0.08, 1.99, 0.22, 0.30, 0.10, 0.88, 0xF7F7F5, bed.piv));
    }
    // półka nad łóżkiem na 145 cm
    box(0.25, 1.85, 1.43, 1.46, 0.0, 0.12, C.turner, common);
    box(0.35, 0.55, 1.46, 1.62, 0.02, 0.1, C.red, common); box(0.6, 0.72, 1.46, 1.56, 0.02, 0.1, C.blue, common);
    for (let i = 0; i < 10; i++) { const x = 1.2 + i * 0.04; box(x, x + 0.03, 1.46, 1.62 - (i % 3) * 0.02, 0.02, 0.11, [C.navy, C.red, C.blue, 0xE8B04A][i % 4], common); }
    // krzesło
    box(3.22, 3.68, 0.44, 0.49, 2.47, 2.92, C.navy, common);
    box(3.22, 3.68, 0.52, 0.88, 2.41, 2.46, C.navy, common);
    box(3.42, 3.48, 0.05, 0.44, 2.66, 2.72, C.grey, common);
    cyl(0.27, 0.04, 3.45, 0.03, 2.69, C.grey, common);
    box(3.25, 3.65, 0.18, 0.21, 2.88, 3.06, C.grey, common);
    // dywan z ulicami
    {
      const cv = document.createElement('canvas'); cv.width = 720; cv.height = 500; const x = cv.getContext('2d');
      x.fillStyle = '#8FA9C4'; x.fillRect(0, 0, 720, 500);
      x.strokeStyle = '#3A3D40'; x.lineWidth = 46; x.lineJoin = 'round';
      x.strokeRect(80, 80, 560, 340); x.beginPath(); x.moveTo(360, 80); x.lineTo(360, 420); x.stroke();
      x.strokeStyle = '#FFFFFF'; x.lineWidth = 4; x.setLineDash([16, 14]); x.strokeRect(80, 80, 560, 340); x.beginPath(); x.moveTo(360, 80); x.lineTo(360, 420); x.stroke();
      x.setLineDash([]); x.fillStyle = '#C8382E'; x.fillRect(150, 66, 40, 26); x.fillStyle = '#F2C14E'; x.fillRect(347, 250, 26, 40);
      x.fillStyle = '#5E8C61';[[200, 200], [520, 180], [500, 320], [220, 330]].forEach(p => { x.beginPath(); x.arc(p[0], p[1], 26, 0, 7); x.fill(); });
      const r = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.25), mat(0xffffff, { map: new THREE.CanvasTexture(cv) }));
      r.rotation.x = -Math.PI / 2; r.position.set(3.0, 0.008, 1.725); r.receiveShadow = true; common.add(r);
    }
    // plafon i kinkiet
    { const l = cyl(0.22, 0.05, 2.0, H_MAX - 0.03, 1.9, 0xFFFFFF, common); l.material.emissive = new THREE.Color(0xFFF4DD); l.material.emissiveIntensity = 0.6; l.castShadow = false; }
    box(0.62, 0.78, 1.12, 1.22, 0.01, 0.12, C.red, common);
    // tablica korkowa nad biurkiem
    box(2.85, 3.95, 0.97, 1.57, 3.875, 3.9, 0xB98B5E, common);
    [[2.95, 3.15, 1.3, 1.5, 0xFFFFFF], [3.22, 3.4, 1.12, 1.34, 0xF2C14E], [3.5, 3.8, 1.25, 1.5, 0xFFFFFF], [3.05, 3.3, 1.02, 1.2, C.blue]].forEach(p => box(p[0], p[1], p[2], p[3], 3.868, 3.875, p[4], common));
    // za drzwiami: ławka z koszami, listwa z haczykami
    box(0, 0.55, 0.36, 0.40, 2.65, 3.0, C.turner, common);
    box(0.02, 0.05, 0, 0.36, 2.67, 2.98, C.white, common); box(0.50, 0.53, 0, 0.36, 2.67, 2.98, C.white, common);
    box(0.06, 0.26, 0.03, 0.25, 2.68, 2.95, C.blue, common); box(0.29, 0.49, 0.03, 0.25, 2.68, 2.95, C.blue, common);
    box(0.04, 0.51, 0.40, 0.45, 2.7, 2.96, C.red, common);
    box(0.03, 0.52, 1.12, 1.2, 2.98, 3.0, C.turner, common);
    [0.1, 0.275, 0.45].forEach(x => box(x - 0.01, x + 0.01, 1.13, 1.16, 2.92, 2.98, C.dark, common));
    box(0.17, 0.38, 0.78, 1.13, 2.82, 2.97, C.red, common);

    // ---- wariant A: 2 x KALLAX 2x4 + TROFAST 46, biurko na stelażu
    const kallax = x0 => {
      box(x0, x0 + 0.77, 0, 1.47, 0, 0.39, C.white, gA);
      [x0 + 0.025, x0 + 0.395].forEach((cx, ci) => {
        for (let r = 0; r < 4; r++) {
          const y = 0.025 + r * 0.36;
          box(cx, cx + 0.35, y, y + 0.335, 0.39, 0.392, 0xE6E1D8, gA);
          if (r < 2) box(cx + 0.01, cx + 0.34, y + 0.01, y + 0.32, 0.392, 0.396, (r + ci) % 2 ? C.red : C.blue, gA);
          else if (r === 2) { for (let i = 0; i < 8; i++) { const bx = cx + 0.02 + i * 0.04; box(bx, bx + 0.03, y, y + 0.24 + (i % 3) * 0.02, 0.392, 0.396, [C.navy, C.red, C.blue, 0xE8B04A][(i + ci) % 4], gA); } }
          else if (ci === 0) box(cx + 0.05, cx + 0.3, y, y + 0.16, 0.392, 0.396, 0xE8B04A, gA);
        }
      });
    };
    kallax(2.07); kallax(2.84);
    box(2.2, 2.42, 1.47, 1.62, 0.08, 0.3, C.red, gA); box(2.5, 2.62, 1.47, 1.55, 0.1, 0.28, C.blue, gA); box(3.0, 3.3, 1.47, 1.58, 0.06, 0.3, 0xE8B04A, gA);
    box(3.685, 4.145, 0, 0.94, 0, 0.30, C.white, gA);
    [[0.04, 0.30, 0xFFFFFF], [0.33, 0.59, 0xFFFFFF], [0.62, 0.74, C.red], [0.76, 0.88, C.red]].forEach(r => box(3.70, 4.13, r[0], r[1], 0.30, 0.312, r[2], gA));
    box(2.745, W, 0.70, 0.73, 3.1, D_R, C.turner, gA);
    box(2.8, 2.84, 0, 0.70, 3.2, 3.8, C.white, gA); box(4.05, 4.09, 0, 0.70, 3.2, 3.8, C.white, gA);
    box(2.84, 4.05, 0.6, 0.64, 3.78, 3.82, C.white, gA);
    cyl(0.07, 0.02, 3.98, 0.74, 3.72, C.red, gA); box(3.97, 3.99, 0.74, 1.1, 3.71, 3.73, C.red, gA); box(3.86, 4.0, 1.08, 1.14, 3.62, 3.76, C.red, gA);

    // ---- wariant B: 2 x TROFAST 99x44x94 + półki, blat z półką
    const trofast99 = x0 => {
      box(x0, x0 + 0.99, 0, 0.94, 0, 0.44, C.white, gB);
      for (let c = 0; c < 3; c++) {
        const cx = x0 + 0.025 + c * 0.32;
        [[0.04, 0.30, 0xFFFFFF], [0.33, 0.59, C.red], [0.62, 0.74, C.blue], [0.77, 0.89, C.red]].forEach((r, ri) => box(cx, cx + 0.30, r[0], r[1], 0.44, 0.452, (ri + c) % 2 && ri > 1 ? 0xFFFFFF : r[2], gB));
      }
    };
    trofast99(2.07); trofast99(3.06);
    box(4.05, W, 0, 0.94, 0.42, 0.44, C.white, gB);
    box(2.2, 2.5, 0.94, 1.06, 0.1, 0.34, C.red, gB); box(2.6, 2.75, 0.94, 1.12, 0.12, 0.3, C.blue, gB); box(3.3, 3.7, 0.94, 1.0, 0.08, 0.36, 0xE8B04A, gB);
    [1.15, 1.42].forEach(y => { box(2.07, 4.05, y, y + 0.025, 0, 0.15, C.turner, gB); for (let i = 0; i < 16; i++) { const x = 2.2 + i * 0.11; box(x, x + 0.035, y + 0.025, y + 0.2 - (i % 3) * 0.02, 0.02, 0.13, [C.navy, C.red, C.blue, 0xE8B04A][i % 4], gB); } });
    box(2.745, W, 0.70, 0.735, 3.1, D_R, C.turner, gB);
    box(2.8, 2.84, 0, 0.70, 3.2, 3.8, C.white, gB); box(4.05, 4.09, 0, 0.70, 3.2, 3.8, C.white, gB);
    box(2.745, W, 1.68, 1.71, 3.65, D_R, C.turner, gB);
    cyl(0.07, 0.02, 3.98, 0.745, 3.55, C.red, gB); box(3.97, 3.99, 0.745, 1.1, 3.54, 3.56, C.red, gB); box(3.86, 4.0, 1.08, 1.14, 3.45, 3.59, C.red, gB);

    return { variants: { A: gA, B: gB } };
  },

  /* ---------- Rzut 2D (lokalnie, cm) ---------- */
  plan: {
    poly: [[0, 0], [414.5, 0], [414.5, 390], [174.5, 390], [174.5, 300], [0, 300]],
    wallsV: [{ x: 0, a: 0, b: 300, n: 'lewa ściana' }, { x: 174.5, a: 300, b: 390, n: 'uskok wnęki' }, { x: 414.5, a: 0, b: 390, n: 'ściana z oknem' }],
    wallsH: [{ z: 0, a: 0, b: 414.5, n: 'ściana kolankowa' }, { z: 300, a: 0, b: 174.5, n: 'ściana z drzwiami' }, { z: 390, a: 174.5, b: 414.5, n: 'ściana wnęki' }],
    door: { x0: 60, x1: 150, hinge: 65, wallZ: 300, swing: 80 },
    window: { wall: 'x', at: 414.5, a: 160, b: 300 },
    slope: [{ z0: 0, z1: 75, cls: 'p-slope1' }, { z0: 75, z1: 134, cls: 'p-slope2' }],
    dims: [
      [0, -22, 414.5, -22, '414,5', 1], [-22, 0, -22, 300, '300', -1],
      [430, 0, 430, 160, '160', 1], [430, 160, 430, 300, 'okno 140', 1], [430, 300, 430, 390, '90', 1], [478, 0, 478, 390, '390', 1],
      [174.5, 410, 414.5, 410, 'wnęka 240', -1], [0, 318, 60, 318, '60', -1], [60, 318, 150, 318, 'otwór 90', -1], [150, 318, 174.5, 318, '24,5', -1]
    ],
    info: [['Pokój', '414,5 × 390 cm'], ['Skos', '160 → 220 cm na ok. 77 cm, 265 cm od ok. 134 cm (dach 38°)'], ['Drzwi', 'otwór 90 (skrzydło 80); 60 cm ściany za drzwiami, 24,5 cm do wnęki'], ['Okno', '140 cm, szyba stała do 90 cm']],
    items: {
      common: [
        { id: 'rug', s: 'Dywan', name: 'Dywan z ulicami', x0: 210, x1: 390, z0: 110, z1: 235, h: 'ok. 1 cm', along: 'x', floor: true, note: 'Niski włos, z oznaczeniem do ogrzewania podłogowego.' },
        { id: '7a', s: 'Szafa', name: 'Szafa we wnęce', x0: 174.5, x1: 274.5, z0: 330, z1: 390, h: '265 cm, do sufitu', along: 'x', solid: true, note: 'Na wymiar, jedyna szafa na ubrania. Lewa połowa: 2 drążki (ok. 100 i 195 cm). Prawa: 2 szuflady i 5 półek. Nadstawka od 230 cm.' },
        { id: 'bed', s: 'HEMNES', name: 'Leżanka HEMNES 80×200', x0: 0, x1: 207, z0: 0, z1: 91, h: '83 cm (oparcie)', along: 'x', solid: true, note: 'Rozkładana do ok. 168 cm głębokości (2 materace 80×200). Nad oparciem półka 12 cm na 145 cm i kinkiet. Długość ramy zweryfikuj w sklepie.' },
        { id: 'ext', s: 'Rozłożone łóżko', name: 'Strefa rozłożonego łóżka', x0: 0, x1: 207, z0: 91, z1: 168, h: '—', along: 'x', floor: true, note: 'Ta strefa musi zostać pusta.' },
        { id: 'chair', s: 'Krzesło', name: 'Krzesło z regulacją', x0: 318, x1: 372, z0: 241, z1: 306, h: '88 cm', along: 'x', note: 'Ruchome. Odległości liczone dla krzesła przysuniętego do blatu.' },
        { id: 'lawka', s: 'Ławka', name: 'Ławka za drzwiami', x0: 0, x1: 55, z0: 265, z1: 300, h: '40 cm', along: 'x', solid: true, note: '2 kosze na kapcie i buty, poduszka. Nad ławką listwa z 3 haczykami na 115 cm na plecak i kurtkę.' }
      ],
      A: [
        { id: 'k1', s: 'KALLAX', name: 'Regał KALLAX 2×4 (pionowo)', x0: 207, x1: 284, z0: 0, z1: 39, h: '147 cm', along: 'x', solid: true, note: 'Dolne przegródki: pojemniki na zabawki. Wyżej książki i wystawa budowli z klocków.' },
        { id: 'k2', s: 'KALLAX', name: 'Regał KALLAX 2×4 (pionowo)', x0: 284, x1: 361, z0: 0, z1: 39, h: '147 cm', along: 'x', solid: true, note: 'Dolne przegródki: pojemniki na zabawki. Wyżej książki.' },
        { id: 'trofast', s: 'TROFAST', name: 'Regał TROFAST 46', x0: 368.5, x1: 414.5, z0: 0, z1: 30, h: '94 cm', along: 'x', solid: true, note: 'Samochody i drobne zabawki w płytkich pojemnikach.' },
        { id: 'desk', s: 'Biurko', name: 'Biurko 140×80', x0: 274.5, x1: 414.5, z0: 310, z1: 390, h: '72 cm, regulowana', along: 'x', solid: true, note: 'Strefa zarezerwowana pod docelowe biurko. Okno po lewej ręce dziecka. Tablica korkowa 97–157 cm nad podłogą.' }
      ],
      B: [
        { id: 't1', s: 'TROFAST', name: 'Regał TROFAST 99×44×94', x0: 207, x1: 306, z0: 0, z1: 44, h: '94 cm', along: 'x', solid: true, note: 'Pojemniki na zabawki: płytkie na samochody, głębokie na klocki. Blat jako wystawa budowli.' },
        { id: 't2', s: 'TROFAST', name: 'Regał TROFAST 99×44×94', x0: 306, x1: 405, z0: 0, z1: 44, h: '94 cm', along: 'x', solid: true, note: 'Nad regałami 2 płytkie półki 15 cm na ściance kolankowej (ok. 115 i 142 cm). Luz 9,5 cm przy oknie zamknąć maskownicą.' },
        { id: 'desk', s: 'Biurko', name: 'Blat 140×80', x0: 274.5, x1: 414.5, z0: 310, z1: 390, h: '73,5 cm, regulowana', along: 'x', solid: true, note: 'Półka nad blatem na 168 cm, tablica korkowa 97–157 cm.' }
      ]
    }
  },

  /* ---------- Instalacje (lokalnie, cm) ---------- */
  points: [
    { id: 'd1', k: 'W', c: 'sw', name: 'Włącznik plafonu (schodowy)', x: 162, z: 300, oz: -10, h: '100 cm', loc: 'Przy drzwiach, 24,5 cm ściany po stronie klamki', note: 'Para schodowa z włącznikiem przy łóżku.' },
    { id: 'd2', k: 'K', c: 'ctl', name: 'Sterownik klimatyzacji', x: 162, z: 300, oz: -24, h: '125 cm', loc: 'Przy drzwiach, nad włącznikiem', note: 'Jedno miejsce sterowania pokojem.' },
    { id: 'd3', k: 'T', c: 'ctl', name: 'Termostat ogrzewania podłogowego', x: 162, z: 300, oz: -38, h: '150 cm', loc: 'Przy drzwiach, nad sterownikiem klimatyzacji', note: 'Ściana wewnętrzna, poza słońcem z okna i poza nawiewem klimatyzacji. Z czujnikiem temperatury podłogi (drewno: limit ok. 27°C na powierzchni).' },
    { id: 'b1', k: 'W', c: 'sw', name: 'Włącznik schodowy plafonu + włącznik kinkietu', x: 30, z: 0, oz: 12, h: '90 cm', loc: 'Ściana kolankowa przy wezgłowiu', note: 'Tuż nad oparciem HEMNES (83 cm), w zasięgu ręki z łóżka.' },
    { id: 'b2', k: 'G', c: 'sock', name: 'Gniazdo podwójne z USB', x: 50, z: 0, oz: 12, h: '90 cm', loc: 'Ściana kolankowa przy wezgłowiu', note: 'Ładowarka, lampka nocna.' },
    { id: 'b3', k: 'L', c: 'light', name: 'Wypust kinkietu', x: 72, z: 0, oz: 12, h: '120 cm', loc: 'Ściana kolankowa nad łóżkiem', note: 'Między oparciem (83) a półką (145).' },
    { id: 'c1', k: 'L', c: 'light', name: 'Plafon LED ze ściemniaczem', x: 200, z: 190, h: 'sufit 265 cm', loc: 'Środek pokoju', note: 'Barwa 3000 K.' },
    { id: 's1', k: 'G', c: 'sock', name: 'Gniazdo podwójne z USB (biurko)', x: 300, z: 390, oz: -10, h: '85 cm', loc: 'Ściana wnęki nad blatem', note: 'Nad blatem (72–73), pod tablicą korkową (od 97).' },
    { id: 's2', k: 'N', c: 'net', name: 'Gniazdo RJ45', x: 325, z: 390, oz: -10, h: '85 cm', loc: 'Ściana wnęki nad blatem', note: 'Na przyszły komputer.' },
    { id: 's3', k: 'G', c: 'sock', name: 'Gniazdo podwójne (lampa, monitor)', x: 395, z: 390, oz: -10, h: '85 cm', loc: 'Ściana wnęki przy oknie', note: 'Lampa biurkowa stoi po stronie okna.' },
    { id: 'r1', k: 'R', c: 'ctl', name: 'Sterownik rolety', x: 414.5, z: 135, ox: -10, h: '110 cm', loc: 'Ściana okienna obok okna', note: 'Przy oknie, nad regałami (94 cm), nie za nimi.' },
    { id: 'r2', k: 'R', c: 'pow', name: 'Zasilanie silnika rolety', x: 414.5, z: 230, ox: -10, h: 'nadproże ok. 240 cm', loc: 'Nad oknem', note: 'Istniejące.' },
    { id: 'v1', k: 'G', c: 'sock', name: 'Gniazdo serwisowe (odkurzacz)', x: 0, z: 195, ox: 10, h: '30 cm', loc: 'Lewa ściana', note: 'Poza strefą rozłożonego łóżka (do 168) i poza zasięgiem drzwi.' },
    { id: 'a1', k: 'AC', c: 'ac', name: 'Jednostka wewnętrzna klimatyzacji (propozycja)', x: 105, z: 300, oz: -8, rect: true, h: 'ok. 215–245 cm, nad drzwiami', loc: 'Ściana z drzwiami', note: 'Nawiew wzdłuż pokoju w stronę okna, nie bezpośrednio na łóżko ani biurko. Zaplanuj przed tynkami: zasilanie, odpływ skroplin, przepust na rurki.' },
    { id: 'w1', k: 'L', c: 'light', name: 'Zasilanie LED w szafie', x: 224.5, z: 360, h: 'pod sufitem szafy', loc: 'Szafa we wnęce', note: 'Taśma LED z czujnikiem otwarcia drzwi.' }
  ],

  /* ---------- Uwagi ---------- */
  notes: [
    { t: 'Wymiary pomieszczenia', items: ['Pokój 414,5 × 390 cm; lewa część (z drzwiami) ma 300 cm głębokości.', 'Wnęka przy oknie: 240 cm szerokości, 90 cm głębokości.', 'Ściana z drzwiami: 60 cm za drzwiami, otwór 90 cm (skrzydło 80, zawiasy po lewej, otwierane do środka), 24,5 cm do wnęki.', 'Okno na zachód 140 cm, do podłogi: szyba stała do ok. 90 cm, wyżej część otwierana. Rama turner oak, tylko poziomy podział. Roleta zewnętrzna zamontowana.', 'Ścianka kolankowa 160 cm, dach 38° (przekrój A-A); sufit przyjęty na 265 cm (w projekcie 285 cm). Skos osiąga 220 cm po ok. 77 cm, 265 cm po ok. 134 cm.', 'Ogrzewanie podłogowe, podłoga drewniana.'] },
    { t: 'Decyzje', items: ['Leżanka HEMNES 80×200 pod skosem, rozkładana do ok. 168 cm. Strefa przed nią zostaje pusta.', 'Strefa biurka 140 × 80 przy oknie; okno po lewej ręce dziecka (praworęczne). Docelowe biurko z regulacją wysokości, krzesło z podnóżkiem.', 'Szafa na wymiar 100 × 60 we wnęce, do sufitu: 2 drążki (ok. 100 i 195 cm), 2 szuflady, półki, nadstawka. LED z czujnikiem.', 'Wariant A: 2 × KALLAX 2×4 + TROFAST 46. Wariant B: 2 × TROFAST 99×44×94 + 2 półki 15 cm.', 'Za drzwiami ławka 55 × 35 × 40 z 2 koszami, nad nią 3 haczyki na 115 cm.', 'Tablica korkowa ok. 110 × 60 nad biurkiem (97–157 cm). Półka 12 cm nad łóżkiem na 145 cm.', 'Kolory: białe ściany, granat na ściance kolankowej i skosie nad łóżkiem, czerwień tylko w akcentach, turner oak: rama okna, blat, półki; podłoga jasny dąb.'] },
    { t: 'Do sprawdzenia przed zamówieniem', warn: true, items: ['Długość ramy HEMNES (przyjęte ok. 207 cm) i głębokość po rozłożeniu (ok. 168 cm).', 'Rzeczywisty przebieg skosu i wysokość sufitu po wykończeniu.', 'Szyba stała w oknie: szkło klejone (bezpieczne), nie float.', 'Wymiary po tynkach i wylewce: wnęka 240, ściana 24,5, otwór drzwi.', 'Wnęka 240 = szafa 100 + biurko 140, bez zapasu: szafa tylko na wymiar.'] },
    { t: 'Kompromisy i ryzyka', items: ['Szafa 100 cm wystarczy dla 7-latka, dla nastolatka będzie za mała. Wyjścia później: szuflady HEMNES na ubrania, biurko 120 zamiast 140, rzeczy sezonowe poza pokojem.', 'Szczeliny do zamknięcia maskownicą: 7,5 cm między KALLAX a TROFAST (A), 9,5 cm przy oknie (B).', 'Prawe drzwi szafy otwierają się tuż przy biurku — kąt ok. 90°.', 'Jednostka klimatyzacji nad drzwiami to propozycja — potwierdź z instalatorem.'] },
    { t: 'Bezpieczeństwo', items: ['Kotwy antywywrotne do szafy i wszystkich regałów.', 'Klamka okna z kluczykiem lub blokadą.', 'Gniazda z przesłonami torów prądowych.', 'Nad łóżkiem tylko płytka półka (12 cm) — nic głębszego.', 'Meble na wymiar: zaokrąglone krawędzie, cichy domyk.'] },
    { t: 'Instalacje i budowa', items: ['Szczegóły punktów elektrycznych: widok Instalacje.', 'Wyłącz pętlę podłogówki pod szafą we wnęce.', 'Wzmocnienia w g-k: kotwy regałów i szafy, półki, tablica korkowa, kinkiet, listwa z haczykami, jednostka klimatyzacji.', 'Zdjęcia ścian z miarą przed zamknięciem płyt.', 'Dywan tylko z oznaczeniem do ogrzewania podłogowego.'] }
  ]
};
