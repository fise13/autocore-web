import { useMemo } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useSession } from '@/hooks/use-session';
import { useSessionQueryData } from '@/hooks/use-session-query-data';
import type { MotorEntity } from '@/types/motor';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/hooks/use-theme';

import { ObjectShell } from './object-shell';

/** Canonical Engine object — opened from Search, Work, AI, Intake, Warehouse. */
export function EngineObjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companyId, uid, can } = useSession();
  const router = useRouter();
  const { colors } = useTheme();

  const motors = useSessionQueryData<MotorEntity[]>(
    ['realtime', 'motors', companyId, uid],
    Boolean(companyId && uid),
    [],
  );

  const motor = useMemo(() => motors.find((m) => m.id === id), [id, motors]);

  if (!motor) {
    return (
      <ObjectShell
        title="Engine"
        subtitle="Not found"
        sections={[
          {
            id: 'empty',
            title: 'Identity',
            children: (
              <Text variant="body" color="muted">
                This engine is not in the current company cache. Try Search.
              </Text>
            ),
          },
        ]}
        actions={
          <Button native={false} variant="outline" onPress={() => router.push('/search' as Href)}>
            Open search
          </Button>
        }
      />
    );
  }

  const serial = motor.serialCode?.trim() || motor.id;
  const title =
    [motor.brandName, motor.engineCode || motor.configuration].filter(Boolean).join(' ') ||
    'Engine';
  const status = motor.soldDate
    ? 'Sold'
    : (motor.status ?? 'available').replace(/_/g, ' ');

  return (
    <ObjectShell
      title={title}
      identifier={serial}
      status={status}
      subtitle={motor.configuration || undefined}
      sections={[
        {
          id: 'identity',
          title: 'Identity',
          children: (
            <View style={{ gap: tokens.space.micro }}>
              <Text variant="body">{title}</Text>
              <Text variant="identifier">{serial}</Text>
              {motor.engineCode ? (
                <Text variant="footnote" color="muted">
                  {motor.engineCode}
                </Text>
              ) : null}
            </View>
          ),
        },
        {
          id: 'condition',
          title: 'Condition',
          children: (
            <Text variant="body" color="muted">
              {motor.notes?.trim() || 'No condition notes yet.'}
            </Text>
          ),
        },
        {
          id: 'warehouse',
          title: 'Warehouse',
          children: (
            <Text variant="body">
              {motor.warehouseLocation?.trim() ||
                motor.primaryLocationCode?.trim() ||
                'No location assigned'}
            </Text>
          ),
        },
        {
          id: 'documentation',
          title: 'Documentation',
          children: (
            <Text variant="body" color="muted">
              {motor.intakeStatus
                ? `Intake: ${motor.intakeStatus.replace(/_/g, ' ')}`
                : 'Open intake to capture evidence photos.'}
            </Text>
          ),
        },
      ]}
      actions={
        <View style={{ gap: tokens.space.inline }}>
          {can('engine_intake_execute') ? (
            <Button native={false} onPress={() => router.push('/intake' as Href)}>
              Photograph / intake
            </Button>
          ) : null}
          <Button
            native={false}
            variant="outline"
            onPress={() => router.push('/(tabs)/scan' as Href)}
          >
            Scan to relocate
          </Button>
          <Text variant="caption1" style={{ color: colors.mutedForeground }}>
            Same object from Home, Work, Search, and AI.
          </Text>
        </View>
      }
    />
  );
}
