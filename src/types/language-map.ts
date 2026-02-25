/**
 * Language Map Type
 *
 * A map of BCP 47 language codes to localized strings.
 * Used for names, descriptions, and other translatable content.
 */

export type LanguageCode =
  | 'en'           // English
  | 'zh-Hant'      // Traditional Chinese (繁體中文)
  | 'zh-Hans'      // Simplified Chinese (简体中文)
  | 'sa'           // Sanskrit (संस्कृतम्)
  | 'hi'           // Hindi (हिन्दी)
  | 'fa'           // Persian (فارسی)
  | 'mn'           // Mongolian (Монгол)
  | 'ja'           // Japanese (日本語)
  | 'ko'           // Korean (한국어)
  | 'la'           // Latin

/**
 * Language map - keys are BCP 47 language tags
 */
export type LanguageMap = Partial<Record<LanguageCode | string, string>>

/**
 * Helper to get a value from a language map with fallback
 */
export function getLocalizedValue(
  map: LanguageMap | undefined,
  preferredLang: LanguageCode = 'en',
  fallbackLang: LanguageCode = 'zh-Hant'
): string | undefined {
  if (!map) return undefined

  // Try preferred language first
  if (map[preferredLang]) return map[preferredLang]

  // Try fallback
  if (map[fallbackLang]) return map[fallbackLang]

  // Try English
  if (map['en']) return map['en']

  // Return first available
  const keys = Object.keys(map)
  return keys.length > 0 ? map[keys[0]] : undefined
}

/**
 * Get all available languages from a language map
 */
export function getAvailableLanguages(map: LanguageMap | undefined): LanguageCode[] {
  if (!map) return []
  return Object.keys(map) as LanguageCode[]
}

/**
 * Check if a language map has content
 */
export function hasLanguageContent(map: LanguageMap | undefined, lang: LanguageCode): boolean {
  return !!(map && map[lang] && map[lang]!.trim().length > 0)
}
