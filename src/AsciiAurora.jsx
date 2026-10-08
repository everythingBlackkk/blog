import { useRef } from 'react';
import useAsciiCanvas from './useAsciiCanvas';

const INK = ' .,:;+=*#%@';
const FAR = [[0, .58], [.05, .51], [.11, .42], [.16, .34], [.21, .45], [.26, .4], [.32, .55], [.43, .62], [.52, .63], [.62, .51], [.69, .47], [.75, .32], [.8, .4], [.85, .31], [.92, .44], [.97, .4], [1, .5]];
const NEAR = [[0, .49], [.06, .43], [.14, .52], [.2, .49], [.29, .62], [.4, .66], [.53, .66], [.63, .62], [.74, .58], [.82, .53], [.87, .55], [.93, .47], [1, .54]];
const hash = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
function ridge(x, points) {
  const index = points.findIndex(([next]) => next >= x);
  if (index <= 0) return points[0][1];
  const [x0, y0] = points[index - 1];
  const [x1, y1] = points[index];
  return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
}
const gaussian = (value) => Math.exp(-(value ** 2));

function paintLandscape(ctx, width, height, time) {
  const columns = Math.max(72, Math.floor(width / 6.8));
  const cell = width / columns;
  const line = cell * 1.45;
  const rows = Math.ceil(height / line);
  const shore = .68;
  ctx.font = `${cell * 1.55}px "SFMono-Regular", Consolas, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const landscape = Array.from({ length: columns }, (_, col) => {
    const x = col / columns;
    return {
      x,
      far: ridge(x, FAR) + Math.sin(x * 193) * .004,
      near: ridge(x, NEAR) + Math.sin(x * 143) * .005,
      crest: .17 + Math.sin(x * 8 + time * .12) * .072 + Math.sin(x * 22 - time * .07) * .022,
      second: .27 + Math.sin(x * 10.5 + time * .09 + .9) * .065,
      filament: .35 + .65 * Math.sin(col * .93 + Math.sin(x * 9) + time * .2) ** 2,
      envelope: Math.sin(Math.PI * x) ** .6,
    };
  });
  const lightAt = (column, y) => {
    const vertical = y - column.crest;
    const tail = vertical > 0 ? (1 - Math.exp(-vertical * 65)) * Math.exp(-vertical * 17) * .8 : 0;
    const main = (gaussian(vertical / .037) * .68 + tail) * column.filament * column.envelope;
    const second = gaussian((y - column.second) / .055) * (.45 + column.filament * .55) * column.envelope * .48;
    return { main, second, total: Math.min(1, main + second) };
  };

  for (let row = 0; row < rows; row++) {
    const y = row / rows;
    for (let col = 0; col < columns; col++) {
      const column = landscape[col];
      const { x, far, near } = column;
      const noise = hash(col, row);
      let glyph = ' ';
      let color = '';
      if (y < shore) {
        const { main, second, total } = lightAt(column, y);
        if (total > .1) {
          const mix = second / (main + second);
          glyph = INK[Math.min(9, Math.floor(total * 10))];
          if (main > .22 && total < .55) glyph = noise > .55 ? '|' : ':';
          color = `rgba(${Math.round(122 + mix * 30)}, ${Math.round(229 - mix * 54)}, ${Math.round(176 + mix * 56)}, ${.16 + total * .65})`;
        }
        if (noise > .993 && y < .46) {
          glyph = noise > .998 ? '+' : '.';
          color = `rgba(210, 232, 224, ${.28 + (.5 + Math.sin(time * .65 + col * 2 + row) * .5) * .4})`;
        }
        if (y >= far) {
          const depth = (y - far) / (shore - far);
          const snow = depth < .28 && noise > .2;
          const slope = ridge(Math.min(1, x + .01), FAR) - ridge(x, FAR);
          glyph = y - far < 1 / rows ? (slope < 0 ? '/' : '\\') : snow ? '/\\^'[Math.floor(noise * 3)] : noise > .65 ? ':' : '.';
          const tone = snow ? 159 - depth * 230 : 48 + noise * 23;
          color = `rgb(${tone * .9}, ${tone}, ${tone + 5})`;
        }
        if (y >= near) {
          const depth = (y - near) / (shore - near);
          glyph = y - near < 1 / rows ? (noise > .5 ? '/' : '\\') : noise > .65 ? ':' : noise > .35 ? '.' : ' ';
          color = `rgba(87, 112, 103, ${.62 - depth * .3})`;
        }
      } else {
        const distance = (y - shore) / (1 - shore);
        const { total } = lightAt(column, shore - (y - shore) * 1.65);
        const ripple = Math.sin(row * 2.1 + Math.sin(col * .16 + time * .2) * 1.7 + time * .45);
        if (noise > .22 && ripple > -.35) {
          glyph = ripple > .7 ? '~' : noise > .6 ? '-' : '.';
          color = `rgba(126, 199, 168, ${(0.1 + total * .38) * (1 - distance * .72)})`;
        }
      }
      if (glyph !== ' ') {
        ctx.fillStyle = color;
        ctx.fillText(glyph, (col + .5) * cell, (row + .5) * line);
      }
    }
  }

  const sprite = (art, left, top, ink) => art.forEach((text, row) => [...text].forEach((glyph, col) => {
    if (glyph === ' ') return;
    ctx.fillStyle = glyph === '[' || glyph === ']' ? '#e0ba7a' : ink;
    ctx.fillText(glyph, (left + col + .5) * cell, (top + row + .5) * line);
  }));
  const cabinX = Math.floor(columns * .66);
  const cabinY = Math.floor(rows * shore) - 5;
  sprite(['    /\\', '   /..\\', '  /____\\', '  | [] |', '__|____|__'], cabinX, cabinY, '#899e93');
  // Chimney smoke drifts as a few characters rather than a solid effect.
  const smoke = Math.sin(time * .25);
  ctx.fillStyle = 'rgba(155, 175, 166, .3)';
  ctx.fillText('~', (cabinX + 7 + smoke * .4) * cell, (cabinY - 1) * line);
  ctx.fillStyle = 'rgba(155, 175, 166, .15)';
  ctx.fillText('.', (cabinX + 7.5 + smoke) * cell, (cabinY - 2) * line);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = `rgba(224, 186, 122, ${.28 - i * .04})`;
    ctx.fillText(i % 2 ? '-~' : '~', (cabinX + 5 + Math.sin(time * .3 + i) * .8) * cell, (cabinY + 6 + i) * line);
  }
  [.035, .09, .2, .9, .96].forEach((x, i) => {
    sprite(['  ^', ' /|\\', '/_|_\\', '  |'], Math.floor(columns * x), Math.floor(rows * shore) - 3 - i % 2, '#4b6458');
  });
}

export default function AsciiAurora() {
  const canvasRef = useRef(null);
  useAsciiCanvas(canvasRef, paintLandscape);
  return <div className="ascii-aurora">
    <canvas ref={canvasRef} role="img" aria-label="ASCII northern lights flowing over a mountain fjord, with a softly lit cabin on the shore." />
  </div>;
}
