// clinvarClient.js
// Free NCBI E-utilities client for ClinVar lookups.

const NCBI_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const API_KEY = process.env.NCBI_API_KEY || '';

const cache = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const safeArray = (value) => (Array.isArray(value) ? value : []);

const fetchClinVar = async (rsId) => {
  if (cache.has(rsId)) return cache.get(rsId);

  try {
    const keyParam = API_KEY ? `&api_key=${API_KEY}` : '';

    const searchUrl = `${NCBI_BASE}/esearch.fcgi?db=clinvar&term=${encodeURIComponent(
      `${rsId}[RS]`
    )}&retmode=json${keyParam}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    let ids = searchData.esearchresult?.idlist || [];

    if (!ids.length) {
      const fallbackUrl = `${NCBI_BASE}/esearch.fcgi?db=clinvar&term=${encodeURIComponent(
        rsId
      )}&retmode=json${keyParam}`;
      const fallbackRes = await fetch(fallbackUrl);
      const fallbackData = await fallbackRes.json();
      ids = fallbackData.esearchresult?.idlist || [];
    }

    if (!ids.length) {
      cache.set(rsId, null);
      return null;
    }

    const summaryUrl = `${NCBI_BASE}/esummary.fcgi?db=clinvar&id=${ids[0]}&retmode=json${keyParam}`;
    const summaryRes = await fetch(summaryUrl);
    const summaryData = await summaryRes.json();
    const record = summaryData.result?.[ids[0]];

    if (!record) {
      cache.set(rsId, null);
      return null;
    }

    const sigObj =
      record.clinical_significance ?? record.germline_classification ?? {};
    const clinicalSignificance = String(
      sigObj.description ??
        sigObj.germline_classification ??
        record.clinical_significance_description ??
        'Unknown'
    ).trim();

    const conditions = safeArray(record.trait_set)
      .map((trait) => trait?.trait_name)
      .filter(Boolean);

    const result = {
      rsId,
      geneName: record.genes?.[0]?.symbol ?? record.gene_sort ?? null,
      clinicalSignificance,
      conditions,
      reviewStatus: sigObj.review_status ?? record.review_status ?? ''
    };

    cache.set(rsId, result);
    await sleep(API_KEY ? 100 : 200);
    return result;
  } catch (err) {
    console.error(`[ClinVar] fetch failed for ${rsId}:`, err.message);
    cache.set(rsId, null);
    return null;
  }
};

const fetchAllVariants = async (rsIds) => {
  const results = [];
  for (const rsId of rsIds) {
    const data = await fetchClinVar(rsId);
    if (data) results.push(data);
  }
  return results;
};

module.exports = { fetchClinVar, fetchAllVariants };
