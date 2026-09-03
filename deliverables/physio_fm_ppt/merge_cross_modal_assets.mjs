import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { crossModalPaperRecords } = require('./cross_modal_paper_records.js');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const INPUTS = [
  'figure_manifest.json',
  'cross_modal_speech_figure_manifest.json',
  'cross_modal_physio_figure_manifest.json'
];
const OUTPUT = path.join(HERE, 'cross_modal_figure_manifest.json');

async function readManifest(filename) {
  const fullPath = path.join(HERE, filename);
  let raw;
  try {
    raw = await fs.readFile(fullPath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`Missing ${filename}. Wait for the corresponding asset task, then rerun this merge script.`);
    }
    throw error;
  }
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new TypeError(`${filename} must contain a JSON array`);
  return parsed;
}

function validateEntry(entry, sourceFile) {
  if (!entry || typeof entry.paperId !== 'string' || !entry.paperId) {
    throw new TypeError(`${sourceFile} contains an entry without paperId`);
  }
  const main = entry.main;
  if (!main || typeof main !== 'object') throw new Error(`${entry.paperId}: missing main figure in ${sourceFile}`);
  for (const key of ['figureNumber', 'caption', 'sourceUrl', 'localPath', 'treatment']) {
    if (typeof main[key] !== 'string' || !main[key].trim()) {
      throw new Error(`${entry.paperId}: missing main.${key} in ${sourceFile}`);
    }
  }
  if (!Number.isInteger(main.pageNumber) || main.pageNumber < 1) {
    throw new Error(`${entry.paperId}: main.pageNumber must be a positive integer`);
  }
  if (!/^https?:\/\//.test(main.sourceUrl)) throw new Error(`${entry.paperId}: main.sourceUrl is not an HTTP(S) URL`);
  if (main.treatment !== 'original') throw new Error(`${entry.paperId}: main.treatment must be "original"`);
  return entry;
}

async function main() {
  const manifests = await Promise.all(INPUTS.map(readManifest));
  const entries = [];
  for (let i = 0; i < manifests.length; i += 1) {
    for (const entry of manifests[i]) entries.push(validateEntry(entry, INPUTS[i]));
  }
  const byId = new Map();
  for (const entry of entries) {
    if (byId.has(entry.paperId)) throw new Error(`Duplicate figure manifest paperId: ${entry.paperId}`);
    byId.set(entry.paperId, entry);
  }
  const merged = crossModalPaperRecords.map((paper) => {
    const entry = byId.get(paper.id);
    if (!entry) throw new Error(`No figure manifest entry for ${paper.id}`);
    if (entry.main.sourceUrl !== paper.pdfSource) {
      throw new Error(`${paper.id}: figure sourceUrl does not match paper.pdfSource`);
    }
    return entry;
  });
  if (merged.length !== 25 || byId.size !== 25) {
    throw new Error(`Expected exactly 25 figure entries; merged=${merged.length}, available=${byId.size}`);
  }
  for (const entry of merged) {
    const localFigure = path.resolve(HERE, entry.main.localPath);
    const relative = path.relative(HERE, localFigure);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`${entry.paperId}: localPath escapes physio_fm_ppt: ${entry.main.localPath}`);
    }
    const stat = await fs.stat(localFigure).catch(() => null);
    if (!stat?.isFile() || stat.size < 20_000) {
      throw new Error(`${entry.paperId}: missing or undersized figure: ${entry.main.localPath}`);
    }
  }
  await fs.writeFile(OUTPUT, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${OUTPUT} with ${merged.length} entries`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
