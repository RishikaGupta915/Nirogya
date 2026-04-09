// riskFlagGenerator.js
// Converts annotated variants + PRS into structured genetic flags.

const { getDrugInteractions } = require('./pharmgkbClient');
const { calibrateRisk, getPopulationGroups } = require('./indiaCalibrator');

const isActionableSignificance = (sig) => {
  if (!sig || typeof sig !== 'string') return false;
  const lower = sig.toLowerCase();
  return lower.includes('pathogenic') && !lower.includes('conflicting');
};

const getSeverityFromSignificance = (sig) => {
  const lower = String(sig || '').toLowerCase().trim();
  return lower.startsWith('likely pathogenic') ? 'MEDIUM' : 'HIGH';
};

const generateGeneticFlags = async (annotatedVariants, prsScores) => {
  const flags = [];

  for (const variant of annotatedVariants) {
    const calibratedSignificance = calibrateRisk(
      variant.rsId,
      variant.clinicalSignificance
    );

    if (!isActionableSignificance(calibratedSignificance)) continue;

    const drugInteractions = await getDrugInteractions(variant.geneName);
    const populationGroups = getPopulationGroups(variant.rsId);
    const severity = getSeverityFromSignificance(calibratedSignificance);
    const topConditions =
      (variant.conditions || []).slice(0, 2).join(', ') ||
      'a hereditary condition';

    flags.push({
      type: 'genetic_single_gene',
      rsId: variant.rsId,
      gene: variant.geneName,
      severity,
      conditions: variant.conditions || [],
      drugInteractions,
      populationGroups,
      reviewStatus: variant.reviewStatus,
      source: 'ClinVar + Genome India calibration',
      plainLanguage: `You carry a variant in the ${variant.geneName} gene associated with: ${topConditions}.`,
      actionRequired:
        severity === 'HIGH'
          ? 'Please discuss this with a doctor and request a specialist referral.'
          : 'Mention this to your doctor at your next visit.',
      drugWarning:
        drugInteractions.length > 0
          ? `Important: This variant may affect how your body responds to: ${drugInteractions.join(', ')}. Inform your doctor before starting any new medication.`
          : null
    });
  }

  const prsConditions = [
    {
      key: 't2d',
      name: 'Type 2 Diabetes',
      action: 'Get an HbA1c test. Reduce refined carbs, 30 min walking daily.'
    },
    {
      key: 'cad',
      name: 'Coronary Artery Disease',
      action: 'Get a full lipid panel. Discuss cardiac screening with your doctor.'
    },
    {
      key: 'htn',
      name: 'Hypertension',
      action: 'Monitor blood pressure weekly. Reduce salt intake.'
    }
  ];

  for (const { key, name, action } of prsConditions) {
    const prs = prsScores[key];
    if (!prs || prs.risk === 'LOW') continue;

    flags.push({
      type: 'genetic_polygenic',
      gene: null,
      condition: name,
      severity: prs.risk,
      conditions: [name],
      prsScore: prs.score,
      source: 'Polygenic Risk Score (GWAS meta-analysis)',
      plainLanguage: `Your genetic profile shows ${prs.risk.toLowerCase()} polygenic risk for ${name}.`,
      actionRequired: action,
      drugWarning: null
    });
  }

  return flags;
};

module.exports = { generateGeneticFlags };
