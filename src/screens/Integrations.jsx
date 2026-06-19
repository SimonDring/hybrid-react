/**
 * Integrations — manage connected wearables. One card per provider from the
 * registry. Fitbit is live (connect / sync / reconnect / primary toggle); Garmin
 * and Strava are coming-soon placeholders. The "single primary owns baseline"
 * model is surfaced via the Primary/Secondary control on each connected device.
 */

import { useTrainingStore } from '../stores/trainingStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { listProviders } from '../data/providers.js';
import { primaryProvider } from '../lib/wearableConnections.js';
import { getFitbitAuthUrl, fitbitReconnectState } from '../lib/SyncService.js';

export default function Integrations() {
  const user            = useAuthStore(s => s.user);
  const connections     = useTrainingStore(s => s.connections);
  const fitbitConnection = useTrainingStore(s => s.fitbitConnection);
  const fitbitSyncing   = useTrainingStore(s => s.fitbitSyncing);
  const fitbitError     = useTrainingStore(s => s.fitbitError);
  const syncFitbitToday = useTrainingStore(s => s.syncFitbitToday);
  const setPrimaryDevice = useTrainingStore(s => s.setPrimaryDevice);

  const currentPrimary = primaryProvider(connections);
  const connect = () => { if (user) window.open(getFitbitAuthUrl(user.id), '_blank'); };

  return (
    <div style={{ padding: '8px 4px 32px' }}>
      <h2 className="h3" style={{ marginBottom: 4 }}>Integrations</h2>
      <p className="sub" style={{ fontSize: 12, marginBottom: 16 }}>
        Connect your wearables. Your <strong>primary</strong> device supplies your
        recovery data (resting HR, sleep, HRV); any device can add workouts.
      </p>

      {listProviders().map(p => {
        const conn = connections.find(c => c.provider === p.id) || null;
        const isPrimary = currentPrimary === p.id;
        return (
          <ProviderCard
            key={p.id}
            provider={p}
            connection={conn}
            isPrimary={isPrimary}
            isLiveFitbit={p.id === 'fitbit'}
            fitbitConnection={fitbitConnection}
            fitbitSyncing={fitbitSyncing}
            fitbitError={fitbitError}
            onConnect={connect}
            onSync={syncFitbitToday}
            onMakePrimary={() => setPrimaryDevice(p.id)}
          />
        );
      })}
    </div>
  );
}

function ProviderCard({
  provider, connection, isPrimary, isLiveFitbit, fitbitConnection,
  fitbitSyncing, fitbitError, onConnect, onSync, onMakePrimary
}) {
  const comingSoon = provider.status === 'coming_soon';
  const connected = !!connection;
  const caps = [
    provider.capabilities.baseline ? 'Baseline' : null,
    provider.capabilities.workouts ? 'Workouts' : null
  ].filter(Boolean).join(' + ');

  const reconnect = (isLiveFitbit && fitbitConnection)
    ? fitbitReconnectState({ connectedAt: fitbitConnection.connected_at, errorReason: fitbitError })
    : 'ok';

  return (
    <div style={{
      padding: '14px 16px', borderRadius: 12, marginBottom: 8,
      border: '1px solid var(--hairline)', background: 'var(--bg-surface)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-strong)' }}>
            {provider.label}
          </div>
          <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginTop: 2 }}>
            {comingSoon ? `Coming soon · ${caps}` : (connected ? `Connected · ${caps}` : caps)}
          </div>
        </div>
        {comingSoon ? (
          <span style={{ fontSize: 12, color: 'var(--txt-muted)', fontWeight: 600 }}>Coming soon</span>
        ) : !connected ? (
          <button onClick={onConnect} style={btnPrimary}>Connect</button>
        ) : (
          <button onClick={onSync} disabled={fitbitSyncing} style={btnGhost(fitbitSyncing)}>
            {fitbitSyncing ? 'Syncing…' : 'Sync now'}
          </button>
        )}
      </div>

      {/* Primary / Secondary control (live + connected only) */}
      {!comingSoon && connected && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          {isPrimary ? (
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--moss)' }}>● Primary device</span>
          ) : (
            <button onClick={onMakePrimary} style={{
              fontSize: 11, fontWeight: 600, color: 'var(--rust)', background: 'none',
              border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit'
            }}>
              Make primary
            </button>
          )}
        </div>
      )}

      {/* Reconnect nudge (live Fitbit only) */}
      {reconnect !== 'ok' && (() => {
        const now = reconnect === 'reconnect_now';
        const accent = now ? 'var(--rust)' : 'var(--ochre)';
        const bg     = now ? 'rgba(176,74,46,0.08)' : 'rgba(200,154,58,0.10)';
        const border = now ? 'rgba(176,74,46,0.25)' : 'rgba(200,154,58,0.30)';
        return (
          <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 9, background: bg, border: `1px solid ${border}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: accent }}>
              {now ? 'Fitbit needs reconnecting' : 'Fitbit access expires soon'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--txt-body)', marginTop: 2 }}>
              {now
                ? 'Your Google sign-in has expired, so syncing has stopped. Reconnect to resume.'
                : 'Reconnect now to keep your data syncing without a gap.'}
            </div>
            <button onClick={onConnect} style={{
              marginTop: 8, padding: '7px 12px', borderRadius: 8, border: 'none',
              background: accent, color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit'
            }}>
              Reconnect Fitbit
            </button>
          </div>
        );
      })()}

      {/* Non-reconnect sync errors stay visible */}
      {isLiveFitbit && fitbitError && reconnect !== 'reconnect_now' && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--txt-muted)', wordBreak: 'break-word' }}>
          Last sync error: {fitbitError}
        </div>
      )}
    </div>
  );
}

const btnPrimary = {
  padding: '8px 14px', borderRadius: 9, border: 'none', background: 'var(--rust)',
  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
};
const btnGhost = (busy) => ({
  padding: '8px 14px', borderRadius: 9, border: '1px solid var(--hairline)',
  background: 'transparent', color: busy ? 'var(--txt-muted)' : 'var(--txt-strong)',
  fontSize: 13, fontWeight: 600, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit'
});
