"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  McPanel,
  McPanelBody,
  McPanelHeader,
} from "@/components/mission-control/dashboard/dashboard-panel";
import { formatMoney } from "@/lib/mission-control/compute-dashboard-charts";
import { operationTypeLabel } from "@/lib/accounting/labels";
import { cn } from "@/lib/utils";
import { FinancialOperation } from "@/domain/financial-operation";
import { Skeleton } from "@/components/ui/skeleton";

type McRecentOperationsProps = {
  operations: FinancialOperation[];
  isLoading: boolean;
  className?: string;
};

export function McRecentOperations({ operations, isLoading, className }: McRecentOperationsProps) {
  const recent = [...operations]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 4);

  if (isLoading) {
    return (
      <McPanel className={cn("gap-0 shadow-none md:col-span-2 dark:ring-0", className)}>
        <McPanelHeader title="Последние операции" bordered />
        <McPanelBody className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-lg" />
          ))}
        </McPanelBody>
      </McPanel>
    );
  }

  return (
    <McPanel className={cn("gap-0 shadow-none md:col-span-2 dark:ring-0", className)}>
      <McPanelHeader
        title="Последние операции"
        description="Недавние проводки в бухгалтерии"
        bordered
      />
      <McPanelBody className="p-0">
        {recent.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">Операций пока нет</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Тип</TableHead>
                <TableHead className="hidden sm:table-cell">Дата</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead className="pr-6 text-right">Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((operation) => (
                <TableRow className="h-14 hover:bg-transparent" key={operation.id}>
                  <TableCell className="max-w-36 truncate pl-6 font-medium">
                    {operationTypeLabel(operation.type)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground text-sm tabular-nums sm:table-cell">
                    {operation.createdAt.toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(operation.amount)}</TableCell>
                  <TableCell className="pr-6 text-right">
                    <Badge variant="secondary">Проведено</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="flex justify-center border-t py-3">
          <Button size="sm" variant="ghost" render={<Link href="/accounting" />} nativeButton={false}>
            Вся бухгалтерия
            <ArrowRightIcon aria-hidden data-icon="inline-end" />
          </Button>
        </div>
      </McPanelBody>
    </McPanel>
  );
}
