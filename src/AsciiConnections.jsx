import { useEffect, useRef } from 'react';
import useAsciiCanvas from './useAsciiCanvas';

export default function AsciiConnections({ elements, positions, redrawRef }) {
  const canvasRef = useRef(null);
  const redraw = useAsciiCanvas(canvasRef, (ctx, width, height, time) => {
    const nodes = [...elements.current].flatMap(([id, element]) => {
      const position = positions.current.get(id);
      return position ? [{ x: position.x, y: position.y, w: element.offsetWidth, h: element.offsetHeight }] : [];
    });
    if (nodes.length < 2) return;
    const cell = 8;
    const line = 12;
    ctx.font = '11px "SFMono-Regular", Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const hiddenByDevice = (x, y) => nodes.some((node) => x >= node.x - 4 && x <= node.x + node.w + 4 && y >= node.y - 5 && y <= node.y + node.h + 2);
    const paths = [];
    const ink = new Map();
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i];
      const b = nodes[i + 1];
      const from = { x: Math.round((a.x + a.w / 2) / cell), y: Math.round((a.y + a.h - 24) / line) };
      const to = { x: Math.round((b.x + b.w / 2) / cell), y: Math.round((b.y + b.h - 24) / line) };
      const ground = Math.min(Math.floor((height - 12) / line), Math.max(from.y, to.y) + 2 + i % 2);
      const points = [];
      const segment = (start, end, glyph) => {
        const dx = Math.sign(end.x - start.x);
        const dy = Math.sign(end.y - start.y);
        const length = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y));
        for (let step = 0; step <= length; step++) {
          const point = { x: start.x + dx * step, y: start.y + dy * step, glyph };
          points.push(point);
          const key = `${point.x}:${point.y}`;
          ink.set(key, ink.has(key) && ink.get(key).glyph !== glyph ? { ...point, glyph: '+' } : point);
        }
      };
      segment(from, { x: from.x, y: ground }, '|');
      segment({ x: from.x, y: ground }, { x: to.x, y: ground }, '-');
      segment({ x: to.x, y: ground }, to, '|');
      paths.push(points);
    }
    ctx.fillStyle = 'rgba(105, 163, 132, .22)';
    ink.forEach(({ x, y, glyph }) => {
      const px = x * cell;
      const py = y * line;
      if (!hiddenByDevice(px, py)) ctx.fillText(glyph, px, py);
    });
    paths.forEach((points, index) => {
      const offset = Math.floor(time * 6 + index * 17) % points.length;
      for (let trail = 0; trail < 3; trail++) {
        const point = points[(offset - trail + points.length) % points.length];
        const px = point.x * cell;
        const py = point.y * line;
        if (px >= 0 && px <= width && !hiddenByDevice(px, py)) {
          ctx.fillStyle = `rgba(151, 226, 184, ${.65 - trail * .2})`;
          ctx.fillText(trail === 0 ? 'o' : '.', px, py);
        }
      }
    });
  });
  useEffect(() => {
    redrawRef.current = () => redraw.current();
    return () => { redrawRef.current = () => {}; };
  }, [redraw, redrawRef]);
  return <canvas ref={canvasRef} className="device-connections" aria-hidden="true" />;
}
