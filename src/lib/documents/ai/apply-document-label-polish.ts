import "server-only";

import { summarizeWorkOrderForLogbook } from "@/lib/documents/classify-service-order";
import type { DocumentContext } from "@/lib/documents/document-context";
import { polishDocumentLabels } from "@/lib/documents/ai/polish-document-labels";
import { GEARBOX_MARK } from "@/lib/documents/ai/document-label-rules";

/**
 * In-memory polish of document labels for PDF/preview render.
 * Does not write back to Firestore.
 */
export async function polishDocumentContextForRender(
  context: DocumentContext,
): Promise<DocumentContext> {
  const polish = await polishDocumentLabels({
    motors: context.order.motorLines,
    parts: context.order.partLines,
  });

  const motorLines = context.order.motorLines.map((line) => {
    const polished = polish.motors[line.id];
    if (!polished) return line;
    return {
      ...line,
      brandName: polished.brandName || line.brandName,
      engineCode: polished.engineCode || line.engineCode,
      configuration: polished.configuration,
      serialCode: polished.serialCode || line.serialCode,
    };
  });

  const partLines = context.order.partLines.map((line) => {
    const polished = polish.parts[line.id];
    if (!polished) return line;
    return {
      ...line,
      name: polished.name || line.name,
    };
  });

  const motorLineMarks: Record<string, string[]> = {};
  for (const [id, polished] of Object.entries(polish.motors)) {
    if (polished.marks.length > 0) motorLineMarks[id] = polished.marks;
  }
  for (const [id, polished] of Object.entries(polish.parts)) {
    if (polished.marks.length === 0) continue;
    // Parts keep marks only if we later surface them; store under part id namespace.
    motorLineMarks[`part:${id}`] = polished.marks;
  }

  // If motor entity transmission is empty but we have gearbox mark, surface it for PDF fields.
  const motors = context.motors.map((motor) => {
    const line = motorLines.find((m) => m.motorId === motor.id);
    if (!line) return motor;
    const marks = motorLineMarks[line.id] ?? [];
    if (!marks.includes(GEARBOX_MARK)) return motor;
    if (motor.transmission?.trim()) return motor;
    return { ...motor, transmission: GEARBOX_MARK };
  });

  const order = {
    ...context.order,
    motorLines,
    partLines,
  };

  const vehicleLogbook = context.vehicleLogbook.map((entry) => {
    if (entry.workOrderId !== order.id) return entry;
    return {
      ...entry,
      title: summarizeWorkOrderForLogbook(order),
    };
  });

  return {
    ...context,
    order,
    motors,
    vehicleLogbook,
    motorLineMarks,
  };
}
