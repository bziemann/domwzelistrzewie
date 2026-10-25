// Kopiuje zależności z node_modules do www/vendor, żeby aplikacja działała bez internetu.
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';

const out = 'www/vendor';
mkdirSync(`${out}/fonts`, { recursive: true });
copyFileSync('node_modules/three/build/three.min.js', `${out}/three.min.js`);

// Manrope: tylko grubości używane w index.html (500, 700, 800), alfabet łaciński z polskimi znakami.
const ranges = {
  latin: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  'latin-ext': 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF'
};
let css = '';
for (const w of [500, 700, 800]) for (const [sub, range] of Object.entries(ranges)) {
  const f = `manrope-${sub}-${w}-normal.woff2`;
  copyFileSync(`node_modules/@fontsource/manrope/files/${f}`, `${out}/fonts/${f}`);
  css += `@font-face{font-family:'Manrope';font-style:normal;font-weight:${w};font-display:swap;src:url(${f}) format('woff2');unicode-range:${range}}\n`;
}
writeFileSync(`${out}/fonts/manrope.css`, css);
console.log('vendor: three.min.js r128 + Manrope 500/700/800');
