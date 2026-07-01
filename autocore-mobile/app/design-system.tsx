/**
 * Design System showcase — validates tokens and components before screen migration.
 * This is NOT a product screen; it documents the Autocore mobile design language.
 */
import { ScrollView, View } from 'react-native';

import {
  LayoutGridIcon,
  PlusIcon,
  SearchIcon,
} from '@/assets/icons';
import {
  ActivityCard,
  AnalyticsCard,
  EngineCard,
  InventoryCard,
  OrderCard,
  QuickActionCard,
  TimelineCard,
} from '@/components/business';
import { PackageIcon, WrenchIcon } from '@/assets/icons';
import {
  Alert,
  AnimatedContainer,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Chip,
  DashboardCard,
  Divider,
  EmptyState,
  GlassCard,
  Input,
  Progress,
  SearchInput,
  SegmentedControl,
  Skeleton,
  StatCard,
  Switch,
  Text,
  TopBar,
} from '@/components/ui';
import { useDesignLanguage } from '@/hooks';
import { spacing } from '@/theme';
import { useState } from 'react';

export default function DesignSystemScreen() {
  const dl = useDesignLanguage();
  const [segment, setSegment] = useState('overview');
  const [checked, setChecked] = useState(false);
  const [enabled, setEnabled] = useState(true);

  return (
    <View style={{ flex: 1, backgroundColor: dl.colors.background }}>
      <TopBar title="Autocore Design System" subtitle="Mobile tokens & components" />

      <ScrollView
        contentContainerStyle={{
          padding: spacing[4],
          gap: spacing[6],
          paddingBottom: spacing[16],
        }}
      >
        <AnimatedContainer staggerIndex={0}>
          <Text variant="sectionLabel" color="muted">
            Typography
          </Text>
          <Card style={{ marginTop: spacing[3] }}>
            <CardContent>
              <Text variant="display">Display</Text>
              <Text variant="title">Title</Text>
              <Text variant="heading">Heading</Text>
              <Text variant="body">Body — primary text color</Text>
              <Text variant="body" color="muted">
                Body — muted foreground
              </Text>
              <Text variant="caption">Caption</Text>
              <Text variant="label">Label</Text>
            </CardContent>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer staggerIndex={1}>
          <Text variant="sectionLabel" color="muted">
            Colors
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[3] }}>
            {(
              [
                ['Primary', dl.colors.primary],
                ['Surface', dl.colors.surface],
                ['Muted', dl.colors.muted],
                ['Success', dl.colors.success],
                ['Warning', dl.colors.warning],
                ['Danger', dl.colors.destructive],
              ] as const
            ).map(([label, color]) => (
              <View
                key={label}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 12,
                  backgroundColor: color,
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  padding: spacing[1],
                }}
              >
                <Text variant="caption" style={{ color: dl.colors.foreground, fontSize: 9 }}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </AnimatedContainer>

        <AnimatedContainer staggerIndex={2}>
          <Text variant="sectionLabel" color="muted">
            Buttons
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[3] }}>
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button leftIcon={<PlusIcon size="sm" color={dl.colors.primaryForeground} />}>
              With icon
            </Button>
          </View>
        </AnimatedContainer>

        <AnimatedContainer staggerIndex={3}>
          <Text variant="sectionLabel" color="muted">
            Form controls
          </Text>
          <View style={{ gap: spacing[3], marginTop: spacing[3] }}>
            <Input placeholder="Input field" />
            <SearchInput placeholder="Search inventory..." />
            <Checkbox checked={checked} onCheckedChange={setChecked} label="Checkbox" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
              <Switch value={enabled} onValueChange={setEnabled} />
              <Text variant="body">Switch</Text>
            </View>
            <SegmentedControl
              segments={[
                { value: 'overview', label: 'Overview' },
                { value: 'sales', label: 'Sales' },
              ]}
              value={segment}
              onValueChange={setSegment}
            />
          </View>
        </AnimatedContainer>

        <AnimatedContainer staggerIndex={4}>
          <Text variant="sectionLabel" color="muted">
            Cards & metrics
          </Text>
          <View style={{ gap: spacing[3], marginTop: spacing[3] }}>
            <StatCard label="Revenue" value="1 240 000" suffix=" ₸" icon={LayoutGridIcon} tone="primary" hint="+12% this month" />
            <DashboardCard title="Mission Control" description="Graphite command center module">
              <Text variant="body" color="muted">
                Dashboard card with module header styling from web .mc-module-card
              </Text>
            </DashboardCard>
            <GlassCard>
              <Text variant="body">Glass panel with blur — .mc-glass-panel equivalent</Text>
            </GlassCard>
          </View>
        </AnimatedContainer>

        <AnimatedContainer staggerIndex={5}>
          <Text variant="sectionLabel" color="muted">
            Badges & chips
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[3] }}>
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Chip selected>Selected</Chip>
            <Chip>Chip</Chip>
          </View>
        </AnimatedContainer>

        <AnimatedContainer staggerIndex={6}>
          <Text variant="sectionLabel" color="muted">
            Feedback
          </Text>
          <View style={{ gap: spacing[3], marginTop: spacing[3] }}>
            <Alert title="Information" description="Default alert styling" />
            <Progress value={65} />
            <Skeleton height={48} />
          </View>
        </AnimatedContainer>

        <AnimatedContainer staggerIndex={7}>
          <Divider />
          <EmptyState
            icon={SearchIcon}
            title="No results"
            description="Try adjusting your search or filters to find what you're looking for."
            primaryAction={{ label: 'Clear filters', onPress: () => {} }}
          />
        </AnimatedContainer>

        <AnimatedContainer staggerIndex={8}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
            <Avatar name="Autocore" />
            <Text variant="body">Gradient avatar fallback</Text>
          </View>
        </AnimatedContainer>

        <AnimatedContainer staggerIndex={9}>
          <Text variant="sectionLabel" color="muted">
            Business language
          </Text>
          <View style={{ gap: spacing[3], marginTop: spacing[3] }}>
            <EngineCard title="Toyota 2GR-FE" code="ENG-2041" vin="JTDBT923..." status="available" price="420 000 ₸" />
            <InventoryCard name="Генератор Denso" sku="GEN-DEN-042" quantity={3} location="A-12" lowStock />
            <OrderCard id="WO-1042" clientName="Алексей К." status="В работе" total="85 000 ₸" vehicle="Camry 70" />
            <AnalyticsCard label="Выручка" value="1.2M" suffix=" ₸" delta={12} icon={LayoutGridIcon} />
            <QuickActionCard label="Новый заказ" description="Создать заказ-наряд" icon={WrenchIcon} onPress={() => {}} />
            <QuickActionCard label="Приёмка" description="Быстрое оприходование" icon={PackageIcon} onPress={() => {}} />
            <TimelineCard title="Двигатель оприходован" description="Склад A, полка 12" time="14:32" />
            <ActivityCard action="обновил остаток" actor="Виктор" target="GEN-DEN-042" time="5 мин назад" />
          </View>
        </AnimatedContainer>
      </ScrollView>
    </View>
  );
}
