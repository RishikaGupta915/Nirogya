// pharmgkbClient.js
// Free PharmGKB client for known pharmacogenomic interactions.

const PHARMGKB_BASE = 'https://api.pharmgkb.org/v1';

const DRUG_INTERACTION_GENES = new Set([
  'CYP2C19',
  'CYP2D6',
  'TPMT',
  'G6PD',
  'VKORC1',
  'DPYD'
]);

const getDrugInteractions = async (geneName) => {
  if (!geneName || !DRUG_INTERACTION_GENES.has(geneName)) return [];

  try {
    const url = `${PHARMGKB_BASE}/data/gene?symbol=${geneName}&view=max`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];

    const data = await res.json();
    return (data?.data?.relatedChemicals || []).map((c) => c.name);
  } catch {
    return [];
  }
};

module.exports = { getDrugInteractions, DRUG_INTERACTION_GENES };
