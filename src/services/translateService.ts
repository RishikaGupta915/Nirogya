const LANGUAGE_CODE_TO_NAME: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  bn: 'Bengali',
  kn: 'Kannada',
  ml: 'Malayalam',
  mr: 'Marathi',
  gu: 'Gujarati',
  pa: 'Punjabi',
  or: 'Odia'
};

function normalizeTargetLanguage(targetLanguage: string): string {
  const normalized = targetLanguage.trim().toLowerCase();
  return LANGUAGE_CODE_TO_NAME[normalized] ?? targetLanguage;
}

function isEnglish(targetLanguage: string): boolean {
  const normalized = targetLanguage.trim().toLowerCase();
  return normalized === 'en' || normalized === 'english';
}

export async function translateMany(
  texts: string[],
  targetLanguage: string
): Promise<string[]> {
  // Translation disabled (no NVIDIA); return originals.
  return texts;
}

export async function translateText(
  text: string,
  targetLanguage: string
): Promise<string> {
  return text;
}
