// src/data/metricGlossary.js
// Plain-English glossary behind every ⓘ InfoTip on metric surfaces. One entry
// per jargon term. Rules: 1–3 sentences, explain what the number MEANS and what
// the app does with it — never a lecture, never medical claims.

export const GLOSSARY = {
  readiness: {
    label: 'Readiness',
    body: 'A 0–100 score of how ready your body is to train today, blended from your recovery markers and how you said you feel. High = go as planned; low = the plan automatically eases today’s session.',
  },
  trainingLoad: {
    label: 'Training load ratio (ACWR)',
    body: 'Your last 7 days of training compared with the 28-day baseline your body is used to. Around 1.0 means you’re training in line with your baseline; above ~1.5 means you’ve ramped up faster than you’ve adapted, so the plan eases off.',
  },
  rpe: {
    label: 'RPE',
    body: 'Rating of Perceived Exertion — how hard the set felt out of 10. RPE 7 means about three good reps left in the tank; RPE 9 means you could only have squeezed out one more.',
  },
  weeklyVolume: {
    label: 'Weekly set volume',
    body: 'Hard sets per muscle this week vs the week’s target. Targets ramp from MEV (the minimum that drives growth) toward MAV (the most productive range), and are capped at MRV (the most you can recover from).',
  },
  recovery: {
    label: 'Recovery',
    body: 'How well your body is bouncing back between sessions, read from trends in your sleep and heart markers. It feeds your readiness score each morning.',
  },
  adherence: {
    label: 'Consistency',
    body: 'The share of planned sessions you’ve completed. Consistency beats heroics — most sessions done at moderate effort outperforms occasional all-out weeks.',
  },
  deload: {
    label: 'Deload',
    body: 'A planned easier week: volume is cut so your body can absorb the training you’ve banked. Fitness is built in recovery — deloads are where the gains land.',
  },
  taper: {
    label: 'Taper',
    body: 'The run-in to an event: volume drops but intensity stays, so you shed fatigue without losing sharpness and arrive fresh.',
  },
};
