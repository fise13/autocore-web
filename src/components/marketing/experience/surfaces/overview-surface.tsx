"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, useInView, useReducedMotion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
} from "recharts";

import {
  McPanel,
  McPanelBody,
  McPanelHeader,
} from "@/components/overview/dashboard/dashboard-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Delta, DeltaIcon, DeltaValue } from "@/components/ui/delta";
import { useDemoChrome } from "@/components/marketing/modals/use-demo-chrome";
import {
  formatUsd,
  landingDemoInventory,
  landingDemoOverview,
  landingDemoWorkOrders,
} from "@/lib/marketing/landing-demo-snapshot";
import { cn } from "@/lib/utils";
import { TriangleAlert } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;
const mc = landingDemoOverview;

const REVENUE_VALUES = [84000, 62000, 98000, 74000, 126000, 41000, 28000] as const;
const REVENUE_VALUES_30 = [
  54000, 61000, 48000, 72000, 88000, 41000, 29000, 84000, 62000, 98000, 74000, 126000, 41000, 28000, 91000,
  67000, 104000, 80000, 118000, 52000, 33000, 76000, 59000, 89000, 71000, 132000, 44000, 31000, 86000, 64000,
] as const;
const OPS_VALUES = [
  { income: 84000, expense: 22000 },
  { income: 62000, expense: 18500 },
  { income: 98000, expense: 31000 },
  { income: 74000, expense: 16400 },
  { income: 126000, expense: 28000 },
  { income: 41000, expense: 9000 },
  { income: 28000, expense: 6500 },
] as const;
const WORK_ORDER_VALUES = [3, 2, 4, 3, 5, 1, 1] as const;
const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

type OverviewSurfaceProps = {
  className?: string;
  /** Full playground grid: attention, team, recent ops, period toggle. */
  full?: boolean;
};

type RevenuePeriod = 7 | 30;

