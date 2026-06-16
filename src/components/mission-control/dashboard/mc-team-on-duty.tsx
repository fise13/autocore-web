"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import {
  McPanel,
  McPanelBody,
  McPanelHeader,
} from "@/components/mission-control/dashboard/dashboard-panel";
import { TeamOnDutyList } from "@/components/team/team-on-duty-list";
import { Button } from "@/components/ui/button";
import { CompanyEmployee } from "@/domain/rbac";
import { WorkOrder } from "@/domain/work-order";
import { computeOpenWorkOrderCounts } from "@/lib/team/compute-open-work-order-counts";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type McTeamOnDutyProps = {
  employees: CompanyEmployee[];
  workOrders?: WorkOrder[];
  isLoading: boolean;
  className?: string;
};

export function McTeamOnDuty({ employees, workOrders = [], isLoading, className }: McTeamOnDutyProps) {
  const assignmentCounts = useMemo(() => computeOpenWorkOrderCounts(workOrders), [workOrders]);

  if (isLoading) {
    return (
      <McPanel className={cn("shadow-none dark:ring-0", className)}>
        <McPanelHeader title="Команда на смене" bordered />
        <McPanelBody className="flex flex-col gap-2 p-0">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="mx-3 h-14 rounded-lg" />
          ))}
        </McPanelBody>
      </McPanel>
    );
  }

  if (employees.filter((employee) => employee.isActive).length === 0) {
    return null;
  }

  return (
    <McPanel className={cn("shadow-none dark:ring-0", className)}>
      <McPanelHeader
        title="Команда на смене"
        description="Кто сейчас ведёт заказ-наряды"
        bordered
      />
      <McPanelBody className="p-0">
        <TeamOnDutyList
          employees={employees}
          assignmentCounts={assignmentCounts}
          limit={5}
        />
        <div className="flex items-center justify-center border-t py-3">
          <Button size="sm" variant="ghost" render={<Link href="/team" />} nativeButton={false}>
            Вся команда
            <ArrowRightIcon aria-hidden data-icon="inline-end" />
          </Button>
        </div>
      </McPanelBody>
    </McPanel>
  );
}
