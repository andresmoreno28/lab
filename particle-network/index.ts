/**
 * Particle network (lab experiment): particles drift, link to their neighbours within a reach,
 * lean towards the pointer and scatter on a click. Neighbours come from a spatial hash (O(n)
 * per frame) and the links are drawn in a few batches by opacity, so hundreds of particles hold
 * 60 fps. It sleeps off screen and in a hidden tab; with reduced motion it starts still.
 */
import css from './style.css?inline';
import { adopt, fill, h, loopWhileVisible, uid, type Mount } from '../shared/dom';
import { SpatialHash } from '../lib/spatial-hash';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  tone: number;
}

interface Shock {
  x: number;
  y: number;
  age: number;
}

/** Opacity buckets for the links: one path and one stroke per bucket. */
const BUCKETS = 8;
const POINTER_REACH = 180;
const SHOCK_LIFE = 0.9;

export const mount: Mount = ({ root, strings, reduced, signal }) => {
  adopt(css);
  const style = getComputedStyle(root);
  const tones = ['--color-gold', '--color-display-cream', '--color-annotation-blue'].map(
    (name) => style.getPropertyValue(name).trim() || 'white',
  );
  const linkTone = style.getPropertyValue('--color-gold').trim() || 'white';

  const canvas = h('canvas', {
    class: 'pn__canvas',
    role: 'img',
    'aria-label': strings.label ?? '',
  });
  const context = canvas.getContext('2d');
  if (!context) return;

  const slider = (label: string, min: number, max: number, value: number, step = 1) => {
    const id = uid('slider');
    const input = h('input', { type: 'range', id, min, max, step, value, class: 'pn__range' });
    const output = h('output', { for: id, class: 'pn__value t-mono' }, String(value));
    input.addEventListener('input', () => (output.textContent = input.value), { signal });
    return {
      input,
      element: h('div', { class: 'pn__control' }, h('label', { for: id }, label), input, output),
    };
  };
  const density = slider(strings.density ?? '', 40, 420, 0);
  const reach = slider(strings.reach ?? '', 60, 180, 110, 5);
  const toggle = h('button', { type: 'button', class: 'pn__button' });
  const burst = h(
    'button',
    { type: 'button', class: 'pn__button pn__button--gold' },
    strings.burst ?? '',
  );
  const stats = h('p', { class: 'pn__stats t-mono', 'aria-hidden': 'true' });

  root.replaceChildren(
    h(
      'div',
      { class: 'pn' },
      h('div', { class: 'pn__frame' }, canvas),
      h(
        'div',
        { class: 'pn__controls' },
        density.element,
        reach.element,
        h('div', { class: 'pn__buttons' }, toggle, burst),
      ),
      stats,
    ),
  );

  let width = 0;
  let height = 0;
  let ratio = 1;
  const particles: Particle[] = [];
  const shocks: Shock[] = [];
  const pointer = { x: 0, y: 0, active: false };
  let running = !reduced;
  let links = 0;

  const spawn = (): Particle => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 8 + Math.random() * 18;
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 1 + Math.random() * 1.6,
      tone: Math.random() < 0.55 ? 0 : Math.random() < 0.7 ? 1 : 2,
    };
  };
  /** One particle per ~2 600 px² by default: dense on a desktop, lighter on a phone. */
  const defaultCount = () => Math.round(Math.min(420, Math.max(60, (width * height) / 2600)));
  const setCount = (count: number) => {
    while (particles.length < count) particles.push(spawn());
    particles.length = count;
  };

  const resize = () => {
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const first = width === 0;
    ratio = Math.min(2, window.devicePixelRatio || 1);
    width = box.width;
    height = box.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (first) {
      const count = defaultCount();
      density.input.value = String(count);
      density.input.dispatchEvent(new Event('input'));
      setCount(count);
    }
    for (const p of particles) {
      p.x = Math.min(p.x, width);
      p.y = Math.min(p.y, height);
    }
    if (!running) draw();
  };

  let hash = new SpatialHash(110);
  const paths = Array.from({ length: BUCKETS }, () => new Path2D());

  const step = (dt: number) => {
    for (const p of particles) {
      if (pointer.active) {
        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < POINTER_REACH && d > 1) {
          const pull = (1 - d / POINTER_REACH) * 60;
          p.vx += (dx / d) * pull * dt;
          p.vy += (dy / d) * pull * dt;
        }
      }
      // A gentle drag back to cruising speed, so pulls and bursts settle.
      const speed = Math.hypot(p.vx, p.vy);
      const cruise = 14;
      if (speed > cruise) {
        const k = 1 - Math.min(1, dt * 1.6);
        p.vx *= k + (1 - k) * (cruise / speed);
        p.vy *= k + (1 - k) * (cruise / speed);
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < 0 || p.x > width) {
        p.vx *= -1;
        p.x = Math.max(0, Math.min(width, p.x));
      }
      if (p.y < 0 || p.y > height) {
        p.vy *= -1;
        p.y = Math.max(0, Math.min(height, p.y));
      }
    }
    for (const shock of shocks) shock.age += dt;
    while (shocks.length && shocks[0]!.age > SHOCK_LIFE) shocks.shift();
  };

  const draw = () => {
    const max = Number(reach.input.value);
    hash.clear();
    particles.forEach((p, i) => hash.insert(i, p.x, p.y));
    for (let b = 0; b < BUCKETS; b += 1) paths[b] = new Path2D();
    links = 0;
    const max2 = max * max;
    particles.forEach((p, i) => {
      hash.near(p.x, p.y, (j) => {
        if (j <= i) return;
        const q = particles[j]!;
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > max2) return;
        const bucket = Math.min(BUCKETS - 1, Math.floor((Math.sqrt(d2) / max) * BUCKETS));
        const path = paths[bucket]!;
        path.moveTo(p.x, p.y);
        path.lineTo(q.x, q.y);
        links += 1;
      });
    });

    context.clearRect(0, 0, width, height);
    context.lineWidth = 1;
    context.strokeStyle = linkTone;
    for (let b = 0; b < BUCKETS; b += 1) {
      context.globalAlpha = 0.55 * (1 - b / BUCKETS);
      context.stroke(paths[b]!);
    }
    if (pointer.active) {
      context.beginPath();
      for (const p of particles) {
        const d = Math.hypot(pointer.x - p.x, pointer.y - p.y);
        if (d < POINTER_REACH) {
          context.moveTo(pointer.x, pointer.y);
          context.lineTo(p.x, p.y);
        }
      }
      context.globalAlpha = 0.22;
      context.stroke();
    }
    for (const shock of shocks) {
      const t = shock.age / SHOCK_LIFE;
      context.globalAlpha = (1 - t) * 0.7;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(shock.x, shock.y, 20 + t * 260, 0, Math.PI * 2);
      context.stroke();
    }
    context.lineWidth = 1;
    for (let tone = 0; tone < tones.length; tone += 1) {
      context.globalAlpha = tone === 1 ? 0.9 : 1;
      context.fillStyle = tones[tone]!;
      context.beginPath();
      for (const p of particles) {
        if (p.tone !== tone) continue;
        context.moveTo(p.x + p.r, p.y);
        context.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      }
      context.fill();
    }
    context.globalAlpha = 1;
  };

  /* Frames per second, smoothed, shown twice a second. */
  let last = 0;
  let fps = 60;
  let shown = 0;
  const showStats = (now: number) => {
    if (now - shown < 500) return;
    shown = now;
    stats.textContent = fill(strings.stats ?? '', {
      n: particles.length,
      links,
      fps: running ? Math.round(fps) : 0,
    });
  };

  const wake = loopWhileVisible(canvas, signal, (now) => {
    if (!running) {
      last = 0;
      return false;
    }
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    if (last) fps += (1000 / Math.max(1, now - last) - fps) * 0.08;
    last = now;
    step(dt);
    draw();
    showStats(now);
    return true;
  });

  const setRunning = (value: boolean) => {
    running = value;
    toggle.textContent = running ? (strings.pause ?? '') : (strings.play ?? '');
    if (running) wake();
    else {
      draw();
      showStats(performance.now() + 1000);
    }
  };

  const scatter = (x: number, y: number) => {
    for (const p of particles) {
      const dx = p.x - x;
      const dy = p.y - y;
      const d = Math.max(8, Math.hypot(dx, dy));
      if (d > 260) continue;
      const push = (1 - d / 260) * 420;
      p.vx += (dx / d) * push;
      p.vy += (dy / d) * push;
    }
    shocks.push({ x, y, age: 0 });
    if (!running) setRunning(true);
  };

  const local = (event: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };
  canvas.addEventListener(
    'pointermove',
    (event) => {
      Object.assign(pointer, local(event), { active: event.pointerType !== 'touch' });
    },
    { signal },
  );
  canvas.addEventListener('pointerleave', () => (pointer.active = false), { signal });
  canvas.addEventListener(
    'pointerdown',
    (event) => {
      const { x, y } = local(event);
      scatter(x, y);
    },
    { signal },
  );
  toggle.addEventListener('click', () => setRunning(!running), { signal });
  burst.addEventListener('click', () => scatter(width / 2, height / 2), { signal });
  density.input.addEventListener(
    'input',
    () => {
      setCount(Number(density.input.value));
      if (!running) draw();
      showStats(performance.now() + 1000);
    },
    { signal },
  );
  reach.input.addEventListener(
    'input',
    () => {
      hash = new SpatialHash(Number(reach.input.value));
      if (!running) draw();
    },
    { signal },
  );

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  signal.addEventListener('abort', () => observer.disconnect());
  resize();
  setRunning(running);
  showStats(performance.now() + 1000);
};
