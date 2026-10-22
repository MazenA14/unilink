// Utility function to format year text to "23/24" format
export const formatYearToShort = (yearText: string): string => {
  // Extract years from various formats like "2023/2024", "2023-2024", "Fall 2023", etc.
  const yearMatch = yearText.match(/(\d{4})/g);

  if (yearMatch && yearMatch.length >= 1) {
    const firstYear = yearMatch[0];
    const firstYearShort = firstYear.slice(-2); // Get last 2 digits

    if (yearMatch.length >= 2) {
      // Two years found (e.g., "2023/2024")
      const secondYear = yearMatch[1];
      const secondYearShort = secondYear.slice(-2);
      return `${firstYearShort}/${secondYearShort}`;
    } else {
      // Single year found, assume next year
      const nextYear = (parseInt(firstYear) + 1).toString().slice(-2);
      return `${firstYearShort}/${nextYear}`;
    }
  }

  // Fallback: return original text if no year pattern found
  return yearText;
};
