/**
 * Evaluation-required handling for the GUC transcript page.
 *
 * When a student still has a pending evaluation, GUC serves the transcript page
 * with the study-year dropdown disabled and shows a message beginning with
 * "You have not evaluated the following Courses...". Until the evaluation is
 * completed, no transcript can be loaded.
 *
 * This module detects that state and exposes a typed `EvaluationRequiredError`
 * so callers can show a banner instead of treating it as a hard failure. The
 * user-facing message is intentionally generic — it does not mention courses or
 * instructors, nor spell out what needs evaluating.
 */

export const EVALUATION_REQUIRED_MESSAGE =
  'You have a pending evaluation to complete before your transcript becomes available.';

/** Thrown when the transcript page requires a pending evaluation first. */
export class EvaluationRequiredError extends Error {
  readonly isEvaluationRequired = true;
  /** User-facing message. */
  readonly userMessage: string;

  constructor(userMessage: string = EVALUATION_REQUIRED_MESSAGE) {
    super(userMessage);
    this.name = 'EvaluationRequiredError';
    this.userMessage = userMessage;
  }
}

/** Type guard that survives async/babel class transforms. */
export function isEvaluationRequiredError(error: unknown): error is EvaluationRequiredError {
  return !!error && typeof error === 'object' && (error as any).isEvaluationRequired === true;
}

/**
 * True if the transcript page HTML indicates a pending evaluation is blocking
 * access (the "You have not evaluated the following Courses..." message).
 */
export function isEvaluationRequiredHtml(html: string | undefined | null): boolean {
  if (!html) return false;
  return html.includes('You have not evaluated the following');
}
