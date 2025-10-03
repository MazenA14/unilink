export interface CMSCourseRow {
  name: string;
  status: string;
  season: string;
  seasonTitle: string;
  courseId: string;
  seasonId: string;
  buttonName: string;
}

export function parseCmsCourses(html: string): CMSCourseRow[] {
  try {
    const results: CMSCourseRow[] = [];
    
    // Find all season cards - capture from start of season card to start of next season card or end
    const seasonCardMatches = html.match(/<div class="col-md-12 col-lg-12 col-sm-12">[\s\S]*?(?=<div class="col-md-12 col-lg-12 col-sm-12">|$)/gi) || [];
    
    for (const seasonCard of seasonCardMatches) {
      // Extract season information from the card header
      const seasonTitleMatch = seasonCard.match(/<div class="menu-header-title">Season : (\d+)\s*,\s*Title:\s*([^<]+)<\/div>/i);
      if (!seasonTitleMatch) continue;
      
      const seasonId = seasonTitleMatch[1];
      const seasonTitle = cleanHtml(seasonTitleMatch[2]);
      
      // Find the table within this season card - use more flexible pattern
      const tableMatch = seasonCard.match(/<table[^>]*>[\s\S]*?<\/table>/i);
      if (!tableMatch) continue;
      
      const tableHtml = tableMatch[0];
      const rowMatches = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
      if (rowMatches.length <= 1) continue; // Skip header row
      
      const dataRows = rowMatches.slice(1);
      
      for (const row of dataRows) {
        const buttonNameMatch = row.match(/<input[^>]*type="submit"[^>]*name="([^"]+)"[^>]*>/i);
        const buttonName = buttonNameMatch ? decodeHtml(buttonNameMatch[1]) : '';
        
        const tdMatches = row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || [];
        if (tdMatches.length < 5) continue; // Need at least 5 columns: button, name, status, id, seasonId
        
        const name = cleanHtml(tdMatches[1]);
        const status = cleanHtml(tdMatches[2]);
        const courseId = cleanHtml(tdMatches[3]);
        const rowSeasonId = cleanHtml(tdMatches[4]);
        
        results.push({ 
          name, 
          status, 
          season: `Season ${seasonId}`, 
          seasonTitle,
          courseId, 
          seasonId: rowSeasonId, 
          buttonName 
        });
      }
    }
    
    return results;
  } catch {
    return [];
  }
}

function cleanHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export interface CMSCourseHeader {
  courseName: string;
  seasonName: string;
}

export function parseCmsCourseHeader(html: string): CMSCourseHeader {
  try {
    const courseMatch = html.match(/<span[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_LabelCourseName"[^>]*>([\s\S]*?)<\/span>/i);
    const seasonMatch = html.match(/<span[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_LabelseasonName"[^>]*>([\s\S]*?)<\/span>/i);
    return {
      courseName: courseMatch ? cleanHtml(courseMatch[1]) : '',
      seasonName: seasonMatch ? cleanHtml(seasonMatch[1]) : '',
    };
  } catch {
    return { courseName: '', seasonName: '' };
  }
}


