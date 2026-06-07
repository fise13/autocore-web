export {
  initBarbaRuntime as initMarketingBarba,
  runBarbaEnter as runMarketingEnter,
  runBarbaLeave as runMarketingLeave,
} from "@/lib/barba/barba-runtime";

export {
  isMarketingInternalPath,
  pathToBarbaNamespace as marketingPathToNamespace,
  shouldAnimateMarketingNavigation,
} from "@/lib/barba/barba-navigation";
