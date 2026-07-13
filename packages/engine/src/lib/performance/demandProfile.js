// Builds a Performance-Model demand profile from the SKB: base importances from the sport's
// physicalProfile, elevated for the chosen position's primary qualities. Pure; imports in-package
// SKB data directly (same pattern as estimation.js). Never throws on unknown sport/position.
import * as SKB from '../sportKnowledge/index.js';
import { mapSkbQuality } from '../../data/sportQualityMap.js';

const PRIMARY_FLOOR = 0.9;   // a position's primary qualities are at least this demanding

export function buildDemandProfile(sportId, positionId) {
  const profile = SKB.get(sportId);
  if (!profile || !profile.physicalProfile || !profile.physicalProfile.qualities) return [];

  // base: max importance per PM quality across all contributing SKB qualities
  const byPm = new Map(); // pmId → { importance, evidence }
  for (const [skbName, q] of Object.entries(profile.physicalProfile.qualities)) {
    const pm = mapSkbQuality(skbName);
    if (!pm || !q || typeof q.importance !== 'number') continue;
    const importance = Math.min(1, Math.max(0, q.importance / 10));
    const cur = byPm.get(pm);
    if (!cur || importance > cur.importance) byPm.set(pm, { importance, evidence: `skb:${sportId}:${skbName}` });
  }

  // position boost: elevate the position's primaryQualities to the floor
  const positions = SKB.section(sportId, 'positions') || [];
  const pos = positions.find((p) => p.name === positionId);
  if (pos && Array.isArray(pos.primaryQualities)) {
    for (const skbName of pos.primaryQualities) {
      const pm = mapSkbQuality(skbName);
      if (!pm) continue;
      const cur = byPm.get(pm) || { importance: 0, evidence: `skb:${sportId}:position` };
      if (cur.importance < PRIMARY_FLOOR) byPm.set(pm, { importance: PRIMARY_FLOOR, evidence: `skb:${sportId}:pos:${positionId}` });
    }
  }

  return [...byPm.entries()].map(([qualityId, v]) => ({ qualityId, importance: v.importance, source: 'skb', evidence: v.evidence }));
}

// The honesty ledger (Art 15, P0-6): authored SKB demand the projection could NOT carry into
// the Performance Model — declared, never silently discarded. Mirrors buildDemandProfile's own
// semantics: importance scaled 0..1, position primaries floored at PRIMARY_FLOOR. Deterministic
// order (importance desc, then name asc). Pure; never throws on unknown sport/position.
export function droppedDemandsFor(sportId, positionId) {
  const profile = SKB.get(sportId);
  if (!profile || !profile.physicalProfile || !profile.physicalProfile.qualities) return [];

  const dropped = new Map(); // skbQuality → { importance, evidence }
  for (const [skbName, q] of Object.entries(profile.physicalProfile.qualities)) {
    if (mapSkbQuality(skbName) || !q || typeof q.importance !== 'number') continue;
    const importance = Math.min(1, Math.max(0, q.importance / 10));
    dropped.set(skbName, { importance, evidence: `skb:${sportId}:${skbName}` });
  }

  // a dropped quality that is a position PRIMARY is at least as demanding as the
  // projection would have made it (same floor buildDemandProfile applies)
  const positions = SKB.section(sportId, 'positions') || [];
  const pos = positions.find((p) => p.name === positionId);
  if (pos && Array.isArray(pos.primaryQualities)) {
    for (const skbName of pos.primaryQualities) {
      if (mapSkbQuality(skbName)) continue;
      const cur = dropped.get(skbName);
      if (!cur) dropped.set(skbName, { importance: PRIMARY_FLOOR, evidence: `skb:${sportId}:pos:${positionId}` });
      else if (cur.importance < PRIMARY_FLOOR) dropped.set(skbName, { importance: PRIMARY_FLOOR, evidence: `skb:${sportId}:pos:${positionId}` });
    }
  }

  return [...dropped.entries()]
    .map(([skbQuality, v]) => ({ skbQuality, importance: v.importance, source: 'skb', evidence: v.evidence }))
    .sort((a, b) => (b.importance - a.importance) || a.skbQuality.localeCompare(b.skbQuality));
}
