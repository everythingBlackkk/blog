import { useEffect, useRef, useState } from 'react';
import AsciiConnections from './AsciiConnections';

const DEVICES = [
  { id: 'terminal', name: 'Desktop computer', x: 0.015, y: 0.3, mobileX: 0.02, mobileY: 0.02, art: String.raw`
   .----------------.
   | .------------. |
   | |  $ whoami  | |
   | |  yassin_   | |
   | |            | |
   | '------------' |
   '-------++-------'
       ____||____
      /__________\
  .------------------.
  | [] [] [] [] [] [] |
  '------------------'` },
  { id: 'laptop', name: 'Laptop', x: 0.27, y: 0.52, mobileX: 0.06, mobileY: 0.57, art: String.raw`
    .----------------.
    |                |
    |  < hello />    |
    |  ready to go_  |
    |                |
    '----------------'
   /[][][][][][][][]/\
  /________________/
  \________________\/'` },
  { id: 'phone', name: 'Smartphone', x: 0.52, y: 0.28, mobileX: 0.88, mobileY: 0.54, art: String.raw`
  .--------.
  |  .--.  |
  |--------|
  |  09:41 |
  |        |
  | []  [] |
  | []  [] |
  |        |
  |   ()   |
  '--------'` },
  { id: 'console', name: 'Handheld game console', x: 0.73, y: 0.72, mobileX: 0.5, mobileY: 0.99, art: String.raw`
  .-------------------.
  |  .-----------.    |
  |  |  > PLAY   |    |
  |  |  *   .    |    |
  |  '-----------'    |
  |   _         (B)   |
  | _| |_    (A)      |
  |  |_|       . . .  |
  '-------------------'` },
  { id: 'server', name: 'Server tower', x: 0.97, y: 0.16, mobileX: 0.9, mobileY: 0.03, art: String.raw`
   .----------.
   | [====] o |
   |----------|
   | [====] o |
   |----------|
   |  ::::::  |
   |  ::::::  |
   |  ::::::  |
   |    ()    |
   '----------'` },
];

const clamp = (value, max) => Math.max(0, Math.min(value, Math.max(0, max)));
const SCREEN_TOKENS = /(\$ whoami|yassin_|< hello \/>|ready to go_|09:41|> PLAY|\[====\]| o )/g;
const GLOWS = ['#a5ecc1', '#9bd4e6', '#e3c28f', '#c0b0ee', '#93deb0'];

function DeviceArt({ art }) {
  return art.trimEnd().replace(/^\n/, '').split(SCREEN_TOKENS).map((part, index) => {
    if (index % 2 === 0) return part;
    if (part === ' o ') return <span className="device-led" key={index}>{part}</span>;
    return <span className="device-screen" key={index}>{part.endsWith('_') ? <>{part.slice(0, -1)}<span className="device-cursor">_</span></> : part}</span>;
  });
}

