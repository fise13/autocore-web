import { Linking } from 'react-native';

import { toast } from '@/components/ui';

/** Normalize and open a phone number. Returns false if nothing to dial. */
export async function openPhone(raw?: string | null): Promise<boolean> {
  const digits = (raw ?? '').replace(/[^\d+]/g, '');
  if (digits.length < 5) {
    toast({
      title: 'No phone number',
      description: 'This customer has no number on file.',
      variant: 'warning',
    });
    return false;
  }

  const url = `tel:${digits}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      toast({ title: 'Unable to place call', variant: 'destructive' });
      return false;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    toast({ title: 'Unable to place call', variant: 'destructive' });
    return false;
  }
}
