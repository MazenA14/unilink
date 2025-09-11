import { Course, Semester, StudentInfo, TranscriptData } from '@/components/transcript/types';

/**
 * HTML parsing function to extract transcript data from GUC transcript HTML
 * @param html - The HTML content from the transcript page
 * @returns Parsed transcript data or null if parsing fails
 */
export function parseTranscriptHTML(html: string): TranscriptData | null {
  try {
    // Extract student info
    const nameMatch = html.match(/<span id="[^"]*stdNmLbl[^"]*"[^>]*>([^<]+)<\/span>/);
    const categoryMatch = html.match(/<span id="[^"]*catLbl[^"]*"[^>]*>([^<]+)<\/span>/);
    const appNoMatch = html.match(/<span id="[^"]*appNoLbl[^"]*"[^>]*>([^<]+)<\/span>/);
    const yearMatch = html.match(/<span id="[^"]*stdYrLbl[^"]*"[^>]*>([^<]+)<\/span>/);
    const studyGroupMatch = html.match(/<span id="[^"]*sgTopLbl[^"]*"[^>]*>([^<]+)<\/span>/);
    
    // Extract cumulative GPA
    const cumulativeGPAMatch = html.match(/<span id="[^"]*cmGpaLbl[^"]*"[^>]*>([^<]+)<\/span>/);
    const dateMatch = html.match(/<span id="[^"]*dtLbl[^"]*"[^>]*>([^<]+)<\/span>/);
    const studyGroupCumulativeMatch = html.match(/<span id="[^"]*stdSgLbl[^"]*"[^>]*>([^<]+)<\/span>/);

    const studentInfo: StudentInfo = {
      name: nameMatch ? nameMatch[1].trim() : '',
      category: categoryMatch ? categoryMatch[1].trim() : '',
      appNumber: appNoMatch ? appNoMatch[1].trim() : '',
      year: yearMatch ? yearMatch[1].trim() : '',
      studyGroup: studyGroupMatch ? studyGroupMatch[1].trim() : '',
    };

    // Extract semesters
    const semesters: Semester[] = [];
    const semesterTables = html.match(/<table[^>]*>[\s\S]*?<\/table>/g) || [];
    
    for (const table of semesterTables) {
      // Extract semester name
      const semesterNameMatch = table.match(/<font size="3"><strong>([^<]+)<\/strong><\/font>/);
      if (!semesterNameMatch) continue;
      
      const semesterName = semesterNameMatch[1].trim();
      
      // Extract courses
      const courses: Course[] = [];
      const courseRows = table.match(/<tr>[\s\S]*?<\/tr>/g) || [];
      
      for (const row of courseRows) {
        // Check if this row contains course data (has semester code like CSE05)
        const semesterCodeMatch = row.match(/<span id="[^"]*smLbl[^"]*"[^>]*>([^<]+)<\/span>/);
        if (!semesterCodeMatch) continue;
        
        const courseNameMatch = row.match(/<span id="[^"]*crsNmLbl[^"]*"[^>]*>([^<]+)<\/span>/);
        const numericGradeMatch = row.match(/<span id="[^"]*deLbl[^"]*"[^>]*>([^<]+)<\/span>/);
        const letterGradeMatch = row.match(/<span id="[^"]*usLbl[^"]*"[^>]*>([^<]+)<\/span>/);
        const creditHoursMatch = row.match(/<span id="[^"]*hLbl[^"]*"[^>]*>([^<]+)<\/span>/);
        
        if (courseNameMatch && numericGradeMatch && letterGradeMatch && creditHoursMatch) {
          courses.push({
            semester: semesterCodeMatch[1].trim(),
            courseName: courseNameMatch[1].trim(),
            numericGrade: numericGradeMatch[1].trim(),
            letterGrade: letterGradeMatch[1].trim(),
            creditHours: creditHoursMatch[1].trim(),
          });
        }
      }
      
      // Extract semester GPA and total hours
      const semesterGPAMatch = table.match(/<span id="[^"]*ssnGpLbl[^"]*"[^>]*>([^<]+)<\/span>/);
      const totalHoursMatch = table.match(/<span id="[^"]*ssnThLbl[^"]*"[^>]*>([^<]+)<\/span>/);
      
      if (courses.length > 0) {
        semesters.push({
          name: semesterName,
          courses,
          semesterGPA: semesterGPAMatch ? semesterGPAMatch[1].trim() : '',
          totalHours: totalHoursMatch ? totalHoursMatch[1].trim() : '',
        });
      }
    }

    return {
      studentInfo,
      semesters,
      cumulativeGPA: cumulativeGPAMatch ? cumulativeGPAMatch[1].trim() : '',
      studyGroup: studyGroupCumulativeMatch ? studyGroupCumulativeMatch[1].trim() : '',
      date: dateMatch ? dateMatch[1].trim() : '',
    };
  } catch (error) {
    console.error('Error parsing transcript HTML:', error);
    return null;
  }
}
