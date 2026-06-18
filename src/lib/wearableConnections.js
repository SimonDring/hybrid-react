/**
 * Pure helpers for the multi-device wearable model. No IO — easy to test.
 *
 * Role model: exactly one connected device is 'primary' (owns baseline/recovery
 * metrics); all others are 'secondary'. Workouts may come from any device.
 */

// The provider id of the primary device, or null if none is set.
export function primaryProvider(connections = []) {
  const hit = connections.find(c => c && c.role === 'primary');
  return hit ? hit.provider : null;
}

// Minimal role changes to make `chosenProvider` the sole primary:
//   - chosen → 'primary' (unless already)
//   - any OTHER current primary → 'secondary'
// Returns [] when nothing needs to change. Pure (no mutation).
export function computeRoleUpdates(connections = [], chosenProvider) {
  const updates = [];
  for (const c of connections) {
    if (!c) continue;
    if (c.provider === chosenProvider) {
      if (c.role !== 'primary') updates.push({ provider: c.provider, role: 'primary' });
    } else if (c.role === 'primary') {
      updates.push({ provider: c.provider, role: 'secondary' });
    }
  }
  return updates;
}

export default { primaryProvider, computeRoleUpdates };
