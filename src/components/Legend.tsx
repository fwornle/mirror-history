import { ALL_CATEGORY_IDS, CATEGORIES, type CategoryId } from '@/config/categories';

interface Props {
  activeCategories: Set<CategoryId>;
  onToggleCategory: (id: CategoryId) => void;
}

/**
 * Category filters. Mounted twice — inline in the bottom bar on a wide screen,
 * and inside the slide-in drawer on a narrow one — because on a phone this row
 * alone would otherwise eat a third of the timeline. Only one mount is ever
 * displayed; the other is `display: none`, so there is never a duplicate tab
 * stop.
 */
export default function Legend({ activeCategories, onToggleCategory }: Props) {
  return (
    <div className="legend" role="group" aria-label="Filter by category">
      {ALL_CATEGORY_IDS.map((id) => {
        const category = CATEGORIES[id];
        const on = activeCategories.has(id);
        return (
          <button
            key={id}
            type="button"
            className={`legend__item${on ? '' : ' legend__item--off'}`}
            style={{ ['--cat-hue' as string]: category.hue }}
            onClick={() => onToggleCategory(id)}
            aria-pressed={on}
            title={category.description}
          >
            <span className="legend__swatch" aria-hidden="true" />
            <span className="legend__glyph" aria-hidden="true">{category.glyph}</span>
            <span className="legend__label">{category.label}</span>
          </button>
        );
      })}
    </div>
  );
}
