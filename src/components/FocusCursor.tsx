import { formatAge, formatYear } from '@/utils/time';

interface Props {
  offset: number;
  forwardDate: Date;
  mirrorDate: Date;
}

/**
 * The reading head. It is the one thing on screen that never moves — scrolling
 * slides the rails past it, exactly as asked. Both rails are read here, so the
 * two years shown are always the same distance either side of birth.
 */
export default function FocusCursor({ offset, forwardDate, mirrorDate }: Props) {
  return (
    <div className="cursor" aria-hidden="true">
      <div className="cursor__line" />

      <div className="cursor__readout cursor__readout--forward">
        <span className="cursor__year">{formatYear(forwardDate)}</span>
      </div>

      <div className="cursor__hub">
        <span className="cursor__age">
          {offset < 0.02 ? 'birth' : formatAge(offset)}
        </span>
        <span className="cursor__caption">
          {offset < 0.02 ? 'the origin of both axes' : 'either side of you'}
        </span>
      </div>

      <div className="cursor__readout cursor__readout--mirror">
        <span className="cursor__year">{formatYear(mirrorDate)}</span>
      </div>
    </div>
  );
}
