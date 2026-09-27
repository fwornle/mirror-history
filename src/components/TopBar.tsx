import SearchBox from './SearchBox';
import { useTimeline } from '@/state/timeline-store';
import type { PlacedEvent } from '@/data/types';
import { formatAge, formatEventDate, formatYear } from '@/utils/time';

interface Props {
  offset: number;
  forwardDate: Date;
  mirrorDate: Date;
  onSearchPick: (event: PlacedEvent) => void;
  onOpenSettings: () => void;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
}

export default function TopBar({
  offset, forwardDate, mirrorDate, onSearchPick, onOpenSettings,
  drawerOpen, onToggleDrawer,
}: Props) {
  const { profile, timeline } = useTimeline();
  const possessive = profile.ownerName ? `${profile.ownerName}’s` : 'Your';

  return (
    <header className="topbar">
      {/* Narrow screens only — the controls it reveals are in the bottom bar
          when there is room for them. */}
      <button
        type="button"
        className="topbar__menu"
        onClick={onToggleDrawer}
        aria-expanded={drawerOpen}
        aria-controls="view-drawer"
        aria-label="Filters and view controls"
      >
        <span aria-hidden="true">☰</span>
      </button>

      <div className="topbar__brand">
        <h1>Mirror History</h1>
        <p>
          {possessive} life, and the same span of years running backwards from
          {' '}{formatEventDate(timeline.birth)}.
          {!profile.configured && (
            <button type="button" className="topbar__warn" onClick={onOpenSettings}>
              placeholder date — set yours
            </button>
          )}
        </p>
      </div>

      <SearchBox onPick={onSearchPick} />

      <div className="topbar__readouts">
        <div className="readout readout--forward">
          <span className="readout__label">Forward axis</span>
          <span className="readout__value">{formatYear(forwardDate)}</span>
        </div>

        <div className="readout readout--pivot">
          <span className="readout__label">Distance from birth</span>
          <span className="readout__value">{offset < 0.02 ? '0' : formatAge(offset)}</span>
        </div>

        <div className="readout readout--mirror">
          <span className="readout__label">Mirror axis</span>
          <span className="readout__value">{formatYear(mirrorDate)}</span>
        </div>
      </div>

      <button
        type="button"
        className="topbar__settings"
        onClick={onOpenSettings}
        aria-label="Settings: birth date and personal events"
        title="Birth date and personal events"
      >
        ⚙
      </button>
    </header>
  );
}
