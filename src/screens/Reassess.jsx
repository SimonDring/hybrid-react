import { useTrainingStore } from '../stores/trainingStore.js';

const QUESTIONS = [
  { id: 'q1', label: 'What outcomes did you hit this quarter? Be specific.' },
  { id: 'q2', label: 'What outcomes did you miss? Why?' },
  { id: 'q3', label: 'What unexpected things happened (good or bad)?' },
  { id: 'q4', label: 'How is your knee feeling, honestly?' },
  { id: 'q5', label: 'Sleep / energy / motivation — average over the quarter?' },
  { id: 'q6', label: 'Are your goals still the right goals? What would you change?' },
  { id: 'q7', label: 'What should the next quarter look like — based on what you now know?' }
];

export default function Reassess() {
  const reassess = useTrainingStore(state => state.reassess);
  const setReassess = useTrainingStore(state => state.setReassess);

  return (
    <>
      <h1 className="h1">Quarterly reassessment</h1>
      <p className="sub">Every 12 weeks (or whenever life changes shape). Honest answers here drive the next phase.</p>

      {QUESTIONS.map((q, i) => (
        <div key={q.id} className="reassess-q">
          <div className="qnum">Q{i + 1}</div>
          <p>{q.label}</p>
          <textarea
            rows={3}
            value={reassess[q.id] || ''}
            onChange={(e) => setReassess(q.id, e.target.value)}
            placeholder="Your honest answer..."
            style={{ width: '100%' }}
          />
        </div>
      ))}

      <p style={{ fontSize: 12, opacity: 0.6, marginTop: 16, fontStyle: 'italic' }}>
        Your answers are saved automatically as you type.
      </p>
    </>
  );
}
