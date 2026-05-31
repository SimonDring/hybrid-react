/**
 * Plan — static training plan template (content, not user data).
 *
 * Structure:
 *   - 5 phases (Foundation → Re-entry → Half build → Pre-ski peak → Ski season)
 *   - 52 weeks total, numbered 1 through 52
 *   - Every 4th week is a deload (weeks 4, 8, 12, 16, 20, 24, 28, 32, 36...)
 *
 * Phase 1 weeks are pre-built explicitly. Phases 2-5 weeks are generated lazily
 * by `buildProvisionalWeeks(phaseId)` on first access — marked as provisional
 * and intended to be revised at quarterly reassessment.
 *
 * User-specific session state lives in Database.tables.sessions, linked back
 * to this template via `template_ref` (e.g. "p1_wk5_s2"). Don't put plan
 * content in the database — it's hand-curated and changes with releases.
 *
 * Deload detection: a session function receives the absolute week number.
 * It computes phase-relative week (winp) using its phase's weekStart, and
 * deload is `winp % 4 === 0`.
 */

// ---------- Helpers ----------
// Phase 1 starts at week 1, runs 8 weeks. Deloads at week 4 and week 8 (gate test).
// Convention: in Phase 1 the gate test is week 8, but it's a regular intensity
// week with tests added, not a deload. Deload is week 4 only.
const isP1Deload = (wk) => wk === 4;

