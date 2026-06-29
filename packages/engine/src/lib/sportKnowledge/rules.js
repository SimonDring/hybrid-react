/**
 * evaluateRules — the deterministic interpreter for SKB decisionRules. Pure: given a
 * profile (→ its sport's rules) and a runtime context, returns the effects whose triggers
 * fire. The CALLER (PlanService reflow) decides how to apply each effect. Reserved effect
 * types are returned too; the reflow ignores the ones it can't act on yet.
 */
import skb, { normalizeSportId } from './index.js';

function ctxValue(signal, ctx) {
  switch (signal) {
    case 'competition_within_h': return ctx.competitionWithinH;
    case 'matches_this_week':    return ctx.matchesThisWeek;
    case 'acwr':                 return ctx.acwr;
    case 'readiness':            return ctx.readiness;
    case 'cmj_drop_pct':         return ctx.cmjDropPct;
    case 'illness':              return ctx.illness;
    case 'season':               return ctx.season;
    case 'soreness_region':      return ctx.soreness;   // {region:level}
    case 'travel':               return ctx.travel;
    default: return undefined;
  }
}

function fires(trigger, ctx) {
  const v = ctxValue(trigger.signal, ctx);
  if (v == null) return false;
  if (trigger.signal === 'soreness_region') {
    const level = v[trigger.value];
    return trigger.op === 'high' ? level === 'high' : !!level;
  }
  switch (trigger.op) {
    case '<':  return v <  trigger.value;
    case '<=': return v <= trigger.value;
    case '>':  return v >  trigger.value;
    case '>=': return v >= trigger.value;
    case '==': return v === trigger.value;
    default:   return false;
  }
}

export function evaluateRules(profile = {}, context = {}) {
  const prof = skb.get(normalizeSportId(profile.sport));
  if (!prof || !Array.isArray(prof.decisionRules)) return { effects: [] };
  const effects = [];
  for (const r of prof.decisionRules) {
    if (r.trigger && r.effect && fires(r.trigger, context)) {
      effects.push({ type: r.effect.type, params: r.effect.params || {}, ruleId: r.id });
    }
  }
  return { effects };
}

export default { evaluateRules };
