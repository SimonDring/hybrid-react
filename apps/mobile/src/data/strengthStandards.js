/**
 * strengthStandards — re-export of the GOVERNED strength standards (WP-58).
 *
 * The table itself now lives in the engine's governed knowledge set
 * (@performance-os/engine → packages/engine/src/data/strengthStandards.js) with
 * provenance and KNOWLEDGE_SET_VERSION tracking — ONE source. This app-side module
 * stays only to preserve the existing import names (default STANDARDS, named BANDS)
 * that goals.js and the Progress screens use.
 */
import { STRENGTH_STANDARDS, STRENGTH_BANDS } from '@performance-os/engine';

export const BANDS = STRENGTH_BANDS;
const STANDARDS = STRENGTH_STANDARDS;
export default STANDARDS;
