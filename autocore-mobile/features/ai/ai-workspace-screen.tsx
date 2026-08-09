import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { SparklesIcon } from '@/assets/icons';
import { CollectionRow, ListSection } from '@/components/ui/collection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { ProductScreenShell, ScreenScroll } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { useShellModel } from '@/lib/shell/use-shell-model';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/hooks/use-theme';

import type { AiUiBlock } from './ai-ui-blocks';
import { AiBlockList } from './ai-block-list';
import { interpretAiPrompt } from './interpret-ai-prompt';

/**
 * Operational AI workspace — returns native Autocore UI blocks, not chat walls.
 */
export function AiWorkspaceScreen() {
  const { aiCapabilities } = useShellModel();
  const [prompt, setPrompt] = useState('');
  const [blocks, setBlocks] = useState<AiUiBlock[]>([]);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { colors } = useTheme();

  const runPrompt = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setBusy(true);
      setPrompt(trimmed);
      try {
        const next = await interpretAiPrompt(trimmed);
        setBlocks(next);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const examples = useMemo(() => aiCapabilities.slice(0, 5), [aiCapabilities]);

  return (
    <ProductScreenShell animateEnter={false}>
      <ScreenScroll tabBarInset keyboardShouldPersistTaps="handled">
        <PageHeader
          title="AI"
          subtitle="Ask Autocore — get objects, metrics, and actions"
        />

        <View
          style={{
            paddingHorizontal: tokens.space.screenX,
            gap: tokens.space.stack,
            marginBottom: tokens.space.section,
          }}
        >
          <Input
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Receive engine U398539…"
            autoCapitalize="sentences"
            returnKeyType="send"
            onSubmitEditing={() => void runPrompt(prompt)}
            editable={!busy}
          />
          <Button
            onPress={() => void runPrompt(prompt)}
            disabled={busy || !prompt.trim()}
            native={false}
            loading={busy}
          >
            Run
          </Button>
        </View>

        {blocks.length > 0 ? (
          <View style={{ marginBottom: tokens.space.section }}>
            <AiBlockList
              blocks={blocks}
              onNavigate={(href) => router.push(href as Href)}
            />
          </View>
        ) : (
          <ListSection title="Try">
            {examples.map((cap) => (
              <CollectionRow
                key={cap.id}
                title={cap.title}
                subtitle={cap.example}
                icon={SparklesIcon}
                onPress={() => void runPrompt(cap.example)}
              />
            ))}
          </ListSection>
        )}

        <Text
          variant="caption1"
          color="muted"
          style={{
            marginHorizontal: tokens.space.screenX,
            marginBottom: tokens.space.section,
            color: colors.mutedForeground,
          }}
        >
          AI returns structured Autocore surfaces — object cards, timelines, and
          confirmation actions — not walls of text.
        </Text>

        <Pressable
          onPress={() => router.push('/search' as Href)}
          style={{ paddingHorizontal: tokens.space.screenX, marginBottom: tokens.space.section }}
        >
          <Text variant="callout" style={{ color: colors.primary }}>
            Open search instead
          </Text>
        </Pressable>
      </ScreenScroll>
    </ProductScreenShell>
  );
}
