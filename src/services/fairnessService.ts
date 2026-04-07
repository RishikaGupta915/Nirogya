// src/services/fairnessService.ts
// Computes fairness score for recommendations based on user context

export function computeFairnessScore(
  userProfile: Record<string, any>,
  recommendation: string
): number {
  // Example: score based on location, income, HDI, access
  let score = 1.0;
  if (userProfile.districtHDI && userProfile.districtHDI < 0.6) score -= 0.2;
  if (userProfile.income && userProfile.income < 10000) score -= 0.2;
  if (userProfile.distanceToFacility && userProfile.distanceToFacility > 10)
    score -= 0.2;
  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, score));
}
