import {
  EvaluationAgreeQuestion,
  EvaluationForm,
  EvaluationItem,
  EvaluationRadioOption,
  EvaluationScaleQuestion,
} from '../types/gucTypes';

interface RawRadioGroup {
  name: string;
  options: EvaluationRadioOption[];
}

function getAttr(tag: string, attr: string): string | null {
  const match = tag.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
  return match ? match[1] : null;
}

/**
 * Extract every ASP.NET hidden input on the page (viewstate fields, per-question
 * `evalObjId` fields, and anything else GUC renders) so the submit POST can
 * faithfully replay the page's full hidden state instead of hand-picking fields.
 */
export function extractAllHiddenInputs(html: string): Record<string, string> {
  const result: Record<string, string> = {};
  const tagRe = /<input\b[^>]*type="hidden"[^>]*\/?>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(html)) !== null) {
    const tag = match[0];
    const name = getAttr(tag, 'name');
    if (!name) continue;
    result[name] = getAttr(tag, 'value') ?? '';
  }

  return result;
}

/**
 * Parse the "Choose Course"/"Choose Staff" dropdown options from the
 * EvaluateCourse.aspx / EvaluateStaff.aspx page.
 */
export function parseEvaluationList(html: string, selectFieldName: string): EvaluationItem[] {
  const selectRe = new RegExp(`<select[^>]*name="[^"]*${selectFieldName}"[^>]*>([\\s\\S]*?)<\\/select>`, 'i');
  const selectMatch = html.match(selectRe);
  if (!selectMatch) return [];

  const optionRe = /<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/gi;
  const items: EvaluationItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = optionRe.exec(selectMatch[1])) !== null) {
    const value = match[1].trim();
    const text = match[2].trim();
    if (!value || /^choose/i.test(text)) continue;
    items.push({ value, text });
  }

  return items;
}

/**
 * Extract every radio input on the page, grouped by `name` in document order,
 * each paired with its `<label for="id">` text. Option values are kept as-is
 * (GUC's agree/disagree scale uses non-sequential values: 1,2,3,6,5,4).
 */
function extractRadioGroups(html: string): RawRadioGroup[] {
  const groups: RawRadioGroup[] = [];
  const groupIndex: Record<string, number> = {};
  const radioRe = /<input\b[^>]*type="radio"[^>]*\/?>/gi;
  let match: RegExpExecArray | null;

  while ((match = radioRe.exec(html)) !== null) {
    const tag = match[0];
    const id = getAttr(tag, 'id');
    const name = getAttr(tag, 'name');
    const value = getAttr(tag, 'value');
    if (!id || !name || value === null) continue;

    const afterHtml = html.slice(radioRe.lastIndex, radioRe.lastIndex + 300);
    const labelMatch = afterHtml.match(/<label\s+for="([^"]*)"[^>]*>([^<]*)<\/label>/i);
    const label = labelMatch && labelMatch[1] === id ? labelMatch[2].trim() : value;

    let idx = groupIndex[name];
    if (idx === undefined) {
      idx = groups.length;
      groupIndex[name] = idx;
      groups.push({ name, options: [] });
    }
    groups[idx].options.push({ value, label });
  }

  return groups;
}

/**
 * Parse the full evaluation questionnaire: per-course/staff agree-disagree
 * questions (the `objRptr` repeater) plus the generic Likert-scale questions
 * (the `RadioButtonListN` tables inside the `Table1`-id container), the
 * remarks textarea, and the submit control.
 */
export function parseEvaluationForm(html: string, selectFieldName: string): EvaluationForm {
  const hidden = extractAllHiddenInputs(html);
  const radioGroups = extractRadioGroups(html);

  const agreeGroups = radioGroups.filter((g) => g.name.includes('objRptr') && g.name.endsWith('$grade'));
  const evalObjLblRe = /_evalObjLbl_\d+"[^>]*>([^<]*)<\/span>/gi;
  const evalObjLbls: string[] = [];
  let lblMatch: RegExpExecArray | null;
  while ((lblMatch = evalObjLblRe.exec(html)) !== null) {
    evalObjLbls.push(lblMatch[1].trim());
  }

  const agreeQuestions: EvaluationAgreeQuestion[] = agreeGroups.map((group, index) => {
    const idFieldName = group.name.replace(/\$grade$/, '$evalObjId');
    return {
      id: hidden[idFieldName] || '',
      label: evalObjLbls[index] || '',
      radioName: group.name,
      options: group.options,
    };
  });

  // The scale questions (RadioButtonListN) live inside a `Table1`-id container
  // that nests another `<table>` per question, which breaks naive lazy-regex
  // table extraction (it would stop at the first nested `</table>`). Instead,
  // scan the whole document for each piece independently — none of these
  // patterns are affected by table nesting — and zip them by order of
  // appearance, which mirrors the row-by-row [label, left caption, radios,
  // right caption] layout regardless of how many questions the page has.
  const scaleLabelRe = /_lb_q\d+"[^>]*>([^<]*)<\/span>/gi;
  const scaleLabels: string[] = [];
  let scaleLblMatch: RegExpExecArray | null;
  while ((scaleLblMatch = scaleLabelRe.exec(html)) !== null) {
    scaleLabels.push(scaleLblMatch[1].trim());
  }

  const captionRe = /_Label\d+"[^>]*>([^<]*)<\/span>/gi;
  const captions: string[] = [];
  let captionMatch: RegExpExecArray | null;
  while ((captionMatch = captionRe.exec(html)) !== null) {
    captions.push(captionMatch[1].trim());
  }

  const scaleGroups = radioGroups.filter((g) => /RadioButtonList\d+$/.test(g.name));
  const scaleQuestions: EvaluationScaleQuestion[] = scaleGroups.map((group, index) => ({
    label: scaleLabels[index] || '',
    radioName: group.name,
    leftCaption: captions[index * 2] || '',
    rightCaption: captions[index * 2 + 1] || '',
    options: group.options,
  }));

  const remarkMatch = html.match(/<textarea[^>]*name="([^"]*rmrk)"[^>]*>/i);
  const remarkFieldName = remarkMatch ? remarkMatch[1] : null;

  const submitMatch = html.match(/<input\b[^>]*type="submit"[^>]*\/?>/i);
  const submitFieldName = submitMatch ? getAttr(submitMatch[0], 'name') || '' : '';
  const submitFieldValue = submitMatch ? getAttr(submitMatch[0], 'value') || '' : '';

  return {
    hidden,
    selectFieldName,
    agreeQuestions,
    scaleQuestions,
    remarkFieldName,
    submitFieldName,
    submitFieldValue,
  };
}

/** True if GUC's response says this course/staff member has already been evaluated. */
export function isAlreadyEvaluatedHtml(html: string): boolean {
  return html.includes('You have already evaluated');
}

/** True once the response no longer shows the submit control or a visible validator error. */
export function isEvaluationSubmitSuccessHtml(html: string, submitFieldName: string): boolean {
  if (submitFieldName && html.includes(`name="${submitFieldName}"`)) {
    const hasVisibleValidator = /style="[^"]*visibility:\s*visible[^"]*"[^>]*>\s*Required/i.test(html);
    if (hasVisibleValidator) return false;
  }
  return true;
}
