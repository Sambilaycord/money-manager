/** Distance from the viewport's bottom-right corner, so the widget grows up and left when it opens. */
export interface CornerOffset {
  right: number;
  bottom: number;
}

const EDGE_GAP = 8;

/** Keeps an element of `size` fully on screen, with a small gap from every edge. */
export function clampOffset(offset: CornerOffset, size: { width: number; height: number }): CornerOffset {
  const maxRight = Math.max(EDGE_GAP, window.innerWidth - size.width - EDGE_GAP);
  const maxBottom = Math.max(EDGE_GAP, window.innerHeight - size.height - EDGE_GAP);
  return {
    right: Math.round(Math.min(Math.max(offset.right, EDGE_GAP), maxRight)),
    bottom: Math.round(Math.min(Math.max(offset.bottom, EDGE_GAP), maxBottom)),
  };
}

/** The current offset of an element from the viewport's bottom-right corner. */
export function offsetOf(element: HTMLElement): CornerOffset {
  const rect = element.getBoundingClientRect();
  return { right: window.innerWidth - rect.right, bottom: window.innerHeight - rect.bottom };
}

/** Where `element` would sit moved by (dx, dy), kept on screen. */
export function movedOffset(element: HTMLElement, dx: number, dy: number): CornerOffset {
  const current = offsetOf(element);
  const rect = element.getBoundingClientRect();
  return clampOffset(
    { right: current.right - dx, bottom: current.bottom - dy },
    { width: rect.width, height: rect.height },
  );
}
