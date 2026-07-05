"use client";

import { useState } from "react";
import type { FixtureType, TeamConstraints, TeamFixture } from "@/types/dashboard";
import { useDashboard } from "../DashboardProvider";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { CloseIcon, PlusIcon } from "@/components/ui/icons";
import {
  SEASON_OPTIONS,
  SESSION_TYPE_META,
  SESSION_TYPE_OPTIONS,
  SPORT_OPTIONS,
} from "@/lib/constraints";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/formatting";

const FIXTURE_TYPE_OPTIONS: { value: FixtureType; label: string }[] = [
  { value: "match", label: "Match" },
  { value: "pitch", label: "Pitch session" },
  { value: "pool", label: "Pool" },
  { value: "track", label: "Track" },
  { value: "gym", label: "Gym" },
];

const toOptions = (values: string[]) =>
  values.map((v) => ({ value: v, label: v }));

/**
 * The coach sets the team's fixed constraints here. They steer every player's
 * plan direction; each player's own onboarding then personalises within them.
 * Edits are committed on Save and flow to the Focus view's direction panel.
 */
export function ConstraintsView() {
  const { constraints, setConstraints, notify, now } = useDashboard();
  const [draft, setDraft] = useState<TeamConstraints>(constraints);

  const dirty = JSON.stringify(draft) !== JSON.stringify(constraints);

  const save = () => {
    setConstraints(draft);
    notify("Constraints saved — player plans will update.");
  };

  const setDay = (index: number, type: TeamConstraints["weeklyPattern"][number]["type"]) =>
    setDraft((d) => ({
      ...d,
      weeklyPattern: d.weeklyPattern.map((day, i) =>
        i === index ? { ...day, type } : day,
      ),
    }));

  const updateFixture = (index: number, patch: Partial<TeamFixture>) =>
    setDraft((d) => ({
      ...d,
      fixtures: d.fixtures.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    }));

  const addFixture = () =>
    setDraft((d) => ({
      ...d,
      fixtures: [
        ...d.fixtures,
        {
          id: `fix-${Date.now()}`,
          type: "match",
          label: "New fixture",
          // default the new fixture ~4 weeks out from today
          date: new Date(now.getTime() + 28 * 86_400_000).toISOString().slice(0, 10),
        },
      ],
    }));

  const removeFixture = (index: number) =>
    setDraft((d) => ({
      ...d,
      fixtures: d.fixtures.filter((_, i) => i !== index),
    }));

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Save bar */}
      <div className="flex flex-col gap-2 border-b border-hairline pb-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          These constraints steer the direction of every player's plan.
        </p>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-xs text-monitor">Unsaved changes</span>
          )}
          {dirty && (
            <Button variant="ghost" size="sm" onClick={() => setDraft(constraints)}>
              Reset
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={save} disabled={!dirty}>
            Save constraints
          </Button>
        </div>
      </div>

      {/* Sport & season */}
      <Card>
        <SectionHeader
          title="Sport & season"
          hint="Sets the engine's emphasis and periodisation"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sport">
            <Select
              value={draft.sport}
              onChange={(sport) => setDraft((d) => ({ ...d, sport }))}
              options={toOptions(SPORT_OPTIONS)}
              ariaLabel="Sport"
              className="w-full"
            />
          </Field>
          <Field label="Season phase">
            <Select
              value={draft.seasonPhase}
              onChange={(seasonPhase) => setDraft((d) => ({ ...d, seasonPhase }))}
              options={toOptions(SEASON_OPTIONS)}
              ariaLabel="Season phase"
              className="w-full"
            />
          </Field>
        </div>
      </Card>

      {/* Weekly training pattern */}
      <Card>
        <SectionHeader
          title="Weekly training pattern"
          hint="What each day is for — gym work plans around this"
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {draft.weeklyPattern.map((day, i) => {
            const m = SESSION_TYPE_META[day.type];
            return (
              <div
                key={day.day}
                className="rounded-card border border-hairline bg-surface-2 p-2.5"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-soft">
                    {day.day}
                  </span>
                  <span className={cn("h-2.5 w-2.5 rounded-full", m.dot)} />
                </div>
                <Select
                  value={day.type}
                  onChange={(t) => setDay(i, t as typeof day.type)}
                  options={SESSION_TYPE_OPTIONS}
                  ariaLabel={`${day.day} session type`}
                  className="w-full"
                />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Fixtures */}
      <Card>
        <SectionHeader
          title="Fixtures & events"
          hint="Matches and key sessions plans must work around"
          action={
            <Button variant="secondary" size="sm" onClick={addFixture}>
              <PlusIcon width={16} height={16} /> Add fixture
            </Button>
          }
        />
        <div className="space-y-2">
          {draft.fixtures.length === 0 && (
            <p className="text-sm text-soft">No fixtures yet — add one above.</p>
          )}
          {draft.fixtures.map((f, i) => (
            <div
              key={f.id}
              className="flex flex-col gap-2 rounded-card border border-hairline bg-surface-2 p-3 sm:flex-row sm:items-center"
            >
              <input
                type="text"
                value={f.label}
                onChange={(e) => updateFixture(i, { label: e.target.value })}
                aria-label="Fixture name"
                className="min-w-0 flex-1 rounded-pill border border-hairline-strong bg-surface px-3.5 py-2 text-sm text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={f.date}
                  onChange={(e) => updateFixture(i, { date: e.target.value })}
                  aria-label="Fixture date"
                  className="rounded-pill border border-hairline-strong bg-surface px-3 py-2 text-xs text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [color-scheme:dark]"
                />
                <div className="w-32">
                  <Select
                    value={f.type}
                    onChange={(t) => updateFixture(i, { type: t as FixtureType })}
                    options={FIXTURE_TYPE_OPTIONS}
                    ariaLabel="Fixture type"
                    className="w-full"
                  />
                </div>
                <button
                  onClick={() => removeFixture(i)}
                  aria-label="Remove fixture"
                  className="rounded-full p-1.5 text-muted transition-colors hover:bg-surface-3 hover:text-adjust"
                >
                  <CloseIcon width={16} height={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <CascadePanel sport={draft.sport} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-soft">
        {label}
      </span>
      {children}
    </label>
  );
}

/** The plain-English model: team constraints → player onboarding → plan. */
function CascadePanel({ sport }: { sport: string }) {
  const steps = [
    {
      tag: "You set",
      tone: "accent" as const,
      title: "Team constraints",
      items: ["Sport & season", "Weekly schedule", "Fixtures & matches"],
    },
    {
      tag: "Each player sets",
      tone: "ready" as const,
      title: "Player onboarding",
      items: [
        "Their goal & experience",
        "Strengths & weaknesses",
        "Injury history",
      ],
    },
    {
      tag: "The engine builds",
      tone: "monitor" as const,
      title: "Personalised plan",
      items: [
        `Gym work that supports ${sport.toLowerCase()}`,
        "Clear of match & pitch load",
        "Tuned to each player",
      ],
    },
  ];

  return (
    <Card>
      <SectionHeader
        title="How this shapes player plans"
        hint="Team constraints set the direction; each player's onboarding personalises within it"
      />
      <div className="grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
        {steps.map((step, i) => (
          <div key={step.title} className="contents">
            <div className="flex flex-col rounded-card border border-hairline bg-surface-2 p-4">
              <Badge tone={step.tone}>{step.tag}</Badge>
              <p className="mt-2 font-semibold text-strong">{step.title}</p>
              <ul className="mt-2 space-y-1">
                {step.items.map((it) => (
                  <li key={it} className="flex items-start gap-1.5 text-sm text-body">
                    <span className="text-soft">·</span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
            {i < steps.length - 1 && (
              <div className="flex items-center justify-center text-muted">
                <span className="lg:hidden">↓</span>
                <span className="hidden lg:inline">→</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-card bg-surface-2 p-3 text-xs text-muted">
        Raw vitals (sleep, HRV, resting heart rate) stay private to each player —
        only a derived readiness signal rolls up to you, never the underlying numbers.
      </p>
    </Card>
  );
}
