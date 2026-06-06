import { ClientEntity, CreateClientInput } from "@/domain/client";
import { ClientRepository } from "@/infrastructure/firestore/client-repository";

export async function quickCreateClientUseCase(
  clientRepository: ClientRepository,
  input: CreateClientInput,
): Promise<ClientEntity> {
  return clientRepository.create(input);
}
