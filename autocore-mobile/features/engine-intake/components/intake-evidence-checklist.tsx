import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { EngineIntakeProgress } from '@autocore/engine-intake';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/hooks/use-theme';

import { missingEvidenceLabels } from '../lib/evidence-labels';

type Props = {
  progress: EngineIntakeProgress | null | undefined;
  /** Compact single-line for camera chrome; full list for bay. */
  compact?: boolean;
};

/** Human evidence progress — checklist of missing shots, never a percentage. */
export function IntakeEvidenceChecklist({ progress, compact = false }: Props) {
  const { colors } = useTheme();
  const missing = missingEvidenceLabels(progress);

  if (missing.length === 0) {
    return (
      <Text variant="footnote" style={{ color: colors.success }}>
        Evidence looks complete
      </Text>
    );
  }

  if (compact) {
    return (
      <Text variant="footnote" style={{ color: colors.warningOnSubtle }}>
        {missing[0]} not documented
        {missing.length > 1 ? ` · +${missing.length - 1} more` : ''}
      </Text>
    );
  }

  return (
    <View style={{ gap: tokens.space.micro }}>
      <Text variant="sectionLabel" color="muted">
        Still needed
      </Text>
      {missing.map((label) => (
        <Text key={label} variant="body" style={{ color: colors.warningOnSubtle }}>
          {label} not documented
        </Text>
      ))}
    </View>
  );
}
