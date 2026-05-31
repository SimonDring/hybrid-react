import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';

export default function Checkin() {
  const navigate = useNavigate();
  const addLog = useTrainingStore(state => state.addLog);

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    date: today,
    bw: '',
    rhr: '',
    rpe: '',
    sleep: '',
    knee: '',
    notes: ''
  });

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const handleSave = () => {
    if (!form.date) {
      alert('Please enter a date');
      return;
    }
    addLog(form);
    navigate('/tracking');
  };

  return (
    <>
      <h1 className="h1">Weekly check-in</h1>
      <p className="sub">Log how you're feeling this week. Leave fields blank if you don't have a value.</p>

      <div className="form-card">
        <div className="form-row">
          <label>Week ending</label>
          <input type="date" value={form.date} onChange={handleChange('date')} />
        </div>
        <div className="form-row">
          <label>Bodyweight (kg)</label>
          <input type="number" step="0.1" value={form.bw} onChange={handleChange('bw')} placeholder="e.g. 80.2" />
        </div>
        <div className="form-row">
          <label>Resting HR (bpm)</label>
          <input type="number" value={form.rhr} onChange={handleChange('rhr')} placeholder="e.g. 56" />
        </div>
        <div className="form-row">
          <label>Average RPE this week (1–10)</label>
          <input type="number" step="0.5" min="1" max="10" value={form.rpe} onChange={handleChange('rpe')} placeholder="e.g. 7" />
        </div>
        <div className="form-row">
          <label>Sleep score (1–10)</label>
          <input type="number" step="0.5" min="1" max="10" value={form.sleep} onChange={handleChange('sleep')} placeholder="e.g. 7.5" />
        </div>
        <div className="form-row">
          <label>Knee rating (0–10, lower is better)</label>
          <input type="number" step="0.5" min="0" max="10" value={form.knee} onChange={handleChange('knee')} placeholder="e.g. 1" />
        </div>
        <div className="form-row">
          <label>Notes</label>
          <textarea rows={3} value={form.notes} onChange={handleChange('notes')} placeholder="Anything noteworthy this week?" />
        </div>

        <button className="btn-primary" style={{ width: '100%' }} onClick={handleSave}>
          Save week
        </button>
      </div>
    </>
  );
}
