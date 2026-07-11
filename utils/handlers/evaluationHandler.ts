import { EvaluationForm, EvaluationItem } from '../types/gucTypes';
import { AuthManager } from '../auth';
import { extractViewState } from '../extractors/gradeExtractor';
import { makeGucRequest as makeProxyRequest } from '../gucRequest';
import {
  isAlreadyEvaluatedHtml,
  isEvaluationSubmitSuccessHtml,
  parseEvaluationForm,
  parseEvaluationList,
} from '../parsers/evaluationParser';

const COURSE_URL = 'https://apps.guc.edu.eg/student_ext/Evaluation/EvaluateCourse.aspx';
const STAFF_URL = 'https://apps.guc.edu.eg/student_ext/Evaluation/EvaluateStaff.aspx';

/** Thrown when GUC reports this course/staff member has already been evaluated. */
export class AlreadyEvaluatedError extends Error {
  readonly isAlreadyEvaluated = true;
  constructor() {
    super('This has already been evaluated.');
    this.name = 'AlreadyEvaluatedError';
  }
}

export function isAlreadyEvaluatedError(error: unknown): error is AlreadyEvaluatedError {
  return !!error && typeof error === 'object' && (error as any).isAlreadyEvaluated === true;
}

/** Find the full ASP.NET control name (e.g. `ctl00$...$crsIdLst`) for a short field name. */
function findFullFieldName(html: string, shortName: string): string {
  const match = html.match(new RegExp(`name="([^"]*${shortName})"`, 'i'));
  return match ? match[1] : shortName;
}

async function fetchWithRetry(url: string): Promise<string> {
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const data = await makeProxyRequest(url);
      const html = data.html || data.body || '';
      if (!html) throw new Error('No HTML content received');
      return html;
    } catch (error) {
      if (attempt < maxAttempts) {
        await AuthManager.logoutAndLogin();
      } else {
        throw error;
      }
    }
  }

  throw new Error('All attempts failed');
}

async function fetchEvaluationList(url: string, shortFieldName: string): Promise<EvaluationItem[]> {
  const html = await fetchWithRetry(url);
  return parseEvaluationList(html, shortFieldName);
}

async function fetchEvaluationForm(url: string, shortFieldName: string, selectedValue: string): Promise<EvaluationForm> {
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const initialHtml = await fetchWithRetry(url);
      const fullFieldName = findFullFieldName(initialHtml, shortFieldName);
      const viewState = extractViewState(initialHtml);

      const formBody = new URLSearchParams({
        ...viewState,
        [fullFieldName]: selectedValue,
        __EVENTTARGET: fullFieldName,
        __EVENTARGUMENT: '',
      });

      const response = await makeProxyRequest(url, 'POST', formBody.toString(), { allowNon200: true });
      const html = response.html || response.body || '';
      if (!html) throw new Error('No HTML content received from evaluation form');

      // Already-evaluated is not an auth problem — re-login won't clear it, so
      // surface it immediately instead of retrying.
      if (isAlreadyEvaluatedHtml(html)) throw new AlreadyEvaluatedError();

      return parseEvaluationForm(html, fullFieldName);
    } catch (error) {
      if (isAlreadyEvaluatedError(error)) throw error;
      if (attempt < maxAttempts) {
        await AuthManager.logoutAndLogin();
      } else {
        throw error;
      }
    }
  }

  throw new Error('All attempts failed');
}

async function submitEvaluation(
  url: string,
  selectedValue: string,
  form: EvaluationForm,
  answers: Record<string, string>,
  remark: string
): Promise<{ success: boolean }> {
  const body: Record<string, string> = {
    ...form.hidden,
    [form.selectFieldName]: selectedValue,
    ...answers,
    __EVENTTARGET: '',
    __EVENTARGUMENT: '',
  };

  if (form.remarkFieldName) {
    body[form.remarkFieldName] = remark;
  }
  if (form.submitFieldName) {
    body[form.submitFieldName] = form.submitFieldValue;
  }

  const formBody = new URLSearchParams(body);
  const response = await makeProxyRequest(url, 'POST', formBody.toString(), { allowNon200: true });
  const html = response.html || response.body || '';

  return { success: isEvaluationSubmitSuccessHtml(html, form.submitFieldName) };
}

export const EvaluationHandler = {
  getCourseList: (): Promise<EvaluationItem[]> => fetchEvaluationList(COURSE_URL, 'crsIdLst'),
  getStaffList: (): Promise<EvaluationItem[]> => fetchEvaluationList(STAFF_URL, 'stfIdLst'),

  getCourseForm: (courseId: string): Promise<EvaluationForm> => fetchEvaluationForm(COURSE_URL, 'crsIdLst', courseId),
  getStaffForm: (staffId: string): Promise<EvaluationForm> => fetchEvaluationForm(STAFF_URL, 'stfIdLst', staffId),

  submitCourseEvaluation: (
    courseId: string,
    form: EvaluationForm,
    answers: Record<string, string>,
    remark: string
  ): Promise<{ success: boolean }> => submitEvaluation(COURSE_URL, courseId, form, answers, remark),

  submitStaffEvaluation: (
    staffId: string,
    form: EvaluationForm,
    answers: Record<string, string>,
    remark: string
  ): Promise<{ success: boolean }> => submitEvaluation(STAFF_URL, staffId, form, answers, remark),
};
