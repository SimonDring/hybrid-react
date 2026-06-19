// src/components/ui/LoadBand.jsx
// Training-load verdict: a 4-segment band (easy→too-much) with the current band lit,
// plus the plain-language note. Copy/color come from loadVerdict.
import { loadVerdict } from '../../lib/verdicts.js';

const SEGMENTS = ['under', 'sweet', 'high', 'over'];

export default function LoadBand({ load, adaptation }) {
  const v = loadVerdict(load, adaptation);
  const band = load && load.band;
  return (
    <div className="loadband">
      <div className="lb-head">
        <span className="lb-label">Training load</span>
        <span className="lb-verdict" style={{ color: v.color }}>{v.label}</span>
      </div>
      <div className="lb-bar" role="img" aria-label={`Training load: ${v.label}`}>
        {SEGMENTS.map(seg => (
          <span key={seg} className={`lb-seg${seg === band ? ' on' : ''}`}
            style={seg === band ? { background: v.color } : undefined} />
        ))}
      </div>
      <div className="lb-note">{v.note}</div>
    </div>
  );
}
