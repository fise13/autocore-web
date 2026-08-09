# Graph Report - overview  (2026-08-08)

## Corpus Check
- 44 files · ~10,571 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 177 nodes · 379 edges · 10 communities (8 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `070cc6dd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.ts
- build-home-dashboard.ts
- types.ts
- index.ts
- mc-activity-feed.tsx
- revenue-from-operations.ts
- layout.ts
- home-continue-card.tsx
- home-quick-actions.tsx

## God Nodes (most connected - your core abstractions)
1. `useHomeDashboard()` - 14 edges
2. `McPressable()` - 11 edges
3. `useMcEnter()` - 10 edges
4. `mcTimeline` - 9 edges
5. `mcType` - 9 edges
6. `McAnimatedCounter()` - 6 edges
7. `buildOperationsChart()` - 6 edges
8. `incomeForDay()` - 6 edges
9. `resolveGreetingHeadline()` - 6 edges
10. `mc` - 5 edges

## Surprising Connections (you probably didn't know these)
- `AttentionRow()` --calls--> `useMcEnter()`  [EXTRACTED]
  components/mc-attention-banner.tsx → animation/use-mc-enter.ts
- `HomeBody()` --calls--> `useHomeDashboard()`  [EXTRACTED]
  overview-screen.tsx → hooks/use-home-dashboard.ts
- `HomeHeader()` --calls--> `resolveGreetingHeadline()`  [EXTRACTED]
  components/home/home-header.tsx → utils/greeting.ts
- `McHeader()` --calls--> `resolveGreetingHeadline()`  [EXTRACTED]
  components/mc-header.tsx → utils/greeting.ts
- `McHeader()` --calls--> `resolveGreetingMeta()`  [EXTRACTED]
  components/mc-header.tsx → utils/greeting.ts

## Import Cycles
- None detected.

## Communities (10 total, 2 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.09
Nodes (29): formatCounter(), formatGroupedInteger(), McAnimatedCounter(), McAnimatedCounterProps, McCounterFormat, AnimatedPolyline, buildPoints(), estimatePathLength() (+21 more)

### Community 1 - "build-home-dashboard.ts"
Cohesion: 0.13
Nodes (31): HomeDashboard, useHomeDashboard(), ACTIVE_INTAKE, buildAttentionRows(), buildHomeHero(), buildHomeMetrics(), buildOperationalHealth(), buildOperationsChart() (+23 more)

### Community 2 - "types.ts"
Cohesion: 0.09
Nodes (20): McWeekBarsProps, AttentionRow(), McAttentionBanner, McAttentionBannerProps, McTodayOverview, McTodayOverviewProps, TodayCell, mockOverviewSnapshot (+12 more)

### Community 3 - "index.ts"
Cohesion: 0.15
Nodes (15): HomeActions, HomeActivity(), HomeAiStripView(), HomeAttention(), HomeEmpty(), HomeHero(), HomeMetrics(), HomeOperationalHealth() (+7 more)

### Community 4 - "mc-activity-feed.tsx"
Cohesion: 0.17
Nodes (12): ActivityRow, ActivityRowProps, expandTransition, McActivityFeed, McActivityFeedProps, InsightRow, McInsights, McInsightsProps (+4 more)

### Community 5 - "revenue-from-operations.ts"
Cohesion: 0.24
Nodes (10): buildWeekRevenueBars(), computeWeekRevenueGrowth(), dayKey(), incomeForDay(), isIncomeOperation(), operationDate(), resolveOverviewRevenue(), sumWeekIncome() (+2 more)

### Community 6 - "layout.ts"
Cohesion: 0.33
Nodes (7): HomeHeader(), HomeSearch(), McHeader(), mc, resolveGreetingHeadline(), resolveGreetingMeta(), resolveProfileHeadline()

## Knowledge Gaps
- **43 isolated node(s):** `McCounterFormat`, `McAnimatedCounterProps`, `AnimatedPolyline`, `McAnimatedSparklineProps`, `McPressableProps` (+38 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `OverviewRevenue` connect `revenue-from-operations.ts` to `index.ts`, `build-home-dashboard.ts`, `types.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `McPressable()` connect `index.ts` to `types.ts`, `mc-activity-feed.tsx`, `layout.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `useHomeDashboard()` connect `build-home-dashboard.ts` to `index.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `McCounterFormat`, `McAnimatedCounterProps`, `AnimatedPolyline` to the rest of the system?**
  _43 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0858974358974359 - nodes in this community are weakly interconnected._
- **Should `build-home-dashboard.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12944523470839261 - nodes in this community are weakly interconnected._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0873015873015873 - nodes in this community are weakly interconnected._