/**
 * SessionOverview — a read-only pull-down of the whole session while running it.
 * Groups the runner's step list back into exercises (a strength exercise's N set-steps
 * collapse to one row with per-set dots). Tap the scrim or the chevron to close.
 * Superset interleaving is handled: set-steps are grouped by exercise name globally,
 * so all sets of one exercise share a single row regardless of order.
 */
export default function SessionOverview({ steps, cursor, isStepDone, onClose }) {
  // Collapse steps → rows. Group set-steps by exercise name globally so interleaved
  // sets (e.g., A1·s1, A2·s1, A1·s2) all join their exercise's single row.
  const rows = [];
  const rowByExercise = new Map();
  steps.forEach((st, i) => {
    if (st.kind === 'primerRound') {
      if (st.round === 1) rows.push({ kind: 'primer', label: 'Primer circuit', detail: `${st.totalRounds} round${st.totalRounds > 1 ? 's' : ''}`, indexes: [i] });
      else rows[rows.length - 1].indexes.push(i);
      return;
    }
    if (st.kind === 'set') {
      const existing = rowByExercise.get(st.exerciseName);
      if (existing) { existing.indexes.push(i); return; }
      const row = { kind: 'sets', label: st.exerciseName, detail: `${st.totalSets} × ${st.repsLabel}${st.weightLabel ? ` @ ${st.weightLabel}` : ''}`, indexes: [i] };
      rows.push(row);
      rowByExercise.set(st.exerciseName, row);
      return;
    }
    rows.push({ kind: 'prep', label: st.exerciseName, detail: st.prescription, indexes: [i] });
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
