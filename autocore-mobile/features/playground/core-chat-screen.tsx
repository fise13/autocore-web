import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThinkingOrb } from 'expo-thinking-orbs';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ArrowUpIcon,
  CameraIcon,
  GlobeIcon,
  ImagesIcon,
  MessageSquarePlusIcon,
  MicIcon,
  PencilIcon,
  PlusIcon,
  XIcon,
} from '@/assets/icons';
import { Text } from '@/components/ui/text';
import { AiPendingDots } from '@/features/ai/components/ai-pending-dots';
import { useDesignLanguage, useReducedMotion } from '@/hooks';
import { haptics } from '@/theme/haptics';
import { tokens } from '@/theme/tokens';

import {
  pickCamera,
  pickPhotos,
  roomForAttachments,
} from './core-attachments';
import { CoreChatsDrawer } from './core-chats-drawer';
import { useCoreChatStore } from './core-chat-store';

const SHORTCUTS = [
  {
    id: 'photo',
    label: 'Create an image or sticker',
    prompt: 'Create a listing photo for the next incoming engine',
    Icon: ImagesIcon,
  },
  {
    id: 'write',
    label: 'Write or edit',
    prompt: 'Write or edit a work-order note',
    Icon: PencilIcon,
  },
  {
    id: 'search',
    label: 'Search Autocore',
    prompt: 'Find EJ251 engines in warehouse',
    Icon: GlobeIcon,
  },
] as const;

function TwoLineMenu({ color }: { color: string }) {
  return (
    <View style={styles.menuGlyph} accessibilityElementsHidden>
      <View style={[styles.menuLine, { backgroundColor: color }]} />
      <View style={[styles.menuLine, { width: 12, backgroundColor: color }]} />
    </View>
  );
}

