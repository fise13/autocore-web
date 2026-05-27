import { UpsertMotorInput } from "@/domain/motor";
import { upsertMotorSchema } from "@/domain/schemas";
import { MotorRepository } from "@/infrastructure/firestore/motor-repository";

export async function upsertMotorUseCase(
  repository: MotorRepository,
  uid: string,
  motorId: string,
  payload: UpsertMotorInput,
) {
  const validated = upsertMotorSchema.parse(payload);
  return repository.upsert(uid, motorId, validated);
}
