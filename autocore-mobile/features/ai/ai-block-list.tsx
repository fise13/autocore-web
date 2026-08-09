import { View } from 'react-native';

import { CollectionRow, ListSection } from '@/components/ui/collection';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/hooks/use-theme';

import type { AiUiBlock } from './ai-ui-blocks';

type Props = {
  blocks: AiUiBlock[];
  onNavigate: (href: string) => void;
};

export function AiBlockList({ blocks, onNavigate }: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: tokens.space.stack }}>
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;

        if (block.type === 'text') {
          return (
            <Text
              key={key}
              variant="body"
              style={{
                paddingHorizontal: tokens.space.screenX,
                color: colors.foreground,
              }}
            >
              {block.body}
            </Text>
          );
        }

        if (block.type === 'metric') {
          return (
            <View
              key={key}
              style={{
                marginHorizontal: tokens.space.screenX,
                padding: tokens.space.stack,
                backgroundColor: colors.card,
                borderRadius: tokens.radius.group,
                borderWidth: tokens.control.hairline,
                borderColor: colors.border,
              }}
            >
              <Text variant="sectionLabel" color="muted">
                {block.label}
              </Text>
              <Text variant="metric" style={{ marginTop: 4 }}>
                {block.value}
              </Text>
              {block.delta ? (
                <Text variant="footnote" color="muted" style={{ marginTop: 2 }}>
                  {block.delta}
                </Text>
              ) : null}
            </View>
          );
        }

        if (block.type === 'timeline') {
          return (
            <ListSection key={key} title={block.title}>
              {block.items.map((item) => (
                <CollectionRow
                  key={item.id}
                  title={item.title}
                  subtitle={item.meta}
                  showChevron={false}
                />
              ))}
            </ListSection>
          );
        }

        if (block.type === 'objectCard') {
          return (
            <ListSection key={key} title={block.objectType}>
              <CollectionRow
                title={block.title}
                subtitle={block.subtitle}
                onPress={() => onNavigate(block.href)}
              />
            </ListSection>
          );
        }

        if (block.type === 'confirmation') {
          return (
            <View
              key={key}
              style={{
                marginHorizontal: tokens.space.screenX,
                padding: tokens.space.stack,
                backgroundColor: colors.card,
                borderRadius: tokens.radius.group,
                borderWidth: tokens.control.hairline,
                borderColor: colors.border,
                gap: tokens.space.inline,
              }}
            >
              <Text variant="headline">{block.title}</Text>
              <Text variant="body" color="muted">
                {block.body}
              </Text>
              <Button native={false} onPress={() => onNavigate(block.href)}>
                {block.confirmLabel}
              </Button>
            </View>
          );
        }

        if (block.type === 'action') {
          return (
            <View
              key={key}
              style={{ paddingHorizontal: tokens.space.screenX, marginTop: tokens.space.inline }}
            >
              <Button
                native={false}
                variant={block.primary ? 'default' : 'outline'}
                onPress={() => onNavigate(block.href)}
              >
                {block.label}
              </Button>
            </View>
          );
        }

        return null;
      })}
    </View>
  );
}
