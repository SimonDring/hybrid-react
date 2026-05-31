import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const navigate = useNavigate();

  return (
    <>
      <h1 className="h1">Profile</h1>
      <p className="sub">Your baseline, goals, and operating principles.</p>

      <h2 className="h3">Athlete</h2>
      <ul className="kv-list">
        <li><span className="k">Age</span><span className="v">28</span></li>
        <li><span className="k">Weight</span><span className="v">80 kg ±2</span></li>
        <li><span className="k">Knee</span><span className="v">L patellar tendon · mild</span></li>
      </ul>

      <h2 className="h3">Goals (ranked)</h2>
      <ul className="kv-list">
        <li><span className="k">1 · Half marathon</span><span className="v">1:40 (stretch 1:35)</span></li>
        <li><span className="k">2 · Swim continuous</span><span className="v">2.5 km</span></li>
        <li><span className="k">3 · Ski-ready</span><span className="v">Nov 2026</span></li>
        <li><span className="k">4 · Longevity / cardio</span><span className="v">ongoing</span></li>
      </ul>

      <h2 className="h3">Reference</h2>
      <div className="sec-links">
        <button className="sec-link" onClick={() => navigate('/profile/overview')}>12-month overview →</button>
        <button className="sec-link" onClick={() => navigate('/profile/decisions')}>Decision framework →</button>
        <button className="sec-link" onClick={() => navigate('/profile/principles')}>Operating principles →</button>
        <button className="sec-link" onClick={() => navigate('/profile/reassess')}>Quarterly reassessment →</button>
      </div>
    </>
  );
}
