import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { FileTextIcon } from '@/assets/icons';
import { Button, Text } from '@/components/ui';
import {
  useDocumentGenerationJobsRealtime,
  useSession,
  useWorkOrderDocumentsRealtime,
} from '@/hooks';
import { printWorkOrderDocument, shareWorkOrderDocument } from '@/lib/documents/document-file-actions';
import { resolveApplicableDocumentSlugs } from '@/lib/documents/document-policy';
import { DOCUMENT_BY_SLUG } from '@/types/document';
import type { DocumentSlug } from '@/types/document';
import type { WorkOrder } from '@/types/work-order';
import { haptics } from '@/theme';

import { wo } from '../theme/wo-visual';

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
      setError(nextError instanceof Error ? nextError.message : 'Could not complete the operation');
    } finally {
      setBusyKey(null);
    }
  };

  if (definitions.length === 0) {
    return (
      <View style={{ gap: 12 }}>
        <View style={{ gap: 4 }}>
          <Text variant="body" style={{ fontSize: 15, fontWeight: '600', letterSpacing: -0.2 }}>
            Documents
          </Text>
          <Text variant="caption" color="muted" style={{ fontSize: 12, lineHeight: 16 }}>
            Share or print a PDF for the customer. If it doesn't exist yet, we'll generate it when opened.
          </Text>
        </View>
        <View
          style={{
            borderRadius: wo.radiusSm,
            borderWidth: wo.rule,
            borderColor: colors.border,
            borderStyle: 'dashed',
            backgroundColor: colors.card,
            padding: 16,
          }}
        >
          <Text variant="caption" color="muted" style={{ textAlign: 'center', fontSize: 13 }}>
            No customer-facing PDFs for the order's current status.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 4 }}>
        <Text variant="body" style={{ fontSize: 15, fontWeight: '600', letterSpacing: -0.2 }}>
          Documents
        </Text>
        <Text variant="caption" color="muted" style={{ fontSize: 12, lineHeight: 16 }}>
          Share or print a PDF for the customer. If it doesn't exist yet, we'll generate it when opened.
        </Text>
      </View>

      {isGenerating ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderRadius: wo.radiusSm,
            borderWidth: wo.rule,
            borderColor: colors.border,
            backgroundColor: colors.secondary,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <ActivityIndicator size="small" color={colors.primary} />
          <Text variant="caption" style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
            PDFs generating in the background…
          </Text>
        </View>
      ) : null}

      {error ? (
        <View
          style={{
            borderRadius: wo.radiusSm,
            borderWidth: wo.rule,
            borderColor: colors.border,
            backgroundColor: colors.secondary,
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
          const rowBusy = busyKey !== null;

          return (
            <View
              key={definition.slug}
              style={{
                borderRadius: wo.radiusSm,
                borderWidth: wo.rule,
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
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.secondary,
                  }}
                >
                  <FileTextIcon size="sm" color={colors.primary} strokeWidth={1.5} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text
                      variant="body"
                      style={{ fontSize: 15, fontWeight: '600', letterSpacing: -0.2, flexShrink: 1 }}
                    >
                      {definition.title}
                    </Text>
                    <Text
                      variant="caption2"
                      style={{
                        fontWeight: '600',
                        letterSpacing: -0.08,
                        color: isReady
                          ? colors.success
                          : isPending
                            ? colors.primary
                            : colors.mutedForeground,
                      }}
                    >
                      {isReady ? 'Ready' : isPending ? 'Generating' : 'On request'}
                    </Text>
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
                <Button
                  native={false}
                  size="sm"
                  style={{ flex: 1 }}
                  loading={busyKey === shareKey}
                  disabled={rowBusy && busyKey !== shareKey}
                  onPress={() => void runAction(definition.slug, 'share')}
                >
                  Share
                </Button>
                <Button
                  native={false}
                  variant="secondary"
                  size="sm"
                  style={{ flex: 1 }}
                  loading={busyKey === printKey}
                  disabled={rowBusy && busyKey !== printKey}
                  onPress={() => void runAction(definition.slug, 'print')}
                >
                  Print
                </Button>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
