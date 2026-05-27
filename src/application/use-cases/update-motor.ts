import { UpsertMotorInput } from "@/domain/motor";
import { MotorRepository } from "@/infrastructure/firestore/motor-repository";

export async function updateMotorUseCase(
  repository: MotorRepository,
  uid: string,
  motorId: string,
  payload: Partial<UpsertMotorInput>,
) {
  return repository.update(uid, motorId, payload);
}
