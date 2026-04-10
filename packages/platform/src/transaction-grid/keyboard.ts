import type { GridKeyboardCommand } from './types';

export interface KeyboardLikeEvent {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

export function normalizeGridKeyboardEvent(
  event: KeyboardLikeEvent,
): GridKeyboardCommand | undefined {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    return { type: 'save' };
  }

  switch (event.key) {
    case 'Enter':
      return { type: 'enter' };
    case 'Tab':
      return { type: 'tab', shiftKey: event.shiftKey };
    case 'ArrowUp':
      return { type: 'arrow', direction: 'up' };
    case 'ArrowDown':
      return { type: 'arrow', direction: 'down' };
    case 'ArrowLeft':
      return { type: 'arrow', direction: 'left' };
    case 'ArrowRight':
      return { type: 'arrow', direction: 'right' };
    case 'F2':
      return { type: 'f2' };
    case 'Escape':
      return { type: 'escape' };
    case 'Delete':
      return { type: 'delete' };
    case 'Backspace':
      return { type: 'backspace' };
    default:
      return undefined;
  }
}

