/** Union of all supported language and script-mode codes. */
export type LanguageCode = 'hi' | 'en' | 'hinglish' | 'ta' | 'te' | 'mr' | 'bn' | 'kn' | 'gu' | 'ml' | 'pa' | 'or' | 'ur';

/** Static metadata for every supported language. */
export const LANGUAGES: {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  script: string;
}[] = [
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', script: 'Devanagari' },
  { code: 'en', label: 'English', nativeLabel: 'English', script: 'Latin' },
  { code: 'hinglish', label: 'Hinglish', nativeLabel: 'Hinglish', script: 'Latin' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', script: 'Devanagari' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', script: 'Bengali' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', script: 'Tamil' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', script: 'Telugu' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', script: 'Gujarati' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', script: 'Kannada' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം', script: 'Malayalam' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
  { code: 'or', label: 'Odia', nativeLabel: 'ଓଡ଼ିଆ', script: 'Odia' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو', script: 'Arabic' },
];

const DEVANAGARI = /[\u0900-\u097F]/;
const TAMIL = /[\u0B80-\u0BFF]/;
const TELUGU = /[\u0C00-\u0C7F]/;
const BENGALI = /[\u0980-\u09FF]/;
const KANNADA = /[\u0C80-\u0CFF]/;
const GUJARATI = /[\u0A80-\u0AFF]/;
const MALAYALAM = /[\u0D00-\u0D7F]/;
const GURMUKHI = /[\u0A00-\u0A7F]/;
const ODIA = /[\u0B00-\u0B7F]/;
const ARABIC = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LATIN = /[\u0041-\u005A\u0061-\u007A]/;

const MARATHI_STRONG_MARKERS = new Set([
  'आहे',
  'नाही',
  'नाहीत',
  'आहात',
  'माझे',
  'माझी',
  'माझ्या',
  'होते',
  'होती',
  'नको',
  'नकोस',
  'पाहिजे',
  'बोलू',
  'तुम्ही',
  'इथे',
  'कसे',
  'असे',
  'झाला',
]);

const MARATHI_WEAK_MARKERS = new Set(['हो', 'है', 'करू', 'चला', 'होय']);

function countMarathiMarkers(text: string): number {
  let score = 0;
  for (const raw of text.split(/\s+/)) {
    const token = raw.replace(/[.,;!?।:""''()]/g, '');
    if (MARATHI_STRONG_MARKERS.has(token)) score += 1;
    else if (MARATHI_WEAK_MARKERS.has(token)) score += 0.25;
  }
  return score;
}

const HINGLISH_DICT =
  /(^|\s)(hai|hain|raha|rahi|rahe|kiya|karna|karte|aap|mujhe|batao|bata|kya|nahi|na|apna|apni|kaise|kahan|bahut|sir|ji|dekh|samjho|thik|acha|theek|sab|meri|mera| tum |wo |woh |ye |yeh |kar|ki|panah|salaah|advice|case)\b/gi;

const ENGLISH_DICT =
  /(^|\s)(the|and|is|are|my|your|car|house|law|court|document|file|please|hello|what|how|why|where|you|this|that|with|from|will|can|please|need|legal|police|case|property|land|money|marriage|divorce|husband|wife|child|children)\b/gi;

function countMatches(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function classifyLatin(text: string): LanguageCode {
  const hinglishHits = countMatches(text, HINGLISH_DICT);
  const englishHits = countMatches(text, ENGLISH_DICT);
  return hinglishHits >= englishHits ? 'hinglish' : 'en';
}

/**
 * Detect the language of the given text using Unicode script ranges plus a
 * small Hinglish/English dictionary for Latin script. Falls back to 'hi'.
 */
export function detectLanguage(text: string): LanguageCode {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return 'hi';

  let devanagari = 0;
  let tamil = 0;
  let telugu = 0;
  let bengali = 0;
  let kannada = 0;
  let gujarati = 0;
  let malayalam = 0;
  let gurmukhi = 0;
  let odia = 0;
  let arabic = 0;
  let latin = 0;

  for (const ch of trimmed) {
    if (DEVANAGARI.test(ch)) devanagari++;
    else if (TAMIL.test(ch)) tamil++;
    else if (TELUGU.test(ch)) telugu++;
    else if (BENGALI.test(ch)) bengali++;
    else if (KANNADA.test(ch)) kannada++;
    else if (GUJARATI.test(ch)) gujarati++;
    else if (MALAYALAM.test(ch)) malayalam++;
    else if (GURMUKHI.test(ch)) gurmukhi++;
    else if (ODIA.test(ch)) odia++;
    else if (ARABIC.test(ch)) arabic++;
    else if (LATIN.test(ch)) latin++;
  }

  const totalScript = devanagari + tamil + telugu + bengali + kannada + gujarati + malayalam + gurmukhi + odia + arabic + latin;

  if (arabic > 0 && arabic >= latin) return 'ur';
  if (tamil > 0 && tamil >= latin) return 'ta';
  if (telugu > 0 && telugu >= latin) return 'te';
  if (bengali > 0 && bengali >= latin) return 'bn';
  if (kannada > 0 && kannada >= latin) return 'kn';
  if (gujarati > 0 && gujarati >= latin) return 'gu';
  if (malayalam > 0 && malayalam >= latin) return 'ml';
  if (gurmukhi > 0 && gurmukhi >= latin) return 'pa';
  if (odia > 0 && odia >= latin) return 'or';
  if (latin > 0 && latin >= devanagari) return classifyLatin(trimmed);
  if (devanagari > 0) {
    const marathiScore = countMarathiMarkers(trimmed);
    return marathiScore >= 1 ? 'mr' : 'hi';
  }
  if (totalScript === 0) return classifyLatin(trimmed);

  return 'hi';
}

/** Type describing the current locale of a message. */
export type LanguageStats = {
  language: LanguageCode;
  confidence: number;
  script: string;
};

/**
 * Detect the language of the given text and return a numeric confidence
 * (0-1) plus the detected script name.
 */
export function detectLanguageWithStats(text: string): LanguageStats {
  const trimmed = (text ?? '').trim();
  if (!trimmed) {
    return { language: 'hi', confidence: 0, script: 'Devanagari' };
  }

  let devanagari = 0;
  let tamil = 0;
  let telugu = 0;
  let bengali = 0;
  let kannada = 0;
  let gujarati = 0;
  let malayalam = 0;
  let gurmukhi = 0;
  let odia = 0;
  let arabic = 0;
  let latin = 0;

  for (const ch of trimmed) {
    if (DEVANAGARI.test(ch)) devanagari++;
    else if (TAMIL.test(ch)) tamil++;
    else if (TELUGU.test(ch)) telugu++;
    else if (BENGALI.test(ch)) bengali++;
    else if (KANNADA.test(ch)) kannada++;
    else if (GUJARATI.test(ch)) gujarati++;
    else if (MALAYALAM.test(ch)) malayalam++;
    else if (GURMUKHI.test(ch)) gurmukhi++;
    else if (ODIA.test(ch)) odia++;
    else if (ARABIC.test(ch)) arabic++;
    else if (LATIN.test(ch)) latin++;
  }

  const totalScript = devanagari + tamil + telugu + bengali + kannada + gujarati + malayalam + gurmukhi + odia + arabic + latin;

  const scores: Record<Exclude<LanguageCode, 'hinglish'>, number> = {
    hi: devanagari,
    en: latin,
    ta: tamil,
    te: telugu,
    mr: devanagari,
    bn: bengali,
    kn: kannada,
    gu: gujarati,
    ml: malayalam,
    pa: gurmukhi,
    or: odia,
    ur: arabic,
  };

  const scriptName =
    arabic > 0 && arabic >= latin
      ? 'Arabic'
      : tamil > 0 && tamil >= latin
        ? 'Tamil'
        : telugu > 0 && telugu >= latin
          ? 'Telugu'
          : bengali > 0 && bengali >= latin
            ? 'Bengali'
            : kannada > 0 && kannada >= latin
              ? 'Kannada'
              : gujarati > 0 && gujarati >= latin
                ? 'Gujarati'
                : malayalam > 0 && malayalam >= latin
                  ? 'Malayalam'
                  : gurmukhi > 0 && gurmukhi >= latin
                    ? 'Gurmukhi'
                    : odia > 0 && odia >= latin
                      ? 'Odia'
                      : devanagari > 0 && devanagari >= latin
                        ? 'Devanagari'
                        : latin > 0
                          ? 'Latin'
                          : 'Unknown';

  const language = detectLanguage(trimmed);

  let confidence = 0;
  if (language === 'hinglish' || language === 'en') {
    const hinglishHits = countMatches(trimmed, HINGLISH_DICT);
    const englishHits = countMatches(trimmed, ENGLISH_DICT);
    const hits = hinglishHits + englishHits;
    confidence = latin === 0 ? 0 : Math.min(1, latin / (latin + hits * 0.5));
  } else {
    const dominant = scores[language as Exclude<LanguageCode, 'hinglish'>] ?? 0;
    confidence = totalScript === 0 ? 0 : dominant / (totalScript === 0 ? 1 : totalScript);
  }

  if (language === 'mr' && devanagari > 0) {
    confidence = Math.min(1, confidence + 0.05);
  }

  return { language, confidence: Math.max(0, Math.min(1, confidence)), script: scriptName };
}

/**
 * Return the CRITICAL LANGUAGE RULE prompt fragment instructing the AI
 * persona on which language and voice to use for the given code.
 */
export function languageInstructions(lang: LanguageCode): string {
  switch (lang) {
    case 'hinglish':
      return (
        'CRITICAL LANGUAGE RULE: You are a warm, caring senior female advocate. ' +
        'Respond ONLY in Hinglish — natural Hindi written in Roman/Latin script (not Devanagari), ' +
        'e.g. "Aapki baat mujhe samajh aa gayi, beta." Address the user as Sir or Ma\'am. ' +
        'Never write in Devanagari script. Keep legal explanations simple and reassuring.'
      );
    case 'hi':
      return (
        'CRITICAL LANGUAGE RULE: You are a warm, caring senior female advocate. ' +
        'Respond ONLY in pure Hindi written in Devanagari script (हिन्दी). ' +
        'Address the user respectfully (e.g. "आप" / "जी") as Sir or Ma\'am. ' +
        'Keep legal explanations simple, reassuring, and in clear Hindi.'
      );
    case 'ta':
      return (
        'CRITICAL LANGUAGE RULE: Respond in Tamil as a caring senior female advocate, ' +
        'address user as Sir or Ma\'am. Keep legal explanations simple and reassuring.'
      );
    case 'te':
      return (
        'CRITICAL LANGUAGE RULE: Respond in Telugu as a caring senior female advocate, ' +
        'address user as Sir or Ma\'am. Keep legal explanations simple and reassuring.'
      );
    case 'mr':
      return (
        'CRITICAL LANGUAGE RULE: Respond in Marathi as a caring senior female advocate, ' +
        'address user as Sir or Ma\'am. Keep legal explanations simple and reassuring.'
      );
    case 'bn':
      return (
        'CRITICAL LANGUAGE RULE: Respond in Bengali as a caring senior female advocate, ' +
        'address user as Sir or Ma\'am. Keep legal explanations simple and reassuring.'
      );
    case 'kn':
      return (
        'CRITICAL LANGUAGE RULE: Respond in Kannada as a caring senior female advocate, ' +
        'address user as Sir or Ma\'am. Keep legal explanations simple and reassuring.'
      );
    case 'gu':
      return (
        'CRITICAL LANGUAGE RULE: Respond in Gujarati as a caring senior female advocate, ' +
        'address user as Sir or Ma\'am. Keep legal explanations simple and reassuring.'
      );
    case 'ml':
      return (
        'CRITICAL LANGUAGE RULE: Respond in Malayalam as a caring senior female advocate, ' +
        'address user as Sir or Ma\'am. Keep legal explanations simple and reassuring.'
      );
    case 'pa':
      return (
        'CRITICAL LANGUAGE RULE: Respond in Punjabi (Gurmukhi script) as a caring senior female advocate, ' +
        'address user as Sir or Ma\'am. Keep legal explanations simple and reassuring.'
      );
    case 'or':
      return (
        'CRITICAL LANGUAGE RULE: Respond in Odia as a caring senior female advocate, ' +
        'address user as Sir or Ma\'am. Keep legal explanations simple and reassuring.'
      );
    case 'ur':
      return (
        'CRITICAL LANGUAGE RULE: Respond in Urdu (Nastaliq/Arabic script) as a caring senior female advocate, ' +
        'address user as Sir or Ma\'am. Keep legal explanations simple and reassuring. ' +
        'Use formal Urdu vocabulary. Respond in RTL format.'
      );
    case 'en':
      return (
        'CRITICAL LANGUAGE RULE: Respond in clear, simple English as a caring senior ' +
        'female advocate. Address the user as Sir or Ma\'am. Keep legal explanations ' +
        'simple and reassuring.'
      );
    default:
      return languageInstructions('hi');
  }
}