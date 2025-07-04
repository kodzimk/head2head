/**
 * Username Normalization Utility
 * Converts non-ASCII characters to ASCII equivalents and generates clean, short usernames
 */

// Character mapping for common non-ASCII characters
const CHAR_MAP: Record<string, string> = {
  // Cyrillic to Latin
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z',
  'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
  'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E', 'Ж': 'Zh', 'З': 'Z',
  'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R',
  'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'C', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
  'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',

  // Arabic numerals and diacritics
  'أ': 'a', 'إ': 'i', 'آ': 'a', 'ا': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h',
  'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd',
  'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm',
  'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y',

  // Chinese/Japanese common characters (simplified)
  '张': 'zhang', '王': 'wang', '李': 'li', '刘': 'liu', '陈': 'chen', '杨': 'yang', '赵': 'zhao',
  '黄': 'huang', '周': 'zhou', '吴': 'wu', '徐': 'xu', '孙': 'sun', '胡': 'hu', '朱': 'zhu',

  // German/Nordic characters
  'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss', 'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue',
  'å': 'aa', 'æ': 'ae', 'ø': 'oe', 'Å': 'Aa', 'Æ': 'Ae', 'Ø': 'Oe',

  // French characters
  'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ç': 'c', 'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
  'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i', 'ñ': 'n', 'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o',
  'ù': 'u', 'ú': 'u', 'û': 'u', 'ý': 'y', 'ÿ': 'y',
  'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ç': 'C', 'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
  'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I', 'Ñ': 'N', 'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O',
  'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ý': 'Y'
};

// List of proper name components
const PROPER_NAME_PREFIXES = [
  'star', 'sky', 'sun', 'moon', 'wind', 'fire', 'ice', 'storm', 'rain', 'snow',
  'leaf', 'wave', 'rock', 'sand', 'cloud', 'mist', 'dawn', 'dusk', 'night', 'day'
];

const PROPER_NAME_SUFFIXES = [
  'rider', 'runner', 'walker', 'hunter', 'seeker', 'finder', 'keeper', 'master',
  'chaser', 'racer', 'jumper', 'dancer', 'player', 'guard', 'scout', 'guide'
];

/**
 * Generates a random proper name between 4 and 8 characters
 */
export function generateProperName(): string {
  // Get random prefix and suffix
  const prefix = PROPER_NAME_PREFIXES[Math.floor(Math.random() * PROPER_NAME_PREFIXES.length)];
  const suffix = PROPER_NAME_SUFFIXES[Math.floor(Math.random() * PROPER_NAME_SUFFIXES.length)];
  
  // Combine and ensure length is between 4 and 8
  let name = prefix + suffix;
  if (name.length > 8) {
    // If too long, take first 4 chars of prefix and first 4 chars of suffix
    name = prefix.substring(0, 4) + suffix.substring(0, 4);
  } else if (name.length < 4) {
    // If too short (unlikely with our word lists), add random number
    name += Math.floor(Math.random() * 100);
  }
  
  return name;
}

/**
 * Normalizes a name by converting non-ASCII characters to ASCII equivalents
 */
export function normalizeToAscii(input: string): string {
  return input
    .split('')
    .map(char => CHAR_MAP[char] || char)
    .join('')
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove any remaining non-alphanumeric characters except spaces
    .trim();
}

/**
 * Generates a clean username from a display name
 */
export function generateUsername(displayName: string): string {
  if (!displayName || displayName.trim().length === 0 || displayName.includes('@')) {
    // If empty, email address, or invalid, generate a proper name
    return generateProperName();
  }

  // Step 1: Normalize to ASCII
  let normalized = normalizeToAscii(displayName);
  
  // Step 2: Handle empty result
  if (!normalized || normalized.length === 0) {
    return generateProperName();
  }

  // Step 3: Split into words and process
  const words = normalized.toLowerCase().split(/\s+/).filter(word => word.length > 0);
  
  if (words.length === 0) {
    return generateProperName();
  }

  let username = '';

  if (words.length === 1) {
    // Single word - use first 12 characters
    username = words[0].substring(0, 12);
  } else if (words.length === 2) {
    // Two words - combine first 6 chars of each
    username = words[0].substring(0, 6) + words[1].substring(0, 6);
  } else {
    // Multiple words - use first char of first word + first 4 chars of each subsequent word
    username = words[0].substring(0, 4) + words.slice(1, 3).map(word => word.substring(0, 4)).join('');
  }

  // Step 4: Ensure minimum length and add random suffix if too short
  if (username.length < 3) {
    username += Math.floor(Math.random() * 1000);
  }

  // Step 5: Ensure maximum length
  username = username.substring(0, 15);

  // Step 6: Ensure it doesn't start with a number
  if (/^\d/.test(username)) {
    username = 'u' + username.substring(0, 14);
  }

  return username;
}

/**
 * Generates multiple username suggestions from a display name
 */
export function generateUsernameSuggestions(displayName: string, count: number = 3): string[] {
  const baseUsername = generateUsername(displayName);
  const suggestions: string[] = [baseUsername];

  // Generate variations
  for (let i = 1; i < count; i++) {
    const variation = baseUsername + Math.floor(Math.random() * 1000);
    suggestions.push(variation.substring(0, 15));
  }

  // Add creative variations
  if (baseUsername.length <= 12) {
    suggestions.push(baseUsername + Math.floor(Math.random() * 100));
  }

  if (baseUsername.length <= 10) {
    const suffixes = ['pro', 'win', 'ace', 'top', 'max'];
    const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    suggestions.push((baseUsername + randomSuffix).substring(0, 15));
  }

  // Remove duplicates and ensure unique suggestions
  return Array.from(new Set(suggestions)).slice(0, count);
}

/**
 * Validates if a username is acceptable
 */
export function isValidUsername(username: string): { valid: boolean; reason?: string } {
  if (!username || username.trim().length === 0) {
    return { valid: false, reason: 'Username cannot be empty' };
  }

  const trimmed = username.trim();

  if (trimmed.length < 3) {
    return { valid: false, reason: 'Username must be at least 3 characters long' };
  }

  if (trimmed.length > 20) {
    return { valid: false, reason: 'Username must be less than 20 characters long' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { valid: false, reason: 'Username can only contain letters, numbers, and underscores' };
  }

  if (/^\d/.test(trimmed)) {
    return { valid: false, reason: 'Username cannot start with a number' };
  }

  const reservedWords = ['admin', 'root', 'user', 'test', 'null', 'undefined', 'api', 'www'];
  if (reservedWords.includes(trimmed.toLowerCase())) {
    return { valid: false, reason: 'This username is reserved' };
  }

  return { valid: true };
}

export default {
  normalizeToAscii,
  generateUsername,
  generateUsernameSuggestions,
  isValidUsername
}; 