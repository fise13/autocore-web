import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { tokens } from '@/theme/tokens';

type SectionTitleProps = {
  title: string;
  delay?: number;
};

export function SectionTitle({ title }: SectionTitleProps) {
  const { colors } = useTheme();

  return (
    <Text
      variant="sectionLabel"
      style={{
        paddingHorizontal: tokens.space.screenX,
        paddingBottom: tokens.space.micro,
        color: colors.mutedForeground,
      }}
    >
      {title}
    </Text>
  );
}
