import { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { LayoutGridIcon } from '@/assets/icons';
import { CollectionRow, ListSection } from '@/components/ui/collection';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { ProductScreenShell, ScreenScroll } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { useAdaptiveLayout } from '@/hooks/use-adaptive-layout';
import { useTheme } from '@/hooks/use-theme';
import { useShellModel } from '@/lib/shell/use-shell-model';
import { useWorkspaceContextStore } from '@/lib/shell/workspace-context-store';
import { tokens } from '@/theme/tokens';

/** Dynamic Work tree — company modules × permissions. */
export function WorkScreen() {
  const { workGrouped } = useShellModel();
  const setWorkspaceContext = useWorkspaceContextStore((s) => s.setWorkspaceContext);
  const router = useRouter();
  const { colors } = useTheme();
  const { isTablet, columns } = useAdaptiveLayout();

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

  return (
    <ProductScreenShell animateEnter={false}>
      <ScreenScroll tabBarInset>
        <PageHeader
          title="Work"
          subtitle="Enabled workspaces for your company"
          trailing={
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
                size={20}
                tintColor={colors.foreground}
                weight="medium"
              />
            </Pressable>
          }
        />

        {workGrouped.length === 0 ? (
          <EmptyState
            icon={LayoutGridIcon}
            title="No workspaces"
            description="Your company modules and role do not expose operational workspaces on mobile."
          />
        ) : (
          <View
            style={{
              paddingBottom: tokens.space.section,
              ...(isTablet && columns >= 2
                ? {
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                    gap: tokens.space.stack,
                    paddingHorizontal: tokens.space.screenX,
                  }
                : null),
            }}
          >
            {workGrouped.map((group) => (
              <View
                key={group.domain}
                style={
                  isTablet && columns >= 2
                    ? { width: '47%', minWidth: 280 }
                    : { width: '100%' }
                }
              >
                <ListSection title={group.title} inset={!isTablet}>
                  {group.nodes.map((node) => (
                    <CollectionRow
                      key={node.id}
                      title={node.title}
                      subtitle={node.subtitle}
                      onPress={() => openNode(node.id, node.href)}
                    />
                  ))}
                </ListSection>
              </View>
            ))}
          </View>
        )}

        <Text
          variant="caption1"
          color="muted"
          style={{
            marginHorizontal: tokens.space.screenX,
            marginBottom: tokens.space.section,
          }}
        >
          Modules appear here when enabled for your company. Unused domains stay hidden.
        </Text>
      </ScreenScroll>
    </ProductScreenShell>
  );
}
