// prsCalculator.js
// Local polygenic risk score computation.

const T2D_WEIGHTS = {
  rs7903146: 0.402,
  rs1801282: 0.175,
  rs5219: 0.16,
  rs13266634: 0.16,
  rs4402960: 0.156,
  rs10811661: 0.148,
  rs1111875: 0.127
};

const CAD_WEIGHTS = {
  rs10757278: 0.244,
  rs1333049: 0.235,
  rs2383206: 0.21,
  rs17465637: 0.18,
  rs1122608: 0.159
};

const HTN_WEIGHTS = {
  rs17367504: 0.213,
  rs2932538: 0.162,
  rs1378942: 0.158,
  rs3754777: 0.14
};

const calculatePRS = (rsIdSet, weightMap) => {
  let score = 0;
  for (const [rsId, weight] of Object.entries(weightMap)) {
    if (rsIdSet.has(rsId)) score += weight;
  }
  return parseFloat(score.toFixed(4));
};

const getRiskLevel = (score, thresholds) => {
  if (score >= thresholds.high) return 'HIGH';
  if (score >= thresholds.medium) return 'MEDIUM';
  return 'LOW';
};

const calculateAllPRS = (rsIds) => {
  const rsSet = new Set(rsIds);

  const t2dScore = calculatePRS(rsSet, T2D_WEIGHTS);
  const cadScore = calculatePRS(rsSet, CAD_WEIGHTS);
  const htnScore = calculatePRS(rsSet, HTN_WEIGHTS);

  return {
    t2d: {
      score: t2dScore,
      risk: getRiskLevel(t2dScore, { high: 0.5, medium: 0.25 })
    },
    cad: {
      score: cadScore,
      risk: getRiskLevel(cadScore, { high: 0.4, medium: 0.2 })
    },
    htn: {
      score: htnScore,
      risk: getRiskLevel(htnScore, { high: 0.35, medium: 0.18 })
    }
  };
};

module.exports = { calculateAllPRS };
