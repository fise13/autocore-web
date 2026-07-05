import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { rhythm } from '@/theme';

type SectionTitleProps = {
  title: string;
  delay?: number;
};

export function SectionTitle({ title }: SectionTitleProps) {
  const { colors } = useTheme();

  return (
    <Text
      variant="caption"
      style={{
        paddingHorizontal: rhythm.pad,
        paddingBottom: rhythm.micro,
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        color: colors.mutedForeground,
      }}
    >
      {title}
    </Text>
  );
}
