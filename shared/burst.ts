/**
 * Sparks from an element: a few gold dots fly out from its centre and fade (Web Animations,
 * no stylesheet), as if it had just been switched on. Decorative; callers skip it with reduced
 * motion. The site fires it from ▶ when its home window opens a piece; the demo, from «Restart».
 */
const SPARKS = 22;

export function burst(from: HTMLElement): void {
  if (typeof from.animate !== 'function') return;
  const box = from.getBoundingClientRect();
  const layer = document.createElement('span');
  layer.setAttribute('aria-hidden', 'true');
  Object.assign(layer.style, {
    position: 'fixed',
    left: `${box.left + box.width / 2}px`,
    top: `${box.top + box.height / 2}px`,
    width: '0',
    height: '0',
    pointerEvents: 'none',
    zIndex: '50',
  });
  document.body.append(layer);
  const colours = ['var(--color-gold)', 'var(--color-gold-text)', 'var(--color-display-cream)'];
  const done: Promise<unknown>[] = [];
  for (let i = 0; i < SPARKS; i += 1) {
    const spark = document.createElement('span');
    const size = 3 + Math.random() * 5;
    Object.assign(spark.style, {
      position: 'absolute',
      width: `${size}px`,
      height: `${size}px`,
      margin: `${-size / 2}px 0 0 ${-size / 2}px`,
      borderRadius: '50%',
      background: colours[i % colours.length],
      boxShadow: '0 0 8px var(--color-gold)',
    });
    layer.append(spark);
    const angle = (i / SPARKS) * Math.PI * 2 + Math.random() * 0.4;
    const reach = 50 + Math.random() * 70;
    const x = Math.cos(angle) * reach;
    const y = Math.sin(angle) * reach;
    done.push(
      spark.animate(
        [
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${x}px, ${y}px) scale(0.2)`, opacity: 0 },
        ],
        { duration: 600 + Math.random() * 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      ).finished,
    );
  }
  void Promise.allSettled(done).then(() => layer.remove());
}
