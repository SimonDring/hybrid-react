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

export default { primaryProvider };
