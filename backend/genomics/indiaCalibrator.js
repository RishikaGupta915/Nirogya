// indiaCalibrator.js
// Calibrates variant significance against India population frequencies.

let genomeIndiaData = {};
try {
  genomeIndiaData = require('../../data/genome_india_frequencies.json');
} catch {
  console.warn(
    '[IndiaCalibrator] genome_india_frequencies.json not found - calibration skipped (safe).'
  );
}

const isPathogenicString = (sig) => {
  const lower = String(sig ?? '').toLowerCase();
  return lower.includes('pathogenic') && !lower.includes('conflicting');
};

const isLikelyPathogenic = (sig) => {
  const lower = String(sig ?? '').toLowerCase();
  return (
    lower.includes('likely pathogenic') ||
    (lower.includes('pathogenic') && !lower.startsWith('pathogenic'))
  );
};

const calibrateRisk = (rsId, clinvarSignificance) => {
  const entry = genomeIndiaData[rsId];
  const indiaFreq = entry?.allele_frequency_india ?? null;

  if (indiaFreq === null) return clinvarSignificance;

  if (isPathogenicString(clinvarSignificance) && indiaFreq > 0.05) {
    return 'Review - common in Indian population, clinical significance uncertain';
  }

  if (isLikelyPathogenic(clinvarSignificance) && indiaFreq < 0.001) {
    return 'Pathogenic';
  }

  return clinvarSignificance;
};

const getPopulationGroups = (rsId) =>
  genomeIndiaData[rsId]?.population_groups || [];

module.exports = { calibrateRisk, getPopulationGroups };