// ---------- Phase 1 session generators ----------
const p1 = {
  mon: (wk) => ({ title: 'Monday · Lower (heavy)', duration: '60–70 min · RPE peak ' + (isP1Deload(wk) ? '6 deload' : '8'), items: [
    { num: 'A1', name: 'Back squat', note: isP1Deload(wk) ? 'Deload: 70% load' : '+2.5 kg/wk if last set RPE ≤7', sets: isP1Deload(wk) ? '3 × 5' : '4 × 5', rpe: isP1Deload(wk) ? 'RPE 6' : 'RPE 7→8' },
    { num: 'B1', name: 'Romanian deadlift', note: 'controlled, hinge', sets: isP1Deload(wk) ? '2 × 8' : '3 × 8', rpe: isP1Deload(wk) ? 'RPE 6' : 'RPE 7' },
    { num: 'C1', name: 'Reverse Nordic', note: 'permanent — knee health', sets: '3 × 6–8', rpe: 'Quality', tag: 'mobility' },
    { num: 'C2', name: 'Single-leg calf raise', note: '3s down, 1s up', sets: '3 × 12 ea.', rpe: 'RPE 7', tag: 'mobility' },
    { num: 'D1', name: 'Pallof press', note: 'anti-rotation', sets: '3 × 10 ea.', rpe: 'RPE 6', tag: 'mobility' },
    { num: 'D2', name: '90/90 hip flow', note: 'cooldown', sets: '2 min', rpe: 'Easy', tag: 'mobility' }
  ]}),
  tue: (wk) => ({ title: 'Tuesday · Upper (push/pull)', duration: '55–65 min · RPE peak ' + (isP1Deload(wk) ? '6 deload' : '8'), items: [
    { num: 'A1', name: 'Bench press', note: '2s eccentric · ' + (isP1Deload(wk) ? 'deload 70%' : '+1.25–2.5 kg/wk @ RPE ≤7'), sets: isP1Deload(wk) ? '3 × 5' : '4 × 5', rpe: isP1Deload(wk) ? 'RPE 6' : 'RPE 7→8' },
    { num: 'A2', name: 'Chest-supported row', note: 'squeeze 1s', sets: isP1Deload(wk) ? '3 × 8' : '4 × 8', rpe: isP1Deload(wk) ? 'RPE 6' : 'RPE 7' },
    { num: 'B1', name: 'DB shoulder press', note: 'standing', sets: '3 × 8', rpe: 'RPE 7' },
    { num: 'B2', name: 'Lat pulldown', note: 'or pull-ups w/ band', sets: '3 × 10', rpe: 'RPE 7' },
    { num: 'C1', name: 'Face pull', note: 'swim posture', sets: '3 × 15', rpe: 'RPE 6', tag: 'mobility' },
    { num: 'C2', name: 'T-spine extension on roller', note: '', sets: '2 × 60s', rpe: 'Easy', tag: 'mobility' }
  ]}),
  // Technique swim — focus on drills, modest distance (~800m in a 20m pool).
  // Set count: 10+6+6+8+6+4 × 20m = 40 lengths = 800m.
  tue_pm: (wk) => ({ title: 'Tuesday PM · Swim technique', duration: '40–45 min · 800 m total · 20m pool', items: [
    { num: 'W1', name: 'Warm-up easy free', note: 'long body line', sets: '10 × 20m', rpe: 'Easy', tag: 'swim' },
    { num: 'W2', name: 'Catch-up drill', note: 'forces high elbow', sets: '6 × 20m', rpe: 'Drill', tag: 'swim' },
    { num: 'W3', name: 'Single-arm free', note: '3 strokes each side', sets: '6 × 20m', rpe: 'Drill', tag: 'swim' },
    { num: 'W4', name: 'Pull-buoy swim', note: 'isolates upper body', sets: '8 × 20m', rpe: 'Easy', tag: 'swim' },
    { num: 'W5', name: 'Bilateral breathing', note: 'every 3 strokes', sets: '6 × 20m', rpe: 'Easy', tag: 'swim' },
    { num: 'W6', name: 'Cool-down', note: '', sets: '4 × 20m', rpe: 'Easy', tag: 'swim' }
  ]}),
  thu: (wk) => ({ title: 'Thursday · Lower (athletic)', duration: '55–65 min · RPE peak ' + (isP1Deload(wk) ? '6 deload' : '8'), items: [
    { num: 'A1', name: 'Trap-bar / hex deadlift', note: 'explosive intent', sets: isP1Deload(wk) ? '3 × 4' : '4 × 4', rpe: isP1Deload(wk) ? 'RPE 6' : 'RPE 7→8' },
    { num: 'B1', name: 'Bulgarian split squat', note: '3s down, knee tracks toe', sets: isP1Deload(wk) ? '2 × 8 ea.' : '3 × 8 ea.', rpe: isP1Deload(wk) ? 'RPE 6' : 'RPE 7' },
    { num: 'B2', name: 'Single-leg hip thrust', note: '', sets: '3 × 10 ea.', rpe: 'RPE 7' },
    { num: 'C1', name: 'Copenhagen plank', note: 'adductor anti-injury', sets: '3 × 20–30s ea.', rpe: 'RPE 7', tag: 'mobility' },
    { num: 'C2', name: 'Hamstring slider curl', note: '', sets: '3 × 8', rpe: 'RPE 7', tag: 'mobility' },
    { num: 'D1', name: 'Spanish squat hold', note: 'tendon ISO', sets: '3 × 30s', rpe: 'RPE 7', tag: 'mobility' }
  ]}),
  // Endurance swim — total distance scales with week.
  // Structure: warmup 200m + drills 120m + main set + bonus 120m + cooldown 80m
  // = baseline 520m + main set length
  thu_pm: (wk) => {
    // Map of {absolute wk → main set + total distance}. Phase 1 = wks 1-8.
    // Total = 520 + main set distance.
    const mainData = {
      1: { set: '5 × 60m', mainM: 300, total: 820 },
      2: { set: '5 × 60m', mainM: 300, total: 820 },
      3: { set: '4 × 80m', mainM: 320, total: 840 },
      4: { set: '3 × 40m DELOAD', mainM: 120, total: 640 },
      5: { set: '3 × 100m', mainM: 300, total: 820 },
      6: { set: '2 × 140m', mainM: 280, total: 800 },
      7: { set: '2 × 200m', mainM: 400, total: 920 },
      8: { set: '1 × 500m TT — phase gate', mainM: 500, total: 1020 }
    };
    const d = mainData[wk] || mainData[1];
    return { title: 'Thursday PM · Swim endurance', duration: '45–55 min · ' + d.total + ' m total', items: [
      { num: 'W1', name: 'Warm-up easy free', note: '', sets: '10 × 20m', rpe: 'Easy', tag: 'swim' },
      { num: 'W2', name: 'Drill: catch-up + single-arm', note: '', sets: '6 × 20m', rpe: 'Drill', tag: 'swim' },
      { num: 'W3', name: 'Main set', note: 'Wk ' + wk + ': ' + d.set, sets: 'see note', rpe: 'RPE 6', tag: 'swim' },
      { num: 'W4', name: 'Pull-buoy bonus', note: 'technique under fatigue', sets: '6 × 20m', rpe: 'Easy', tag: 'swim' },
      { num: 'W5', name: 'Cool-down', note: '', sets: '4 × 20m', rpe: 'Easy', tag: 'swim' }
    ]};
  },
  fri: (wk) => ({ title: 'Friday · Upper + conditioning', duration: '55–65 min · RPE peak ' + (isP1Deload(wk) ? '6 deload' : '8'), items: [
    { num: 'A1', name: 'Weighted pull-up', note: 'or assisted to RPE 8', sets: isP1Deload(wk) ? '3 × 5' : '4 × 5', rpe: isP1Deload(wk) ? 'RPE 6' : 'RPE 7→8' },
    { num: 'A2', name: 'Incline DB press', note: '', sets: isP1Deload(wk) ? '3 × 8' : '4 × 8', rpe: isP1Deload(wk) ? 'RPE 6' : 'RPE 7' },
    { num: 'B1', name: 'Single-arm DB row', note: '', sets: '3 × 10 ea.', rpe: 'RPE 7' },
    { num: 'B2', name: 'DB lateral raise', note: '', sets: '3 × 12', rpe: 'RPE 7' },
    { num: 'C1', name: 'Hanging knee raise', note: '', sets: '3 × 10', rpe: 'RPE 7', tag: 'mobility' },
    { num: 'FIN', name: 'Conditioning · pick one', note: '10 min low-impact, no running.\n· Assault bike: 30s hard/30s easy × 10\n· Ski erg: same\n· Rower: 250m × 6 on 2 min', sets: isP1Deload(wk) ? '5 min' : '10 min', rpe: isP1Deload(wk) ? 'Z2' : 'Z3–Z4' }
  ]})
};

