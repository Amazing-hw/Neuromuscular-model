// Canonical 25-paper order for the cross-modal deck.
// Upstream record modules keep ownership of paper-specific content; this file only
// establishes the narrative sequence and fails fast when a section is incomplete.

const { paperRecordsExpanded } = require('./paper_records_expanded.js');
const { speechPaperRecords } = require('./speech_paper_records.js');
const { physioPaperRecords } = require('./physio_paper_records.js');

const EEG_IDS = [
  'bendr', 'biot', 'labram', 'eegpt_wang', 'cbramod', 'neuript', 'tfm_tokenizer'
];
const WEARABLE_GENERAL_IDS = [
  'apple_wearable', 'moment', 'papagei', 'scaling_wearable', 'sundial', 'm2ae'
];
const SEMG_IDS = [
  'generic_neuromotor', 'emg2pose', 'emg2qwerty', 'aemg'
];

function indexById(records, label) {
  if (!Array.isArray(records)) throw new TypeError(`${label} must export an array`);
  const map = new Map();
  for (const record of records) {
    if (!record || typeof record.id !== 'string' || !record.id) {
      throw new TypeError(`${label} contains a record without a valid id`);
    }
    if (map.has(record.id)) throw new Error(`${label} contains duplicate id: ${record.id}`);
    map.set(record.id, record);
  }
  return map;
}

function select(map, ids, label) {
  return ids.map((id) => {
    const record = map.get(id);
    if (!record) throw new Error(`${label} is missing required paper: ${id}`);
    return record;
  });
}

const legacy = indexById(paperRecordsExpanded, 'paperRecordsExpanded');
const speech = indexById(speechPaperRecords, 'speechPaperRecords');
const physio = indexById(physioPaperRecords, 'physioPaperRecords');

if (speechPaperRecords.length !== 4) {
  throw new Error(`speechPaperRecords must contain exactly 4 papers; got ${speechPaperRecords.length}`);
}
if (physioPaperRecords.length !== 4) {
  throw new Error(`physioPaperRecords must contain exactly 4 papers; got ${physioPaperRecords.length}`);
}

const crossModalPaperRecords = [
  ...select(legacy, EEG_IDS, 'EEG section'),
  ...speechPaperRecords,
  ...physioPaperRecords,
  ...select(legacy, WEARABLE_GENERAL_IDS, 'wearable/general section'),
  ...select(legacy, SEMG_IDS, 'sEMG section')
];

const ids = crossModalPaperRecords.map((record) => record.id);
if (crossModalPaperRecords.length !== 25 || new Set(ids).size !== 25) {
  throw new Error(`Cross-modal paper set must contain 25 unique papers; got ${crossModalPaperRecords.length} records and ${new Set(ids).size} unique ids`);
}

module.exports = { crossModalPaperRecords };
