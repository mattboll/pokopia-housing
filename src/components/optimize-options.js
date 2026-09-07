import { el } from '../utils/dom.js';
import { t } from '../core/i18n.js';
import { DEFAULT_SATISFY } from '../algorithm/scoring.js';

const STORAGE_KEY = 'pokopia-housing-options';

/** @typedef {{includeDlc: boolean, includeEvent: boolean, satisfy: number}} OptimizeUiOptions */

const DEFAULTS = { includeDlc: true, includeEvent: true, satisfy: DEFAULT_SATISFY };

/** Clamps a "favorites to satisfy" value to 1..6. */
export function clampSatisfy(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(6, Math.max(1, Math.round(n))) : DEFAULT_SATISFY;
}

/**
 * Loads the persisted optimization options.
 * @returns {OptimizeUiOptions}
 */
export function loadOptions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        includeDlc: parsed.includeDlc !== false,
        includeEvent: parsed.includeEvent !== false,
        satisfy: parsed.satisfy === undefined ? DEFAULT_SATISFY : clampSatisfy(parsed.satisfy),
      };
    }
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

/**
 * Persists the optimization options.
 * @param {OptimizeUiOptions} options
 */
export function saveOptions(options) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
  } catch { /* ignore */ }
}

/**
 * Filters a Pokemon list according to the source toggles.
 *
 * @param {Array<{source: string}>} list
 * @param {OptimizeUiOptions} options
 */
export function applySourceFilter(list, options) {
  return list.filter((p) =>
    (p.source !== 'basin' || options.includeDlc) &&
    (p.source !== 'event' || options.includeEvent));
}

/**
 * Creates the options panel: DLC / event toggles + "favorites to satisfy per
 * Pokemon" slider. Calls `onChange(options)` on every change.
 *
 * @param {OptimizeUiOptions} options - current options (mutated in place)
 * @param {(options: OptimizeUiOptions) => void} onChange
 * @param {{showSources?: boolean}} [config]
 * @returns {HTMLElement}
 */
export function createOptionsPanel(options, onChange, config = {}) {
  const showSources = config.showSources ?? true;

  const panel = el('section', { className: 'options-panel', 'aria-label': t('common.options') });

  function emit() {
    saveOptions(options);
    onChange(options);
  }

  if (showSources) {
    const toggles = el('div', { className: 'options-panel__toggles' });
    for (const [key, labelKey, icon] of [
      ['includeDlc', 'common.includeDlc', '🧜'],
      ['includeEvent', 'common.includeEvent', '🎁'],
    ]) {
      const chip = el('button', {
        type: 'button',
        className: 'chip' + (options[key] ? ' chip--active' : ''),
        'aria-pressed': String(options[key]),
        onClick: () => {
          options[key] = !options[key];
          chip.classList.toggle('chip--active', options[key]);
          chip.setAttribute('aria-pressed', String(options[key]));
          emit();
        },
      }, `${icon} ${t(labelKey)}`);
      toggles.appendChild(chip);
    }
    panel.appendChild(toggles);
  }

  // Satisfy slider (1..6)
  const sliderId = `satisfy-${Math.random().toString(36).slice(2, 7)}`;
  const value = el('output', { className: 'options-panel__value', for: sliderId }, `${options.satisfy}/6`);
  const slider = el('input', {
    type: 'range', id: sliderId, min: '1', max: '6', step: '1',
    value: String(options.satisfy),
    className: 'options-panel__slider',
    'aria-describedby': `${sliderId}-hint`,
  });
  slider.addEventListener('input', () => {
    value.textContent = `${slider.value}/6`;
  });
  slider.addEventListener('change', () => {
    options.satisfy = clampSatisfy(slider.value);
    emit();
  });

  panel.appendChild(el('div', { className: 'options-panel__slider-row' },
    el('label', { for: sliderId, className: 'options-panel__label' }, `❤️ ${t('common.satisfy')}`),
    el('div', { className: 'options-panel__slider-wrap' }, slider, value)
  ));
  panel.appendChild(el('p', { id: `${sliderId}-hint`, className: 'options-panel__hint' }, t('common.satisfyHint')));

  return panel;
}