// ---------- Phase definitions ----------
const phases = [
  { id: 1, title: 'Foundation Consolidation', tagline: 'Lock in movement quality + swim technique before chasing load.', range: 'Wks 1–8', weekStart: 1, weekEnd: 8, status: 'current', tags: ['Strength','Swim tech','Aerobic base'],
    summary: 'Technique-first. No running yet — by design. Builds strength and swim foundation before injury risk concentrates in Phase 2.',
    gates: [
      { label: 'Swim 1 km continuous', required: true },
      { label: 'No knee symptoms in daily life', required: true },
      { label: 'Squat 5RM ≥ 90 kg @ RPE ≤ 8', required: false },
      { label: 'Bench 5RM ≥ 60 kg @ RPE ≤ 8', required: false },
      { label: 'Sleep & recovery stable', required: true }
    ],
    weeks: [1,2,3,4,5,6,7,8].map(wk => ({
      num: wk,
      deload: isP1Deload(wk),
      theme: wk === 1 ? 'Establish new split. Light loads, dial in technique.'
          : wk === 2 ? 'Add 2.5 kg on mains if RPE allows. Swim drills harder.'
          : wk === 3 ? 'Push working loads. First swim distance test.'
          : wk === 4 ? 'DELOAD. Volume −1 set, load 70%. Mandatory.'
          : wk === 5 ? 'Resume. Test new loads. Swim distance climbs.'
          : wk === 6 ? 'Consolidation. Watch tendon response.'
          : wk === 7 ? 'Peak loading. Long swim sets.'
          : 'Phase gate test. 500m TT, 5RM tests.',
      sessions: ['mon','tue','tue_pm','thu','thu_pm','fri'].map(k => p1[k](wk))
    }))
  },
  { id: 2, title: 'Run Re-entry · Swim Build', tagline: 'Re-introduce running with hard guardrails.', range: 'Wks 9–16', weekStart: 9, weekEnd: 16, status: 'provisional', tags: ['Strength maint.','Swim volume','Run reentry'],
    summary: 'Highest injury risk phase. Strict 10%/week run progression. Strength drops to maintenance.',
    gates: [
      { label: 'Run 5 km continuous Z2', required: true },
      { label: 'Swim 1.5 km continuous', required: true },
      { label: 'Maintain P1 strength', required: false },
      { label: 'Knee asymptomatic', required: true }
    ]},
  { id: 3, title: 'Run Specificity · Half Build', tagline: 'Running becomes leading modality. Bridges the move.', range: 'Wks 17–26', weekStart: 17, weekEnd: 26, status: 'provisional', tags: ['Strength 2×','Swim maint.','Run focus'],
    summary: 'Z2 long run, tempo, one quality session weekly. Swim drops to 1 quality + 1 easy. Strength holds 2×/wk brief.',
    gates: [
      { label: 'Half TT: sub-1:45', required: true },
      { label: 'Run peak ~35 km/wk', required: false },
      { label: 'Swim 2.5 km milestone', required: true },
      { label: 'Strength preserved within 5%', required: false }
    ]},
  { id: 4, title: 'Pre-Ski + Half Peak', tagline: 'Ski-specific lower body + half marathon target.', range: 'Wks 27–36', weekStart: 27, weekEnd: 36, status: 'provisional', tags: ['Hybrid peak','Ski prep'],
    summary: 'Lateral, eccentric, ISO quad. Running tapers in final weeks. October Africa deload calendared.',
    gates: [
      { label: 'Half marathon · 1:40 (stretch 1:35)', required: true },
      { label: 'Single-leg squat: 5 controlled reps', required: false },
      { label: 'Ski lateral capacity demonstrated', required: true },
      { label: 'Healthy through taper', required: true }
    ]},
  { id: 5, title: 'Ski Season · Maintain · Reassess', tagline: 'Plan flips: upper-body bias, swim, Z2.', range: 'Wks 37–52', weekStart: 37, weekEnd: 52, status: 'provisional', tags: ['Off-season','Maintain'],
    summary: 'Ski season = active recovery for legs but heavy use. Final week sets year-2 anchors.',
    gates: [
      { label: 'Ski safely, no acute injury', required: true },
      { label: 'Swim ≥ 2 km/wk', required: true },
      { label: 'Strength within 10% of peak', required: false },
      { label: 'Year-2 anchors selected', required: true }
    ]}
];

