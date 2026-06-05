/**
 * Exercise & drill library — "what is this / how do I do it?" guidance.
 *
 * Each entry has a plain-language summary, step-by-step how-to, and "look for" /
 * "avoid" form cues. Looked up by the exercise/drill name that appears in a
 * session (fuzzy-matched via aliases, since names vary — "Back squat",
 * "Front / back squat", etc).
 *
 * This is the data layer for the in-app form guide. The long-term aim is an
 * animated demo (stick-figure / frame-by-frame) per entry talking through the
 * movement — `media` is reserved for that and is null for now, so the UI shows a
 * "demo coming soon" placeholder. Add entries freely; unmatched names fall back
 * to a generic card built from the session's own cue.
 */

// key → guidance. `type` drives the accent/icon. `media` is the future demo.
const LIB = {
  // ---------------- Strength ----------------
  squat: {
    name: 'Squat', type: 'strength',
    summary: 'The foundational lower-body push — knees and hips bend together to lower and stand.',
    how: ['Bar on your upper back (or weight at your chest), feet shoulder-width, toes slightly out.', 'Brace your core, break at hips and knees together, sit down between your legs.', 'Go as deep as you can keep a flat back — ideally hip crease below the knee.', 'Drive through mid-foot to stand tall, knees tracking over toes.'],
    lookFor: ['Chest up, flat back throughout', 'Knees track in line with toes', 'Even weight through the whole foot'],
    avoid: ['Knees caving inward', 'Heels lifting / weight on toes', 'Lower back rounding at the bottom'],
    media: null
  },
  bench: {
    name: 'Bench press', type: 'strength',
    summary: 'Horizontal upper-body push for chest, shoulders and triceps.',
    how: ['Lie back, eyes under the bar, feet flat, slight arch, shoulder blades pinched down.', 'Grip just wider than shoulders, unrack and hold over your chest.', 'Lower under control to mid-chest, elbows ~45° from the body.', 'Press back up and slightly back toward the rack.'],
    lookFor: ['Shoulder blades retracted and down', 'Bar touches mid-chest', 'Wrists stacked over elbows'],
    avoid: ['Elbows flaring straight out to 90°', 'Bouncing the bar off the chest', 'Hips lifting off the bench'],
    media: null
  },
  deadlift: {
    name: 'Deadlift', type: 'strength',
    summary: 'A hip hinge that lifts the load from the floor — the big posterior-chain pull.',
    how: ['Bar over mid-foot, shins close, hinge down and grip just outside your legs.', 'Flat back, chest proud, take the slack out of the bar.', 'Push the floor away and stand tall, bar dragging up your legs.', 'Lock out hips and knees together; lower by hinging back.'],
    lookFor: ['Flat, braced back start to finish', 'Bar stays close to the body', 'Hips and shoulders rise together'],
    avoid: ['Rounding the lower back', 'Bar drifting away from the shins', 'Hips shooting up first ("stripper" deadlift)'],
    media: null
  },
  rdl: {
    name: 'Romanian deadlift', type: 'strength',
    summary: 'A hips-back hinge that loads the hamstrings and glutes — knees stay mostly fixed.',
    how: ['Stand tall holding the bar/dumbbells at your thighs.', 'Soft knees, push your hips straight back, sliding the weight down your legs.', 'Go until you feel a strong hamstring stretch (around shin level), back flat.', 'Squeeze the glutes to drive the hips forward and stand tall.'],
    lookFor: ['Long flat back, hips travelling back not down', 'Weight close to the legs', 'Stretch felt in the hamstrings'],
    avoid: ['Turning it into a squat (knees bending lots)', 'Rounding the back to reach lower', 'Hyperextending at the top'],
    media: null
  },
  ohp: {
    name: 'Overhead press', type: 'strength',
    summary: 'Vertical push for shoulders and triceps, standing tall.',
    how: ['Bar/dumbbells at shoulder height, elbows slightly in front, glutes and core braced.', 'Press straight overhead, moving your head back slightly to clear the path.', 'Finish with the weight stacked over your shoulders and mid-foot.', 'Lower under control back to the shoulders.'],
    lookFor: ['Ribs down, glutes squeezed (no big lean-back)', 'Bar finishes over the crown of the head', 'Wrists stacked over elbows'],
    avoid: ['Leaning back to press from the chest', 'Flaring elbows wide', 'Pressing around the face instead of through'],
    media: null
  },
  pullup: {
    name: 'Pull-up / lat pulldown', type: 'strength',
    summary: 'Vertical pull for the lats and upper back.',
    how: ['Grip slightly wider than shoulders, start from a full hang (or tall seated).', 'Pull your shoulder blades down first, then drive elbows to your ribs.', 'Bring your chest toward the bar / the bar to your upper chest.', 'Lower under full control to a complete stretch.'],
    lookFor: ['Lead with the shoulder blades', 'Chest up, elbows driving down', 'Full range top and bottom'],
    avoid: ['Kipping / swinging for momentum', 'Half reps', 'Shrugging the shoulders up'],
    media: null
  },
  row: {
    name: 'Row', type: 'strength',
    summary: 'Horizontal pull for the mid-back, lats and rear shoulders.',
    how: ['Hinge to a flat-back position (or use a chest support), arms hanging.', 'Pull the weight to your lower ribs, leading with the elbows.', 'Squeeze the shoulder blades together for a beat.', 'Lower under control to a full stretch.'],
    lookFor: ['Flat back, still torso', 'Elbows drive back past the ribs', 'Squeeze at the top'],
    avoid: ['Heaving with the lower back', 'Shrugging instead of rowing', 'Cutting the range short'],
    media: null
  },
  split_squat: {
    name: 'Split squat / lunge', type: 'strength',
    summary: 'Single-leg strength and balance — big carryover to running.',
    how: ['Stagger your stance, most weight on the front foot (rear foot elevated for Bulgarian).', 'Lower straight down until the front thigh is about parallel.', 'Keep the front shin fairly vertical, torso tall.', 'Drive through the front heel to stand.'],
    lookFor: ['Front knee tracks over the foot', 'Tall, balanced torso', 'Controlled descent'],
    avoid: ['Front knee caving in', 'Pushing off the back foot', 'Knee crashing past the toes'],
    media: null
  },
  hip_thrust: {
    name: 'Hip thrust / glute bridge', type: 'strength',
    summary: 'Direct glute work — powerful hip extension.',
    how: ['Upper back on a bench (or floor for a bridge), weight across the hips.', 'Tuck the chin, push through your heels and drive the hips up.', 'Finish with a flat body line, glutes fully squeezed.', 'Lower under control.'],
    lookFor: ['Glutes do the work, ribs stay down', 'Full hip extension at the top', 'Shins roughly vertical at the top'],
    avoid: ['Arching the lower back to finish', 'Pushing through the toes', 'Bouncing off the floor'],
    media: null
  },
  calf_raise: {
    name: 'Calf raise', type: 'strength',
    summary: 'Calf and Achilles strength — key for running durability.',
    how: ['Balls of the feet on a step, heels free to drop.', 'Lower the heels for a full stretch.', 'Rise up onto the toes as high as you can.', 'Control the lowering (a slow 3-count builds tendon stiffness).'],
    lookFor: ['Full range — deep stretch to high rise', 'Slow, controlled tempo', 'Even push through both feet'],
    avoid: ['Tiny bouncy reps', 'Rolling onto the outside of the foot', 'Rushing the lowering'],
    media: null
  },
  carry: {
    name: 'Loaded carry', type: 'strength',
    summary: 'Walk while holding load — full-body bracing, grip and posture.',
    how: ['Pick up the weight with a flat back, stand tall.', 'Brace your core, shoulders down and back.', 'Walk with controlled steps for the prescribed distance.', 'Set down with a good hinge.'],
    lookFor: ['Tall posture, ribs stacked over hips', 'Steady, controlled steps', 'Shoulders packed down'],
    avoid: ['Leaning to one side', 'Holding your breath the whole way', 'Letting the shoulders shrug up'],
    media: null
  },
  pushup: {
    name: 'Push-up', type: 'strength',
    summary: 'Bodyweight horizontal push — a full-body brace as well as chest/triceps.',
    how: ['Hands under the shoulders, body in a straight line, core and glutes tight.', 'Lower until the chest is just off the floor, elbows ~45°.', 'Press back up keeping the body rigid.', 'Elevate the hands to make it easier; feet up to make it harder.'],
    lookFor: ['Straight line head-to-heels', 'Elbows ~45° from the body', 'Full range, chest near the floor'],
    avoid: ['Hips sagging or piking up', 'Head dropping / flaring elbows', 'Half reps'],
    media: null
  },
  plank: {
    name: 'Plank / anti-rotation core', type: 'mobility',
    summary: 'Bracing the trunk against movement — the core\'s real job.',
    how: ['Forearms (or hands) down, body in a straight line.', 'Squeeze glutes, tuck the ribs down, brace as if about to be poked.', 'Breathe normally while holding tension.', 'For Pallof/anti-rotation: resist a cable/band trying to twist you.'],
    lookFor: ['Flat line hips-to-shoulders', 'Ribs down, glutes tight', 'Steady breathing under tension'],
    avoid: ['Hips sagging or piking', 'Holding your breath', 'Letting the lower back arch'],
    media: null
  },
  face_pull: {
    name: 'Face pull', type: 'mobility',
    summary: 'Rear-shoulder and upper-back health — great posture/shoulder insurance.',
    how: ['Cable/band at head height, pull toward your face.', 'Lead with the elbows high, separating your hands as you pull.', 'Finish with hands beside your ears, shoulder blades squeezed.', 'Return under control.'],
    lookFor: ['Elbows high throughout', 'Squeeze the rear delts/upper back', 'Smooth, controlled tempo'],
    avoid: ['Using heavy weight and heaving', 'Elbows dropping low (turns into a row)', 'Shrugging the traps'],
    media: null
  },
  lateral_raise: {
    name: 'Lateral raise', type: 'strength',
    summary: 'Isolation for the side delts — builds shoulder width.',
    how: ['Dumbbells at your sides, slight forward lean, soft elbows.', 'Raise out to the sides to about shoulder height.', 'Lead with the elbows, pinkies slightly up.', 'Lower slowly — resist the way down.'],
    lookFor: ['Elbows lead, wrists neutral', 'Stop around shoulder height', 'Slow controlled lowering'],
    avoid: ['Swinging with momentum', 'Shrugging the traps up', 'Going way above shoulder height'],
    media: null
  },
  curl: {
    name: 'Biceps curl', type: 'strength',
    summary: 'Isolation for the biceps.',
    how: ['Weights at your sides, elbows pinned to your ribs.', 'Curl up by bending only at the elbow.', 'Squeeze at the top.', 'Lower slowly to a full stretch.'],
    lookFor: ['Elbows stay still and pinned', 'Full range, controlled eccentric', 'Wrists neutral'],
    avoid: ['Swinging the elbows forward', 'Using the back/hips to heave', 'Half reps'],
    media: null
  },
  nordic: {
    name: 'Nordic / hamstring curl', type: 'mobility',
    summary: 'Eccentric hamstring strength — strong protection against hamstring strains.',
    how: ['Kneel with ankles anchored (partner/strap/sliders).', 'Keep a straight line hips-to-shoulders.', 'Lower forward as slowly as you can, resisting with the hamstrings.', 'Push off your hands to reset (or use sliders to curl back).'],
    lookFor: ['Slow, controlled lowering', 'Straight body line (no hip bend)', 'Resist as far as you can'],
    avoid: ['Bending at the hips to cheat', 'Dropping fast', 'Skipping the eccentric'],
    media: null
  },
  copenhagen: {
    name: 'Copenhagen plank', type: 'mobility',
    summary: 'Adductor (groin) strength — protects against groin strains.',
    how: ['Side plank with your top leg on a bench, bottom leg underneath.', 'Lift the bottom leg up to meet the bench, hips high.', 'Hold a straight body line.', 'Shorten the lever (knee on bench) to make it easier.'],
    lookFor: ['Straight line, hips lifted', 'Squeeze the top inner thigh', 'Controlled hold'],
    avoid: ['Hips dropping', 'Twisting the torso', 'Holding your breath'],
    media: null
  },
  step_up: {
    name: 'Step-up', type: 'strength',
    summary: 'Single-leg strength and running-specific drive.',
    how: ['Place one foot fully on a knee-height box.', 'Drive through that heel to stand tall on the box.', 'Control the way back down — don\'t just drop.', 'Minimise pushing off the back foot.'],
    lookFor: ['Drive through the top-leg heel', 'Tall, balanced finish', 'Controlled descent'],
    avoid: ['Pushing off the bottom foot', 'Knee caving in', 'Falling/dropping down'],
    media: null
  },
  plyo: {
    name: 'Pogo hops / box jumps', type: 'strength',
    summary: 'Plyometrics — train springy, stiff, fast ground contact for running economy.',
    how: ['Pogos: small, fast bounces from the ankles, knees fairly stiff.', 'Box jumps: load the hips, swing the arms, jump and land softly on the box.', 'Land quietly — absorb through the whole foot.', 'Quality over height/quantity; full recovery between sets.'],
    lookFor: ['Quiet, soft landings', 'Stiff, springy ankles (pogos)', 'Quick ground contact'],
    avoid: ['Loud, heavy landings', 'Knees caving on landing', 'Chasing max height when tired'],
    media: null
  },

  // ---------------- Swim drills ----------------
  catchup: {
    name: 'Catch-up drill', type: 'swim',
    summary: 'Teaches a patient front-quadrant stroke and a strong catch.',
    how: ['Swim freestyle but let one hand "wait" out front.', 'Only start the next pull once the other hand has returned to meet it.', 'Touch hands out front each stroke.', 'Keep a long body line and steady kick.'],
    lookFor: ['Patient lead hand out front', 'Long reach each stroke', 'High elbow as you start the catch'],
    avoid: ['Pulling before the hands meet', 'Dropping the elbow', 'Crossing the centre line'],
    media: null
  },
  single_arm: {
    name: 'Single-arm freestyle', type: 'swim',
    summary: 'Isolates one arm to groove the catch and pull.',
    how: ['Swim with one arm, the other resting at your side or out front.', 'Focus on a high-elbow catch and pressing the water back.', 'Breathe to the non-working side (or as comfortable).', 'Switch arms each length / few strokes.'],
    lookFor: ['High elbow, fingertips down on the catch', 'Press water back toward the feet', 'Stable body position'],
    avoid: ['Pushing water down instead of back', 'Dropping the elbow', 'Over-rotating'],
    media: null
  },
  scull: {
    name: 'Sculling', type: 'swim',
    summary: 'Develops "feel" for the water and a better catch.',
    how: ['Forearms vertical-ish, hands out front.', 'Make small figure-8 / in-and-out motions with the hands.', 'Feel gentle pressure on the palms and forearms.', 'Keep it light and continuous — it\'s about feel, not power.'],
    lookFor: ['Light, continuous pressure on the hands', 'High elbows', 'Relaxed, controlled motion'],
    avoid: ['Big, forceful sweeps', 'Dropping the elbows', 'Holding the breath/tensing up'],
    media: null
  },
  kick_side: {
    name: 'Kick on side', type: 'swim',
    summary: 'Builds body position, balance and a steady kick.',
    how: ['Push off on your side, bottom arm extended, top arm resting on your hip.', 'Look down, head in line with the spine.', 'Kick steadily from the hips, legs long.', 'Hold a long, balanced line; rotate to breathe as needed.'],
    lookFor: ['Long body line, head neutral', 'Kick from the hips, not the knees', 'Balanced and stable on your side'],
    avoid: ['Head lifting / looking forward', 'Bicycle/knee-driven kicking', 'Sinking hips/legs'],
    media: null
  },
  fingertip_drag: {
    name: 'Fingertip-drag', type: 'swim',
    summary: 'Grooves a high-elbow recovery and relaxed arm.',
    how: ['Swim freestyle dragging your fingertips along the water on the recovery.', 'This forces a high elbow and relaxed forearm.', 'Reach forward and enter cleanly.', 'Keep the rest of the stroke normal.'],
    lookFor: ['High elbow on recovery', 'Relaxed hand/forearm', 'Clean hand entry out front'],
    avoid: ['Swinging a straight arm around', 'Tension in the hand', 'Crossing over on entry'],
    media: null
  },
  bilateral: {
    name: 'Bilateral breathing', type: 'swim',
    summary: 'Breathing both sides for an even, balanced stroke.',
    how: ['Breathe every 3 strokes so you alternate sides.', 'Exhale fully into the water between breaths.', 'Turn the head just enough to clear the mouth — keep one goggle in.', 'Stay relaxed; don\'t lift the head.'],
    lookFor: ['Full exhale underwater', 'Small head turn, head stays low', 'Even stroke both sides'],
    avoid: ['Holding your breath', 'Lifting/rotating the head too far', 'Rushing the breath'],
    media: null
  },
  pull_buoy: {
    name: 'Pull-buoy swim', type: 'swim',
    summary: 'Float between the legs isolates the upper-body pull.',
    how: ['Place the buoy between your thighs to lift the legs.', 'Swim freestyle with no (or minimal) kick.', 'Focus entirely on the catch and pull.', 'Keep a long, stable body line.'],
    lookFor: ['Strong high-elbow catch', 'Long body line', 'Smooth, even pulling'],
    avoid: ['Letting the hips drop', 'Dropping the elbow', 'Snaking/over-rotating'],
    media: null
  },
  push_glide: {
    name: 'Push-and-glide', type: 'swim',
    summary: 'The most basic balance/streamline drill.',
    how: ['Push off the wall in a tight streamline, arms extended, head tucked.', 'Hold the glide and feel a balanced, flat position.', 'Keep everything long and still.', 'See how far one push carries you.'],
    lookFor: ['Tight streamline, head tucked', 'Flat, balanced body', 'Long, quiet glide'],
    avoid: ['Head up / looking forward', 'Loose, wide arms', 'Sinking legs'],
    media: null
  },

  // ---------------- Running session types ----------------
  easy_run: { name: 'Easy run', type: 'run', summary: 'Conversational-pace aerobic running — the bulk of your training.', how: ['Run at a pace where you could hold a full conversation.', 'Relaxed form, easy breathing (nose-breathing pace).', 'It should feel almost too easy — that\'s the point.', 'These build your aerobic engine without fatigue.'], lookFor: ['Truly conversational effort', 'Relaxed, springy form', 'Finishing feeling you could go further'], avoid: ['Drifting too fast ("grey zone")', 'Forcing the pace', 'Skipping them because they feel slow'], media: null },
  long_run: { name: 'Long run', type: 'run', summary: 'Your longest run of the week — builds endurance and fatigue resistance.', how: ['Start easy and stay mostly conversational.', 'Fuel and hydrate if it\'s over ~75–90 min.', 'Some long runs finish with a faster/goal-pace segment.', 'Cover the distance — pace matters less than time on feet.'], lookFor: ['Steady, even effort', 'Good fuelling on longer ones', 'Strong, controlled finish'], avoid: ['Starting too fast', 'Skipping fuel/hydration', 'Turning every long run into a race'], media: null },
  tempo: { name: 'Tempo / threshold', type: 'run', summary: '"Comfortably hard" running at around your one-hour race pace — raises your lactate threshold.', how: ['Warm up easy for 10–15 min.', 'Settle into a controlled, comfortably-hard effort.', 'You could speak only a few words at a time.', 'Cool down easy.'], lookFor: ['Controlled, even "comfortably hard" effort', 'Relaxed form under pressure', 'Even or slightly negative splits'], avoid: ['Treating it as a race', 'Starting too hard and fading', 'Going into the gasping-for-air zone'], media: null },
  vo2: { name: 'VO₂max intervals', type: 'run', summary: 'Hard repeats around 3k–5k pace with jog recoveries — lifts your ceiling.', how: ['Warm up well with easy running + a few strides.', 'Run each rep strong and even, around 3k–5k effort.', 'Jog the recoveries — let the heart rate come down a bit.', 'Cool down easy.'], lookFor: ['Even splits across all reps', 'Strong but controlled — not all-out on rep 1', 'Good form even when it bites'], avoid: ['Going too fast early and dying', 'Cutting the warm-up', 'Sprinting the recoveries'], media: null },
  fartlek: { name: 'Fartlek', type: 'run', summary: '"Speed play" — relaxed surges mixed into a run, less rigid than intervals.', how: ['Warm up easy.', 'Alternate faster surges with easy floats (e.g. 2 min on / 2 min off).', 'Keep the surges quick but relaxed, not all-out.', 'Great for varying terrain and feel.'], lookFor: ['Quick but relaxed surges', 'Smooth transitions in and out', 'Consistent effort across surges'], avoid: ['Sprinting the surges', 'Skipping the easy floats', 'Losing form when tired'], media: null },
  strides: { name: 'Strides', type: 'run', summary: 'Short, fast-but-relaxed accelerations — sharpen form and turnover without fatigue.', how: ['After an easy run, run ~20s building to fast-but-smooth.', 'Focus on quick, light leg turnover and tall posture.', 'Full recovery walk/jog between each.', 'Stay relaxed — these are not sprints.'], lookFor: ['Smooth acceleration, relaxed speed', 'Quick, light cadence', 'Tall, easy posture'], avoid: ['All-out sprinting', 'Tensing up', 'Skipping the recovery'], media: null },
  goal_pace: { name: 'Goal-pace running', type: 'run', summary: 'Running at your target race pace to rehearse race rhythm and economy.', how: ['Warm up easy.', 'Lock into your exact goal race pace for the prescribed reps/segment.', 'Focus on how that pace feels — rhythm, breathing, form.', 'Float/jog the recoveries.'], lookFor: ['Hitting goal pace evenly', 'Relaxed at race effort', 'Consistent rhythm'], avoid: ['Drifting faster than goal pace', 'Uneven splits', 'Forcing it on tired legs'], media: null },
  sharpener: { name: 'Sharpener', type: 'run', summary: 'A short, snappy taper-week session to stay sharp without fatigue.', how: ['Easy warm-up.', 'A few short, quick efforts at goal pace or a touch faster.', 'Long, easy recoveries — keep it well within yourself.', 'Total volume is tiny — the point is freshness, not work.'], lookFor: ['Snappy but controlled efforts', 'Feeling fresh, not worked', 'Good leg speed'], avoid: ['Doing too much in taper', 'Chasing times', 'Turning it into a workout'], media: null }
};

