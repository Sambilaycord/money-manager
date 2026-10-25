"use client";

import { useRef, type PointerEvent, type RefObject } from "react";
import { clampOffset, offsetOf, type CornerOffset } from "./corner-position";

/** Below this many pixels of movement a press is a tap, not a drag. */
const DRAG_THRESHOLD = 4;

interface DragStart {
  pointerId: number;
  x: number;
  y: number;
  offset: CornerOffset;
  size: { width: number; height: number };
  moved: boolean;
}

/**
 * Pointer handlers that drag `containerRef` around the screen by whichever
 * element they're spread on, reporting each new position to `onMove`.
 * Works for mouse, pen and touch alike.
 */
export function useCornerDrag(
  containerRef: RefObject<HTMLElement | null>,
  onMove: (offset: CornerOffset) => void,
) {
  const drag = useRef<DragStart | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    const container = containerRef.current;
    if (!container || event.button !== 0) return;
    const rect = container.getBoundingClientRect();
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offset: offsetOf(container),
      size: { width: rect.width, height: rect.height },
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const start = drag.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    start.moved = true;
    onMove(clampOffset({ right: start.offset.right - dx, bottom: start.offset.bottom - dy }, start.size));
  };

  const endDrag = (event: PointerEvent<HTMLElement>) => {
    const start = drag.current;
    if (!start || start.pointerId !== event.pointerId) return;
    drag.current = null;
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };
}
