// The onboarding sport list is DERIVED from the SKB: a sport is selectable iff its profile is
// sufficiently authored (completeness.complete) AND has an engine binding to plan it. Authoring a
// new flagship profile + adding its binding auto-adds it to onboarding — no wizard change needed.
import * as SKB from './index.js';
import { bindingFor } from '../../data/sportEngineBinding.js';

const humanize = (id) => id.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

export function selectableSports() {
  return SKB.ids()
    .filter((id) => SKB.completeness(id).complete && bindingFor(id))
    .map((id) => {
      const p = SKB.get(id);
      const label = (p && p.meta && (p.meta.label || p.meta.name)) || humanize(id);
      return { id, label };
    });
}

export function positionsFor(skbId) {
  const positions = SKB.section(skbId, 'positions');
  if (!Array.isArray(positions)) return [];
  return positions.map((pos) => ({ id: pos.name, name: pos.name }));
}
