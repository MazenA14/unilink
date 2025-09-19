
/**
 * Unified grading color system for the entire app
 * All grading colors should use these functions for consistency
 */

/**
 * Get color for percentage-based grades
 * Ranges: 100%-85%, 85%-70%, 70%-40%, 40%-10%, 10%-0%
 */
export const getGradeColor = (percentage: number, colors: any): string => {
  if (percentage >= 85) return colors.gradeExcellent; // 100%-85%
  if (percentage >= 70) return colors.gradeGood; // 85%-70%
  if (percentage >= 40) return colors.gradeAverage; // 70%-40%
  if (percentage >= 10) return colors.gradeBelowAverage; // 40%-10%
  return colors.gradeFailing; // 10%-0%
};

/**
 * Get color for Cumulative GPA based on official GUC transcript key
 * Ranges: 0.7-1.54 (Excellent), 1.55-2.54 (Very Good), 2.55-3.54 (Good), 3.55-3.70 (Satisfactory)
 * Note: 0.7 is best, 3.70 is worst
 */
export const getCumulativeGPAColor = (gpa: string, colors: any): string => {
  const numericGPA = parseFloat(gpa);
  
  // Official GUC GPA ranges from transcript key
  if (numericGPA >= 0.7 && numericGPA <= 1.54) {
    return colors.gradeExcellent; // 0.7-1.54 (Excellent)
  } else if (numericGPA >= 1.55 && numericGPA <= 2.54) {
    return colors.gradeGood; // 1.55-2.54 (Very Good)
  } else if (numericGPA >= 2.55 && numericGPA <= 3.54) {
    return colors.gradeAverage; // 2.55-3.54 (Good)
  } else if (numericGPA >= 3.55 && numericGPA <= 3.70) {
    return colors.gradeBelowAverage; // 3.55-3.70 (Satisfactory)
  } else {
    return colors.gradeFailing; // Outside valid range
  }
};

/**
 * Get color for Semester and Course GPAs using custom ranges
 * Ranges: 0.7-1.7, 1.7-2.3, 2.3-3, 3-3.7, 3.7-4.3, 4.3-5
 * Note: 0.7 is best, 5.0 is worst
 */
export const getGPAColor = (gpa: string, colors: any): string => {
  const numericGPA = parseFloat(gpa);
  
  // Custom GPA ranges for semester and course GPAs
  if (numericGPA >= 0.7 && numericGPA < 1.7) {
    return colors.gradeExcellent; // 0.7-1.7 (A equivalent)
  } else if (numericGPA >= 1.7 && numericGPA < 2.3) {
    return colors.gradeGood; // 1.7-2.3 (B equivalent)
  } else if (numericGPA >= 2.3 && numericGPA < 3.0) {
    return colors.gradeAverage; // 2.3-3.0 (C equivalent)
  } else if (numericGPA >= 3.0 && numericGPA < 3.7) {
    return colors.gradeBelowAverage; // 3.0-3.7 (D equivalent)
  } else if (numericGPA >= 3.7 && numericGPA < 4.3) {
    return colors.gradeFailing; // 3.7-4.3 (F equivalent)
  } else {
    return colors.gradeFailing; // 4.3-5.0 (F equivalent)
  }
};

/**
 * Get color for letter grades (A, B, C, D, F)
 * Maps to the same color system as percentages and GPA
 */
export const getLetterGradeColor = (letterGrade: string, colors: any): string => {
  const grade = letterGrade.toUpperCase().trim();
  
  switch (grade) {
    case 'A':
    case 'A+':
    case 'A-':
      return colors.gradeExcellent; // Green for A grades
    case 'B':
    case 'B+':
    case 'B-':
      return colors.gradeGood; // Light Green for B grades
    case 'C':
    case 'C+':
    case 'C-':
      return colors.gradeAverage; // Orange for C grades
    case 'D':
    case 'D+':
      return colors.gradeBelowAverage; // Red Orange for D grades
    case 'F':
      return colors.gradeFailing; // Red for F grades
    default:
      return colors.secondaryFont; // Default color for unknown grades
  }
};