function buildProvisionalWeeks(phaseId) {
  const phase = phases.find(p => p.id === phaseId);
  if (!phase || phase.weeks) return;
  const weeks = [];
  for (let wk = phase.weekStart; wk <= phase.weekEnd; wk++) {
    const winp = wk - phase.weekStart + 1;
    const isDeload = winp % 4 === 0;
    weeks.push({ num: wk, deload: isDeload, theme: themeFor(phaseId, winp, isDeload), sessions: sessionsFor(phaseId, wk, winp, isDeload), provisional: true });
  }
  phase.weeks = weeks;
}

function themeFor(pid, winp, deload) {
  if (deload) return 'DELOAD. Volume cut. Mandatory.';
  if (pid === 2) return ['Run reintro: 2× walk-runs. Strength to 3-day maintenance.','Build run frequency. +1 min per interval.','First continuous easy run. Swim main set extends.','','Run 2× weekly. Swim quality + easy.','Push easy run duration. Watch knees.','Build consistency. Continuous 5k attempt.',''][winp-1] || 'Build phase';
  if (pid === 3) return ['Add tempo. Long run extends.','Push long run. Strength heavy & brief.','Tempo intensity climbs.','','Intervals appear. Long run consolidates.','Half TT — submaximal benchmark.','Build to peak run volume.','Volume peak. Watch fatigue.','Pullback before Phase 4.',''][winp-1] || 'Build';
  if (pid === 4) return ['Add ski-specific lateral / ISO quad.','Build run quality. Add ski mobility.','Race-pace work appears.','','AFRICA — 10 days off — auto deload.','Return. Easy aerobic + ski prep.','Race-pace tune-up.','Sharpening. Lower volume, keep intensity.','Taper week.','HALF MARATHON · target 1:40'][winp-1] || 'Peak';
  if (pid === 5) {
    if (winp <= 4) return 'Ski season opens. Upper-body bias.';
    if (winp <= 8) return 'Maintain swim. Active recovery.';
    if (winp <= 12) return 'Watch accumulated ski fatigue.';
    return 'Final week: full quarterly reassessment.';
  }
  return '';
}

