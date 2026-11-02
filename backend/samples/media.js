/* eslint-disable */
/**
 * Placeholder media for the sample package: short WAV tones instead of the
 * AI-generated recordings, and SVG drawings instead of generated images.
 * Real packages carry the generator's mp3 / png files.
 */

/** Mono 8 kHz 16-bit WAV: a soft beep every two seconds. */
function toneWav(seconds, freq = 440) {
  const rate = 8000;
  const n = Math.round(seconds * rate);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const on = t % 2 < 0.25 ? 1 : 0;
    buf.writeInt16LE(Math.round(on * 3000 * Math.sin(2 * Math.PI * freq * t)), 44 + i * 2);
  }
  return buf.toString('base64');
}

const svg = (w, h, body) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Arial, sans-serif"><rect width="100%" height="100%" fill="#fff"/>${body}</svg>`,
  ).toString('base64');

/** Listening part 2: plan of a park with letters A–H. */
function parkMap() {
  const box = (x, y, w, h, label) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#e8f1e4" stroke="#333"/><text x="${x + w / 2}" y="${y + h / 2 + 6}" font-size="18" text-anchor="middle" font-weight="bold">${label}</text>`;
  return svg(
    560,
    400,
    `<text x="280" y="28" font-size="20" text-anchor="middle" font-weight="bold">Hilltop Park</text>
<rect x="20" y="40" width="520" height="340" fill="none" stroke="#333" stroke-width="2"/>
<path d="M20 210 H540" stroke="#bbb" stroke-width="18"/><path d="M280 40 V380" stroke="#bbb" stroke-width="18"/>
<text x="290" y="395" font-size="13">Main entrance</text>
${box(50, 70, 90, 60, 'A')}${box(180, 70, 80, 60, 'B')}${box(320, 70, 90, 60, 'C')}${box(440, 70, 80, 60, 'D')}
${box(50, 260, 90, 60, 'E')}${box(180, 260, 80, 60, 'F')}${box(320, 260, 90, 60, 'G')}${box(440, 260, 80, 60, 'H')}
<circle cx="280" cy="210" r="22" fill="#9cc3e6" stroke="#333"/><text x="280" y="250" font-size="12" text-anchor="middle">fountain</text>
<rect x="60" y="150" width="60" height="30" fill="#ccc" stroke="#333"/><text x="90" y="170" font-size="11" text-anchor="middle">car park</text>`,
  );
}

/** Reading passage 1: glass furnace diagram with three blank labels. */
function furnaceDiagram() {
  return svg(
    560,
    340,
    `<text x="280" y="26" font-size="18" text-anchor="middle" font-weight="bold">A Roman glass furnace</text>
<path d="M140 300 Q280 60 420 300 Z" fill="#f3d9b1" stroke="#333" stroke-width="2"/>
<rect x="250" y="250" width="60" height="50" fill="#e0703a" stroke="#333"/>
<circle cx="280" cy="170" r="16" fill="#fff" stroke="#333"/>
<rect x="190" y="215" width="40" height="22" fill="#c9e4f5" stroke="#333"/>
<line x1="296" y1="170" x2="420" y2="120" stroke="#333"/><line x1="310" y1="275" x2="430" y2="270" stroke="#333"/>
<line x1="190" y1="226" x2="110" y2="200" stroke="#333"/>
<text x="425" y="110" font-size="12">opening for</text><text x="435" y="262" font-size="12">wood-fired</text><text x="40" y="190" font-size="12">clay</text>`,
  );
}

/** Writing task 1: bar chart. */
function barChart() {
  const data = [
    ['2000', 32, 18],
    ['2005', 41, 22],
    ['2010', 48, 31],
    ['2015', 52, 45],
    ['2020', 49, 58],
  ];
  const bars = data
    .map(([year, car, bike], i) => {
      const x = 90 + i * 95;
      return `<rect x="${x}" y="${330 - car * 5}" width="32" height="${car * 5}" fill="#3b6fb6"/><rect x="${x + 34}" y="${330 - bike * 5}" width="32" height="${bike * 5}" fill="#e39b2d"/><text x="${x + 33}" y="350" font-size="13" text-anchor="middle">${year}</text>`;
    })
    .join('');
  const grid = [0, 10, 20, 30, 40, 50, 60]
    .map((v) => `<line x1="70" x2="580" y1="${330 - v * 5}" y2="${330 - v * 5}" stroke="#ddd"/><text x="62" y="${334 - v * 5}" font-size="12" text-anchor="end">${v}</text>`)
    .join('');
  return svg(
    620,
    420,
    `<text x="310" y="26" font-size="16" text-anchor="middle" font-weight="bold">Daily commuters entering Northbridge city centre (thousands)</text>
${grid}<line x1="70" x2="70" y1="30" y2="330" stroke="#333"/><line x1="70" x2="580" y1="330" y2="330" stroke="#333"/>${bars}
<rect x="200" y="380" width="14" height="14" fill="#3b6fb6"/><text x="220" y="392" font-size="13">by car</text>
<rect x="320" y="380" width="14" height="14" fill="#e39b2d"/><text x="340" y="392" font-size="13">by bicycle</text>`,
  );
}

module.exports = { toneWav, parkMap, furnaceDiagram, barChart };
