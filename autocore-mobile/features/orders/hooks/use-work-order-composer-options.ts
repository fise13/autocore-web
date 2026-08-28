import { useMemo } from 'react';

import { uniqueAutocompleteOptions } from '@/lib/autocomplete/filter-options';
import { laborCatalogOptions, partCatalogOptions } from '@/lib/autocomplete/catalog';
import type { AutocompleteOption } from '@/lib/autocomplete/types';
import { formatMotorLineLabel } from '@/lib/motors/format-motor-display-name';
import { vehicleMakeOptions, vehicleModelOptions } from '@/lib/vehicles/vehicle-catalog';
import type { ClientEntity } from '@/types/client';
import type { InventoryItem } from '@/types/inventory';
import type { MotorEntity } from '@/types/motor';
import type { VehicleEntity } from '@/types/vehicle';

type ComposerVehicleForm = {
  clientId: string;
  vehicleId: string;
  vehicleMake: string;
  vehicleModel: string;
  licensePlate: string;
  vin: string;
};

function vehiclesInContext(
  vehicles: VehicleEntity[],
  form: ComposerVehicleForm,
  field: keyof Pick<ComposerVehicleForm, 'vehicleMake' | 'vehicleModel' | 'licensePlate' | 'vin'>,
): VehicleEntity[] {
  const scoped = form.clientId ? vehicles.filter((vehicle) => vehicle.clientId === form.clientId) : vehicles;

  return scoped.filter((vehicle) => {
    if (field === 'vehicleMake') return true;
    if (field === 'vehicleModel') {
      const make = form.vehicleMake.trim().toLowerCase();
      return !make || vehicle.make.toLowerCase() === make;
    }
    if (field === 'licensePlate') {
      const make = form.vehicleMake.trim().toLowerCase();
      const model = form.vehicleModel.trim().toLowerCase();
      return (
        (!make || vehicle.make.toLowerCase() === make) &&
        (!model || vehicle.model.toLowerCase() === model)
      );
    }
    const make = form.vehicleMake.trim().toLowerCase();
    const model = form.vehicleModel.trim().toLowerCase();
    const plate = form.licensePlate.trim().toLowerCase();
    return (
      (!make || vehicle.make.toLowerCase() === make) &&
      (!model || vehicle.model.toLowerCase() === model) &&
      (!plate || vehicle.licensePlate.toLowerCase() === plate)
    );
  });
}

export function useWorkOrderComposerOptions({
  clients,
  vehicles,
  inventoryItems,
  availableMotors,
  form,
}: {
  clients: ClientEntity[];
  vehicles: VehicleEntity[];
  inventoryItems: InventoryItem[];
  availableMotors: MotorEntity[];
  form: ComposerVehicleForm;
}) {
  const clientVehicles = useMemo(
    () => (form.clientId ? vehicles.filter((vehicle) => vehicle.clientId === form.clientId) : vehicles),
    [form.clientId, vehicles],
  );

  const activeInventory = useMemo(
    () => inventoryItems.filter((item) => item.status === 'active'),
    [inventoryItems],
  );

  const clientNameOptions = useMemo(
    () =>
      uniqueAutocompleteOptions(
        clients.map((client) => ({
          value: client.fullName,
          label: client.phone || undefined,
          keywords: client.phone,
        })),
      ),
    [clients],
  );

  const clientPhoneOptions = useMemo(
    () =>
      uniqueAutocompleteOptions(
        clients.map((client) => ({
          value: client.phone,
          label: client.fullName,
          keywords: `${client.fullName} ${client.phone}`,
        })),
      ),
    [clients],
  );

  const vehicleMakeOptionsList = useMemo(
    () =>
      vehicleMakeOptions(
        vehiclesInContext(clientVehicles, form, 'vehicleMake').map((vehicle) => vehicle.make),
      ),
    [clientVehicles, form],
  );

  const vehicleModelOptionsList = useMemo(
    () =>
      vehicleModelOptions(
        form.vehicleMake,
        vehiclesInContext(clientVehicles, form, 'vehicleModel').map((vehicle) => vehicle.model),
      ),
    [clientVehicles, form],
  );

  const licensePlateOptions = useMemo(
    () =>
      uniqueAutocompleteOptions(
        vehiclesInContext(clientVehicles, form, 'licensePlate')
          .map((vehicle) => vehicle.licensePlate)
          .filter(Boolean)
          .map((plate) => ({ value: plate, label: plate })),
      ),
    [clientVehicles, form],
  );

  const vinOptions = useMemo(
    () =>
      uniqueAutocompleteOptions(
        vehiclesInContext(clientVehicles, form, 'vin')
          .map((vehicle) => vehicle.vin)
          .filter(Boolean)
          .map((value) => ({ value, label: value })),
      ),
    [clientVehicles, form],
  );

  const partSkuOptions = useMemo(
    () => uniqueAutocompleteOptions(partCatalogOptions(activeInventory, 'sku')),
    [activeInventory],
  );

  const partNameOptions = useMemo(
    () => uniqueAutocompleteOptions(partCatalogOptions(activeInventory, 'name')),
    [activeInventory],
  );

  const laborTitleOptions = useMemo(
    () => uniqueAutocompleteOptions(laborCatalogOptions(activeInventory)),
    [activeInventory],
  );

  const motorSerialOptions = useMemo(
    () =>
      availableMotors.map((motor) => {
        const label = [
          formatMotorLineLabel(motor, { includeSerial: true }),
          motor.serialCode !== formatMotorLineLabel(motor) ? motor.serialCode : null,
        ]
          .filter(Boolean)
          .join(' · ');
        return {
          value: motor.serialCode,
          label,
          keywords: `${motor.serialCode} ${motor.brandName ?? ''} ${motor.engineCode ?? ''}`,
        } satisfies AutocompleteOption;
      }),
    [availableMotors],
  );

  return {
    clientNameOptions,
    clientPhoneOptions,
    vehicleMakeOptionsList,
    vehicleModelOptionsList,
    licensePlateOptions,
    vinOptions,
    partSkuOptions,
    partNameOptions,
    laborTitleOptions,
    motorSerialOptions,
    activeInventory,
    availableMotors,
    clientVehicles,
  };
}

export function resolveInventoryUnitPrice(item: InventoryItem): number {
  return item.sellPrice ?? item.purchasePrice ?? 0;
}
