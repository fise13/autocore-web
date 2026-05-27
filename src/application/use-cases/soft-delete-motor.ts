import { UpsertMotorInput } from "@/domain/motor";
import { MotorRepository } from "@/infrastructure/firestore/motor-repository";

export async function softDeleteMotorUseCase(
  repository: MotorRepository,
  uid: string,
  motorId: string,
  payload?: UpsertMotorInput,
) {
  return repository.softDelete(uid, motorId, payload);
}
