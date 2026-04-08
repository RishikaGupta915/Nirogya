import translations from './uiTranslations.generated.json';

type Dictionary = Record<string, string>;

type TranslationData = Record<string, Dictionary>;

const DATA = translations as TranslationData;
const DEFAULT_LANGUAGE = 'en';

export type TranslationKey = keyof typeof translations.en;

function normalizeLanguage(language?: string): string {
  if (!language) return DEFAULT_LANGUAGE;
  const code = language.trim().toLowerCase();
  return DATA[code] ? code : DEFAULT_LANGUAGE;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function interpolate(
  template: string,
  vars?: Record<string, string | number>
): string {
  if (!vars || Object.keys(vars).length === 0) return template;

  let output = template;
  for (const [key, value] of Object.entries(vars)) {
    const matcher = new RegExp(`\\{\\{\\s*${escapeRegex(key)}\\s*\\}\\}`, 'g');
    output = output.replace(matcher, String(value));
  }

  return output;
}

export function t(
  language: string | undefined,
  key: TranslationKey,
  vars?: Record<string, string | number>
): string {
  const lang = normalizeLanguage(language);
  const englishTemplate = DATA[DEFAULT_LANGUAGE]?.[key] ?? String(key);
  let template = DATA[lang]?.[key] ?? englishTemplate;

  if (vars && Object.keys(vars).length > 0) {
    const hasAllVars = Object.keys(vars).every((varKey) => {
      const matcher = new RegExp(`\\{\\{\\s*${escapeRegex(varKey)}\\s*\\}\\}`);
      return matcher.test(template);
    });

    if (!hasAllVars) {
      template = englishTemplate;
    }
  }

  return interpolate(template, vars);
}
