export interface ScheduleClass {
  courseName: string;
  instructor?: string;
  room?: string;
  time?: string;
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
}
