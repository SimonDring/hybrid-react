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
    demo: 'squat', media: null
  },
  bench: {
    name: 'Bench press', type: 'strength',
    summary: 'Horizontal upper-body push for chest, shoulders and triceps.',
    how: ['Lie back, eyes under the bar, feet flat, slight arch, shoulder blades pinched down.', 'Grip just wider than shoulders, unrack and hold over your chest.', 'Lower under control to mid-chest, elbows ~45° from the body.', 'Press back up and slightly back toward the rack.'],
    lookFor: ['Shoulder blades retracted and down', 'Bar touches mid-chest', 'Wrists stacked over elbows'],
    avoid: ['Elbows flaring straight out to 90°', 'Bouncing the bar off the chest', 'Hips lifting off the bench'],
    demo: 'bench', media: null
  },
  deadlift: {
    name: 'Deadlift', type: 'strength',
    summary: 'A hip hinge that lifts the load from the floor — the big posterior-chain pull.',
    how: ['Bar over mid-foot, shins close, hinge down and grip just outside your legs.', 'Flat back, chest proud, take the slack out of the bar.', 'Push the floor away and stand tall, bar dragging up your legs.', 'Lock out hips and knees together; lower by hinging back.'],
    lookFor: ['Flat, braced back start to finish', 'Bar stays close to the body', 'Hips and shoulders rise together'],
    avoid: ['Rounding the lower back', 'Bar drifting away from the shins', 'Hips shooting up first ("stripper" deadlift)'],
    demo: 'deadlift', media: null
  },
  rdl: {
    name: 'Romanian deadlift', type: 'strength',
    summary: 'A hips-back hinge that loads the hamstrings and glutes — knees stay mostly fixed.',
    how: ['Stand tall holding the bar/dumbbells at your thighs.', 'Soft knees, push your hips straight back, sliding the weight down your legs.', 'Go until you feel a strong hamstring stretch (around shin level), back flat.', 'Squeeze the glutes to drive the hips forward and stand tall.'],
    lookFor: ['Long flat back, hips travelling back not down', 'Weight close to the legs', 'Stretch felt in the hamstrings'],
    avoid: ['Turning it into a squat (knees bending lots)', 'Rounding the back to reach lower', 'Hyperextending at the top'],
    demo: 'rdl', media: null
  },
  sldl: { name: 'Single-leg hinge (single-leg RDL)', type: 'strength', summary: 'A straight-leg hinge balanced on one leg — the free leg sweeps back as you tip forward.', how: ['Stand on one leg, soft knee, weight in hand.', 'Hinge at the hip — the free leg sweeps straight back as the torso tips forward.', 'Keep the hips level and the back flat; lower the weight down the standing leg.', 'Drive the hip forward to return to standing.'], lookFor: ['Hips stay level (no opening up)', 'Body and back leg form one line', 'Balance over the mid-foot'], avoid: ['Rotating the hips open', 'Rounding the back', 'Bending the standing knee a lot'], demo: 'sldl', media: null },
  ohp: {
    name: 'Overhead press', type: 'strength',
    summary: 'Vertical push for shoulders and triceps, standing tall.',
    how: ['Bar/dumbbells at shoulder height, elbows slightly in front, glutes and core braced.', 'Press straight overhead, moving your head back slightly to clear the path.', 'Finish with the weight stacked over your shoulders and mid-foot.', 'Lower under control back to the shoulders.'],
    lookFor: ['Ribs down, glutes squeezed (no big lean-back)', 'Bar finishes over the crown of the head', 'Wrists stacked over elbows'],
    avoid: ['Leaning back to press from the chest', 'Flaring elbows wide', 'Pressing around the face instead of through'],
    demo: 'press', media: null
  },
  pullup: {
    name: 'Pull-up / lat pulldown', type: 'strength',
    summary: 'Vertical pull for the lats and upper back.',
    how: ['Grip slightly wider than shoulders, start from a full hang (or tall seated).', 'Pull your shoulder blades down first, then drive elbows to your ribs.', 'Bring your chest toward the bar / the bar to your upper chest.', 'Lower under full control to a complete stretch.'],
    lookFor: ['Lead with the shoulder blades', 'Chest up, elbows driving down', 'Full range top and bottom'],
    avoid: ['Kipping / swinging for momentum', 'Half reps', 'Shrugging the shoulders up'],
    demo: 'pullup', media: null
  },
  row: {
    name: 'Row', type: 'strength',
    summary: 'Horizontal pull for the mid-back, lats and rear shoulders.',
    how: ['Hinge to a flat-back position (or use a chest support), arms hanging.', 'Pull the weight to your lower ribs, leading with the elbows.', 'Squeeze the shoulder blades together for a beat.', 'Lower under control to a full stretch.'],
    lookFor: ['Flat back, still torso', 'Elbows drive back past the ribs', 'Squeeze at the top'],
    avoid: ['Heaving with the lower back', 'Shrugging instead of rowing', 'Cutting the range short'],
    demo: 'row', media: null
  },
  split_squat: {
    name: 'Split squat / lunge', type: 'strength',
    summary: 'Single-leg strength and balance — big carryover to running.',
    how: ['Stagger your stance, most weight on the front foot (rear foot elevated for Bulgarian).', 'Lower straight down until the front thigh is about parallel.', 'Keep the front shin fairly vertical, torso tall.', 'Drive through the front heel to stand.'],
    lookFor: ['Front knee tracks over the foot', 'Tall, balanced torso', 'Controlled descent'],
    avoid: ['Front knee caving in', 'Pushing off the back foot', 'Knee crashing past the toes'],
    demo: 'lunge', media: null
  },
  hip_thrust: {
    name: 'Hip thrust / glute bridge', type: 'strength',
    summary: 'Direct glute work — powerful hip extension.',
    how: ['Upper back on a bench (or floor for a bridge), weight across the hips.', 'Tuck the chin, push through your heels and drive the hips up.', 'Finish with a flat body line, glutes fully squeezed.', 'Lower under control.'],
    lookFor: ['Glutes do the work, ribs stay down', 'Full hip extension at the top', 'Shins roughly vertical at the top'],
    avoid: ['Arching the lower back to finish', 'Pushing through the toes', 'Bouncing off the floor'],
    demo: 'hipthrust', media: null
  },
  calf_raise: {
    name: 'Calf raise', type: 'strength',
    summary: 'Calf and Achilles strength — key for running durability.',
    how: ['Balls of the feet on a step, heels free to drop.', 'Lower the heels for a full stretch.', 'Rise up onto the toes as high as you can.', 'Control the lowering (a slow 3-count builds tendon stiffness).'],
    lookFor: ['Full range — deep stretch to high rise', 'Slow, controlled tempo', 'Even push through both feet'],
    avoid: ['Tiny bouncy reps', 'Rolling onto the outside of the foot', 'Rushing the lowering'],
    demo: 'calf', media: null
  },
  seated_calf_raise: {
    name: 'Seated calf raise', type: 'strength',
    summary: 'Soleus-focused calf strength — knee bent takes the gastrocnemius out, targeting the deeper calf muscle that drives slow running and standing endurance.',
    how: ['Sit tall with the knees bent to about 90°, balls of the feet on a step.', 'Rest the weight on top of the knees (held with the hands).', 'Lower the heels for a full stretch below the step.', 'Drive up through the balls of the feet, then lower under control.'],
    lookFor: ['Knee held near 90° throughout', 'Full range from a deep stretch to a high rise', 'Slow, controlled tempo'],
    avoid: ['Bouncing out of the bottom', 'Letting the knee drift open past 90°', 'Cutting the range short'],
    demo: 'seatedcalf', media: null
  },
  carry: {
    name: 'Loaded carry', type: 'strength',
    summary: 'Walk while holding load — full-body bracing, grip and posture.',
    how: ['Pick up the weight with a flat back, stand tall.', 'Brace your core, shoulders down and back.', 'Walk with controlled steps for the prescribed distance.', 'Set down with a good hinge.'],
    lookFor: ['Tall posture, ribs stacked over hips', 'Steady, controlled steps', 'Shoulders packed down'],
    avoid: ['Leaning to one side', 'Holding your breath the whole way', 'Letting the shoulders shrug up'],
    demo: 'carry', media: null
  },
  pushup: {
    name: 'Push-up', type: 'strength',
    summary: 'Bodyweight horizontal push — a full-body brace as well as chest/triceps.',
    how: ['Hands under the shoulders, body in a straight line, core and glutes tight.', 'Lower until the chest is just off the floor, elbows ~45°.', 'Press back up keeping the body rigid.', 'Elevate the hands to make it easier; feet up to make it harder.'],
    lookFor: ['Straight line head-to-heels', 'Elbows ~45° from the body', 'Full range, chest near the floor'],
    avoid: ['Hips sagging or piking up', 'Head dropping / flaring elbows', 'Half reps'],
    demo: 'pushup', media: null
  },
  plank: {
    name: 'Plank / anti-rotation core', type: 'mobility',
    summary: 'Bracing the trunk against movement — the core\'s real job.',
    how: ['Forearms (or hands) down, body in a straight line.', 'Squeeze glutes, tuck the ribs down, brace as if about to be poked.', 'Breathe normally while holding tension.', 'For Pallof/anti-rotation: resist a cable/band trying to twist you.'],
    lookFor: ['Flat line hips-to-shoulders', 'Ribs down, glutes tight', 'Steady breathing under tension'],
    avoid: ['Hips sagging or piking', 'Holding your breath', 'Letting the lower back arch'],
    demo: 'plank', media: null
  },
  face_pull: {
    name: 'Face pull', type: 'mobility',
    summary: 'Rear-shoulder and upper-back health — great posture/shoulder insurance.',
    how: ['Cable/band at head height, pull toward your face.', 'Lead with the elbows high, separating your hands as you pull.', 'Finish with hands beside your ears, shoulder blades squeezed.', 'Return under control.'],
    lookFor: ['Elbows high throughout', 'Squeeze the rear delts/upper back', 'Smooth, controlled tempo'],
    avoid: ['Using heavy weight and heaving', 'Elbows dropping low (turns into a row)', 'Shrugging the traps'],
    demo: 'facepull', media: null
  },
  lateral_raise: {
    name: 'Lateral raise', type: 'strength',
    summary: 'Isolation for the side delts — builds shoulder width.',
    how: ['Dumbbells at your sides, slight forward lean, soft elbows.', 'Raise out to the sides to about shoulder height.', 'Lead with the elbows, pinkies slightly up.', 'Lower slowly — resist the way down.'],
    lookFor: ['Elbows lead, wrists neutral', 'Stop around shoulder height', 'Slow controlled lowering'],
    avoid: ['Swinging with momentum', 'Shrugging the traps up', 'Going way above shoulder height'],
    demo: 'lateralraise', media: null
  },
  curl: {
    name: 'Biceps curl', type: 'strength',
    summary: 'Isolation for the biceps.',
    how: ['Weights at your sides, elbows pinned to your ribs.', 'Curl up by bending only at the elbow.', 'Squeeze at the top.', 'Lower slowly to a full stretch.'],
    lookFor: ['Elbows stay still and pinned', 'Full range, controlled eccentric', 'Wrists neutral'],
    avoid: ['Swinging the elbows forward', 'Using the back/hips to heave', 'Half reps'],
    demo: 'curl', media: null
  },
  nordic: {
    name: 'Nordic / hamstring curl', type: 'mobility',
    summary: 'Eccentric hamstring strength — strong protection against hamstring strains.',
    how: ['Kneel with ankles anchored (partner/strap/sliders).', 'Keep a straight line hips-to-shoulders.', 'Lower forward as slowly as you can, resisting with the hamstrings.', 'Push off your hands to reset (or use sliders to curl back).'],
    lookFor: ['Slow, controlled lowering', 'Straight body line (no hip bend)', 'Resist as far as you can'],
    avoid: ['Bending at the hips to cheat', 'Dropping fast', 'Skipping the eccentric'],
    demo: 'nordic', media: null
  },
  copenhagen: {
    name: 'Copenhagen plank', type: 'mobility',
    summary: 'Adductor (groin) strength — protects against groin strains.',
    how: ['On your side, top leg resting on a bench, propped on the bottom forearm.', 'Let the bottom leg hang; lift the hips into a straight line.', 'Hold, then lower with control (knee on the bench is easier).'],
    lookFor: ['Straight line, hips lifted', 'Squeeze the top inner thigh', 'Controlled hold'],
    avoid: ['Hips dropping', 'Twisting the torso', 'Holding your breath'],
    demo: 'copenhagen', media: null
  },
  step_up: {
    name: 'Step-up', type: 'strength',
    summary: 'Single-leg strength and running-specific drive.',
    how: ['Place one foot fully on a knee-height box.', 'Drive through that heel to stand tall on the box.', 'Control the way back down — don\'t just drop.', 'Minimise pushing off the back foot.'],
    lookFor: ['Drive through the top-leg heel', 'Tall, balanced finish', 'Controlled descent'],
    avoid: ['Pushing off the bottom foot', 'Knee caving in', 'Falling/dropping down'],
    demo: 'stepup', media: null
  },
  plyo: {
    name: 'Pogo hops / box jumps', type: 'strength',
    summary: 'Plyometrics — train springy, stiff, fast ground contact for running economy.',
    how: ['Pogos: small, fast bounces from the ankles, knees fairly stiff.', 'Box jumps: load the hips, swing the arms, jump and land softly on the box.', 'Land quietly — absorb through the whole foot.', 'Quality over height/quantity; full recovery between sets.'],
    lookFor: ['Quiet, soft landings', 'Stiff, springy ankles (pogos)', 'Quick ground contact'],
    avoid: ['Loud, heavy landings', 'Knees caving on landing', 'Chasing max height when tired'],
    demo: 'plyo', media: null
  },

  // ---------------- Swim drills ----------------
  catchup: {
    name: 'Catch-up drill', type: 'swim',
    summary: 'Teaches a patient front-quadrant stroke and a strong catch.',
    how: ['Swim freestyle but let one hand "wait" out front.', 'Only start the next pull once the other hand has returned to meet it.', 'Touch hands out front each stroke.', 'Keep a long body line and steady kick.'],
    lookFor: ['Patient lead hand out front', 'Long reach each stroke', 'High elbow as you start the catch'],
    avoid: ['Pulling before the hands meet', 'Dropping the elbow', 'Crossing the centre line'],
    demo: null, media: null
  },
  single_arm: {
    name: 'Single-arm freestyle', type: 'swim',
    summary: 'Isolates one arm to groove the catch and pull.',
    how: ['Swim with one arm, the other resting at your side or out front.', 'Focus on a high-elbow catch and pressing the water back.', 'Breathe to the non-working side (or as comfortable).', 'Switch arms each length / few strokes.'],
    lookFor: ['High elbow, fingertips down on the catch', 'Press water back toward the feet', 'Stable body position'],
    avoid: ['Pushing water down instead of back', 'Dropping the elbow', 'Over-rotating'],
    demo: null, media: null
  },
  scull: {
    name: 'Sculling', type: 'swim',
    summary: 'Develops "feel" for the water and a better catch.',
    how: ['Forearms vertical-ish, hands out front.', 'Make small figure-8 / in-and-out motions with the hands.', 'Feel gentle pressure on the palms and forearms.', 'Keep it light and continuous — it\'s about feel, not power.'],
    lookFor: ['Light, continuous pressure on the hands', 'High elbows', 'Relaxed, controlled motion'],
    avoid: ['Big, forceful sweeps', 'Dropping the elbows', 'Holding the breath/tensing up'],
    demo: null, media: null
  },
  kick_side: {
    name: 'Kick on side', type: 'swim',
    summary: 'Builds body position, balance and a steady kick.',
    how: ['Push off on your side, bottom arm extended, top arm resting on your hip.', 'Look down, head in line with the spine.', 'Kick steadily from the hips, legs long.', 'Hold a long, balanced line; rotate to breathe as needed.'],
    lookFor: ['Long body line, head neutral', 'Kick from the hips, not the knees', 'Balanced and stable on your side'],
    avoid: ['Head lifting / looking forward', 'Bicycle/knee-driven kicking', 'Sinking hips/legs'],
    demo: null, media: null
  },
  fingertip_drag: {
    name: 'Fingertip-drag', type: 'swim',
    summary: 'Grooves a high-elbow recovery and relaxed arm.',
    how: ['Swim freestyle dragging your fingertips along the water on the recovery.', 'This forces a high elbow and relaxed forearm.', 'Reach forward and enter cleanly.', 'Keep the rest of the stroke normal.'],
    lookFor: ['High elbow on recovery', 'Relaxed hand/forearm', 'Clean hand entry out front'],
    avoid: ['Swinging a straight arm around', 'Tension in the hand', 'Crossing over on entry'],
    demo: null, media: null
  },
  bilateral: {
    name: 'Bilateral breathing', type: 'swim',
    summary: 'Breathing both sides for an even, balanced stroke.',
    how: ['Breathe every 3 strokes so you alternate sides.', 'Exhale fully into the water between breaths.', 'Turn the head just enough to clear the mouth — keep one goggle in.', 'Stay relaxed; don\'t lift the head.'],
    lookFor: ['Full exhale underwater', 'Small head turn, head stays low', 'Even stroke both sides'],
    avoid: ['Holding your breath', 'Lifting/rotating the head too far', 'Rushing the breath'],
    demo: null, media: null
  },
  pull_buoy: {
    name: 'Pull-buoy swim', type: 'swim',
    summary: 'Float between the legs isolates the upper-body pull.',
    how: ['Place the buoy between your thighs to lift the legs.', 'Swim freestyle with no (or minimal) kick.', 'Focus entirely on the catch and pull.', 'Keep a long, stable body line.'],
    lookFor: ['Strong high-elbow catch', 'Long body line', 'Smooth, even pulling'],
    avoid: ['Letting the hips drop', 'Dropping the elbow', 'Snaking/over-rotating'],
    demo: null, media: null
  },
  push_glide: {
    name: 'Push-and-glide', type: 'swim',
    summary: 'The most basic balance/streamline drill.',
    how: ['Push off the wall in a tight streamline, arms extended, head tucked.', 'Hold the glide and feel a balanced, flat position.', 'Keep everything long and still.', 'See how far one push carries you.'],
    lookFor: ['Tight streamline, head tucked', 'Flat, balanced body', 'Long, quiet glide'],
    avoid: ['Head up / looking forward', 'Loose, wide arms', 'Sinking legs'],
    demo: null, media: null
  },

  // ---------------- Running session types ----------------
  easy_run: { name: 'Easy run', type: 'run', summary: 'Conversational-pace aerobic running — the bulk of your training.', how: ['Run at a pace where you could hold a full conversation.', 'Relaxed form, easy breathing (nose-breathing pace).', 'It should feel almost too easy — that\'s the point.', 'These build your aerobic engine without fatigue.'], lookFor: ['Truly conversational effort', 'Relaxed, springy form', 'Finishing feeling you could go further'], avoid: ['Drifting too fast ("grey zone")', 'Forcing the pace', 'Skipping them because they feel slow'], demo: null, media: null },
  long_run: { name: 'Long run', type: 'run', summary: 'Your longest run of the week — builds endurance and fatigue resistance.', how: ['Start easy and stay mostly conversational.', 'Fuel and hydrate if it\'s over ~75–90 min.', 'Some long runs finish with a faster/goal-pace segment.', 'Cover the distance — pace matters less than time on feet.'], lookFor: ['Steady, even effort', 'Good fuelling on longer ones', 'Strong, controlled finish'], avoid: ['Starting too fast', 'Skipping fuel/hydration', 'Turning every long run into a race'], demo: null, media: null },
  tempo: { name: 'Tempo / threshold', type: 'run', summary: '"Comfortably hard" running at around your one-hour race pace — raises your lactate threshold.', how: ['Warm up easy for 10–15 min.', 'Settle into a controlled, comfortably-hard effort.', 'You could speak only a few words at a time.', 'Cool down easy.'], lookFor: ['Controlled, even "comfortably hard" effort', 'Relaxed form under pressure', 'Even or slightly negative splits'], avoid: ['Treating it as a race', 'Starting too hard and fading', 'Going into the gasping-for-air zone'], demo: null, media: null },
  vo2: { name: 'VO₂max intervals', type: 'run', summary: 'Hard repeats around 3k–5k pace with jog recoveries — lifts your ceiling.', how: ['Warm up well with easy running + a few strides.', 'Run each rep strong and even, around 3k–5k effort.', 'Jog the recoveries — let the heart rate come down a bit.', 'Cool down easy.'], lookFor: ['Even splits across all reps', 'Strong but controlled — not all-out on rep 1', 'Good form even when it bites'], avoid: ['Going too fast early and dying', 'Cutting the warm-up', 'Sprinting the recoveries'], demo: null, media: null },
  fartlek: { name: 'Fartlek', type: 'run', summary: '"Speed play" — relaxed surges mixed into a run, less rigid than intervals.', how: ['Warm up easy.', 'Alternate faster surges with easy floats (e.g. 2 min on / 2 min off).', 'Keep the surges quick but relaxed, not all-out.', 'Great for varying terrain and feel.'], lookFor: ['Quick but relaxed surges', 'Smooth transitions in and out', 'Consistent effort across surges'], avoid: ['Sprinting the surges', 'Skipping the easy floats', 'Losing form when tired'], demo: null, media: null },
  strides: { name: 'Strides', type: 'run', summary: 'Short, fast-but-relaxed accelerations — sharpen form and turnover without fatigue.', how: ['After an easy run, run ~20s building to fast-but-smooth.', 'Focus on quick, light leg turnover and tall posture.', 'Full recovery walk/jog between each.', 'Stay relaxed — these are not sprints.'], lookFor: ['Smooth acceleration, relaxed speed', 'Quick, light cadence', 'Tall, easy posture'], avoid: ['All-out sprinting', 'Tensing up', 'Skipping the recovery'], demo: null, media: null },
  goal_pace: { name: 'Goal-pace running', type: 'run', summary: 'Running at your target race pace to rehearse race rhythm and economy.', how: ['Warm up easy.', 'Lock into your exact goal race pace for the prescribed reps/segment.', 'Focus on how that pace feels — rhythm, breathing, form.', 'Float/jog the recoveries.'], lookFor: ['Hitting goal pace evenly', 'Relaxed at race effort', 'Consistent rhythm'], avoid: ['Drifting faster than goal pace', 'Uneven splits', 'Forcing it on tired legs'], demo: null, media: null },
  sharpener: { name: 'Sharpener', type: 'run', summary: 'A short, snappy taper-week session to stay sharp without fatigue.', how: ['Easy warm-up.', 'A few short, quick efforts at goal pace or a touch faster.', 'Long, easy recoveries — keep it well within yourself.', 'Total volume is tiny — the point is freshness, not work.'], lookFor: ['Snappy but controlled efforts', 'Feeling fresh, not worked', 'Good leg speed'], avoid: ['Doing too much in taper', 'Chasing times', 'Turning it into a workout'], demo: null, media: null },

  // ---------------- Accessory / isolation / drills (first-draft demos) ----------------
  tricep: { name: 'Triceps extension', type: 'strength', summary: 'Elbow-extension isolation for the triceps (pushdown, overhead, kickback).', how: ['Pin the elbows in place.', 'Straighten the elbows fully.', 'Lower under control to a stretch.'], lookFor: ['Elbows stay still', 'Full lockout', 'Controlled lowering'], avoid: ['Elbows flaring/drifting', 'Using momentum', 'Half reps'], demo: 'tricep', media: null },
  fly: { name: 'Chest fly', type: 'strength', summary: 'Open and squeeze the arms across the chest — pec isolation (DB, cable, pec deck).', how: ['Slight, fixed bend in the elbows.', 'Open wide to a chest stretch.', 'Squeeze the arms together.'], lookFor: ['Fixed elbow angle', 'Wide stretch then squeeze', 'Chest does the work'], avoid: ['Bending/pressing with the elbows', 'Going too heavy', 'Shrugging'], demo: 'fly', media: null },
  legext: { name: 'Leg extension', type: 'strength', summary: 'Seated knee-extension isolation for the quads.', how: ['Sit tall, shins hanging.', 'Straighten the knees fully.', 'Lower slowly.'], lookFor: ['Smooth full extension', 'Brief squeeze at the top', 'Controlled lowering'], avoid: ['Swinging/kicking', 'Banging the weight down', 'Half reps'], demo: 'legext', media: null },
  proney: { name: 'Prone raise (Y/T/W)', type: 'strength', summary: 'Lying face down, lift the arms to work the mid/lower traps and rear delts.', how: ['Lie face down, arm(s) reaching out.', 'Lift a short way, squeezing the upper back.', 'Lower with control.'], lookFor: ['Movement from the shoulder blades', 'Neck neutral', 'Small, controlled lift'], avoid: ['Yanking up', 'Shrugging to the ears', 'Arching the low back'], demo: 'proney', media: null },
  serratus: { name: 'Serratus punch / wall slide', type: 'strength', summary: 'Protraction work for the serratus anterior — reach the arm forward at shoulder height.', how: ['Arm straight out at shoulder height.', 'Reach/punch forward — the shoulder blade slides forward.', 'Return with control.'], lookFor: ['Shoulder blade glides forward', 'Elbow stays straight', 'Small, controlled reach'], avoid: ['Bending the elbow', 'Shrugging up', 'Rushing'], demo: 'serratus', media: null },
  er: { name: 'External rotation', type: 'strength', summary: 'Rotator-cuff work — rotate the forearm outward with the elbow pinned.', how: ['Elbow tucked at your side, bent 90°.', 'Rotate the forearm outward/up.', 'Lower with control.'], lookFor: ['Elbow stays pinned', 'Slow, controlled rotation', 'Light load'], avoid: ['Elbow drifting away', 'Using the wrist', 'Too heavy'], demo: 'er', media: null },
  clean: { name: 'Clean (power / hang)', type: 'strength', summary: 'Explosive triple-extension pull — bar from the floor/hang to the front rack.', how: ['Set up over the bar, flat back.', 'Explode up — extend hips, knees, ankles and pull tall.', 'Drop under and catch in the front rack, then stand.'], lookFor: ['Powerful full extension', 'Fast elbows into the rack', 'Soft, balanced catch'], avoid: ['Early arm pull', 'Rounding the back', 'Slow under the bar'], demo: 'clean', media: null },
  sled: { name: 'Sled push', type: 'strength', summary: 'Drive a loaded sled forward — leg power and conditioning with no eccentric.', how: ['Lean into the sled, arms long.', 'Drive hard through alternating legs.', 'Keep a strong, steady push.'], lookFor: ['Strong forward lean', 'Powerful leg drive', 'Steady steps'], avoid: ['Standing too upright', 'Tiny choppy steps', 'Hips rising/dropping'], demo: 'sled', media: null },
  abduction: { name: 'Hip abduction', type: 'strength', summary: 'Take the top leg out to the side against gravity — glute med strength, lying on your side.', how: ['Lie on your side, propped on the bottom forearm, legs stacked.', 'Lift the top leg up and away; keep the bottom leg down.', 'Lower with control.'], lookFor: ['Movement from the hip', 'Level pelvis', 'Controlled tempo'], avoid: ['Rolling the hips back', 'Using momentum', 'Letting the knee cave'], demo: 'abduction', media: null },
  band_walk: { name: 'Lateral band walk', type: 'strength', summary: 'Crab-walk sideways against a band around the ankles — glute med endurance.', how: ['Band around the ankles, athletic half-squat stance.', 'Take a big step out to the side with the lead foot.', 'Let the trailing foot catch up; keep tension on the band.', 'Travel one way, then back the other.'], lookFor: ['Constant band tension', 'Stay low and level', 'Toes forward, knees out'], avoid: ['Letting the knees cave in', 'Standing up tall between steps', 'Feet clicking together (losing tension)'], demo: 'bandwalk', media: null },
  birddog: { name: 'Bird dog', type: 'mobility', summary: 'Quadruped anti-rotation — extend the opposite arm and leg while keeping the trunk still.', how: ['On hands and knees, flat back.', 'Reach the opposite arm forward and leg back.', 'Return slowly, then switch sides.'], lookFor: ['Level, still hips', 'Long straight reach', 'No trunk rotation'], avoid: ['Hips tipping/rotating', 'Arching the low back', 'Rushing'], demo: 'birddog', media: null },
  catcamel: { name: 'Cat-camel', type: 'mobility', summary: 'Quadruped spinal mobility — alternately round and arch the whole spine.', how: ['On hands and knees.', 'Round the back up and tuck the chin.', 'Then arch — drop the belly and look up.'], lookFor: ['Smooth, full spinal motion', 'Move slowly through the range', 'Easy breathing'], avoid: ['Forcing the end range', 'Moving only the low back', 'Rushing'], demo: 'catcamel', media: null },

  // ---------------- dedicated splits of earlier stand-ins (first-draft demos) ----------------
  tibraise: { name: 'Tibialis raise', type: 'strength', summary: 'Pull the toes up toward the shins against resistance — strengthens the shin (tibialis anterior).', how: ['Heels down, lean back slightly if standing.', 'Pull the toes/forefoot up as high as you can.', 'Lower the toes slowly.'], lookFor: ['Heels stay planted', 'Full toes-up range', 'Slow lowering'], avoid: ['Bending the knees to cheat', 'Rushing the lower', 'Half range'], demo: 'tibraise', media: null },
  legpress: { name: 'Leg press', type: 'strength', summary: 'Seated machine press — knees bend toward the chest, then drive the platform away.', how: ['Feet on the platform, knees bent toward the chest.', 'Press the legs out without locking hard.', 'Return under control to the start.'], lookFor: ['Even drive through both feet', 'Knees track over the toes', 'Smooth controlled return'], avoid: ['Slamming into lockout', 'Heels lifting', 'Knees caving in'], demo: 'legpress', media: null },
  pullover: { name: 'Dumbbell pullover', type: 'strength', summary: 'Lying back, take the weight from over the chest to overhead and back — lats and chest.', how: ['Lie back, weight held over the chest.', 'Reach it back over your head, feeling the stretch.', 'Pull it back over the chest.'], lookFor: ['Slight fixed elbow bend', 'Big controlled stretch', 'Ribs down, no big arch'], avoid: ['Flaring the ribs', 'Bending the elbows to press', 'Going too heavy'], demo: 'pullover', media: null },
  swing: { name: 'Kettlebell swing', type: 'strength', summary: 'Ballistic hip hinge — snap the hips to swing the bell up; it floats, then falls back.', how: ['Hinge and hike the bell back between the legs.', 'Snap the hips forward to swing it up to chest height.', 'Let it fall, absorb with a hinge, repeat.'], lookFor: ['Power from the hips, not the arms', 'Flat back throughout', 'Bell floats at the top'], avoid: ['Squatting it up', 'Lifting with the arms/shoulders', 'Rounding the back'], demo: 'swing', media: null },
  goodmorning: { name: 'Good morning', type: 'strength', summary: 'Barbell-on-back hip hinge — bow forward and stand, loading the hamstrings and back.', how: ['Bar on your upper back, soft knees.', 'Push the hips back and bow forward with a flat back.', 'Stand tall, squeezing the glutes.'], lookFor: ['Hips travel back', 'Flat back throughout', 'Shins stay fairly vertical'], avoid: ['Rounding the back', 'Squatting instead of hinging', 'Going too heavy too soon'], demo: 'goodmorning', media: null },
  dip: { name: 'Dip', type: 'strength', summary: 'Vertical push — lower the body between bars/on a bench, then press back up.', how: ['Support yourself with straight arms.', 'Lower until the elbows reach ~90°, chest slightly forward.', 'Press back up to a strong lockout.'], lookFor: ['Controlled lowering', 'Shoulders stay down (no shrug)', 'Full press to lockout'], avoid: ['Dropping too deep/too fast', 'Shrugging the shoulders up', 'Flaring the elbows wide'], demo: 'dip', media: null },
  hanging: { name: 'Hanging knee raise', type: 'strength', summary: 'Hanging from a bar, raise the knees toward the chest — lower abs and grip.', how: ['Dead hang, shoulders set (not fully relaxed).', 'Raise the knees toward the chest, curling the pelvis.', 'Lower the legs with control — no swinging.'], lookFor: ['Controlled, no swing', 'Pelvis curls up at the top', 'Shoulders stay packed'], avoid: ['Swinging/kipping', 'Just hip-flexing with a flat back', 'Dropping the legs fast'], demo: 'hanging', media: null },
  abwheel: { name: 'Ab-wheel rollout', type: 'strength', summary: 'Kneeling, roll the wheel out into a long braced body, then pull back with the abs.', how: ['Kneel with the wheel under your shoulders.', 'Roll out as far as you can keep a braced, flat trunk.', 'Pull back with the abs, ribs down.'], lookFor: ['Long, braced trunk', 'Ribs down, no low-back sag', 'Smooth control both ways'], avoid: ['Letting the low back arch/sag', 'Rolling out past your control', 'Pulling with the arms only'], demo: 'abwheel', media: null },
  woodchop: { name: 'Cable woodchop', type: 'strength', summary: 'Diagonal anti-rotation/rotation — chop from high on one side to low on the other.', how: ['Set up tall, handle high to one side.', 'Chop diagonally across the body, rotating from the trunk.', 'Control it back to the top.'], lookFor: ['Rotation from the trunk/hips', 'Braced core', 'Smooth controlled path'], avoid: ['Yanking with the arms', 'Letting the low back twist', 'Rushing back to the top'], demo: 'woodchop', media: null },
  pallof_press: { name: 'Pallof press', type: 'strength', summary: 'Anti-rotation core: stand side-on to a cable/band, press the handle straight out and resist it trying to twist you.', how: ['Stand side-on to a cable set at chest height, handle held at the chest with both hands.', 'Brace, then press the handle straight out in front until the arms are extended.', 'The cable pulls you toward the machine — resist any rotation, stay square.', 'Bring it back to the chest under control; do both sides.'], lookFor: ['Hips and shoulders stay square (no twist)', 'Ribs down, braced core', 'Smooth press straight out and back'], avoid: ['Letting the torso rotate toward the cable', 'Holding your breath', 'Standing too close (no tension)'], demo: 'pallof', media: null },
  frontsquat: { name: 'Front squat', type: 'strength', summary: 'Squat with the bar in the front rack — keeps the torso upright and loads the quads.', how: ['Bar across the front of the shoulders, elbows high.', 'Sit down between your hips, torso tall, bar over mid-foot.', 'Drive up, keeping the elbows high.'], lookFor: ['Tall, upright torso', 'Elbows stay high', 'Bar stays over mid-foot'], avoid: ['Elbows dropping', 'Chest collapsing forward', 'Heels lifting'], demo: 'frontsquat', media: null },
  goblet: { name: 'Goblet squat', type: 'strength', summary: 'Squat holding a dumbbell/kettlebell at the chest — easy to learn, keeps you upright.', how: ['Hold the weight at your chest, elbows down.', 'Sit down between your hips, chest up.', 'Drive up through mid-foot.'], lookFor: ['Weight stays at the chest', 'Upright chest', 'Knees track over the toes'], avoid: ['Weight drifting away from the chest', 'Rounding forward', 'Heels lifting'], demo: 'goblet', media: null }
};

