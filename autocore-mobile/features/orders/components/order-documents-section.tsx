import { useMemo, useState, type ComponentType } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { FileTextIcon, PrinterIcon, Share2Icon } from '@/assets/icons';
import type { IconProps } from '@/assets/icons/create-icon';
import { Text } from '@/components/ui';
import {
  useDocumentGenerationJobsRealtime,
  useSession,
  useWorkOrderDocumentsRealtime,
} from '@/hooks';
import { printWorkOrderDocument, shareWorkOrderDocument } from '@/lib/documents/document-file-actions';
import { resolveApplicableDocumentSlugs } from '@/lib/documents/document-policy';
import { haptics } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import { DOCUMENT_BY_SLUG } from '@/types/document';
import type { DocumentSlug } from '@/types/document';
import type { WorkOrder } from '@/types/work-order';

import { ordersLayout } from '../layout';

type DocumentAction = 'share' | 'print';

type OrderDocumentsSectionProps = {
  order: WorkOrder;
  colors: {
    border: string;
    card: string;
    foreground: string;
    mutedForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    success: string;
  };
};

function DocumentActionButton({
  label,
  icon: Icon,
  primary,
  loading,
  disabled,
  onPress,
  colors,
}: {
  label: string;
  icon: ComponentType<IconProps>;
  primary?: boolean;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
  colors: OrderDocumentsSectionProps['colors'];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        haptics.light();
        onPress();
      }}
      style={{
        flex: 1,
        minHeight: 44,
        borderRadius: 12,
        borderWidth: primary ? 0 : ordersLayout.hairline,
        borderColor: colors.border,
        backgroundColor: primary ? colors.primary : colors.secondary,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: disabled && !loading ? 0.45 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={primary ? colors.primaryForeground : colors.foreground}
        />
      ) : (
        <Icon
          size="sm"
          color={primary ? colors.primaryForeground : colors.foreground}
          strokeWidth={2}
        />
      )}
      <Text
        variant="caption"
        style={{
          fontSize: 13,
          fontWeight: '600',
          letterSpacing: -0.1,
          color: primary ? colors.primaryForeground : colors.foreground,
        }}
      >
        {loading ? 'Секунду…' : label}
      </Text>
    </Pressable>
  );
}

