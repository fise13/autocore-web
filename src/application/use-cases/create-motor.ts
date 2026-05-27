import { MotorEntity, UpsertMotorInput } from "@/domain/motor";
import { upsertMotorSchema } from "@/domain/schemas";
import { MotorRepository } from "@/infrastructure/firestore/motor-repository";

export async function createMotorUseCase(
  repository: MotorRepository,
  uid: string,
  payload: UpsertMotorInput,
  existingMotors: MotorEntity[] = [],
) {
  const validated = upsertMotorSchema.parse(payload);
  return repository.create(uid, validated, existingMotors);
}