/** Real AutoCore Overview grid — charts rise on enter, no device chrome. */
export function OverviewSurface({ className, full = false }: OverviewSurfaceProps) {
  const t = useTranslations("marketing.landing.productChrome");
  const { motorsSnapshot } = useDemoChrome();
  const chartUid = useId().replace(/:/g, "");

  const localizeOrderNumber = (number: string) => {
    if (number.startsWith(motorsSnapshot.orderPrefixSource)) {
      return `${motorsSnapshot.orderPrefixLocalized}${number.slice(motorsSnapshot.orderPrefixSource.length)}`;
    }
    return number;
  };
  const gradientId = `exp-mc-revenue-${chartUid}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(rootRef, { once: true, amount: 0.28 });
  const play = Boolean(reduced || inView);
  const [periodDays, setPeriodDays] = useState<RevenuePeriod>(7);

  const weekdays = useMemo(
    () => WEEKDAY_KEYS.map((key) => t(`weekdays.${key}`)),
    [t],
  );

  const revenueFull = useMemo(() => {
    if (periodDays === 7) {
      return weekdays.map((label, index) => ({ label, revenue: REVENUE_VALUES[index] ?? 0 }));
    }
    return REVENUE_VALUES_30.map((revenue, index) => ({
      label: String(index + 1),
      revenue,
    }));
  }, [periodDays, weekdays]);
  const opsFull = useMemo(
    () =>
      weekdays.map((day, index) => ({
        day,
        income: OPS_VALUES[index].income,
        expense: OPS_VALUES[index].expense,
      })),
    [weekdays],
  );
  const workOrdersFull = useMemo(
    () => weekdays.map((day, index) => ({ day, count: WORK_ORDER_VALUES[index] })),
    [weekdays],
  );

  const emptyRevenue = useMemo(
    () => revenueFull.map((row) => ({ ...row, revenue: 0 })),
    [revenueFull],
  );
  const emptyOps = useMemo(
    () => opsFull.map((row) => ({ ...row, income: 0, expense: 0 })),
    [opsFull],
  );
  const emptyWorkOrders = useMemo(
    () => workOrdersFull.map((row) => ({ ...row, count: 0 })),
    [workOrdersFull],
  );

  const revenueConfig = useMemo(
    () =>
      ({
        revenue: { label: t("charts.revenue"), color: "var(--chart-1)" },
      }) satisfies ChartConfig,
    [t],
  );
  const opsConfig = useMemo(
    () =>
      ({
        income: { label: t("charts.income"), color: "var(--chart-1)" },
        expense: { label: t("charts.expense"), color: "var(--chart-3)" },
      }) satisfies ChartConfig,
    [t],
  );
  const workOrdersConfig = useMemo(
    () =>
      ({
        count: { label: t("charts.orders"), color: "var(--chart-2)" },
      }) satisfies ChartConfig,
    [t],
  );
  const warehouseConfig = useMemo(
    () =>
      ({
        share: { label: t("charts.share") },
        motors: { label: t("charts.motors"), color: "var(--chart-1)" },
        warehouse: { label: t("charts.warehouse"), color: "var(--chart-2)" },
        deficits: { label: t("charts.deficits"), color: "var(--chart-3)" },
      }) satisfies ChartConfig,
    [t],
  );

  const orderStatus = useMemo(
    () => t.raw("orderStatus") as Record<string, string>,
    [t],
  );
  const activityFeed = useMemo(
    () =>
      t.raw("activityFeed") as Array<{ user: string; text: string; time: string }>,
    [t],
  );

  const [revenueData, setRevenueData] = useState(emptyRevenue);
  const [opsData, setOpsData] = useState(emptyOps);
  const [workOrdersData, setWorkOrdersData] = useState(emptyWorkOrders);
  const [pieReady, setPieReady] = useState(() => Boolean(reduced));

  const openOrders = landingDemoWorkOrders.filter((order) => order.status !== "delivered");
  const warehouseLow = landingDemoInventory.filter((item) => item.available <= 8).length;

  const warehousePieFull = useMemo(
    () => [
      { segment: "motors" as const, share: 82, fill: "var(--color-motors)" },
      { segment: "warehouse" as const, share: 13, fill: "var(--color-warehouse)" },
      { segment: "deficits" as const, share: 5, fill: "var(--color-deficits)" },
    ],
    [],
  );

  const warehousePie = pieReady
    ? warehousePieFull
    : warehousePieFull.map((row) => ({ ...row, share: 0 }));

  useEffect(() => {
    if (!play) return;
    if (reduced) {
      setRevenueData(revenueFull);
      setOpsData(opsFull);
      setWorkOrdersData(workOrdersFull);
      setPieReady(true);
      return;
    }

    setRevenueData(emptyRevenue);
    setOpsData(emptyOps);
    setWorkOrdersData(emptyWorkOrders);
    setPieReady(false);

    const frame = window.requestAnimationFrame(() => {
      setRevenueData(revenueFull);
      setOpsData(opsFull);
      setWorkOrdersData(workOrdersFull);
      setPieReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    play,
    reduced,
    revenueFull,
    opsFull,
    workOrdersFull,
    emptyRevenue,
    emptyOps,
    emptyWorkOrders,
  ]);

  const revenueGrowth =
    ((revenueFull[revenueFull.length - 1]?.revenue ?? 0) - (revenueFull[0]?.revenue ?? 0)) /
    Math.max(1, revenueFull[0]?.revenue ?? 1) *
    100;
  const woGrowth =
    ((WORK_ORDER_VALUES[WORK_ORDER_VALUES.length - 1] - WORK_ORDER_VALUES[0]) /
      Math.max(1, WORK_ORDER_VALUES[0])) *
    100;

  const animateCharts = play && !reduced;

  const stats = [
    {
      key: "revenue",
      label: t("stats.revenueToday"),
      value: `${formatUsd(mc.revenueToday)}`,
      delta: mc.revenueDelta,
      hint: t("stats.vsYesterday"),
      percent: true,
    },
    {
      key: "balance",
      label: t("stats.balance"),
      value: `${formatUsd(mc.balance)}`,
      delta: mc.balanceDelta,
      hint: t("stats.cashAndBank"),
      percent: true,
    },
    {
      key: "motors",
      label: t("stats.motors"),
      value: formatUsd(mc.motorsOnHand),
      delta: mc.motorsDelta,
      hint: t("stats.inStock"),
      percent: false,
    },
    {
      key: "warehouse",
      label: t("stats.warehouse"),
      value: formatUsd(mc.warehouseSku),
      delta: mc.warehouseDelta,
      hint: t("stats.positions"),
      percent: true,
    },
  ];

  const team = full
    ? (t.raw("team.people") as Array<{ name: string; role: string; status: string; jobs: string }>)
    : [];
  const recentOps = full
    ? (t.raw("recentOps.rows") as Array<{ type: string; date: string; amount: string; status: string }>)
    : [];
  const attentionItems = full
    ? (t.raw("attention.items") as Array<{ count: string; text: string }>)
    : [];

  return (
    <div
      ref={rootRef}
      className={cn("exp-outcome-mc", full && "is-playground", className)}
      aria-label="Overview"
    >
      <div className="exp-outcome-mc-top">
        <p className="exp-outcome-mc-title">Overview</p>
        <Badge variant="outline" className="font-normal text-xs">
          {t("signals", { count: mc.alerts.length })}
        </Badge>
      </div>

      <div className="exp-outcome-mc-grid">
        {full && attentionItems.length > 0 ? (
          <div className="exp-outcome-mc-span-full rounded-xl border bg-card/60 p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium">
              <TriangleAlert className="size-4 text-amber-500" aria-hidden />
              {t("attention.title")}
            </p>
            <div className="flex flex-wrap gap-2">
              {attentionItems.map((item) => (
                <span
                  key={item.text}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
                >
                  <span className="font-semibold tabular-nums">{item.count}</span>
                  <span>{item.text}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {stats.map((stat, index) => (
          <Card key={stat.key} className="shadow-none dark:ring-0">
            <CardHeader>
              <CardTitle className="font-normal text-muted-foreground text-xs">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <motion.p
                className="font-semibold text-2xl tabular-nums tracking-tight"
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={play ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                transition={{ duration: 0.5, delay: play ? 0.08 + index * 0.07 : 0, ease: EASE }}
              >
                {stat.value}
              </motion.p>
              <div className="flex items-center gap-1 text-xs">
                {stat.delta !== 0 ? (
                  <Delta value={stat.delta}>
                    <DeltaIcon />
                    <DeltaValue
                      suffix={stat.percent ? "%" : ""}
                      absolute={!stat.percent}
                      precision={stat.percent ? 1 : 0}
                    />
                  </Delta>
                ) : (
                  <span className="tabular-nums text-muted-foreground">0.0%</span>
                )}
                <span className="text-muted-foreground">{stat.hint}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        <McPanel className="exp-outcome-mc-span-3 shadow-none dark:ring-0">
          <McPanelHeader
            title={t("charts.revenue")}
            description={periodDays === 30 ? t("charts.revenueDesc30") : t("charts.revenueDesc")}
            badge={
              <Delta value={revenueGrowth} variant="badge">
                <DeltaIcon variant="trend" />
                <DeltaValue />
              </Delta>
            }
            action={
              full ? (
                <Select
                  value={String(periodDays)}
                  onValueChange={(value) => {
                    if (value === "7" || value === "30") setPeriodDays(Number(value) as RevenuePeriod);
                  }}
                >
                  <SelectTrigger aria-label={t("charts.periodAria")} className="w-full min-w-28 sm:w-fit" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="7">{t("charts.period7")}</SelectItem>
                    <SelectItem value="30">{t("charts.period30")}</SelectItem>
                  </SelectContent>
                </Select>
              ) : null
            }
          />
          <McPanelBody>
            <ChartContainer className="aspect-22/8 w-full" config={revenueConfig}>
              <AreaChart
                accessibilityLayer
                data={revenueData}
                margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.45} />
                    <stop offset="55%" stopColor="var(--color-revenue)" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid className="stroke-border" vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  interval={periodDays <= 7 ? 0 : "preserveStartEnd"}
                  minTickGap={periodDays >= 30 ? 28 : undefined}
                  tickLine={false}
                  tickMargin={8}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="min-w-34"
                      formatter={(value) => formatUsd(Number(value))}
                      indicator="line"
                    />
                  }
                  cursor={false}
                />
                <Area
                  dataKey="revenue"
                  dot={false}
                  fill={`url(#${gradientId})`}
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                  type="natural"
                  isAnimationActive={animateCharts}
                  animationBegin={120}
                  animationDuration={1100}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ChartContainer>
          </McPanelBody>
        </McPanel>

        <McPanel className="shadow-none dark:ring-0">
          <McPanelHeader
            title={t("charts.stock")}
            description={t("charts.stockDesc")}
            badge={
              <Delta value={-warehouseLow} variant="badge">
                <DeltaIcon variant="trend" />
                <DeltaValue absolute precision={0} />
              </Delta>
            }
          />
          <McPanelBody>
            <ChartContainer className="mx-auto aspect-square max-h-44 w-full" config={warehouseConfig}>
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="segment" />} />
                <Pie
                  data={warehousePie}
                  dataKey="share"
                  nameKey="segment"
                  innerRadius={42}
                  strokeWidth={2}
                  isAnimationActive={animateCharts}
                  animationBegin={220}
                  animationDuration={900}
                  animationEasing="ease-out"
                >
                  <LabelList
                    dataKey="share"
                    className="fill-foreground font-medium tabular-nums"
                    fontSize={11}
                    formatter={(value) => `${value}%`}
                    position="outside"
                  />
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="segment" />} />
              </PieChart>
            </ChartContainer>
          </McPanelBody>
        </McPanel>

        <McPanel className="exp-outcome-mc-span-2 shadow-none dark:ring-0">
          <McPanelHeader title={t("charts.ops")} description={t("charts.opsDesc")} />
          <McPanelBody>
            <ChartContainer className="aspect-video w-full max-h-48" config={opsConfig}>
              <BarChart accessibilityLayer data={opsData}>
                <XAxis
                  axisLine={false}
                  dataKey="day"
                  interval={0}
                  tickLine={false}
                  tickMargin={8}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatUsd(Number(value))}
                    />
                  }
                />
                <Bar
                  dataKey="income"
                  fill="var(--color-income)"
                  radius={[4, 4, 0, 0]}
                  stackId="a"
                  isAnimationActive={animateCharts}
                  animationBegin={180}
                  animationDuration={950}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="expense"
                  fill="var(--color-expense)"
                  radius={[4, 4, 0, 0]}
                  stackId="a"
                  isAnimationActive={animateCharts}
                  animationBegin={280}
                  animationDuration={950}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ChartContainer>
          </McPanelBody>
        </McPanel>

        <McPanel className="exp-outcome-mc-span-2 shadow-none dark:ring-0">
          <McPanelHeader
            title={t("charts.workOrders")}
            description={t("charts.workOrdersDesc")}
            badge={
              <Delta value={woGrowth} variant="badge">
                <DeltaIcon variant="trend" />
                <DeltaValue />
              </Delta>
            }
          />
          <McPanelBody>
            <ChartContainer className="aspect-video w-full max-h-48" config={workOrdersConfig}>
              <LineChart accessibilityLayer data={workOrdersData}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis axisLine={false} dataKey="day" tickLine={false} tickMargin={10} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => t("charts.units", { value: String(value) })}
                    />
                  }
                  cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-count)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-count)", r: 3 }}
                  activeDot={{ r: 5, fill: "var(--color-count)" }}
                  isAnimationActive={animateCharts}
                  animationBegin={260}
                  animationDuration={1000}
                  animationEasing="ease-out"
                >
                  <LabelList
                    className="fill-foreground font-medium tabular-nums"
                    dataKey="count"
                    fontSize={11}
                    offset={12}
                    position="top"
                  />
                </Line>
              </LineChart>
            </ChartContainer>
          </McPanelBody>
        </McPanel>

        <McPanel className="exp-outcome-mc-span-2 shadow-none dark:ring-0">
          <McPanelHeader title={t("openOrders")} bordered />
          <McPanelBody className="pt-2">
            <ul className="exp-outcome-mc-list">
              {openOrders.map((order, index) => (
                <motion.li
                  key={order.id}
                  className="exp-outcome-mc-row"
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={play ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                  transition={{ duration: 0.4, delay: play ? 0.35 + index * 0.06 : 0, ease: EASE }}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">{localizeOrderNumber(order.number)}</p>
                    <p className="truncate text-muted-foreground text-xs">{order.vehicleLabel}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 font-normal">
                    {orderStatus[order.status] ?? order.statusLabel}
                  </Badge>
                </motion.li>
              ))}
            </ul>
          </McPanelBody>
        </McPanel>

        <McPanel className="exp-outcome-mc-span-2 shadow-none dark:ring-0">
          <McPanelHeader
            title={t("activity")}
            description={full ? t("activityDesc") : undefined}
            bordered
          />
          <McPanelBody className="pt-2">
            <ul className="exp-outcome-mc-list">
              {activityFeed.map((row, index) => (
                <motion.li
                  key={`${row.time}-${row.text}`}
                  className="exp-outcome-mc-row"
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={play ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                  transition={{ duration: 0.4, delay: play ? 0.42 + index * 0.06 : 0, ease: EASE }}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">{row.user}</p>
                    <p className="truncate text-muted-foreground text-xs">{row.text}</p>
                  </div>
                  <span className="exp-mock-mono shrink-0 text-muted-foreground text-xs">
                    {row.time}
                  </span>
                </motion.li>
              ))}
            </ul>
          </McPanelBody>
        </McPanel>

        {full ? (
          <McPanel className="exp-outcome-mc-span-2 shadow-none dark:ring-0">
            <McPanelHeader title={t("team.title")} description={t("team.description")} bordered />
            <McPanelBody className="p-0">
              <ul className="exp-outcome-mc-list">
                {team.map((person, index) => (
                  <motion.li
                    key={person.name}
                    className="exp-outcome-mc-row"
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={play ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                    transition={{ duration: 0.4, delay: play ? 0.48 + index * 0.06 : 0, ease: EASE }}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          person.status === "online" ? "bg-emerald-400" : "bg-muted-foreground/50",
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-sm">{person.name}</p>
                        <p className="truncate text-muted-foreground text-xs">{person.role}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-muted-foreground text-xs">
                      {person.jobs || t(`team.${person.status}`)}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </McPanelBody>
          </McPanel>
        ) : null}

        {full ? (
          <McPanel className="exp-outcome-mc-span-2 gap-0 shadow-none dark:ring-0">
            <McPanelHeader
              title={t("recentOps.title")}
              description={t("recentOps.description")}
              bordered
            />
            <McPanelBody className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">{t("recentOps.type")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("recentOps.date")}</TableHead>
                    <TableHead className="text-right">{t("recentOps.amount")}</TableHead>
                    <TableHead className="pr-6 text-right">{t("recentOps.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOps.map((row) => (
                    <TableRow className="h-14 hover:bg-transparent" key={`${row.type}-${row.date}-${row.amount}`}>
                      <TableCell className="max-w-36 truncate pl-6 font-medium">{row.type}</TableCell>
                      <TableCell className="hidden text-muted-foreground text-sm tabular-nums sm:table-cell">
                        {row.date}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.amount}</TableCell>
                      <TableCell className="pr-6 text-right">
                        <Badge variant="outline" className="font-normal">
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </McPanelBody>
          </McPanel>
        ) : null}
      </div>
    </div>
  );
}
