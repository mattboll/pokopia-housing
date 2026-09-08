/**
 * Inline SVG icons (stroke based, 24px grid). Returns an SVG element.
 */
const PATHS = {
  house: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12h11l2-8H6"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  move: '<path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  close: '<path d="M18 6L6 18M6 6l12 12"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7"/><path d="M12 17h.01"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  food: '<path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 3c-2 0-3 3-3 7h3v11"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  download: '<path d="M12 3v12M6 11l6 6 6-6M4 21h16"/>',
  upload: '<path d="M12 21V9M6 13l6-6 6 6M4 3h16"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  paw: '<circle cx="7" cy="9" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="17" cy="9" r="2"/><path d="M12 11c-3 0-6 3-6 6a3 3 0 0 0 3 3c1 0 2-.5 3-.5s2 .5 3 .5a3 3 0 0 0 3-3c0-3-3-6-6-6z"/>',
  swap: '<path d="M4 7h13M13 3l4 4-4 4M20 17H7M11 13l-4 4 4 4"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
};

/**
 * @param {keyof typeof PATHS} name
 * @param {{size?: number, color?: string, fill?: string, className?: string, label?: string}} [opts]
 * @returns {SVGSVGElement}
 */
export function icon(name, opts = {}) {
  const size = opts.size ?? 18;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', opts.fill ?? 'none');
  svg.setAttribute('stroke', opts.color ?? 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', opts.label ? 'false' : 'true');
  if (opts.label) svg.setAttribute('aria-label', opts.label);
  if (opts.className) svg.setAttribute('class', opts.className);
  svg.innerHTML = PATHS[name] || '';
  return svg;
}

/** Row of 5 stars, `count` filled. */
export function stars(count, size = 13) {
  const wrap = document.createElement('span');
  wrap.className = 'stars';
  wrap.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 5; i++) {
    wrap.appendChild(icon('star', { size, color: i < count ? '#FFD036' : '#E8DCCB', fill: i < count ? '#FFD036' : 'none' }));
  }
  return wrap;
}
