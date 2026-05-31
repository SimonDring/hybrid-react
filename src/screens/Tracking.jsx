import { useNavigate } from 'react-router-dom';

export default function Tracking() {
  const navigate = useNavigate();

  return (
    <>
      <h1 className="h1">Tracking</h1>
      <p className="sub">Log weekly check-ins and view your progress.</p>

      <div className="sec-links">
        <button className="sec-link" onClick={() => navigate('/tracking/checkin')}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Weekly check-in</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Bodyweight, RHR, sleep, knee</div>
          </div>
          <span style={{ opacity: 0.4 }}>→</span>
        </button>
        <button className="sec-link" onClick={() => navigate('/tracking/metrics')}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Key metrics</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Current snapshot</div>
          </div>
          <span style={{ opacity: 0.4 }}>→</span>
        </button>
        <button className="sec-link" onClick={() => navigate('/tracking/trends')}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Trends</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Multi-metric charts</div>
          </div>
          <span style={{ opacity: 0.4 }}>→</span>
        </button>
        <button className="sec-link" onClick={() => navigate('/tracking/log')}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Log history</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Past check-ins</div>
          </div>
          <span style={{ opacity: 0.4 }}>→</span>
        </button>
      </div>
    </>
  );
}
