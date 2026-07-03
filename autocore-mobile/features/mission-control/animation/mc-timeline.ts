/** Mission Control entrance timeline — first open only, ms */
export const mcTimeline = {
  logo: 0,
  title: 70,
  date: 130,
  avatar: 90,
  attention: 220,
  overviewTitle: 320,
  overviewColumnBase: 380,
  overviewColumnStagger: 60,
  counterDuration: 500,
  sparklineDuration: 580,
  sparklineDelayAfterColumn: 120,
  quickActionsTitle: 600,
  quickActionBase: 640,
  quickActionStagger: [0, 80, 140, 200] as const,
  activityTitle: 800,
  activityRowBase: 840,
  activityRowStagger: 55,
  tabBar: 180,
  attentionCountBase: 320,
  attentionCountStagger: 40,
} as const;

export const mcSpring = {
  enter: { damping: 34, stiffness: 320, mass: 0.9 },
  press: { damping: 28, stiffness: 420, mass: 0.75 },
  tab: { damping: 22, stiffness: 220, mass: 0.75 },
} as const;
