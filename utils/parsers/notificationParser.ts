import { Notification } from '@/utils/types/notificationTypes';

/**
 * Parses HTML content from GUC notifications page and extracts notification data
 * @param htmlContent - The HTML content from the notifications page
 * @returns Array of parsed notifications
 */
export function parseNotifications(htmlContent: string): Notification[] {
  const notifications: Notification[] = [];

  try {
    // Extract the table body content that contains the notifications
    const tableBodyMatch = htmlContent.match(/<tbody[^>]*>(.*?)<\/tbody>/s);
    if (!tableBodyMatch) {
      return notifications;
    }

    const tableBodyContent = tableBodyMatch[1];

    // Split by table rows and process each notification
    const rowMatches = tableBodyContent.match(/<tr[^>]*>(.*?)<\/tr>/gs);
    if (!rowMatches) {
      return notifications;
    }

    for (const rowMatch of rowMatches) {
      try {
        const notification = parseNotificationRow(rowMatch);
        if (notification) {
          notifications.push(notification);
        }
      } catch (error) {
        // Continue processing other rows
      }
    }
  } catch (error) {
    // Error parsing notifications HTML
  }

  return notifications;
}

/**
 * Parses a single notification row from the HTML table
 * @param rowHtml - HTML content of a single table row
 * @returns Parsed notification object or null if parsing fails
 */
function parseNotificationRow(rowHtml: string): Notification | null {
  try {
    // Extract table cells
    const cellMatches = rowHtml.match(/<td[^>]*>(.*?)<\/td>/gs);
    if (!cellMatches || cellMatches.length < 6) {
      return null;
    }

    // Extract ID (first cell)
    const idMatch = cellMatches[0].match(/<td[^>]*>(.*?)<\/td>/s);
    const id = idMatch ? cleanHtmlContent(idMatch[1]).trim() : '';

    // Extract title and body from the button data attributes (second cell)
    const buttonMatch = cellMatches[1].match(/<button[^>]*data-subject_text="([^"]*)"[^>]*data-body_text="([^"]*)"[^>]*>/);
    const title = buttonMatch ? decodeHtmlEntities(buttonMatch[1]) : '';
    const body = buttonMatch ? decodeHtmlEntities(buttonMatch[2]) : '';

    // Extract date (fourth cell)
    const dateMatch = cellMatches[3].match(/<td[^>]*>(.*?)<\/td>/s);
    const date = dateMatch ? cleanHtmlContent(dateMatch[1]).trim() : '';

    // Extract staff name (fifth cell)
    const staffMatch = cellMatches[4].match(/<td[^>]*>(.*?)<\/td>/s);
    const staff = staffMatch ? cleanHtmlContent(staffMatch[1]).trim() : '';

    // Extract importance (sixth cell)
    const importanceMatch = cellMatches[5].match(/<td[^>]*>(.*?)<\/td>/s);
    const importance = importanceMatch ? cleanHtmlContent(importanceMatch[1]).trim() : '';

    // Validate required fields
    if (!id || !title) {
      return null;
    }

    return {
      id,
      title,
      date,
      staff,
      importance: importance || 'Medium',
      body: body || '',
      isRead: false, // All notifications start as unread
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    return null;
  }
}

/**
 * Cleans HTML content by removing tags and normalizing whitespace
 * @param htmlContent - HTML content to clean
 * @returns Cleaned text content
 */
function cleanHtmlContent(htmlContent: string): string {
  return htmlContent
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Decodes HTML entities in text content
 * @param text - Text content that may contain HTML entities
 * @returns Decoded text content
 */
function decodeHtmlEntities(text: string): string {
  const entityMap: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&hellip;': '…',
    '&mdash;': '—',
    '&ndash;': '–',
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&ldquo;': '"',
    '&rdquo;': '"',
  };

  return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
    return entityMap[entity] || entity;
  });
}

/**
 * Validates a notification object to ensure it has all required fields
 * @param notification - Notification object to validate
 * @returns True if valid, false otherwise
 */
export function validateNotification(notification: any): notification is Notification {
  return (
    notification &&
    typeof notification.id === 'string' &&
    notification.id.length > 0 &&
    typeof notification.title === 'string' &&
    notification.title.length > 0 &&
    typeof notification.date === 'string' &&
    typeof notification.staff === 'string' &&
    typeof notification.importance === 'string' &&
    typeof notification.body === 'string' &&
    typeof notification.isRead === 'boolean' &&
    typeof notification.createdAt === 'string'
  );
}

/**
 * Parses a date string in M/D/YYYY format to a proper Date object
 * @param dateString - Date string in M/D/YYYY format
 * @returns Date object or null if parsing fails
 */
function parseNotificationDate(dateString: string): Date | null {
  try {
    // Handle M/D/YYYY format (e.g., "6/12/2025")
    const dateMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dateMatch) {
      const [, month, day, year] = dateMatch;
      // Create date with explicit month/day/year (month is 0-indexed in Date constructor)
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Fallback to default Date parsing
    return new Date(dateString);
  } catch (error) {
    return null;
  }
}

/**
 * Filters and sorts notifications by date (newest first)
 * @param notifications - Array of notifications to process
 * @returns Filtered and sorted notifications
 */
export function processNotifications(notifications: Notification[]): Notification[] {
  return notifications
    .filter(validateNotification)
    .sort((a, b) => {
      // Sort by date (newest first)
      const dateA = parseNotificationDate(a.date);
      const dateB = parseNotificationDate(b.date);
      
      // Handle invalid dates
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      return dateB.getTime() - dateA.getTime();
    });
}
