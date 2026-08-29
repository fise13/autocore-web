import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { getFloatingTabBarOffset } from '@/lib/navigation/floating-tab-bar-inset';
import { tokens } from '@/theme/tokens';

import { PlaygroundAiBubble } from './playground-ai-bubble';
import { PlaygroundDock } from './playground-dock';
import type { PlaygroundTabId } from './playground-types';

const PHONE_W = 390;
const PHONE_H = 844;

const SCENES: Record<
  PlaygroundTabId,
  { kicker: string; title: string; cards: Array<{ label: string; value: string }> }
> = {
  home: {
    kicker: 'Today',
    title: 'Yard is quiet. Tap +.',
    cards: [
      { label: 'Incoming engines', value: '4 waiting' },
      { label: 'Open orders', value: 'WO-1042' },
      { label: 'Cash this week', value: '€12.4k' },
    ],
  },
  work: {
    kicker: 'Work',
    title: 'Intake, orders, warehouse.',
    cards: [
      { label: 'Photograph', value: '2 engines' },
      { label: 'Pick list', value: 'Aisle B' },
      { label: 'QC hold', value: 'EJ251' },
    ],
  },
  finance: {
    kicker: 'Finance',
    title: 'Money stays in the dock.',
    cards: [
      { label: 'Ledger', value: 'Today' },
      { label: 'Transfer', value: 'Cash → Bank' },
      { label: 'Margin', value: 'Donor 18' },
    ],
  },
  settings: {
    kicker: 'Settings',
    title: 'Lab only. No account.',
    cards: [
      { label: 'Company', value: '—' },
      { label: 'Team', value: '—' },
      { label: 'Billing', value: 'Bypassed' },
    ],
  },
};

function Scene({
  tab,
  topInset,
  bottomInset,
}: {
  tab: PlaygroundTabId;
  topInset: number;
  bottomInset: number;
}) {
  const { colors, isDark } = useTheme();
  const scene = SCENES[tab];

  return (
    <View style={[styles.scene, { paddingTop: topInset + 12, paddingBottom: bottomInset + 16 }]}>
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? ['#1c2230', '#12151c', '#0c0d10']
            : ['#dce4f0', '#eef1f5', '#f4f2ec']
        }
        locations={[0, 0.46, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          styles.bloom,
          { backgroundColor: isDark ? 'rgba(90, 140, 220, 0.18)' : 'rgba(255, 255, 255, 0.7)' },
        ]}
      />

      <Text variant="caption2" color="muted" style={styles.lab}>
        Playground · no sign-in
      </Text>
      <Text variant="caption1" color="muted" style={{ marginTop: 18 }}>
        {scene.kicker}
      </Text>
      <Text
        variant="title2"
        style={{
          marginTop: 4,
          letterSpacing: -0.6,
          color: colors.foreground,
        }}
      >
        {scene.title}
      </Text>

      <View style={styles.cards}>
        {scene.cards.map((card) => (
          <View
            key={card.label}
            style={[
              styles.card,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.62)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            <Text variant="caption1" color="muted">
              {card.label}
            </Text>
            <Text variant="headline" style={{ marginTop: 4, letterSpacing: -0.3 }}>
              {card.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function PlaygroundScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [tab, setTab] = useState<PlaygroundTabId>('home');
  const [askOpen, setAskOpen] = useState(false);

  const framed = Platform.OS === 'web' && width > 480;
  const stageWidth = framed ? PHONE_W : width;
  const stageHeight = framed ? Math.min(PHONE_H, height - 40) : height;
  const topInset = framed ? 18 : insets.top;
  const bottomInset = getFloatingTabBarOffset(framed ? 0 : insets.bottom);

  const onTabPress = useCallback((next: PlaygroundTabId) => {
    setTab(next);
  }, []);

  const toggleAsk = useCallback(() => {
    setAskOpen((open) => !open);
  }, []);

  const stage = (
    <View style={[styles.phoneInner, { width: stageWidth, height: stageHeight }]}>
      <Scene tab={tab} topInset={topInset} bottomInset={bottomInset} />
      <PlaygroundDock
        activeTab={tab}
        actionOpen={askOpen}
        flushBottom={framed}
        onTabPress={onTabPress}
        onActionPress={toggleAsk}
      />
      <PlaygroundAiBubble
        open={askOpen}
        flushBottom={framed}
        onClose={() => setAskOpen(false)}
      />
      {__DEV__ ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to sign in"
          onPress={() => router.replace('/(auth)/login')}
          style={[styles.back, { top: topInset }]}
        >
          <Text variant="caption2" color="muted">
            Sign in
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  if (!framed) {
    return <View style={[styles.fill, { backgroundColor: colors.background }]}>{stage}</View>;
  }

  return (
    <View style={[styles.webStage, { backgroundColor: isDark ? '#07080a' : '#e7e4dc' }]}>
      <View
        style={[
          styles.bezel,
          {
            width: stageWidth,
            height: stageHeight,
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
            backgroundColor: colors.background,
          },
        ]}
      >
        {stage}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  webStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bezel: {
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 40,
  },
  phoneInner: {
    overflow: 'hidden',
  },
  scene: {
    flex: 1,
    paddingHorizontal: tokens.space.screenX,
  },
  lab: {
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  bloom: {
    position: 'absolute',
    top: -40,
    left: 40,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  cards: {
    marginTop: 28,
    gap: 10,
  },
  card: {
    borderRadius: tokens.radius.modal,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  back: {
    position: 'absolute',
    right: 16,
    zIndex: 1100,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
});
