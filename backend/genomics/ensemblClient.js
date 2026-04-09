// ensemblClient.js
// Free Ensembl REST API client.

const ENSEMBL_BASE = 'https://rest.ensembl.org';

const annotateVariant = async (rsId) => {
  try {
    const url = `${ENSEMBL_BASE}/variation/human/${rsId}?content-type=application/json`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();

    return {
      rsId,
      mostSevereConsequence: data.most_severe_consequence || 'unknown',
      minorAlleleFrequency: data.MAF || null,
      ancestralAllele: data.ancestral_allele || null,
      mappings: (data.mappings || []).map((m) => ({
        chromosome: m.seq_region_name,
        start: m.start,
        alleleString: m.allele_string
      }))
    };
  } catch {
    return null;
  }
};

const annotateAll = async (rsIds) => {
  const results = [];
  for (const rsId of rsIds) {
    const data = await annotateVariant(rsId);
    if (data) results.push(data);
    await new Promise((resolve) => setTimeout(resolve, 70));
  }
  return results;
};

module.exports = { annotateVariant, annotateAll };
