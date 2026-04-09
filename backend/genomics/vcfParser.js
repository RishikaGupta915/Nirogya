// vcfParser.js
// Parses VCF file content into structured variant objects.

const parseVCF = (fileContent) => {
  const lines = fileContent
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'));

  return lines
    .map((line) => {
      const cols = line.split('\t');
      if (cols.length < 7) return null;

      const [chrom, pos, id, ref, alt, qual, filter] = cols;

      return {
        chrom,
        pos: parseInt(pos, 10),
        rsId: id && id.startsWith('rs') ? id.trim() : null,
        ref: ref?.trim(),
        alt: alt?.trim(),
        qual: parseFloat(qual) || 0,
        filter: filter?.trim()
      };
    })
    .filter(
      (variant) =>
        variant !== null &&
        variant.rsId !== null &&
        variant.qual >= 20 &&
        variant.filter === 'PASS'
    );
};

const extractRsIds = (variants) => [...new Set(variants.map((v) => v.rsId))];

module.exports = { parseVCF, extractRsIds };
