import { parse } from 'node-html-parser';

/**
 * On-device ports of the two Cheerio-based schedule parsers that previously ran
 * on the Vercel proxy (`/api/schedule-parser` and `/api/bulk-schedule-parser`).
 *
 * They return the exact same JSON shapes so the existing
 * `extractScheduleFromJson` / `extractCombinedScheduleFromJson` consumers in the
 * handlers keep working unchanged.
 */

/**
 * Personal schedule (GroupSchedule.aspx).
 *
 * Returns: { [dayName]: Array<Array<{ group?, room?, subject? }>> }
 * where the outer array is time slots and each slot is a list of classes.
 */
export function parsePersonalScheduleHtml(html: string): Record<string, any[]> {
  const root = parse(html, { comment: false });
  const schedule: Record<string, any[]> = {};

  const dayRows = root.querySelectorAll(
    "tr[id*='ContentPlaceHolderright_ContentPlaceHoldercontent_Xrw'], tr[id*='XaltR']"
  );

  for (const row of dayRows) {
    const dayEl = row.querySelector('td strong font');
    const day = dayEl ? dayEl.text.trim() : '';
    if (!day) continue;

    schedule[day] = [];

    // Direct child <td> cells, skipping the first (day name) column.
    const directTds = row.childNodes.filter(
      (n: any) => n.nodeType === 1 && (n.rawTagName || '').toLowerCase() === 'td'
    ) as any[];
    const timeSlots = directTds.slice(1);

    for (const cell of timeSlots) {
      const periods: any[] = [];

      // Nested tables => multiple tutorials/lectures per slot.
      const nestedRows = cell.querySelectorAll('table tr');
      if (nestedRows.length > 0) {
        for (const tr of nestedRows) {
          const tds = tr.querySelectorAll('td');
          if (tds.length === 3) {
            const group = tds[0].text.trim();
            const room = tds[1].text.trim();
            const subject = tds[2].text.trim();
            periods.push({ group, room, subject });
          }
        }
      }

      // No nested rows => single span lecture or empty/Free.
      if (periods.length === 0) {
        const span = cell.querySelector('span');
        const single = span ? span.text.trim() : '';
        if (single) {
          periods.push({ subject: single });
        }
      }

      schedule[day].push(periods);
    }
  }

  return schedule;
}

/**
 * Bulk (staff/course) schedule (SearchAcademicScheduled_001.aspx).
 *
 * Returns: { schedule: { [day]: Array<Array<slot>> }, timePeriods: string[], metadata }
 */
export function parseBulkScheduleHtml(html: string): {
  schedule: Record<string, any[]>;
  timePeriods: string[];
  metadata: { totalDays: number; totalSlots: number; totalPeriods: number };
} {
  const root = parse(html, { comment: false });
  const schedule: Record<string, any[]> = {};

  const scheduleTable = root.querySelector(
    '#ContentPlaceHolderright_ContentPlaceHoldercontent_schedule'
  );
  if (!scheduleTable) {
    throw new Error('Schedule table not found in HTML');
  }

  const rows = scheduleTable.querySelectorAll('tr');

  // Time periods from the header row (skip first <th>).
  const timePeriods: string[] = [];
  if (rows.length > 0) {
    const headerThs = rows[0].querySelectorAll('th').slice(1);
    for (const th of headerThs) {
      const periodText = th.text.trim();
      if (periodText && periodText !== '&nbsp;') {
        timePeriods.push(periodText);
      }
    }
  }

  // Day rows (skip header row).
  for (const row of rows.slice(1)) {
    const dayTh = row.querySelector('th');
    const day = dayTh ? dayTh.text.trim() : '';
    if (!day) continue;

    schedule[day] = [];

    const timeSlotCells = row.querySelectorAll('td');
    for (const cell of timeSlotCells) {
      const periods: any[] = [];

      const slotDivs = cell.querySelectorAll('div.slot');
      for (const slotDiv of slotDivs) {
        const staffId = slotDiv.getAttribute('data-staff-id') || '';
        const courseId = slotDiv.getAttribute('data-course-id') || '';

        const group = ddValueForDt(slotDiv, 'Group');
        const location = ddValueForDt(slotDiv, 'Location');
        const staff = ddValueForDt(slotDiv, 'Staff');

        if (group || location || staff) {
          periods.push({ group, location, staff, staffId, courseId });
        }
      }

      if (periods.length === 0) {
        const cellText = cell.text.trim();
        if (cellText && cellText !== '&nbsp;' && cellText !== '') {
          periods.push({ group: cellText, location: '', staff: '', staffId: '', courseId: '' });
        }
      }

      schedule[day].push(periods);
    }
  }

  const days = Object.values(schedule);
  return {
    schedule,
    timePeriods,
    metadata: {
      totalDays: Object.keys(schedule).length,
      totalSlots: days.reduce((sum, day) => sum + day.length, 0),
      totalPeriods: days.reduce(
        (sum, day) => sum + day.reduce((daySum: number, slot: any[]) => daySum + slot.length, 0),
        0
      ),
    },
  };
}

/**
 * Equivalent of Cheerio's `dt:contains('X').next('dd').text()`:
 * find the <dd> immediately following the <dt> whose text contains `label`.
 */
function ddValueForDt(slotDiv: any, label: string): string {
  const dts = slotDiv.querySelectorAll('dt');
  for (const dt of dts) {
    if (dt.text.includes(label)) {
      let sib = dt.nextElementSibling;
      if (sib && (sib.rawTagName || '').toLowerCase() === 'dd') {
        return sib.text.trim();
      }
    }
  }
  return '';
}
