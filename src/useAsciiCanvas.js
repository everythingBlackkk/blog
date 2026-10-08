import { useEffect, useRef } from 'react';

// Keep character animations asleep when offscreen or when motion is reduced.
export default function useAsciiCanvas(canvasRef, paint) {
  const painter = useRef(paint);
  const redraw = useRef(() => {});
  const phase = useRef(0);

  useEffect(() => { painter.current = paint; }, [paint]);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let visible = false;
    let frame = 0;
    let last = 0;
    const draw = () => {
      if (!width || !height) return;
      context.clearRect(0, 0, width, height);
      painter.current(context, width, height, phase.current);
    };
    const tick = (now) => {
      if (now - last >= 65) {
        phase.current += last ? Math.min((now - last) / 1000, 0.1) : 0;
        last = now;
        draw();
      }
      frame = requestAnimationFrame(tick);
    };
    const update = () => {
      cancelAnimationFrame(frame);
      last = 0;
      draw();
      if (visible && !document.hidden && !media.matches) frame = requestAnimationFrame(tick);
    };
    redraw.current = draw;
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
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
      redraw.current = () => {};
    };
  }, [canvasRef]);
  return redraw;
}
