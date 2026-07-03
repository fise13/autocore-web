const MOTOR_WARRANTY_SEED_PREFIX = "autocore-motor-warranty:";

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
