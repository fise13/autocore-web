import { useMemo } from 'react';

import { useRealtimeQuery } from '@/hooks/use-realtime-query';
import { isProductionCompanyId } from '@/lib/company-id';
import { motorRepository } from '@/services/firestore/motor-repository';
import type { MotorEntity } from '@/types/motor';

export function useMotorsRealtime(
  companyId: string | null | undefined,
  uid: string | null | undefined,
  enabled = true,
) {
  const active = Boolean(enabled && isProductionCompanyId(companyId) && uid?.trim());

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<MotorEntity[]>({
    queryKey: ['realtime', 'motors', companyId, uid],
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) => {
      if (!companyId || !uid) {
        onData([]);
        return () => undefined;
      }
      return motorRepository.subscribe(
        { uid, companyId, availability: 'available', includeDeleted: false },
        onData,
        (error) => onError({ message: error.message }),
      );
    },
  });

  const availableMotors = useMemo(
    () => data.filter((motor) => !motor.soldDate && (motor.status ?? 'available') === 'available'),
    [data],
  );

  return {
    motors: data,
    availableMotors,
    isBootstrapping: active ? isBootstrapping : false,
    errorMessage: active ? errorMessage : null,
    enabled: active,
  };
}
