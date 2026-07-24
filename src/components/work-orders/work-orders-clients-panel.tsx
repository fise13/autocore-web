"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { UserRound } from "lucide-react";

import { ClientEntity } from "@/domain/client";
import { VehicleEntity } from "@/domain/vehicle";
import {
  vehicleCountLabel,
  WorkOrdersDirectoryCard,
  WorkOrdersPanelHeader,
} from "@/components/work-orders/work-orders-directory-ui";
import {
  workOrdersListItemVariants,
  workOrdersListVariants,
} from "@/components/work-orders/work-orders-motion";
import { userCopy } from "@/lib/user-copy";
import { workOrdersHref } from "@/lib/navigation/work-orders-nav";

type WorkOrdersClientsPanelProps = {
  clients: ClientEntity[];
  vehicles: VehicleEntity[];
  canEdit: boolean;
  initialSearch?: string;
};

export function WorkOrdersClientsPanel({
  clients,
  vehicles,
  canEdit,
  initialSearch = "",
}: WorkOrdersClientsPanelProps) {
  const [search, setSearch] = useState(initialSearch);
  const copy = userCopy.workOrders;

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
  }, [initialSearch]);

  const vehiclesByClient = useMemo(() => {
    const map = new Map<string, number>();
    for (const vehicle of vehicles) {
      map.set(vehicle.clientId, (map.get(vehicle.clientId) ?? 0) + 1);
    }
    return map;
  }, [vehicles]);

  const query = search.trim().toLowerCase();
  const filtered = clients.filter((client) => {
    if (!query) return true;
    const haystack = [client.fullName, client.phone, client.email, client.notes]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
      <WorkOrdersPanelHeader
        title={copy.clients.title}
        description={copy.clients.inDatabase(clients.length)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={copy.clients.searchPlaceholder}
        actionHref={canEdit ? workOrdersHref({ section: "orders", create: true }) : undefined}
        actionLabel={copy.newOrder}
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
        {filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {clients.length === 0 ? copy.clients.empty : copy.nothingFound}
          </p>
        ) : (
          <motion.ul
            key={search || "all-clients"}
            className="mx-auto flex max-w-3xl flex-col gap-2.5"
            variants={workOrdersListVariants}
            initial="hidden"
            animate="show"
          >
            {filtered.map((client) => {
              const vehicleCount = vehiclesByClient.get(client.id) ?? 0;
              const meta = [vehicleCountLabel(vehicleCount)];
              if (client.email) meta.unshift(client.email);

              return (
                <motion.li key={client.id} variants={workOrdersListItemVariants} layout>
                  <WorkOrdersDirectoryCard
                    icon={UserRound}
                    title={client.fullName || copy.clients.unnamed}
                    subtitle={client.phone || copy.clients.noPhone}
                    meta={meta}
                    actionHref={
                      canEdit
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
