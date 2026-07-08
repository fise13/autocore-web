import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { FileTextIcon, PrinterIcon, Share2Icon } from '@/assets/icons';
import { ActionIconButton, Text } from '@/components/ui';
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
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const definitions = useMemo(() => {
    const slugs = resolveApplicableDocumentSlugs(order);
    return slugs.map((slug) => DOCUMENT_BY_SLUG[slug]).filter(Boolean);
  }, [order]);

  const runAction = async (slug: DocumentSlug, action: DocumentAction) => {
    const key = `${slug}:${action}`;
    setBusyKey(key);
    setError(null);
    haptics.light();

    try {
      if (action === 'share') {
        await shareWorkOrderDocument(slug, order.id, order.number);
      } else {
        await printWorkOrderDocument(slug, order.id, order.number);
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
          Поделитесь или распечатайте PDF через сервер AutoCore.
        </Text>
      </View>

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
          <Text variant="caption" style={{ fontSize: 12, color: colors.primary }}>
            {error}
          </Text>
        </View>
      ) : null}

      <View
        style={{
          borderWidth: ordersLayout.hairline,
          borderColor: colors.border,
          backgroundColor: colors.card,
          overflow: 'hidden',
        }}
      >
        {definitions.map((definition, index) => (
          <View
            key={definition.slug}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderTopWidth: index === 0 ? 0 : ordersLayout.hairline,
              borderTopColor: colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: toneBackground(colors.primary, 0.1),
                  marginTop: 1,
                }}
              >
                <FileTextIcon size="sm" color={colors.primary} strokeWidth={1.85} />
              </View>

              <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <Text variant="body" style={{ fontSize: 14, fontWeight: '600' }}>
                  {definition.title}
                </Text>
                <Text variant="caption" color="muted" style={{ fontSize: 12 }}>
                  {definition.description}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                {(['share', 'print'] as const).map((action) => {
                  const key = `${definition.slug}:${action}`;
                  const busy = busyKey === key;
                  const Icon = action === 'share' ? Share2Icon : PrinterIcon;
                  const label = action === 'share' ? 'Поделиться' : 'Печать';

                  return (
                    <ActionIconButton
                      key={action}
                      icon={Icon}
                      accessibilityLabel={`${label}: ${definition.title}`}
                      loading={busy}
                      disabled={busyKey !== null && !busy}
                      onPress={() => void runAction(definition.slug, action)}
                    />
                  );
                })}
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};
