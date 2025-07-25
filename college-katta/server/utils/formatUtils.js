/**
 * Formats a year string from numeric (e.g., "1st Year") to text format (e.g., "First Year")
 * @param {string} year - The year to format
 * @returns {string} - The formatted year
 */
export const formatYearToText = (year) => {
  if (!year) return '';
  
  // If already in text format, return as is
  if (year.includes('First') || year.includes('Second') || 
      year.includes('Third') || year.includes('Fourth') || 
      year.includes('Graduate')) {
    return year;
  }
  
  // Convert numeric format to text format
  if (year.includes('1st')) return 'First Year';
  if (year.includes('2nd')) return 'Second Year';
  if (year.includes('3rd')) return 'Third Year';
  if (year.includes('4th')) return 'Fourth Year';
  
  // Return original if no match
  return year;
}; 