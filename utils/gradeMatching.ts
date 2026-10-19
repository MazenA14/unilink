import { GradeData } from './types/gucTypes';

const extractCourseCode = (text: string) => {
  const match = text.match(/([A-Z]{2,4}[a-z]?\d{3,4})/);
  return match ? match[1] : '';
};

/** Finds the season-level midterm grade that belongs to a current course. */
export function matchMidtermGradeToCourse(course: { text: string }, midtermGrades: GradeData[]): GradeData | undefined {
  const courseCode = extractCourseCode(course.text);

  return midtermGrades.find(grade => {
    const gradeCode = extractCourseCode(grade.course);

    const exactMatch = grade.course === course.text;
    const containsMatch1 = grade.course.toLowerCase().includes(course.text.toLowerCase());
    const containsMatch2 = course.text.toLowerCase().includes(grade.course.toLowerCase());
    const codeMatch = courseCode && gradeCode && courseCode === gradeCode;

    return exactMatch || containsMatch1 || containsMatch2 || codeMatch;
  });
}
