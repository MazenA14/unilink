export interface ViewStateData {
  __VIEWSTATE: string;
  __VIEWSTATEGENERATOR: string;
  __EVENTVALIDATION: string;
}

export interface GradeData {
  course: string;
  percentage: number;
}

export interface PaymentItem {
  reference: string;
  description: string;
  currency: string;
  amount: number;
  dueDate: string;
  eventTarget?: string;
}
