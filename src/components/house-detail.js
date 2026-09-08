import { el } from '../utils/dom.js';
import { t } from '../core/i18n.js';
import { envColor } from '../core/environments.js';
import { spriteUrl } from '../core/sprites.js';
import { compatibilityRating } from '../algorithm/rating.js';
import { suggestItems, itemsForCategory, isFlavor } from '../algorithm/items.js';
import { icon, stars } from './icons.js';
import { showListPopover, showMenuPopover, showPokemonPopover } from './pokemon-popover.js';

/**
 * @typedef {Object} HouseDetailOptions
 * @property {boolean} [editable=false]
 * @property {import('../algorithm/items.js').Item[]} [items]
 * @property {Set<string> | null} [owned]
 * @property {(house: Object) => void} [onToggleLock]
 * @property {(memberName: string, house: Object, anchor: HTMLElement) => void} [onMove]
 * @property {(memberName: string, house: Object) => void} [onRemoveMember]
 * @property {(slug: string, owned: boolean) => void} [onToggleOwned]
 */

/**
 * Detail view of one house: residents, items to place, actions, and the
 * full preference breakdown (collapsed).
 *
 * @param {Object} house - { members, items (categories), covered, cost, satisfy, locked?, id? }
 * @param {number} index
 * @param {HouseDetailOptions} [opts]
 * @returns {HTMLElement}
 */