export function OrderDocumentsSection({ order, colors }: OrderDocumentsSectionProps) {
  const { companyId } = useSession();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { documentsBySlug } = useWorkOrderDocumentsRealtime(companyId, order.id);
  const { latestJob, isGenerating } = useDocumentGenerationJobsRealtime(companyId, order.id);

  const definitions = useMemo(() => {
    const slugs = resolveApplicableDocumentSlugs(order);
    return slugs.map((slug) => DOCUMENT_BY_SLUG[slug]).filter(Boolean);
  }, [order]);

  const runAction = async (slug: DocumentSlug, action: DocumentAction) => {
    const key = `${slug}:${action}`;
    setBusyKey(key);
    setError(null);

    const cachedDownloadUrl = documentsBySlug.get(slug)?.downloadUrl;

    try {
      if (action === 'share') {
        await shareWorkOrderDocument(slug, order.id, order.number, cachedDownloadUrl);
      } else {
        await printWorkOrderDocument(slug, order.id, order.number, cachedDownloadUrl);
      }
      haptics.success();
    } catch (nextError) {
      haptics.warning();
      setError(nextError instanceof Error ? nextError.message : 'Не удалось выполнить операцию');
    } finally {
      setBusyKey(null);
    }
  };

  if (definitions.length === 0) {
    return (
      <View style={{ gap: 8 }}>
        <Text variant="body" style={{ fontSize: 15, fontWeight: '600', letterSpacing: -0.2 }}>
          Документы
        </Text>
        <View
          style={{
            borderRadius: ordersLayout.radius,
            borderWidth: ordersLayout.hairline,
            borderColor: colors.border,
            borderStyle: 'dashed',
            backgroundColor: colors.card,
            padding: 16,
          }}
        >
          <Text variant="caption" color="muted" style={{ textAlign: 'center', fontSize: 13 }}>
            Для текущего статуса заказа нет клиентских PDF.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 4 }}>
        <Text variant="body" style={{ fontSize: 15, fontWeight: '600', letterSpacing: -0.2 }}>
          Документы
        </Text>
        <Text variant="caption" color="muted" style={{ fontSize: 12, lineHeight: 16 }}>
          Поделиться или распечатать PDF клиенту. Если файла ещё нет — сформируем при открытии.
        </Text>
      </View>

      {isGenerating ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderRadius: 12,
            borderWidth: ordersLayout.hairline,
            borderColor: colors.border,
            backgroundColor: toneBackground(colors.primary, 0.06),
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <ActivityIndicator size="small" color={colors.primary} />
          <Text variant="caption" style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
            PDF формируются в фоне…
          </Text>
        </View>
      ) : null}

      {error ? (
        <View
          style={{
            borderRadius: 12,
            borderWidth: ordersLayout.hairline,
            borderColor: colors.border,
            backgroundColor: toneBackground(colors.primary, 0.06),
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <Text variant="caption" style={{ color: colors.foreground, fontSize: 12 }}>
            {error}
          </Text>
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        {definitions.map((definition) => {
          const persisted = documentsBySlug.get(definition.slug);
          const isReady = Boolean(persisted?.downloadUrl);
          const isPending =
            !isReady &&
            (isGenerating
              ? latestJob?.requestedSlugs.includes(definition.slug)
              : !latestJob?.completedSlugs.includes(definition.slug));
          const shareKey = `${definition.slug}:share`;
          const printKey = `${definition.slug}:print`;

          return (
            <View
              key={definition.slug}
              style={{
                borderRadius: ordersLayout.radius,
                borderWidth: ordersLayout.hairline,
                borderColor: colors.border,
                backgroundColor: colors.card,
                paddingHorizontal: 14,
                paddingVertical: 14,
                gap: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 11,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: toneBackground(colors.primary, 0.1),
                  }}
                >
                  <FileTextIcon size="sm" color={colors.primary} strokeWidth={1.85} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text
                      variant="body"
                      style={{ fontSize: 15, fontWeight: '600', letterSpacing: -0.2, flexShrink: 1 }}
                    >
                      {definition.title}
                    </Text>
                    <View
                      style={{
                        borderRadius: 999,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        backgroundColor: isReady
                          ? toneBackground(colors.success, 0.14)
                          : isPending
                            ? toneBackground(colors.primary, 0.1)
                            : toneBackground(colors.mutedForeground, 0.12),
                      }}
                    >
                      <Text
                        variant="caption"
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          letterSpacing: -0.1,
                          color: isReady
                            ? colors.success
                            : isPending
                              ? colors.primary
                              : colors.mutedForeground,
                        }}
                      >
                        {isReady ? 'Готов' : isPending ? 'Формируется' : 'По запросу'}
                      </Text>
                    </View>
                  </View>
                  <Text
                    variant="caption"
                    color="muted"
                    numberOfLines={2}
                    style={{ fontSize: 12, lineHeight: 16 }}
                  >
                    {definition.description}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <DocumentActionButton
                  label="Поделиться"
                  icon={Share2Icon}
                  primary
                  loading={busyKey === shareKey}
                  disabled={busyKey !== null && busyKey !== shareKey}
                  colors={colors}
                  onPress={() => void runAction(definition.slug, 'share')}
                />
                <DocumentActionButton
                  label="Печать"
                  icon={PrinterIcon}
                  loading={busyKey === printKey}
                  disabled={busyKey !== null && busyKey !== printKey}
                  colors={colors}
                  onPress={() => void runAction(definition.slug, 'print')}
                />
              </View>
            </View>
          );        })}
      </View>
    </View>
  );
}
