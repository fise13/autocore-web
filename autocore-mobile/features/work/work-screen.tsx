import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { LayoutGridIcon, SearchIcon } from '@/assets/icons';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { ProductScreenShell, ScreenScroll } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { useAdaptiveLayout } from '@/hooks/use-adaptive-layout';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { guardedPush } from '@/lib/navigation/guarded-push';
import { haptics } from '@/theme';
import { useShellModel } from '@/lib/shell/use-shell-model';
import { useWorkspaceContextStore } from '@/lib/shell/workspace-context-store';

import { WorkGroup, WorkGroupRow } from './components/work-group';
import { WorkScreenSkeleton } from './components/work-screen-skeleton';
import { WorkSearchOverlay } from './components/work-search-overlay';
import { WorkTodayCard } from './components/work-today-card';
import { useWorkCounts } from './hooks/use-work-counts';
import { workLayout } from './layout';
import { buildWorkModel } from './lib/work-model';

/**
 * Work — the catalog of workspaces this company + seat can act in, with one
 * short priority block on top.
 *
 * Deliberately *not* a second Home: no charts, no revenue, no activity feed.
 * Home answers "what is happening with the company", Work answers "what can I
 * do right now". Finance lives on its own tab and is not repeated here.
 */
export function WorkScreen() {
  const { profile, companyId } = useSession();
  const { workGrouped } = useShellModel();
  const setWorkspaceContext = useWorkspaceContextStore((s) => s.setWorkspaceContext);
  const router = useRouter();
  const { colors } = useTheme();
  const { isTablet, columns } = useAdaptiveLayout();

  const sessionReady = Boolean(profile && companyId);

  // Keyed on the visible node list so the counts hook keeps a stable Set
  // identity across shell-model re-resolutions.
  const nodeIdKey = workGrouped
    .flatMap((group) => group.nodes.map((node) => node.id))
    .join('|');
  const nodeIds = useMemo(
    () => new Set(nodeIdKey ? nodeIdKey.split('|') : []),
    [nodeIdKey],
  );

  const { counts, orders, items, intakeJobs, earningsAttention, series } =
    useWorkCounts(nodeIds);
  const model = useMemo(
    () =>
      buildWorkModel(
        workGrouped,
        counts,
        {
          orders,
          items,
          intakeJobs,
          earningsAttention,
        },
        series,
      ),
    [workGrouped, counts, orders, items, intakeJobs, earningsAttention, series],
  );
  const [searchOpen, setSearchOpen] = useState(false);

  const openSearch = useCallback(() => {
    haptics.light();
    setSearchOpen(true);
  }, []);

  const openNode = useCallback(
    (id: string, href: string) => {
      if (!href) return;
      setWorkspaceContext(id);
      guardedPush(router, href as Href);
    },
    [router, setWorkspaceContext],
  );

  const openToday = useCallback(() => {
    if (!model.today.href) return;
    guardedPush(router, model.today.href as Href);
  }, [model.today.href, router]);

  // Hold only until the session can name the company. Live counts fill in
  // on the real rows (`fallback` detail) — waiting for every listener was
  // a full-screen skeleton on every tab visit.
  if (!sessionReady) {
    return <WorkScreenSkeleton />;
  }

  const searchButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Search"
      onPress={openSearch}
      hitSlop={8}
      style={{
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: searchOpen ? 0 : 1,
      }}
    >
      <SearchIcon size={22} color={colors.foreground} />
    </Pressable>
  );

  const twoColumn = isTablet && columns >= 2;

  return (
    <ProductScreenShell animateEnter={false}>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }} pointerEvents={searchOpen ? 'none' : 'auto'}>
          <ScreenScroll tabBarInset edgeTitle="Work" edgeTrailing={searchButton}>
        <PageHeader title="Work" trailing={searchButton} />

        {model.sections.length === 0 ? (
          <EmptyState
            icon={LayoutGridIcon}
            title="No workspaces"
            description="Your company modules and role do not expose operational workspaces on mobile."
          />
        ) : (
          <>
            <View style={{ marginTop: workLayout.headingTop }}>
              <WorkTodayCard today={model.today} onPress={openToday} />
            </View>

            <Text
              variant="title3"
              style={{
                color: colors.foreground,
                marginTop: workLayout.todayBottom,
                marginBottom: workLayout.workspacesBottom,
                marginHorizontal: workLayout.pad,
              }}
            >
              Workspaces
            </Text>

            {/* Last section already pays `sectionGap`; ScreenScroll adds the tab-bar inset. */}
            <View
              style={
                twoColumn
                  ? { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' }
                  : undefined
              }
            >
              {model.sections.map((section) => (
                <View
                  key={section.id}
                  style={twoColumn ? { width: '50%', minWidth: 280 } : { width: '100%' }}
                >
                  <WorkGroup title={section.title}>
                    {section.rows.map((row) => (
                      <WorkGroupRow
                        key={row.id}
                        title={row.title}
                        detail={row.detail}
                        detailKind={row.detailKind}
                        urgent={row.attention > 0}
                        series={row.series}
                        onPress={() => openNode(row.id, row.href)}
                      />
                    ))}
                  </WorkGroup>
                </View>
              ))}
            </View>
          </>
        )}
        </ScreenScroll>
        </View>
        {searchOpen ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <WorkSearchOverlay
              model={model}
              onClose={() => setSearchOpen(false)}
              onOpenNode={openNode}
              onOpenToday={openToday}
            />
          </View>
        ) : null}
      </View>
    </ProductScreenShell>
  );
}
