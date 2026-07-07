import { mobileApi } from '@/services/api/endpoints';
import { mobilePost } from '@/services/api/mobile-client';
import type { WorkOrderStatus } from '@/types/work-order';

type TransitionResponse = {
  order: {
    id: string;
    status: WorkOrderStatus;
  };
};

export async function transitionWorkOrder(orderId: string, status: WorkOrderStatus) {
  return mobilePost<TransitionResponse>(mobileApi.workOrderTransition(orderId), { status });
}

type ClaimResponse = {
  order: {
    id: string;
    number: string;
    status: WorkOrderStatus;
    assignedToMe: boolean;
  };
};

export async function claimWorkOrder(orderId: string, laborLineId?: string) {
  return mobilePost<ClaimResponse>(mobileApi.workOrderClaim(orderId), { laborLineId });
}
