// src/data/injuryTaxonomy.js
// Body part hierarchy: region → part → metadata
// body_part_key drives injuryRules.js — keep keys stable.

export const REGIONS = {
  lower_limb: {
    label: 'Lower Limb',
    parts: {
      knee:       { label: 'Knee',             sides: ['left','right','both'] },
      ankle:      { label: 'Ankle / Foot',     sides: ['left','right','both'] },
      hamstring:  { label: 'Hamstring',        sides: ['left','right','both'] },
      hip:        { label: 'Hip / Groin',      sides: ['left','right','both'] },
      calf:       { label: 'Calf / Achilles',  sides: ['left','right','both'] },
      shin:       { label: 'Shin / Tibia',     sides: ['left','right','both'] },
      quad:       { label: 'Quadriceps',       sides: ['left','right','both'] },
    }
  },
  upper_limb: {
    label: 'Upper Limb',
    parts: {
      shoulder:   { label: 'Shoulder',         sides: ['left','right','both'] },
      elbow:      { label: 'Elbow',            sides: ['left','right','both'] },
      wrist:      { label: 'Wrist / Hand',     sides: ['left','right','both'] },
    }
  },
  core_spine: {
    label: 'Core & Spine',
    parts: {
      lumbar:     { label: 'Lower Back',       sides: ['n/a'] },
      thoracic:   { label: 'Upper / Mid Back', sides: ['n/a'] },
      cervical:   { label: 'Neck',             sides: ['n/a'] },
      core:       { label: 'Core / Abdomen',   sides: ['n/a'] },
    }
  },
  other: {
    label: 'Other',
    parts: {
      other: { label: 'Other / Unsure', sides: ['left','right','both','n/a'] }
    }
  }
};

