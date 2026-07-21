/**
 * SessionOverview — a read-only pull-down of the whole session while running it.
 * Groups the runner's step list back into exercises (a strength exercise's N set-steps
 * collapse to one row with per-set dots). Tap the scrim or the chevron to close.
 */
export default function SessionOverview({ steps, cursor, isStepDone, onClose }) {
  // Collapse steps → rows. Consecutive set-steps of the same exercise share a row.
  const rows = [];
  steps.forEach((st, i) => {
    if (st.kind === 'primerRound') {
      if (st.round === 1) rows.push({ kind: 'primer', label: 'Primer circuit', detail: `${st.totalRounds} round${st.totalRounds > 1 ? 's' : ''}`, indexes: [i] });
      else rows[rows.length - 1].indexes.push(i);
      return;
    }
    const last = rows[rows.length - 1];
    if (st.kind === 'set' && last && last.kind === 'sets' && last.label === st.exerciseName) {
      last.indexes.push(i);
      return;
    }
    rows.push(st.kind === 'set'
      ? { kind: 'sets', label: st.exerciseName, detail: `${st.totalSets} × ${st.repsLabel}${st.weightLabel ? ` @ ${st.weightLabel}` : ''}`, indexes: [i] }
      : { kind: 'prep', label: st.exerciseName, detail: st.prescription, indexes: [i] });
  });

  return (
    <div className="so-scrim" onClick={onClose}>
      <div className="so-panel" onClick={e => e.stopPropagation()}>
        <div className="so-head">Session overview</div>
        {rows.map((row, r) => {
          const done = row.indexes.every(isStepDone);
          const current = row.indexes.includes(cursor);
          return (
            <div key={r} className={`so-row ${done ? 'done' : ''} ${current ? 'is-selected' : ''}`}>
              <span className="so-mark">{done ? '✓' : current ? '●' : ''}</span>
              <span className="so-name">{row.label}</span>
              <span className="so-detail">{row.detail}</span>
            </div>
          );
        })}
        <button className="so-close" onClick={onClose} aria-label="Close overview">▲</button>
      </div>
    </div>
  );
}
