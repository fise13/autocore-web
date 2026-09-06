/** Deterministic entity ids for the Ridgeway playground company. */

export const AI_GUIDE_WAREHOUSE_ID = "aig-warehouse-main";

export const AI_GUIDE_EMPLOYEE_IDS = {
  manager: "aig-emp-manager",
  mechanic: "aig-emp-mechanic",
  warehouse: "aig-emp-warehouse",
} as const;

export const AI_GUIDE_CLIENT_IDS = {
  elena: "aig-client-elena",
  caleb: "aig-client-caleb",
  naomi: "aig-client-naomi",
  frank: "aig-client-frank",
} as const;

export const AI_GUIDE_VEHICLE_IDS = {
  wrx: "aig-vehicle-wrx",
  chaser: "aig-vehicle-chaser",
  integra: "aig-vehicle-integra",
  skyline: "aig-vehicle-skyline",
} as const;

export const AI_GUIDE_ITEM_IDS = {
  oilFilter: "aig-item-oil-filter",
  oil: "aig-item-oil-5w40",
  coolant: "aig-item-coolant",
  gasketSet: "aig-item-gasket-set",
  timingBelt: "aig-item-timing-belt",
  sparkPlugs: "aig-item-spark-plugs",
} as const;

export const AI_GUIDE_WORK_ORDER_IDS = {
  delivered: "aig-wo-0188",
  inProgress: "aig-wo-0194",
  waitingParts: "aig-wo-0197",
  confirmed: "aig-wo-0201",
} as const;

export const AI_GUIDE_MOTOR_IDS = {
  ej20g: "aig-motor-ej20g",
  ej257: "aig-motor-ej257",
  jz1: "aig-motor-1jz-gte",
  k20a: "aig-motor-k20a",
  rb26: "aig-motor-rb26dett",
  jz2: "aig-motor-2jz-gte",
} as const;

export const AI_GUIDE_DOCUMENT_IDS = {
  wo188: "aig-doc-wo-0188",
  warranty188: "aig-doc-warranty-0188",
  invoice194: "aig-doc-invoice-0194",
} as const;
