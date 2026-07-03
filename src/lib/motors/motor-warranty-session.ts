const MOTOR_WARRANTY_SEED_PREFIX = "autocore-motor-warranty:";
const OPERATION_WARRANTY_SEED_PREFIX = "autocore-operation-warranty:";

export function writeMotorWarrantySeed(motorId: string, warrantyId: string): void {
  if (typeof window === "undefined" || !motorId || !warrantyId) return;
  try {
    sessionStorage.setItem(`${MOTOR_WARRANTY_SEED_PREFIX}${motorId}`, warrantyId);
  } catch {
    // Ignore quota errors.
  }
}

export function readMotorWarrantySeed(motorId: string): string | null {
  if (typeof window === "undefined" || !motorId) return null;
  return sessionStorage.getItem(`${MOTOR_WARRANTY_SEED_PREFIX}${motorId}`);
}

export function clearMotorWarrantySeed(motorId: string): void {
  if (typeof window === "undefined" || !motorId) return;
  sessionStorage.removeItem(`${MOTOR_WARRANTY_SEED_PREFIX}${motorId}`);
}

export function writeOperationWarrantySeed(operationId: string, warrantyId: string): void {
  if (typeof window === "undefined" || !operationId || !warrantyId) return;
  try {
    sessionStorage.setItem(`${OPERATION_WARRANTY_SEED_PREFIX}${operationId}`, warrantyId);
  } catch {
    // Ignore quota errors.
  }
}

export function readOperationWarrantySeed(operationId: string): string | null {
  if (typeof window === "undefined" || !operationId) return null;
  return sessionStorage.getItem(`${OPERATION_WARRANTY_SEED_PREFIX}${operationId}`);
}

export function clearOperationWarrantySeed(operationId: string): void {
  if (typeof window === "undefined" || !operationId) return;
  sessionStorage.removeItem(`${OPERATION_WARRANTY_SEED_PREFIX}${operationId}`);
}
