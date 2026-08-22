export interface ScriptKeyboardLayout {
  languageCodePrefix: string;
  scriptName: string;
  vowels: string[];
  consonants: string[];
  matrasAndDiacritics: string[];
  numbersAndSymbols?: string[];
}

export const SCRIPT_KEYBOARDS: Record<string, ScriptKeyboardLayout> = {
  te: {
    languageCodePrefix: 'te',
    scriptName: 'Telugu (తెలుగు లిపి)',
    vowels: ['అ', 'ఆ', 'ఇ', 'ఈ', 'ఉ', 'ఊ', 'ఋ', 'ౠ', 'ఎ', 'ఏ', 'ఐ', 'ఒ', 'ఓ', 'ఔ'],
    consonants: [
      'క', 'ఖ', 'గ', 'ఘ', 'ఙ',
      'చ', 'ఛ', 'జ', 'ఝ', 'ఞ',
      'ట', 'ఠ', 'డ', 'ఢ', 'ణ',
      'త', 'థ', 'ద', 'ధ', 'న',
      'ప', 'ఫ', 'బ', 'భ', 'మ',
      'య', 'ర', 'ల', 'వ', 'శ',
      'ష', 'స', 'హ', 'ళ', 'క్ష', 'ఱ',
    ],
    matrasAndDiacritics: [
      '్', 'ా', 'ి', 'ీ', 'ు', 'ూ', 'ృ', 'ె', 'ే', 'ై', 'ొ', 'ో', 'ౌ', 'ం', 'ః',
    ],
    numbersAndSymbols: ['౦', '౧', '౨', '౩', '౪', '౫', '౬', '౭', '౮', '౯', '?', '!', '।'],
  },
  hi: {
    languageCodePrefix: 'hi',
    scriptName: 'Devanagari (हिन्दी / मराठी / संस्कृतम् / मैथिली)',
    vowels: ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ'],
    consonants: [
      'क', 'ख', 'ग', 'घ', 'ङ',
      'च', 'छ', 'ज', 'झ', 'ञ',
      'ट', 'ठ', 'ड', 'ढ', 'ण',
      'त', 'थ', 'द', 'ध', 'न',
      'प', 'फ', 'ब', 'भ', 'म',
      'य', 'र', 'ल', 'व', 'श',
      'ष', 'स', 'ह', 'क्ष', 'त्र', 'ज्ञ', 'ड़', 'ढ़',
    ],
    matrasAndDiacritics: [
      '्', 'ा', 'ि', 'ी', 'ु', 'ू', 'ृ', 'े', 'ै', 'ो', 'ौ', 'ं', 'ः', 'ँ', '़', 'ऽ', '।', '॥',
    ],
    numbersAndSymbols: ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९', '?', '!'],
  },
  ta: {
    languageCodePrefix: 'ta',
    scriptName: 'Tamil (தமிழ்)',
    vowels: ['அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'எ', 'ஏ', 'ஐ', 'ஒ', 'ஓ', 'ஔ'],
    consonants: [
      'க', 'ங', 'ச', 'ஞ', 'ட', 'ண',
      'த', 'ந', 'ப', 'ம', 'ய', 'ர',
      'ல', 'வ', 'ழ', 'ள', 'ற', 'ன',
      'ஜ', 'ஷ', 'ஸ', 'ஹ', 'க்ஷ',
    ],
    matrasAndDiacritics: [
      '்', 'ா', 'ி', 'ீ', 'ு', 'ூ', 'ெ', 'ே', 'ை', 'ொ', 'ோ', 'ௌ', 'ஃ',
    ],
    numbersAndSymbols: ['௦', '௧', '௨', '௩', '௪', '௫', '௬', '௭', '௮', '௯', '?', '!'],
  },
  kn: {
    languageCodePrefix: 'kn',
    scriptName: 'Kannada (ಕನ್ನಡ)',
    vowels: ['ಅ', 'ಆ', 'ಇ', 'ಈ', 'ಉ', 'ಊ', 'ಋ', 'ಎ', 'ಏ', 'ಐ', 'ಒ', 'ಓ', 'ಔ'],
    consonants: [
      'ಕ', 'ಖ', 'ಗ', 'ಘ', 'ಙ',
      'ಚ', 'ಛ', 'ಜ', 'ಝ', 'ಞ',
      'ಟ', 'ಠ', 'ಡ', 'ಢ', 'ಣ',
      'ತ', 'ಥ', 'ದ', 'ಧ', 'ನ',
      'ಪ', 'ಫ', 'ಬ', 'ಭ', 'ಮ',
      'ಯ', 'ರ', 'ಲ', 'ವ', 'ಶ',
      'ಷ', 'ಸ', 'ಹ', 'ಳ', 'ಱ',
    ],
    matrasAndDiacritics: [
      '್', 'ಾ', 'ಿ', 'ೀ', 'ು', 'ೂ', 'ೃ', 'ೆ', 'ೇ', 'ೈ', 'ೊ', 'ೋ', 'ೌ', 'ಂ', 'ಃ',
    ],
    numbersAndSymbols: ['೦', '೧', '೨', '೩', '೪', '೫', '೬', '೭', '೮', '೯', '?', '!'],
  },
  ml: {
    languageCodePrefix: 'ml',
    scriptName: 'Malayalam (മലയാളം)',
    vowels: ['അ', 'ആ', 'ഇ', 'ഈ', 'ഉ', 'ഊ', 'ഋ', 'എ', 'ഏ', 'ഐ', 'ഒ', 'ഓ', 'ഔ'],
    consonants: [
      'ക', 'ഖ', 'ഗ', 'ഘ', 'ങ',
      'ച', 'ഛ', 'ജ', 'ഝ', 'ഞ',
      'ട', 'ഠ', 'ഡ', 'ഢ', 'ണ',
      'ത', 'ഥ', 'ദ', 'ധ', 'ന',
      'പ', 'ഫ', 'ബ', 'ഭ', 'മ',
      'യ', 'ര', 'ല', 'വ', 'ശ',
      'ഷ', 'സ', 'ഹ', 'ള', 'ഴ', 'റ',
    ],
    matrasAndDiacritics: [
      '്', 'ാ', 'ി', 'ീ', 'ു', 'ൂ', 'ൃ', 'െ', 'േ', 'ൈ', 'ൊ', 'ോ', 'ൌ', 'ം', 'ഃ',
    ],
    numbersAndSymbols: ['൦', '൧', '൨', '൩', '൪', '൫', '൬', '൭', '൮', '൯', '?', '!'],
  },
  bn: {
    languageCodePrefix: 'bn',
    scriptName: 'Bengali / Assamese (বাংলা / অসমীয়া)',
    vowels: ['অ', 'আ', 'ই', 'ঈ', 'উ', 'ঊ', 'ঋ', 'এ', 'ঐ', 'ও', 'ঔ'],
    consonants: [
      'ক', 'খ', 'গ', 'ঘ', 'ঙ',
      'চ', 'ছ', 'জ', 'ঝ', 'ঞ',
      'ট', 'ঠ', 'ড', 'ঢ', 'ণ',
      'ত', 'থ', 'দ', 'ध', 'ন',
      'প', 'ফ', 'ব', 'ভ', 'ম',
      'য', 'র', 'ল', 'শ', 'ষ', 'স', 'হ',
      'ড়', 'ঢ়', 'য়', 'ৎ', 'ক্ষ', 'ৱ', 'ৰ',
    ],
    matrasAndDiacritics: [
      '্', 'া', 'ি', 'ী', 'ু', 'ূ', 'ৃ', 'ে', 'ৈ', 'ো', 'ৌ', 'ঁ', 'ং', 'ঃ', '।',
    ],
    numbersAndSymbols: ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯', '?', '!'],
  },
  pa: {
    languageCodePrefix: 'pa',
    scriptName: 'Gurmukhi (ਪੰਜਾਬੀ)',
    vowels: ['ਅ', 'ਆ', 'ਇ', 'ਈ', 'ਉ', 'ਊ', 'ਏ', 'ਐ', 'ਓ', 'ਔ'],
    consonants: [
      'ਕ', 'ਖ', 'ਗ', 'ਘ', 'ਙ',
      'ਚ', 'ਛ', 'ਜ', 'ਝ', 'ਞ',
      'ਟ', 'ਠ', 'ਡ', 'ਢ', 'ਣ',
      'ਤ', 'ਥ', 'ਦ', 'ਧ', 'ਨ',
      'ਪ', 'ਫ', 'ਬ', 'ਭ', 'ਮ',
      'ਯ', 'ਰ', 'ਲ', 'ਵ', 'ੜ',
      'ਸ਼', 'ਖ਼', 'ਗ਼', 'ਜ਼', 'ਫ਼',
    ],
    matrasAndDiacritics: [
      '੍', 'ਾ', 'ਿ', 'ੀ', 'ੁ', 'ੂ', 'ੇ', 'ੈ', 'ੋ', 'ੌ', 'ਂ', 'ੱ', '਼', 'ੴ', '।',
    ],
    numbersAndSymbols: ['੦', '੧', '੨', '੩', '੪', '੫', '੬', '੭', '੮', '੯', '?', '!'],
  },
  or: {
    languageCodePrefix: 'or',
    scriptName: 'Odia (ଓଡ଼ିଆ)',
    vowels: ['ଅ', 'ଆ', 'ଇ', 'ଈ', 'ଉ', 'ଊ', 'ଋ', 'ଏ', 'ଐ', 'ଓ', 'ଔ'],
    consonants: [
      'କ', 'ଖ', 'ଗ', 'ଘ', 'ଙ',
      'ଚ', 'ଛ', 'ଜ', 'ଝ', 'ଞ',
      'ଟ', 'ଠ', 'ଡ', 'ଢ', 'ଣ',
      'ତ', 'ଥ', 'ଦ', 'ଧ', 'ନ',
      'ପ', 'ଫ', 'ବ', 'ଭ', 'ମ',
      'ଯ', 'ର', 'ଲ', 'ଳ', 'ଶ',
      'ଷ', 'ସ', 'ହ', 'ୟ', 'ଡ଼', 'ଢ଼',
    ],
    matrasAndDiacritics: [
      '୍', 'ା', 'ି', 'ୀ', 'ୁ', 'ୂ', 'ୃ', 'େ', 'ୈ', 'ୋ', 'ୌ', 'ଂ', 'ଃ', 'ଁ', '।',
    ],
    numbersAndSymbols: ['୦', '୧', '୨', '୩', '୪', '୫', '୬', '୭', '୮', '୯', '?', '!'],
  },
  ur: {
    languageCodePrefix: 'ur',
    scriptName: 'Nastaliq / Arabic / Perso-Arabic (اردو / کٲشُر / سنڌي / فارسی / العربية)',
    vowels: ['ا', 'آ', 'و', 'ی', 'ے', 'ع', 'ء'],
    consonants: [
      'ب', 'پ', 'ت', 'ٹ', 'ث',
      'ج', 'چ', 'ح', 'خ',
      'د', 'ڈ', 'ذ', 'ر', 'ڑ', 'ز', 'ژ',
      'س', 'ش', 'ص', 'ض', 'ط', 'ظ',
      'غ', 'ف', 'ق', 'ک', 'گ',
      'ل', 'م', 'ن', 'ں', 'و', 'ہ', 'ھ', 'ی', 'ے',
    ],
    matrasAndDiacritics: [
      'ً', 'ٍ', 'ٌ', 'َ', 'ُ', 'ِ', 'ّ', 'ْ', 'ٹ', 'ڈ', 'ڑ', 'ں', 'ۂ', 'ء', '؟', '،',
    ],
    numbersAndSymbols: ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹', '؟', '!', '٪'],
  },
  sat: {
    languageCodePrefix: 'sat',
    scriptName: 'Ol Chiki (ᱥᱟᱱᱛᱟᱲᱤ / Santali)',
    vowels: ['ᱚ', 'ᱟ', 'ᱤ', 'ᱩ', 'ᱮ', 'ᱳ'],
    consonants: [
      'ᱛ', 'ᱜ', 'ᱝ', 'ᱞ', 'ᱠ', 'ᱡ', 'ᱢ', 'ᱣ',
      'ᱥ', 'ᱦ', 'ᱧ', 'ᱨ', 'ᱪ', 'ᱫ', 'ᱬ', 'ᱭ',
      'ᱯ', 'ᱰ', 'ᱱ', 'ᱲ', 'ᱴ', 'ᱵ', 'ᱶ', 'ᱷ',
    ],
    matrasAndDiacritics: [
      'ᱸ', 'ᱹ', 'ᱺ', 'ᱻ', 'ᱼ', 'ᱽ',
    ],
    numbersAndSymbols: ['᱐', '᱑', '᱒', '᱓', '᱔', '᱕', '᱖', '᱗', '᱘', '᱙', '?', '!'],
  },
  ar: {
    languageCodePrefix: 'ar',
    scriptName: 'Arabic (العربية)',
    vowels: ['ا', 'و', 'ي', 'ى', 'ء', 'أ', 'إ', 'آ', 'ة'],
    consonants: [
      'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز',
      'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق',
      'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي',
    ],
    matrasAndDiacritics: [
      'َ', 'ُ', 'ِ', 'ً', 'ٌ', 'ٍ', 'ّ', 'ْ', 'ـ', '؟', '،',
    ],
    numbersAndSymbols: ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '؟', '!'],
  },
  el: {
    languageCodePrefix: 'el',
    scriptName: 'Greek (Ελληνικά)',
    vowels: ['α', 'ε', 'η', 'ι', 'ο', 'υ', 'ω', 'ά', 'έ', 'ή', 'ί', 'ό', 'ύ', 'ώ'],
    consonants: [
      'β', 'γ', 'δ', 'ζ', 'θ', 'κ', 'λ', 'μ', 'ν', 'ξ',
      'π', 'ρ', 'σ', 'ς', 'τ', 'φ', 'χ', 'ψ',
    ],
    matrasAndDiacritics: ['΄', '¨', '·', ';', '»', '«'],
    numbersAndSymbols: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ';', '!'],
  },
  ru: {
    languageCodePrefix: 'ru',
    scriptName: 'Cyrillic (Русский / Українська)',
    vowels: ['а', 'е', 'ё', 'и', 'о', 'у', 'ы', 'э', 'ю', 'я', 'і', 'ї', 'є'],
    consonants: [
      'б', 'в', 'г', 'ґ', 'д', 'ж', 'з', 'й', 'к', 'л', 'м',
      'н', 'п', 'р', 'с', 'т', 'ф', 'х', 'ц', 'ч', 'ш', 'щ',
    ],
    matrasAndDiacritics: ['ъ', 'ь', '’', '«', '»'],
    numbersAndSymbols: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '?', '!'],
  },
  he: {
    languageCodePrefix: 'he',
    scriptName: 'Hebrew (עברית)',
    vowels: ['א', 'ה', 'ו', 'י', 'ע'],
    consonants: [
      'ב', 'ג', 'ד', 'ז', 'ח', 'ט', 'כ', 'ך', 'ל',
      'מ', 'ם', 'נ', 'ן', 'ס', 'פ', 'ף', 'צ', 'ץ',
      'ק', 'ר', 'ש', 'ת',
    ],
    matrasAndDiacritics: ['ּ', 'ֿ', 'ׁ', 'ׂ', '־', '״', '׳'],
    numbersAndSymbols: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '?', '!'],
  },
};

