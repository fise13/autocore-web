import { type ReactNode } from 'react';
import { View } from 'react-native';

import { form } from '@/theme/form';

type FormStackProps = {
  children: ReactNode;
  gap?: number;
};

export function FormStack({ children, gap = form.fieldGap }: FormStackProps) {
  return <View style={{ gap, width: '100%' }}>{children}</View>;
}