export default function AsciiDevices() {
  const stageRef = useRef(null);
  const elements = useRef(new Map());
  const positions = useRef(new Map());
  const redrawConnections = useRef(() => {});
  const moved = useRef(new Set());
  const drag = useRef(null);
  const [active, setActive] = useState(null);
  const [announcement, setAnnouncement] = useState('');

  const place = (id, x, y) => {
    const stage = stageRef.current;
    const element = elements.current.get(id);
    if (!stage || !element) return;
    const maxX = stage.clientWidth - element.offsetWidth;
    const maxY = stage.clientHeight - element.offsetHeight;
    const next = { x: clamp(x, maxX), y: clamp(y, maxY) };
    positions.current.set(id, { ...next, ratioX: maxX > 0 ? next.x / maxX : 0, ratioY: maxY > 0 ? next.y / maxY : 0 });
    element.style.setProperty('--device-x', `${next.x}px`);
    element.style.setProperty('--device-y', `${next.y}px`);
    redrawConnections.current();
  };

  const arrange = (reset = false) => {
    const stage = stageRef.current;
    if (!stage) return;
    const mobile = stage.clientWidth <= 900;
    DEVICES.forEach((device) => {
      const element = elements.current.get(device.id);
      if (!element) return;
      const stored = positions.current.get(device.id);
      const keep = !reset && moved.current.has(device.id) && stored;
      const x = keep ? stored.ratioX : mobile ? device.mobileX : device.x;
      const y = keep ? stored.ratioY : mobile ? device.mobileY : device.y;
      place(device.id, x * Math.max(0, stage.clientWidth - element.offsetWidth), y * Math.max(0, stage.clientHeight - element.offsetHeight));
    });
  };

  useEffect(() => {
    const observer = new ResizeObserver(() => arrange());
    observer.observe(stageRef.current);
    elements.current.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const startDrag = (event, device) => {
    if (!event.isPrimary || event.button !== 0) return;
    const position = positions.current.get(device.id);
    if (!position) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: device.id, pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, ...position };
    setActive(device.id);
  };

  const moveDrag = (event) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    moved.current.add(current.id);
    place(current.id, current.x + event.clientX - current.clientX, current.y + event.clientY - current.clientY);
  };

  const endDrag = (event) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    drag.current = null;
    setActive(null);
  };

  const moveWithKeys = (event, device) => {
    const position = positions.current.get(device.id);
    if (!position) return;
    const step = event.shiftKey ? 30 : 10;
    const directions = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (directions[event.key]) {
      event.preventDefault();
      moved.current.add(device.id);
      const [dx, dy] = directions[event.key];
      place(device.id, position.x + dx, position.y + dy);
    } else if (event.key === 'Home') {
      event.preventDefault();
      moved.current.delete(device.id);
      arrange();
    } else return;
    const next = positions.current.get(device.id);
    setAnnouncement(`${device.name} at ${Math.round(next.ratioX * 100)} percent across, ${Math.round(next.ratioY * 100)} percent down.`);
  };

  const reset = () => {
    drag.current = null;
    setActive(null);
    moved.current.clear();
    arrange(true);
    setAnnouncement('All devices returned to their starting positions.');
  };

  return <aside className="ascii-workbench page-shell" aria-label="Interactive ASCII devices">
    <div className="workbench-caption">
      <div><span className="workbench-title">ALWAYS TINKERING<span aria-hidden="true">_</span></span><p id="device-instructions">Drag to rearrange. Or focus a device and use the arrow keys.</p></div>
      <button className="workbench-reset" onClick={reset} aria-label="Reset device positions">[ reset ]</button>
    </div>
    <div ref={stageRef} className={`device-stage${active ? ' is-dragging' : ''}`}>
      <AsciiConnections elements={elements} positions={positions} redrawRef={redrawConnections} />
      <pre className="workbench-grid" aria-hidden="true">{Array.from({ length: 6 }, () => '.      '.repeat(40)).join('\n')}</pre>
      {DEVICES.map((device, index) => <button
        key={device.id}
        ref={(element) => { if (element) elements.current.set(device.id, element); else elements.current.delete(device.id); }}
        className={`ascii-device${active === device.id ? ' is-held' : ''}`}
        style={{ '--float-delay': `${-index * 1.7}s`, '--device-glow': GLOWS[index] }}
        aria-label={`Move ${device.name.toLowerCase()}`}
        aria-describedby="device-instructions device-keyboard-help"
        onPointerDown={(event) => startDrag(event, device)}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onKeyDown={(event) => moveWithKeys(event, device)}
      ><span className="device-drawing"><pre aria-hidden="true"><DeviceArt art={device.art} /></pre><span className="device-name" aria-hidden="true"><span className="device-index">0{index + 1} / </span>{device.name}</span></span></button>)}
    </div>
    <span id="device-keyboard-help" className="ascii-sr-only">Hold Shift for larger steps. Press Home to restore this device, or use Reset to restore all devices.</span>
    <span className="ascii-sr-only" role="status" aria-live="polite">{announcement}</span>
    <div className="workbench-signoff" aria-hidden="true">// keep exploring<span>EOF</span></div>
  </aside>;
}
