import { useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { LayoutGridIcon } from '@/assets/icons';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { ProductScreenShell, ScreenScroll } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { useAdaptiveLayout } from '@/hooks/use-adaptive-layout';
import { useTheme } from '@/hooks/use-theme';
import { useShellModel } from '@/lib/shell/use-shell-model';
import { useWorkspaceContextStore } from '@/lib/shell/workspace-context-store';

import { WorkGroup, WorkGroupRow } from './components/work-group';
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
  const { workGrouped } = useShellModel();
  const setWorkspaceContext = useWorkspaceContextStore((s) => s.setWorkspaceContext);
  const router = useRouter();
  const { colors } = useTheme();
  const { isTablet, columns } = useAdaptiveLayout();

  // Keyed on the visible node list so the counts hook keeps a stable Set
  // identity across shell-model re-resolutions.
  const nodeIdKey = workGrouped
    .flatMap((group) => group.nodes.map((node) => node.id))
    .join('|');
  const nodeIds = useMemo(
    () => new Set(nodeIdKey ? nodeIdKey.split('|') : []),
    [nodeIdKey],
  );

  const counts = useWorkCounts(nodeIds);
  const model = useMemo(() => buildWorkModel(workGrouped, counts), [workGrouped, counts]);

  const openSearch = useCallback(() => {
    router.push('/search' as Href);
  }, [router]);

  const openNode = useCallback(
    (id: string, href: string) => {
      setWorkspaceContext(id);
      router.push(href as Href);
    },
    [router, setWorkspaceContext],
  );

  const openToday = useCallback(() => {
    if (!model.today.href) return;
    router.push(model.today.href as Href);
  }, [model.today.href, router]);

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
      }}
    >
      <SymbolView
        name="magnifyingglass"
        size={22}
        tintColor={colors.foreground}
        weight="medium"
      />
    </Pressable>
  );

  const twoColumn = isTablet && columns >= 2;

  return (
    <ProductScreenShell animateEnter={false}>
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
            <Text
              variant="title3"
              style={{
                color: colors.foreground,
                marginTop: workLayout.headingTop,
                marginHorizontal: workLayout.pad,
              }}
            >
              Today
            </Text>
            <WorkTodayCard today={model.today} onPress={openToday} />

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
    </ProductScreenShell>
  );
}
