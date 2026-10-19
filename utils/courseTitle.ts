/**
 * Helpers for turning raw schedule course names into short, displayable titles.
 * Shared by the dashboard and the Android home-screen schedule widget.
 */

export type CourseNameMapping = { [courseId: string]: string };

// Extract course code from course name (e.g., "CSEN 701" -> "CSEN701")
export const extractCourseCode = (courseName: string): string => {
  if (!courseName) return '';

  const match = courseName.match(/([A-Z]{2,4}[a-z]?)\s*(\d{3,4})/);
  if (match) {
    return match[1] + match[2]; // e.g., "CSEN" + "701" = "CSEN701"
  }

  // Fallback: remove all spaces
  return courseName.replace(/\s+/g, '');
};

// Extract course title from full course name
// Example: "MET Computer Science 7th Semester - DMET502 Computer Graphics" -> "Computer Graphics"
export const extractCourseTitle = (fullCourseName: string): string => {
  if (!fullCourseName) return '';

  // Look for pattern: "something - COURSECODE Course Title"
  const match = fullCourseName.match(/- ([A-Z]+\d+[A-Z]*)\s+(.+)$/);
  if (match) {
    return match[2].trim();
  }

  // Look for pattern: "something - COURSECODE Course Title (Lab/Tutorial)"
  const matchWithType = fullCourseName.match(/- ([A-Z]+\d+[A-Z]*)\s+(.+?)\s*\(?(lab|tutorial|tut|seminar|workshop|project|thesis|dissertation)\)?/i);
  if (matchWithType) {
    return matchWithType[2].trim();
  }

  // Fallback: if no dash pattern, try to extract from end after course code
  const courseCodeMatch = fullCourseName.match(/([A-Z]+\d+[A-Z]*)\s+(.+)$/);
  if (courseCodeMatch) {
    return courseCodeMatch[2].trim();
  }

  return fullCourseName;
};

// Find the full course name in the course mapping that matches a schedule course name
export const getCourseNameByMatching = (
  scheduleCourseName: string,
  mapping: CourseNameMapping
): string | null => {
  if (!scheduleCourseName || Object.keys(mapping).length === 0) {
    return null;
  }

  // Exact match
  for (const courseName of Object.values(mapping)) {
    if (courseName === scheduleCourseName) {
      return courseName;
    }
  }

  // Partial match - course names that contain the schedule course name (or vice versa)
  for (const courseName of Object.values(mapping)) {
    if (courseName.toLowerCase().includes(scheduleCourseName.toLowerCase()) ||
        scheduleCourseName.toLowerCase().includes(courseName.toLowerCase())) {
      return courseName;
    }
  }

  // Match by extracted course code
  const scheduleCourseCode = extractCourseCode(scheduleCourseName);
  if (scheduleCourseCode) {
    for (const courseName of Object.values(mapping)) {
      const mappedCourseCode = extractCourseCode(courseName);
      if (mappedCourseCode && mappedCourseCode === scheduleCourseCode) {
        return courseName;
      }
    }
  }

  return null;
};

// Resolve a displayable course title for a schedule entry
export const resolveCourseTitle = (courseName: string, mapping: CourseNameMapping): string => {
  const mapped = getCourseNameByMatching(courseName, mapping);
  if (mapped) {
    const title = extractCourseTitle(mapped);
    return title !== mapped ? title : mapped;
  }
  const title = extractCourseTitle(courseName);
  return title !== courseName ? title : courseName;
};
