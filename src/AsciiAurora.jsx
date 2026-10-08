import { useEffect, useRef, useState } from 'react';

// An original landscape drawn entirely with monospace ASCII characters.
const INK = ' .,:;+=*#%@';
const hash = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
const ridge = (x) => 0.57 - Math.exp(-(((x - 0.16) / 0.12) ** 2)) * 0.19
  - Math.exp(-(((x - 0.79) / 0.15) ** 2)) * 0.24
  - Math.exp(-(((x - 0.96) / 0.08) ** 2)) * 0.12
  + Math.sin(x * 83) * 0.009 + Math.sin(x * 31) * 0.014;

function paintLandscape(canvas, width, height, time) {
  if (!width || !height) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const columns = Math.max(72, Math.floor(width / 7));
  const cell = width / columns;
  const line = cell * 1.48;
  const rows = Math.ceil(height / line);
  ctx.clearRect(0, 0, width, height);
  ctx.font = `${cell * 1.55}px "SFMono-Regular", Consolas, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const horizon = 0.65;

  for (let row = 0; row < rows; row++) {
    const y = row / rows;
    for (let col = 0; col < columns; col++) {
      const x = col / columns;
      const noise = hash(col, row);
      let glyph = ' ';
      let color = '';
      if (y < horizon) {
        // A flowing curtain; each vertical filament keeps its texture.
        const center = 0.22 + Math.sin(x * 8 + time * 0.13) * 0.07
          + Math.sin(x * 19 - time * 0.09) * 0.025;
        const curtain = Math.exp(-(((y - center) / 0.1) ** 2));
        const filament = 0.35 + 0.65 * Math.sin(col * 1.7 + time * 0.18) ** 2;
        const envelope = Math.sin(Math.PI * x) ** 0.7;
        const light = curtain * filament * envelope;
        if (light > 0.12) {
          glyph = INK[Math.min(8, Math.floor(light * 9))];
          color = `rgba(${112 + Math.round(light * 35)}, ${150 + Math.round(light * 36)}, ${140 + Math.round(light * 29)}, ${0.22 + light * 0.48})`;
        }
        if (noise > 0.994 && y < 0.42) {
          glyph = noise > 0.998 ? '+' : '.';
          color = `rgba(204, 216, 212, ${0.3 + Math.sin(time * 0.3 + col) * 0.12})`;
        }
        const edge = ridge(x);
        if (y >= edge) {
          const depth = (y - edge) / (horizon - edge);
          const snow = depth < 0.26 && noise > 0.25;
          glyph = snow ? '/\\^'[Math.floor(noise * 3)] : noise > 0.55 ? ':' : '.';
          const tone = snow ? 124 - depth * 130 : 47 + noise * 19;
          color = `rgb(${tone}, ${tone + 3}, ${tone + 4})`;
        }
      } else {
        const distance = (y - horizon) / (1 - horizon);
        const ripple = Math.sin(row * 1.9 + Math.sin(col * 0.13 + time * 0.18) * 1.5 + time * 0.25);
        const reflection = Math.exp(-(((x - 0.48 - Math.sin(row * 0.4 + time * 0.15) * 0.04) / 0.28) ** 2));
        if (noise > 0.3 && ripple > -0.25) {
          glyph = ripple > 0.75 ? '~' : noise > 0.8 ? '-' : '.';
          color = `rgba(133, 158, 149, ${(0.12 + reflection * 0.22) * (1 - distance * 0.8)})`;
        }
      }
      if (glyph !== ' ') {
        ctx.fillStyle = color;
        ctx.fillText(glyph, (col + 0.5) * cell, (row + 0.5) * line);
      }
    }
  }

  // A small shore cabin, and the warm reflection beneath its window.
  const cabin = ['    /\\    ', '   /__\\   ', '  /|[]|\\  ', '  _|__|___ '];
  const cabinX = Math.floor(columns * 0.7);
  const cabinY = Math.floor(rows * 0.58);
  cabin.forEach((text, row) => [...text].forEach((glyph, col) => {
    ctx.fillStyle = glyph === '[' || glyph === ']' ? '#c5ab7b' : '#7c8280';
    ctx.fillText(glyph, (cabinX + col + 0.5) * cell, (cabinY + row + 0.5) * line);
  }));
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = `rgba(197, 171, 123, ${0.19 - i * 0.032})`;
    ctx.fillText(i % 2 ? '-~' : '~', (cabinX + 5 + Math.sin(time * 0.3 + i) * 0.7) * cell, (cabinY + 5 + i) * line);
  }
}

export default function AsciiAurora() {
  const canvasRef = useRef(null);
  const phaseRef = useRef(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let visible = false;
    let frame = 0;
    let last = 0;
    let elapsed = phaseRef.current;
    const draw = () => paintLandscape(canvas, width, height, elapsed);
    const tick = (now) => {
      if (now - last >= 65) {
        elapsed += last ? Math.min((now - last) / 1000, 0.1) : 0;
        phaseRef.current = elapsed;
        last = now;
        draw();
      }
      frame = requestAnimationFrame(tick);
    };
    const update = () => {
      cancelAnimationFrame(frame);
      last = 0;
      draw();
      if (visible && !document.hidden && !paused && !media.matches) frame = requestAnimationFrame(tick);
    };
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
      update();
    });
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    resize.observe(canvas);
    intersection.observe(canvas);
    media.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      media.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [paused]);

  return <div className="ascii-aurora">
    <canvas ref={canvasRef} role="img" aria-label="ASCII northern lights flowing over a mountain fjord, with a softly lit cabin on the shore." />
    <button className="aurora-pause" onClick={() => setPaused(!paused)} aria-label={paused ? 'Play aurora animation' : 'Pause aurora animation'} aria-pressed={paused}>{paused ? '[ play ]' : '[ pause ]'}</button>
  </div>;
}
