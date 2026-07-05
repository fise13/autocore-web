import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import type { ComponentProps } from 'react';

type TextComponentProps = ComponentProps<typeof Text>;

type TextPart = { text: string; highlight: boolean };

function splitHighlightParts(text: string, query: string): TextPart[] {
  const trimmed = query.trim();
  if (!trimmed) return [{ text, highlight: false }];

  const lowerText = text.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  const parts: TextPart[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const index = lowerText.indexOf(lowerQuery, cursor);
    if (index === -1) {
      parts.push({ text: text.slice(cursor), highlight: false });
      break;
    }
    if (index > cursor) {
      parts.push({ text: text.slice(cursor, index), highlight: false });
    }
    parts.push({ text: text.slice(index, index + trimmed.length), highlight: true });
    cursor = index + trimmed.length;
  }

  return parts.length > 0 ? parts : [{ text, highlight: false }];
}

type HighlightedTextProps = TextComponentProps & {
  text: string;
  query: string;
};

export function HighlightedText({ text, query, style, ...props }: HighlightedTextProps) {
  const { colors } = useTheme();
  const parts = splitHighlightParts(text, query);

  if (parts.length === 1 && !parts[0]?.highlight) {
    return (
      <Text style={style} {...props}>
        {text}
      </Text>
    );
  }

  return (
    <Text style={style} {...props}>
      {parts.map((part, index) =>
        part.highlight ? (
          <Text
            key={`${index}-${part.text}`}
            style={{ color: colors.primary, fontWeight: '600' }}
          >
            {part.text}
          </Text>
        ) : (
          part.text
        ),
      )}
    </Text>
  );
}
