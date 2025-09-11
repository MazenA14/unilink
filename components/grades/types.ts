export interface Season {
  value: string;
  text: string;
  hasGrades?: boolean;
  year?: string;
}

export interface YearGroup {
  year: string;
  seasons: Season[];
}

export interface Course {
  value: string;
  text: string;
}

export interface CourseWithGrades extends Course {
  midtermGrade?: GradeData;
  detailedGrades?: GradeData[];
  isExpanded?: boolean;
  isLoadingDetails?: boolean;
}

export type GradeType = 'current' | 'previous';

// GradeData is imported from the main utils file
export type { GradeData } from '@/utils/gucApiProxy';
