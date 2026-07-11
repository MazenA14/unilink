export interface ViewStateData {
  __VIEWSTATE: string;
  __VIEWSTATEGENERATOR: string;
  __EVENTVALIDATION: string;
}

export interface GradeData {
  course: string;
  percentage: number;
  // Optional fields for actual marks
  obtained?: number;
  total?: number;
}

export interface PaymentItem {
  reference: string;
  description: string;
  currency: string;
  amount: number;
  dueDate: string;
  eventTarget?: string;
}

export interface ScheduleClass {
  courseName: string;
  instructor?: string;
  room?: string;
  time?: string;
  slotType?: string;
  courseCode?: string;         // Extracted course code (e.g., "7MET L001")
}

export interface ScheduleDay {
  dayName: string;
  periods: {
    first: ScheduleClass | null;
    second: ScheduleClass | null;
    third: ScheduleClass | null;
    fourth: ScheduleClass | null;
    fifth: ScheduleClass | null;
  };
  isFree: boolean;
}

export interface ScheduleData {
  days: ScheduleDay[];
  type: 'personal' | 'staff' | 'course' | 'group';
  metadata?: {
    totalCourses?: number;
    totalStudents?: number;
    department?: string;
    selectedItem?: string;
  };
}

export interface Instructor {
  name: string;
  value: string;
}

export interface EvaluationItem {
  value: string;
  text: string;
}

export interface EvaluationRadioOption {
  value: string;
  label: string;
}

export interface EvaluationAgreeQuestion {
  id: string;
  label: string;
  radioName: string;
  options: EvaluationRadioOption[];
}

export interface EvaluationScaleQuestion {
  label: string;
  radioName: string;
  leftCaption: string;
  rightCaption: string;
  options: EvaluationRadioOption[];
}

export interface EvaluationForm {
  hidden: Record<string, string>;
  selectFieldName: string;
  agreeQuestions: EvaluationAgreeQuestion[];
  scaleQuestions: EvaluationScaleQuestion[];
  remarkFieldName: string | null;
  submitFieldName: string;
  submitFieldValue: string;
}