export interface ExamSeat {
  courseName: string;
  examDay: string;
  date: string;
  startTime: string;
  endTime: string;
  hall: string;
  seat: string;
  examType: string;
}

export interface ExamSeatsData {
  examSeats: ExamSeat[];
  studentName: string;
}

/**
 * Parses exam seats data from HTML content
 * @param html - The HTML content containing exam seats information
 * @returns Object containing parsed exam seats and student name
 */
export function parseExamSeatsHTML(html: string): ExamSeatsData {
  try {
    // Extract student name from the HTML
    const nameMatch = html.match(/<span[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_stdNmLbl"[^>]*>([^<]+)<\/span>/);
    const extractedName = nameMatch ? nameMatch[1].trim() : '';

    // Find the table containing exam seats
    const tableMatch = html.match(/<TABLE[^>]*id="Table2"[^>]*>([\s\S]*?)<\/TABLE>/);
    if (!tableMatch) {
      return { examSeats: [], studentName: extractedName };
    }

    const tableContent = tableMatch[1];
    const rows = tableContent.match(/<TR[^>]*>([\s\S]*?)<\/TR>/g);
    
    if (!rows || rows.length < 2) {
      return { examSeats: [], studentName: extractedName };
    }

    const examSeats: ExamSeat[] = [];
    
    // Skip the header row (first row) and process data rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.match(/<TD[^>]*>([\s\S]*?)<\/TD>/g);
      
      if (cells && cells.length >= 8) {
        const examSeat: ExamSeat = {
          courseName: cells[0].replace(/<[^>]*>/g, '').trim(),
          examDay: cells[1].replace(/<[^>]*>/g, '').trim(),
          date: cells[2].replace(/<[^>]*>/g, '').trim(),
          startTime: cells[3].replace(/<[^>]*>/g, '').trim(),
          endTime: cells[4].replace(/<[^>]*>/g, '').trim(),
          hall: cells[5].replace(/<[^>]*>/g, '').trim(),
          seat: cells[6].replace(/<[^>]*>/g, '').trim(),
          examType: cells[7].replace(/<[^>]*>/g, '').trim(),
        };
        examSeats.push(examSeat);
      }
    }

    return { examSeats, studentName: extractedName };
  } catch (error) {
    return { examSeats: [], studentName: '' };
  }
}

/**
 * Formats a date string from "14 - September - 2025" format to a more readable format
 * @param dateStr - The date string to format
 * @returns Formatted date string
 */
export function formatExamDate(dateStr: string): string {
  const parts = dateStr.split(' - ');
  if (parts.length === 3) {
    return `${parts[0]} ${parts[1]} ${parts[2]}`;
  }
  return dateStr;
}

/**
 * Gets the appropriate color for an exam type and date
 * @param examType - The exam type string
 * @param examDate - The exam date string (optional)
 * @returns Color hex code for the exam type
 */
export function getExamTypeColor(examType: string, examDate?: string): string {
  const type = examType.toLowerCase();
  
  // Check if exam has passed
  if (examDate) {
    const examDateObj = parseExamDate(examDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    
    if (examDateObj < today) {
      return '#86EFAC'; // Soft green for passed exams
    }
    
    // Check if exam is today
    if (examDateObj.toDateString() === today.toDateString()) {
      return '#FDE047'; // Soft yellow for today's exams
    }
  }
  
  // Default colors based on exam type
  if (type.includes('makeup')) {
    return '#F59E0B'; // Orange for makeup exams
  } else if (type.includes('final')) {
    return '#EF4444'; // Red for final exams
  } else if (type.includes('midterm')) {
    return '#3B82F6'; // Blue for midterm exams
  } else if (type.includes('quiz')) {
    return '#8B5CF6'; // Purple for quizzes
  }
  
  return '#FCA5A5'; // Soft red for upcoming exams
}

/**
 * Parses exam date string to Date object
 * @param dateStr - The date string in format "14 - September - 2025"
 * @returns Date object
 */
export function parseExamDate(dateStr: string): Date {
  try {
    const parts = dateStr.split(' - ');
    if (parts.length === 3) {
      const day = parseInt(parts[0].trim());
      const month = parts[1].trim();
      const year = parseInt(parts[2].trim());
      
      // Convert month name to number
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthIndex = monthNames.findIndex(m => m.toLowerCase() === month.toLowerCase());
      
      if (monthIndex !== -1) {
        return new Date(year, monthIndex, day);
      }
    }
  } catch (error) {
    // Error parsing exam date
  }
  
  // Return a far future date if parsing fails
  return new Date(2099, 11, 31);
}
