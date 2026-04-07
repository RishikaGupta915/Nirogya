// src/services/fairnessService.ts

type FairnessInput = {
  estimatedCost?: number;
};

export function computeFairnessScore(
  userProfile: Record<string, any>,
  diagnosisOrRecommendation?: FairnessInput
): number {
  const monthlyIncome = Number(
    userProfile.monthlyIncome ?? userProfile.income ?? 0
  );
  const distanceKm = Number(
    userProfile.hospitalDistanceKm ?? userProfile.distanceToFacility ?? 0
  );
  const hasPmjay = Boolean(
    userProfile.hasPmjay ||
    String(userProfile.insuranceType || '').toUpperCase() === 'PMJAY'
  );

  const estimatedCost =
    typeof diagnosisOrRecommendation?.estimatedCost === 'number'
      ? diagnosisOrRecommendation.estimatedCost
      : 1500;

  const effectiveCost = hasPmjay ? 0 : estimatedCost;
  const affordabilityRatio =
    monthlyIncome > 0 ? effectiveCost / Math.max(monthlyIncome, 1) : 0.4;
  const affordability =
    affordabilityRatio <= 0.1
      ? 1
      : affordabilityRatio <= 0.2
        ? 0.8
        : affordabilityRatio <= 0.3
          ? 0.6
          : affordabilityRatio <= 0.5
            ? 0.3
            : 0;

  const travelTimeMins = (distanceKm / 30) * 60;
  const accessibility =
    travelTimeMins <= 30
      ? 1
      : travelTimeMins <= 60
        ? 0.8
        : travelTimeMins <= 90
          ? 0.5
          : 0.2;

  const relevance =
    userProfile.language && userProfile.language !== 'en' ? 0.9 : 1;

  const score = affordability * 0.4 + accessibility * 0.4 + relevance * 0.2;
  return Number(Math.max(0, Math.min(1, score)).toFixed(2));
}
