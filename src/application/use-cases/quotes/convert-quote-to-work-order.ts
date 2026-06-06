import { CreateDomainEventInput } from "@/domain/domain-event";
import { CreateQuoteInput, Quote } from "@/domain/quote";
import { CreateWorkOrderInput } from "@/domain/work-order";
import { createWorkOrderUseCase } from "@/application/use-cases/work-orders/create-work-order";
import { DomainEventRepository } from "@/infrastructure/firestore/domain-event-repository";
import { QuoteRepository } from "@/infrastructure/firestore/quote-repository";
import { WorkOrderRepository } from "@/infrastructure/firestore/work-order-repository";

function quoteCreatedEvent(quote: Quote): CreateDomainEventInput {
  return {
    companyId: quote.companyId,
    type: "QuoteCreated",
    aggregateType: "work_order",
    aggregateId: quote.id,
    payload: { quoteId: quote.id },
    idempotencyKey: `QuoteCreated:${quote.id}`,
  };
}

export async function createQuoteUseCase(
  quoteRepository: QuoteRepository,
  domainEventRepository: DomainEventRepository,
  input: CreateQuoteInput,
): Promise<Quote> {
  const quote = await quoteRepository.create(input);
  await domainEventRepository.append(quoteCreatedEvent(quote));
  return quote;
}

export async function convertQuoteToWorkOrderUseCase(
  quoteRepository: QuoteRepository,
  workOrderRepository: WorkOrderRepository,
  domainEventRepository: DomainEventRepository,
  params: {
    companyId: string;
    quoteId: string;
    actorUserId: string;
  },
) {
  const quote = await quoteRepository.getById(params.companyId, params.quoteId);
  if (!quote) throw new Error("Коммерческое предложение не найдено");
  if (quote.status === "converted" && quote.convertedWorkOrderId) {
    return quote.convertedWorkOrderId;
  }

  const orderInput: CreateWorkOrderInput = {
    companyId: quote.companyId,
    clientId: quote.clientId,
    clientName: quote.clientName,
    clientPhone: quote.clientPhone,
    vehicleId: quote.vehicleId ?? "",
    vehicleLabel: quote.vehicleLabel,
    vin: quote.vin ?? "",
    licensePlate: quote.licensePlate ?? "",
    mileage: quote.mileage ?? 0,
    comment: quote.comment,
    laborLines: quote.laborLines,
    partLines: quote.partLines,
    motorLines: quote.motorLines,
    pricing: quote.pricing,
    paymentAccount: "cashbox",
    paymentMethod: "cash",
    createdByUserId: params.actorUserId,
    updatedByUserId: params.actorUserId,
  };

  const order = await createWorkOrderUseCase(workOrderRepository, domainEventRepository, orderInput);

  await quoteRepository.updateStatus(params.companyId, params.quoteId, "converted", {
    convertedWorkOrderId: order.id,
  });

  await domainEventRepository.append({
    companyId: params.companyId,
    type: "QuoteAccepted",
    aggregateType: "work_order",
    aggregateId: order.id,
    payload: { quoteId: params.quoteId, workOrderId: order.id },
    idempotencyKey: `QuoteAccepted:${params.quoteId}`,
  });

  return order.id;
}
