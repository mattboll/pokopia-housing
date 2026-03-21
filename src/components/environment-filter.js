import { el } from '../utils/dom.js';
import { t } from '../core/i18n.js';

const ENVIRONMENTS = ['Lumineux', 'Sombre', 'Chaud', 'Frais', 'Humide', 'Sec'];

/**
 * Creates an environment filter with chip buttons.
 *
 * @param {(selectedEnvs: string[]) => void} onFilter - Callback with currently selected environments
 * @returns {HTMLElement}
 */
export function createEnvironmentFilter(onFilter) {
  const selectedEnvs = new Set();

  const group = el('div', {
    className: 'env-filter',
    role: 'group',
    'aria-label': t('common.filterByEnv'),
    'data-i18n-aria': 'common.filterByEnv',
  });

  // "All" chip
  const allChip = el('button', {
    type: 'button',
    className: 'chip chip--active',
    'data-env': 'all',
  }, t('common.allEnvs'));

  allChip.addEventListener('click', () => {
    selectedEnvs.clear();
    updateChips();
    onFilter([]);
  });

  group.appendChild(allChip);

  // Environment chips
  for (const env of ENVIRONMENTS) {
    const translatedEnv = t(`environments.${env}`) !== `environments.${env}`
      ? t(`environments.${env}`)
      : env;

    const chip = el('button', {
      type: 'button',
      className: 'chip',
      'data-env': env,
    }, translatedEnv);

    chip.addEventListener('click', () => {
      if (selectedEnvs.has(env)) {
        selectedEnvs.delete(env);
      } else {
        selectedEnvs.add(env);
      }
      updateChips();
      onFilter([...selectedEnvs]);
    });

    group.appendChild(chip);
  }

  function updateChips() {
    const chips = group.querySelectorAll('.chip');
    for (const chip of chips) {
      const envAttr = chip.getAttribute('data-env');
      if (envAttr === 'all') {
        chip.classList.toggle('chip--active', selectedEnvs.size === 0);
      } else {
        chip.classList.toggle('chip--active', selectedEnvs.has(envAttr));
      }
    }
  }

  return group;
}
