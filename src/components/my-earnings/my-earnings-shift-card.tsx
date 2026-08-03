"use client";

import { useEffect, useState } from "react";
import { DEFAULT_MAX_ACTIVE_WORK_ORDERS } from "@autocore/rbac";

import {
  McPanel,
  McPanelBody,
  McPanelHeader,
} from "@/components/overview/dashboard/dashboard-panel";
import { Button } from "@/components/ui/button";
import { createEmployeeRbacRepository } from "@/infrastructure/firestore/employee-rbac-repository";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const employeeRepository = createEmployeeRbacRepository();

type MyEarningsShiftCardProps = {
  companyId: string;
  employeeId: string;
  shiftOn: boolean;
};

export function MyEarningsShiftCard({ companyId, employeeId, shiftOn }: MyEarningsShiftCardProps) {
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState(shiftOn);

  useEffect(() => {
    setValue(shiftOn);
  }, [shiftOn]);

  return (
    <McPanel className="shadow-none dark:ring-0">
      <McPanelHeader
        title={userCopy.myEarnings.shiftTitle}
        description={userCopy.myEarnings.shiftDescription}
        action={
          <Button
            type="button"
            size="sm"
            variant={value ? "default" : "outline"}
            disabled={busy}
            className={cn(value && "bg-emerald-600 hover:bg-emerald-600/90")}
            onClick={() => {
              const next = !value;
              setBusy(true);
              void employeeRepository
                .setEmployeeShiftOn(companyId, employeeId, next)
                .then(() => {
                  setValue(next);
                  toast.success(next ? userCopy.myEarnings.shiftOn : userCopy.myEarnings.shiftOff);
                })
                .catch((error) => {
                  toast.error(
                    error instanceof Error ? error.message : userCopy.myEarnings.shiftUpdateFailed,
                  );
                })
                .finally(() => setBusy(false));
            }}
          >
            {value ? userCopy.myEarnings.shiftOn : userCopy.myEarnings.shiftOff}
          </Button>
        }
      />
      <McPanelBody>
        <p className="text-sm font-medium">{value ? userCopy.myEarnings.shiftOn : userCopy.myEarnings.shiftOff}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {userCopy.myEarnings.shiftLimit(DEFAULT_MAX_ACTIVE_WORK_ORDERS)}
        </p>
      </McPanelBody>
    </McPanel>
  );
}
