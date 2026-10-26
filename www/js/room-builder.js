/*
  Ładuje zaprojektowane pomieszczenia z data/rooms/*.json i zamienia je na moduły window.ROOM_MODULES.
  Pomieszczenie to dane, nie kod: lista elementów 3D (cm, lokalny układ pokoju), rzut, instalacje i uwagi.
  Lista pomieszczeń: data/rooms/index.json. Opis formatu: data/rooms/README.md.
*/
(function () {
  const M = 0.01;
  const col = c => parseInt(c.slice(1), 16);

  function fromData(d) {
    return {
      origin: d.origin, level: d.level, start: d.start, variants: d.variants,
      plan: d.plan, points: d.points, notes: d.notes, ownDoors: d.ownDoors,
      build(api) {
        const { THREE, box, cyl, hinged, rod, mat, root, toggle, glow, light } = api;
        const groups = { common: new THREE.Group() }, toggles = {};
        root.add(groups.common);
        Object.keys(d.variants || {}).forEach(k => { groups[k] = new THREE.Group(); root.add(groups[k]); });
        const finish = (m, e) => {
          if (e.click) m.userData.door = toggles[e.click];
          if (e.emissive) { m.material.emissive = new THREE.Color(e.emissive); m.material.emissiveIntensity = e.emissiveIntensity; }
          if (e.glow) glow(m.material);
          if (e.shadow === false) m.castShadow = false;
          return m;
        };
        d.elements.forEach(e => {
          const parent = groups[e.g];
          if (!parent) throw new Error('Pokój ' + d.id + ': nieznana grupa "' + e.g + '"');
          if (e.t === 'box') finish(box(e.x[0] * M, e.x[1] * M, e.y[0] * M, e.y[1] * M, e.z[0] * M, e.z[1] * M, col(e.c), parent), e);
          else if (e.t === 'cyl') finish(cyl(e.r * M, e.h * M, e.at[0] * M, e.at[1] * M, e.at[2] * M, col(e.c), parent), e);
          else if (e.t === 'rod') rod(e.x[0] * M, e.x[1] * M, e.y * M, e.z * M, parent);
          else if (e.t === 'door') hinged({
            px: e.hinge[0] * M, y0: e.hinge[1] * M, pz: e.hinge[2] * M, len: e.len * M, h: e.h * M, axis: e.axis, dir: e.dir,
            ang: e.ang * Math.PI / 180, open: e.open, kind: e.kind, handle: e.handle, color: e.c && col(e.c),
            handleY: e.handleY != null ? e.handleY * M : undefined, handleLen: e.handleLen && e.handleLen * M, parent
          });
          else if (e.t === 'toggle') { const t = toggle({ kind: e.kind, slide: e.slide.map(v => v * M), parent }); toggles[e.id] = t; groups[e.id] = t.piv; }
          else if (e.t === 'tris') {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(e.tris.flat(2).map(v => v * M), 3)); g.computeVertexNormals();
            const m = new THREE.Mesh(g, mat(col(e.c))); if (e.double) m.material.side = THREE.DoubleSide; parent.add(m);
          }
          else if (e.t === 'floorImage') {
            const w = (e.x[1] - e.x[0]) * M, h = (e.z[1] - e.z[0]) * M;
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(0xffffff, { map: new THREE.TextureLoader().load(e.img) }));
            m.rotation.x = -Math.PI / 2; m.position.set((e.x[0] + e.x[1]) / 2 * M, e.y * M, (e.z[0] + e.z[1]) / 2 * M); m.receiveShadow = true; parent.add(m);
          }
          else throw new Error('Pokój ' + d.id + ': nieznany typ elementu "' + e.t + '"');
        });
        (d.lights || []).forEach(l => {
          const parent = groups[l.g || 'common'];
          if (!parent) throw new Error('Pokój ' + d.id + ': nieznana grupa światła "' + l.g + '"');
          light(l, parent);
        });
        const variants = {}; Object.keys(d.variants || {}).forEach(k => { variants[k] = groups[k]; });
        return { variants };
      }
    };
  }

  // Strefy jednego pomieszczenia (pliki z tym samym id i polem zone, np. salon i jadalnia w 0.06) sklejane w jeden moduł.
  // Obrys, ściany, okna i drzwi rzutu oraz start kamery bierze pierwszy plik, który je ma; listy są łączone.
  function mergeZones(a, b) {
    if (a.origin.x !== b.origin.x || a.origin.z !== b.origin.z) throw new Error('Pokój ' + a.id + ': strefy mają różny origin');
    const cat = k => (a[k] || []).concat(b[k] || []);
    const pa = a.plan || {}, pb = b.plan || {}, items = Object.assign({}, pa.items);
    Object.keys(pb.items || {}).forEach(k => { items[k] = (items[k] || []).concat(pb.items[k]); });
    return Object.assign({}, b, a, {
      zone: undefined, start: a.start || b.start,
      variants: (a.variants || b.variants) && Object.assign({}, b.variants, a.variants),
      elements: cat('elements'), lights: cat('lights'), points: cat('points'), notes: cat('notes'), ownDoors: (a.ownDoors || b.ownDoors) && cat('ownDoors'),
      plan: Object.assign({}, pb, pa, { items, dims: (pa.dims || []).concat(pb.dims || []), info: (pa.info || []).concat(pb.info || []) })
    });
  }

  const getJson = url => fetch(url).then(r => { if (!r.ok) throw new Error(url + ': HTTP ' + r.status); return r.json(); });
  window.ROOM_MODULES = window.ROOM_MODULES || {};
  window.ROOMS_READY = getJson('data/rooms/index.json')
    .then(ids => Promise.all(ids.map(id => getJson('data/rooms/' + id + '.json'))))
    .then(rooms => {
      const byId = {};
      rooms.forEach(d => { byId[d.id] = byId[d.id] ? mergeZones(byId[d.id], d) : d; });
      Object.keys(byId).forEach(id => { window.ROOM_MODULES[id] = fromData(byId[id]); });
    });
})();
