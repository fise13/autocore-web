"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Car } from "lucide-react";

import { ClientEntity } from "@/domain/client";
import { VehicleEntity } from "@/domain/vehicle";
import {
  WorkOrdersDirectoryCard,
  WorkOrdersPanelHeader,
} from "@/components/work-orders/work-orders-directory-ui";
import {
  workOrdersListItemVariants,
  workOrdersListVariants,
} from "@/components/work-orders/work-orders-motion";
import { workOrdersHref } from "@/lib/navigation/work-orders-nav";

type WorkOrdersVehiclesPanelProps = {
  vehicles: VehicleEntity[];
  clients: ClientEntity[];
  canEdit: boolean;
};

export function WorkOrdersVehiclesPanel({ vehicles, clients, canEdit }: WorkOrdersVehiclesPanelProps) {
  const [search, setSearch] = useState("");

  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);

  const query = search.trim().toLowerCase();
  const filtered = vehicles.filter((vehicle) => {
    if (!query) return true;
    const client = clientById.get(vehicle.clientId);
    const haystack = [
      vehicle.make,
      vehicle.model,
      vehicle.licensePlate,
      vehicle.vin,
      client?.fullName,
      client?.phone,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
      <WorkOrdersPanelHeader
        title="Автомобили"
        description={`${vehicles.length} в базе`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Марка, номер, VIN, клиент…"
        actionHref={canEdit ? workOrdersHref({ section: "orders", create: true }) : undefined}
        actionLabel="Новый заказ-наряд"
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
        {filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {vehicles.length === 0 ? "Автомобилей пока нет" : "Ничего не найдено"}
          </p>
        ) : (
          <motion.ul
            key={search || "all-vehicles"}
            className="mx-auto flex max-w-3xl flex-col gap-2.5"
            variants={workOrdersListVariants}
            initial="hidden"
            animate="show"
          >
            {filtered.map((vehicle) => {
              const client = clientById.get(vehicle.clientId);
              const title = [vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Автомобиль";
              const plateOrVin = [vehicle.licensePlate, vehicle.vin].filter(Boolean).join(" · ");
              const meta: string[] = [];
              if (client?.fullName) {
                meta.push(client.phone ? `${client.fullName} · ${client.phone}` : client.fullName);
              }
              if (vehicle.currentMileage > 0) {
                meta.push(`Пробег ${vehicle.currentMileage.toLocaleString("ru-RU")} км`);
              }

              return (
                <motion.li key={vehicle.id} variants={workOrdersListItemVariants} layout>
                  <WorkOrdersDirectoryCard
                    icon={Car}
                    title={title}
                    subtitle={plateOrVin || "—"}
                    meta={meta}
                    actionHref={
                      canEdit && client
                        ? workOrdersHref({ section: "orders", create: true, clientId: client.id })
                        : undefined
                    }
                  />
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </div>
    </div>
  );
}
