/**
 * The CSS zoom an element is drawn at: the product of the `zoom` of the element and of every
 * ancestor (the site zooms the whole page past 1920 px). Its CSS pixels (clientWidth, lengths it
 * is given) times this are screen pixels (getBoundingClientRect, clientX): a piece divides what
 * it measures on the screen by it before writing it back as CSS pixels.
 *
 * `currentCSSZoom` gives it directly. WebKit (and Chromium before 128) lacks it: there the zoom of
 * every ancestor is multiplied, or Safari would place things off by the zoom. An engine without
 * CSS zoom reads 1 either way, and draws at 1.
 */
export function zoomOf(element: Element): number {
  let zoom = (element as Element & { currentCSSZoom?: number }).currentCSSZoom;
  if (!zoom) {
    zoom = 1;
    for (let node: Element | null = element; node; node = node.parentElement)
      zoom *= +getComputedStyle(node).zoom || 1;
  }
  return zoom;
}
