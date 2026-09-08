import { el, $ } from '../utils/dom.js';
import { t } from '../core/i18n.js';
import { icon } from '../components/icons.js';

/**
 * Renders the short "how it works" page.
 */
export function renderHelpPage() {
  const main = $('#app-main');
  if (!main) return;
  main.innerHTML = '';

  const section = (name, titleKey, textKey) => el('section', { className: 'help-section' },
    el('h2', { className: 'help-section__title' }, el('span', { className: 'env-glyph', style: 'background: #FFDAC6; color: #C44A1A' }, icon(name, { size: 18 })), t(titleKey)),
    el('p', { className: 'help-section__text' }, t(textKey))
  );

  main.appendChild(el('div', { className: 'help-page' },
    el('div', { className: 'page-header' },
      el('h1', null, t('help.title')),
      el('p', null, t('optimal.tagline'))
    ),
    section('house', 'help.rulesTitle', 'help.rules'),
    section('spark', 'help.goalTitle', 'help.goal'),
    section('star', 'help.starsTitle', 'help.starsText'),
    section('food', 'help.dishTitle', 'help.dishText'),
    section('search', 'help.dataTitle', 'help.dataText'),
    section('lock', 'help.privacyTitle', 'help.privacyText'),
    el('div', { className: 'help-page__cta' },
      el('a', { href: '#/planner', className: 'btn btn-primary btn--lg' }, t('optimal.makeVillage')),
      el('a', { href: '#/optimal', className: 'btn btn-secondary' }, t('nav.optimal'))
    )
  ));
}
