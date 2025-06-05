
/**
 * @fileOverview Utility functions for date and time formatting.
 */

/**
 * Formats a timestamp to a Pacific Time string (hh:mm:ss AM/PM).
 * @param timestamp - The timestamp to format. Can be an ISO 8601 string, 
 *                    a Unix timestamp in milliseconds, or a nanosecond timestamp.
 * @returns A string representing the time in Pacific Time, e.g., "02:30:45 PM",
 *          or "Invalid Date" if the input is not a valid timestamp.
 */
export function formatTimestampToPacificTime(timestamp: string | number): string {
  let date: Date;

  if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else if (typeof timestamp === 'number') {
    // Crude check for nanoseconds vs milliseconds (common in JavaScript Date.now() vs some APIs)
    // A timestamp in nanoseconds for a recent date would be a very large number.
    // E.g., Date.now() is ~1.7e12, while a nanosecond timestamp is ~1.7e18.
    // This threshold (1e14) assumes timestamps older than ~1973 are unlikely to be in nanoseconds.
    if (timestamp > 1e14) { // Likely nanoseconds
      date = new Date(timestamp / 1_000_000); // Convert nanoseconds to milliseconds
    } else { // Likely milliseconds
      date = new Date(timestamp);
    }
  } else {
    return "Invalid Date Input";
  }

  if (isNaN(date.getTime())) {
    return "Invalid Date";
  }

  try {
    return date.toLocaleTimeString('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch (error) {
    console.error("[date-utils] Error formatting date to Pacific Time:", error);
    // Fallback for environments that might not support timeZone (highly unlikely for 'America/Los_Angeles')
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }) + " (System Time, PT conversion failed)";
  }
}