export function getScriptKeyboardForLanguage(languageCodeOrPrefix: string): ScriptKeyboardLayout | null {
  const clean = languageCodeOrPrefix.toLowerCase().trim();
  const prefix = clean.split('-')[0];

  // Direct prefix lookup
  if (SCRIPT_KEYBOARDS[prefix]) {
    return SCRIPT_KEYBOARDS[prefix];
  }

  // Devanagari family languages: mr (Marathi), sa (Sanskrit), mai (Maithili), doi (Dogri), brx (Bodo), ne (Nepali), gom/kok (Konkani)
  if (['mr', 'sa', 'mai', 'doi', 'brx', 'ne', 'gom', 'kok'].includes(prefix)) {
    return SCRIPT_KEYBOARDS.hi;
  }

  // Bengali / Assamese family
  if (['bn', 'as', 'mni'].includes(prefix)) {
    return SCRIPT_KEYBOARDS.bn;
  }

  // Perso-Arabic family: ur, ks, sd, fa, ar
  if (['ks', 'sd', 'fa'].includes(prefix)) {
    return SCRIPT_KEYBOARDS.ur;
  }

  // Cyrillic family: ru, uk
  if (['ru', 'uk'].includes(prefix)) {
    return SCRIPT_KEYBOARDS.ru;
  }

  return null;
}
