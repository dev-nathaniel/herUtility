/**
 * Validates a UK postcode.
 * 
 * This regex checks for standard UK postcode formats.
 * It supports formats like:
 * - AA9A 9AA
 * - A9A 9AA
 * - A9 9AA
 * - A99 9AA
 * - AA9 9AA
 * - AA99 9AA
 * 
 * It is case-insensitive and allows for optional spacing.
 * Note: This is a robust regex but may not cover every single edge case (like Girobank or non-geographic).
 * For general public use, it covers the vast majority of valid postcodes.
 */
export const isValidUKPostcode = (postcode: string): boolean => {
  if (!postcode) return false;
  
  // Remove all whitespace for validation
  const cleanPostcode = postcode.replace(/\s+/g, "").toUpperCase();
  
  // Regex for UK Postcodes
  // See: https://stackoverflow.com/questions/164979/uk-postcode-regex-comprehensive
  const regex = /^([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})$/;
  
  return regex.test(cleanPostcode);
};
