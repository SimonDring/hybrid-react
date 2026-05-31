import { useTrainingStore } from '../stores/trainingStore.js';

export default function Log() {
  const logs = useTrainingStore(state => state.logs);
  const deleteLog = useTrainingStore(state => state.deleteLog);

  // Display newest first
  const displayLogs = [...logs].reverse();

  const handleDelete = (idxFromEnd) => {
    if (!confirm('Delete this check-in entry?')) return;
    // logs are stored ascending; if we reverse for display, the "real" index is N-1-idx
    const realIdx = logs.length - 1 - idxFromEnd;
    deleteLog(realIdx);
  };

  if (logs.length === 0) {
    return (
      <>
        <h1 className="h1">Log history</h1>
        <p className="sub">No check-ins logged yet.</p>
      </>
    );
  }

  return (
    <>
      <h1 className="h1">Log history</h1>
      <p className="sub">{logs.length} check-in{logs.length !== 1 ? 's' : ''}, newest first.</p>

      <div className="ses-list">
        {displayLogs.map((log, i) => (
          <div key={log._id || i} className="ses-card" style={{ gridTemplateColumns: '1fr auto', display: 'grid' }}>
            <div>
              <div className="ses-day">{log.date}</div>
              <div className="ses-focus" style={{ fontSize: 13, fontWeight: 500, marginTop: 6 }}>
                {[
                  log.bw && `${log.bw} kg`,
                  log.rhr && `${log.rhr} bpm`,
                  log.rpe && `RPE ${log.rpe}`,
                  log.sleep && `Sleep ${log.sleep}`,
                  log.knee && `Knee ${log.knee}`
                ].filter(Boolean).join(' · ') || '—'}
              </div>
              {log.notes && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4, fontStyle: 'italic' }}>"{log.notes}"</div>}
            </div>
            <button
              onClick={() => handleDelete(i)}
              style={{ background: 'transparent', border: 'none', color: 'var(--rust)', fontSize: 12, cursor: 'pointer', padding: 8 }}
              aria-label="Delete entry"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
