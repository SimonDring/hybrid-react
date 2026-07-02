import { buildDemandProfile } from '@performance-os/engine/lib/performance/demandProfile.js';
function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }

const cyc = buildDemandProfile('cycling', null);
assert(Array.isArray(cyc) && cyc.length > 0, 'T1 cycling yields a demand profile');
assert(cyc.every(d => d.qualityId && d.importance >= 0 && d.importance <= 1 && d.source === 'skb'), 'T2 shape: qualityId + 0..1 importance + source');
const aero = cyc.find(d => d.qualityId === 'aerobicCapacity');
assert(aero && aero.importance >= 0.9, 'T3 cycling aerobicCapacity is a high demand (importance 10 → ~1.0)');
// no duplicate quality ids (aggregated)
assert(new Set(cyc.map(d => d.qualityId)).size === cyc.length, 'T4 one entry per PM quality (aggregated, no dupes)');

// position boost: a climber elevates its primary qualities
const climber = buildDemandProfile('cycling', 'GC / Climber (road)');
const relS = climber.find(d => d.qualityId === 'maxStrength');
assert(relS && relS.importance >= 0.85, 'T5 position primaryQualities boosted (relativeStrength→maxStrength ≥0.85)');

// safety
assert(Array.isArray(buildDemandProfile('unknown_sport', null)) && buildDemandProfile('unknown_sport', null).length === 0, 'T6 unknown sport → [] (never throws)');
assert(buildDemandProfile('cycling', 'no-such-position').length > 0, 'T7 unknown position falls back to base demand');