export function createHouseDetail(house, index, opts = {}) {
  const env = house.members[0]?.environment || '';
  const colors = envColor(env);
  const rating = compatibilityRating(house);
  const translatedEnv = t(`environments.${env}`) !== `environments.${env}` ? t(`environments.${env}`) : env;
  const tp = (pref) => (t(`preferences.${pref}`) !== `preferences.${pref}` ? t(`preferences.${pref}`) : pref);
  const tn = (name) => (t(`pokemon.${name}`) !== `pokemon.${name}` ? t(`pokemon.${name}`) : name);
  const itemLabel = (item) => {
    if (item.food) return tp(item.categories[0]);
    const key = `items.${item.slug}`;
    return t(key) !== key ? t(key) : item.name;
  };
  const catalog = opts.items || [];
  const owned = opts.owned ?? null;
  const editable = Boolean(opts.editable);
  const k = house.satisfy || 4;

  const root = el('div', { className: 'house-detail' });

  // ---- Header
  root.appendChild(el('div', { className: 'house-detail__header' },
    el('div', { className: 'house-detail__heading' },
      el('span', { className: 'env-glyph', style: `background: ${colors.light}; color: ${colors.dark}` }, icon('house', { size: 18 })),
      el('div', null,
        el('div', { className: 'house-detail__title' }, `${t('common.house')} ${index}`, house.locked ? el('span', { className: 'house-detail__locked' }, icon('lock', { size: 13 }), ` ${t('planner.locked')}`) : null),
        el('div', { className: 'house-detail__sub' }, `${translatedEnv} · ${house.members.length} ${t('detail.residents').toLowerCase()}`)
      )
    ),
    el('div', { className: 'house-detail__rating', title: t(rating.key) }, stars(rating.stars, 15))
  ));

  // ---- Residents
  const residents = el('div', { className: 'house-detail__residents' });
  house.members.forEach((member, i) => {
    const url = spriteUrl(member.name);
    const need = Math.min(k, member.preferences.length);
    const covered = house.covered ? house.covered[i] : need;
    const ok = covered >= need;
    const chip = el('span', { className: 'resident-chip' + (ok ? '' : ' resident-chip--low') });
    const nameBtn = el('button', {
      type: 'button', className: 'resident-chip__name',
      onClick: (e) => { e.stopPropagation(); showPokemonPopover(member, nameBtn, house.items || []); },
    },
      url ? el('img', { src: url, alt: '', width: '28', height: '28' }) : null,
      el('span', null, tn(member.name))
    );
    chip.appendChild(nameBtn);
    chip.appendChild(el('span', {
      className: 'resident-chip__badge' + (ok ? ' resident-chip__badge--ok' : ''),
      title: `${covered}/${member.preferences.length} ${t('common.coveredPrefs')}`,
    }, ok ? icon('check', { size: 10, color: '#fff' }) : `${covered}/${need}`));
    if (editable && opts.onMove) {
      chip.appendChild(el('button', {
        type: 'button', className: 'resident-chip__action', title: t('planner.move'), 'aria-label': `${t('planner.move')} ${tn(member.name)}`,
        onClick: (e) => { e.stopPropagation(); opts.onMove(member.name, house, chip); },
      }, icon('swap', { size: 13 })));
    }
    if (editable && opts.onRemoveMember) {
      chip.appendChild(el('button', {
        type: 'button', className: 'resident-chip__action resident-chip__action--remove', title: t('planner.deselect'), 'aria-label': `${t('planner.deselect')} ${tn(member.name)}`,
        onClick: (e) => { e.stopPropagation(); opts.onRemoveMember(member.name, house); },
      }, icon('x', { size: 12 })));
    }
    residents.appendChild(chip);
  });
  root.appendChild(el('div', { className: 'house-detail__section' },
    el('div', { className: 'house-detail__label' }, t('detail.residents')),
    residents
  ));

  // ---- Items to place
  const suggestion = catalog.length > 0
    ? suggestItems(house.members, k, catalog, { owned, preferCategories: house.items })
    : { items: [], complete: false };
  const realItems = suggestion.items.filter((s) => !s.item.food);
  const dishes = suggestion.items.filter((s) => s.item.food);
  const countLabel = dishes.length === 0
    ? t('detail.itemsOnly').replace('{i}', realItems.length)
    : t(dishes.length > 1 ? 'detail.itemsAndDishesPlural' : 'detail.itemsAndDishes').replace('{i}', realItems.length).replace('{f}', dishes.length);

  const box = el('div', { className: 'house-detail__shopping' },
    el('div', { className: 'house-detail__shopping-title' }, icon('cart', { size: 20, color: '#E3350D' }), ` ${t('detail.toPlace')} : ${countLabel}`,
      suggestion.complete ? null : el('span', { className: 'house-detail__warn' }, ` · ${t('common.suggestionIncomplete')}`))
  );

  for (const { item, covers, residents: who } of suggestion.items) {
    const row = el('button', { type: 'button', className: 'item-row' + (item.food ? ' item-row--food' : '') },
      el('span', { className: 'item-row__icon' }, icon(item.food ? 'food' : 'house', { size: 20, color: item.food ? '#C44A1A' : '#D4915E' })),
      el('span', { className: 'item-row__text' },
        el('span', { className: 'item-row__name' }, itemLabel(item)),
        el('span', { className: 'item-row__sub' }, item.food ? t('common.foodHint') : covers.map(tp).join(' · '))
      ),
      el('span', { className: 'item-row__who' }, `${who.length} ${t('detail.of')} ${house.members.length}`)
    );
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      if (item.food) {
        showListPopover(row, itemLabel(item), [{ label: t('common.foodHint'), icon: '🍳' }],
          `${t('common.pleases')} ${who.map((i) => tn(house.members[i].name)).join(', ')}`);
        return;
      }
      // Alternatives: items carrying the same categories, sorted by overlap with the house needs
      const entries = item.categories.map((c) => ({ label: tp(c), icon: covers.includes(c) ? '✅' : '○' }));
      const actions = [];
      if (opts.onToggleOwned) actions.push({ label: t('common.markUnowned'), onSelect: () => opts.onToggleOwned(item.slug, false) });
      const mainCat = covers[0];
      if (mainCat) {
        actions.push({ label: `${t('common.itemsForCategory')} ${tp(mainCat)}`, onSelect: () => {
          const alts = itemsForCategory(mainCat, catalog, house.items, owned).slice(0, 40).map((r) => ({
            label: itemLabel(r.item), sub: r.overlap.length ? `+ ${r.overlap.map(tp).join(', ')}` : '', muted: !r.owned, icon: r.owned ? '🛋️' : '🚫',
          }));
          showListPopover(row, `${t('common.itemsForCategory')} ${tp(mainCat)}`, alts, t('common.itemsSortedHint'));
        } });
      }
      showListPopover(row, itemLabel(item), entries, `${t('common.pleases')} ${who.map((i) => tn(house.members[i].name)).join(', ')}`, actions);
    });
    box.appendChild(row);
  }
  box.appendChild(el('span', { className: 'house-detail__hint' }, t('detail.tapItem')));
  root.appendChild(box);

  // ---- Actions (planner)
  if (editable) {
    const actions = el('div', { className: 'house-detail__actions' });
    if (opts.onToggleLock) {
      actions.appendChild(el('button', { type: 'button', className: 'btn btn-secondary', 'aria-pressed': String(Boolean(house.locked)), onClick: () => opts.onToggleLock(house) },
        icon(house.locked ? 'unlock' : 'lock', { size: 16 }), ` ${house.locked ? t('planner.unlock') : t('planner.lock')}`));
    }
    if (opts.onMove) {
      const moveBtn = el('button', { type: 'button', className: 'btn btn-secondary', onClick: (e) => {
        e.stopPropagation();
        showMenuPopover(moveBtn, t('detail.moveWho'), house.members.map((m) => ({ label: tn(m.name), onSelect: () => opts.onMove(m.name, house, moveBtn) })));
      } }, icon('move', { size: 16 }), ` ${t('detail.move')}`);
      actions.appendChild(moveBtn);
    }
    root.appendChild(actions);
  }

  // ---- Categories (collapsed)
  const cats = house.items || [];
  const details = el('details', { className: 'house-detail__prefs' },
    el('summary', null, `${t('detail.allPrefs')} (${(house.uniquePreferences || []).length})`, icon('chevron', { size: 16 }))
  );
  const likedBy = (pref) => house.members.filter((m) => m.preferences.includes(pref)).length;
  const counts = new Map();
  for (const m of house.members) for (const p of m.preferences) counts.set(p, (counts.get(p) || 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || tp(a[0]).localeCompare(tp(b[0])));
  const pills = el('div', { className: 'house-detail__pills' });
  const catSet = new Set(cats);
  for (const [pref, n] of sorted) {
    const chosen = catSet.has(pref);
    const pill = el('button', {
      type: 'button',
      className: 'pref-pill' + (chosen ? ' pref-pill--chosen' : '') + (isFlavor(pref) ? ' pref-pill--flavor' : ''),
      title: `${n}/${house.members.length}`,
      onClick: (e) => {
        e.stopPropagation();
        const fans = house.members.filter((m) => m.preferences.includes(pref)).map((m) => tn(m.name));
        if (isFlavor(pref)) {
          showListPopover(pill, tp(pref), [{ label: t('common.foodHint'), icon: '🍳' }], `${t('common.pleases')} ${fans.join(', ')}`);
          return;
        }
        const alts = itemsForCategory(pref, catalog, cats, owned).slice(0, 40).map((r) => ({
          label: itemLabel(r.item), sub: r.overlap.length ? `+ ${r.overlap.map(tp).join(', ')}` : '', muted: !r.owned, icon: r.owned ? '🛋️' : '🚫',
        }));
        showListPopover(pill, `${t('common.itemsForCategory')} ${tp(pref)}`, alts.length ? alts : [{ label: t('common.noItemKnown'), icon: '❔' }],
          `${t('common.pleases')} ${fans.join(', ')}. ${t('common.itemsSortedHint')}`);
      },
    }, chosen ? icon('check', { size: 12 }) : null, ` ${tp(pref)}`, el('span', { className: 'pref-pill__count' }, ` ×${n}`));
    pills.appendChild(pill);
  }
  details.appendChild(pills);
  root.appendChild(details);

  return root;
}