// name (lowercased) → library key. First matching pattern wins.
const ALIASES = [
  [/bench press/, 'bench'],
  [/romanian deadlift|\brdl\b/, 'rdl'],
  [/trap-bar|hex deadlift|deadlift/, 'deadlift'],
  [/back squat|front.*squat|squat.*front|goblet squat|^squat|wall sit/, 'squat'],
  [/overhead press|shoulder press|\bohp\b|pike push/, 'ohp'],
  [/pull-up|pullup|lat pulldown|pulldown|chin-up/, 'pullup'],
  [/\brow\b/, 'row'],
  [/split squat|lunge|bulgarian/, 'split_squat'],
  [/hip thrust|glute bridge/, 'hip_thrust'],
  [/calf raise/, 'calf_raise'],
  [/loaded carry|farmer/, 'carry'],
  [/push-up|push up|pushup/, 'pushup'],
  [/plank|pallof|hollow|dead bug/, 'plank'],
  [/face pull/, 'face_pull'],
  [/lateral raise/, 'lateral_raise'],
  [/curl/, 'curl'],
  [/nordic|hamstring curl|leg curl/, 'nordic'],
  [/copenhagen/, 'copenhagen'],
  [/step-up|step up/, 'step_up'],
  [/pogo|box jump|hops|plyo/, 'plyo'],
  // swim drills
  [/catch-up|catchup/, 'catchup'],
  [/single-arm|single arm/, 'single_arm'],
  [/scull/, 'scull'],
  [/kick on side|side kick/, 'kick_side'],
  [/fingertip|zipper/, 'fingertip_drag'],
  [/bilateral|breathe every/, 'bilateral'],
  [/pull-buoy|pull buoy|pullbuoy/, 'pull_buoy'],
  [/push-and-glide|push and glide|streamline/, 'push_glide'],
  // run session types (matched on the session focus when item name isn't specific)
  [/sharpener/, 'sharpener'],
  [/long run/, 'long_run'],
  [/easy run/, 'easy_run'],
  [/tempo|threshold|cruise/, 'tempo'],
  [/vo₂|vo2|interval/, 'vo2'],
  [/fartlek|surge/, 'fartlek'],
  [/strides/, 'strides'],
  [/goal-pace|goal pace|race-pace|race pace/, 'goal_pace']
];

/**
 * Look up form guidance for an exercise/drill by name (and optional session
 * focus, used to resolve generic run "Main set" rows to the workout type).
 * @returns {object|null} a library entry, or null if nothing matches.
 */
export function lookupExercise(name, focus) {
  const hay = `${name || ''} ${focus || ''}`.toLowerCase();
  for (const [re, key] of ALIASES) if (re.test(hay)) return LIB[key];
  return null;
}

export default { lookupExercise };
