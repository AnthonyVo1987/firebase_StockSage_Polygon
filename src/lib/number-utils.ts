
/**
 * @fileOverview Utility functions for number formatting.
 */

/**
 * Formats a numeric value to two decimal places, returning null for invalid inputs.
 * @param value - The value to format (can be number, string, null, or undefined).
 * @returns A number rounded to two decimal places, or null if input is invalid.
 */
export function formatToTwoDecimalsOrNull(value: any): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const num = Number(value);
  if (isNaN(num)) {
    return null;
  }
  // Round to 2 decimal places and convert back to number
  return parseFloat(num.toFixed(2));
}
