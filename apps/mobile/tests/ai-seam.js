// tests/ai-seam.js — WP-60: the AIGAS mechanisms, behind flags (Simon decides go-live).
//
// Seam 1 (decision substitution): decision contracts exist as CODE artefacts and every
// proposal is disposed of by the deterministic D14 validators — AI proposes, validators
// dispose (AIGAS §6.2, Constitution Arts 18/19). Seam 2 (knowledge/priors) already exists
// via the typed priors read-path. The engine NEVER depends on AI (AIGAS §3: "the engine
// runs without AI; AI never runs without the engine") — pinned here as greps.
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ENGINE_SRC = path.join(__dirname, '..', '..', '..', 'packages', 'engine', 'src');

// ── Seam 1 · decision contracts are code artefacts ────────────────────────────
const { DECISION_CONTRACTS, contractFor, validateProposal } = await import('@performance-os/engine/lib/ai/contracts.js');
const { generatePlan } = await import('@performance-os/engine/lib/PlanGenerator.js');
const { answersToProfile, BLANK_ANSWERS } = await import('../src/lib/onboardingModel.js');

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];

// T1 — the declared-substitutable decisions carry contracts.
assert(contractFor('D11') && contractFor('D11').substitutable === true, 'T1a D11 declares a substitutable contract');
assert(Object.values(DECISION_CONTRACTS).every((c) => c.id && c.decides && c.proposalShape),
  'T1b every contract names what it decides and its proposal shape');

// T2 — a proposal that IS the deterministic output passes (the engine is always a valid proposer).
const plan = generatePlan({
  ...answersToProfile({ ...BLANK_ANSWERS, goalType: 'sport', sport: 'run', runDiscipline: 'middle', sportIntent: 'recreational', experienceLevel: 'intermediate', daysPerWeek: 3, days: ['mon', 'wed', 'fri'], equipment: FULL }),
  plan_start_date: '2026-07-06',
});
const week = plan.phases[0].weeks[0];
const okVerdict = validateProposal('D11', week, { access: FULL, injuries: [] });
assert(okVerdict.accepted === true, `T2 the deterministic week passes its own contract (${JSON.stringify(okVerdict.findings.filter((f) => f.verdict !== 'pass').slice(0, 2))})`);

// T3 — a malformed proposal is refused at the shape gate (never reaches an athlete).
const badShape = validateProposal('D11', { sessions: 'not-an-array' }, { access: FULL });
assert(badShape.accepted === false && badShape.reason, 'T3 malformed proposal refused with a reason');

// T4 — a rule-violating proposal is refused by D14 (validators dispose).
const violating = JSON.parse(JSON.stringify(week));
violating.sessions[0].items.push({ num: 'Z1', name: 'Nordic curl', sets: '4 × 6', rpe: 'RPE 8', volumeFactor: 1 });
const inj = [{ body_part_key: 'hamstring', severity: 4, status: 'active', rehab_phase: 'protect' }];
const vetoed = validateProposal('D11', violating, { access: FULL, injuries: inj });
assert(vetoed.accepted === false, 'T4 a contraindicated proposal is VETOED by the deterministic validators');

// T5 — unknown decisions cannot be substituted.
assert(validateProposal('D7', week, {}).accepted === false, 'T5 non-substitutable decision refused outright');

// ── §3 · the engine never depends on AI ───────────────────────────────────────
{
  const offenders = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!p.endsWith('.js')) continue;
      const rel = path.relative(ENGINE_SRC, p);
      const src = fs.readFileSync(p, 'utf8');
      // No decision module may import the ai/ seam (one-way dependency), and the pure
      // engine performs no IO — the AI client lives in the platform layer only.
      if (!rel.startsWith(path.join('lib', 'ai')) && /from '.*\/ai\//.test(src)) offenders.push(rel + ' imports ai/');
      if (/\bfetch\s*\(|XMLHttpRequest|require\(['"]https?/.test(src)) offenders.push(rel + ' performs network IO');
    }
  };
  walk(ENGINE_SRC);
  assert(offenders.length === 0, `§3 pin: engine has no AI/network dependency (${offenders.join('; ') || 'clean'})`);
}

// ── App seam · disabled by default, grounded, privacy-scoped ─────────────────
const _ls = {};
globalThis.localStorage = {
  getItem: (k) => (k in _ls ? _ls[k] : null),
  setItem: (k, v) => { _ls[k] = String(v); },
  removeItem: (k) => { delete _ls[k]; },
  clear: () => { for (const k of Object.keys(_ls)) delete _ls[k]; }
};
const { aiEnabled, buildWeekArtefact, RAW_VITAL_KEYS } = await import('../src/lib/AiService.js');

// T6 — off by default: no flag → disabled, and explain() never touches the network
// (we prove the artefact path is pure; the network call is gated on aiEnabled()).
assert(aiEnabled({}) === false && aiEnabled({ ai_features: false }) === false, 'T6a AI is OFF by default (Simon flips ai_features)');
assert(aiEnabled({ ai_features: true }) === true, 'T6b the flag enables it');

// T7 — the C2 artefact is grounded in EMITTED fields only and never carries raw vitals.
const art = buildWeekArtefact(
  { num: 2, deload: false, deloadReason: null, _ruleTrim: { ruleIds: ['x'], mult: 0.8 }, _catchUp: { sets: 6 },
    sessions: [{ title: 'Monday · Lower', _objective: { quality: 'maxStrength', purpose: 'p', rationale: 'r', source: 'style' }, items: [{ name: 'Back squat', sets: '4 × 5' }], hrv: 42 }] },
  { diagnosis: { sport: 'run', priorityQualities: [{ qualityId: 'robustness', rationale: 'why' }] }, provenance: { engineVersion: '1.0.0', knowledgeSetVersion: '1.2.0' } }
);
const flat = JSON.stringify(art).toLowerCase();
assert(RAW_VITAL_KEYS.every((k) => !flat.includes(`"${k}"`)), 'T7a no raw-vital key ever enters an AI artefact (AIGAS §19)');
assert(/rationale/.test(flat) && /provenance|engineversion/.test(flat), 'T7b artefact carries emitted rationale + provenance (grounding, AIGAS §7/§20)');
assert(!/hrv/.test(flat), 'T7c stray vitals on session objects are stripped, not forwarded');
