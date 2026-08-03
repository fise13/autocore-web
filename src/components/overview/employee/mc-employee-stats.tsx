"use client";

import Link from "next/link";

import { McAnimatedValue } from "@/components/overview/animation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EmployeeStatTile } from "@/lib/overview/compute-employee-dashboard";
import { cn } from "@/lib/utils";

type McEmployeeStatsProps = {
  tiles: EmployeeStatTile[];
  isLoading: boolean;
};

export function McEmployeeStats({ tiles, isLoading }: McEmployeeStatsProps) {
  if (isLoading) {
    return (
      <>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card className="shadow-none dark:ring-0" key={index}>
            <CardHeader>
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </>
    );
  }

  return (
    <>
      {tiles.map((tile) => {
        const body = (
          <Card className={cn("shadow-none dark:ring-0", tile.href && "transition-colors hover:bg-muted/30")}>
            <CardHeader>
              <CardTitle className="text-xs font-normal text-muted-foreground">{tile.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <p className="text-2xl font-semibold tabular-nums">
                {tile.format === "currency" ? (
                  <>
                    <McAnimatedValue value={tile.value} format="currency" />
                  </>
                ) : (
                  <McAnimatedValue value={tile.value} format="integer" />
                )}
              </p>
              {tile.hint ? <p className="text-xs text-muted-foreground">{tile.hint}</p> : null}
            </CardContent>
          </Card>
        );

        if (tile.href) {
          return (
            <Link key={tile.key} href={tile.href} className="block">
              {body}
            </Link>
          );
        }

        return <div key={tile.key}>{body}</div>;
      })}
    </>
  );
}
