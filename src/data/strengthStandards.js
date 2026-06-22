/**
 * strengthStandards — approximate strength standards as 1RM ÷ bodyweight, per sex.
 * Each value is the LOWER BOUND of that band. Ballpark of common public references
 * (ExRx / StrengthLevel); used to place a lift on a beginner→elite scale and suggest
 * the next milestone. These are estimates to motivate, not verdicts.
 *
 * ohp  = barbell overhead-press 1RM ÷ BW.
 * pull = vertical-pull e1RM ÷ BW — one approximate scale for either a pull-up
 *        "total-system" 1RM (bodyweight×(1+reps/30)) or a lat-pulldown 1RM. Added for
 *        the five-lift onboarding; not yet wired into the Progress milestones.
 */
export const BANDS = ['beginner', 'novice', 'intermediate', 'advanced', 'elite'];

const STANDARDS = {
  male: {
    squat:    { beginner: 0.75, novice: 1.0,  intermediate: 1.5,  advanced: 2.0,  elite: 2.5 },
    bench:    { beginner: 0.5,  novice: 0.75, intermediate: 1.0,  advanced: 1.5,  elite: 2.0 },
    deadlift: { beginner: 1.0,  novice: 1.5,  intermediate: 2.0,  advanced: 2.5,  elite: 3.0 },
    ohp:      { beginner: 0.35, novice: 0.45, intermediate: 0.6,  advanced: 0.8,  elite: 1.0 },
    pull:     { beginner: 1.0,  novice: 1.17, intermediate: 1.33, advanced: 1.6,  elite: 2.0 }
  },
  female: {
    squat:    { beginner: 0.5,  novice: 0.75, intermediate: 1.0,  advanced: 1.5,  elite: 2.0 },
    bench:    { beginner: 0.3,  novice: 0.5,  intermediate: 0.75, advanced: 1.0,  elite: 1.5 },
    deadlift: { beginner: 0.6,  novice: 1.0,  intermediate: 1.25, advanced: 1.75, elite: 2.5 },
    ohp:      { beginner: 0.2,  novice: 0.3,  intermediate: 0.4,  advanced: 0.55, elite: 0.75 },
    pull:     { beginner: 0.8,  novice: 0.95, intermediate: 1.1,  advanced: 1.35, elite: 1.7 }
  }
};

export default STANDARDS;
