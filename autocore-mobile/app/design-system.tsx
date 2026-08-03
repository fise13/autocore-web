/**
 * Design System showcase — living acceptance surface for Autocore Mobile DL v3.
 * See DESIGN.md for principles and token rules.
 */
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import {
  LayoutGridIcon,
  PackageIcon,
  PlusIcon,
  SearchIcon,
  WrenchIcon,
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
import {
  Alert,
  AnimatedContainer,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CollectionRow,
  DashboardCard,
  DetailSkeleton,
  Divider,
  EmptyState,
  FormSkeleton,
  Input,
  ListSection,
  ListSkeleton,
  Progress,
  SearchInput,
  SegmentedControl,
  Skeleton,
  StatCard,
  StickyActionBar,
  Surface,
  Switch,
  Text,
  TopBar,
} from '@/components/ui';
import { useDesignLanguage, useMotion } from '@/hooks';
import { spacing, tokens } from '@/theme';

export default function DesignSystemScreen() {
  const dl = useDesignLanguage();
  const motion = useMotion();
  const [segment, setSegment] = useState('overview');
  const [checked, setChecked] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [selected, setSelected] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: dl.colors.background }}>
      <TopBar title="Autocore Design System" subtitle="DL v3 — tokens, states, motion" />

      <ScrollView
        contentContainerStyle={{
          padding: tokens.space.screenX,
          gap: spacing[6],
          paddingBottom: spacing[16],
        }}
      >
        <AnimatedContainer staggerIndex={0}>
          <Text variant="footnote" color="muted">
            Motion: {motion.reduced ? 'reduced' : 'full'} · Springs: press / settle / sheet / list /
            nav · Dynamic Type via system Text
          </Text>
        </AnimatedContainer>

        <AnimatedContainer staggerIndex={1}>
          <Text variant="sectionLabel" color="muted">
            Typography
          </Text>
          <Surface variant="grouped" style={{ marginTop: spacing[3] }}>
            <Text variant="largeTitle">Large Title</Text>
            <Text variant="title1">Title 1</Text>
            <Text variant="title2">Title 2</Text>
            <Text variant="headline">Headline</Text>
            <Text variant="body">Body — primary</Text>
            <Text variant="callout" color="muted">
              Callout — muted
            </Text>
            <Text variant="sectionLabel" color="muted">
              Section label — sentence case
            </Text>
            <Text variant="footnote">Footnote</Text>
            <Text variant="caption1">Caption 1</Text>
            <Text variant="metric">1 240 000</Text>
          </Surface>
        </AnimatedContainer>

        <AnimatedContainer staggerIndex={2}>
          <Text variant="sectionLabel" color="muted">
            Colors (onSolid labels)
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[3] }}>
            {(
              [
                ['Primary', dl.colors.primary, dl.colors.primaryForeground],
                ['Success', dl.colors.success, dl.colors.successForeground],
                ['Warning', dl.colors.warning, dl.colors.warningForeground],
                ['Danger', dl.colors.destructive, dl.colors.destructiveForeground],
                ['Muted', dl.colors.muted, dl.colors.mutedForeground],
                ['Surface', dl.colors.surface, dl.colors.foreground],
              ] as const
            ).map(([label, color, fg]) => (
              <View
                key={label}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: tokens.radius.group,
                  backgroundColor: color,
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  padding: spacing[1],
                }}
              >
                <Text variant="caption2" style={{ color: fg }}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </AnimatedContainer>

        <AnimatedContainer staggerIndex={3}>
          <Text variant="sectionLabel" color="muted">
            Buttons (Claude-static forms)
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[3] }}>
            <Button native={false}>Primary</Button>
            <Button native={false} variant="secondary">
              Secondary
            </Button>
            <Button native={false} variant="outline">
              Outline
            </Button>
            <Button native={false} variant="ghost">
              Ghost
            </Button>
            <Button native={false} variant="destructive">
              Destructive
            </Button>
            <Button native={false} loading>
              Loading
            </Button>
            <Button native={false} disabled>
              Disabled
            </Button>
            <Button size="icon" systemImage="plus" accessibilityLabel="Add" />
          </View>
        </AnimatedContainer>

        <AnimatedContainer staggerIndex={4}>
          <Text variant="sectionLabel" color="muted">
            Surfaces
          </Text>
          <View style={{ gap: spacing[3], marginTop: spacing[3] }}>
            <Surface variant="grouped">
              <Text variant="headline">Grouped</Text>
              <Text variant="footnote" color="muted">
                Hairline or fill — not both with heavy shadow.
              </Text>
            </Surface>
            <Surface variant="elevated">
              <Text variant="headline">Elevated</Text>
              <Text variant="footnote" color="muted">
                Floating layers only.
              </Text>
            </Surface>
          </View>
        </AnimatedContainer>

        <AnimatedContainer staggerIndex={5}>
          <Text variant="sectionLabel" color="muted">
            Collection (default list dialect)
          </Text>
          <View style={{ marginTop: spacing[3], marginHorizontal: -tokens.space.screenX }}>
            <ListSection title="Workspace" footer="Orders use activity cards; same tokens.">
              <CollectionRow
                title="Work orders"
                subtitle="Open jobs"
                icon={WrenchIcon}
                onPress={() => undefined}
              />
              <CollectionRow
                title="Inventory"
                subtitle="Stock levels"
                icon={PackageIcon}
                selectable
                selected={selected}
                onPress={() => setSelected((value) => !value)}
              />
              <CollectionRow title="Danger zone" tone="danger" showChevron={false} />
            </ListSection>
          </View>
        </AnimatedContainer>

        <AnimatedContainer staggerIndex={6}>
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

        <AnimatedContainer staggerIndex={7}>
          <Text variant="sectionLabel" color="muted">
            Loading skeletons (structure-preserving)
          </Text>
          <View style={{ gap: spacing[4], marginTop: spacing[3], marginHorizontal: -tokens.space.screenX }}>
            <ListSkeleton rows={3} />
          </View>
          <View style={{ gap: spacing[4], marginTop: spacing[3] }}>
            <DetailSkeleton />
            <FormSkeleton />
            <Skeleton height={48} rounded="group" />
          </View>
        </AnimatedContainer>

        <AnimatedContainer staggerIndex={8}>
          <Text variant="sectionLabel" color="muted">
            Badges & chips
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[3] }}>
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="success">Success</Badge>
            <Chip selected>Selected</Chip>
            <Chip>Chip</Chip>
          </View>
        </AnimatedContainer>

        <AnimatedContainer staggerIndex={9}>
          <Text variant="sectionLabel" color="muted">
            Empty (type-led) & feedback
          </Text>
          <View style={{ gap: spacing[3], marginTop: spacing[3] }}>
            <Alert title="Information" description="Default alert styling" />
            <Progress value={65} />
            <EmptyState
              icon={SearchIcon}
              title="No results"
              description="Try adjusting your search or filters."
              primaryAction={{ label: 'Clear filters', onPress: () => undefined }}
            />
          </View>
        </AnimatedContainer>

        <AnimatedContainer staggerIndex={10}>
          <Text variant="sectionLabel" color="muted">
            StickyActionBar
          </Text>
          <View
            style={{
              marginTop: spacing[3],
              borderRadius: tokens.radius.group,
              overflow: 'hidden',
              borderWidth: tokens.control.hairline,
              borderColor: dl.colors.border,
            }}
          >
            <StickyActionBar>
              <Button native={false} variant="outline" style={{ flex: 1 }}>
                Cancel
              </Button>
              <Button native={false} style={{ flex: 1 }}>
                Save
              </Button>
            </StickyActionBar>
          </View>
          <Text variant="caption1" color="muted" style={{ marginTop: spacing[2] }}>
            Sheet proof: Company settings → Switch organization
          </Text>
        </AnimatedContainer>

        <AnimatedContainer staggerIndex={11}>
          <Text variant="sectionLabel" color="muted">
            Metrics
          </Text>
          <View style={{ gap: spacing[3], marginTop: spacing[3] }}>
            <StatCard
              label="Revenue"
              value="1 240 000"
              suffix="$"
              icon={LayoutGridIcon}
              tone="primary"
              hint="+12% this month"
            />
            <DashboardCard title="Overview" description="Quiet operational module">
              <Text variant="body" color="muted">
                Prefer hierarchy over glass decoration.
              </Text>
            </DashboardCard>
            <Card>
              <CardContent>
                <Text variant="headline">Legacy Card</Text>
                <Text variant="footnote" color="muted">
                  Prefer Surface / ListSection for new work.
                </Text>
              </CardContent>
            </Card>
          </View>
        </AnimatedContainer>

        <AnimatedContainer staggerIndex={12}>
          <Divider />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginTop: spacing[3] }}>
            <Avatar name="Autocore" />
            <Button
              native={false}
              size="sm"
              leftIcon={<PlusIcon size="sm" color={dl.colors.primaryForeground} />}
            >
              Action
            </Button>
          </View>
        </AnimatedContainer>

        <AnimatedContainer staggerIndex={13}>
          <Text variant="sectionLabel" color="muted">
            Business language
          </Text>
          <View style={{ gap: spacing[3], marginTop: spacing[3] }}>
            <EngineCard
              title="Toyota 2GR-FE"
              code="ENG-2041"
              vin="JTDBT923..."
              status="available"
              price="420 000 $"
            />
            <InventoryCard
              name="Denso Alternator"
              sku="GEN-DEN-042"
              quantity={3}
              location="A-12"
              lowStock
            />
            <OrderCard
              id="WO-1042"
              clientName="Alex K."
              status="In progress"
              total="85 000 $"
              vehicle="Camry 70"
            />
            <AnalyticsCard label="Revenue" value="1.2M" suffix="$" delta={12} icon={LayoutGridIcon} />
            <QuickActionCard
              label="New order"
              description="Create a work order"
              icon={WrenchIcon}
              onPress={() => undefined}
            />
            <TimelineCard title="Engine received" description="Warehouse A, shelf 12" time="14:32" />
            <ActivityCard action="updated stock" actor="Victor" target="GEN-DEN-042" time="5 min ago" />
          </View>
        </AnimatedContainer>
      </ScrollView>
    </View>
  );
}