function sessionsFor(pid, wk, winp, deload) {
  if (pid === 2) {
    const runText = deload ? 'DELOAD: 2× 15-min easy walk-runs' :
      winp === 1 ? '2× walk-run (4 min walk / 1 min run × 4)' :
      winp === 2 ? '2× walk-run (3 min / 2 min × 5)' :
      winp === 3 ? '1× continuous 15-min easy run, 1× walk-run 25 min' :
      winp === 5 ? '2× 20-min continuous easy Z2' :
      winp === 6 ? '2× 25-min Z2' : '1× 30 min + 1× 35 min (target 5k continuous)';

    // Phase 2 Wednesday swim: warmup 200m + drills 120m + main set + cooldown 80m = 400 + main
    // Deload: 4×100=400 → total 800m
    // Wk 1 (winp=1): 4×200=800 → total 1200m
    // Wk 2-5 (winp=2,3): 3×300=900 → total 1300m
    // Wk 6+ (winp=6,7): 2×500 or 1×1000 = 1000 → total 1400m
    let swimMain, swimTotal;
    if (deload) { swimMain = '4 × 100m easy'; swimTotal = 800; }
    else if (winp === 1) { swimMain = '4 × 200m'; swimTotal = 1200; }
    else if (winp >= 6) { swimMain = '2 × 500m or 1 × 1000m'; swimTotal = 1400; }
    else { swimMain = '3 × 300m'; swimTotal = 1300; }

    return [
      { title: 'Monday · Lower (maintenance)', duration: '50–60 min', items: [
        { num: 'A1', name: 'Back squat', note: 'maintain, no PR chase', sets: '3 × 5', rpe: 'RPE 7' },
        { num: 'B1', name: 'Romanian deadlift', note: '', sets: '3 × 8', rpe: 'RPE 7' },
        { num: 'C1', name: 'Reverse Nordic', note: 'always-on', sets: '3 × 8', rpe: 'Quality', tag: 'mobility' },
        { num: 'C2', name: 'Spanish squat hold', note: 'tendon ISO', sets: '3 × 30s', rpe: 'RPE 7', tag: 'mobility' },
        { num: 'D1', name: 'Pallof + hip flow', note: '', sets: '3 × 10', rpe: 'Easy', tag: 'mobility' }
      ]},
      { title: 'Tuesday · Easy run', duration: '25–35 min', items: [
        { num: 'R1', name: 'Easy run · Z2', note: runText + ' · conversational cap', sets: 'see note', rpe: 'Z2', tag: 'run' },
        { num: 'R2', name: 'Post-run mobility', note: 'calf, hip flexor, quad', sets: '5 min', rpe: 'Easy', tag: 'mobility' }
      ]},
      { title: 'Wednesday · Swim endurance', duration: '50–60 min · ' + swimTotal + ' m total', items: [
        { num: 'W1', name: 'Warm-up + drills', note: '10 × 20m easy + 6 × 20m drill', sets: '16 × 20m', rpe: 'Easy', tag: 'swim' },
        { num: 'W2', name: 'Continuous build', note: 'Wk ' + wk + ': ' + swimMain, sets: 'see note', rpe: 'RPE 6', tag: 'swim' },
        { num: 'W3', name: 'Cool-down', note: '', sets: '4 × 20m', rpe: 'Easy', tag: 'swim' }
      ]},
      { title: 'Thursday · Upper (maintenance)', duration: '50–60 min', items: [
        { num: 'A1', name: 'Bench press', note: 'maintain', sets: '3 × 5', rpe: 'RPE 7' },
        { num: 'A2', name: 'Pull-up / lat pulldown', note: '', sets: '3 × 8', rpe: 'RPE 7' },
        { num: 'B1', name: 'DB shoulder press', note: '', sets: '3 × 8', rpe: 'RPE 7' },
        { num: 'B2', name: 'Chest-supported row', note: '', sets: '3 × 8', rpe: 'RPE 7' },
        { num: 'C1', name: 'Face pull + t-spine', note: '', sets: '3 × 15', rpe: 'Easy', tag: 'mobility' }
      ]},
      { title: 'Saturday · Easy run (flex)', duration: '20–30 min', items: [
        { num: 'R1', name: 'Easy run', note: 'optional if golf goes ahead', sets: '25 min', rpe: 'Z2', tag: 'run' }
      ]}
    ];
  }
  if (pid === 3) {
    const longRun = deload ? '40 min easy' : (10 + winp * 3) + ' km easy Z2';
    // Phase 3 Wednesday swim: warmup 300m + main set + (cooldown not stated)
    // Wk 1-4 (winp<5): 800+400=1200m main + 300 warmup = 1500m
    // Wk 5+ (winp>=5): 1500-2500m main + 300 warmup = 1800-2800m → use midpoint
    let swimMain, swimTotal;
    if (winp >= 5) { swimMain = '1 × 1500–2500m'; swimTotal = '1800–2800'; }
    else { swimMain = '1 × 800m + 1 × 400m'; swimTotal = '1500'; }

    return [
      { title: 'Monday · Lower (heavy & brief)', duration: '45–55 min', items: [
        { num: 'A1', name: 'Back squat', note: 'heavy & brief', sets: '3 × 3', rpe: 'RPE 7' },
        { num: 'B1', name: 'Romanian deadlift', note: '', sets: '3 × 6', rpe: 'RPE 7' },
        { num: 'C1', name: 'Reverse Nordic + Spanish squat', note: 'tendon protocol', sets: '3 each', rpe: 'Quality', tag: 'mobility' },
        { num: 'D1', name: 'Single-leg calf raise', note: 'run-specific', sets: '3 × 12 ea.', rpe: 'RPE 7' }
      ]},
      { title: 'Tuesday · Quality run', duration: '40–55 min', items: [
        { num: 'R1', name: 'Quality run', note: deload ? 'Deload: easy 25 min' : winp % 2 ? 'Tempo: 2 × 10 min @ HM pace, 3 min easy between' : 'Intervals: 6 × 3 min @ 5k pace / 2 min easy', sets: 'see note', rpe: 'Z3–Z4', tag: 'run' },
        { num: 'R2', name: 'Post-run mobility', note: '', sets: '5 min', rpe: 'Easy', tag: 'mobility' }
      ]},
      { title: 'Wednesday · Swim (maintenance)', duration: '40 min · ' + swimTotal + ' m total', items: [
        { num: 'W1', name: 'Warm-up + drills', note: '', sets: '15 × 20m', rpe: 'Easy', tag: 'swim' },
        { num: 'W2', name: 'Continuous swim', note: swimMain, sets: 'see note', rpe: 'RPE 6', tag: 'swim' }
      ]},
      { title: 'Thursday · Upper (heavy & brief)', duration: '45–55 min', items: [
        { num: 'A1', name: 'Bench press', note: '', sets: '3 × 3', rpe: 'RPE 7' },
        { num: 'A2', name: 'Pull-up', note: '', sets: '3 × 5', rpe: 'RPE 7' },
        { num: 'B1', name: 'DB row + shoulder press', note: 'superset', sets: '3 × 8 each', rpe: 'RPE 7' },
        { num: 'C1', name: 'Face pull + t-spine', note: '', sets: '3 × 15', rpe: 'Easy', tag: 'mobility' }
      ]},
      { title: 'Friday · Easy run', duration: '30–40 min', items: [
        { num: 'R1', name: 'Easy aerobic', note: 'Z2 only', sets: '30–40 min', rpe: 'Z2', tag: 'run' }
      ]},
      { title: 'Sunday · Long run', duration: '50–90 min', items: [
        { num: 'R1', name: 'Long run', note: 'Wk ' + wk + ': ' + longRun + ' · conversational', sets: 'see note', rpe: 'Z2', tag: 'run' },
        { num: 'R2', name: 'Cooldown walk + mobility', note: '', sets: '10 min', rpe: 'Easy', tag: 'mobility' }
      ]}
    ];
  }
  if (pid === 4) {
    if (winp === 5) return [{ title: 'Africa · auto-deload (10 days)', duration: 'no structured training', items: [
      { num: 'X1', name: 'Daily walks 30–60 min', note: 'active recovery', sets: 'daily', rpe: 'Easy', tag: 'mobility' },
      { num: 'X2', name: 'Optional bodyweight circuit', note: '2× during trip if available — push-ups, single-leg squats, planks · 20 min', sets: '2× wk', rpe: 'RPE 6' }
    ]}];
    if (winp === 10) return [
      { title: 'Monday · Pre-race light', duration: '30 min', items: [{ num: 'A1', name: 'Mobility + shakeout', note: '15-min easy jog + drills', sets: '15 min', rpe: 'Easy', tag: 'run' }]},
      { title: 'Wednesday · Race-pace primer', duration: '30 min', items: [{ num: 'R1', name: 'Easy 20 min + 4 × 1 min @ HM pace', note: '', sets: 'see note', rpe: 'Z3', tag: 'run' }]},
      { title: 'Friday · Shakeout', duration: '15 min', items: [{ num: 'R1', name: '15 min easy + 4 strides', note: '', sets: 'see note', rpe: 'Easy', tag: 'run' }]},
      { title: 'SUNDAY · HALF MARATHON', duration: '~1:40', items: [{ num: 'RACE', name: 'Half marathon · target 1:40 (stretch 1:35)', note: 'Pace: first 5k @ 4:50/km, settle 4:45, last 5k 4:40. Gels at 7k, 14k. Breakfast 3h pre.', sets: '21.1 km', rpe: 'RACE', tag: 'run' }]}
    ];
    return [
      { title: 'Monday · Ski-specific lower', duration: '50–60 min', items: [
        { num: 'A1', name: 'Back squat', note: '', sets: '3 × 5', rpe: 'RPE 7' },
        { num: 'B1', name: 'Lateral lunge', note: 'frontal plane', sets: '3 × 8 ea.', rpe: 'RPE 7' },
        { num: 'B2', name: 'Skater hops', note: 'lateral power', sets: '3 × 6 ea.', rpe: 'RPE 7' },
        { num: 'C1', name: 'Wall sit + Spanish squat', note: '60s wall + 3 × 30s', sets: 'see note', rpe: 'RPE 7', tag: 'mobility' },
        { num: 'D1', name: 'Reverse Nordic', note: '', sets: '3 × 8', rpe: 'Quality', tag: 'mobility' }
      ]},
      { title: 'Tuesday · Quality run', duration: '45 min', items: [
        { num: 'R1', name: 'Tempo or intervals', note: deload ? 'Easy 30 min' : winp % 2 ? 'Tempo: 3 × 8 min @ HM pace' : '6 × 2 min @ 5k pace', sets: 'see note', rpe: 'Z3–Z4', tag: 'run' }
      ]},
      // Phase 4 Wednesday swim: continuous 1500-2000m steady = ~1750m midpoint
      { title: 'Wednesday · Swim (maintain)', duration: '35 min · 1500–2000 m', items: [
        { num: 'W1', name: 'Continuous swim', note: '1500–2000m steady', sets: '1500–2000 m', rpe: 'RPE 6', tag: 'swim' }
      ]},
      { title: 'Thursday · Upper + ski', duration: '55 min', items: [
        { num: 'A1', name: 'Bench press', note: '', sets: '3 × 5', rpe: 'RPE 7' },
        { num: 'A2', name: 'Pull-up', note: '', sets: '3 × 6', rpe: 'RPE 7' },
        { num: 'B1', name: 'Single-leg RDL', note: 'balance + PC', sets: '3 × 8 ea.', rpe: 'RPE 7' },
        { num: 'B2', name: 'Copenhagen plank', note: '', sets: '3 × 30s ea.', rpe: 'RPE 7', tag: 'mobility' }
      ]},
      { title: 'Friday · Easy run', duration: '30 min', items: [{ num: 'R1', name: 'Easy aerobic', note: 'Z2', sets: '30 min', rpe: 'Z2', tag: 'run' }]},
      { title: 'Sunday · Long run', duration: '60–110 min', items: [
        { num: 'R1', name: 'Long run', note: winp <= 3 ? '15–18 km easy' : winp === 8 ? '18 km incl. 6 km @ HM pace' : winp === 9 ? 'Taper: 12 km easy' : '15–18 km easy', sets: 'see note', rpe: 'Z2', tag: 'run' }
      ]}
    ];
  }
  if (pid === 5) return [
    { title: 'Monday · Upper-body bias', duration: '50 min', items: [
      { num: 'A1', name: 'Bench press', note: '', sets: '4 × 5', rpe: 'RPE 7' },
      { num: 'A2', name: 'Pull-up / lat pulldown', note: '', sets: '4 × 6–8', rpe: 'RPE 7' },
      { num: 'B1', name: 'DB shoulder press', note: '', sets: '3 × 8', rpe: 'RPE 7' },
      { num: 'B2', name: 'Row variation', note: '', sets: '3 × 10', rpe: 'RPE 7' },
      { num: 'C1', name: 'Face pull + t-spine', note: '', sets: '3 × 15', rpe: 'Easy', tag: 'mobility' }
    ]},
    { title: 'Tuesday · Easy aerobic', duration: '30–40 min', items: [{ num: 'X1', name: 'Easy run / swim / bike', note: 'whatever knees prefer', sets: '30–40 min', rpe: 'Z2', tag: 'run' }]},
    // Phase 5 Wednesday swim: continuous + drill mix ~1500m
    { title: 'Wednesday · Swim', duration: '40 min · 1500 m', items: [{ num: 'W1', name: 'Continuous + drill mix', note: 'maintain quality', sets: '1500 m', rpe: 'RPE 6', tag: 'swim' }]},
    { title: 'Thursday · Lower (lighter)', duration: '50 min', items: [
      { num: 'A1', name: 'Front squat / goblet squat', note: 'lighter than P4', sets: '3 × 6', rpe: 'RPE 7' },
      { num: 'B1', name: 'Single-leg RDL', note: '', sets: '3 × 8 ea.', rpe: 'RPE 7' },
      { num: 'C1', name: 'Reverse Nordic', note: 'always-on', sets: '3 × 8', rpe: 'Quality', tag: 'mobility' },
      { num: 'D1', name: 'Copenhagen + Spanish squat', note: '', sets: '3 each', rpe: 'RPE 7', tag: 'mobility' }
    ]},
    { title: 'Sat/Sun · SKI', duration: 'all day', items: [{ num: 'SKI', name: 'Ski day', note: 'primary lower body load — hydrate, eat well, sleep more', sets: 'whole day', rpe: 'RACE', tag: 'run' }]}
  ];
  return [];
}

// ---------- Public API ----------
export function getPhases() {
  return phases;
}

export function getPhase(id) {
  const p = phases.find(p => p.id === id);
  if (p && !p.weeks) buildProvisionalWeeks(id);
  return p;
}

export function getWeek(pid, wkNum) {
  const p = getPhase(pid);
  return p ? p.weeks.find(w => w.num === wkNum) : null;
}

export default { getPhases, getPhase, getWeek };
