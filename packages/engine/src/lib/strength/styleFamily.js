// styleFamily — P0-1 (audit TR-01): the post-flip style-id fallthrough.
//
// Since the build flip (WP-49 T6) a build profile's style IS its discipline id
// (powerlifting / hypertrophy / olympic), but the style-keyed knowledge — the
// volume band (KB volume.style_top), iso dose, the per-session primary cap, the
// fallback rest tier — is keyed on the LEGACY style vocabulary. Every discipline
// silently fell through to 'functional' (hypertrophy lost its 1.4 overreach band,
// powerlifting its 0.6 band and the 3-primary cap).
//
// This map names the legacy style FAMILY whose character each discipline inherits:
// powerlifting and olympic are intensity-carried (the strength 0.6 band);
// hypertrophy overreaches past MAV (the bodybuilding 1.4 band). It is WIRING, not
// science — no governed value changes; existing KB values are simply resolved for
// the post-flip ids (so the governed volume.style_top entry stays untouched).
// DOSE is separate and already discipline-pinned via DISCIPLINE_DOSE_QUALITY
// (WP-49 T4c); the allocator's fallback scheme resolves through the same table.
export const DISCIPLINE_STYLE_FAMILY = {
  powerlifting: 'strength',
  hypertrophy: 'bodybuilding',
  olympic: 'strength',
};

/** The legacy style family for style-keyed behaviour: discipline ids map to their
 *  family; every other style (legacy names, 'sport') maps to itself. */
export const styleFamily = (style) => DISCIPLINE_STYLE_FAMILY[style] || style;

export default { DISCIPLINE_STYLE_FAMILY, styleFamily };