// name (lowercased) → library key. First matching pattern wins.
const ALIASES = [
  [/bench press/, 'bench'],
  [/single-?leg (hip|hinge|deadlift|rdl)|single-?leg.*hinge|sl.?dl|single-?leg.*rdl/, 'sldl'],
  [/romanian deadlift|\brdl\b/, 'rdl'],
  [/trap-bar|hex deadlift|deadlift/, 'deadlift'],
  [/front.?squat/, 'frontsquat'],
  [/goblet/, 'goblet'],
  [/back squat|^squat|wall sit|tempo squat/, 'squat'],
  [/overhead press|shoulder press|\bohp\b|pike push/, 'ohp'],
  [/pull-up|pullup|lat pulldown|pulldown|chin-up/, 'pullup'],
  [/\brow\b/, 'row'],
  [/split squat|lunge|bulgarian/, 'split_squat'],
  [/hip thrust|glute bridge/, 'hip_thrust'],
  [/seated calf|soleus/, 'seated_calf_raise'],
  [/calf raise|standing calf/, 'calf_raise'],
  [/loaded carry|farmer/, 'carry'],
  [/push-up|push up|pushup/, 'pushup'],
  [/pallof/, 'pallof_press'],
  [/plank|hollow|dead bug/, 'plank'],
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
  [/goal-pace|goal pace|race-pace|race pace/, 'goal_pace'],
  // --- dedicated movements (specific patterns first, before broader stand-ins) ---
  [/tibialis/, 'tibraise'],
  [/leg.?press|\bhack\b/, 'legpress'],
  [/\bpullover\b/, 'pullover'],
  [/kettlebell swing|kb swing|\bswing\b/, 'swing'],
  [/good morning/, 'goodmorning'],
  [/\bdip\b/, 'dip'],
  [/hanging knee|hanging leg/, 'hanging'],
  [/ab wheel|ab-wheel|rollout/, 'abwheel'],
  [/woodchop|wood chop|\bchop\b/, 'woodchop'],
  // --- accessory / isolation / variant coverage ---
  [/triceps|tricep|pushdown|skull-?crusher|jm press/, 'tricep'],
  [/leg extension/, 'legext'],
  [/leg curl|nordic|hamstring curl|glute-?ham|\bghr\b/, 'nordic'],
  [/rear.?delt|reverse pec|prone [ytw]|[ytw] raise|pull-?apart/, 'proney'],
  [/pec deck|chest fly|cable fly|\bfly\b/, 'fly'],
  [/serratus|wall slide/, 'serratus'],
  [/external rotation|\ber\b|rotator/, 'er'],
  [/\bclean\b/, 'clean'],
  [/\bsled\b/, 'sled'],
  [/band walk|lateral walk|crab walk|monster walk/, 'band_walk'],
  [/abduction|side-?lying hip/, 'abduction'],
  [/bird.?dog/, 'birddog'],
  [/cat-?camel|thoracic/, 'catcamel'],
  [/knee raise|hollow/, 'plank'],
  [/box squat|cossack|pause squat|bodyweight squat|squat to box|pistol|wall sit|tempo squat/, 'squat'],
  [/hip hinge/, 'rdl'],
  [/rack pull|deficit|prone hip ext|hip extension/, 'deadlift'],
  [/incline|floor press|close-?grip|chest press/, 'bench'],
  [/landmine press/, 'ohp'],
  [/suitcase|backpack|\bcarry\b/, 'carry'],
  [/pogo|box jump|depth jump|broad jump|\bbound|a-?skip|\bskip\b|\bjump\b/, 'plyo'],
  [/plantarflexion|\bankle\b/, 'calf_raise'],
  [/90\/90|hip flexor|couch stretch/, 'split_squat'],
  [/glute bridge|single-?leg glute/, 'hip_thrust']
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
