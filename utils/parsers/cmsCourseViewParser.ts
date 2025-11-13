export interface CMSCourseViewHeader {
  courseName: string;
  seasonName: string;
  totalWeeks?: number | null;
  contentCount?: number | null;
}

export interface CMSCourseViewContentItem {
  contentId?: string;
  title: string;
  type?: string;
  description?: string;
  downloadUrl?: string;
  watchUrl?: string;
  seen?: boolean;
}

export interface CMSCourseViewWeek {
  weekLabel: string; // e.g., Week: 2025-5-31
  announcement?: string | null;
  description?: string | null;
  contents: CMSCourseViewContentItem[];
}

export interface CMSCourseView {
  header: CMSCourseViewHeader;
  announcementsHtml?: string; // full announcements/desc block html
  weeks: CMSCourseViewWeek[];
}

function cleanText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanAnnouncementHtml(html: string): string {
  return html
    // Remove style attributes but keep the tags
    .replace(/<([^>]+)\s+style="[^"]*"([^>]*)>/gi, '<$1$2>')
    // Remove empty spans and divs, but be more careful about table content
    .replace(/<span[^>]*>\s*<\/span>/gi, '')
    .replace(/<div[^>]*>\s*<\/div>/gi, '')
    // Ensure headings create proper line breaks
    .replace(/<\/h([1-6])>/gi, '</h$1>\n')
    .replace(/<h([1-6])[^>]*>/gi, '\n<h$1>')
    // Ensure paragraphs create proper line breaks
    .replace(/<\/p>/gi, '</p>\n')
    .replace(/<p[^>]*>/gi, '\n<p>')
    // Clean up multiple consecutive whitespace and newlines
    .replace(/\s+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\s+\n/g, '\n')
    // Clean up HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function parseCmsCourseView(html: string): CMSCourseView {
  const header: CMSCourseViewHeader = {
    courseName: '',
    seasonName: '',
    totalWeeks: null,
    contentCount: null,
  };

  try {
    const courseMatch = html.match(/<span[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_LabelCourseName"[^>]*>([\s\S]*?)<\/span>/i);
    const seasonMatch = html.match(/<span[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_LabelseasonName"[^>]*>([\s\S]*?)<\/span>/i);
    header.courseName = courseMatch ? cleanText(courseMatch[1]) : '';
    header.seasonName = seasonMatch ? cleanText(seasonMatch[1]) : '';

    const totalWeeksMatch = html.match(/id="ContentPlaceHolderright_ContentPlaceHoldercontent_Labeltotalweeks"[^>]*>([^<]+)</i);
    const contentCountMatch = html.match(/id="ContentPlaceHolderright_ContentPlaceHoldercontent_Labelunseencontent"[^>]*>([^<]+)</i);
    header.totalWeeks = totalWeeksMatch ? parseInt(cleanText(totalWeeksMatch[1])) || null : null;
    header.contentCount = contentCountMatch ? parseInt(cleanText(contentCountMatch[1])) || null : null;
  } catch {}

  // Announcements area HTML
  let announcementsHtml: string | undefined;
  try {
    // Use a more robust regex to extract the full announcement content
    // Look for the opening div and find its matching closing div
    const descStartMatch = html.match(/<div[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_desc"[^>]*>/i);
    if (descStartMatch) {
      const startIndex = descStartMatch.index! + descStartMatch[0].length;
      let depth = 1;
      let endIndex = startIndex;
      
      // Find the matching closing div by counting nested divs
      for (let i = startIndex; i < html.length && depth > 0; i++) {
        if (html.substring(i, i + 4) === '<div') {
          depth++;
        } else if (html.substring(i, i + 6) === '</div>') {
          depth--;
          if (depth === 0) {
            endIndex = i;
            break;
          }
        }
      }
      
      if (depth === 0) {
        const content = html.substring(startIndex, endIndex);
        announcementsHtml = cleanAnnouncementHtml(content);
      }
    }
  } catch {}

  // Weeks parsing
  const weeks: CMSCourseViewWeek[] = [];
  try {
    // Match the complete week block structure - use a more robust approach
    // Split by the week block start and then find the end of each block
    const weekBlockStarts = html.split(/<div[^>]*class="card mb-5 weeksdata"/gi);
    const weekBlocks: string[] = [];
    
    for (let i = 1; i < weekBlockStarts.length; i++) {
      const blockStart = weekBlockStarts[i];
      // Find the end of this week block by looking for the next week block or end of content
      const nextWeekMatch = blockStart.match(/<div[^>]*class="card mb-5 weeksdata"/i);
      let blockEnd = blockStart.length;
      if (nextWeekMatch) {
        blockEnd = nextWeekMatch.index!;
      }
      
      const fullBlock = '<div class="card mb-5 weeksdata' + blockStart.substring(0, blockEnd);
      weekBlocks.push(fullBlock);
    }
    
    for (const block of weekBlocks) {
      // Debug: log a portion of the HTML block to see the structure
      // Extract week label from h2 with class "text-big"
      const labelMatch = block.match(/<h2[^>]*class="text-big"[^>]*>([\s\S]*?)<\/h2>/i);
      const weekLabel = labelMatch ? cleanText(labelMatch[1]) : '';

      // Extract announcement - try multiple patterns
      let announcement: string | null = null;
      const annBlock = block.match(/<div[^>]*>\s*<strong>Announcement<\/strong>\s*<\/div>\s*<p[^>]*class="m-2 p2"[^>]*>([\s\S]*?)<\/p>/i);
      if (annBlock) {
        announcement = cleanText(annBlock[1]);
      } else {
        // Try alternative pattern
        const annBlock2 = block.match(/<div[^>]*>\s*<strong>Announcement<\/strong>\s*<\/div>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
        if (annBlock2) {
          announcement = cleanText(annBlock2[1]);
        }
      }

      // Extract description - try multiple patterns
      let description: string | null = null;
      const descBlock = block.match(/<div[^>]*>\s*<strong>Description<\/strong>\s*<\/div>\s*<p[^>]*class="m-2 p2"[^>]*>([\s\S]*?)<\/p>/i);
      if (descBlock) {
        description = cleanText(descBlock[1]);
      } else {
        // Try alternative pattern
        const descBlock2 = block.match(/<div[^>]*>\s*<strong>Description<\/strong>\s*<\/div>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
        if (descBlock2) {
          description = cleanText(descBlock2[1]);
        }
      }

      // content cards inside the week
      const contents: CMSCourseViewContentItem[] = [];
      const contentCards = block.match(/<div[^>]*class="card mb-4"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi) || [];
      
      for (const card of contentCards) {
        // Title like: <div id="content217866"><strong>1 - Final Exam Sample 2023</strong> (Exam)</div>
        const idMatch = card.match(/<div[^>]*id="content(\d+)"[^>]*>([\s\S]*?)<\/div>/i);
        let contentId: string | undefined;
        let title = '';
        let type: string | undefined;
        if (idMatch) {
          contentId = idMatch[1];
          // Try to match: <strong>title</strong> (type)
          const strongMatch = idMatch[2].match(/<strong>([\s\S]*?)<\/strong>\s*\(([^)]+)\)/i);
          if (strongMatch) {
            title = cleanText(strongMatch[1]);
            type = cleanText(strongMatch[2]);
          } else {
            // Fallback: just get the strong content
            const simpleStrongMatch = idMatch[2].match(/<strong>([\s\S]*?)<\/strong>/i);
            if (simpleStrongMatch) {
              title = cleanText(simpleStrongMatch[1]);
            } else {
              title = cleanText(idMatch[2]);
            }
          }
        }

        // Extract description from the next div after the title div
        const descMatch = card.match(/<div id="content\d+">[\s\S]*?<\/div>\s*<div>([\s\S]*?)<\/div>/i);
        const descriptionText = descMatch ? cleanText(descMatch[1]) : undefined;

        // download link - look for the download button with more flexible matching
        const downloadMatch = card.match(/<a[^>]*href=['"]([^'"]+)['"][^>]*class="btn btn-primary contentbtn"[^>]*>/i) || 
                             card.match(/<a[^>]*class="btn btn-primary contentbtn"[^>]*href=['"]([^'"]+)['"][^>]*>/i);
        const downloadUrl = downloadMatch ? downloadMatch[1] : undefined;

        // watch video link - look for the watch video button with data-url attribute
        const watchMatch = card.match(/<input[^>]*data-url=['"]([^'"]+)['"][^>]*class="btn btn-primary vodbutton contentbtn"[^>]*>/i) ||
                          card.match(/<input[^>]*class="btn btn-primary vodbutton contentbtn"[^>]*data-url=['"]([^'"]+)['"][^>]*>/i);
        const watchUrl = watchMatch ? watchMatch[1] : undefined;

        // check if content has been seen (eye icon visible)
        const seenMatch = card.match(/<i[^>]*class="fa fa-eye"[^>]*style=['"][^'"]*font-size: large[^'"]*['"][^>]*>/i);
        const seen = !!seenMatch;

        // Only add content if we have at least a title
        if (title) {
          contents.push({
            contentId,
            title,
            type,
            description: descriptionText,
            downloadUrl,
            watchUrl,
            seen,
          });
        }
      }

      weeks.push({ weekLabel, announcement, description, contents });
    }
  } catch {
  }

  return {
    header,
    announcementsHtml,
    weeks,
  };
}


