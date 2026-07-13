import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { FileTextIcon, Loader2Icon, PrinterIcon, Share2Icon } from '@/assets/icons';
import { ActionIconButton, Text } from '@/components/ui';
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
    success: string;
  };
};

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
    haptics.light();

    const cachedDownloadUrl = documentsBySlug.get(slug)?.downloadUrl;

    try {
      if (action === 'share') {
        await shareWorkOrderDocument(slug, order.id, order.number, cachedDownloadUrl);
      } else {
        await printWorkOrderDocument(slug, order.id, order.number, cachedDownloadUrl);
      }
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
        <Text variant="caption" color="muted" style={{ fontSize: 12 }}>
          PDF формируются автоматически и открываются из сохранённой копии.
        </Text>
      </View>

      {isGenerating ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderWidth: ordersLayout.hairline,
            borderColor: colors.border,
            backgroundColor: toneBackground(colors.primary, 0.06),
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <Loader2Icon size="sm" color={colors.primary} />
          <Text variant="caption" style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
            PDF формируются…
          </Text>
        </View>
      ) : null}

      {error ? (
        <View
          style={{
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

      <View style={{ gap: 8 }}>
        {definitions.map((definition) => {
          const persisted = documentsBySlug.get(definition.slug);
          const isReady = Boolean(persisted?.downloadUrl);
          const isPending =
            !isReady &&
            (isGenerating
              ? latestJob?.requestedSlugs.includes(definition.slug)
              : !latestJob?.completedSlugs.includes(definition.slug));

          return (
            <View
              key={definition.slug}
              style={{
                borderWidth: ordersLayout.hairline,
                borderColor: colors.border,
                backgroundColor: colors.card,
                paddingHorizontal: 14,
                paddingVertical: 12,
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: toneBackground(colors.primary, 0.1),
                  }}
                >
                  <FileTextIcon size="sm" color={colors.primary} strokeWidth={1.85} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text variant="body" style={{ fontSize: 14, fontWeight: '600', flexShrink: 1 }}>
                      {definition.title}
                    </Text>
                    {isPending ? (
                      <Text variant="caption" color="muted" style={{ fontSize: 11, fontWeight: '600' }}>
                        формируется…
                      </Text>
                    ) : isReady ? (
                      <Text variant="caption" style={{ fontSize: 11, fontWeight: '600', color: colors.success }}>
                        готов
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="caption" color="muted" numberOfLines={2} style={{ fontSize: 12 }}>
                    {definition.description}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                <ActionIconButton
                  accessibilityLabel={`Поделиться ${definition.title}`}
                  icon={Share2Icon}
                  disabled={!isReady || busyKey !== null}
                  loading={busyKey === `${definition.slug}:share`}
                  onPress={() => void runAction(definition.slug, 'share')}
                />
                <ActionIconButton
                  accessibilityLabel={`Печать ${definition.title}`}
                  icon={PrinterIcon}
                  disabled={!isReady || busyKey !== null}
                  loading={busyKey === `${definition.slug}:print`}
                  onPress={() => void runAction(definition.slug, 'print')}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
