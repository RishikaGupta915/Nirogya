const NIM_BASE_URL =
  process.env.EXPO_PUBLIC_NVIDIA_BASE_URL ??
  process.env.NVIDIA_BASE_URL ??
  'https://integrate.api.nvidia.com/v1';

const NIM_API_KEY =
  process.env.EXPO_PUBLIC_NVIDIA_API_KEY ?? process.env.NVIDIA_API_KEY;

const NIM_TRANSLATE_MODEL =
  process.env.EXPO_PUBLIC_NVIDIA_TRANSLATE_MODEL ??
  'nvidia/riva-translate-1_6b';

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

const translationCache = new Map<string, string>();
let warnedMissingNvidiaKey = false;

function normalizeTargetLanguage(targetLanguage: string): string {
  const normalized = targetLanguage.trim().toLowerCase();
  return LANGUAGE_CODE_TO_NAME[normalized] ?? targetLanguage;
}

function isEnglish(targetLanguage: string): boolean {
  const normalized = targetLanguage.trim().toLowerCase();
  return normalized === 'en' || normalized === 'english';
}

function extractJsonObject(content: string): string {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('NVIDIA translate response did not include JSON.');
  }
  return content.slice(start, end + 1);
}

async function requestTranslations(
  texts: string[],
  targetLanguage: string
): Promise<string[]> {
  if (!NIM_API_KEY) {
    if (!warnedMissingNvidiaKey) {
      warnedMissingNvidiaKey = true;
      console.warn(
        'NVIDIA translation key missing. Set EXPO_PUBLIC_NVIDIA_API_KEY to enable multilingual output.'
      );
    }
    return texts;
  }

  const userPrompt = `Target language: ${targetLanguage}\nTranslate each text in the JSON array and preserve order exactly.\nKeep numbers, units, medicine names, and condition names intact.\nJSON array:\n${JSON.stringify(texts)}`;

  const res = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NIM_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: NIM_TRANSLATE_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a medical translator. Return ONLY valid JSON in this format: {"translations": ["..."]}. Do not include markdown fences.'
        },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 2048
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `NVIDIA translate failed (${res.status}): ${body.slice(0, 200)}`
    );
  }

  const payload = await res.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('NVIDIA translate returned empty content.');
  }

  const parsed = JSON.parse(extractJsonObject(content));
  const translations = parsed?.translations;
  if (!Array.isArray(translations)) {
    throw new Error('NVIDIA translate response missing translations array.');
  }

  if (translations.length !== texts.length) {
    throw new Error('NVIDIA translate response length mismatch.');
  }

  return translations.map((item: unknown, idx: number) =>
    typeof item === 'string' && item.trim() ? item : texts[idx]
  );
}

export async function translateMany(
  texts: string[],
  targetLanguage: string
): Promise<string[]> {
  if (!targetLanguage || isEnglish(targetLanguage) || texts.length === 0) {
    return texts;
  }

  const target = normalizeTargetLanguage(targetLanguage);
  const result = [...texts];
  const unresolvedIndexes: number[] = [];
  const unresolvedTexts: string[] = [];

  texts.forEach((text, idx) => {
    const trimmed = text?.trim() ?? '';
    if (!trimmed) return;
    const cacheKey = `${target}|${trimmed}`;
    const cached = translationCache.get(cacheKey);
    if (cached) {
      result[idx] = cached;
      return;
    }
    unresolvedIndexes.push(idx);
    unresolvedTexts.push(trimmed);
  });

  if (unresolvedTexts.length === 0) return result;

  try {
    const translated = await requestTranslations(unresolvedTexts, target);
    translated.forEach((translatedText, i) => {
      const original = unresolvedTexts[i];
      const index = unresolvedIndexes[i];
      const cacheKey = `${target}|${original}`;
      translationCache.set(cacheKey, translatedText);
      result[index] = translatedText;
    });
    return result;
  } catch (error) {
    console.warn('[NVIDIA Translate Error]', error);
    return result;
  }
}

export async function translateText(
  text: string,
  targetLanguage: string
): Promise<string> {
  if (!text?.trim()) return text;
  const [translated] = await translateMany([text], targetLanguage);
  return translated ?? text;
}
