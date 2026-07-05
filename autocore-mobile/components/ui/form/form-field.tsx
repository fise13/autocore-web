import { type ReactNode } from 'react';
import { View } from 'react-native';

import { form } from '@/theme/form';

import { FormHelper, FormLabel } from './form-label';

type FormFieldProps = {
  label?: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  success?: string;
  children: ReactNode;
};

export function FormField({ label, required, helperText, error, success, children }: FormFieldProps) {
  return (
    <View style={{ gap: form.labelGap, width: '100%' }}>
      {label ? <FormLabel required={required}>{label}</FormLabel> : null}
      {children}
      {error ? <FormHelper tone="error">{error}</FormHelper> : null}
      {!error && success ? <FormHelper tone="success">{success}</FormHelper> : null}
      {!error && !success && helperText ? <FormHelper>{helperText}</FormHelper> : null}
    </View>
  );
}
