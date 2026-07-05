import type { Team, TeamConstraints } from "@/types/dashboard";
import { Card, SectionHeader } from "@/components/ui/Card";
import { InfoTip } from "@/components/ui/InfoTip";
import { JARGON } from "@/content/dashboardCopy";
import { SESSION_TYPE_META, deriveTeamDirection } from "@/lib/constraints";
import { cn } from "@/lib/cn";
import { daysUntil, formatDate, formatDaysUntil } from "@/lib/formatting";

/**
 * The Focus view's lead: what the squad is working toward this block, derived
 * from the team constraints (sport + season + fixtures). Editing constraints
 * updates this — that's the "constraints steer the plan" idea made visible.
 */
export function TeamDirectionPanel({
  team,
  constraints,
  now,
}: {
  team: Team;
  constraints: TeamConstraints;
  now: Date;
}) {
  // No fixture on file yet → no taper maths; say so rather than invent a date.
  const fixture = team.nextFixture ?? null;
  const d2m = fixture ? daysUntil(fixture.date, now) : null;
  const dir = deriveTeamDirection(constraints, d2m);

  return (
    <Card>
      <SectionHeader
        title="This block's direction"
        titleTip={<InfoTip {...JARGON.blockDirection} />}
        hint={
          [constraints.sport, constraints.seasonPhase].filter(Boolean).join(" · ") ||
          "Set your sport and season in Constraints"
        }
      />

      <p className="text-lg font-medium leading-snug text-strong">
        {dir.emphasis}
      </p>

      {dir.taperNote && (
        <div className="mt-3 rounded-card border border-monitor/30 bg-monitor-soft p-3 text-sm text-monitor">
          {dir.taperNote}
        </div>
      )}

      <p className="mt-3 text-sm text-muted">{dir.scheduleNote}</p>

      {/* Weekly pattern strip */}
      <div className="mt-5 border-t border-hairline pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-soft">
          Weekly pattern
        </p>
        <div className="grid grid-cols-7 gap-1.5">
          {constraints.weeklyPattern.map((d) => {
            const m = SESSION_TYPE_META[d.type];
            return (
              <div key={d.day} className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] uppercase text-soft">{d.day}</span>
                <span
                  className={cn(
                    "flex h-9 w-full items-center justify-center rounded text-[10px] font-medium",
                    m.chip,
                    m.text,
                  )}
                  title={m.label}
                >
                  {m.label.slice(0, 4)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-xs text-soft">
        {fixture ? (
          <>
            Next fixture: <span className="text-body">{fixture.label}</span> ·{" "}
            {formatDate(fixture.date)} ({formatDaysUntil(fixture.date, now)})
          </>
        ) : (
          "No upcoming fixture on file"
        )}
      </p>
    </Card>
  );
}
