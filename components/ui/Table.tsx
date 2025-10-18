import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { StyleSheet, Text, View } from 'react-native';

export interface TableCell {
  content: string;
  isHeader?: boolean;
  colSpan?: number;
  rowSpan?: number;
}

export interface TableRow {
  cells: TableCell[];
}

export interface TableData {
  rows: TableRow[];
}

interface TableProps {
  data: TableData;
  style?: any;
}

export default function Table({ data, style }: TableProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const styles = StyleSheet.create({
    table: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
      marginVertical: 8,
    },
    row: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    cell: {
      flex: 1,
      padding: 8,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerCell: {
      backgroundColor: colors.background,
      fontWeight: 'bold',
    },
    cellText: {
      color: colors.text,
      textAlign: 'center',
    },
    headerText: {
      fontWeight: 'bold',
      color: colors.text,
    },
  });

  return (
    <View style={[styles.table, style]}>
      {data.rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.cells.map((cell, cellIndex) => (
            <View
              key={cellIndex}
              style={[
                styles.cell,
                cell.isHeader && styles.headerCell,
                cellIndex === row.cells.length - 1 && { borderRightWidth: 0 },
              ]}
            >
              <Text
                style={[
                  styles.cellText,
                  cell.isHeader && styles.headerText,
                ]}
              >
                {cell.content}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * Parses HTML table content into TableData format
 */
export function parseHtmlTable(html: string): TableData | null {
  try {
    // Extract table content
    const tableMatch = html.match(/<table[^>]*>(.*?)<\/table>/s);
    if (!tableMatch) return null;

    const tableContent = tableMatch[1];
    
    // Extract tbody if present, otherwise use the whole table content
    const tbodyMatch = tableContent.match(/<tbody[^>]*>(.*?)<\/tbody>/s);
    const content = tbodyMatch ? tbodyMatch[1] : tableContent;

    // Extract rows
    const rowMatches = content.match(/<tr[^>]*>(.*?)<\/tr>/gs);
    if (!rowMatches) return null;

    const rows: TableRow[] = [];

    for (const rowHtml of rowMatches) {
      // Extract cells (both td and th)
      const cellMatches = rowHtml.match(/<(td|th)[^>]*>(.*?)<\/(td|th)>/gs);
      if (!cellMatches) continue;

      const cells: TableCell[] = [];

      for (const cellHtml of cellMatches) {
        // Extract cell content and attributes
        const cellMatch = cellHtml.match(/<(td|th)[^>]*>(.*?)<\/(td|th)>/s);
        if (!cellMatch) continue;

        const isHeader = cellMatch[1] === 'th';
        const cellContent = cellMatch[2];
        
        // Clean up the cell content
        const cleanContent = cellContent
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
          .replace(/&amp;/g, '&') // Replace HTML entities
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();

        if (cleanContent) {
          cells.push({
            content: cleanContent,
            isHeader,
          });
        }
      }

      if (cells.length > 0) {
        rows.push({ cells });
      }
    }

    return { rows };
  } catch (error) {
    console.error('Error parsing HTML table:', error);
    return null;
  }
}
