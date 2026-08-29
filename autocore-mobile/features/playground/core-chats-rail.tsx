import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LOGIN_LOCKUP } from '@/authentication/auth-brand-mark';
import {
  MessageSquarePlusIcon,
  PencilIcon,
  SearchIcon,
  SettingsIcon,
  XIcon,
} from '@/assets/icons';
import { Text } from '@/components/ui/text';
import { useDesignLanguage } from '@/hooks';
import { haptics } from '@/theme/haptics';
import { tokens } from '@/theme/tokens';

import { useCoreChatStore } from './core-chat-store';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CoreChatsRail({ open, onClose }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, coreChat } = useDesignLanguage();
  const searchRef = useRef<TextInput>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');

  const chats = useCoreChatStore((s) => s.chats);
  const activeId = useCoreChatStore((s) => s.activeId);
  const selectChat = useCoreChatStore((s) => s.selectChat);
  const newChat = useCoreChatStore((s) => s.newChat);
  const renameChat = useCoreChatStore((s) => s.renameChat);

  useEffect(() => {
    if (open) return;
    setSearching(false);
    setQuery('');
  }, [open]);

  const visibleChats = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return chats;
    return chats.filter((chat) => chat.title.toLowerCase().includes(needle));
  }, [chats, query]);

  const openSearch = () => {
    haptics.selection();
    setSearching(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const closeSearch = () => {
    haptics.light();
    setSearching(false);
    setQuery('');
  };

  const startChat = () => {
    haptics.selection();
    newChat();
    onClose();
  };

  const openChat = (id: string) => {
    haptics.selection();
    selectChat(id);
    onClose();
  };

  const rename = (id: string, current: string) => {
    haptics.light();
    if (Platform.OS !== 'ios') return;
    Alert.prompt(
      'Rename chat',
      undefined,
      (value) => {
        if (value?.trim()) renameChat(id, value);
      },
      'plain-text',
      current,
    );
  };

  return (
    <View
      style={[
        styles.rail,
        {
          paddingTop: insets.top + 6,
          paddingBottom: insets.bottom + 10,
        },
      ]}
    >
      <View style={styles.header}>
        {searching ? (
          <View style={[styles.searchField, { backgroundColor: colors.secondary }]}>
            <SearchIcon size={18} color={coreChat.muted} />
            <TextInput
              ref={searchRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Search chats"
              placeholderTextColor={coreChat.muted}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              style={[styles.searchInput, { color: coreChat.ink }]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close search"
              onPress={closeSearch}
              hitSlop={8}
              style={styles.searchClear}
            >
              <XIcon size={16} color={coreChat.muted} />
            </Pressable>
          </View>
        ) : (
          <>
            <RNText
              allowFontScaling={false}
              style={{
                fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
                fontSize: LOGIN_LOCKUP.fontSize,
                lineHeight: LOGIN_LOCKUP.fontSize + 2,
                fontWeight: LOGIN_LOCKUP.fontWeight,
                letterSpacing: LOGIN_LOCKUP.letterSpacing,
                color: coreChat.ink,
                ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
              }}
            >
              AutoCore
            </RNText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search chats"
              onPress={openSearch}
              style={[
                styles.circleBtn,
                { backgroundColor: colors.secondary },
              ]}
            >
              <SearchIcon size={18} color={coreChat.ink} />
            </Pressable>
          </>
        )}
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {visibleChats.length > 0 ? (
          <Text
            variant="footnote"
            style={[styles.section, { color: coreChat.muted }]}
          >
            Recent
          </Text>
        ) : null}

        {visibleChats.map((chat) => {
          const active = chat.id === activeId;
          return (
            <Pressable
              key={chat.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => openChat(chat.id)}
              style={[
                styles.chatRow,
                active ? { backgroundColor: colors.secondary } : null,
              ]}
            >
              <Text
                variant="body"
                numberOfLines={1}
                style={[styles.chatTitle, { color: coreChat.ink }]}
              >
                {chat.title}
              </Text>
              {active ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Rename chat"
                  onPress={() => rename(chat.id, chat.title)}
                  hitSlop={8}
                  style={styles.chatEdit}
                >
                  <PencilIcon size={16} color={coreChat.ink} strokeWidth={1.8} />
                </Pressable>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New chat"
          onPress={startChat}
          style={[styles.chatPill, { backgroundColor: coreChat.ink }]}
        >
          <MessageSquarePlusIcon size={18} color={coreChat.voiceInk} strokeWidth={1.8} />
          <Text variant="headline" style={{ color: coreChat.voiceInk }}>
            Chat
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Playground"
          onPress={() => {
            haptics.light();
            onClose();
            router.back();
          }}
          style={[styles.circleBtn, { backgroundColor: colors.secondary }]}
        >
          <SettingsIcon size={20} color={coreChat.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flex: 1,
    paddingHorizontal: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    borderRadius: tokens.radius.full,
    paddingLeft: 12,
    paddingRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    paddingVertical: 0,
  },
  searchClear: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 12,
  },
  section: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 8,
    fontWeight: '600',
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: tokens.radius.group,
  },
  chatTitle: {
    flex: 1,
  },
  chatEdit: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    paddingHorizontal: 2,
  },
  chatPill: {
    flex: 1,
    height: 52,
    borderRadius: tokens.radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
