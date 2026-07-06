/**
 * ai-render — Supabase Edge Function (WP-60, AIGAS v0)
 *
 * The C2 · Explanation capability: turn an engine artefact (emitted rationales,
 * provenance, validation state — assembled CLIENT-side from the athlete's own data by
 * AiService.buildWeekArtefact) into audience-appropriate prose. Communication sits
 * OUTSIDE the AI seams (AIGAS §6.2): nothing returned here feeds any decision path.
 *
 * Guards, in order:
 *  1. KILL SWITCH — AI_ENABLED env must be 'true' or every request gets 503 {disabled}
 *     (AIGAS §17: stop without a deploy). ANTHROPIC_API_KEY stays server-side (Stage 6).
 *  2. AUTH — a valid user JWT is required; the artefact arrives from that user's own
 *     client and nothing else is fetched (reader's-scope + minimum-necessary, §19).
 *  3. LEAK GATE — reject any artefact carrying raw-vital keys. Prompts are not a
 *     security boundary; this check is (§19). Mirrors AiService.RAW_VITAL_KEYS.
 *
 * Output carries the §20 AI artefact stamp: capability, model, prompt version, input
 * provenance refs, token usage, timestamp — "why did the assistant say that?" is
 * answerable from the stamp. Model routing is versioned config (§8/§18).
 *
 * Deploy needs env: ANTHROPIC_API_KEY, AI_ENABLED=true (see supabase/SECURITY-DEPLOY.md).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

// ── §8/§18 · versioned routing config: task class → model/effort/limits ────────
const PROMPT_VERSION = 'explain_week/1'
const ROUTING: Record<string, { model: string; effort: 'low' | 'medium' | 'high'; maxTokens: number }> = {
  explain_week: { model: 'claude-opus-4-8', effort: 'low', maxTokens: 1024 },
}

// ── §19 · the leak gate (mirror of AiService.RAW_VITAL_KEYS) ───────────────────
const RAW_VITAL_KEYS = ['hrv', 'hrv_ms', 'sleep_score', 'sleep_min', 'sleep_light_min', 'sleep_deep_min',
  'sleep_rem_min', 'resting_hr', 'rhr', 'avg_hr', 'max_hr', 'spo2_pct', 'breathing_rate', 'readiness_score']
function leakedVitals(obj: unknown): string | null {
  const walk = (o: unknown): string | null => {
    if (!o || typeof o !== 'object') return null
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (RAW_VITAL_KEYS.includes(k.toLowerCase())) return k
      const hit = walk(v)
      if (hit) return hit
    }
    return null
  }
  return walk(obj)
}

// ── §7 · the grounding contract, as the system prompt ─────────────────────────
const SYSTEM = `You translate a training engine's structured decisions into plain language for the reader named in the request. Hard rules:
- Ground EVERY claim in the artefact provided. If the artefact does not contain a reason for something, say "I don't have the reasoning for that" — never invent a mechanism, a number, or a motivation.
- Preserve the engine's honesty markers: uncertainty stays uncertain, a deload/ease/trim/catch-up is stated as what it is, and nothing is upgraded to confident assertion.
- You explain decisions; you never make, change, or promise them. Every decision remains overridable by the reader — keep that door visibly open.
- Match the register: 'athlete' = warm, direct, second person, no jargon (spell out anything technical in one clause); 'coach' = plain-English squad language; 'scientist' = precise, cite the artefact fields.
- 2 short paragraphs maximum. No headers, no lists, no preamble.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // 1 · kill switch (§17) — off is a stated, visible state, never dark degradation (§15)
  if (Deno.env.get('AI_ENABLED') !== 'true') {
    return new Response(JSON.stringify({ disabled: true, error: 'AI features are not enabled' }), { status: 503, headers: jsonHeaders })
  }

  // 2 · reader auth — the artefact is the caller's own data; nothing else is read
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: jsonHeaders })

  let body: { capability?: string; audience?: string; artefact?: unknown }
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON' }), { status: 400, headers: jsonHeaders })
  }
  const route = ROUTING[body.capability ?? '']
  if (!route || !body.artefact) {
    return new Response(JSON.stringify({ error: 'unknown capability or missing artefact' }), { status: 400, headers: jsonHeaders })
  }

  // 3 · leak gate (§19)
  const leak = leakedVitals(body.artefact)
  if (leak) {
    return new Response(JSON.stringify({ error: `artefact rejected: raw-vital field "${leak}" may not enter an AI context` }), { status: 422, headers: jsonHeaders })
  }

  const audience = ['athlete', 'coach', 'scientist'].includes(body.audience ?? '') ? body.audience : 'athlete'
  const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

  try {
    const msg = await anthropic.messages.create({
      model: route.model,
      max_tokens: route.maxTokens,
      thinking: { type: 'adaptive' },
      output_config: { effort: route.effort },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Reader: ${audience}. Explain this training week from its engine artefact (JSON):\n${JSON.stringify(body.artefact)}`,
      }],
    })
    const text = msg.content.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('')
    // §20 · the AI artefact stamp — reconstructable, auditable
    const stamp = {
      capability: body.capability,
      audience,
      model: route.model,
      promptVersion: PROMPT_VERSION,
      inputRefs: (body.artefact as { provenance?: unknown }).provenance ?? null,
      usage: { input: msg.usage.input_tokens, output: msg.usage.output_tokens },
      createdAt: new Date().toISOString(),
    }
    console.log(JSON.stringify({ ai_render: stamp }))   // observability floor; table-backed audit log = follow-up
    return new Response(JSON.stringify({ text, stamp }), { status: 200, headers: jsonHeaders })
  } catch (e) {
    // §9 · degradation is the CLIENT's job (it keeps the deterministic strings); we
    // just fail honestly and cheaply.
    console.error('ai-render error:', (e as Error).message)
    return new Response(JSON.stringify({ error: 'ai unavailable' }), { status: 502, headers: jsonHeaders })
  }
})
