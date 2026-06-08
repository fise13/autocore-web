"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
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
    .slice(0, 5);

  if (isLoading) {
    return (
      <McPanel className={cn("md:col-span-2", className)}>
        <McPanelHeader title="Последние операции" />
        <McPanelBody className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-lg" />
          ))}
        </McPanelBody>
      </McPanel>
    );
  }

  return (
    <McPanel className={cn("md:col-span-2", className)}>
      <McPanelHeader
        title="Последние операции"
        description="Суммы и типы недавних проводок"
      />
      <McPanelBody className="space-y-0 px-0 pb-0">
        {recent.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">Операций пока нет</p>
        ) : (
          <Table>
            <TableCaption className="sr-only">Последние финансовые операции</TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="ps-4">Тип</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead className="pe-4 text-right tabular-nums">Сумма</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((operation) => (
                <TableRow className="mc-list-row border-0 bg-transparent hover:bg-muted/30" key={operation.id}>
                  <TableCell className="max-w-40 truncate ps-4 font-medium">
                    {operationTypeLabel(operation.type)}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {operation.createdAt.toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="pe-4 text-right tabular-nums text-primary">
                    {formatMoney(operation.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="flex items-center justify-center border-t border-border/50 py-2.5">
          <Button render={<Link href="/accounting" />} variant="ghost" size="sm">
            Вся бухгалтерия
            <ArrowRight className="size-4" data-icon="inline-end" aria-hidden />
          </Button>
        </div>
      </McPanelBody>
    </McPanel>
  );
}
