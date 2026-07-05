import { useRouter } from 'expo-router';
import { View } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { FadeInUp, FadeOut } from 'react-native-reanimated';

import { ListGroup, Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks';
import { rhythm, screenMotion } from '@/theme';

import { searchTimeline, useSearchEnter } from '../animation';
import {
  openSearchResult,
  type AddToOrderHandlers,
  type MotorActionHandlers,
} from '../lib/open-result';
import { searchLayout } from '../layout';
import type { SearchEmptyActionId } from './search-empty-state';
import type { SearchResultGroup, SearchResultItem } from '../types';
import { SearchEmptyState } from './search-empty-state';
import { SearchGroupHeader } from './search-group-header';
import { SearchResultRow } from './search-result-row';

type SearchResultsProps = {
  query: string;
  groups: SearchResultGroup[];
  onEmptyAction?: (action: SearchEmptyActionId) => void;
  addToOrder: AddToOrderHandlers;
  motorActions?: MotorActionHandlers;
};

function pluralResults(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} результат`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${count} результата`;
  return `${count} результатов`;
}

function ResultGroup({
  group,
  groupIndex,
  query,
  onItemPress,
}: {
  group: SearchResultGroup;
  groupIndex: number;
  query: string;
  onItemPress: (item: SearchResultItem) => void;
}) {
  const delay = searchTimeline.resultGroup + groupIndex * 60;

  return (
    <View style={{ gap: rhythm.tight }}>
      <SearchGroupHeader title={group.title} count={group.items.length} delay={delay} />
      <ListGroup>
        {group.items.map((item, index) => (
          <SearchResultRow
            key={item.id}
            item={item}
            query={query}
            index={groupIndex * 6 + index}
            onPress={() => onItemPress(item)}
          />
        ))}
      </ListGroup>
    </View>
  );
}

export function SearchResults({
  query,
  groups,
  onEmptyAction,
  addToOrder,
  motorActions,
}: SearchResultsProps) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const summaryStyle = useSearchEnter({ delay: searchTimeline.results, translateY: 4, duration: 220 });

  const totalCount = groups.reduce((sum, group) => sum + group.items.length, 0);

  if (groups.length === 0) {
    return <SearchEmptyState query={query} onAction={onEmptyAction} />;
  }

  const entering =
    reduced || !screenMotion.enabled ? undefined : FadeInUp.duration(screenMotion.duration);
  const exiting =
    reduced || !screenMotion.enabled ? undefined : FadeOut.duration(screenMotion.duration);

  const handleItem = (item: SearchResultItem) => {
    void openSearchResult(item, router, addToOrder, motorActions);
  };

  return (
    <Reanimated.View
      key={`${query}-${groups.length}`}
      entering={entering}
      exiting={exiting}
      style={{ gap: rhythm.section, paddingTop: rhythm.tight }}
    >
      {query ? (
        <Reanimated.View style={[{ paddingHorizontal: searchLayout.pad }, summaryStyle]}>
          <Text variant="meta" color="muted">
            {pluralResults(totalCount)}
            {query ? ` по «${query}»` : ''}
          </Text>
        </Reanimated.View>
      ) : null}

      {groups.map((group, index) => (
        <ResultGroup
          key={group.id}
          group={group}
          groupIndex={index}
          query={query}
          onItemPress={handleItem}
        />
      ))}
    </Reanimated.View>
  );
}