export function CoreChatScreen() {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { scheme, coreChat, coreChatLayout } = useDesignLanguage();
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [drawer, setDrawer] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);

  const draft = useCoreChatStore((s) => s.draft);
  const setDraft = useCoreChatStore((s) => s.setDraft);
  const attachments = useCoreChatStore((s) => s.attachments);
  const addAttachments = useCoreChatStore((s) => s.addAttachments);
  const removeAttachment = useCoreChatStore((s) => s.removeAttachment);
  const pending = useCoreChatStore((s) => s.pending);
  const chats = useCoreChatStore((s) => s.chats);
  const activeId = useCoreChatStore((s) => s.activeId);
  const send = useCoreChatStore((s) => s.send);
  const newChat = useCoreChatStore((s) => s.newChat);
  const active = chats.find((chat) => chat.id === activeId) ?? null;
  const messages = active?.messages ?? [];
  const empty = messages.length === 0 && !pending;
  const composerReserve =
    coreChatLayout.composerMinHeight +
    18 +
    insets.bottom +
    coreChatLayout.composerLift +
    (attachments.length > 0 ? 64 : 0) +
    (attachOpen ? 108 : 0);
  const canSend = Boolean(draft.trim() || attachments.length > 0);

  useEffect(() => {
    if (drawer) setAttachOpen(false);
  }, [drawer]);

  useEffect(() => {
    if (empty) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: !reduced });
    });
  }, [empty, messages.length, pending, reduced]);

  const submit = (value = draft) => {
    if (pending || (!value.trim() && attachments.length === 0)) return;
    haptics.medium();
    setAttachOpen(false);
    send(value);
  };

  const openPhotos = async () => {
    haptics.selection();
    setAttachOpen(false);
    const picked = await pickPhotos(roomForAttachments(attachments.length));
    if (picked.length) addAttachments(picked);
  };

  const openCamera = async () => {
    haptics.selection();
    setAttachOpen(false);
    const shot = await pickCamera();
    if (shot) addAttachments([shot]);
  };

  return (
    <View style={[styles.root, coreChat.screen]}>
    <CoreChatsDrawer
      open={drawer}
      onOpen={() => setDrawer(true)}
      onClose={() => setDrawer(false)}
    >
    <View style={[styles.pane, { paddingTop: insets.top }]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chats"
          onPress={() => {
            Keyboard.dismiss();
            setAttachOpen(false);
            haptics.selection();
            setDrawer((open) => !open);
          }}
          style={[
            styles.roundBtn,
            coreChat.headerButton,
            {
              width: coreChatLayout.headerButton,
              height: coreChatLayout.headerButton,
              borderRadius: coreChatLayout.headerButton / 2,
            },
          ]}
        >
          <TwoLineMenu color={coreChat.ink} />
          {chats.length > 0 ? (
            <View style={[styles.notify, { backgroundColor: coreChat.notify }]} />
          ) : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New chat"
          onPress={() => {
            haptics.selection();
            newChat();
            inputRef.current?.focus();
          }}
          style={[
            styles.roundBtn,
            coreChat.headerButton,
            {
              width: coreChatLayout.headerButton,
              height: coreChatLayout.headerButton,
              borderRadius: coreChatLayout.headerButton / 2,
            },
          ]}
        >
          <MessageSquarePlusIcon size={20} color={coreChat.ink} />
        </Pressable>
      </View>

      <View style={[styles.body, { paddingBottom: composerReserve }]}>
        {empty && !drawer ? (
          <View style={[styles.shortcuts, { gap: coreChatLayout.shortcutGap }]}>
            {SHORTCUTS.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                onPress={() => {
                  haptics.selection();
                  setDraft(item.prompt);
                  inputRef.current?.focus();
                }}
                style={styles.shortcut}
              >
                <item.Icon size={18} color={coreChat.muted} strokeWidth={1.7} />
                <Text variant="body" style={[styles.shortcutLabel, { color: coreChat.ink }]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.thread}
            contentContainerStyle={styles.threadContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.row,
                  message.role === 'user' ? styles.rowUser : styles.rowAssistant,
                ]}
              >
                <View
                  style={
                    message.role === 'user'
                      ? [
                          styles.userPill,
                          coreChat.userBubble,
                          message.attachments?.length ? styles.userPillFiles : null,
                        ]
                      : styles.aiBubble
                  }
                >
                  {message.attachments?.length ? (
                    <View style={styles.msgFiles}>
                      {message.attachments.map((file) => (
                        <Image
                          key={file.id}
                          source={{ uri: file.uri }}
                          style={styles.msgThumb}
                        />
                      ))}
                    </View>
                  ) : null}
                  {message.text ? (
                    <Text variant="footnote" style={[styles.msgText, { color: coreChat.ink }]}>
                      {message.text}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
            {pending ? (
              <View style={styles.thinking}>
                {Platform.OS === 'web' ? (
                  <AiPendingDots />
                ) : (
                  <ThinkingOrb
                    state="working"
                    size={coreChatLayout.orbSize}
                    theme={scheme === 'dark' ? 'dark' : 'light'}
                    paused={reduced}
                    accessibilityLabel="Thinking"
                  />
                )}
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>
    </View>
    </CoreChatsDrawer>
    <KeyboardStickyView
      enabled={!drawer}
      pointerEvents={drawer ? 'none' : 'auto'}
      offset={{
        closed: -(insets.bottom + coreChatLayout.composerLift),
        opened: -coreChatLayout.keyboardGap,
      }}
      style={[styles.sticky, drawer ? styles.stickyHidden : null]}
    >
      <View style={[styles.composerWrap, coreChat.screen]}>
        {attachOpen ? (
          <View style={[styles.attachCard, coreChat.composer]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Photos"
              onPress={() => void openPhotos()}
              style={({ pressed }) => [styles.attachRow, pressed && styles.pressed]}
            >
              <ImagesIcon size={20} color={coreChat.ink} strokeWidth={1.8} />
              <Text variant="body" style={{ color: coreChat.ink }}>
                Photos
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Camera"
              onPress={() => void openCamera()}
              style={({ pressed }) => [styles.attachRow, pressed && styles.pressed]}
            >
              <CameraIcon size={20} color={coreChat.ink} strokeWidth={1.8} />
              <Text variant="body" style={{ color: coreChat.ink }}>
                Camera
              </Text>
            </Pressable>
          </View>
        ) : null}
        {attachments.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.attachStrip}
          >
            {attachments.map((file) => (
              <View key={file.id} style={styles.attachChip}>
                <Image source={{ uri: file.uri }} style={styles.attachThumb} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${file.name}`}
                  onPress={() => {
                    haptics.light();
                    removeAttachment(file.id);
                  }}
                  style={[styles.attachRemove, { backgroundColor: coreChat.ink }]}
                >
                  <XIcon size={10} color={coreChat.voiceInk} strokeWidth={2.4} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}
        <View
          style={[
            styles.pill,
            coreChat.composer,
            { minHeight: coreChatLayout.composerMinHeight },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={attachOpen ? 'Close attachments' : 'Add files'}
            onPress={() => {
              haptics.light();
              setAttachOpen((open) => !open);
            }}
            hitSlop={6}
            style={styles.pillIcon}
          >
            {attachOpen ? (
              <XIcon size={20} color={coreChat.ink} strokeWidth={1.8} />
            ) : (
              <PlusIcon size={22} color={coreChat.ink} strokeWidth={1.8} />
            )}
          </Pressable>
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask Core…"
            placeholderTextColor={coreChat.muted}
            autoCorrect
            autoCapitalize="sentences"
            blurOnSubmit={false}
            enablesReturnKeyAutomatically
            returnKeyType="send"
            onSubmitEditing={() => submit()}
            style={[styles.input, { color: coreChat.ink }]}
          />
          {canSend ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send"
              disabled={pending}
              onPress={() => submit()}
              style={[
                styles.send,
                coreChat.send,
                {
                  width: coreChatLayout.sendSize,
                  height: coreChatLayout.sendSize,
                  borderRadius: coreChatLayout.sendSize / 2,
                },
              ]}
            >
              <ArrowUpIcon size={16} color={coreChat.sendInk} strokeWidth={2.6} />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voice to text"
              onPress={() => {
                haptics.light();
                inputRef.current?.focus();
              }}
              hitSlop={6}
              style={styles.pillIcon}
            >
              <MicIcon size={20} color={coreChat.ink} strokeWidth={1.8} />
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  pane: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  roundBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  notify: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  menuGlyph: {
    width: 16,
    height: 10,
    justifyContent: 'space-between',
  },
  menuLine: {
    height: 1.6,
    width: 16,
    borderRadius: 1,
  },
  body: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  shortcuts: {
    paddingHorizontal: 22,
    paddingBottom: 18,
  },
  shortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  shortcutLabel: {
    fontSize: 17,
    letterSpacing: -0.2,
  },
  thread: {
    flex: 1,
  },
  threadContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 10,
  },
  row: {
    maxWidth: '88%',
  },
  rowUser: {
    alignSelf: 'flex-end',
  },
  rowAssistant: {
    alignSelf: 'flex-start',
  },
  userPill: {
    borderRadius: tokens.radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  userPillFiles: {
    borderRadius: tokens.radius.modal,
    padding: 6,
    gap: 6,
  },
  msgFiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  msgThumb: {
    width: 132,
    height: 132,
    borderRadius: tokens.radius.group,
  },
  attachCard: {
    borderRadius: tokens.radius.sheet,
    paddingVertical: 6,
    marginBottom: 8,
  },
  attachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  pressed: {
    opacity: tokens.opacity.pressed,
  },
  attachStrip: {
    gap: 8,
    paddingBottom: 10,
    paddingHorizontal: 2,
  },
  attachChip: {
    width: 56,
    height: 56,
  },
  attachThumb: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.group,
  },
  attachRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBubble: {
    paddingVertical: 4,
  },
  msgText: {
    lineHeight: 20,
  },
  thinking: {
    alignSelf: 'flex-start',
    marginLeft: 2,
    marginTop: 4,
  },
  sticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  stickyHidden: {
    opacity: 0,
  },
  composerWrap: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  pill: {
    flex: 1,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 6,
    paddingRight: 6,
  },
  pillIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    paddingVertical: 12,
  },
  send: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
});
