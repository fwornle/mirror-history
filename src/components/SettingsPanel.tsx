import { useMemo, useRef, useState } from 'react';
import { useTimeline, validateBirthDate } from '@/state/timeline-context';
import { parseMetaExport, type ImportResult } from '@/data/import/meta-export';
import type { PersonalEvent } from '@/data/types';
import { formatEventDate } from '@/utils/time';

interface Props {
  onClose: () => void;
  /** True on first run, when the user has not yet set their own date. */
  firstRun: boolean;
}

interface Report {
  ok: boolean;
  lines: string[];
  offeredBirthDate?: string;
  offeredName?: string;
}

export default function SettingsPanel({ onClose, firstRun }: Props) {
  const {
    profile, timeline, setBirthDate, setOwnerName,
    addPersonalEvents, removePersonalEvents,
  } = useTimeline();

  const [draftDate, setDraftDate] = useState(profile.birthDate);
  const [draftName, setDraftName] = useState(profile.ownerName);
  const [report, setReport] = useState<Report | null>(null);
  const [dropping, setDropping] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const dateError = draftDate === profile.birthDate ? null : validateBirthDate(draftDate);
  const dirty = draftDate !== profile.birthDate || draftName !== profile.ownerName;

  const counts = useMemo(() => {
    const tally = { manual: 0, facebook: 0, instagram: 0 };
    for (const event of profile.personalEvents) tally[event.source ?? 'manual']++;
    return tally;
  }, [profile.personalEvents]);

  const applyProfile = () => {
    // Changing only the name must not mark the profile "configured" — that flag
    // means the user has chosen a real birth date, and the placeholder warning
    // depends on it staying honest.
    if (draftDate !== profile.birthDate && !validateBirthDate(draftDate)) {
      setBirthDate(draftDate, draftName);
    } else if (draftName !== profile.ownerName) {
      setOwnerName(draftName);
    }
  };

  async function ingest(files: FileList | File[]) {
    const lines: string[] = [];
    const collected: PersonalEvent[] = [];
    let offeredBirthDate: string | undefined;
    let offeredName: string | undefined;
    let ok = true;

    for (const file of Array.from(files)) {
      try {
        const result: ImportResult = parseMetaExport(file.name, await file.text());
        collected.push(...result.events);
        offeredBirthDate ??= result.birthDate;
        offeredName ??= result.ownerName;
        lines.push(`${file.name} — ${result.source}: ${result.notes.join(' ')}`);
      } catch (err) {
        ok = false;
        lines.push(`${file.name} — ${(err as Error).message}`);
      }
    }

    if (collected.length) addPersonalEvents(collected);
    setReport({ ok, lines, offeredBirthDate, offeredName });
  }

  return (
    <div className="sheet" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <button type="button" className="sheet__scrim" onClick={onClose} aria-label="Close settings" tabIndex={-1} />

      <aside className="sheet__panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="sheet__head">
          <h2 id="settings-title">{firstRun ? 'Set your inflection point' : 'Your timeline'}</h2>
          <button type="button" className="sheet__close" onClick={onClose}>Close ✕</button>
        </header>

        {firstRun && (
          <p className="sheet__intro">
            Both axes hinge on your date of birth: the upper rail runs forward from it,
            the lower rail runs the same number of years backward. Until you set it,
            the app is showing a placeholder date.
          </p>
        )}

        <section className="sheet__section">
          <h3>Date of birth</h3>
          <div className="field">
            <label htmlFor="birth-date">The inflection point</label>
            <input
              id="birth-date"
              type="date"
              value={draftDate}
              max={new Date().toISOString().slice(0, 10)}
              min="1900-01-01"
              onChange={(e) => setDraftDate(e.target.value)}
            />
            {dateError && <p className="field__error">{dateError}</p>}
          </div>

          <div className="field">
            <label htmlFor="owner-name">Your name (optional)</label>
            <input
              id="owner-name"
              type="text"
              value={draftName}
              placeholder="shown in the header"
              onChange={(e) => setDraftName(e.target.value)}
            />
          </div>

          <div className="sheet__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={applyProfile}
              disabled={!dirty || Boolean(dateError)}
            >
              Apply
            </button>
            <span className="sheet__hint">
              Currently hinged on {formatEventDate(timeline.birth)} · {Math.floor(timeline.yearsLived)} years
            </span>
          </div>
        </section>

        <section className="sheet__section">
          <h3>Personal events</h3>
          <p className="sheet__count">
            {profile.personalEvents.length} on the timeline
            {' · '}{counts.manual} entered
            {' · '}{counts.facebook} Facebook
            {' · '}{counts.instagram} Instagram
          </p>

          <div
            className={`drop${dropping ? ' drop--active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDropping(true); }}
            onDragLeave={() => setDropping(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDropping(false);
              if (e.dataTransfer.files.length) void ingest(e.dataTransfer.files);
            }}
          >
            <p className="drop__lead">Drop Facebook or Instagram export files here</p>
            <p className="drop__sub">
              JSON files from <strong>Download Your Information</strong> — posts, <code>profile_information.json</code>,
              or <code>personal_information.json</code>.
            </p>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              Choose files…
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              multiple
              hidden
              onChange={(e) => { if (e.target.files?.length) void ingest(e.target.files); e.target.value = ''; }}
            />
          </div>

          {report && (
            <div className={`report${report.ok ? '' : ' report--warn'}`}>
              {report.lines.map((line) => <p key={line}>{line}</p>)}

              {report.offeredBirthDate && report.offeredBirthDate !== profile.birthDate && (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => {
                    setBirthDate(report.offeredBirthDate!, report.offeredName === '' ? undefined : report.offeredName);
                    setDraftDate(report.offeredBirthDate!);
                    if (report.offeredName) setDraftName(report.offeredName);
                  }}
                >
                  Use {report.offeredBirthDate} as your inflection point
                </button>
              )}
            </div>
          )}

          {(counts.facebook > 0 || counts.instagram > 0) && (
            <div className="sheet__actions">
              <button
                type="button"
                className="btn btn--quiet"
                onClick={() => { removePersonalEvents((e) => e.source === 'facebook' || e.source === 'instagram'); setReport(null); }}
              >
                Remove imported events
              </button>
              <span className="sheet__hint">Events you typed are kept.</span>
            </div>
          )}
        </section>

        <section className="sheet__section sheet__section--note">
          <h3>Why a file and not a “Log in with Facebook” button</h3>
          <p>
            It was the intent, and it is not currently buildable as a browser app.
            Three things block it, each on its own sufficient:
          </p>
          <ul>
            <li>
              Instagram’s API only serves <strong>professional</strong> (business or creator)
              accounts. A personal account cannot be read through it at any permission level.
            </li>
            <li>
              Reading someone’s Facebook posts needs permissions that pass Meta’s
              <strong> App Review</strong> against an approved business use case.
            </li>
            <li>
              The OAuth code-for-token exchange requires the app <strong>secret</strong>,
              which cannot be shipped in a browser — it needs a server.
            </li>
          </ul>
          <p>
            The export route has none of those limits, and is strictly better on two counts:
            it carries your birthday and your work, study and move history — which the post
            APIs never expose — and your data is read in this tab and never uploaded anywhere.
          </p>
          <p className="sheet__hint">
            Facebook: Settings &amp; privacy → Your information → Download your information → format <strong>JSON</strong>.<br />
            Instagram: Settings → Accounts Centre → Your information and permissions → Download your information.
          </p>
        </section>
      </aside>
    </div>
  );
}
