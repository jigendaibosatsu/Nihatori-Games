/**
 * Input handling - Pointer Events (mouse + touch)
 * Provides pointer position, click/tap events, and capture for gestures.
 */

export interface PointerEventData {
  x: number;
  y: number;
  pointerId: number;
  type: 'down' | 'move' | 'up' | 'cancel';
  target: EventTarget | null;
  time: number;
}

export interface InputState {
  pointers: Map<number, { x: number; y: number; downTime: number }>;
  lastClickTime: number;
  lastClickX: number;
  lastClickY: number;
  lastClickOnCharacter: boolean;
  moveTarget: { x: number; y: number } | null;
  captureActive: boolean;
}

export function createInputState(): InputState {
  return {
    pointers: new Map(),
    lastClickTime: 0,
    lastClickX: 0,
    lastClickY: 0,
    lastClickOnCharacter: false,
    moveTarget: null,
    captureActive: false,
  };
}

export function getPointerPosition(
  e: PointerEvent,
  canvas: HTMLCanvasElement
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

export function setupPointerCapture(
  canvas: HTMLCanvasElement,
  useCapture: boolean
): void {
  canvas.addEventListener(
    'pointerdown',
    (e) => {
      if (useCapture && e.pointerType !== 'mouse') {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    { passive: true }
  );
}
