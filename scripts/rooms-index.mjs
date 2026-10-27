// Tworzy www/data/rooms/index.json z plików <numer>.json i <numer>-<strefa>.json (strefy jednego pomieszczenia, np. 0.06-jadalnia.json) w tym katalogu.
// Plik jest generowany (nie ma go w repozytorium), więc PR nowego pomieszczenia dodaje tylko swój plik.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

const dir = 'www/data/rooms';
const ctx = { window: {} };
vm.runInNewContext(readFileSync('www/data/house.js', 'utf8'), ctx);
const known = new Set(ctx.window.HOUSE.rooms.map(r => r.id));

const ids = readdirSync(dir)
  .filter(f => /^\d\.\d\d(-[a-z0-9]+)?\.json$/.test(f))
  .map(f => {
    const name = f.slice(0, -5), [id, zone] = name.split('-');
    let d;
    try { d = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')); } catch (e) { throw new Error(`${f}: niepoprawny JSON (${e.message})`); }
    if (d.id !== id) throw new Error(`${f}: pole "id" to "${d.id}", a powinno być "${id}"`);
    if (zone && d.zone !== zone) throw new Error(`${f}: pole "zone" to "${d.zone}", a powinno być "${zone}"`);
    if (!known.has(id)) throw new Error(`${f}: nie ma pomieszczenia ${id} w data/house.js`);
    return name;
  })
  .sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b));

writeFileSync(`${dir}/index.json`, JSON.stringify(ids) + '\n');
console.log(`rooms: ${ids.length} pomieszczeń (${ids.join(', ')})`);
