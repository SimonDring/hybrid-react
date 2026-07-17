/**
 * provenance-review — the science / provenance review packet harness (routed in
 * docs/design/m6/GOVERNANCE-SWEEP-STATUS.md; closure §3 rows 2/8/13 + rows 4/5 + the M4a
 * contraindication vocab).
 *
 * Run: `npm run provenance:review -w @performance-os/engine`  (node packages/engine/tools/provenance-review.mjs)
 *
 * Read-only. Surfaces every science/provenance item that needs Simon's (+ a scientist's) judgement,
 * PRIORITISED — safety-critical gate-tier first, then modifiers, then the provenance shape-upgrades,
 * then staleness. It changes nothing; it makes the review a checklist.
 */
import { DIAGNOSES } from '../src/data/injuryTaxonomy.js';
import { INJURY_CONTRAINDICATIONS } from '../src/lib/injury/contraindicationVocab.js';
import kb from '../src/lib/knowledge/kb.js';

const bar = (s) => `\n${'═'.repeat(80)}\n${s}\n${'═'.repeat(80)}`;

// ── A. SAFETY-CRITICAL (gate-tier, Art 8) — do first ──────────────────────────
console.log(bar('A · SAFETY-CRITICAL — gate-tier, do first (Art 8: a gate needs high-confidence knowledge)'));

console.log('\n  ROW 4 — injuryTaxonomy `high_risk` flags (immediate professional-referral gate, NO citations today).');
console.log('  These MUST carry citations before they can gate (Art 13). Flagged high_risk:');
let hi = 0;
for (const region of Object.keys(DIAGNOSES)) {
  const flagged = (DIAGNOSES[region] || []).filter((d) => d.high_risk);
  if (flagged.length) { hi += flagged.length; console.log(`    ${region.padEnd(16)} ${flagged.map((d) => d.key).join(', ')}`); }
}
console.log(`    → ${hi} high_risk diagnoses need a referral citation each.`);

console.log('\n  CONTRAINDICATION vocab (M4a caveat 2) — exercises CLEARED from a contraindicated pattern');
console.log('  (blocked ⇔ pattern contraindicated AND id NOT in clearedIds). Review: should each stay cleared?');
const cleared = new Map(); // id → Set(regions where it's cleared from a contraindicated pattern)
for (const region of Object.keys(INJURY_CONTRAINDICATIONS)) {
  const cell = INJURY_CONTRAINDICATIONS[region];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node.clearedIds)) for (const id of node.clearedIds) (cleared.get(id) || cleared.set(id, new Set()).get(id)).add(region);
    for (const v of Object.values(node)) if (v && typeof v === 'object') walk(v);
  };
  walk(cell);
}
const ballisticOlympic = ['hang_clean', 'power_clean', 'snatch', 'clean_and_jerk', 'power_snatch', 'hang_snatch', 'split_jerk', 'push_press', 'broad_jump', 'depth_jump', 'bounding_a_skip'];
console.log('    ballistic/olympic lifts + plyo drills that are CLEARED (never blocked) somewhere:');
for (const id of ballisticOlympic) {
  const regions = cleared.get(id);
  if (regions && regions.size) console.log(`      ${id.padEnd(16)} cleared in: ${[...regions].join(', ')}`);
}
console.log(`    → confirm each ballistic/olympic clearance is a deliberate safety call, not an omission.`);

// ── B. MODIFIER science (row 5 + the age/sex family gap) ──────────────────────
console.log(bar('B · MODIFIER SCIENCE — row 5 (age/sex modifier family)'));
console.log('  `femaleRepBump` = +2 reps (sessionBuilder.js) — the engine\'s ONLY sex modifier, ungoverned.');
console.log('  Review: is +2 right? And the family GAP — there is NO age/developmental modifier at all');
console.log('  (Art 21 binds youth/LTAD). Decide the age/sex modifier family (feeds M6 sub-phase (d)).');

// ── C. PROVENANCE shape-upgrades (rows 2/8/13) ────────────────────────────────
console.log(bar('C · PROVENANCE SHAPE-UPGRADES — rows 2/8/13 (per-entry confidence + source)'));
const kbEntries = kb.all();
const withProv = kbEntries.filter((e) => e.confidence && (e.source || e.evidenceLevel));
console.log(`  Governed KB (entries.js): ${withProv.length}/${kbEntries.length} entries carry machine-readable confidence+source (the SHAPE to match).`);
console.log('\n  Tables whose provenance is COMMENT-ONLY today (make it machine-readable — needs per-entry sourcing):');
const rows = [
  ['ROW 2', 'data/muscleVolume.js', 'PATTERN_CONTRIB fractional-set weights (the whole volume-ledger input)'],
  ['ROW 8', 'data/strengthExercises.js', 'exercise axial / CNS / level / stretch tags — per-tag provenance or seed label'],
  ['ROW 13', 'data/selectionScoring.js · schedulingPolicy.js · blockPriors.js · capabilityPriors.js', 'the comment-provenance band —'],
  ['ROW 13', 'data/regionQualityRisk.js · strengthStandards.js · goalDemand.js · periodizationDefaults.js · exerciseQualities.js', '  machine-readable confidence+source per entry'],
];
for (const [row, file, what] of rows) console.log(`    ${row.padEnd(7)} ${file}\n            ${what}`);
console.log('    → each is a per-entry sourcing decision (confidence + citation) — NOT a mechanical move.');

// ── D. STALENESS (KV-6) ───────────────────────────────────────────────────────
console.log(bar('D · STALENESS (KV-6) — KB entries older than 18 months (as of the date you pass)'));
const asOf = process.argv[2] || null; // pass a YYYY-MM-DD; no clock read in the engine (TR-18)
if (!asOf) {
  console.log('  Pass a reference date to list stale entries, e.g.:');
  console.log('    node packages/engine/tools/provenance-review.mjs 2026-07-16');
} else {
  const stale = kb.staleEntries(18, asOf);
  console.log(`  As of ${asOf}: ${stale.length} entries past their 18-month review window.`);
  for (const e of stale.slice(0, 20)) console.log(`    ${e.id.padEnd(34)} lastReviewed ${e.lastReviewed}`);
}

console.log(bar('Priority: A (safety) → B (modifiers) → C (provenance) → D (staleness). Give me your calls table-by-table; I apply them as governed, stamp-only changes and re-verify.'));
