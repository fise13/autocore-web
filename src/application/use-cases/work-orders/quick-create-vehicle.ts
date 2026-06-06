import { CreateVehicleInput, VehicleEntity } from "@/domain/vehicle";
import { VehicleRepository } from "@/infrastructure/firestore/vehicle-repository";

export async function quickCreateVehicleUseCase(
  vehicleRepository: VehicleRepository,
  input: CreateVehicleInput,
): Promise<VehicleEntity> {
  return vehicleRepository.create(input);
}
