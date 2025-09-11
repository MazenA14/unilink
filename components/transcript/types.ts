export interface StudyYear {
  value: string;
  text: string;
}

export interface Course {
  semester: string;
  courseName: string;
  numericGrade: string;
  letterGrade: string;
  creditHours: string;
}

export interface Semester {
  name: string;
  courses: Course[];
  semesterGPA: string;
  totalHours: string;
}

export interface StudentInfo {
  name: string;
  category: string;
  appNumber: string;
  year: string;
  studyGroup: string;
}

export interface TranscriptData {
  studentInfo: StudentInfo;
  semesters: Semester[];
  cumulativeGPA: string;
  studyGroup: string;
  date: string;
}
