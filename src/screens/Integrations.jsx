/**
 * Integrations — manage connected wearables. One card per provider from the
 * registry. Fitbit and Strava are live; Garmin is a coming-soon placeholder.
 * The "single primary owns baseline" model is surfaced via the Primary control
 * on each connected device that has baseline capability.
 */

import { useTrainingStore } from '../stores/trainingStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { listProviders } from '../data/providers.js';
import { primaryProvider } from '../lib/wearableConnections.js';
import { getFitbitAuthUrl, getStravaAuthUrl, fitbitReconnectState } from '../lib/SyncService.js';

export default function Integrations() {
  const user             = useAuthStore(s => s.user);
  const connections      = useTrainingStore(s => s.connections);
  const fitbitConnection = useTrainingStore(s => s.fitbitConnection);
  const fitbitSyncing    = useTrainingStore(s => s.fitbitSyncing);
  const fitbitError      = useTrainingStore(s => s.fitbitError);
  const stravaSyncing    = useTrainingStore(s => s.stravaSyncing);
  const stravaError      = useTrainingStore(s => s.stravaError);
  const syncFitbitToday  = useTrainingStore(s => s.syncFitbitToday);
  const syncStrava       = useTrainingStore(s => s.syncStrava);
  const setPrimaryDevice = useTrainingStore(s => s.setPrimaryDevice);

  const currentPrimary = primaryProvider(connections);

  // Per-provider OAuth authorize URL. Top-level redirect (NOT window.open) — the
  // app is a standalone PWA where popups flash blank and bounce back.
  const authUrlFor = (id) => id === 'strava' ? getStravaAuthUrl(user.id) : getFitbitAuthUrl(user.id);
  const connectTo  = (id) => { if (user) window.location.href = authUrlFor(id); };

  return (
    <div style={{ padding: '8px 4px 32px' }}>
      <h2 className="h3" style={{ marginBottom: 4 }}>Integrations</h2>
      <p className="sub" style={{ fontSize: 12, marginBottom: 16 }}>
        Connect your wearables. Your <strong>primary</strong> device supplies your
        recovery data (resting HR, sleep, HRV); any device can add workouts.
      </p>

      {listProviders().map(p => {
        const conn = connections.find(c => c.provider === p.id) || null;
        const isStrava = p.id === 'strava';
        return (
          <ProviderCard
            key={p.id}
            provider={p}
            connection={conn}
            isPrimary={currentPrimary === p.id}
            isFitbit={p.id === 'fitbit'}
            canBePrimary={p.capabilities.baseline}
            fitbitConnection={fitbitConnection}
            syncing={isStrava ? stravaSyncing : fitbitSyncing}
            error={isStrava ? stravaError : fitbitError}
            onConnect={() => connectTo(p.id)}
            onSync={() => isStrava ? syncStrava() : syncFitbitToday()}
            onMakePrimary={() => setPrimaryDevice(p.id)}
          />
        );
      })}
    </div>
  );
}

function ProviderCard({
  provider, connection, isPrimary, isFitbit, canBePrimary, fitbitConnection,
  syncing, error, onConnect, onSync, onMakePrimary
}) {
  const comingSoon = provider.status === 'coming_soon';
  const connected = !!connection;
  const caps = [
    provider.capabilities.baseline ? 'Baseline' : null,
    provider.capabilities.workouts ? 'Workouts' : null
  ].filter(Boolean).join(' + ');

  const lastSynced = connection?.last_synced_at
    ? new Date(connection.last_synced_at).toLocaleDateString()
    : null;

  // Reconnect nudge only applies to Fitbit (Strava refresh tokens are long-lived).
  const reconnect = (isFitbit && fitbitConnection)
    ? fitbitReconnectState({ connectedAt: fitbitConnection.connected_at, errorReason: error })
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
            {comingSoon
              ? `Coming soon · ${caps}`
              : connected
                ? `Connected · ${caps}${lastSynced ? ` · synced ${lastSynced}` : ''}`
                : caps}
          </div>
        </div>
        {comingSoon ? (
          <span style={{ fontSize: 12, color: 'var(--txt-muted)', fontWeight: 600 }}>Coming soon</span>
        ) : !connected ? (
          <button onClick={onConnect} style={btnPrimary}>Connect</button>
        ) : (
          <button onClick={onSync} disabled={syncing} style={btnGhost(syncing)}>
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        )}
      </div>

      {/* Primary / Secondary control — only for providers that supply baseline. */}
      {!comingSoon && connected && canBePrimary && (
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

      {/* Reconnect nudge (Fitbit only) */}
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

      {/* Non-reconnect sync errors stay visible. Non-Fitbit providers get a
          reconnect link here (Fitbit uses its dedicated nudge above). */}
      {connected && error && reconnect !== 'reconnect_now' && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--txt-muted)', wordBreak: 'break-word' }}>
            Last sync error: {error}
          </div>
          {!isFitbit && (
            <button onClick={onConnect} style={{
              marginTop: 6, fontSize: 11, fontWeight: 600, color: 'var(--rust)', background: 'none',
              border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit'
            }}>
              Reconnect {provider.label}
            </button>
          )}
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
