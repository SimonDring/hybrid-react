// Builds a Performance-Model demand profile from the SKB: base importances from the sport's
// physicalProfile, elevated for the chosen position's primary qualities. Pure; imports in-package
// SKB data directly (same pattern as estimation.js). Never throws on unknown sport/position.
import * as SKB from '../sportKnowledge/index.js';
import { mapSkbQuality } from '../../data/sportQualityMap.js';

const PRIMARY_FLOOR = 0.9;   // a position's primary qualities are at least this demanding

// The ONE walk over the SKB structures (whole-branch review 2026-07-13: the
// projection and the honesty ledger used to duplicate this traversal — same
// 0..1 scaling, same PRIMARY_FLOOR — and could drift apart). Every authored
// quality lands in exactly one of two maps, under the SAME semantics:
//   projected — pmId → { importance, evidence }   (mapSkbQuality knows it)
//   dropped   — skbName → { importance, evidence } (the projection cannot carry it)
function walkDemands(sportId, positionId) {
  const projected = new Map();
  const dropped = new Map();
  const profile = SKB.get(sportId);
  if (!profile || !profile.physicalProfile || !profile.physicalProfile.qualities) return { projected, dropped };

  // base: importance scaled 0..1; mapped qualities keep the MAX per PM quality
  for (const [skbName, q] of Object.entries(profile.physicalProfile.qualities)) {
    if (!q || typeof q.importance !== 'number') continue;
    const pm = mapSkbQuality(skbName);
    const importance = Math.min(1, Math.max(0, q.importance / 10));
    if (pm) {
      const cur = projected.get(pm);
      if (!cur || importance > cur.importance) projected.set(pm, { importance, evidence: `skb:${sportId}:${skbName}` });
    } else {
      dropped.set(skbName, { importance, evidence: `skb:${sportId}:${skbName}` });
    }
  }

  // position boost: the position's primaryQualities are elevated to the floor —
  // on whichever side of the projection seam they land
  const positions = SKB.section(sportId, 'positions') || [];
  const pos = positions.find((p) => p.name === positionId);
  if (pos && Array.isArray(pos.primaryQualities)) {
    for (const skbName of pos.primaryQualities) {
      const pm = mapSkbQuality(skbName);
      const side = pm ? projected : dropped;
      const key = pm || skbName;
      const cur = side.get(key);
      if (!cur || cur.importance < PRIMARY_FLOOR) side.set(key, { importance: PRIMARY_FLOOR, evidence: `skb:${sportId}:pos:${positionId}` });
    }
  }

  return { projected, dropped };
}

export function buildDemandProfile(sportId, positionId) {
  const { projected } = walkDemands(sportId, positionId);
  return [...projected.entries()].map(([qualityId, v]) => ({ qualityId, importance: v.importance, source: 'skb', evidence: v.evidence }));
}

// The honesty ledger (Art 15, P0-6): authored SKB demand the projection could NOT carry into
// the Performance Model — declared, never silently discarded. Same traversal as the projection
// (walkDemands), so the two can never disagree on scaling or the position floor. Deterministic
// order (importance desc, then name asc). Pure; never throws on unknown sport/position.
export function droppedDemandsFor(sportId, positionId) {
  const { dropped } = walkDemands(sportId, positionId);
  return [...dropped.entries()]
    .map(([skbQuality, v]) => ({ skbQuality, importance: v.importance, source: 'skb', evidence: v.evidence }))
    .sort((a, b) => (b.importance - a.importance) || a.skbQuality.localeCompare(b.skbQuality));
}
