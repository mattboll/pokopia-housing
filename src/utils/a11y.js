const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

let trapContainer = null;
let trapHandler = null;

/**
 * Announce a message to screen readers via a live region.
 * Expects an element with id="a11y-announcer" in the DOM.
 *
 * @param {string} message - Text to announce
 */
export function announce(message) {
  const announcer = document.getElementById('a11y-announcer');
  if (announcer) {
    announcer.textContent = message;
  }
}

/**
 * Trap keyboard focus within a container element (e.g. a modal).
 * Press Tab / Shift+Tab to cycle through focusable elements inside.
 *
 * @param {HTMLElement} container - The element to trap focus within
 */
export function trapFocus(container) {
  releaseFocus();

  trapContainer = container;

  trapHandler = (e) => {
    if (e.key !== 'Tab') return;

    const focusable = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  document.addEventListener('keydown', trapHandler);

  const firstFocusable = container.querySelector(FOCUSABLE_SELECTOR);
  if (firstFocusable) {
    firstFocusable.focus();
  }
}

/**
 * Release any active focus trap.
 */
export function releaseFocus() {
  if (trapHandler) {
    document.removeEventListener('keydown', trapHandler);
    trapHandler = null;
    trapContainer = null;
  }
}

/**
 * Move focus to the main content area (#app-main).
 */
export function skipToMain() {
  const main = document.getElementById('app-main');
  if (main) {
    main.setAttribute('tabindex', '-1');
    main.focus();
  }
}
