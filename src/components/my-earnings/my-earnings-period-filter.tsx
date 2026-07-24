"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MyEarningsPeriod } from "@/lib/my-earnings/compute-my-earnings";
import { userCopy } from "@/lib/user-copy";

type MyEarningsPeriodFilterProps = {
  value: MyEarningsPeriod;
  onChange: (value: MyEarningsPeriod) => void;
};

export function MyEarningsPeriodFilter({ value, onChange }: MyEarningsPeriodFilterProps) {
  return (
    <Select onValueChange={(next) => onChange(next as MyEarningsPeriod)} value={value}>
      <SelectTrigger aria-label={userCopy.myEarnings.periodAria} className="w-full min-w-36 sm:w-40" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="7d">{userCopy.myEarnings.filters.period7d}</SelectItem>
        <SelectItem value="30d">{userCopy.myEarnings.filters.period30d}</SelectItem>
        <SelectItem value="all">{userCopy.myEarnings.filters.periodAll}</SelectItem>
      </SelectContent>
    </Select>
  );
}
