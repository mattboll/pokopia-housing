/**
 * Create a DOM element with attributes and children.
 *
 * @param {string} tag - HTML tag name
 * @param {Object|null} attrs - Attribute key/value pairs (null to skip)
 * @param {...(Node|string)} children - Child nodes or text strings
 * @returns {HTMLElement}
 */
export function el(tag, attrs, ...children) {
  const element = document.createElement(tag);

  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (key.startsWith('on') && typeof value === 'function') {
        element.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'className') {
        element.className = value;
      } else {
        element.setAttribute(key, value);
      }
    }
  }

  for (const child of children) {
    if (child == null) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      element.appendChild(document.createTextNode(String(child)));
    } else {
      element.appendChild(child);
    }
  }

  return element;
}

/**
 * querySelector shortcut.
 *
 * @param {string} selector - CSS selector
 * @param {Document|Element} parent - Parent to query within
 * @returns {Element|null}
 */
export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * querySelectorAll shortcut returning a real Array.
 *
 * @param {string} selector - CSS selector
 * @param {Document|Element} parent - Parent to query within
 * @returns {Element[]}
 */
export function $$(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}
