import { useColorScheme } from '@/hooks/useColorScheme';
import { withAlpha } from '@/constants/Theme';
import { Linking, StyleProp, Text, TextProps, TextStyle } from 'react-native';

// Matches http(s) URLs, bare www. URLs and email addresses.
const LINK_REGEX = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/gi;
// Punctuation that usually ends a sentence rather than belonging to the URL.
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

export const LINK_COLORS = { light: '#2563EB', dark: '#60A5FA' } as const;

type Segment = { text: string; url?: string };

function splitLinks(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(LINK_REGEX)) {
    let raw = match[0];
    const trailing = raw.match(TRAILING_PUNCTUATION)?.[0] ?? '';
    // Keep a closing paren if the URL itself contains an opening one, e.g. wiki links.
    const keepParen = trailing.startsWith(')') && raw.includes('(');
    const strip = keepParen ? trailing.slice(1) : trailing;
    if (strip) raw = raw.slice(0, -strip.length);

    const start = match.index ?? 0;
    if (start > lastIndex) segments.push({ text: text.slice(lastIndex, start) });

    let url = raw;
    if (raw.includes('@') && !/^https?:\/\//i.test(raw) && !raw.toLowerCase().startsWith('www.')) url = `mailto:${raw}`;
    else if (raw.toLowerCase().startsWith('www.')) url = `https://${raw}`;
    segments.push({ text: raw, url });
    lastIndex = start + raw.length;
  }
  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex) });
  return segments;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface LinkifiedTextProps extends Omit<TextProps, 'children'> {
  children: string;
  style?: StyleProp<TextStyle>;
  /** Case-insensitive term to highlight (used by search). */
  highlight?: string;
  onLinkPress?: (url: string) => void;
}

/**
 * Renders text with tappable, hyperlink-styled URLs/emails. Links are nested
 * <Text> nodes so they wrap inline with the surrounding text and respect
 * numberOfLines / selectable on the parent.
 */
export default function LinkifiedText({ children, style, highlight, onLinkPress, ...rest }: LinkifiedTextProps) {
  const colorScheme = useColorScheme();
  const linkColor = LINK_COLORS[colorScheme ?? 'light'];
  const highlightBg = withAlpha('#FACC15', colorScheme === 'dark' ? 0.35 : 0.45);
  const term = highlight?.trim();
  const highlightRegex = term ? new RegExp(`(${escapeRegex(term)})`, 'gi') : null;

  const open = (url: string) => {
    if (onLinkPress) return onLinkPress(url);
    Linking.openURL(url).catch(() => {});
  };

  const renderHighlighted = (text: string, keyPrefix: string) => {
    if (!highlightRegex) return text;
    return text.split(highlightRegex).map((piece, i) =>
      i % 2 === 1 ? (
        <Text key={`${keyPrefix}-${i}`} style={{ backgroundColor: highlightBg }}>
          {piece}
        </Text>
      ) : (
        piece
      )
    );
  };

  return (
    <Text style={style} {...rest}>
      {splitLinks(children).map((seg, i) =>
        seg.url ? (
          <Text
            key={i}
            style={{ color: linkColor, textDecorationLine: 'underline' }}
            onPress={() => open(seg.url!)}
            suppressHighlighting={false}
            accessibilityRole="link"
          >
            {renderHighlighted(seg.text, `l${i}`)}
          </Text>
        ) : (
          <Text key={i}>{renderHighlighted(seg.text, `t${i}`)}</Text>
        )
      )}
    </Text>
  );
}