// Diagnoses per body_part_key.
// high_risk: true → immediate professional referral regardless of symptom severity.
export const DIAGNOSES = {
  knee: [
    { key: 'patellar_tendinopathy',    label: "Patellar tendinopathy (jumper's knee)", high_risk: false, recurrence_risk: true },
    { key: 'it_band_syndrome',         label: 'IT band syndrome',                      high_risk: false, recurrence_risk: true },
    { key: 'runners_knee',             label: "Runner's knee (PFPS)",                  high_risk: false, recurrence_risk: true },
    { key: 'meniscus',                 label: 'Meniscus injury',                       high_risk: true,  recurrence_risk: false },
    { key: 'acl',                      label: 'ACL injury',                            high_risk: true,  recurrence_risk: true },
    { key: 'mcl',                      label: 'MCL sprain',                            high_risk: false, recurrence_risk: false },
    { key: 'knee_oa',                  label: 'Knee osteoarthritis',                   high_risk: false, recurrence_risk: false },
    { key: 'knee_bursitis',            label: 'Knee bursitis',                         high_risk: false, recurrence_risk: false },
  ],
  ankle: [
    { key: 'ankle_sprain',             label: 'Ankle sprain (lateral)',                high_risk: false, recurrence_risk: true },
    { key: 'achilles_tendinopathy',    label: 'Achilles tendinopathy',                 high_risk: false, recurrence_risk: true },
    { key: 'plantar_fasciitis',        label: 'Plantar fasciitis',                     high_risk: false, recurrence_risk: true },
    { key: 'stress_fracture_foot',     label: 'Stress fracture (foot)',                high_risk: true,  recurrence_risk: true },
    { key: 'ankle_fracture',           label: 'Ankle fracture',                        high_risk: true,  recurrence_risk: false },
    { key: 'peroneal_tendinopathy',    label: 'Peroneal tendinopathy',                 high_risk: false, recurrence_risk: false },
  ],
  hamstring: [
    { key: 'hamstring_strain',         label: 'Hamstring strain',                      high_risk: false, recurrence_risk: true },
    { key: 'proximal_hamstring_ten',   label: 'Proximal hamstring tendinopathy',       high_risk: false, recurrence_risk: true },
    { key: 'hamstring_avulsion',       label: 'Hamstring avulsion (tendon tear)',      high_risk: true,  recurrence_risk: false },
  ],
  hip: [
    { key: 'hip_flexor_strain',        label: 'Hip flexor strain',                     high_risk: false, recurrence_risk: false },
    { key: 'hip_impingement',          label: 'Hip impingement (FAI)',                 high_risk: false, recurrence_risk: false },
    { key: 'labral_tear_hip',          label: 'Hip labral tear',                       high_risk: true,  recurrence_risk: false },
    { key: 'piriformis_syndrome',      label: 'Piriformis syndrome',                   high_risk: false, recurrence_risk: false },
    { key: 'groin_strain',             label: 'Groin / adductor strain',               high_risk: false, recurrence_risk: true },
    { key: 'stress_fracture_hip',      label: 'Stress fracture (hip)',                 high_risk: true,  recurrence_risk: false },
  ],
  calf: [
    { key: 'calf_strain',              label: 'Calf strain (gastrocnemius)',            high_risk: false, recurrence_risk: true },
    { key: 'achilles_tendinopathy',    label: 'Achilles tendinopathy',                 high_risk: false, recurrence_risk: true },
    { key: 'achilles_rupture',         label: 'Achilles rupture',                      high_risk: true,  recurrence_risk: false },
    { key: 'dvt',                      label: 'DVT / unusual calf swelling',            high_risk: true,  recurrence_risk: false },
  ],
  shin: [
    { key: 'shin_splints',             label: 'Shin splints (MTSS)',                   high_risk: false, recurrence_risk: true },
    { key: 'stress_fracture_tibia',    label: 'Tibial stress fracture',                high_risk: true,  recurrence_risk: true },
    { key: 'compartment_syndrome',     label: 'Compartment syndrome',                  high_risk: true,  recurrence_risk: false },
  ],
  quad: [
    { key: 'quad_strain',              label: 'Quadriceps strain',                     high_risk: false, recurrence_risk: false },
    { key: 'quad_contusion',           label: 'Quadriceps contusion (cork)',           high_risk: false, recurrence_risk: false },
  ],
  shoulder: [
    { key: 'rotator_cuff',             label: 'Rotator cuff strain / tendinopathy',    high_risk: false, recurrence_risk: true },
    { key: 'shoulder_impingement',     label: 'Shoulder impingement',                  high_risk: false, recurrence_risk: true },
    { key: 'labral_tear_shoulder',     label: 'SLAP / labral tear (shoulder)',         high_risk: true,  recurrence_risk: false },
    { key: 'ac_joint',                 label: 'AC joint sprain',                       high_risk: false, recurrence_risk: false },
    { key: 'shoulder_dislocation',     label: 'Shoulder dislocation',                  high_risk: true,  recurrence_risk: true },
    { key: 'frozen_shoulder',          label: 'Frozen shoulder (adhesive capsulitis)', high_risk: false, recurrence_risk: false },
    { key: 'bicep_tendinopathy',       label: 'Biceps tendinopathy',                   high_risk: false, recurrence_risk: false },
  ],
  elbow: [
    { key: 'lateral_epicondylitis',    label: "Tennis elbow (lateral epicondylitis)",  high_risk: false, recurrence_risk: true },
    { key: 'medial_epicondylitis',     label: "Golfer's elbow (medial epicondylitis)", high_risk: false, recurrence_risk: true },
    { key: 'elbow_bursitis',           label: 'Olecranon bursitis',                    high_risk: false, recurrence_risk: false },
  ],
  wrist: [
    { key: 'wrist_sprain',             label: 'Wrist sprain',                          high_risk: false, recurrence_risk: false },
    { key: 'de_quervain',              label: "De Quervain's tenosynovitis",           high_risk: false, recurrence_risk: false },
    { key: 'scaphoid_fracture',        label: 'Scaphoid fracture',                     high_risk: true,  recurrence_risk: false },
  ],
  lumbar: [
    { key: 'lower_back_strain',        label: 'Lower back strain / sprain',            high_risk: false, recurrence_risk: true },
    { key: 'disc_herniation',          label: 'Disc herniation / bulge',               high_risk: true,  recurrence_risk: true },
    { key: 'facet_joint',              label: 'Facet joint irritation',                high_risk: false, recurrence_risk: true },
    { key: 'sciatica',                 label: 'Sciatica / nerve root irritation',      high_risk: true,  recurrence_risk: true },
    { key: 'spondylolysis',            label: 'Spondylolysis / stress fracture',       high_risk: true,  recurrence_risk: false },
  ],
  thoracic: [
    { key: 'thoracic_strain',          label: 'Thoracic strain',                       high_risk: false, recurrence_risk: false },
    { key: 'rib_stress',               label: 'Rib stress reaction',                   high_risk: true,  recurrence_risk: false },
  ],
  cervical: [
    { key: 'neck_strain',              label: 'Neck strain / whiplash',                high_risk: false, recurrence_risk: false },
    { key: 'cervical_disc',            label: 'Cervical disc injury',                  high_risk: true,  recurrence_risk: false },
  ],
  core: [
    { key: 'abdominal_strain',         label: 'Abdominal muscle strain',               high_risk: false, recurrence_risk: false },
    { key: 'sports_hernia',            label: 'Sports hernia / inguinal disruption',   high_risk: true,  recurrence_risk: false },
  ],
  other: [
    { key: 'unknown',                  label: 'Unknown / not sure',                    high_risk: false, recurrence_risk: false },
  ]
};

// Does a diagnosis have documented high recurrence risk?
export function hasRecurrenceRisk(diagnosis_key) {
  return Object.values(DIAGNOSES).flat().some(d => d.key === diagnosis_key && d.recurrence_risk);
}

export default { REGIONS, DIAGNOSES, hasRecurrenceRisk };
