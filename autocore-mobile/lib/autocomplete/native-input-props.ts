import { Platform, type TextInputProps } from 'react-native';

import type { AutocompleteSourceId } from './types';

type NativeProps = Pick<
  TextInputProps,
  'autoComplete' | 'textContentType' | 'keyboardType' | 'autoCorrect' | 'spellCheck' | 'autoCapitalize'
> & {
  importantForAutofill?: 'auto' | 'no' | 'noExcludeDescendants' | 'yes' | 'yesExcludeDescendants';
};

const BASE: Record<AutocompleteSourceId, NativeProps> = {
  engineCode: {
    autoComplete: 'off',
    autoCorrect: false,
    spellCheck: false,
    autoCapitalize: 'characters',
  },
  manufacturer: {
    autoComplete: 'off',
    autoCorrect: false,
    spellCheck: false,
    autoCapitalize: 'words',
  },
  customer: {
    autoComplete: Platform.OS === 'android' ? 'name' : 'name',
    textContentType: 'name',
    autoCorrect: false,
    spellCheck: false,
    importantForAutofill: 'yes',
  },
  employee: {
    autoComplete: 'off',
    autoCorrect: false,
    spellCheck: false,
    autoCapitalize: 'words',
  },
  supplier: {
    autoComplete: 'off',
    autoCorrect: false,
    spellCheck: false,
  },
  warehouse: {
    autoComplete: 'off',
    autoCorrect: false,
    spellCheck: false,
  },
  category: {
    autoComplete: 'off',
    autoCorrect: false,
    spellCheck: false,
  },
  previousValue: {
    autoComplete: 'off',
    autoCorrect: false,
    spellCheck: false,
  },
  recent: {
    autoComplete: 'off',
    autoCorrect: false,
    spellCheck: false,
  },
};

export function getNativeInputProps(
  source: AutocompleteSourceId,
  context?: Record<string, string>,
): NativeProps {
  const props = { ...BASE[source] };

  if (source === 'customer' && context?.field === 'phone') {
    return {
      ...props,
      keyboardType: 'phone-pad',
      textContentType: 'telephoneNumber',
      autoComplete: Platform.OS === 'android' ? 'tel' : 'tel',
    };
  }

  if (context?.field === 'vin' || context?.field === 'licensePlate') {
    return {
      ...props,
      autoCapitalize: 'characters',
      autoCorrect: false,
      spellCheck: false,
    };
  }

  return props;
}
