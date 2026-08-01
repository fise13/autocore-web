import { memo, useMemo } from 'react';
import { Text as RNText, type StyleProp, type TextStyle } from 'react-native';

type HighlightedTextProps = {
  text: string;
  query: string;
  ranges?: Array<{ start: number; end: number }>;
  style?: StyleProp<TextStyle>;
  highlightStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

function mergeRanges(ranges: Array<{ start: number; end: number }>) {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [sorted[0]!];
  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i]!;
    const last = merged[merged.length - 1]!;
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
}

/** Renders text with query matches emphasized. */
export const HighlightedText = memo(function HighlightedText({
  text,
  query,
  ranges,
  style,
  highlightStyle,
  numberOfLines = 1,
}: HighlightedTextProps) {
  const parts = useMemo(() => {
    const effective =
      ranges && ranges.length > 0
        ? mergeRanges(ranges)
        : mergeRanges(
            (() => {
              const q = query.trim().toLowerCase();
              if (!q) return [];
              const lower = text.toLowerCase();
              const found: Array<{ start: number; end: number }> = [];
              let from = 0;
              while (from < lower.length) {
                const index = lower.indexOf(q, from);
                if (index < 0) break;
                found.push({ start: index, end: index + q.length });
                from = index + q.length;
              }
              return found;
            })(),
          );

    if (effective.length === 0) {
      return [{ text, highlight: false }];
    }

    const chunks: Array<{ text: string; highlight: boolean }> = [];
    let cursor = 0;
    for (const range of effective) {
      const start = Math.max(0, Math.min(text.length, range.start));
      const end = Math.max(start, Math.min(text.length, range.end));
      if (start > cursor) {
        chunks.push({ text: text.slice(cursor, start), highlight: false });
      }
      if (end > start) {
        chunks.push({ text: text.slice(start, end), highlight: true });
      }
      cursor = end;
    }
    if (cursor < text.length) {
      chunks.push({ text: text.slice(cursor), highlight: false });
    }
    return chunks;
  }, [query, ranges, text]);

  return (
    <RNText style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) =>
        part.highlight ? (
          <RNText key={index} style={highlightStyle}>
            {part.text}
          </RNText>
        ) : (
          <RNText key={index}>{part.text}</RNText>
        ),
      )}
    </RNText>
  );
});
